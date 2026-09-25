/**
 * WHY THIS FILE EXISTS. Measured 2026-09-25: the homepage links to 22 tool
 * pages. The site has 1,335 of them. The category switcher that appears to
 * open the other 1,313 is
 * `window.history.pushState(null, '', '/?category=' + id)` in
 * `components/home-workspace.tsx` — a button, not a link, so a crawler reading
 * the homepage sees nothing behind it. Every tool outside `/pdf` was therefore
 * four or more clicks from the front page, reachable only through a guide.
 *
 * Not orphaned: `scripts/verify-no-orphans.mjs` runs on every build against
 * the rendered HTML in `dist/client` and reports zero. Every page has an
 * inbound link. It is the DEPTH that was wrong, and depth is what this fixes.
 *
 * One hub per URL prefix, server-rendered, listing and linking every tool
 * under it, and linked from the homepage in plain `<a href>`. That makes the
 * whole catalogue two clicks deep.
 *
 * The list of tools on each hub is NEVER written here: the hub component reads
 * `toolPagesForPrefix` from the link graph, so a hub cannot link a page that
 * does not exist and cannot miss one that does. Only the words that cannot be
 * derived live in this file.
 *
 * IMPORTS NOTHING, and must keep importing nothing. `CATEGORY_LINKS` is read by
 * `home-workspace.tsx`, which is a client component: one import of
 * `related-tools` here would pull `collectToolPages` — and with it all
 * eighteen workbench operation modules — into the homepage bundle. That is the
 * 655 KB regression `lib/tools/navigation.ts` was split out to undo.
 */
export interface CategoryHub {
  /** The hub's own address, and the prefix whose tools it lists. */
  route: string;
  /** Short label, for the homepage link and the breadcrumb. */
  name: string;
  /** `<title>`; 15–70 characters, guarded by `meta-lengths.test.ts`. */
  title: string;
  /** Meta description and the page's intro line; 50–165 characters. */
  description: string;
}

/**
 * Declaration order is the homepage's order, and follows
 * `NAVIGATION_MAJOR_SECTIONS` in `lib/tools/navigation.ts`: the files you
 * already have, then text and code, then the things you work out, then the
 * everyday jobs. A visitor scanning the list should meet them in the order the
 * menu already taught them.
 *
 * `/convert` is deliberately absent. Its 632 pages are 512 unit pairs being
 * folded onto twelve system hubs, so a hub listing them today would list
 * pages that are about to become redirects. It is added with that change.
 *
 * `/bench` is absent because it is one page, not a prefix. `/latex` and
 * `/schema` are absent because those two addresses already hold a
 * hand-written tool page — a literal folder beats anything this file could
 * add there. They are linked from the homepage all the same, through
 * `CATEGORY_LINKS` below, so no prefix is left without a depth-1
 * address.
 */
