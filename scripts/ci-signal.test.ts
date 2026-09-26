import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The two properties that decide whether a broken `main` is noticed.
 *
 * Neither is about a test failing; both are about whether anyone finds out.
 * On 2026-09-26 main was red for about fifteen minutes and four pull requests
 * went red with it, each author starting to debug a failure that was not
 * theirs. Two separate defects in the CI configuration made that possible, and
 * this file exists so neither can come back quietly -- a workflow file is
 * exactly the kind of thing edited once and never looked at again.
 *
 * Asserted against the raw text rather than a parsed tree, because the repo
 * has no YAML parser and adding a dependency to check two lines is a worse
 * trade than a precise regex. The assertions below pin the specific expression
 * and not merely the presence of a key, so "cancel-in-progress is mentioned
 * somewhere" cannot pass for "cancel-in-progress is correct".
 */
const workflows = path.join(import.meta.dirname, '..', '.github', 'workflows');
const ci = readFileSync(path.join(workflows, 'ci.yml'), 'utf8');
const redPath = path.join(workflows, 'main-red.yml');

describe('CI never cancels its own verdict on main', () => {
  /*
   * `cancel-in-progress: true` applied to main as well as to branches, and a
   * cancelled run leaves a commit with no verdict at all. Measured over the
   * last 39 CI runs on main: 21 succeeded, 1 failed, 17 were CANCELLED -- 44%
   * of commits merged to main were never checked, because the next merge
   * landed inside the ~2.5 minutes a run takes.
   *
   * That is how the ToolJsonLd breakage stayed hidden: the run on the merge
   * commit that introduced it was cancelled by the next merge, and two further
   * merges piled on before any run completed and went red.
   */
  it('does not cancel unconditionally', () => {
    const declared = /cancel-in-progress:\s*(.+)/u.exec(ci)?.[1]?.trim();

    expect(
      declared,
      'ci.yml declares no cancel-in-progress, so this test cannot check it',
    ).toBeDefined();
    expect(
      declared,
      'cancel-in-progress is unconditionally true again, so a merge to main ' +
        'kills the run on the commit before it and that commit ships with no ' +
        'verdict. 17 of the last 39 runs on main were cancelled this way.',
    ).not.toBe('true');
  });

  it('exempts main by name, and still cancels on branches', () => {
    const declared = /cancel-in-progress:\s*(.+)/u.exec(ci)?.[1]?.trim() ?? '';

    // A branch only cares about its latest push, so cancelling there is right
    // and saves CI minutes. The exemption has to be main specifically.
    expect(declared).toContain('refs/heads/main');
    expect(declared).toMatch(/github\.ref\s*!=/u);
  });

  it('still runs on pushes to main at all', () => {
    // If main ever stops triggering CI, everything above is moot and the
    // stop-the-line workflow has nothing to listen to.
    expect(ci).toMatch(/push:\s*\n\s*branches:\s*\[main\]/u);
  });
});

describe('a red main is reported somewhere a person looks', () => {
  it('has a workflow watching CI on main', () => {
    expect(
      existsSync(redPath),
      '.github/workflows/main-red.yml is gone. CI still runs on main, but ' +
        'nothing reads the result, which is the state that let main sit red ' +
        'while four pull requests went red with it.',
    ).toBe(true);
  });

  const red = existsSync(redPath) ? readFileSync(redPath, 'utf8') : '';

  it('triggers on the CI workflow finishing on main', () => {
    expect(red).toMatch(/workflow_run:/u);
    expect(red).toMatch(/workflows:\s*\['CI'\]/u);
    expect(red).toMatch(/branches:\s*\[main\]/u);
    expect(red).toMatch(/types:\s*\[completed\]/u);
  });

  it('can actually open an issue', () => {
    // Without this permission the workflow runs, finds main red, and fails
    // silently on the API call -- the worst of both worlds.
    expect(red).toMatch(/issues:\s*write/u);
  });

  /*
   * A cancelled run is the absence of a verdict, not a bad one. Treating it as
   * failure would have had this filing an issue on 17 of the last 39 runs, and
   * an alert that cries wolf is an alert people mute.
   */
  it('ignores a cancelled run rather than reporting it as a breakage', () => {
    expect(red).toMatch(/conclusion == 'failure'/u);
    expect(red).toMatch(/conclusion == 'success'/u);
    expect(red).not.toMatch(/conclusion == 'cancelled'/u);
  });

  /*
   * One issue per outage. Without the lookup, a red main that survives three
   * merges files three issues, and the third one is the one nobody reads.
   */
  it('reuses the open issue instead of filing one per failed commit', () => {
    expect(red).toMatch(/listForRepo/u);
    expect(red).toMatch(/state:\s*'open'/u);
    expect(red).toMatch(/issues\.createComment/u);
  });

  it('closes the issue when main goes green again', () => {
    // An outage issue nobody closes is an outage issue nobody believes.
    expect(red).toMatch(/state:\s*'closed'/u);
  });

  /*
   * Two of these at once would both look for the open issue, both find none,
   * and file two issues for one outage. `cancel-in-progress` must stay false
   * here for the opposite reason it is false on main: not to preserve a
   * verdict, but to serialise the bookkeeping.
   */
  it('serialises itself so one outage cannot open two issues', () => {
    expect(red).toMatch(/group:\s*main-red/u);
    expect(red).toMatch(/cancel-in-progress:\s*false/u);
  });
});
