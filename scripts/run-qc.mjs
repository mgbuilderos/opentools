import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const blueprintRoot = path.resolve(appRoot, '../..');
const releaseMode = process.argv.includes('--release');

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