export const CATEGORY_HUBS: readonly CategoryHub[] = [
  {
    route: '/pdf',
    name: 'PDF',
    title: 'PDF tools: merge, compress, sign and convert',
    description:
      'Every PDF tool on OpenTools. Merge, split, compress, sign, OCR and convert PDFs in your browser — no upload, no account, no watermark.',
  },
  {
    route: '/image',
    name: 'Images',
    title: 'Image tools: resize, compress and convert',
    description:
      'Every image tool on OpenTools. Resize, compress, convert, remove backgrounds and read metadata in your browser — pictures never leave the device.',
  },
  {
    route: '/audio',
    name: 'Audio',
    title: 'Audio tools: convert and edit sound files',
    description:
      'Every audio tool on OpenTools. Convert and edit MP3 and other sound files in your browser, with the recording staying on your own machine.',
  },
  {
    route: '/video',
    name: 'Video',
    title: 'Video tools: trim, convert, compress and crop',
    description:
      'Every video tool on OpenTools. Trim, convert, compress, crop, rotate and extract audio in your browser — nothing is uploaded to a server.',
  },
  {
    route: '/documents',
    name: 'Documents',
    title: 'Document and office file tools',
    description:
      'Every document tool on OpenTools. Word and office files, metadata, citations and letters, all read and written inside your browser.',
  },
  {
    route: '/file',
    name: 'Files',
    title: 'File and archive tools',
    description:
      'Every file tool on OpenTools. ZIP archives, checksums, renaming and file inspection, run entirely in your browser with nothing uploaded.',
  },
  {
    route: '/text',
    name: 'Text',
    title: 'Text and writing tools',
    description:
      'Every text tool on OpenTools. Case conversion, counting, cleaning, comparison and writing helpers, all working inside your browser tab.',
  },
  {
    route: '/data',
    name: 'Spreadsheets',
    title: 'Spreadsheet and data tools',
    description:
      'Every data tool on OpenTools. JSON, CSV, Excel and tabular clean-up, run in your browser so the spreadsheet is never uploaded anywhere.',
  },
  {
    route: '/developer',
    name: 'Developer',
    title: 'Developer tools: encode, decode, format, inspect',
    description:
      'Every developer tool on OpenTools. Base64, UUIDs, timestamps, regex, hashes and formatters, all running locally in your browser tab.',
  },
  {
    route: '/web',
    name: 'Web & SEO',
    title: 'Web and SEO tools',
    description:
      'Every web tool on OpenTools. Metadata, URLs, CSS, HTML and accessibility checks, run in your browser with no page ever uploaded.',
  },
  {
    route: '/math',
    name: 'Calculators',
    title: 'Calculators and unit converters',
    description:
      'Every calculator on OpenTools. Percentages, averages, arithmetic, formulas and unit conversion, worked out in your browser as you type.',
  },
  {
    route: '/date',
    name: 'Dates',
    title: 'Date and time calculators',
    description:
      'Every date tool on OpenTools. Date differences, age, durations, working days and deadlines, worked out in your browser as you type.',
  },
  {
    route: '/productivity',
    name: 'Planning',
    title: 'Planning and productivity tools',
    description:
      'Every planning tool on OpenTools. Schedules, checklists, trackers and timesheets, all built in your browser and saved on your own device.',
  },
  {
    route: '/finance',
    name: 'Finance',
    title: 'Finance and business calculators',
    description:
      'Every finance tool on OpenTools. Loans, interest, tax, invoices, margins and business maths, worked out in your browser as you type.',
  },
  {
    route: '/science',
    name: 'Science',
    title: 'Science and learning tools',
    description:
      'Every science tool on OpenTools. Physics, chemistry, biology and statistics calculators and study helpers, worked out in your browser.',
  },
  {
    route: '/qr',
    name: 'QR codes',
    title: 'QR code and barcode tools',
    description:
      'Every QR and barcode tool on OpenTools. QR payloads, SVG sheets, product codes and label sheets, generated inside your browser tab.',
  },
  {
    route: '/creator',
    name: 'Creator',
    title: 'Creator and social media tools',
    description:
      'Every creator tool on OpenTools. Captions, thumbnails, hashtags, social formats and post helpers, all made inside your browser tab.',
  },
  {
    route: '/subtitles',
    name: 'Subtitles',
    title: 'Subtitle and caption file tools',
    description:
      'Every subtitle tool on OpenTools. Convert, shift, merge and clean SRT and VTT caption files in your browser, with no upload involved.',
  },
  {
    route: '/life-admin',
    name: 'India & life admin',
    title: 'India and life admin tools',
    description:
      'Every life admin tool on OpenTools. Indian paperwork, identifiers, number formatting and household admin, handled in your browser.',
  },
];

const HUB_BY_ROUTE: ReadonlyMap<string, CategoryHub> = new Map(
  CATEGORY_HUBS.map((hub) => [hub.route, hub]),
);

/** Every hub address this file renders, for the sitemap. */
export const CATEGORY_HUB_ROUTES: readonly string[] = CATEGORY_HUBS.map(
  (hub) => hub.route,
);

/**
 * The crawlable category list the homepage renders.
 *
 * The hubs, plus the two prefixes whose depth-1 address was already taken by a
 * hand-written tool page. Those two are not hubs and are not in the sitemap
 * addition — they have been in it for months — but a visitor and a crawler
 * should meet all 21 categories in one list, not 19 with two missing for a
 * reason that only makes sense from inside this file.
 */
export interface CategoryLink {
  route: string;
  name: string;
}

/**
 * The two prefixes whose depth-1 address was already a hand-written tool page,
 * so this file could not put a hub there. They belong in the category list all
 * the same: leaving them out would be a gap a reader can see, created by a
 * detail only this file knows about.
 */
const NON_HUB_CATEGORY_LINKS: readonly CategoryLink[] = [
  { route: '/latex', name: 'LaTeX' },
  { route: '/schema', name: 'Schema' },
];

/*
  Written out rather than sliced, so moving a hub in `CATEGORY_HUBS` cannot
  silently drop one of the two links above into the wrong group.
*/
const CATEGORY_LINK_ORDER: readonly string[] = [
  '/pdf',
  '/image',
  '/audio',
  '/video',
  '/documents',
  '/latex',
  '/file',
  '/text',
  '/data',
  '/developer',
  '/schema',
  '/web',
  '/math',
  '/date',
  '/productivity',
  '/finance',
  '/science',
  '/qr',
  '/creator',
  '/subtitles',
  '/life-admin',
];

/**
 * All 21 categories as crawlable links, for the homepage and for each hub's
 * own footer. `category-hubs.test.ts` fails if this drifts from the hubs plus
 * the two exceptions, so a new hub cannot ship unlinked.
 */
export const CATEGORY_LINKS: readonly CategoryLink[] = CATEGORY_LINK_ORDER.map(
  (route) => {
    const link =
      HUB_BY_ROUTE.get(route) ??
      NON_HUB_CATEGORY_LINKS.find((other) => other.route === route);
    if (!link)
      throw new Error(`CATEGORY_LINK_ORDER names no category: ${route}`);
    return { route: link.route, name: link.name };
  },
);

/** The hub at an address, or undefined when that address is not one. */
export function categoryHub(route: string): CategoryHub | undefined {
  return HUB_BY_ROUTE.get(route);
}
