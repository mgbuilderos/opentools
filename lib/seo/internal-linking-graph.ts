import type { ToolCatalogEntry } from './tool-catalog-data';
import {
  GUIDE_CONSOLIDATION,
  type GuideConsolidationState,
  guideOrToolHref,
} from './guide-consolidation';
import {
  getLiveCategories,
  getLiveToolBySlug,
  getLiveToolsByCategory,
  LIVE_TOOL_CATALOG,
} from './live-tools';

export interface CategoryPillarInfo {
  name: string;
  slug: string;
  href: string;
  description: string;
  toolCount: number;
  featuredTools: readonly ToolCatalogEntry[];
}

export function toCategorySlug(category: string): string {
  return category
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const CATEGORY_SLUG_MAP = new Map<string, string>();
const SLUG_TO_CATEGORY_MAP = new Map<string, string>();

for (const cat of getLiveCategories()) {
  const slug = toCategorySlug(cat);
  CATEGORY_SLUG_MAP.set(cat, slug);
  SLUG_TO_CATEGORY_MAP.set(slug, cat);
}

/**
 * One plain sentence per category, describing only what the live tools in it
 * actually do. No speed, egress or offline claims here (AGENTS.md truth rules);
 * privacy wording follows docs/DECISION_LOG.md §6.
 *
 * Every live category must appear here. `getCategoryPillar` falls back to
 * "In-browser utilities for <x> tasks.", which is what
 * `/guides/category/pdf-and-documents` served to Google until 2026-09-23 --
 * long enough not to look broken, and saying nothing. `description-coverage.test.ts`
 * fails on a live category with no entry, so the fallback is now unreachable
 * rather than merely discouraged.
 */
export const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  PDF: 'Merge PDFs, extract pages, build a PDF from images, and rotate, reorder, delete, number, watermark or retitle pages in your browser.',
  Image:
    'Resize, compress and convert images, fit a photo under a KB limit at exact pixels and DPI, crop and rotate them, and make a plain-colour background transparent.',
  Audio:
    'Cut and join MP3 files, trim an audio clip to the seconds you want, turn M4A or FLAC into WAV, and edit the ID3 tags on a track, all in your browser.',
  'Documents and Office':
    'Inspect and convert document text: Markdown, HTML, plain text and structured document fields.',
  'Spreadsheet and Data':
    'Clean and reshape tabular data: CSV to JSON, column edits, deduplication and format conversion.',
  'Archive and File':
    'File utilities: hashes and checksums, size and type inspection, filename and path handling.',
  'Text and Writing':
    'Case conversion, word and character counts, text comparison, cleanup and formatting helpers.',
  'Developer and Data':
    'Base64, UUIDs, Unix timestamps, hashes, JSON and SQL formatting, and other everyday developer conversions.',
  'Web and SEO':
    'robots.txt and meta tag builders, Open Graph previews, URL encoding and other webmaster helpers.',
  'QR and Barcode':
    'QR codes for links, contacts, Wi-Fi and payments, plus common barcode formats, rendered as SVG.',
  'Math and Units':
    'Percentages, ratios, unit conversion and everyday arithmetic calculators.',
  'Finance and Business':
    'Loan and EMI schedules, compound interest, invoices, margins and tax estimates.',
  'Date Time and Productivity':
    'Date differences, age, working days, timezone comparison and birthday number arithmetic.',
  'Health and Fitness':
    'BMI, BMR, TDEE and ideal body weight formula results. Numbers only, not medical advice.',
  'Science and Education':
    'Periodic table lookup, molecular weight, scientific unit conversion and physics formulas.',
  'India and Life Admin':
    'IFSC and PIN code lookup, HRA exemption, rent receipts and similar paperwork helpers.',
  'PDF and Documents':
    'Read the document properties, XMP packet, dates and file identifier held inside a PDF, and strip all of them out again, in your own browser tab.',
  'Subtitles and Captions':
    'Shift subtitle timing, correct drift, change the frame rate, join files, check captions for common faults, and convert between SRT and VTT in your browser.',
  'Creator and Social':
    'Caption and hashtag helpers, CPM and engagement maths, and profile QR codes.',
};

export function getCategoryBySlug(slug: string): string | undefined {
  return SLUG_TO_CATEGORY_MAP.get(slug);
}

