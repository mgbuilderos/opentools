import { readdirSync, readFileSync, statSync } from 'node:fs';
import { builtinModules } from 'node:module';
import path from 'node:path';
import ts from 'typescript';
import { beforeAll, describe, expect, it } from 'vitest';

/**
 * Proves the engine entry is framework-free and network-free by walking its
 * real import graph with the TypeScript parser: static, type-only, `export …
 * from`, `import('…')` expressions and types, `require` and triple-slash path
 * references are all followed. Third-party packages reached from the closure
 * are checked by dependency manifest and their shipped JavaScript is scanned
 * for network APIs.
 */

const projectRoot = path.resolve(import.meta.dirname, '..');
const engineEntry = path.join(projectRoot, 'engine/index.ts');

const FRAMEWORK_PACKAGE =
  /^(?:react|react-dom|next|vinext)(?:\/|$)|^@(?:vinext|next)\/|^react-server-dom-/u;
/** Modules whose purpose is network I/O, or that fetch their own assets. */
const NETWORK_MODULES = new Set([
  'axios',
  'cross-fetch',
  'dgram',
  'dns',
  'http',
  'http2',
  'https',
  'isomorphic-fetch',
  'net',
  'node-fetch',
  'onnxruntime-web',
  'tls',
  'undici',
  'ws',
]);
const SITE_DIRECTORIES = new Set(['app', 'components', 'workers']);
const NETWORK_GLOBALS = new Set([
  'EventSource',
  'RTCPeerConnection',
  'WebSocket',
  'WebTransport',
  'XMLHttpRequest',
  'fetch',
  'importScripts',
  'sendBeacon',
]);
const IMPORT_TIME_GLOBALS = new Set([
  'document',
  'localStorage',
  'location',
  'navigator',
  'self',
  'sessionStorage',
  'window',
]);
const REMOTE_URL = /^(?:[a-z][a-z\d+.-]*:)?\/\//iu;
const PROJECT_SOURCE = /\.tsx?$/u;
const PACKAGE_SOURCE = /\.[cm]?js$/u;

interface Host {
  isFile(file: string): boolean;
  readFile(file: string): string | undefined;
  /** Files below `directory`, excluding nested `node_modules`. */
  listFiles(directory: string): string[];
}

interface Violation {
  file: string;
  chain: readonly string[];
  reason: string;
}

interface Closure {
  files: Map<string, readonly string[]>;
  packages: Map<string, readonly string[]>;
  builtins: Set<string>;
  violations: Violation[];
}

type Mode = 'project' | 'package';

const diskHost: Host = {
  isFile(file) {
    try {
      return statSync(file).isFile();
    } catch {
      return false;
    }
  },
  readFile(file) {
    try {
      return readFileSync(file, 'utf8');
    } catch {
      return undefined;
    }
  },
  listFiles(directory) {
    return readdirSync(directory, { encoding: 'utf8', recursive: true })
      .filter((entry) => !entry.split(path.sep).includes('node_modules'))
      .map((entry) => path.join(directory, entry))
      .filter((file) => diskHost.isFile(file));
  },
};

function memoryHost(entries: Record<string, string>): Host {
  const files = new Map(Object.entries(entries));
  return {
    isFile: (file) => files.has(file),
    readFile: (file) => files.get(file),
    listFiles: (directory) =>
      [...files.keys()].filter(
        (file) =>
          file.startsWith(directory + path.sep) &&
          !path
            .relative(directory, file)
            .split(path.sep)
            .includes('node_modules'),
      ),
  };
}

function packageName(specifier: string) {
  const bare = specifier.replace(/^node:/u, '');
  const parts = bare.split('/');
  return bare.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

function scriptKind(file: string) {
  if (file.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (file.endsWith('.ts')) return ts.ScriptKind.TS;
  return ts.ScriptKind.JS;
}

/** A declaration or property name, as opposed to a read of a global. */
function isNameSlot(node: ts.Identifier) {
  const parent = node.parent as ts.Node & {
    name?: ts.Node;
    propertyName?: ts.Node;
  };
  if (ts.isShorthandPropertyAssignment(parent)) return false;
  return parent.name === node || parent.propertyName === node;
}

function stringLiterals(nodes: readonly ts.Node[]) {
  const found: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isStringLiteralLike(node)) found.push(node.text);
    ts.forEachChild(node, visit);
  };
  nodes.forEach(visit);
  return found;
}

