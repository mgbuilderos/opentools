import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  assessRuntimeAdvisories,
  BUILD_ONLY_EDGES,
  REQUIRED_RECORDS,
  runtimeGraph,
} from './audit-runtime.mjs';

/**
 * The runtime advisory gate's decision, on fixtures.
 *
 * `scripts/audit-runtime.mjs` takes npm's `--omit=dev` report and corrects
 * npm's idea of "runtime" with what the build measured. Each case below is a
 * way that correction could go wrong -- in the direction that ships a known
 * fault, or in the direction that blocks every lane on code that never
 * ships. No case shells out: the report is a fixture shaped like npm's.
 *
 * The fixture graph mirrors the real one from 2026-10-13:
 *
 *   app -> framework                      (ships, like vinext)
 *            -> build-plugin -> glob      (does not ship, like
 *                                          vite-plugin-commonjs -> ... -> braces)
 *            -> runtime-helper            (ships)
 *   app -(dev)-> tool                     (toolchain)
 */

type Entry = {
  version?: string;
  dev?: boolean;
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  name?: string;
};

function lockOf(extra: Record<string, Entry> = {}) {
  return {
    lockfileVersion: 3,
    packages: {
      '': {
        name: 'app',
        dependencies: { framework: '1.0.0' },
        devDependencies: { tool: '1.0.0' },
      },
      'node_modules/framework': {
        version: '1.0.0',
        dependencies: { 'build-plugin': '1.0.0', 'runtime-helper': '1.0.0' },
      },
      'node_modules/build-plugin': {
        version: '1.0.0',
        dependencies: { glob: '1.0.0' },
      },
      'node_modules/glob': { version: '1.0.0' },
      'node_modules/runtime-helper': { version: '1.0.0' },
      'node_modules/tool': { version: '1.0.0', dev: true },
      ...extra,
    } as Record<string, Entry>,
  };
}

/** An `npm audit --json` report: one direct row, plus npm's "depends on" rows. */
function auditOf(
  findings: Array<{ name: string; severity: string; nodes: string[] }>,
  dependsOn: Record<string, string[]> = {},
) {
  const vulnerabilities: Record<string, unknown> = {};
  for (const finding of findings)
    vulnerabilities[finding.name] = {
      name: finding.name,
      severity: finding.severity,
      isDirect: false,
      via: [
        {
          source: 1,
          name: finding.name,
          dependency: finding.name,
          title: `${finding.name} is broken`,
          url: `https://example.invalid/${finding.name}`,
          severity: finding.severity,
          range: '*',
        },
      ],
      effects: [],
      range: '*',
      nodes: finding.nodes,
      fixAvailable: false,
    };
  for (const [name, via] of Object.entries(dependsOn))
    vulnerabilities[name] = {
      name,
      severity: 'high',
      isDirect: false,
      via,
      effects: [],
      range: '*',
      nodes: [`node_modules/${name}`],
      fixAvailable: false,
    };
  return { auditReportVersion: 2, vulnerabilities };
}

const shippedFramework = [
  {
    environment: 'client',
    packages: [
      {
        path: 'node_modules/framework',
        name: 'framework',
        version: '1.0.0',
        files: 40,
      },
      {
        path: 'node_modules/runtime-helper',
        name: 'runtime-helper',
        version: '1.0.0',
        files: 2,
      },
    ],
  },
];

const buildPluginEdge = [{ from: 'framework', to: 'build-plugin' }];

const highInGlob = auditOf(
  [{ name: 'glob', severity: 'high', nodes: ['node_modules/glob'] }],
  {
    'build-plugin': ['glob'],
    framework: ['build-plugin'],
  },
);

