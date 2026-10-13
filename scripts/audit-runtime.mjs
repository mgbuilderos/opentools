/**
 * DEPENDENCY ADVISORIES (RUNTIME): stop a release on a HIGH or CRITICAL
 * advisory in code a visitor can execute.
 *
 * Until 2026-10-13 this gate was `npm audit --audit-level=high --omit=dev`,
 * which takes "runtime" to mean "reached from `dependencies` in
 * package.json". That is a proxy, and on 2026-10-13 it was wrong in both
 * directions at once:
 *
 *   TOO WIDE. `vinext` ships (its router and `next/*` shims are in every
 *   output) and so belongs in `dependencies` -- but npm also counts what its
 *   Vite plugin needs at build time. `vinext -> vite-plugin-commonjs ->
 *   vite-plugin-dynamic-import -> fast-glob -> micromatch -> braces` put a
 *   glob library with an unfixed HIGH (GHSA-vfj7-8cjw-p6xm, every published
 *   version) in the "runtime" graph. A 3,046-file `dist/` holds none of it.
 *   No version of any package on that path is free of it, so every pull
 *   request was red and none could turn green.
 *
 *   TOO NARROW. `pdfjs-dist` was a devDependency, so `--omit=dev` never
 *   audited it -- while the client ships pdf.js 6.3.289 to anyone who opens a
 *   PDF tool, and pdf.js parses the visitor's own, untrusted file. It is now
 *   in `dependencies`, and check (3) below keeps it there.
 *
 * So the gate keeps npm's runtime graph as the default -- everything in it
 * still blocks -- and corrects it with what the build measured. Three checks,
 * all of which must pass:
 *
 *   (1) The graph this script walks must be npm's own. It is recomputed from
 *       `package-lock.json` and compared, package by package, with the `dev`
 *       flags npm wrote there. If they ever differ, the gate refuses rather
 *       than trust its own reading.
 *
 *   (2) Every package the bundler put into the output
 *       (`dist/shipped-packages/*.json`, written by
 *       `lib/build/shipped-packages.ts`) must be in that runtime graph. A
 *       shipped package npm files as dev-only is a package no audit blocks on.
 *
 *   (3) A package is taken out of the blocking set only when the ONLY way the
 *       runtime graph reaches it is through an edge in BUILD_ONLY_EDGES below
 *       -- and the build has just measured that nothing behind that edge
 *       reached any output. If one module from behind a declared edge ever
 *       ships, this gate fails until the declaration is removed.
 *
 * WHY THIS IS NOT AN ALLOWLIST. An allowlist names advisories and waives
 * them, and `docs/DEPENDENCY_ADVISORIES.md` explains why there is none. A
 * build-only edge names neither an advisory nor a package version: it says
 * where code goes, the same statement `devDependencies` makes, for the one
 * case npm cannot express -- a shipped package whose own dependency does not
 * ship. Every advisory behind it is still printed, by this gate and by the
 * full report that runs next, and anything behind it that reaches `dist/`
 * blocks.
 *
 * WHAT IT STILL BLOCKS ON THAT THE BUILD CANNOT SEE. Files copied verbatim
 * from `public/` -- the Tesseract core and language data, the ONNX Runtime
 * and libheif binaries -- never pass through the bundler. Their packages are
 * still in the runtime graph and are not behind a build-only edge, so an
 * advisory in any of them blocks exactly as before.
 *
 * Run it after BUILD: it reads what the build wrote. `--root` and
 * `--inventory` point it at a fixture, which is how the cases in
 * `docs/DEPENDENCY_ADVISORIES.md` were proved against the real npm registry.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** The same threshold as `--audit-level=high`. Do not drop `high`. */
export const BLOCKING_SEVERITIES = Object.freeze(['high', 'critical']);

/**
 * Dependency edges npm counts as runtime that the build proves are not.
 *
 * Each entry is one `from -> to` edge in `package-lock.json`, matched by
 * package name. Keep it short and keep each `why` measured: the edge is
 * re-checked against the build on every release pass.
 */
