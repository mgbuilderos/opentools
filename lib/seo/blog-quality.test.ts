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
 * Posts that were published thin and have not been rewritten yet.
 *
 * This is a debt list, not an exemption: the test below fails both when a post
 * NOT on this list is thin (no new thin pages) and when a post ON it has been
 * fixed (the list must shrink, never rot). Remove a slug the moment its post
 * is expanded past the threshold.
 *
 * Measured 2026-09-20: 24 of 31 posts are under the threshold and twelve are
 * under 100 words of body copy — the thinnest, `how-to-build-frosted-
 * glassmorphism-css`, has 43. Those twelve are stubs wearing the furniture of
 * an article, and the honest options are to write them properly or to take
 * them down; padding them is the one option that helps nobody.
 */
const KNOWN_THIN: readonly string[] = [
  'agile-user-story-acceptance-criteria-gherkin',
  'clean-csv-transform-to-json-browser',
  'contractor-timesheet-overtime-calculator-guide',
  'convert-unix-epoch-timestamp-utc-local',
  'cryptographically-secure-uuidv4-generation',
  'digital-marketer-data-and-asset-workflow',
  'free-freelance-invoice-generator-no-signup',
  'generate-sql-er-diagram-from-ddl-private',
  'gpu-accelerated-css-keyframe-animations',
  'how-to-build-frosted-glassmorphism-css',
  'how-to-merge-pdf-contracts-privately',
  'how-to-write-operator-grade-sops',
  'local-ai-image-background-removal-wasm',
  'macos-utf8-zip-filename-encoding-bug',
  'markdown-to-pdf-academic-print-guide',
  'modern-css-gradient-studio-guide',
  'mutual-nda-generator-free-legal-playbook',
  'neumorphism-soft-ui-css-shadow-guide',
  'open-source-first-contributions-pure-typescript',
  'optimize-images-browser-webp-converter',
  'safe-base64-encode-decode-developer-guide',
  'style-linkedin-x-posts-unicode-text',
  'why-subtitles-drift-frame-rate-arithmetic',
  'zip-crc32-checksum-validation-in-browser',
];

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