describe('the runtime advisory gate', () => {
  it('with no build-only edge, blocks exactly where `npm audit --omit=dev --audit-level=high` did', () => {
    const result = assessRuntimeAdvisories({
      lock: lockOf(),
      audit: highInGlob,
      shipped: shippedFramework,
      buildOnlyEdges: [],
    });
    expect(result.problems).toEqual([]);
    expect(result.blocking.map((a) => a.name)).toEqual(['glob']);
  });

  it('does not block on an advisory reached only through a declared build-only edge', () => {
    const result = assessRuntimeAdvisories({
      lock: lockOf(),
      audit: highInGlob,
      shipped: shippedFramework,
      buildOnlyEdges: buildPluginEdge,
    });
    expect(result.problems).toEqual([]);
    expect(result.blocking).toEqual([]);
    expect(result.notShipped.map((a) => a.name)).toEqual(['glob']);
    expect(result.buildOnly).toEqual([
      'node_modules/build-plugin',
      'node_modules/glob',
    ]);
  });

  it('only uses direct advisories, so "depends on" rows never block on their own', () => {
    // npm reports `framework` itself as HIGH because it depends on a
    // vulnerable version of something. That row is a pointer, not a fault in
    // framework's own code; blocking on it would re-block on glob.
    const result = assessRuntimeAdvisories({
      lock: lockOf(),
      audit: highInGlob,
      shipped: shippedFramework,
      buildOnlyEdges: buildPluginEdge,
    });
    expect(
      [...result.blocking, ...result.notShipped].map((a) => a.name),
    ).toEqual(['glob']);
  });

  it('still blocks when the same package is also reachable without the edge', () => {
    const lock = lockOf({
      'node_modules/runtime-helper': {
        version: '1.0.0',
        dependencies: { glob: '1.0.0' },
      },
    });
    const result = assessRuntimeAdvisories({
      lock,
      audit: highInGlob,
      shipped: shippedFramework,
      buildOnlyEdges: buildPluginEdge,
    });
    expect(result.blocking.map((a) => a.name)).toEqual(['glob']);
    expect(result.notShipped).toEqual([]);
  });

  it('tells two installed copies apart: only the copy behind the edge is exempt', () => {
    const lock = lockOf({
      'node_modules/build-plugin/node_modules/glob': { version: '1.0.0' },
      'node_modules/glob': { version: '2.0.0' },
      'node_modules/runtime-helper': {
        version: '1.0.0',
        dependencies: { glob: '2.0.0' },
      },
    });
    const nested = auditOf([
      {
        name: 'glob',
        severity: 'high',
        nodes: ['node_modules/build-plugin/node_modules/glob'],
      },
    ]);
    const hoisted = auditOf([
      { name: 'glob', severity: 'high', nodes: ['node_modules/glob'] },
    ]);
    const assess = (audit: object) =>
      assessRuntimeAdvisories({
        lock,
        audit,
        shipped: shippedFramework,
        buildOnlyEdges: buildPluginEdge,
      });
    expect(assess(nested).blocking).toEqual([]);
    expect(assess(hoisted).blocking.map((a) => a.name)).toEqual(['glob']);
  });

  it('refuses the moment anything behind a declared edge reaches the build output', () => {
    const shipped = [
      ...shippedFramework,
      {
        environment: 'worker',
        packages: [
          {
            path: 'node_modules/glob',
            name: 'glob',
            version: '1.0.0',
            files: 1,
          },
        ],
      },
    ];
    const result = assessRuntimeAdvisories({
      lock: lockOf(),
      audit: highInGlob,
      shipped,
      buildOnlyEdges: buildPluginEdge,
    });
    expect(result.problems.join('\n')).toMatch(
      /node_modules\/glob is behind a BUILD_ONLY_EDGES declaration/,
    );
    // ...and it is no longer exempt: it is a shipped package with an advisory.
    expect(result.blocking.map((a) => a.name)).toEqual(['glob']);
    expect(result.notShipped).toEqual([]);
  });

  it('refuses a shipped package that npm files as dev-only, which no blocking audit would see', () => {
    // The pdfjs-dist case, found 2026-10-13.
    const shipped = [
      {
        environment: 'client',
        packages: [
          {
            path: 'node_modules/tool',
            name: 'tool',
            version: '1.0.0',
            files: 3,
          },
        ],
      },
    ];
    const result = assessRuntimeAdvisories({
      lock: lockOf(),
      audit: auditOf([]),
      shipped,
      buildOnlyEdges: [],
    });
    expect(result.problems.join('\n')).toMatch(
      /node_modules\/tool ships in client \(3\) but npm files it as dev-only/,
    );
  });

  it('refuses a declaration for an edge the lockfile no longer has', () => {
    const result = assessRuntimeAdvisories({
      lock: lockOf(),
      audit: auditOf([]),
      shipped: shippedFramework,
      buildOnlyEdges: [{ from: 'framework', to: 'renamed-plugin' }],
    });
    expect(result.problems.join('\n')).toMatch(
      /declares framework -> renamed-plugin/,
    );
  });

  it('refuses a build record naming a package the lockfile does not list', () => {
    const shipped = [
      {
        environment: 'client',
        packages: [
          {
            path: 'node_modules/ghost',
            name: 'ghost',
            version: '1.0.0',
            files: 1,
          },
        ],
      },
    ];
    const result = assessRuntimeAdvisories({
      lock: lockOf(),
      audit: auditOf([]),
      shipped,
      buildOnlyEdges: [],
    });
    expect(result.problems.join('\n')).toMatch(
      /bundled node_modules\/ghost, which package-lock.json does not list/,
    );
  });

  it('blocks on CRITICAL and HIGH, and only reports MODERATE and below', () => {
    const audit = auditOf([
      {
        name: 'runtime-helper',
        severity: 'critical',
        nodes: ['node_modules/runtime-helper'],
      },
      {
        name: 'framework',
        severity: 'moderate',
        nodes: ['node_modules/framework'],
      },
    ]);
    const result = assessRuntimeAdvisories({
      lock: lockOf(),
      audit,
      shipped: shippedFramework,
      buildOnlyEdges: buildPluginEdge,
    });
    expect(result.blocking.map((a) => a.name)).toEqual(['runtime-helper']);
    expect(result.belowThreshold.map((a) => a.name)).toEqual(['framework']);
  });

  it('fails closed on an advisory it cannot place', () => {
    const audit = auditOf([
      { name: 'stranger', severity: 'high', nodes: ['node_modules/stranger'] },
      { name: 'nowhere', severity: 'high', nodes: [] },
    ]);
    const result = assessRuntimeAdvisories({
      lock: lockOf(),
      audit,
      shipped: shippedFramework,
      buildOnlyEdges: buildPluginEdge,
    });
    expect(
      result.blocking.map((a) => a.name).sort((a, b) => a.localeCompare(b)),
    ).toEqual(['nowhere', 'stranger']);
  });

  it('refuses when its own walk of the lockfile disagrees with the flags npm wrote', () => {
    // A lockfile that says runtime-helper is dev-only while framework, a
    // runtime dependency, depends on it. Either the walk or the file is
    // wrong, and the gate must not narrow anything on a graph it cannot trust.
    const lock = lockOf({
      'node_modules/runtime-helper': { version: '1.0.0', dev: true },
    });
    const result = assessRuntimeAdvisories({
      lock,
      audit: auditOf([]),
      shipped: [],
      buildOnlyEdges: [],
    });
    expect(result.problems.join('\n')).toMatch(
      /disagree about the runtime graph/,
    );
  });

  it('follows peer and optional edges, because npm installs and audits them', () => {
    const lock = lockOf({
      'node_modules/framework': {
        version: '1.0.0',
        dependencies: { 'build-plugin': '1.0.0', 'runtime-helper': '1.0.0' },
        peerDependencies: { react: '19.0.0' },
        optionalDependencies: { 'native-binding': '1.0.0' },
      },
      'node_modules/react': { version: '19.0.0' },
      'node_modules/native-binding': { version: '1.0.0' },
    });
    expect([...runtimeGraph(lock)].sort((a, b) => a.localeCompare(b))).toEqual([
      'node_modules/build-plugin',
      'node_modules/framework',
      'node_modules/glob',
      'node_modules/native-binding',
      'node_modules/react',
      'node_modules/runtime-helper',
    ]);
  });
});