export const BUILD_ONLY_EDGES = Object.freeze([
  Object.freeze({
    from: 'vinext',
    to: 'vite-plugin-commonjs',
    why:
      'Imported only by vinext/dist/index.js and vinext/dist/config/next-config.js, ' +
      "which build vinext's Vite plugin. The router and next/* shims that ship " +
      'import none of it. Measured 2026-10-13: 0 modules from vite-plugin-commonjs, ' +
      'vite-plugin-dynamic-import, fast-glob, micromatch or braces in any of the ' +
      'client, rsc, ssr or Web Worker outputs.',
  }),
]);

/** The records the build must have written, one per output. */
export const REQUIRED_RECORDS = Object.freeze([
  'client',
  'rsc',
  'ssr',
  'worker',
]);

/** The name a lockfile entry installs as. */
function packageName(lockPath, entry) {
  if (!lockPath) return entry.name;
  return lockPath.slice(
    lockPath.lastIndexOf('node_modules/') + 'node_modules/'.length,
  );
}

/** Node's lookup: the nearest `node_modules/<name>` walking up from `from`. */
function resolveDependency(packages, from, name) {
  let base = from;
  for (;;) {
    const candidate = base
      ? `${base}/node_modules/${name}`
      : `node_modules/${name}`;
    if (packages[candidate]) return candidate;
    if (!base) return null;
    const parent = base.lastIndexOf('/node_modules/');
    base = parent < 0 ? '' : base.slice(0, parent);
  }
}

/**
 * Every installed package reachable from the project without passing through
 * `devDependencies`, as `package-lock.json` paths. With no edges skipped this
 * is the graph `npm audit --omit=dev` audits.
 *
 * Peer and optional edges are followed when the target is installed, because
 * npm installs and audits them.
 */
export function runtimeGraph(lock, skipEdges = []) {
  const { packages } = lock;
  const skip = new Set(skipEdges.map((edge) => `${edge.from}\0${edge.to}`));
  const reached = new Set();
  const queue = [''];
  while (queue.length > 0) {
    const from = queue.shift();
    const entry = packages[from];
    const fromName = packageName(from, entry);
    const names = new Set([
      ...Object.keys(entry.dependencies ?? {}),
      ...Object.keys(entry.optionalDependencies ?? {}),
      ...Object.keys(entry.peerDependencies ?? {}),
    ]);
    for (const name of names) {
      if (skip.has(`${fromName}\0${name}`)) continue;
      const to = resolveDependency(packages, from, name);
      if (to === null || reached.has(to)) continue;
      reached.add(to);
      queue.push(to);
    }
  }
  return reached;
}

/** What npm itself marked as not dev-only when it wrote the lockfile. */
export function npmRuntimeSet(lock) {
  return new Set(
    Object.entries(lock.packages)
      .filter(([lockPath, entry]) => lockPath && !entry.dev && !entry.link)
      .map(([lockPath]) => lockPath),
  );
}

/** Direct advisories in an `npm audit --json` report (not "depends on" rows). */
export function advisoriesIn(audit) {
  const found = [];
  for (const vulnerability of Object.values(audit.vulnerabilities ?? {})) {
    for (const via of vulnerability.via) {
      if (typeof via !== 'object') continue;
      found.push({
        name: vulnerability.name,
        severity: via.severity,
        title: via.title,
        url: via.url,
        range: via.range,
        nodes: [...vulnerability.nodes],
      });
    }
  }
  return found;
}

/**
 * The decision, with no I/O so it can be tested on fixtures.
 *
 * @param {object} input
 * @param {object} input.lock      parsed package-lock.json (v2 or v3)
 * @param {object} input.audit     parsed `npm audit --omit=dev --json`
 * @param {Array<{environment: string, packages: Array<{path: string, name: string, files: number}>}>} input.shipped
 * @param {ReadonlyArray<{from: string, to: string}>} input.buildOnlyEdges
 */
