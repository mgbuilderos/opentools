import { describe, expect, it } from 'vitest';

import { BLOG_POSTS, countPostWords } from './blog-data';

/**
 * The gate that keeps the blog publishable.
 *
 * WHY IT EXISTS. On 2026-09-20 an audit of the 31 live posts found 123 defects
 * that no test could see: every hand-written reading time was wrong (one page
 * advertised "7 min read" over 37 words), 29 of 31 titles were long enough to
 * be cut off in search results, 11 meta descriptions were over the limit, and
 * raw LaTeX — `$$25 \div 23.976$$`, `$T_{\text{actual}, 1}$` — was being
 * served to readers as literal text on production.
 *
 * `blog-data.test.ts` next door already covers structure and link liveness.
 * This file covers the things a person would notice: length, honesty, and
 * whether the prose renders as prose.
 */

/** Google truncates around here; past it the tail of the title is lost. */
const MAX_TITLE = 60;
const MIN_DESCRIPTION = 70;
const MAX_DESCRIPTION = 160;
/** Under this, a page is not an article and search engines treat it as thin. */
const MIN_WORDS = 600;

/**
 * Posts still under the word floor.
 *
 * **This list is empty, and the test below keeps it that way.** It fails when
 * a post lands under the threshold and is not listed here, and it fails again
 * when a listed post rises above it — so the list can only ever shrink.
 *
 * It held 24 slugs on 2026-09-20. Every one of those posts was a stub wearing
 * the furniture of an article: the thinnest, `how-to-build-frosted-
 * glassmorphism-css`, carried 43 words of body copy under a "7 min read"
 * label. All 24 were rewritten rather than padded or deleted; the blog now
 * runs from 606 to 1,888 words per post.
 */
const KNOWN_THIN: readonly string[] = [];

function bodyOf(post: (typeof BLOG_POSTS)[number]) {
  return [
    ...post.sections.map((section) => `${section.heading}\n${section.content}`),
    ...post.faqs.map((faq) => `${faq.question}\n${faq.answer}`),
  ].join('\n');
}

describe('every post is presentable in a search result', () => {
  it('keeps titles short enough not to be cut off', () => {
    const tooLong = BLOG_POSTS.filter(
      (post) => post.title.length > MAX_TITLE,
    ).map((post) => `${post.slug} (${post.title.length})`);
    expect(tooLong).toEqual([]);
  });

  it('writes a description that fits the snippet and says something', () => {
    const wrong = BLOG_POSTS.filter(
      (post) =>
        post.metaDescription.length > MAX_DESCRIPTION ||
        post.metaDescription.length < MIN_DESCRIPTION,
    ).map((post) => `${post.slug} (${post.metaDescription.length})`);
    expect(wrong).toEqual([]);
  });

  it('gives every post its own title', () => {
    const titles = BLOG_POSTS.map((post) => post.title.toLowerCase());
    expect(new Set(titles).size).toBe(titles.length);
  });
});

describe('the prose renders as prose', () => {
  it('serves no LaTeX to readers', () => {
    // The pages render markdown, not maths. `$$…$$`, `\frac`, `\text` and
    // friends reached production as literal characters. A bare `$` is fine —
    // the pricing tables quote real dollar amounts.
    const offenders: string[] = [];
    for (const post of BLOG_POSTS) {
      const body = bodyOf(post);
      for (const match of body.match(
        /\$\$[\s\S]{1,80}?\$\$|\\(?:frac|text|rightarrow|leftarrow|approx|div|times|leq|geq|cdot)\b/g,
      ) ?? [])
        offenders.push(`${post.slug} :: ${match.trim().slice(0, 50)}`);
    }
    expect(offenders).toEqual([]);
  });

  it('leaves no unfilled placeholder in published copy', () => {
    const offenders = BLOG_POSTS.filter((post) =>
      /\bTODO\b|\bTBD\b|Lorem ipsum|\{\{\s*\w/i.test(bodyOf(post)),
    ).map((post) => post.slug);
    expect(offenders).toEqual([]);
  });
});

describe('every post gives the reader somewhere to go next', () => {
  // WHY. Measured 19 Sep 2026: 40 distinct visitors opened a blog post and
  // every single one read one page and left. Eight of the 31 posts contained
  // no in-body link at all, against 567 live guides they could have pointed
  // at — so neither a reader nor a crawler had a path onward. Volume was never
  // the constraint; the absence of paths between pages was.
  it('links somewhere from the body of every post', () => {
    const orphans = BLOG_POSTS.filter(
      (post) =>
        [
          ...post.sections
            .map((section) => section.content)
            .join('\n')
            .matchAll(/\]\((\/[^)\s]+)\)/g),
        ].length === 0,
    ).map((post) => post.slug);
    expect(orphans, 'these posts are dead ends').toEqual([]);
  });

  it('links to its own tool, not only to other articles', () => {
    const missing: string[] = [];
    for (const post of BLOG_POSTS) {
      const body = post.sections.map((section) => section.content).join('\n');
      const hrefs = [...body.matchAll(/\]\((\/[^)\s]+)\)/g)].map((m) => m[1]);
      if (!hrefs.some((href) => !href.startsWith('/blog'))) {
        missing.push(post.slug);
      }
    }
    expect(missing, 'these link only to other blog posts').toEqual([]);
  });
});

describe('the blog does not claim more than it delivers', () => {
  it('states a reading time the words actually support', () => {
    // Derived rather than typed, so this asserts the derivation stays honest
    // rather than asserting somebody remembered to update a number.
    const wrong: string[] = [];
    for (const post of BLOG_POSTS) {
      const claimed = Number.parseInt(post.readingTime, 10);
      const real = Math.max(1, Math.round(countPostWords(post) / 230));
      if (claimed !== real)
        wrong.push(`${post.slug}: says ${claimed}, words give ${real}`);
    }
    expect(wrong).toEqual([]);
  });

  it('adds no new thin page, and shrinks the list of old ones', () => {
    const thin = new Set(
      BLOG_POSTS.filter((post) => countPostWords(post) < MIN_WORDS).map(
        (post) => post.slug,
      ),
    );
    const known = new Set(KNOWN_THIN);

    const added = [...thin].filter((slug) => !known.has(slug));
    expect(added, 'a new thin post was published').toEqual([]);

    const fixed = [...known].filter((slug) => !thin.has(slug));
    expect(
      fixed,
      'these posts are no longer thin — delete them from KNOWN_THIN',
    ).toEqual([]);
  });
});
