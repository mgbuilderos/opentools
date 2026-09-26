import { Script } from 'node:vm';
import { describe, expect, it } from 'vitest';

import { liveCheckSnippet } from './live-check';

/**
 * Compile without running.
 *
 * `new Script` parses the source and throws a SyntaxError if it is malformed,
 * which is the whole question here -- and unlike `new Function` it neither
 * trips `no-implied-eval` nor leaves a construct in the repo that looks like
 * evaluation. Nothing is executed: the snippet expects a browser and would
 * fail on `document` if it ever were.
 */
const compiles = (source: string) => () => new Script(source);

/**
 * The snippet is a program held in a template literal, which is a hazard worth
 * a test of its own: a single stray backtick in a comment closes the literal
 * early, and the result is not a build error but a shorter, still-valid string
 * that a visitor would paste into their console and watch fail. That happened
 * once while this was being written -- twice, in fact, both times from
 * back-quoting an identifier in a comment out of habit.
 *
 * So the first test parses it. Everything after that checks the properties
 * that make it safe to hand to someone for use on a site we have never seen.
 */
describe('the check that visitors paste', () => {
  it('is syntactically valid JavaScript', () => {
    // Throws a SyntaxError if the template closed early or a quote went astray.
    expect(compiles(liveCheckSnippet('example.com'))).not.toThrow();
  });

  it('still parses with no target given', () => {
    expect(compiles(liveCheckSnippet())).not.toThrow();
  });

  /*
   * The probe must never POST to `location.href`. On a stranger's site that
   * URL may be a real endpoint, and a check that logs someone out or submits
   * their form is not a check. A path that cannot exist answers the same
   * question, and a 404 is the worst it can do.
   */
  it('never sends a body to the page it is run on', () => {
    const snippet = liveCheckSnippet('example.com');
    expect(snippet).not.toMatch(/fetch\(\s*location\.href/u);
    expect(snippet).toContain('/.egress-probe-');
  });

  it('asks the five questions the protocol asks', () => {
    const snippet = liveCheckSnippet('example.com');
    for (const vector of [
      'fetch → third party',
      'POST → this origin',
      'XMLHttpRequest',
      'WebSocket',
      'navigator.sendBeacon',
    ])
      expect(snippet).toContain(vector);
  });

  /*
   * The trap from docs/EGRESS_PROOF.md: a blocked `sendBeacon` still returns
   * true, because the spec returns true once the beacon is queued and CSP
   * refuses it afterwards. A check that reads that boolean records a leak as a
   * pass.
   */
  it('never treats a sendBeacon return value as evidence', () => {
    const snippet = liveCheckSnippet('example.com');
    expect(snippet).not.toMatch(/if\s*\(\s*navigator\.sendBeacon\(/u);
    expect(snippet).toContain('the return value is never evidence');
  });

  /*
   * The beacon verdict must come from violations raised after the beacon was
   * attempted. Asking "did a connect-src violation happen at all" is answered
   * yes by the fetch probe that ran first, so the check would report a refusal
   * without ever testing one -- a detector that passes without looking.
   */
  it('judges the beacon only on violations it caused', () => {
    expect(liveCheckSnippet('example.com')).toContain(
      'violations.slice(before)',
    );
  });

  /*
   * `transferSize` reads 0 for a cross-origin resource whose server sends no
   * Timing-Allow-Origin header, which is most of them. Reporting that as "no
   * bytes left" would render a measurement failure as an all-clear -- the one
   * direction of error this tool cannot afford.
   */
  it('does not report zero bytes as an all-clear', () => {
    const snippet = liveCheckSnippet('example.com');
    expect(snippet).not.toContain('No bytes have reached');
    expect(snippet).toContain('No third-party host was contacted');
  });

  it('carries the line that separates capability from intent', () => {
    expect(liveCheckSnippet('example.com')).toMatch(
      /not the same as does send/u,
    );
  });

  /*
   * The target label is interpolated into a comment. Anything able to close
   * that comment could append code to what a visitor pastes into their own
   * console, so the sanitiser is the boundary and this is its test.
   */
  it('cannot have code appended to it through the target label', () => {
    const hostile = '*/ alert(1); /*';
    const snippet = liveCheckSnippet(hostile);
    expect(snippet).not.toContain('alert(1)');
    expect(compiles(snippet)).not.toThrow();
  });

  it('survives a label of pure punctuation', () => {
    expect(compiles(liveCheckSnippet('`${}`\\"\'*/'))).not.toThrow();
  });
});
