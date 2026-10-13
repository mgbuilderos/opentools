import { execSync, spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const blueprintRoot = path.resolve(appRoot, '../..');
const releaseMode = process.argv.includes('--release');

/**
 * Several unit tests (`edge-cache-headers`, `heading-order`, `share-card-coverage`,
 * and `indexability-sweep`) read `dist/client/`. If `dist/` is older than the
 * latest source-touching commit, or older than source files, running the unit
 * suite produces misleading test diffs that look like regressions.
 *
 * Refuse early with a plain instruction to build.
 *
 * Known limitation: the mtime scan will false-positive after a branch switch,
 * because git rewrites the mtime of every file it touches. That failure points
 * the safe direction (it asks for a rebuild that is merely unnecessary), so it stays.
 *
 * A MISSING `dist/` IS A DIFFERENT CASE, and refusing on it was wrong. A fresh
 * checkout has nothing stale to be misled by, and CI is exactly that: it clones,
 * installs and runs `npm run qc`. From 2026-09-24 every pull request therefore
 * failed on the first line with "dist/ is missing" and not one gate ran --
 * observed on PR #3, where the same tree passed 8/8 locally. The build is
 * already one of these gates; when nothing is built it simply has to run before
 * the tests that read it. This returns false in that case and the caller moves
 * BUILD to the front.
 *
 * @returns true when a usable `dist/` is already present.
 */
function assertFreshDist() {
  const sitemap = path.join(appRoot, 'dist/client/sitemap.xml');
  if (!existsSync(sitemap)) {
    process.stdout.write(
      '[QC] dist/ is missing, so BUILD runs before the tests that read it.\n',
    );
    return false;
  }

  const distTime = statSync(sitemap).mtimeMs;

  try {
    const rawCommitTime = execSync(
      'git log -1 --format=%ct -- app components lib public',
      {
        cwd: appRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      },
    ).trim();

    if (rawCommitTime) {
      const sourceCommitTimeSeconds = parseInt(rawCommitTime, 10);
      if (
        Number.isFinite(sourceCommitTimeSeconds) &&
        distTime < sourceCommitTimeSeconds * 1000
      ) {
        process.stderr.write(
          '[QC] dist/ is older than the last source commit. Run `npm run build` before running QC.\n',
        );
        process.exit(1);
      }
    }
  } catch {
    // Skip if not in a git repo or git fails.
  }

  function findNewerSource(dir) {
    if (!existsSync(dir)) return null;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const found = findNewerSource(full);
        if (found) return found;
      } else if (statSync(full).mtimeMs > distTime) {
        return path.relative(appRoot, full);
      }
    }
    return null;
  }

  for (const src of ['app', 'components', 'lib', 'public']) {
    const newer = findNewerSource(path.join(appRoot, src));
    if (newer) {
      process.stderr.write(
        `[QC] dist/ is older than ${newer}. Run \`npm run build\` before running QC.\n`,
      );
      process.exit(1);
    }
  }

  return true;
}

const distIsBuilt = assertFreshDist();

const gates = [
  {
    name: 'FORMAT',
    command: 'npm',
    args: ['run', 'format:check'],
    cwd: appRoot,
  },
  {
    name: 'UNIT + ALL-OPERATION I/O',
    command: 'npm',
    args: ['test'],
    cwd: appRoot,
  },
  {
    name: 'TYPE CHECK',
    command: 'npm',
    args: ['run', 'typecheck'],
    cwd: appRoot,
  },
  {
    name: 'LINT',
    command: 'npm',
    args: ['run', 'lint', '--', '--deny-warnings'],
    cwd: appRoot,
  },
  {
    name: 'DESIGN SYSTEM',
    command: 'npm',
    args: ['run', 'design:qc'],
    cwd: appRoot,
  },
  { name: 'BUILD', command: 'npm', args: ['run', 'build'], cwd: appRoot },
  {
    name: 'SBOM INVENTORY',
    command: 'npm',
    args: ['run', 'sbom', '--', '--check'],
    cwd: appRoot,
  },
];

// The blueprint package lives outside the public repository; standalone
// checkouts (including CI) skip this gate.
if (existsSync(path.join(blueprintRoot, 'scripts/verify_blueprint.mjs'))) {
  gates.push({
    name: 'BLUEPRINT INTEGRITY',
    command: process.execPath,
    args: ['scripts/verify_blueprint.mjs'],
    cwd: blueprintRoot,
  });
} else {
  process.stdout.write(
    '[QC] BLUEPRINT INTEGRITY skipped: blueprint package not present.\n',
  );
}