/** Module specifiers a file depends on, and any forbidden construct in it. */
function analyseSource(file: string, text: string, mode: Mode) {
  const source = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    scriptKind(file),
  );
  const specifiers: string[] = [];
  const problems: string[] = [];
  const line = (node: ts.Node) =>
    source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;

  for (const statement of source.statements) {
    if (
      !ts.isExpressionStatement(statement) ||
      !ts.isStringLiteral(statement.expression)
    )
      break;
    const directive = statement.expression.text;
    if (directive === 'use client' || directive === 'use server')
      problems.push(`'${directive}' directive (line ${line(statement)})`);
  }
  for (const reference of source.referencedFiles) {
    const name = reference.fileName;
    specifiers.push(name.startsWith('.') ? name : `./${name}`);
  }

  const collectImportTypes = (node: ts.Node) => {
    if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteral(node.argument.literal)
    )
      specifiers.push(node.argument.literal.text);
    ts.forEachChild(node, collectImportTypes);
  };

  const visit = (node: ts.Node, deferred: boolean): void => {
    if (
      (ts.isTypeNode(node) && !ts.isExpressionWithTypeArguments(node)) ||
      ts.isInterfaceDeclaration(node) ||
      ts.isTypeAliasDeclaration(node)
    ) {
      collectImportTypes(node);
      return;
    }

    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specifiers.push(node.moduleSpecifier.text);
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      ts.isStringLiteral(node.moduleReference.expression)
    ) {
      specifiers.push(node.moduleReference.expression.text);
    } else if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) &&
          node.expression.text === 'require'))
    ) {
      const kind =
        node.expression.kind === ts.SyntaxKind.ImportKeyword
          ? 'dynamic import()'
          : 'require()';
      const [argument] = node.arguments;
      if (argument && ts.isStringLiteralLike(argument)) {
        if (REMOTE_URL.test(argument.text))
          problems.push(
            `${kind} of remote URL '${argument.text}' (line ${line(node)})`,
          );
        else specifiers.push(argument.text);
      } else if (mode === 'project') {
        // The closure cannot be proved through a computed specifier.
        problems.push(
          `${kind} with a non-literal specifier (line ${line(node)})`,
        );
      }
    }

    if (
      ts.isNewExpression(node) &&
      ts.isIdentifier(node.expression) &&
      (node.expression.text === 'Worker' ||
        node.expression.text === 'SharedWorker')
    ) {
      const literals = stringLiterals(node.arguments ?? []);
      if (!literals.length || literals.some((value) => REMOTE_URL.test(value)))
        problems.push(
          `new ${node.expression.text}() without a same-origin literal URL (line ${line(node)})`,
        );
    }

    if (ts.isIdentifier(node) && NETWORK_GLOBALS.has(node.text))
      problems.push(`network API '${node.text}' (line ${line(node)})`);
    if (
      ts.isElementAccessExpression(node) &&
      ts.isStringLiteralLike(node.argumentExpression) &&
      NETWORK_GLOBALS.has(node.argumentExpression.text)
    )
      problems.push(
        `network API '${node.argumentExpression.text}' (line ${line(node)})`,
      );

    if (
      mode === 'project' &&
      !deferred &&
      ts.isIdentifier(node) &&
      IMPORT_TIME_GLOBALS.has(node.text) &&
      !isNameSlot(node) &&
      !ts.isTypeOfExpression(node.parent)
    )
      problems.push(
        `DOM/worker global '${node.text}' read at import time (line ${line(node)})`,
      );

    const deferChildren =
      deferred ||
      ts.isFunctionLike(node) ||
      (ts.isPropertyDeclaration(node) &&
        !ts
          .getModifiers(node)
          ?.some((modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword));
    ts.forEachChild(node, (child) => visit(child, deferChildren));
  };
  visit(source, false);

  return { specifiers, problems };
}

function resolveLocal(base: string, host: Host) {
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
  ];
  if (base.endsWith('.js')) candidates.push(base.replace(/\.js$/u, '.ts'));
  return candidates.find((candidate) => host.isFile(candidate));
}

function locatePackage(name: string, fromDirectory: string, host: Host) {
  let directory = fromDirectory;
  for (;;) {
    const candidate = path.join(directory, 'node_modules', name);
    if (host.isFile(path.join(candidate, 'package.json'))) return candidate;
    const parent = path.dirname(directory);
    if (parent === directory) return undefined;
    directory = parent;
  }
}

