/**
 * The Open Graph card each section shares with.
 *
 * WHY THIS MODULE EXISTS. A 360 sweep on 2026-09-23 found 78 of 1,413 live
 * URLs shipping no `og:image` at all: `/guides`, `/blog`, all 21
 * `/guides/category/*` pages, the six standalone guides and all 19 templates.
 * Every one of them was a page that declares its own `openGraph` block. Next.js
 * does not merge a page's `openGraph` into the layout's field by field -- the
 * page's block replaces the parent's whole -- so declaring `title` and
 * `description` there silently dropped the `images` array `app/layout.tsx`
 * sets, and `twitter.card` stayed `summary_large_image` with nothing to put in
 * the slot. Platforms reserve that space and render it blank, which is strictly
 * worse than no card: a shared link arrives as a bare URL with a hole in it.
 *
 * Nothing in source looked wrong, and no test could see it, because the fault
 * only exists in the merged metadata. So the fix is not "remember to add
 * images" -- it is this module plus `share-images.test.ts`, which fails when an
 * `openGraph` block under `app/` omits `images`.
 *
 * WHY PER SECTION RATHER THAN ONE CARD. Pointing all 78 at `/og.png` would
 * close the audit finding and leave every guide, article and template
 * advertising itself as the home page. The site's distribution plan is people
 * posting links, so the card is the page's first sentence to a stranger; a
 * guide link should promise guides. Four cards is the whole cost, drawn by
 * `scripts/generate-og-image.py` from the same dark tokens as the site.
 *
 * Paths are site-relative on purpose. `metadataBase` in `app/layout.tsx`
 * resolves them to absolute URLs in the rendered tags, which keeps the origin
 * in exactly one place.
 */

/** 1200x630 is what every platform crops against; off-size cards letterbox. */
export const SHARE_CARD_WIDTH = 1200;
export const SHARE_CARD_HEIGHT = 630;

export type ShareSection = 'site' | 'guides' | 'blog' | 'templates';

/**
 * Section to card file. `site` is the default the root layout declares for
 * every page that states no `openGraph` of its own -- all 1,335 tool pages.
 * The others exist because their sections override that block.
 */
export const SHARE_CARDS: Record<ShareSection, string> = {
  site: '/og.png',
  guides: '/og/guides.png',
  blog: '/og/blog.png',
  templates: '/og/templates.png',
};

/**
 * Alt text is not decoration here: Mastodon, Slack and screen readers all read
 * it, and a card with no alt is an unlabelled image in a feed.
 */
export const SHARE_CARD_ALT: Record<ShareSection, string> = {
  site: 'OpenTools — your files never leave your browser.',
  guides: 'OpenTools guides — step-by-step walkthroughs for every tool.',
  blog: 'OpenTools blog — how the tools actually work.',
  templates: 'OpenTools templates — free documents you fill in offline.',
};

/**
 * The `openGraph.images` array for a section. Every page that declares an
 * `openGraph` block spreads this in; that is the one thing the 78 broken pages
 * were missing.
 */
export function shareImages(section: ShareSection) {
  return [
    {
      url: SHARE_CARDS[section],
      width: SHARE_CARD_WIDTH,
      height: SHARE_CARD_HEIGHT,
      alt: SHARE_CARD_ALT[section],
    },
  ];
}

/**
 * The matching `twitter` block.
 *
 * X reads `twitter:*` first and does not fall back to `og:image` reliably once
 * a card type is declared, so a page that overrides Open Graph without
 * overriding this one would show the home page's card on X while showing its
 * own everywhere else. Passing the page's real title and description also stops
 * X reusing the layout's generic pair on all 78.
 */
export function shareTwitterCard(
  section: ShareSection,
  title: string,
  description: string,
) {
  return {
    card: 'summary_large_image' as const,
    title,
    description,
    images: [SHARE_CARDS[section]],
  };
}
