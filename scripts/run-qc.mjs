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
  gates.splice(5, 0, {
    name: 'DEPENDENCY ADVISORIES',
    command: 'npm',
    args: ['audit', '--audit-level=high'],
    cwd: appRoot,
  });

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
  const buildIndex = gates.findIndex((gate) => gate.name === 'BUILD');
  if (buildIndex < 0) {
    // Not defensive noise: `findIndex` returns -1 when the gate is renamed,
    // and -1 + 1 is 0, which would run the browser gate FIRST — against a
    // `dist/` from some earlier pass, or none at all. Fail here, where the
    // cause is obvious, rather than inside Playwright's global setup.
    process.stderr.write(
      '[QC] cannot place END-TO-END: no gate named BUILD. ' +
        'If BUILD was renamed, update this lookup.\n',
    );
    process.exit(1);
  }
  gates.splice(buildIndex + 1, 0, {
    name: 'END-TO-END (BROWSER)',
    command: 'npx',
    args: ['playwright', 'test'],
    cwd: appRoot,
    env: { ...process.env, E2E_SKIP_BUILD: '1' },
  });
}

const started = performance.now();
for (const gate of gates) {
  process.stdout.write(`\n[QC] ${gate.name}\n`);
  const result = spawnSync(gate.command, gate.args, {
    cwd: gate.cwd,
    env: gate.env ?? process.env,
    stdio: 'inherit',
  });

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
process.stdout.write(
  `\n[QC] PASS — ${gates.length} mandatory automated gates completed in ${elapsedSeconds}s.\n`,
);
process.stdout.write(
  '[QC] This pass covers the exact local source/build. Human, cross-browser, corpus, and formal egress sign-offs remain separate release requirements.\n',
);