export function assessRuntimeAdvisories({
  lock,
  audit,
  shipped,
  buildOnlyEdges,
}) {
  const problems = [];
  const npmRuntime = npmRuntimeSet(lock);
  const walked = runtimeGraph(lock);

  // (1) The walk has to be npm's graph, or nothing below means anything.
  const onlyNpm = [...npmRuntime].filter((p) => !walked.has(p));
  const onlyWalked = [...walked].filter((p) => !npmRuntime.has(p));
  if (onlyNpm.length > 0 || onlyWalked.length > 0) {
    problems.push(
      'This script and npm disagree about the runtime graph, so it cannot be ' +
        'trusted to narrow it. ' +
        (onlyNpm.length
          ? `npm counts, this walk misses: ${onlyNpm.join(', ')}. `
          : '') +
        (onlyWalked.length
          ? `This walk counts, npm marks dev: ${onlyWalked.join(', ')}.`
          : ''),
    );
  }

  for (const edge of buildOnlyEdges) {
    const exists = Object.entries(lock.packages).some(
      ([lockPath, entry]) =>
        packageName(lockPath, entry) === edge.from &&
        (edge.to in (entry.dependencies ?? {}) ||
          edge.to in (entry.optionalDependencies ?? {}) ||
          edge.to in (entry.peerDependencies ?? {})),
    );
    if (!exists)
      problems.push(
        `BUILD_ONLY_EDGES declares ${edge.from} -> ${edge.to}, and package-lock.json ` +
          'has no such edge. Delete the declaration; a stale one would quietly ' +
          'cover whatever takes its name next.',
      );
  }

  const narrowed = runtimeGraph(lock, buildOnlyEdges);
  const buildOnly = new Set([...walked].filter((p) => !narrowed.has(p)));

  // (2) and (3): measured against what the build actually wrote.
  const whereShipped = new Map();
  for (const record of shipped)
    for (const pkg of record.packages) {
      const where = whereShipped.get(pkg.path) ?? [];
      where.push(`${record.environment} (${pkg.files})`);
      whereShipped.set(pkg.path, where);
    }
  for (const [lockPath, where] of whereShipped) {
    if (!lock.packages[lockPath]) {
      problems.push(
        `The build bundled ${lockPath}, which package-lock.json does not list. ` +
          'Rebuild after `npm ci` so the record and the lockfile describe the same install.',
      );
      continue;
    }
    if (!npmRuntime.has(lockPath))
      problems.push(
        `${lockPath} ships in ${where.join(', ')} but npm files it as dev-only, so ` +
          'no blocking audit ever looks at it. Move it to `dependencies`.',
      );
    if (buildOnly.has(lockPath))
      problems.push(
        `${lockPath} is behind a BUILD_ONLY_EDGES declaration, and the build put it ` +
          `into ${where.join(', ')}. It ships, so it blocks: remove the declaration.`,
      );
  }

  const blocking = [];
  const notShipped = [];
  const belowThreshold = [];
  for (const advisory of advisoriesIn(audit)) {
    if (!BLOCKING_SEVERITIES.includes(advisory.severity)) {
      belowThreshold.push(advisory);
      continue;
    }
    // Anything not proven build-only blocks, including a node this walk does
    // not know and a build-only node the build just shipped: failing closed
    // is the point of a gate.
    const provenBuildOnly =
      advisory.nodes.length > 0 &&
      advisory.nodes.every(
        (node) => buildOnly.has(node) && !whereShipped.has(node),
      );
    if (provenBuildOnly) notShipped.push(advisory);
    else blocking.push(advisory);
  }

  return {
    problems,
    blocking,
    notShipped,
    belowThreshold,
    buildOnly: [...buildOnly].sort((a, b) => a.localeCompare(b)),
  };
}

