import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  affectsBuildOutput,
  buildInputsDigest,
  installedPackagesThatCanChangeTheBuild,
  type Lockfile,
  packageNameFromModuleId,
  PACKAGES_THAT_CANNOT_CHANGE_THE_BUILD,
  resolveBuildInputsDigest,
} from './build-inputs';

const appRoot = path.resolve(import.meta.dirname, '../..');

/** True when a package directory holds anything a bundler could pull in. */
function containsJavaScript(dir: string): boolean {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    // A nested install is its own lockfile entry, checked on its own.
    if (entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (containsJavaScript(full)) return true;
    } else if (/\.(js|mjs|cjs|jsx|wasm)$/.test(entry.name)) return true;
  }
  return false;
}

const lockfile = JSON.parse(
  readFileSync(path.join(appRoot, 'package-lock.json'), 'utf8'),
) as Lockfile & {
  packages: Record<string, { dev?: boolean; version?: string }>;
};

/** A digest input that tests can perturb one field at a time. */
function inputs(overrides?: {
  files?: [string, string][];
  lock?: Lockfile;
  manifest?: string;
}) {
  return {
    files:
      overrides?.files ??
      ([['lib/utils.ts', 'blob-one']] as [string, string][]),
    lock: overrides?.lock ?? {
      packages: {
        '': { dependencies: { react: '19.2.8' }, devDependencies: {} },
        'node_modules/react': { version: '19.2.8', integrity: 'sha512-react' },
      },
    },
    manifest: overrides?.manifest ?? '{"name":"local-tools-canary"}',
  };
}

describe('which paths are build inputs', () => {
  it.each([
    'app/layout.tsx',
    'components/app-shell.tsx',
    'lib/tools/browse/pdf.ts',
    'engine/engine.ts',
    'workers/worker.ts',
    'types/global.d.ts',
    'public/sw.js',
    'public/telemetry/README.md',
    '.openai/hosting.json',
    'scripts/build-service-worker-precache.mjs',
    'next.config.ts',
    'vite.config.ts',
    'tsconfig.json',
    'proxy.ts',
  ])('counts %s, because the build reads it', (file) => {
    expect(affectsBuildOutput(file)).toBe(true);
  });

  it.each([
    'docs/CACHE_BUDGET.md',
    'decisions/ADR-019.md',
    'e2e/egress-proof.spec.ts',
    'e2e-audit/audit.spec.ts',
    'e2e-prod/prod.spec.ts',
    '.github/workflows/qc.yml',
    'release/sbom.cdx.json',
    'packaging/umbrel/docker-compose.yml',
    'extension/background.js',
    'docker/start.sh',
    'README.md',
    'CHANGELOG.md',
    'THIRD_PARTY_NOTICES.md',
    'Dockerfile',
    '.predeploy-state.json',
    'vitest.config.ts',
    'playwright.config.ts',
    'lib/build/build-inputs.test.ts',
    'components/ui/button.test.tsx',
  ])('leaves out %s, because no build step reads it', (file) => {
    expect(affectsBuildOutput(file)).toBe(false);
  });

  /**
   * The direction of the mistake matters. A path wrongly left in only renames a
   * chunk; a path wrongly left out lets two builds that really do differ share
   * one id, one cache key and one `immutable` filename. So anything that looks
   * like source has to be in, whatever directory it sits in.
   */
  it('keeps every tracked TypeScript module outside the excluded trees', () => {
    expect(affectsBuildOutput('lib/anything/at/all.ts')).toBe(true);
    expect(affectsBuildOutput('app/new-route/page.tsx')).toBe(true);
  });
});

