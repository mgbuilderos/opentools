import {
  type ToolCatalogEntry,
  getToolBySlug,
  getToolsByCategory,
  getAllCategories,
} from './tool-catalog-data';

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

for (const cat of getAllCategories()) {
  const slug = toCategorySlug(cat);
  CATEGORY_SLUG_MAP.set(cat, slug);
  SLUG_TO_CATEGORY_MAP.set(slug, cat);
}

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  PDF: 'Industrial-grade local PDF manipulation tools. Merge, split, compress, flatten form fields, extract pages, and convert documents directly in-browser with zero server uploads.',
  Image:
    'Fast, private image editors, format converters, background removers, compressors, and EXIF scrubbers running entirely on your GPU and device memory.',
  Video:
    'In-browser video trimmers, frame extractors, aspect-ratio reframers, and subtitle converters operating with zero network egress.',
  Audio:
    'Web Audio API converters, precision sound trimmers, and video-to-audio extractors delivering sub-second audio processing with zero cloud data transfer.',
  'Documents and Office':
    'Client-side document inspectors, format converters, Markdown editors, and office file processors running locally in WebAssembly.',
  'Spreadsheet and Data':
    'Tabular data workbench for CSV cleaning, reshaping, JSON serialization, and column deduplication with zero database retention.',
  'Archive and File':
    'High-security client-side file tools featuring 256-bit AES-GCM encryption, PBKDF2 password derivation, and SHA-256 integrity hashing.',
  'Text and Writing':
    'Precision typographic converters, case normalizers, word counters, text diff checkers, and privacy-preserving writing aids.',
  'Developer and Data':
    'Essential developer utilities: Base64 encoding, JWT inspection, UUID v4 generation, and Unix timestamp conversion with zero telemetry.',
  'Web and SEO':
    'Client-side webmaster utilities: robots.txt generators, meta tag creators, OpenGraph previewers, and URL encoders.',
  'QR and Barcode':
    'Vector SVG QR code card generators, print-ready frames, MeCard contact codes, and multi-crypto payment barcodes.',
  'Math and Units':
    'Scientific arithmetic, percentage calculators, aspect ratio tools, and unit converters running in hardware floating-point precision.',
  'Finance and Business':
    'Loan amortization calculators, freelance invoice makers, compound interest projectors, and tax estimation tools with zero cloud financial retention.',
  'Date Time and Productivity':
    'Chrono-utilities: date difference finders, age calculators, work day adders, and timezone comparison tools.',
  'Health and Fitness':
    'Health and fitness metrics calculators: BMI, BMR, TDEE, macronutrient splitters, and hydration trackers with zero personal data leakage.',
  'Science and Education':
    'Interactive periodic table, molecular weight calculator, scientific unit conversion, and physics formulas.',
  'India and Life Admin':
    'Specialized life administration tools: IFSC lookup, PIN code directories, HRA exemption calculators, and rent receipt generators.',
  'Astrology and Numerology':
    'Local ephemeris calculators, planetary hour tracking, and numerology charts computed 100% in JavaScript.',
  'Creator and Social':
    'Creator toolkit: caption line breakers, hashtag deduplicators, sponsorship CPM calculators, and platform profile QR codes.',
};

export function getCategoryBySlug(slug: string): string | undefined {
  return SLUG_TO_CATEGORY_MAP.get(slug);
}

export function getCategoryPillar(
  categoryName: string,
): CategoryPillarInfo | undefined {
  const slug = CATEGORY_SLUG_MAP.get(categoryName);
  if (!slug) return undefined;

  const tools = getToolsByCategory(categoryName);
  const description =
    CATEGORY_DESCRIPTIONS[categoryName] ??
    `Comprehensive in-browser utilities for ${categoryName.toLowerCase()} tasks with zero server uploads.`;

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
  return getAllCategories().map((cat) => getCategoryPillar(cat)!);
}

export interface RelatedToolLink {
  tool: ToolCatalogEntry;
  guideHref: string;
  relationship: string;
}

export function getRelatedToolLinks(
  currentSlug: string,
  count = 4,
): readonly RelatedToolLink[] {
  const current = getToolBySlug(currentSlug);
  if (!current) return [];

  const categoryTools = getToolsByCategory(current.category).filter(
    (t) => t.slug !== currentSlug,
  );

  const scored = categoryTools.map((tool) => {
    let score = 0;
    // Prefer tools close in rank (sequential workflow items)
    const rankDiff = Math.abs(tool.rank - current.rank);
    if (rankDiff === 1) score += 50;
    else if (rankDiff <= 3) score += 30;
    else if (rankDiff <= 8) score += 15;

    // Prioritize high-demand P0/P1 wave tools
    if (tool.releaseWave === 'P0') score += 20;
    else if (tool.releaseWave === 'P1') score += 10;

    // Word similarity in names
    const currentWords = new Set(current.name.toLowerCase().split(/\s+/));
    for (const word of tool.name.toLowerCase().split(/\s+/)) {
      if (word.length > 3 && currentWords.has(word)) {
        score += 25;
      }
    }

    return { tool, score };
  });

  scored.sort((a, b) => b.score - a.score || a.tool.rank - b.tool.rank);

  return scored.slice(0, count).map(({ tool }) => {
    let relationship = 'Next step in workflow';
    if (tool.name.includes('Encrypt') || tool.name.includes('Decrypt')) {
      relationship = 'Cryptographic companion';
    } else if (tool.name.includes('Convert') || tool.name.includes('To')) {
      relationship = 'Alternative format conversion';
    } else if (tool.releaseWave === 'P0') {
      relationship = 'Frequently paired utility';
    }

    return {
      tool,
      guideHref: `/guides/${tool.slug}`,
      relationship,
    };
  });
}