/*
  Nothing built yet, so BUILD leads.

  The order the gates run in is otherwise deliberate -- format and lint before
  a four-minute build, so a missing semicolon fails in seconds. That reasoning
  only holds when there is a build to read; on a fresh checkout the choice is
  between building first and failing four gates that read `dist/`.
*/
if (!distIsBuilt) {
  const buildIndex = gates.findIndex((gate) => gate.name === 'BUILD');
  if (buildIndex < 0) {
    process.stderr.write(
      '[QC] cannot place BUILD first: no gate named BUILD. ' +
        'If BUILD was renamed, update this lookup.\n',
    );
    process.exit(1);
  }
  const [build] = gates.splice(buildIndex, 1);
  gates.unshift(build);
}

if (releaseMode) {
  /*
    Two advisory gates, and only one of them can stop a release. Both run
    straight after BUILD, because the blocking one reads what BUILD wrote.

    WHAT BLOCKS: a HIGH or CRITICAL advisory in code a visitor can execute.
    `scripts/audit-runtime.mjs` decides that. It runs
    `npm audit --omit=dev --json`, so npm's runtime graph is the starting
    point and everything in it blocks by default -- then corrects that graph
    with what the build measured (`lib/build/shipped-packages.ts` records every
    installed package the bundler put into the client, the Worker and the Web
    Workers):

      - a package that ships while npm files it as dev-only stops the release
        (this is how `pdfjs-dist` was found, 2026-10-13: shipped to every PDF
        tool, never audited by a blocking gate);
      - a package npm reaches only through a declared build-only edge
        (`BUILD_ONLY_EDGES`, one entry: vinext's Vite plugin's own glob
        dependencies) does not block, provided the build just measured that
        nothing behind that edge reached any output. If anything behind it
        ships, the gate fails.

    WHY THE PLAIN `npm audit --omit=dev` WAS REPLACED (2026-10-13). From
    2026-10-12 it stopped every pull request on `braces` (GHSA-vfj7-8cjw-p6xm,
    every published version affected), reached as `vinext ->
    vite-plugin-commonjs -> vite-plugin-dynamic-import -> fast-glob ->
    micromatch -> braces`. vinext ships, so it is correctly a dependency; its
    Vite plugin's glob library does not, and a 3,046-file `dist/` holds none of
    it. No release of braces, micromatch, fast-glob, either plugin or vinext
    (through 1.1.0) removes it, and `npm audit fix --force` would downgrade
    vinext to 0.0.15. Moving vinext to devDependencies was measured and
    refused: 453 of its modules (server runtime, router, `next/*` shims) are
    bundled into the client and the Worker, so that would have stopped
    auditing code that runs on every page.

    WHY IT WAS NARROWED TO RUNTIME AT ALL (2026-09-30). The unnarrowed audit
    stopped every lane on `undici@7.29.0`, reachable only through
    `@cloudflare/vite-plugin -> miniflare`, both devDependencies, with zero
    occurrences in a 4,007-file `dist/`. It was nobody's change and no pull
    request could clear it: the gate was reporting the advisory calendar, not
    the diff.

    WHAT THIS GIVES UP, AND WHY THE SECOND GATE EXISTS. `.github/SECURITY.md`
    lists supply chain compromise as a vulnerability class, and the toolchain
    that builds the Worker is squarely in it: a compromised build dependency
    can write anything it likes into `dist/`. So the full audit still runs, on
    every release pass, printing every advisory -- it simply cannot set the
    exit code. Invisible is the failure mode that mattered; blocking was
    never what made it visible.

    NO ALLOWLIST, DELIBERATELY. An allowlist names advisories and waives them;
    a mechanism for waving those through is a mechanism for shipping
    known-vulnerable runtime code on a deadline nobody would be watching. A
    build-only edge names no advisory and waives nothing that ships: it says
    where code goes, and the build checks that claim every time.

    The measurements behind every claim above -- the dist/ sweeps, the
    package tables, and the fixture runs proving that a runtime advisory still
    blocks -- are in `docs/DEPENDENCY_ADVISORIES.md`.

    The wiring of both gates, including that the blocking one keeps HIGH as
    its threshold and that the report is never blocking, is pinned by
    `scripts/audit-gate.test.ts`, and the decision itself by
    `scripts/audit-runtime.test.ts`. Do not weaken the threshold to
    `critical`: narrowing changes *whose* code is audited, not *how bad* a
    fault has to be before someone is told.
  */
  const buildIndex = gates.findIndex((gate) => gate.name === 'BUILD');
  if (buildIndex < 0) {
    // Not defensive noise: `findIndex` returns -1 when the gate is renamed,
    // and -1 + 1 is 0, which would run the gates that read `dist/` FIRST --
    // against a `dist/` from some earlier pass, or none at all. Fail here,
    // where the cause is obvious.
    process.stderr.write(
      '[QC] cannot place the release gates: no gate named BUILD. ' +
        'If BUILD was renamed, update this lookup.\n',
    );
    process.exit(1);
  }

  const releaseGates = [
    {
      name: 'DEPENDENCY ADVISORIES (RUNTIME)',
      command: process.execPath,
      args: ['scripts/audit-runtime.mjs'],
      cwd: appRoot,
    },
    // Report only. `blocking: false` is honoured by the runner below, which
    // prints the outcome and carries on. No `--omit=dev` here on purpose --
    // this is the one place the build toolchain's advisories are shown.
    {
      name: 'DEPENDENCY ADVISORIES (BUILD TOOLCHAIN, REPORT ONLY)',
      command: 'npm',
      args: ['audit', '--audit-level=high'],
      cwd: appRoot,
      blocking: false,
    },
    // End-to-end runs in release mode only, and it runs *after* BUILD so it
    // exercises the bytes this pass just produced.
    //
    // Why it exists: the eight everyday gates never open a page. On 2026-09-21
    // the file-upload path was broken in seven specs — files handed to a
    // server-rendered input before React hydrated went nowhere — and every one
    // of those gates stayed green while it reached `main`. A page that cannot
    // accept a file is not something format, lint, types or a unit suite can
    // see. Anything user-facing needs a browser to have opened it.
    //
    // `E2E_SKIP_BUILD` stops Playwright's `webServer` rebuilding what BUILD has
    // already made a moment earlier. `e2e/global-setup.ts` still refuses to run
    // against a server whose app chunk is not this worktree's, so a stray
    // preview on 8788 fails the gate loudly instead of passing it silently.
    {
      name: 'END-TO-END (BROWSER)',
      command: 'npx',
      args: ['playwright', 'test'],
      cwd: appRoot,
      env: { ...process.env, E2E_SKIP_BUILD: '1' },
    },
  ];
  // The advisory gates take seconds, so they go before the forty-minute
  // browser gate: a blocked release should say so before, not after, it.
  gates.splice(buildIndex + 1, 0, ...releaseGates);
}

