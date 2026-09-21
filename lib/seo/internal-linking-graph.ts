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
 */
const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  PDF: 'Merge PDFs, extract pages, build a PDF from images, and rotate, reorder, delete, number, watermark or retitle pages in your browser.',
  Image:
    'Resize, compress and convert images, fit a photo under a KB limit at exact pixels and DPI, crop and rotate them, and make a plain-colour background transparent.',
  Audio: 'Trim a WAV file to the section you want.',
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
    `In-browser utilities for ${categoryName.toLowerCase()} tasks.`;

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
