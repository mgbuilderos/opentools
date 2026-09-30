import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

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
 * What this file does NOT prove is npm's own behaviour, because a test that
 * shells out to `npm audit` would need the registry to decide whether the
 * build is broken. That was verified out of band on 2026-09-30, against the
 * very advisory in question, by moving it between sections of a fixture
 * manifest and changing nothing else:
 *
 *   undici@7.29.0 in `dependencies`                        -> exit 1
 *   undici@7.29.0 in `devDependencies`                     -> exit 0
 *   @cloudflare/vite-plugin@1.54.11 in `dependencies`,
 *     reaching undici transitively, exactly as it does here -> exit 1
 *
 * `--omit=dev` discriminates on where a package sits in the graph, including
 * through transitive chains, and on nothing else. The narrowed gate still
 * goes red for anything a visitor could run.
 */
const projectRoot = path.resolve(import.meta.dirname, '..');
const runQc = readFileSync(
  path.join(projectRoot, 'scripts/run-qc.mjs'),
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
  // From the name to the end of that object literal.
  const end = runQc.indexOf('});', start);
  expect(end).toBeGreaterThan(start);
  return runQc.slice(start, end);
}

const RUNTIME_GATE = 'DEPENDENCY ADVISORIES (RUNTIME)';
const REPORT_GATE = 'DEPENDENCY ADVISORIES (BUILD TOOLCHAIN, REPORT ONLY)';

describe('the advisory gate audits what ships, and reports what builds it', () => {
  it('blocks on advisories in the dependency graph that reaches a visitor', () => {
    const gate = gateSource(RUNTIME_GATE);
    expect(gate).toContain("'audit'");
    expect(
      gate,
      'the runtime advisory gate no longer passes --omit=dev, so it audits ' +
        'the build toolchain again and a fault in the local dev simulator ' +
        'blocks every release',
    ).toContain("'--omit=dev'");
  });

  it('still fails on a HIGH, not only on a CRITICAL', () => {
    const gate = gateSource(RUNTIME_GATE);
    expect(
      gate,
      'the runtime advisory gate must stay at --audit-level=high. Narrowing ' +
        'it to what ships was a change to WHOSE code is audited; raising the ' +
        'level would be a change to how bad a fault has to be before anyone ' +
        'is told, which is a different decision and was explicitly refused',
    ).toContain("'--audit-level=high'");
    expect(gate).not.toContain('critical');
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