describe('which installed packages are build inputs', () => {
  const graph: Lockfile = {
    packages: {
      '': {
        dependencies: { shipped: '1.0.0' },
        devDependencies: { bundler: '1.0.0', vitest: '1.0.0' },
      },
      'node_modules/shipped': { version: '1.0.0', integrity: 'sha512-ship' },
      'node_modules/bundler': {
        version: '1.0.0',
        integrity: 'sha512-bundler',
        dependencies: { 'shared-helper': '1.0.0' },
      },
      'node_modules/vitest': {
        version: '1.0.0',
        integrity: 'sha512-vitest',
        dependencies: { 'test-only-helper': '1.0.0', 'shared-helper': '1.0.0' },
      },
      'node_modules/shared-helper': { version: '1.0.0' },
      'node_modules/test-only-helper': { version: '1.0.0' },
    },
  };

  it('follows the root devDependencies, because the toolchain is one', () => {
    expect(installedPackagesThatCanChangeTheBuild(graph)).toContain(
      'node_modules/bundler',
    );
  });

  it('cuts a named package and everything only it reaches', () => {
    const reached = installedPackagesThatCanChangeTheBuild(graph);
    expect(reached).not.toContain('node_modules/vitest');
    expect(reached).not.toContain('node_modules/test-only-helper');
  });

  it('keeps what a cut package shares with something that is not cut', () => {
    expect(installedPackagesThatCanChangeTheBuild(graph)).toContain(
      'node_modules/shared-helper',
    );
  });

  it('resolves a nested copy ahead of the hoisted one, as npm does', () => {
    const nested: Lockfile = {
      packages: {
        '': { dependencies: { parent: '1.0.0' } },
        'node_modules/parent': { dependencies: { dep: '2.0.0' } },
        'node_modules/parent/node_modules/dep': { version: '2.0.0' },
        'node_modules/dep': { version: '1.0.0' },
      },
    };
    expect(installedPackagesThatCanChangeTheBuild(nested)).toContain(
      'node_modules/parent/node_modules/dep',
    );
    expect(installedPackagesThatCanChangeTheBuild(nested)).not.toContain(
      'node_modules/dep',
    );
  });

  it.each(PACKAGES_THAT_CANNOT_CHANGE_THE_BUILD)(
    '%s is actually installed, so the name is not a typo that cuts nothing',
    (name) => {
      const entries = Object.keys(lockfile.packages).filter(
        (installed) =>
          installed === `node_modules/${name}` ||
          installed.endsWith(`/node_modules/${name}`),
      );
      expect(entries.length).toBeGreaterThan(0);
    },
  );

  /**
   * The one mistake this list could make that costs a visitor something is to
   * cut a package whose code ships: its version would stop renaming the chunk
   * it lands in, and a returning visitor would keep the old bytes under a
   * year-long `immutable` rule. Checked over everything the walk actually cuts,
   * not just the declared names, because cutting `vitest` also cuts its subtree.
   *
   * Two things make a cut defensible, and every cut package has to be one of
   * them. Either npm marks it `dev`, so nothing outside `devDependencies`
   * reaches it and no bundler can see it. Or it contains no JavaScript at all --
   * which is how `@types/*`, `csstype` and `undici-types` qualify: `vite` peer-
   * depends on `@types/node` and `@base-ui/react` on `@types/react`, so npm
   * does not call them dev, but a declaration file is erased before a bundler
   * ever looks at it.
   *
   * `guardBuildInputs` in `vite.config.ts` checks the same claim from the other
   * end, against the real module graph.
   */
  it('cuts nothing whose code could reach dist/', () => {
    const counted = new Set(installedPackagesThatCanChangeTheBuild(lockfile));
    const cut = Object.keys(lockfile.packages).filter(
      (installed) => installed !== '' && !counted.has(installed),
    );
    expect(cut.length).toBeGreaterThan(0);

    const shipping = cut.filter((installed) => {
      if (lockfile.packages[installed]?.dev === true) return false;
      const dir = path.join(appRoot, installed);
      return !existsSync(dir) || containsJavaScript(dir);
    });
    expect(shipping).toEqual([]);
  });
});

describe('the digest', () => {
  it('is the same for the same inputs', () => {
    expect(buildInputsDigest(inputs())).toBe(buildInputsDigest(inputs()));
  });

  it('is 64 hex characters, so nothing mistakes it for a commit', () => {
    expect(buildInputsDigest(inputs())).toMatch(/^[0-9a-f]{64}$/);
  });

  it('does not depend on the order files are listed in', () => {
    const forwards: [string, string][] = [
      ['app/page.tsx', 'a'],
      ['lib/utils.ts', 'b'],
    ];
    expect(buildInputsDigest(inputs({ files: forwards }))).toBe(
      buildInputsDigest(inputs({ files: [...forwards].reverse() })),
    );
  });

  it('moves when a file the build reads changes', () => {
    expect(
      buildInputsDigest(inputs({ files: [['lib/utils.ts', 'two']] })),
    ).not.toBe(buildInputsDigest(inputs()));
  });

  it('holds still when a file the build cannot read changes', () => {
    const withDocs = (blob: string): [string, string][] => [
      ['lib/utils.ts', 'blob-one'],
      ['docs/CACHE_BUDGET.md', blob],
    ];
    expect(buildInputsDigest(inputs({ files: withDocs('before') }))).toBe(
      buildInputsDigest(inputs({ files: withDocs('after') })),
    );
    expect(buildInputsDigest(inputs({ files: withDocs('before') }))).toBe(
      buildInputsDigest(inputs()),
    );
  });

  it('holds still when only `overrides` moves in the manifest', () => {
    expect(
      buildInputsDigest(
        inputs({
          manifest:
            '{"name":"local-tools-canary","overrides":{"undici":"7.29.1"}}',
        }),
      ),
    ).toBe(buildInputsDigest(inputs()));
  });

  it('moves when anything else in the manifest moves', () => {
    expect(
      buildInputsDigest(
        inputs({ manifest: '{"name":"local-tools-canary","type":"module"}' }),
      ),
    ).not.toBe(buildInputsDigest(inputs()));
  });

  it('moves when a shipped package resolves to a different version', () => {
    const bumped: Lockfile = {
      packages: {
        '': { dependencies: { react: '19.2.9' }, devDependencies: {} },
        'node_modules/react': { version: '19.2.9', integrity: 'sha512-other' },
      },
    };
    expect(buildInputsDigest(inputs({ lock: bumped }))).not.toBe(
      buildInputsDigest(inputs()),
    );
  });

  /**
   * The case this whole module exists for: pinning `undici`, which is reached
   * only through miniflare and ships nowhere, used to rename 111 of 259 client
   * chunks because the build ID moved.
   */
  it('holds still when a package it leaves out resolves differently', () => {
    const withUndici = (version: string): Lockfile => ({
      packages: {
        '': { dependencies: { react: '19.2.8' }, devDependencies: {} },
        'node_modules/react': { version: '19.2.8', integrity: 'sha512-react' },
        'node_modules/undici': { version, integrity: `sha512-${version}` },
      },
    });
    expect(buildInputsDigest(inputs({ lock: withUndici('7.29.0') }))).toBe(
      buildInputsDigest(inputs({ lock: withUndici('7.29.1') })),
    );
  });
});

