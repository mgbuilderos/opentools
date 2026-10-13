import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { BLOCKING_SEVERITIES } from './audit-runtime.mjs';

/**
 * The advisory gate, pinned.
 *
 * On 2026-09-30 `npm run qc:release` stopped every lane in the repository at
 * `DEPENDENCY ADVISORIES`. The single HIGH was `undici`, reachable only
 * through `@cloudflare/vite-plugin -> miniflare`, both devDependencies, and a
 * built `dist/` contained no trace of any of them. Nothing a visitor could
 * execute was affected, no pull request could clear it, and a re-run could
 * not either — the gate was measuring the advisory calendar rather than the
 * change under test.
 *
 * So the blocking gate was narrowed to the dependency graph that actually
 * ships, and the full audit was kept as a report that prints and never sets
 * the exit code. That pairing is the whole decision, and either half of it is
 * one line from being undone:
 *
 *   - drop `--omit=dev` and every lane is blocked again by a fault in the dev
 *     simulator;
 *   - drop the report and a supply-chain advisory in the toolchain that builds
 *     the deployed Worker becomes invisible, which `.github/SECURITY.md`
 *     treats as a vulnerability class;
 *   - make the runtime gate non-blocking, or move `--audit-level` to
 *     `critical`, and a HIGH in code a visitor runs ships without comment.
 *
 * Each of those is asserted below so it has to be a decision someone makes on
 * purpose. If one is genuinely no longer wanted, change it here in the same
 * commit and say why.
 *
 * On 2026-10-13 the blocking half stopped being `npm audit --omit=dev`
 * itself and became `scripts/audit-runtime.mjs`, which runs that same audit
 * and corrects npm's idea of "runtime" with what the build measured (see its
 * header). The pairing above did not change, and neither did any assertion's
 * intent: the runtime gate still audits the graph that reaches a visitor,
 * still at HIGH, still blocking, and still after nothing but the build.
 *
 * What this file does NOT prove is npm's own behaviour, because a test that
 * shells out to `npm audit` would need the registry to decide whether the
 * build is broken. The decision the script makes from npm's report is tested
 * on fixtures in `scripts/audit-runtime.test.ts`; the end-to-end runs against
 * the registry are recorded in `docs/DEPENDENCY_ADVISORIES.md`.
 */
const projectRoot = path.resolve(import.meta.dirname, '..');
const runQc = readFileSync(
  path.join(projectRoot, 'scripts/run-qc.mjs'),
  'utf8',
);
const auditRuntime = readFileSync(
  path.join(projectRoot, 'scripts/audit-runtime.mjs'),
  'utf8',
);

/** The gate definitions, as objects, read out of the runner's own source. */
function gateSource(name: string): string {
  const start = runQc.indexOf(`name: '${name}'`);
  expect(
    start,
    `scripts/run-qc.mjs no longer defines a gate named '${name}'.\n\n` +
      'If it was renamed, rename it here too, in the same commit. If it was ' +
      'removed, read this file’s header first — it says what the removal ' +
      'costs.',
  ).toBeGreaterThan(-1);
  // The whole object literal the name sits in, found by matching braces, so
  // a neighbouring gate's `blocking: false` can never be read as this one's.
  const open = runQc.lastIndexOf('{', start);
  let depth = 0;
  for (let i = open; i < runQc.length; i += 1) {
    if (runQc[i] === '{') depth += 1;
    if (runQc[i] === '}') depth -= 1;
    if (depth === 0) return runQc.slice(open, i + 1);
  }
  throw new Error(`unbalanced braces after '${name}' in scripts/run-qc.mjs`);
}

const RUNTIME_GATE = 'DEPENDENCY ADVISORIES (RUNTIME)';
const REPORT_GATE = 'DEPENDENCY ADVISORIES (BUILD TOOLCHAIN, REPORT ONLY)';