export function getCategoryPillar(
  categoryName: string,
): CategoryPillarInfo | undefined {
  const slug = CATEGORY_SLUG_MAP.get(categoryName);
  if (!slug) return undefined;

  const tools = getLiveToolsByCategory(categoryName);
  const description =
    CATEGORY_DESCRIPTIONS[categoryName] ??
    `In-browser utilities for ${categoryName.toLowerCase()} tasks. Every tool listed here runs inside your own browser tab, with no upload, no account and no paywall.`;

  return {
    name: categoryName,
    slug,
    href: `/guides/category/${slug}`,
    description,
    toolCount: tools.length,
    featuredTools: tools.slice(0, 6),
  };
}

export function getAllCategoryPillars(): readonly CategoryPillarInfo[] {
  return getLiveCategories().map((cat) => getCategoryPillar(cat)!);
}

export interface RelatedToolLink {
  tool: ToolCatalogEntry;
  /** The tool's guide, or the tool page when its guide is consolidated. */
  guideHref: string;
  relationship: string;
}

/** Workflow edges that cross catalog categories and therefore cannot be inferred by rank. */
const EXPLICIT_RELATED_SLUGS: Readonly<Record<string, readonly string[]>> = {
  'pdf-ocr-pdf': ['image-image-to-text', 'pdf-pdf-to-word', 'pdf-pdf-to-excel'],
  'image-image-to-text': ['pdf-ocr-pdf'],
  'pdf-pdf-to-word': ['pdf-ocr-pdf'],
  'pdf-pdf-to-excel': ['pdf-ocr-pdf'],
};

export function getRelatedToolLinks(
  currentSlug: string,
  count = 4,
  consolidation: GuideConsolidationState = GUIDE_CONSOLIDATION,
): readonly RelatedToolLink[] {
  const current = getLiveToolBySlug(currentSlug);
  if (!current) return [];

  const explicit = (EXPLICIT_RELATED_SLUGS[currentSlug] ?? [])
    .map((slug) => getLiveToolBySlug(slug))
    .filter((tool): tool is ToolCatalogEntry => Boolean(tool))
    .slice(0, count);
  const explicitSlugs = new Set(explicit.map((tool) => tool.slug));

  const categoryTools = getLiveToolsByCategory(current.category).filter(
    (tool) => tool.slug !== currentSlug && !explicitSlugs.has(tool.slug),
  );

  // Three signals, none of which measure real usage: catalog neighbours score
  // highest, then earlier release waves, then a shared word in the name.
  const scored = categoryTools.map((tool) => {
    let score = 0;
    // Catalog rank orders tools within a category, so near ranks are related.
    const rankDiff = Math.abs(tool.rank - current.rank);
    if (rankDiff === 1) score += 50;
    else if (rankDiff <= 3) score += 30;
    else if (rankDiff <= 8) score += 15;

    // Earlier release waves are the more established tools.
    if (tool.releaseWave === 'P0') score += 20;
    else if (tool.releaseWave === 'P1') score += 10;

    const currentWords = new Set(current.name.toLowerCase().split(/\s+/));
    for (const word of tool.name.toLowerCase().split(/\s+/)) {
      if (word.length > 3 && currentWords.has(word)) {
        score += 25;
      }
    }

    return { tool, score };
  });

  scored.sort((a, b) => b.score - a.score || a.tool.rank - b.tool.rank);

  // RESERVE THE LAST SLOT FOR A DIFFERENT CATEGORY.
  //
  // Until this, candidates were filtered to `current.category` and nothing
  // else, which made the guide graph 18 sealed islands: an audit of the built
  // output on 2026-09-21 found 2,264 guide-to-guide links and **zero** of them
  // crossing a category. A crawler entering the Image cluster could not reach a
  // PDF guide except through the site chrome, which is byte-identical on every
  // page and therefore carries no signal. Authority could not flow between
  // clusters and a reader following the cards went in circles.
  //
  // One slot is enough to connect the graph — every island gains an edge — and
  // keeps the other three genuinely close. The cross pick is chosen only by a
  // shared, non-trivial word in the tool name, so it is a real relationship
  // rather than filler: no shared word, no link, and the caller gets three.
  // Whatever main's explicit workflow links did not claim is what is left to
  // fill. Slicing to `count` here instead would let the cross-category pick
  // push an explicit link off the end, which is the opposite of the intent:
  // a hand-curated workflow edge outranks an automatic one.
  const budget = Math.max(0, count - explicit.length);
  const sameCategory = scored.slice(0, Math.max(0, budget - 1));
  const crossPick =
    budget > 0 ? pickCrossCategoryLink(current, sameCategory) : undefined;

  const chosen = crossPick
    ? [...sameCategory, { tool: crossPick, score: 0 }]
    : scored.slice(0, budget);

  // The label states where the tool sits in the catalog. Nothing here measures
  // how people actually use it, so it must not imply that it does.
  return [
    ...explicit.map((tool) => ({
      tool,
      guideHref: guideOrToolHref(tool, consolidation),
      relationship: 'Continue this OCR workflow',
    })),
    // `chosen` is this lane's cross-category pick; `guideOrToolHref` is main's
    // consolidation routing, which sends a link to the tool page when that
    // guide is no longer published. Both are required: without the first the
    // graph is 18 sealed islands, without the second a link points at a URL
    // that now 301s.
    ...chosen.map(({ tool }) => ({
      tool,
      guideHref: guideOrToolHref(tool, consolidation),
      relationship:
        tool.category === current.category
          ? `Also in ${tool.category}`
          : `Related in ${tool.category}`,
    })),
  ];
}