function readShipped(inventoryDir) {
  if (!existsSync(inventoryDir))
    return { records: [], missing: [...REQUIRED_RECORDS] };
  const records = readdirSync(inventoryDir)
    .filter((file) => file.endsWith('.json'))
    .map((file) =>
      JSON.parse(readFileSync(path.join(inventoryDir, file), 'utf8')),
    );
  const present = new Set(records.map((record) => record.environment));
  return {
    records,
    missing: REQUIRED_RECORDS.filter((name) => !present.has(name)),
  };
}

function describe(advisory) {
  return `${advisory.name} (${advisory.severity}) ${advisory.title} -- ${advisory.url} [${advisory.nodes.join(', ')}]`;
}

function main() {
  const argValue = (flag) => {
    const at = process.argv.indexOf(flag);
    return at < 0 ? undefined : process.argv[at + 1];
  };
  const appRoot = path.resolve(
    argValue('--root') ?? path.join(import.meta.dirname, '..'),
  );
  const inventoryDir = path.resolve(
    argValue('--inventory') ?? path.join(appRoot, 'dist/shipped-packages'),
  );
  const out = (line = '') => process.stdout.write(`${line}\n`);
  const err = (line = '') => process.stderr.write(`${line}\n`);

  const { records, missing } = readShipped(inventoryDir);
  if (
    missing.length > 0 ||
    records.some((record) => record.packages.length === 0)
  ) {
    err(
      `[advisories] No usable record of what the build shipped in ${inventoryDir} ` +
        `(missing: ${missing.join(', ') || 'none'}; empty: ` +
        `${
          records
            .filter((r) => r.packages.length === 0)
            .map((r) => r.environment)
            .join(', ') || 'none'
        }). ` +
        'Run `npm run build` first. This gate refuses rather than guess.',
    );
    process.exit(1);
  }

  const lock = JSON.parse(
    readFileSync(path.join(appRoot, 'package-lock.json'), 'utf8'),
  );
  const result = spawnSync('npm', ['audit', '--omit=dev', '--json'], {
    cwd: appRoot,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  let audit;
  try {
    audit = JSON.parse(result.stdout);
  } catch {
    audit = null;
  }
  if (!audit || audit.error || typeof audit.vulnerabilities !== 'object') {
    err('[advisories] `npm audit --omit=dev --json` did not return a report:');
    err(
      audit?.error
        ? JSON.stringify(audit.error)
        : (result.stderr || result.stdout || '').slice(0, 2000),
    );
    err('[advisories] A gate that could not ask is not a gate that passed.');
    process.exit(1);
  }

  const assessment = assessRuntimeAdvisories({
    lock,
    audit,
    shipped: records,
    buildOnlyEdges: BUILD_ONLY_EDGES,
  });
  const shippedCount = new Set(
    records.flatMap((r) => r.packages.map((p) => p.path)),
  ).size;
  out(
    `[advisories] runtime graph: ${npmRuntimeSet(lock).size} packages (npm's own --omit=dev set, ` +
      `re-derived and matched); bundled into ${records.map((r) => r.environment).join(', ')}: ` +
      `${shippedCount}; behind a build-only edge: ${assessment.buildOnly.length}.`,
  );
  for (const edge of BUILD_ONLY_EDGES)
    out(`[advisories] build-only edge ${edge.from} -> ${edge.to}: ${edge.why}`);

  for (const advisory of assessment.notShipped)
    out(
      `[advisories] NOT SHIPPED, NOT BLOCKING (behind a build-only edge, 0 modules in dist/): ${describe(advisory)}`,
    );
  for (const advisory of assessment.belowThreshold)
    out(`[advisories] below the blocking level: ${describe(advisory)}`);
  for (const problem of assessment.problems)
    err(`[advisories] REFUSED: ${problem}`);
  for (const advisory of assessment.blocking)
    err(`[advisories] BLOCKING: ${describe(advisory)}`);

  if (assessment.problems.length > 0 || assessment.blocking.length > 0)
    process.exit(1);
  out(
    '[advisories] No HIGH or CRITICAL advisory in code a visitor can execute.',
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main();
