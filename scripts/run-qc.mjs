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
    Two advisory gates, and only one of them can stop a release.

    WHAT BLOCKS: a HIGH advisory reachable from a *runtime* dependency -- the
    code that is bundled into the Worker and the client, which a visitor
    executes. `--omit=dev` narrows the audit to exactly that graph and to
    nothing else.

    WHY IT WAS NARROWED (2026-09-30). The unnarrowed gate had stopped every
    lane in the repository, and no pull request could fix it. The single HIGH
    was `undici@7.29.0`, reachable only as
    `@cloudflare/vite-plugin -> miniflare -> undici`, both of which are
    devDependencies. It shipped nothing: a built `dist/` of 4,007 files
    contains zero occurrences of `undici`, `miniflare`, `permessage-deflate`,
    `RetryHandler` or `BalancedPool`. The advisories are WebSocket, retry and
    cache faults in miniflare's HTTP client -- the local dev simulator. No
    visitor can reach it, because it is not there.

    It was also not any branch's doing, which is what made it the wrong shape
    of gate: a branch whose `package-lock.json` was byte-identical to `main`'s
    failed, while `main`'s own last green run predated the advisory being
    published. The gate was reporting the calendar, not the diff, and a
    re-run could not clear it.

    WHY NOT UPGRADE INSTEAD. `@cloudflare/vite-plugin@1.62.2` pins
    `miniflare@5.20260926.1-alpha`, which exact-pins `undici@7.29.1` -- one
    patch above the vulnerable ceiling, on the 7.x line that has taken ten
    advisories. The next one re-blocks every lane, and clearing it would again
    wait on Cloudflare's alpha release cadence rather than on us. Buying that
    week costs `workerd 1.20260916.1 -> 1.20260926.1` and eight plugin minor
    versions inside the tool that produces the deployed Worker. Changing
    production bytes to reset a clock is a worse trade than fixing what the
    gate measures.

    WHAT THIS GIVES UP, AND WHY THE SECOND GATE EXISTS. `.github/SECURITY.md`
    lists supply chain compromise as a vulnerability class, and the toolchain
    that builds the Worker is squarely in it: a compromised build dependency
    can write anything it likes into `dist/`. So the full audit still runs, on
    every release pass, printing every dev advisory -- it simply cannot set
    the exit code. Invisible is the failure mode that mattered; blocking was
    never what made it visible.

    NO ALLOWLIST, DELIBERATELY. An allowlist with expiry dates was considered
    and rejected. It was only ever needed to work around a gate that stopped
    releases over advisories nobody could act on; once the blocking gate
    covers only shipped code, every advisory it raises is one we must actually
    fix, and a mechanism for waving those through is a mechanism for shipping
    known-vulnerable runtime code on a deadline nobody would be watching.
    The dev advisories it would have held are now on screen instead.

    The full measurements behind every claim above -- the dist/ sweep, the
    upgrade's dependency table, and the fixture runs that prove a runtime
    advisory still blocks -- are in `docs/DEPENDENCY_ADVISORIES.md`.

    The wiring of both gates, including that this one keeps `--audit-level`
    at `high` and that the report is never blocking, is pinned by
    `scripts/audit-gate.test.ts`. Do not weaken this to `critical`: the flag
    that narrows it is `--omit=dev`, which changes *whose* code is audited,
    not *how bad* a fault has to be before someone is told.
  */
  gates.splice(5, 0, {
    name: 'DEPENDENCY ADVISORIES (RUNTIME)',
    command: 'npm',
    args: ['audit', '--audit-level=high', '--omit=dev'],
    cwd: appRoot,
  });

  // Report only. `blocking: false` is honoured by the runner below, which
  // prints the outcome and carries on. No `--omit=dev` here on purpose --
  // omitting dev is what would make this gate report nothing at all.
  gates.splice(6, 0, {
    name: 'DEPENDENCY ADVISORIES (BUILD TOOLCHAIN, REPORT ONLY)',
    command: 'npm',
    args: ['audit', '--audit-level=high'],
    cwd: appRoot,
    blocking: false,
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
