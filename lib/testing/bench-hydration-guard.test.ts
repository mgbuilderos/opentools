import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Keeps `e2e/bench.spec.ts` from going back to guessing about hydration.
 *
 * Every tool page here is prerendered, so its controls exist before React
 * attaches a handler. `e2e/bench.spec.ts` guarded three of those controls with
 * `page.waitForTimeout(500)` or with nothing at all, and the consequence was
 * measured rather than argued: on 2026-09-30, on untouched `origin/main`
 * `c1c4463`, chromium, `--workers=1`, the spec failed **1 run in 5** with
 * `input-summary` reading "No files selected." after `setInputFiles` — the same
 * failure this repository's board recorded on 2026-09-26 and read at the time as
 * an egress problem. With the page's own chunks delayed 1.5s, all three spots
 * failed every time.
 *
 * A flake that shows up one run in five is one a reviewer cannot see, so the
 * invariants that closed it are asserted here where a revert fails immediately
 * instead of a fifth of the time. This guards one named file on purpose: nine
 * other specs still use `waitForTimeout`, they belong to other lanes, and a
 * repo-wide rule would fail on work nobody in this change has measured.
 */
const SPEC = 'e2e/bench.spec.ts';
// `fileURLToPath`, not `new URL(...).pathname`: this checkout's path contains
// spaces, and a pathname hands them back percent-encoded.
const source = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', SPEC),
  'utf8',
);

/** `lib/tools/text-workbench.ts`'s own word rule, so the counts agree. */
function words(value: string) {
  return value.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu) ?? [];
}

/**
 * The spec with its comments removed.
 *
 * The comments in that file quote the very calls these tests forbid, because
 * they explain why the calls are gone. Filtering only `//` lines was not enough:
 * the benchmark's explanation is a `/* *\/` block, so `waitForTimeout` appeared
 * to still be called. Strip both, then assert against code alone.
 */
function strip(text: string) {
  return text
    .replaceAll(/\/\*[\s\S]*?\*\//gu, '')
    .replaceAll(/^[^\n]*?\/\/[^\n]*$/gmu, '');
}

const code = strip(source);

describe(`${SPEC} waits for React rather than for the clock`, () => {
  it('strips comments without stripping code', () => {
    // Asserted against a fixture rather than against the spec's own prose, so
    // this cannot start passing because someone deleted a comment, and the
    // assertion below cannot pass because the stripper ate everything.
    const stripped = strip(
      [
        '// await page.waitForTimeout(1);',
        '/* await page.waitForTimeout(2); */',
        '  /*',
        '   * await page.waitForTimeout(3);',
        '   */',
        'await page.waitForTimeout(4);',
        "await input.fill('kept');",
      ].join('\n'),
    );
    expect(stripped).not.toContain('waitForTimeout(1)');
    expect(stripped).not.toContain('waitForTimeout(2)');
    expect(stripped).not.toContain('waitForTimeout(3)');
    expect(stripped).toContain('waitForTimeout(4)');
    expect(stripped).toContain("input.fill('kept')");
  });

  it('has no blind sleep', () => {
    // Comments may discuss it; code may not call it.
    expect(code).not.toMatch(/waitForTimeout\(/u);
  });

  it('hands files over through setFilesWhenLive, never setInputFiles', () => {
    expect(code).not.toMatch(/\.setInputFiles\(/u);
    expect(source).toContain("import { setFilesWhenLive } from './upload'");
    // Three uploads: two on /batch and the benchmark's own.
    expect(code.match(/setFilesWhenLive\(/gu)).toHaveLength(3);
  });

  it('types into controlled inputs through typeUntilVisible', () => {
    expect(source).toContain("import { typeUntilVisible } from './hydration'");
  });

  it('waits for a result that names its own word count', () => {
    // The bare heading is satisfied by any result still on screen, including the
    // warm-up's, which is how a warm-up turns a benchmark into a no-op.
    expect(code).not.toMatch(/name:\s*\/Done\/u/u);
    expect(source).toContain('Done — 3 words counted');
  });

  it('proves the panel is gone before the clock starts', () => {
    // Without this the timed wait can be answered by the warm-up's own output.
    expect(source).toMatch(/toHaveCount\(0\)/u);
  });

  it('warms up with a passage of a different length from the one it times', () => {
    const warmUp = /const WARM_UP = '([^']*)'/u.exec(source)?.[1];
    expect(warmUp, 'WARM_UP literal not found').toBeDefined();
    // `[^']+`, not `[^']*`: the first `input.fill(...)` in the test is the
    // deliberate clear, and matching that read the timed passage as '' and the
    // word count as 0 -- which this test's own last assertion caught.
    const timed = /await input\.fill\('([^']+)'\);/u.exec(source)?.[1];
    expect(timed, 'timed fill literal not found').toBeTruthy();

    // React ignores an event carrying the value it already holds, and a warm-up
    // of the same length leaves a heading the timed wait cannot tell from its
    // own. Measured: that shape reports 3.2 ms against a true ~295.
    expect(words(warmUp!).length).toBeGreaterThan(0);
    expect(words(timed!).length).toBeGreaterThan(0);
    expect(words(warmUp!).length).not.toBe(words(timed!).length);

    // And the warm-up's own proof has to name the warm-up's count, or it is
    // waiting for something that never arrives.
    expect(source).toContain(`Done — ${words(warmUp!).length} words counted`);
    expect(source).toContain(`Done — ${words(timed!).length} words counted`);
  });
});