describe('reading the inputs out of the repository', () => {
  it('digests this tree, repeatably', () => {
    const digest = resolveBuildInputsDigest();
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    expect(resolveBuildInputsDigest()).toBe(digest);
  });

  /**
   * The end-to-end behaviour, in a repository of its own so the test cannot
   * perturb the digest of this one while another test file is reading it.
   *
   * The case that matters is the middle one. Until 2026-10-02 a dirty tree
   * resolved to `null`, which restored vinext's random UUID, so two builds of
   * one uncommitted edit never agreed -- the whole of why this build looked
   * non-reproducible, and why a `dist/` diff of a dependency change read as 111
   * changed chunks. Saved work now has an ID of its own, and the same one twice.
   */
  it('sees saved work, ignores prose, and answers the same way twice', () => {
    const repo = mkdtempSync(path.join(tmpdir(), 'build-inputs-'));
    const previousCwd = process.cwd();
    const run = (...args: string[]) =>
      execFileSync('git', args, { cwd: repo, stdio: 'ignore' });
    try {
      mkdirSync(path.join(repo, 'lib'));
      mkdirSync(path.join(repo, 'docs'));
      writeFileSync(path.join(repo, 'lib/thing.ts'), 'export const a = 1;\n');
      writeFileSync(path.join(repo, 'docs/note.md'), 'before\n');
      writeFileSync(path.join(repo, 'package.json'), '{"name":"probe"}\n');
      writeFileSync(
        path.join(repo, 'package-lock.json'),
        '{"lockfileVersion":3,"packages":{"":{"dependencies":{}}}}\n',
      );
      run('init', '--quiet');
      run('-c', 'user.email=t@t', '-c', 'user.name=t', 'add', '--all');
      run('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-m', 'probe');

      process.chdir(repo);
      const committed = resolveBuildInputsDigest();
      expect(committed).toMatch(/^[0-9a-f]{64}$/);
      expect(resolveBuildInputsDigest()).toBe(committed);

      writeFileSync(path.join(repo, 'lib/thing.ts'), 'export const a = 2;\n');
      const saved = resolveBuildInputsDigest();
      expect(saved).not.toBe(committed);
      expect(resolveBuildInputsDigest()).toBe(saved);

      writeFileSync(path.join(repo, 'docs/note.md'), 'after\n');
      expect(resolveBuildInputsDigest()).toBe(saved);
    } finally {
      process.chdir(previousCwd);
      rmSync(repo, { recursive: true, force: true });
    }
  });
});

describe('naming the package a module came from', () => {
  it.each([
    ['/repo/node_modules/undici/index.js', 'undici'],
    ['/repo/node_modules/@types/node/fs.d.ts', '@types/node'],
    [
      '/repo/node_modules/wrangler/node_modules/miniflare/dist/x.js',
      'miniflare',
    ],
    ['C:\\repo\\node_modules\\vitest\\dist\\index.js', 'vitest'],
    ['/repo/lib/utils.ts', null],
  ])('reads %s as %s', (moduleId, name) => {
    expect(packageNameFromModuleId(moduleId)).toBe(name);
  });
});
