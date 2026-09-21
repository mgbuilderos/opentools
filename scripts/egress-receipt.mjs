#!/usr/bin/env node
/**
 * Run the egress proof against the DEPLOYED site and write a dated receipt.
 *
 * WHY THIS EXISTS. `e2e/egress-proof.spec.ts` already tries to make our own
 * site leak a file and fails to. That result lives in a CI log nobody can see,
 * while the page that describes it is prose a reader has to take on trust.
 * Every competitor in this category *claims* privacy; a claim is not evidence.
 * This turns the run into an artifact a stranger can check: what was targeted,
 * on what date, in which engines, how many exfiltration routes were attempted,
 * and the exact command to reproduce it.
 *
 * WHY IT IS GENERATED AND NEVER HAND-EDITED. The repository rule is that no
 * claim ships unless something proves it. A receipt typed by hand is the claim
 * again, one step removed. This script refuses to write anything if the suite
 * did not pass, so the file on disk can only ever describe a real passing run.
 *
 *   node scripts/egress-receipt.mjs                      # against production
 *   EGRESS_BASE_URL=https://staging.example node scripts/egress-receipt.mjs
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'lib/seo/egress-receipt.json');
const TARGET = process.env.EGRESS_BASE_URL ?? 'https://getopentools.com';

function run() {
  const started = Date.now();
  let raw;
  try {
    raw = execFileSync(
      'npx',
      [
        'playwright',
        'test',
        '--config=playwright.production.config.ts',
        '--reporter=json',
      ],
      {
        cwd: ROOT,
        encoding: 'utf8',
        env: { ...process.env, EGRESS_BASE_URL: TARGET },
        maxBuffer: 64 * 1024 * 1024,
      },
    );
  } catch (error) {
    // A non-zero exit means a finding. That is a result worth knowing about,
    // and precisely the case where a receipt must NOT be written.
    console.error(
      'The egress proof did not pass against ' +
        `${TARGET}. No receipt written — fix the finding first.\n` +
        (error.stdout ?? error.message ?? '').slice(-2000),
    );
    process.exit(1);
  }

  const report = JSON.parse(raw.slice(raw.indexOf('{')));
  const specs = [];
  const walk = (suite) => {
    for (const s of suite.specs ?? []) specs.push(s);
    for (const child of suite.suites ?? []) walk(child);
  };
  for (const suite of report.suites ?? []) walk(suite);

  const engines = [
    ...new Set(specs.flatMap((s) => (s.tests ?? []).map((t) => t.projectName))),
  ].sort((a, b) => a.localeCompare(b));
  const checks = [...new Set(specs.map((s) => s.title))].sort((a, b) =>
    a.localeCompare(b),
  );
  const total = specs.reduce((n, s) => n + (s.tests?.length ?? 0), 0);
  const ok = specs.every((s) => s.ok);

  if (!ok || total === 0) {
    console.error(
      'Report contained a failure or no tests. No receipt written.',
    );
    process.exit(1);
  }

  return {
    target: TARGET,
    verifiedAt: new Date().toISOString(),
    engines,
    checks,
    assertionsRun: total,
    findings: 0,
    durationMs: Date.now() - started,
    reproduce:
      'EGRESS_BASE_URL=' +
      TARGET +
      ' npx playwright test --config=playwright.production.config.ts',
    source: 'e2e/egress-proof.spec.ts',
  };
}

const receipt = run();
let previous = null;
try {
  previous = JSON.parse(readFileSync(OUT, 'utf8'));
} catch {
  // First run; there is nothing to compare against.
}
writeFileSync(OUT, `${JSON.stringify(receipt, null, 2)}\n`);

/*
  Hand the written file to the repository formatter.

  `npm run qc` fails on any file oxfmt would reformat, and oxfmt wraps JSON
  arrays by width rather than one-per-line — so a receipt serialised by
  JSON.stringify alone blocks QC every time it is regenerated. Replicating
  oxfmt's wrapping here would be a second implementation of someone else's
  rules, wrong the moment they change. Asking the formatter itself is the only
  version that stays correct.
*/
try {
  execFileSync('npx', ['oxfmt', OUT], { cwd: ROOT, stdio: 'ignore' });
} catch {
  console.warn(
    'Receipt written, but oxfmt could not format it. Run `npx oxfmt ' +
      path.relative(ROOT, OUT) +
      '` before committing, or QC will block on FORMAT.',
  );
}
console.log(
  `Receipt written for ${receipt.target}: ${receipt.assertionsRun} assertions ` +
    `across ${receipt.engines.join(' and ')}, ${receipt.findings} findings.` +
    (previous ? `\nPrevious run: ${previous.verifiedAt}` : ''),
);