describe('this repository', () => {
  const projectRoot = path.resolve(import.meta.dirname, '..');
  const lock = JSON.parse(
    readFileSync(path.join(projectRoot, 'package-lock.json'), 'utf8'),
  );
  const manifest = JSON.parse(
    readFileSync(path.join(projectRoot, 'package.json'), 'utf8'),
  );

  it("walks package-lock.json to exactly npm's own runtime set, with every declared edge present", () => {
    const result = assessRuntimeAdvisories({
      lock,
      audit: { vulnerabilities: {} },
      shipped: [],
      buildOnlyEdges: BUILD_ONLY_EDGES,
    });
    expect(result.problems).toEqual([]);
  });

  it('never puts a direct dependency behind a build-only edge', () => {
    // An edge may hide what a shipped package needs only to build. It may
    // never hide something this project imports itself.
    const { buildOnly } = assessRuntimeAdvisories({
      lock,
      audit: { vulnerabilities: {} },
      shipped: [],
      buildOnlyEdges: BUILD_ONLY_EDGES,
    });
    const direct = Object.keys(manifest.dependencies).map(
      (name) => `node_modules/${name}`,
    );
    expect(buildOnly.filter((p) => direct.includes(p))).toEqual([]);
  });

  it('keeps each build-only declaration an edge with a measured reason, and nothing else', () => {
    // No advisory ids, no versions, no expiry dates: the moment an entry
    // needs one of those it has become an allowlist.
    for (const edge of BUILD_ONLY_EDGES) {
      expect(Object.keys(edge).sort((a, b) => a.localeCompare(b))).toEqual([
        'from',
        'to',
        'why',
      ]);
      expect(edge.why).toMatch(/Measured \d{4}-\d{2}-\d{2}/);
    }
  });

  it('requires a record from every output, Web Workers included', () => {
    // Vite bundles Web Workers in a separate pass that only runs
    // `worker.plugins`. Without the worker record, onnxruntime-web, libheif-js
    // and the PDF engine's pdf-lib were missing from the measurement.
    expect([...REQUIRED_RECORDS].sort((a, b) => a.localeCompare(b))).toEqual([
      'client',
      'rsc',
      'ssr',
      'worker',
    ]);
    const viteConfig = readFileSync(
      path.join(projectRoot, 'vite.config.ts'),
      'utf8',
    );
    expect(viteConfig).toContain('shippedPackagesPlugin()');
    expect(viteConfig).toContain(
      "worker: { plugins: () => [shippedPackagesPlugin('worker')] }",
    );
  });
});