/** Words too common across the catalog to signal a real relationship. */
const STOP_WORDS = new Set([
  'tool',
  'online',
  'free',
  'generator',
  'converter',
  'calculator',
  'editor',
  'viewer',
  'maker',
  'checker',
  'file',
  'text',
]);

/**
 * Tools indexed by the meaningful words in their names, built once.
 *
 * WHY AN INDEX. The first version of `pickCrossCategoryLink` scanned the whole
 * catalogue and re-split every candidate name on each call. `getRelatedToolLinks`
 * runs once per tool, so that is O(n squared) over ~679 tools with string
 * splitting inside the loop — about 460,000 iterations, which pushed
 * `related-tools.test.ts` past its 5s budget and blocked QC. Building the map
 * once turns each lookup into a handful of set reads.
 *
 * Lazily initialised rather than computed at module load, because this module
 * is imported by pages that never ask for a related link.
 */
let wordIndex: Map<string, ToolCatalogEntry[]> | undefined;

function toolsByWord(): Map<string, ToolCatalogEntry[]> {
  if (wordIndex) return wordIndex;
  const index = new Map<string, ToolCatalogEntry[]>();
  for (const tool of LIVE_TOOL_CATALOG) {
    for (const word of meaningfulWords(tool.name)) {
      const bucket = index.get(word);
      if (bucket) bucket.push(tool);
      else index.set(word, [tool]);
    }
  }
  wordIndex = index;
  return index;
}

function meaningfulWords(name: string): Set<string> {
  return new Set(
    name
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 3 && !STOP_WORDS.has(word)),
  );
}

/**
 * The best tool from another category that shares a meaningful name word.
 *
 * Returns undefined when nothing genuinely matches, because a link invented to
 * fill a slot is worse than three honest ones — it teaches a reader that the
 * cards are noise.
 */
function pickCrossCategoryLink(
  current: ToolCatalogEntry,
  alreadyChosen: readonly { tool: ToolCatalogEntry }[],
): ToolCatalogEntry | undefined {
  const taken = new Set(alreadyChosen.map((entry) => entry.tool.slug));
  const currentWords = meaningfulWords(current.name);
  if (currentWords.size === 0) return undefined;

  const index = toolsByWord();
  const scores = new Map<string, { tool: ToolCatalogEntry; score: number }>();
  for (const word of currentWords) {
    for (const tool of index.get(word) ?? []) {
      if (tool.category === current.category) continue;
      if (tool.slug === current.slug || taken.has(tool.slug)) continue;
      const existing = scores.get(tool.slug);
      if (existing) existing.score += 25;
      else
        scores.set(tool.slug, {
          tool,
          score: 25 + (tool.releaseWave === 'P0' ? 5 : 0),
        });
    }
  }

  let best: { tool: ToolCatalogEntry; score: number } | undefined;
  for (const candidate of scores.values()) {
    if (
      !best ||
      candidate.score > best.score ||
      (candidate.score === best.score && candidate.tool.rank < best.tool.rank)
    ) {
      best = candidate;
    }
  }
  return best?.tool;
}

