import { describe, expect, it } from 'vitest';

import { buildSitemap } from './sitemap-entries';
import { WHATS_NEW, buildWhatsNewFeed } from './whats-new';

/**
 * A changelog rots in three specific ways, and each one is cheap to prevent.
 *
 * It starts linking pages that have been renamed or withdrawn, so the page that
 * exists to bring someone back sends them to a 404. It drifts out of order, so
 * the newest thing is not at the top and the page stops answering the only
 * question it is there to answer. And its feed falls behind the page it was
 * generated from, which nobody notices because the person reading the feed is
 * not the person looking at the page.
 *
 * The rules about *wording* are here too. "No named rival, no unmeasured price"
 * is a standing business rule that has already failed CI once and cost four
 * live pages a correction; a page written weekly by whoever shipped that week
 * is exactly where it will be broken next.
 */

/**
 * Every path this site publishes, taken from the sitemap rather than listed here.
 *
 * The first version of this test checked `LIVE_TOOL_ROUTES` plus a hand-written
 * set of content pages, and it **failed on a correct entry**: `/batch/compress-pdfs`
 * is real, but it lives in `audience-pages.ts`, a registry that list knew
 * nothing about. That is the recurring mistake in this repo — a check over a
 * subset cannot support a claim about the whole — so this reads the one
 * definition that has to be complete, because it is what Google is given.
 */
function publishedPaths(): ReadonlySet<string> {
  return new Set(
    buildSitemap().map((entry) =>
      new URL(entry.url).pathname.replace(/(.)\/$/u, '$1'),
    ),
  );
}

describe("the what's-new page", () => {
  it('links only routes that exist', () => {
    const published = publishedPaths();
    const broken = WHATS_NEW.filter((entry) => !published.has(entry.href)).map(
      (entry) => `${entry.date} -> ${entry.href}`,
    );

    // The whole point of the page is that every line is immediately usable. An
    // entry pointing at a withdrawn or renamed route is worse than no entry.
    expect(broken, 'these entries link routes that are not live').toEqual([]);
  });

  it('is newest first', () => {
    const dates = WHATS_NEW.map((entry) => entry.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it('gives every entry a date, a plain-language title and a link label', () => {
    for (const entry of WHATS_NEW) {
      expect(entry.date, `${entry.title} has no valid date`).toMatch(
        /^\d{4}-\d{2}-\d{2}$/u,
      );
      expect(Number.isNaN(Date.parse(entry.date))).toBe(false);
      expect(
        entry.title.length,
        `"${entry.title}" reads as a stub`,
      ).toBeGreaterThan(15);
      expect(entry.detail.length).toBeGreaterThan(40);
      expect(entry.hrefLabel.length).toBeGreaterThan(3);
      expect(
        entry.href.startsWith('/'),
        `${entry.href} is not a local path`,
      ).toBe(true);
    }
  });

  it('reads as news rather than as a commit log', () => {
    // The conventional-commit prefixes this repo uses. Their presence means
    // somebody pasted a subject line written for the people who wrote the code.
    const commitish = /^(feat|fix|chore|docs|test|perf|refactor|style|ci)[(:]/u;
    for (const entry of WHATS_NEW) {
      expect(
        commitish.test(entry.title),
        `"${entry.title}" is a commit subject`,
      ).toBe(false);
    }
  });

  it('names no competitor and quotes no price', () => {
    /*
      Rule 33's neighbour: never name a rival, never quote a price we did not
      measure. Checked on the rendered strings rather than trusted to review,
      because this page is edited weekly by whoever shipped that week.
    */
    const forbidden =
      /\b(smallpdf|ilovepdf|adobe|dropbox|wetransfer|canva|remove\.bg|pdf24|sejda|soda ?pdf|tinypng|cloudconvert|zamzar)\b/iu;
    const priced = /(\$\s?\d|\d+\s?(?:usd|eur|inr)\b|₹\s?\d|€\s?\d|£\s?\d)/iu;
    for (const entry of WHATS_NEW) {
      const text = `${entry.title} ${entry.detail}`;
      expect(forbidden.test(text), `"${entry.title}" names a rival`).toBe(
        false,
      );
      expect(priced.test(text), `"${entry.title}" quotes a price`).toBe(false);
    }
  });

  it('holds no duplicate entry for the same day and route', () => {
    const keys = WHATS_NEW.map((entry) => `${entry.date} ${entry.href}`);
    expect(new Set(keys).size, 'two entries share a date and a route').toBe(
      keys.length,
    );
  });
});

describe("the what's-new feed", () => {
  it('carries every entry the page shows', () => {
    const feed = buildWhatsNewFeed();
    // The failure this catches is a feed built from a second, stale array.
    expect(feed.match(/<item>/gu)?.length).toBe(WHATS_NEW.length);
    for (const entry of WHATS_NEW) {
      expect(feed).toContain(`getopentools.com${entry.href}`);
    }
  });

  it('is well-formed RSS with escaped text', () => {
    const feed = buildWhatsNewFeed();
    expect(feed.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(
      true,
    );
    expect(feed).toContain('<rss version="2.0"');
    expect(feed.trimEnd().endsWith('</rss>')).toBe(true);

    // An unescaped ampersand or angle bracket in a title breaks the whole feed
    // for every reader, and the page it came from looks perfectly fine.
    const inner = feed.replace(/<[^>]*>/gu, '');
    expect(inner, 'raw markup leaked into the feed text').not.toMatch(/[<>]/u);
  });

  it('dates every item in the format a reader expects', () => {
    for (const date of buildWhatsNewFeed().matchAll(
      /<pubDate>([^<]+)<\/pubDate>/gu,
    )) {
      expect(Number.isNaN(Date.parse(date[1]!))).toBe(false);
      expect(date[1]).toMatch(/GMT$/u);
    }
  });
});
