import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  auditRenderedPages,
  firstHeadingSkip,
} from '../../scripts/check-share-and-heading-order.mjs';

/**
 * No page climbs more than one heading level at a time.
 *
 * WHAT BROKE. A 360 sweep of all 1,413 live URLs on 2026-09-23 found 52 that
 * skipped a level: `/support`, `/guides`, `/schema/schema-diff`, 31 of the 32
 * blog posts and all 19 templates. Five components caused all 52, because each
 * one is shared by a whole section.
 *
 * WHY IT MATTERS MORE THAN IT LOOKS. Heading level is the only structural
 * index a screen reader has. A reader moving by level from an `h1` straight to
 * an `h3` cannot tell whether they skipped a section or the page has none
 * there, so the usual response is to stop trusting the shortcut and read the
 * page linearly -- which is the navigation this markup was supposed to provide.
 * Nothing about it is visible on screen, which is why it survived every visual
 * QA pass the site has.
 *
 * HOW IT IS FIXED, AND HOW IT IS NOT. The level in the markup is corrected and
 * the existing class keeps the size: `<h2 className="text-sm font-semibold">`
 * looks exactly as it did. The tempting fix -- leaving the level alone and
 * restyling -- changes nothing for the reader this check exists for.
 *
 * WHAT IS ASSERTED WHERE. The population claim is made against rendered HTML
 * by `scripts/check-share-and-heading-order.mjs` on every build, for the reason
 * `lib/seo/orphan-coverage.test.ts` sets out: these headings come from five
 * components, conditional tabs and mapped lists, and a static read of the JSX
 * would be a second, wrong implementation of the page. This file proves the
 * detector still detects, and re-runs the population check when a build is on
 * disk.
 */
const PROJECT_ROOT = path.resolve(import.meta.dirname, '..', '..');
const CLIENT_DIR = path.join(PROJECT_ROOT, 'dist', 'client');

describe('heading order', () => {
  /**
   * The exact shapes the sweep found, plus the shapes that are correct and
   * must not be reported. If this detector ever became a no-op it would pass
   * all 1,413 pages in silence, which is the failure mode a guard has.
   */
  it('names a skipped level and stays quiet about a legal outline', () => {
    expect(firstHeadingSkip('<h1>A</h1><h3>B</h3>')).toBe('h1 followed by h3');
    expect(firstHeadingSkip('<h1>T</h1><h2>A</h2><h4 class="x">B</h4>')).toBe(
      'h2 followed by h4',
    );
    // Descending any distance closes subsections and opens a new one: legal.
    expect(firstHeadingSkip('<h1>A</h1><h2>B</h2><h3>C</h3><h2>D</h2>')).toBe(
      null,
    );
    // The sidebar's h2 renders before the page h1 on every shell page.
    expect(
      firstHeadingSkip('<h2>Categories</h2><h1>Title</h1><h2>S</h2>'),
    ).toBe(null);
  });

  /*
    The `h1` rule, which the level rule cannot reach.

    Headings that start at `h2` skip nothing -- `h2` to `h2` is not a climb --
    so before 2026-09-26 this detector returned null for them, and four tool
    pages reached production with no `h1`: /pdf/form-filler, /finance/ofx-qif,
    /finance/bank-statement and /email/reader. `scripts/verify-live.mjs` named
    all four, but only after the deploy, because asking whether an `h1` exists
    was the one thing nothing did before the bytes went out.

    A page with no headings at all is the same fault and is reported the same
    way. It used to be allowed here, on the reading that a fragment with no
    outline has nothing to get wrong -- but this runs over whole served pages,
    and a page with nothing to announce itself by is exactly what the rule is
    for. No served page is heading-less: at the time this changed, 1,477 of
    1,481 had exactly one `h1` and none had two.
  */
  it('requires exactly one h1, which a skipped level cannot detect', () => {
    expect(firstHeadingSkip('<h2>A</h2><h3>B</h3>')).toBe('no h1');
    expect(firstHeadingSkip('<p>no headings at all</p>')).toBe('no h1');
    expect(firstHeadingSkip('<h1>A</h1><h1>B</h1>')).toBe('2 h1 elements');
    // The four shapes that shipped: an outline that is legal but headless.
    expect(firstHeadingSkip('<h2>Select a file</h2><h2>Result</h2>')).toBe(
      'no h1',
    );
    expect(firstHeadingSkip('<h1>Fill PDF forms</h1><h2>Select</h2>')).toBe(
      null,
    );
  });

  /**
   * Five components caused all 52 faults, so each is worth naming: a later
   * edit that reintroduces the gap in one of them should fail here with the
   * component's name rather than only as a count in the build log.
   */
  it('keeps the five components that caused all 52 at one-level steps', () => {
    const read = (relative: string) =>
      readFileSync(path.join(PROJECT_ROOT, relative), 'utf8');
    const levelsIn = (source: string) =>
      [...source.matchAll(/<h([1-6])[\s>]/gu)].map((match) => Number(match[1]));

    // The related-item cards under an h2 heading were h4, skipping h3.
    for (const file of [
      'app/blog/[slug]/page.tsx',
      'app/templates/[slug]/page.tsx',
    ]) {
      expect(levelsIn(read(file)), `${file} still has an h4`).not.toContain(4);
    }
    // The support tab panels were h3 under the page h1, their tiers h4.
    expect(
      levelsIn(read('components/support-dual-view.tsx')),
      'components/support-dual-view.tsx: panel headings sit directly under the page h1',
    ).not.toContain(4);
    // The schema diff tab's only section heading was h3 while every sibling
    // tab's was h2.
    expect(
      levelsIn(read('components/schema-hub-tool.tsx')),
      'components/schema-hub-tool.tsx: one tab headed its panel an h3',
    ).not.toContain(3);
    // The guides index promised three benefits as h3 directly under the h1.
    // Its later h3s are legal -- they sit under section h2s -- so the level is
    // asserted for these three by their own text rather than for the file.
    const guidesIndex = read('app/guides/page.tsx');
    for (const heading of [
      'Your file stays in the page',
      'No upload to wait for',
      'Free, and no account',
    ]) {
      expect(
        guidesIndex,
        `app/guides/page.tsx: "${heading}" sits directly under the page h1`,
      ).toMatch(new RegExp(`<h2[^>]*>\\s*${heading}`, 'u'));
    }
  });

  /**
   * And the population claim, whenever a build is on disk. Skipped rather than
   * faked on an unbuilt tree; `lib/seo/share-card-coverage.test.ts` asserts the
   * build still runs the same check.
   */
  it.skipIf(!existsSync(path.join(CLIENT_DIR, 'sitemap.xml')))(
    'skips no heading level on any sitemap URL',
    () => {
      const result = auditRenderedPages(CLIENT_DIR)!;
      expect(result.checked).toBeGreaterThan(1000);
      expect(
        result.faults.filter((fault) => fault.check === 'heading-order'),
      ).toEqual([]);
    },
  );
});