const started = performance.now();
for (const gate of gates) {
  process.stdout.write(`\n[QC] ${gate.name}\n`);
  const result = spawnSync(gate.command, gate.args, {
    cwd: gate.cwd,
    env: gate.env ?? process.env,
    stdio: 'inherit',
  });

  /*
    A gate marked `blocking: false` reports and does not stop the pass. It is
    not a softer gate; it is a different job. The only one today is the
    toolchain advisory report, whose findings are real but are not release
    blockers -- see the reasoning where it is defined.

    It still has to be LOUD. The whole point of keeping it is that a
    supply-chain advisory in the tool that builds the Worker stays in front of
    whoever runs a release, so its non-zero exit is announced rather than
    swallowed, and `stdio: 'inherit'` above has already printed npm's own
    report in full. What it must never do is call `process.exit`.
  */
  if (gate.blocking === false) {
    if (result.error) {
      process.stderr.write(
        `[QC] ${gate.name} could not run: ${result.error.message}\n` +
          '[QC] This gate does not block, so the pass continues -- but it ' +
          'reported nothing, which is not the same as reporting nothing ' +
          'wrong.\n',
      );
    } else if (result.status !== 0) {
      process.stderr.write(
        `[QC] ${gate.name} FOUND ADVISORIES (exit ${result.status}). ` +
          'Not a release blocker; read the report above.\n',
      );
    } else {
      process.stdout.write(`[QC] ${gate.name}: nothing to report.\n`);
    }
    continue;
  }

  if (result.error) {
    process.stderr.write(
      `[QC] ${gate.name} could not start: ${result.error.message}\n`,
    );
    process.exit(1);
  }
  if (result.status !== 0) {
    process.stderr.write(
      `[QC] BLOCKED at ${gate.name} (exit ${result.status ?? 'unknown'}).\n`,
    );
    process.exit(result.status ?? 1);
  }
}

const elapsedSeconds = ((performance.now() - started) / 1_000).toFixed(2);
const blockingGateCount = gates.filter(
  (gate) => gate.blocking !== false,
).length;
process.stdout.write(
  `\n[QC] PASS — ${blockingGateCount} mandatory automated gates completed in ${elapsedSeconds}s.\n`,
);
process.stdout.write(
  '[QC] This pass covers the exact local source/build. Human, cross-browser, corpus, and formal egress sign-offs remain separate release requirements.\n',
);
