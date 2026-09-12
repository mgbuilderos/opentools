import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const ledgerPath = path.join(appRoot, 'release', 'qc-release-ledger.json');
const requiredStages = [
  'PROPERTY/FUZZ',
  'INTEGRATION',
  'SECURITY',
  'LICENSE/SBOM',
  'PERFORMANCE',
  'PRIVACY-NETWORK',
  'CROSS-BROWSER',
  'ACCESSIBILITY',
  'STAGING',
  'SMOKE',
  'HUMAN APPROVAL',
  'CANARY',
];
const failures = [];

let ledger;
try {
  ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
} catch (error) {
  process.stderr.write(
    `[QC] Release ledger is unreadable: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exit(1);
}

const head = execFileSync('git', ['rev-parse', 'HEAD'], {
  cwd: appRoot,
  encoding: 'utf8',
}).trim();
const workspaceChanges = execFileSync('git', ['status', '--porcelain'], {
  cwd: appRoot,
  encoding: 'utf8',
}).trim();

if (ledger.schemaVersion !== 1) failures.push('schemaVersion must equal 1');
if (ledger.candidateCommit !== head)
  failures.push(
    `candidateCommit must equal current HEAD ${head}; found ${ledger.candidateCommit ?? 'unset'}`,
  );
if (workspaceChanges)
  failures.push('the release candidate workspace is not clean');
if (!/^sha256:[a-f0-9]{64}$/u.test(ledger.artifactSha256 ?? ''))
  failures.push('artifactSha256 must bind the reviewed deployment artifact');

for (const stage of requiredStages) {
  const record = ledger.stages?.[stage];
  if (!record) {
    failures.push(`${stage}: missing ledger record`);
    continue;
  }
  if (!['PASS', 'N/A'].includes(record.status)) {
    failures.push(`${stage}: ${record.status ?? 'status missing'}`);
    continue;
  }
  if (!Array.isArray(record.evidence) || record.evidence.length === 0)
    failures.push(`${stage}: no immutable evidence reference`);
  if (
    record.status === 'N/A' &&
    (record.justification?.trim().length ?? 0) < 20
  )
    failures.push(`${stage}: N/A requires a specific justification`);
}

if (ledger.stages?.['HUMAN APPROVAL']?.status !== 'PASS')
  failures.push('HUMAN APPROVAL cannot be waived');

if (failures.length) {
  process.stderr.write('[QC] PUBLIC RELEASE BLOCKED:\n');
  for (const failure of failures) process.stderr.write(`- ${failure}\n`);
  process.exit(1);
}

process.stdout.write(
  `[QC] Release evidence is complete and bound to ${head}. Human approval is recorded; deployment remains a separate authorized action.\n`,
);
