import { spawnSync } from 'node:child_process';
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
  {
    name: 'BLUEPRINT INTEGRITY',
    command: process.execPath,
    args: ['scripts/verify_blueprint.mjs'],
    cwd: blueprintRoot,
  },
];

if (releaseMode)
  gates.splice(5, 0, {
    name: 'DEPENDENCY ADVISORIES',
    command: 'npm',
    args: ['audit', '--audit-level=high'],
    cwd: appRoot,
  });

const started = performance.now();
for (const gate of gates) {
  process.stdout.write(`\n[QC] ${gate.name}\n`);
  const result = spawnSync(gate.command, gate.args, {
    cwd: gate.cwd,
    env: process.env,
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