function walkBoundary(entry: string, root: string, host: Host): Closure {
  const closure: Closure = {
    files: new Map(),
    packages: new Map(),
    builtins: new Set(),
    violations: [],
  };
  const display = (file: string) => path.relative(root, file);
  const report = (file: string, chain: readonly string[], reason: string) =>
    closure.violations.push({ file: display(file), chain, reason });

  const forbiddenModule = (specifier: string) => {
    const bare = specifier.replace(/^node:/u, '');
    if (FRAMEWORK_PACKAGE.test(bare)) return `framework package '${specifier}'`;
    if (NETWORK_MODULES.has(packageName(specifier)))
      return `network module '${specifier}'`;
    return undefined;
  };

  const visitPackage = (
    name: string,
    fromDirectory: string,
    chain: readonly string[],
    required: boolean,
  ) => {
    const packageChain = [...chain, name];
    const forbidden = forbiddenModule(name);
    if (forbidden) {
      report(fromDirectory, packageChain, forbidden);
      return;
    }
    const directory = locatePackage(name, fromDirectory, host);
    if (!directory) {
      if (required)
        report(fromDirectory, packageChain, `unresolved package '${name}'`);
      return;
    }
    if (closure.packages.has(directory)) return;
    closure.packages.set(directory, packageChain);

    for (const file of host.listFiles(directory)) {
      if (!PACKAGE_SOURCE.test(file)) continue;
      const { specifiers, problems } = analyseSource(
        file,
        host.readFile(file) ?? '',
        'package',
      );
      for (const problem of problems) report(file, packageChain, problem);
      for (const specifier of specifiers) {
        const reason = forbiddenModule(specifier);
        if (reason) report(file, [...packageChain, specifier], reason);
      }
    }

    const manifest = JSON.parse(
      host.readFile(path.join(directory, 'package.json')) ?? '{}',
    ) as Record<string, Record<string, string> | undefined>;
    for (const dependency of Object.keys(manifest.dependencies ?? {}))
      visitPackage(dependency, directory, packageChain, true);
    for (const dependency of [
      ...Object.keys(manifest.peerDependencies ?? {}),
      ...Object.keys(manifest.optionalDependencies ?? {}),
    ])
      visitPackage(dependency, directory, packageChain, false);
  };

  const queue: Array<{ file: string; chain: readonly string[] }> = [
    { file: entry, chain: [display(entry)] },
  ];
  while (queue.length) {
    const { file, chain } = queue.shift()!;
    if (closure.files.has(file)) continue;
    closure.files.set(file, chain);

    const topDirectory = display(file).split(path.sep)[0];
    if (SITE_DIRECTORIES.has(topDirectory))
      report(file, chain, `site-only directory '${topDirectory}/'`);
    if (!PROJECT_SOURCE.test(file)) {
      if (!file.endsWith('.json')) report(file, chain, 'non-code asset import');
      continue;
    }
    const text = host.readFile(file);
    if (text === undefined) {
      report(file, chain, 'unreadable file');
      continue;
    }

    const { specifiers, problems } = analyseSource(file, text, 'project');
    for (const problem of problems) report(file, chain, problem);
    for (const specifier of specifiers) {
      if (specifier.startsWith('.') || specifier.startsWith('@/')) {
        const base = specifier.startsWith('@/')
          ? path.join(root, specifier.slice(2))
          : path.resolve(path.dirname(file), specifier);
        const resolved = resolveLocal(base, host);
        if (resolved)
          queue.push({ file: resolved, chain: [...chain, display(resolved)] });
        else report(file, chain, `unresolved import '${specifier}'`);
        continue;
      }
      const forbidden = forbiddenModule(specifier);
      if (forbidden) report(file, [...chain, specifier], forbidden);
      else if (
        specifier.startsWith('node:') ||
        builtinModules.includes(packageName(specifier))
      )
        closure.builtins.add(specifier);
      else
        visitPackage(packageName(specifier), path.dirname(file), chain, true);
    }
  }
  return closure;
}

function describeViolations(closure: Closure) {
  return closure.violations.map(
    ({ file, chain, reason }) =>
      `${reason} in ${file}\n    reached via ${chain.join(' -> ')}`,
  );
}

