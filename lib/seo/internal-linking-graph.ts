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

  // The label states where the tool sits in the catalog. Nothing here measures
  // how people actually use it, so it must not imply that it does.
  return [
    ...explicit.map((tool) => ({
      tool,
      guideHref: guideOrToolHref(tool, consolidation),
      relationship: 'Continue this OCR workflow',
    })),
    ...scored
      .slice(0, Math.max(0, count - explicit.length))
      .map(({ tool }) => ({
        tool,
        guideHref: guideOrToolHref(tool, consolidation),
        relationship: `Also in ${tool.category}`,
      })),
  ];
}