/**
 * A page that belongs to a category but is not a `LIVE_TOOL_CATALOG` entry.
 *
 * Same shape as a tool card needs, deliberately: the pillar page renders these
 * beside the catalog tools, and nothing about them should read as a different
 * kind of link.
 */
export interface CategoryHubLink {
  href: string;
  name: string;
  description: string;
}

/**
 * ORPHAN PAGES, AND WHY A LIST IS THE HONEST FIX.
 *
 * On 2026-09-23 a sweep of all 1,392 live URLs found 12 with no inbound link
 * from any page on the site. A page reachable only from the sitemap gets
 * minimal crawl priority and receives no internal authority at all, which is
 * most of why 552 URLs sit in Search Console as "not indexed".
 *
 * Every SEO surface on this site -- the category pillars, the related-tool
 * cards, the guide index -- is driven by `LIVE_TOOL_CATALOG`. All 12 orphans
 * were orphans for one reason: they are in `LIVE_TOOL_ROUTES`, so they reach
 * the sitemap, but they are not in `lib/seo/tool-catalog-data.ts`, so no
 * catalog-driven surface can ever reach them. Ten are workbench hubs (one URL
 * hosting a whole category's operations), one is `/bench`, and two --
 * `/data/workbook-audit` and `/image/solid-background-remover` -- are ordinary
 * tool pages that were registered as routes and never added to the catalog.
 *
 * This cannot be derived. Which category a workbench serves is a judgement
 * about its contents, so it is written down, and `internal-linking-graph.test.ts`
 * asserts that every href here is a real live route and that the orphan set is
 * empty as a result. The six workbenches that were *not* orphaned are listed
 * too: each of them owed its single inbound link to one blog post or one
 * template that happened to mention it, which is not a structure -- it is luck
 * that a future edit can delete.
 *
 * Copy is taken from each page's own `metadata`, so a pillar cannot advertise
 * something the page does not say about itself.
 */
