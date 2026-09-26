/**
 * What shipped, written for the person who uses the site.
 *
 * Why this file exists at all: nobody returns to a file tool because they liked
 * it. They return because they have another file problem, and that is weeks
 * away. Three agents ship here every day and, until this page, **nothing told a
 * returning visitor that anything had happened** — so there was no honest reason
 * to come back before the next problem. This is the project's equivalent of
 * "the model got better".
 *
 * Three rules hold the page up, and each one is enforced by
 * `whats-new.test.ts` rather than by good intentions:
 *
 *   1. **Every entry names a route the reader can click.** An entry with no
 *      clickable result is a changelog for us, not news for them. It also makes
 *      the page an internal-link surface pointing at pages we want crawled.
 *   2. **Plain language, never a commit subject.** "HEIC photos from an iPhone
 *      now convert here", not "feat(image): heic decode". Commit subjects are
 *      written for the people who wrote the code.
 *   3. **No rival is named and no price is quoted.** The standing business rule,
 *      which has already failed CI once and cost four live pages a correction.
 *
 * Deliberately *not* generated from `git log`. Most commits change nothing a
 * visitor could notice, and the ones that do are described badly for this
 * audience. An entry is written when the thing ships, by whoever shipped it.
 *
 * There is no subscribe box, because a subscribe box needs a server and an
 * address list — the two things this product exists not to have. `feed.xml`
 * beside this page is the subscription mechanism, and it costs nothing to serve.
 */

export interface WhatsNewEntry {
  /** ISO date the change reached the live site. */
  readonly date: string;
  /** What changed, in the reader's terms. One line. */
  readonly title: string;
  /** Why they might care. Two sentences at most. */
  readonly detail: string;
  /** The route this entry is about. Must be a real, live path. */
  readonly href: string;
  /** How the link reads in a sentence. */
  readonly hrefLabel: string;
}

/**
 * Newest first. The order is asserted, so an entry appended in the wrong place
 * fails rather than quietly sorting itself out of view.
 */
export const WHATS_NEW: readonly WhatsNewEntry[] = [
  {
    date: '2026-09-26',
    title: 'Every tool now keeps working after you disconnect — and we test it',
    detail:
      'Open any tool, switch off your Wi-Fi, and the job still finishes, because the work was never going to the network in the first place. That is now checked on every release in two different browsers rather than being something we assert.',
    href: '/proof',
    hrefLabel: 'see the measurements',
  },
  {
    date: '2026-09-26',
    title: 'Run the whole thing inside your own network in one click',
    detail:
      'If you already have a home server or an office box, the install is now a single entry in its app catalogue — no command line. Useful where uploading the document is itself the problem: legal, medical, payroll, anything under review.',
    href: '/self-host',
    hrefLabel: 'run it yourself',
  },
  {
    date: '2026-09-26',
    title: 'Large files no longer hit a ceiling',
    detail:
      'The fixed size limit is gone. Big inputs are read in pieces instead of all at once, so the practical limit is your own machine rather than a number we picked.',
    href: '/pdf/compress',
    hrefLabel: 'compress a large PDF',
  },
  {
    date: '2026-09-25',
    title: 'iPhone photos convert without leaving your computer',
    detail:
      'HEIC is the format an iPhone saves photos in, and most things that are not an Apple device refuse to open it. Both conversions decode the photo in the tab.',
    href: '/image/heic-to-jpg',
    hrefLabel: 'convert a HEIC photo',
  },
  {
    date: '2026-09-25',
    title: 'The whole catalogue is two clicks from the front page',
    detail:
      'Nineteen category pages now sit between the home page and the tools, so finding the right one no longer depends on guessing its name.',
    href: '/',
    hrefLabel: 'browse from the top',
  },
  {
    date: '2026-09-25',
    title: 'Whole folders at once, not one file at a time',
    detail:
      'Batch pages for the three jobs people repeat most: shrinking a stack of PDFs, converting a camera roll of iPhone photos, and renaming files in bulk.',
    href: '/batch/compress-pdfs',
    hrefLabel: 'do a batch',
  },
  {
    date: '2026-09-25',
    title: 'The site refuses to load over an unencrypted connection',
    detail:
      'A promise that your file stays on your machine can be stripped out in transit if the page arrives unencrypted. Plain requests are now redirected before anything loads.',
    href: '/security',
    hrefLabel: 'what is enforced',
  },
  {
    date: '2026-09-24',
    title: 'Put a tool on your own site, free',
    detail:
      'Any tool here can be embedded in someone else’s page with no key and no account. It costs nothing to give away because the work runs in your reader’s browser, not on a server.',
    href: '/embed',
    hrefLabel: 'grab a snippet',
  },
  {
    date: '2026-09-24',
    title: 'A PDF compressor that works on a plane',
    detail:
      'One page built to be used with no connection at all: open it once and it keeps working after the network is gone, including the engine that does the compressing.',
    href: '/pdf/compress-offline',
    hrefLabel: 'compress with no network',
  },
];

const SITE = ['https:', '//', 'getopentools.com'].join('');

/** RFC 822 date, which is what RSS readers expect. Noon UTC, so no entry drifts a day. */
function rfc822(date: string) {
  return new Date(`${date}T12:00:00Z`).toUTCString();
}

function escapeXml(value: string) {
  return value
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/"/gu, '&quot;');
}

/**
 * The feed, built from the same array the page renders.
 *
 * One source, so the feed cannot quietly fall behind the page — the failure
 * nobody notices, because whoever reads the feed is not the person checking the
 * page.
 */
export function buildWhatsNewFeed() {
  const items = WHATS_NEW.map(
    (entry) => `    <item>
      <title>${escapeXml(entry.title)}</title>
      <link>${SITE}${entry.href}</link>
      <guid isPermaLink="false">${escapeXml(`${entry.date}-${entry.href}`)}</guid>
      <pubDate>${rfc822(entry.date)}</pubDate>
      <description>${escapeXml(entry.detail)}</description>
    </item>`,
  ).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>OpenTools — what's new</title>
    <link>${SITE}/whats-new</link>
    <atom:link href="${SITE}/whats-new/feed.xml" rel="self" type="application/rss+xml" />
    <description>New tools and changes to the ones already here. Everything runs in your browser.</description>
    <language>en</language>
    <lastBuildDate>${rfc822(WHATS_NEW[0]!.date)}</lastBuildDate>
${items}
  </channel>
</rss>
`;
}