describe('boundary walker self-test', () => {
  const root = path.join(path.sep, 'fixture');
  const at = (file: string) => path.join(root, file);
  const walk = (entries: Record<string, string>) =>
    walkBoundary(
      at('engine/index.ts'),
      root,
      memoryHost(
        Object.fromEntries(
          Object.entries(entries).map(([file, text]) => [at(file), text]),
        ),
      ),
    );

  it('catches react through a multi-line re-export and a type-only import', () => {
    const closure = walk({
      'engine/index.ts': "export {\n  helper,\n} from '@/lib/a';\n",
      'lib/a.ts':
        "import type {\n  ReactNode,\n} from 'react';\nexport const helper = (node: ReactNode) => node;\n",
    });
    expect(closure.violations).toEqual([
      {
        file: path.join('lib', 'a.ts'),
        chain: [
          path.join('engine', 'index.ts'),
          path.join('lib', 'a.ts'),
          'react',
        ],
        reason: "framework package 'react'",
      },
    ]);
  });

  it('catches a real fetch call but not a comment or string mentioning it', () => {
    const clean = walk({
      'engine/index.ts': "export * from './b';\n",
      'engine/b.ts':
        "// fetch('/x') is only mentioned here\nexport const note = 'fetch(url)';\nexport const html = `<button onclick=\"fetch('/y')\">`;\n",
    });
    expect(clean.violations).toEqual([]);

    const calling = walk({
      'engine/index.ts': "export * from './b';\n",
      'engine/b.ts':
        "// fetch('/x') is only mentioned here\nconst note = 'fetch(';\nexport async function load() {\n  return fetch(note);\n}\n",
    });
    expect(describeViolations(calling)).toEqual([
      "network API 'fetch' (line 4) in engine/b.ts\n    reached via engine/index.ts -> engine/b.ts",
    ]);
  });

  it('catches directives, site paths, remote imports and import-time globals', () => {
    const closure = walk({
      'engine/index.ts': [
        "export * from '@/components/widget';",
        "export * from './client';",
        "export type Request = import('next/server').NextRequest;",
        "export const load = () => import('https://cdn.example/x.js');",
        "export const beacon = () => globalThis['sendBeacon'];",
        'export const width = window.innerWidth;',
        'export const lazyWidth = () => window.innerWidth;',
        "export const safe = typeof document === 'undefined';",
        "export const worker = () => new Worker('//cdn.example/w.js');",
        "export * from './missing';",
      ].join('\n'),
      'components/widget.ts': 'export const widget = 1;\n',
      'engine/client.ts': "'use client';\nexport const client = 1;\n",
    });
    const reasons = closure.violations.map((violation) => violation.reason);
    expect(reasons).toEqual(
      expect.arrayContaining([
        "site-only directory 'components/'",
        "'use client' directive (line 1)",
        "framework package 'next/server'",
        "dynamic import() of remote URL 'https://cdn.example/x.js' (line 4)",
        "network API 'sendBeacon' (line 5)",
        "DOM/worker global 'window' read at import time (line 6)",
        'new Worker() without a same-origin literal URL (line 9)',
        "unresolved import './missing'",
      ]),
    );
    expect(reasons).toHaveLength(8);
  });

  it('catches third-party packages that depend on react or call fetch', () => {
    const closure = walk({
      'engine/index.ts': "export { default } from 'helper-lib';\n",
      'node_modules/helper-lib/package.json':
        '{"dependencies":{"inner-lib":"1.0.0"}}',
      'node_modules/helper-lib/index.js':
        "// fetch() in a comment is fine\nmodule.exports = require('inner-lib');\n",
      'node_modules/inner-lib/package.json': '{"dependencies":{"react":"19"}}',
      'node_modules/inner-lib/index.js':
        'module.exports = (url) => fetch(url);\n',
    });
    expect(describeViolations(closure)).toEqual([
      "network API 'fetch' (line 1) in node_modules/inner-lib/index.js\n    reached via engine/index.ts -> helper-lib -> inner-lib",
      "framework package 'react' in node_modules/inner-lib\n    reached via engine/index.ts -> helper-lib -> inner-lib -> react",
    ]);
  });
});

describe('engine entry boundary', () => {
  let closure: Closure;
  beforeAll(() => {
    closure = walkBoundary(engineEntry, projectRoot, diskHost);
  }, 120_000);

  it('reaches no framework, site path, directive or network API', () => {
    expect(describeViolations(closure)).toEqual([]);
  });

  it('actually walked the tool modules and their packages', () => {
    const files = [...closure.files.keys()].map((file) =>
      path.relative(projectRoot, file),
    );
    expect(files).toEqual(
      expect.arrayContaining([
        'lib/tools/pdf/engine.ts',
        'lib/tools/pdf/protocol.ts',
        'lib/tools/background-removal/u2netp.ts',
        'lib/tools/workbench-helpers.ts',
        'lib/tools/qr-barcode-workbench.ts',
      ]),
    );
    const packages = [...closure.packages.keys()].map((directory) =>
      path.relative(projectRoot, directory),
    );
    expect(packages).toEqual(
      expect.arrayContaining(['node_modules/pdf-lib', 'node_modules/qrcode']),
    );
  });
});