const CATEGORY_HUB_LINKS: Readonly<Record<string, readonly CategoryHubLink[]>> =
  {
    'Archive and File': [
      {
        href: '/file/workbench',
        name: 'Private File Workbench',
        description:
          'Inspect, hash, split, join, rename, encode, and download files locally in your browser.',
      },
    ],
    'Creator and Social': [
      {
        href: '/creator/workbench',
        name: 'Creator & Social Workbench',
        description:
          'Format, plan, measure, and package creator content locally with transparent rules.',
      },
    ],
    'Date Time and Productivity': [
      {
        href: '/date/workbench',
        name: 'Date & Time Workbench',
        description:
          'Calculate dates, workdays, time zones, durations, hours, and timesheets locally.',
      },
      {
        href: '/productivity/workbench',
        name: 'Planning & Productivity Workbench',
        description:
          'Prioritize tasks, build schedules, compare decisions, create teams, and make lists locally.',
      },
    ],
    'Developer and Data': [
      {
        href: '/developer/workbench',
        name: 'Developer & Data Workbench',
        description:
          'Encode, decode, inspect, transform, hash, and test developer data locally.',
      },
      {
        href: '/developer/advanced',
        name: 'Advanced Developer Workbench',
        description:
          'Inspect JSON, decode JWTs, generate secure tokens, calculate IPv4 networks, and build project configuration locally.',
      },
    ],
    'Documents and Office': [
      {
        href: '/documents/workbench',
        name: 'Documents & Office Workbench',
        description:
          'Create, calculate, compare, inspect, merge, and download everyday office documents locally.',
      },
    ],
    'Finance and Business': [
      {
        href: '/finance/workbench',
        name: 'Finance & Business Scenario Workbench',
        description:
          'Run transparent loan, savings, pricing, budget, and business metric scenarios locally.',
      },
    ],
    Image: [
      {
        href: '/image/solid-background-remover',
        name: 'Remove White Background Online',
        description:
          'Make a plain white or single-colour background transparent in your browser. Pick the colour, set the tolerance and edge softness, and save as PNG or WebP. Nothing is uploaded.',
      },
    ],
    'India and Life Admin': [
      {
        href: '/life-admin/workbench',
        name: 'India & Life-Admin Workbench',
        description:
          'Mask sensitive references, check common formats, and run everyday planning calculations locally in your browser.',
      },
    ],
    'Math and Units': [
      {
        href: '/math/workbench',
        name: 'Math & Unit Workbench',
        description:
          'Calculate arithmetic, statistics, number theory, geometry, and unit conversions locally.',
      },
    ],
    PDF: [
      {
        /*
          `/pdf/compress-offline` is in `LIVE_TOOL_ROUTES` but in no catalogue,
          so nothing built from `tool-catalog-data.ts` can link it -- the exact
          shape of orphan this map exists to rescue, and the same one
          `/image/solid-background-remover` is rescued in above.
          `scripts/verify-no-orphans.mjs` fails the build without this entry.
        */
        href: '/pdf/compress-offline',
        name: 'Compress a PDF With No Network',
        description:
          'Compress a PDF with the network switched off, and check first whether this device is ready to. The page reports what it holds offline rather than promising it.',
      },
    ],
    'QR and Barcode': [
      {
        href: '/qr/workbench',
        name: 'QR Code & Barcode Generator Workbench',
        description:
          'Generate QR codes, QR sheets, EAN, UPC-A, Code 39, and ITF-14 SVGs locally in your browser.',
      },
    ],
    'Science and Education': [
      {
        href: '/science/workbench',
        name: 'Science & Learning Workbench',
        description:
          'Use transparent science calculators and build study materials locally in your browser.',
      },
    ],
    'Spreadsheet and Data': [
      {
        href: '/data/workbench',
        name: 'CSV & Spreadsheet Workbench',
        description:
          'Clean, reshape, compare, inspect, sample, and convert tabular data locally.',
      },
      {
        href: '/data/workbook-audit',
        name: 'Excel Workbook Audit & Formula Inspector',
        description:
          'Detect hardcoded constants in formulas, broken formula runs, error cells, circular references, hidden sheets and mixed column types, with zero server uploads.',
      },
    ],
    'Subtitles and Captions': [
      {
        href: '/subtitles/workbench',
        name: 'Subtitle Converter, Sync and Caption Checker',
        description:
          'Convert SRT, WebVTT, SBV, LRC and SubStation subtitles, fix timing that drifts, join or trim files and check captions, with no upload.',
      },
    ],
    'Text and Writing': [
      {
        href: '/text/workbench',
        name: 'Text Workbench',
        description:
          'Count, clean, transform, inspect, and translate text locally in one compact workspace.',
      },
      {
        href: '/text/writing',
        name: 'Writing Workbench',
        description:
          'Edit, convert, compare, summarize, structure, and export text locally.',
      },
    ],
    'Web and SEO': [
      {
        href: '/web/workbench',
        name: 'Web & SEO Workbench',
        description:
          'Generate and inspect metadata, URLs, sitemaps, CSS, HTML, and accessibility signals locally.',
      },
    ],
  };

/**
 * Hubs that belong to no single category because they run operations from all
 * of them. Rendered on `/guides`, which is the only page on the site whose
 * subject is "everything here", and therefore the only honest place for it.
 */
const SITE_HUB_LINKS: readonly CategoryHubLink[] = [
  {
    href: '/bench',
    name: 'The Bench',
    description:
      'Drop files or choose a folder, run any OpenTools operation locally, and keep the results as a ZIP or in a folder you choose.',
  },
];

/**
 * The hub pages to link from a category pillar.
 *
 * Anything the pillar already links as a catalog tool is dropped here rather
 * than rendered twice. `destinationUrl` may carry a `?tool=` parameter, which
 * addresses an operation inside a workbench and is not the same page as the
 * workbench itself -- only a bare path counts as already linked.
 */
export function getCategoryHubLinks(
  categoryName: string,
): readonly CategoryHubLink[] {
  const alreadyLinked = new Set(
    getLiveToolsByCategory(categoryName).flatMap((tool) =>
      tool.destinationUrl.includes('?') ? [] : [tool.destinationUrl],
    ),
  );
  return (CATEGORY_HUB_LINKS[categoryName] ?? []).filter(
    (link) => !alreadyLinked.has(link.href),
  );
}

/** Hubs for the guide index; see `SITE_HUB_LINKS`. */
export function getSiteHubLinks(): readonly CategoryHubLink[] {
  return SITE_HUB_LINKS;
}

/** Every href this module hands a page, for the orphan guard to check against. */
export function getAllHubLinkHrefs(): readonly string[] {
  return [
    ...Object.values(CATEGORY_HUB_LINKS).flatMap((links) =>
      links.map((link) => link.href),
    ),
    ...SITE_HUB_LINKS.map((link) => link.href),
  ];
}
