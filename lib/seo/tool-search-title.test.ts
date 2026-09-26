import { describe, expect, it } from 'vitest';

import { metaInventory, servedTitle } from './meta-inventory';
import { searchTitle } from './tool-search-copy';
import { asServed, TITLE_MAX, TITLE_SUFFIX_LENGTH } from './title-budget';

/**
 * A tool page must not ship the label off its own tab strip as its title.
 *
 * Measured 2026-09-26: 495 of 1,464 live pages took `<title>` straight from
 * the operation name -- "CSV deduplicator", "YouTube chapter generator" --
 * median 34 characters with the suffix counted, against the ~60 a result can
 * show. Search Console for the seven days to 2026-09-24 recorded 35 queries
 * on page one and zero clicks between them, eight of those in the top three.
 *
 * `meta-lengths.test.ts` did not catch it: a short title is a legal title.
 * This asserts the thing that was actually wrong.
 */
describe('a tool page gives a searcher a reason to click', () => {
  it('never ships a title that is only the tool name', () => {
    const bare = metaInventory()
      .pages.filter((page) => page.source.startsWith('lib/tools/ (operation'))
      .filter((page) => servedTitle(page) === asServed(`${page.title}`) && !page.title.includes('—'));
    expect(bare).toEqual([]);
  });

  it('keeps every generated title inside the budget it is measured against', () => {
    const over = metaInventory()
      .pages.filter((page) => page.source.startsWith('lib/tools/ (operation'))
      .filter((page) => servedTitle(page).length > TITLE_MAX);
    expect(over).toEqual([]);
  });

  /*
    The budget is counted on the escaped bytes, not the source string. A name
    carrying `&` is four characters longer on the wire, and sizing against the
    source is what put ten titles over the limit on the first attempt here.
  */
  it('counts an ampersand as the five characters the head ships', () => {
    const name = 'Docker & Compose generator & cheatsheet';
    const title = searchTitle('/developer/docker-cheatsheet', name);
    expect(asServed(title).length + TITLE_SUFFIX_LENGTH).toBeLessThanOrEqual(TITLE_MAX);
  });

  it('falls back to the bare name rather than shipping a cut-off qualifier', () => {
    const tooLong = 'x'.repeat(TITLE_MAX - TITLE_SUFFIX_LENGTH);
    expect(searchTitle('/text/anything', tooLong)).toBe(tooLong);
  });

  it('offers "No Upload" only where a file is actually involved', () => {
    expect(searchTitle('/data/csv-thing', 'CSV thing')).toContain('No Upload');
    expect(searchTitle('/math/some-calculator', 'Some calculator')).toContain('No Sign-Up');
  });
});
