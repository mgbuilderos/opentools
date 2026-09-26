import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The wiring a merge queue needs, asserted so it cannot go missing quietly.
 *
 * **What went wrong.** A `pull_request` check tests the branch merged with the
 * base *as it stood when the run started*, and GitHub never recomputes it when
 * the base moves on. Two branches can therefore both be green and still break
 * `main` together. On 2026-09-26 one pull request added a guard requiring every
 * live tool page to render `<ToolJsonLd`, another added `/file/xray` without
 * one, neither could see the other, and `main` went red on the second merge.
 * The same shape had already happened once, when `/bench` was renamed `/batch`
 * under a branch that still listed the old route.
 *
 * A merge queue is the fix because it re-runs the checks against the tree that
 * will actually exist after the merge. But it only works if the checks run on
 * `merge_group`, and that is the part that rots: the trigger is invisible in
 * day-to-day work, nothing fails when it is deleted, and the consequence
 * depends on branch protection.
 *
 * **Both failure modes are silent, in opposite directions.** If the check is
 * required and stops running on `merge_group`, every merge waits forever on a
 * check that will never report. If it is *not* required, the queue merges
 * without ever running it — which is worse, because the queue then provides
 * exactly the false assurance it was installed to remove.
 *
 * So the triggers are asserted here. Removing one has to be a decision someone
 * makes on purpose, in a commit that also changes this file.
 */

const projectRoot = path.resolve(import.meta.dirname, '..');

/**
 * Workflows whose checks a reviewer would expect the queue to run. If a
 * workflow is genuinely not a merge gate, take it off this list in the same
 * commit that removes its trigger, with the reason.
 */
const QUEUED_WORKFLOWS = [
  {
    file: '.github/workflows/ci.yml',
    gates: 'format, unit tests, typecheck, lint, design QC, build and SBOM',
  },
  {
    file: '.github/workflows/selfhost-image.yml',
    gates: 'the self-host container still builds',
  },
];

const read = (file: string) =>
  readFileSync(path.join(projectRoot, file), 'utf8');

describe('the merge queue has checks to run', () => {
  it.each(QUEUED_WORKFLOWS)('$file listens on merge_group', ({ file }) => {
    expect(
      read(file),
      `${file} would not run in the merge queue, so the queue would either ` +
        'stall on a required check that never reports or merge without it',
    ).toMatch(/^\s{2}merge_group:\s*$/mu);
  });

  /**
   * A cancelled check is not a failed one. `cancel-in-progress: true` on a
   * merge-queue run leaves the entry blocked on a check that reports nothing,
   * rather than ejecting it — so the queue stops moving and the cause is two
   * clicks deep in a workflow file nobody is looking at.
   */
  it.each(QUEUED_WORKFLOWS)(
    '$file does not cancel merge-queue runs',
    ({ file }) => {
      const source = read(file);
      const cancel = /cancel-in-progress:\s*(.+)/u.exec(source);
      expect(cancel, `${file} has no concurrency block to check`).toBeTruthy();
      expect(
        cancel![1].trim(),
        `${file} cancels in-progress runs unconditionally, which stalls the ` +
          'merge queue rather than failing it',
      ).not.toBe('true');
      expect(cancel![1]).toContain('merge_group');
    },
  );

  /**
   * A job gated on `github.event_name == 'pull_request'` alone is skipped in
   * the queue. GitHub reports a skipped required check as success, so this one
   * fails open: the queue would merge a change that never built the image.
   */
  it('runs the image build inside the queue, not just on pull requests', () => {
    const source = read('.github/workflows/selfhost-image.yml');
    const guard = /if:\s*github\.event_name == 'pull_request'.*/u.exec(source);
    expect(guard, 'the pull-request build job disappeared').toBeTruthy();
    expect(
      guard![0],
      'the image build is skipped in the merge queue, and a skipped required ' +
        'check reports as success — so the queue would merge it unbuilt',
    ).toContain('merge_group');
  });
});
