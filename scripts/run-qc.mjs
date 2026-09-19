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
    name: 'LINT',
    command: 'npm',
    args: ['run', 'lint', '--', '--deny-warnings'],
    cwd: appRoot,
  },
  {
    name: 'TYPE CHECK',
    command: 'npm',
    args: ['run', 'typecheck'],
    cwd: appRoot,
  },
  {
    name: 'UNIT + ALL-OPERATION I/O',
    command: 'npm',
    args: ['test'],
    cwd: appRoot,
  },
  {
    name: 'SBOM INVENTORY',
    command: 'npm',
    args: ['run', 'sbom', '--', '--check'],
    cwd: appRoot,
  },
  {
    name: 'IMPLEMENTATION REGISTRY DRIFT',
    command: process.execPath,
    args: ['scripts/generate_implementation_status.mjs', '--check'],
    cwd: blueprintRoot,
  },
  {
    name: 'BLUEPRINT INTEGRITY',
    command: process.execPath,
    args: ['scripts/verify_blueprint.mjs'],
    cwd: blueprintRoot,
  },
  { name: 'BUILD', command: 'npm', args: ['run', 'build'], cwd: appRoot },
];

if (releaseMode)
  gates.splice(4, 0, {
    name: 'DEPENDENCY ADVISORIES',
    command: 'npm',
    args: ['audit', '--audit-level=high'],
    cwd: appRoot,
  });

if (releaseMode)
  gates.push({
    name: 'RELEASE EVIDENCE + HUMAN AUTHORIZATION',
    command: process.execPath,
    args: ['scripts/check-release-readiness.mjs'],
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
if (releaseMode) {
  process.stdout.write(
    `\n[QC] RELEASE-AUTHORIZATION PASS — ${gates.length} gates completed in ${elapsedSeconds}s. This command does not deploy.\n`,
  );
} else {
  process.stdout.write(
    `\n[QC] SOURCE PREFLIGHT PASS — ${gates.length} automated gates completed in ${elapsedSeconds}s.\n`,
  );
  process.stdout.write(
    '[QC] RELEASE STATUS: BLOCKED until the remaining property/fuzz, integration, security, license, performance, runtime privacy, cross-browser, accessibility, staging, smoke, human-approval, and canary evidence is current and approved.\n',
  );
}