describe('the advisory gate audits what ships, and reports what builds it', () => {
  it('blocks on advisories in the dependency graph that reaches a visitor', () => {
    expect(
      gateSource(RUNTIME_GATE),
      'the runtime advisory gate no longer runs scripts/audit-runtime.mjs',
    ).toContain("'scripts/audit-runtime.mjs'");
    expect(
      auditRuntime,
      'scripts/audit-runtime.mjs no longer asks npm for the --omit=dev report, ' +
        'so it audits the build toolchain again and a fault in the local dev ' +
        'simulator blocks every release',
    ).toContain("['audit', '--omit=dev', '--json']");
  });

  it('still fails on a HIGH, not only on a CRITICAL', () => {
    expect(
      [...BLOCKING_SEVERITIES].sort(),
      'the runtime advisory gate must block on HIGH and CRITICAL. Narrowing ' +
        'it to what ships was a change to WHOSE code is audited; raising the ' +
        'level would be a change to how bad a fault has to be before anyone ' +
        'is told, which is a different decision and was explicitly refused',
    ).toEqual(['critical', 'high']);
    expect(gateSource(RUNTIME_GATE)).not.toContain('critical');
    expect(gateSource(RUNTIME_GATE)).not.toContain('--audit-level');
  });

  it('can still stop a release', () => {
    expect(
      gateSource(RUNTIME_GATE),
      'the runtime advisory gate has been marked non-blocking, so a HIGH in ' +
        'code a visitor executes would now only print',
    ).not.toContain('blocking: false');
  });

  it('keeps reporting the build toolchain, and reports all of it', () => {
    const gate = gateSource(REPORT_GATE);
    expect(gate).toContain("'audit'");
    expect(gate).toContain("'--audit-level=high'");
    expect(
      gate,
      'the toolchain report has been given --omit=dev, which is the one flag ' +
        'that makes it report nothing at all: it exists to show the dev ' +
        'advisories the blocking gate deliberately ignores',
    ).not.toContain("'--omit=dev'");
  });

  it('never lets the toolchain report stop a release', () => {
    expect(
      gateSource(REPORT_GATE),
      'the toolchain report is blocking again. That is the state this change ' +
        'was made to leave: an advisory nobody could act on, stopping ' +
        'everybody',
    ).toContain('blocking: false');
  });

  it('both advisory gates run only on a release pass', () => {
    // A report printed on every `npm run qc` is a report people learn to
    // scroll past; `qc:release` is where a human is deciding to ship.
    const releaseBlock = runQc.slice(runQc.indexOf('if (releaseMode) {'));
    for (const name of [RUNTIME_GATE, REPORT_GATE]) {
      expect(releaseBlock).toContain(`name: '${name}'`);
    }
  });

  it('runs the runtime gate after BUILD, because it reads what BUILD wrote', () => {
    // Before BUILD it would read the record of an earlier build -- or of a
    // build of different dependencies -- and could pass on the strength of
    // it. A fresh CI checkout moves BUILD to the front, so position in the
    // `gates` literal is not enough: the gate must be spliced in after it.
    const releaseBlock = runQc.slice(runQc.indexOf('if (releaseMode) {'));
    expect(releaseBlock).toContain(
      "const buildIndex = gates.findIndex((gate) => gate.name === 'BUILD');",
    );
    const splice = 'gates.splice(buildIndex + 1, 0, ...releaseGates);';
    expect(
      releaseBlock,
      'the advisory gates are no longer inserted directly after BUILD',
    ).toContain(splice);
    expect(
      runQc.match(/\.\.\.releaseGates/g),
      'releaseGates is inserted somewhere other than after BUILD',
    ).toHaveLength(1);
    const releaseGates = releaseBlock.slice(
      releaseBlock.indexOf('const releaseGates = ['),
      releaseBlock.indexOf(splice),
    );
    expect(releaseGates).toContain(`name: '${RUNTIME_GATE}'`);
    expect(releaseGates).toContain(`name: '${REPORT_GATE}'`);
    expect(
      releaseGates.indexOf(`name: '${RUNTIME_GATE}'`),
      'the runtime gate should run before the forty-minute browser gate',
    ).toBeLessThan(releaseGates.indexOf("name: 'END-TO-END (BROWSER)'"));
  });

  it('honours blocking: false in the runner, instead of just accepting it', () => {
    // The flag is only a comment until the loop reads it. Without this the
    // report would be defined as non-blocking and still exit the process,
    // which is indistinguishable from not having narrowed the gate at all.
    expect(
      runQc,
      'scripts/run-qc.mjs no longer checks `gate.blocking` in its run loop, ' +
        'so a gate marked non-blocking would still stop the pass',
    ).toContain('gate.blocking === false');
    const loop = runQc.slice(runQc.indexOf('gate.blocking === false'));
    const nonBlockingBranch = loop.slice(0, loop.indexOf('continue;'));
    expect(
      nonBlockingBranch,
      'the non-blocking branch calls process.exit, which is the one thing it ' +
        'must never do',
    ).not.toContain('process.exit');
    expect(
      nonBlockingBranch,
      'a non-blocking gate that found something must still say so on stderr, ' +
        'or the advisory is invisible — the failure this pairing exists to ' +
        'prevent',
    ).toContain('process.stderr.write');
  });

  it('does not count the report as a gate that passed', () => {
    // `[QC] PASS — N mandatory automated gates` is the line a release
    // decision is recorded against. Counting a report that cannot fail
    // inflates it.
    expect(runQc).toContain('const blockingGateCount = gates.filter(');
    expect(runQc).toContain('${blockingGateCount} mandatory automated gates');
  });
});
