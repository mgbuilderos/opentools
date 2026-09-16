/**
 * Permanent redirects for tools removed by owner decision on 2026-09-17
 * (docs/DECISION_LOG.md), so old links land on the closest page that still
 * exists instead of a 404.
 */
const EXACT_REDIRECTS: Readonly<Record<string, string>> = {
  '/audio/transcribe': '/guides/category/audio',
  '/image/upscaler': '/image/optimize',
  '/guides/category/astrology-and-numerology':
    '/guides/category/date-time-and-productivity',
  '/guides/health-and-fitness-water-intake-calculator':
    '/guides/category/health-and-fitness',
  '/guides/image-image-upscaler': '/guides/category/image',
  '/guides/video-video-to-gif': '/guides/category/video',
  '/guides/audio-audio-format-converter': '/guides/category/audio',
};

/** Numerology tools that still exist under a new guide slug. */
const MOVED_NUMEROLOGY_TOOLS = new Set([
  'life-path-number-calculator',
  'birth-number-calculator',
  'personal-year-number-calculator',
]);

/** Removed name-based numerology tools; the closest remaining tool is life path. */
const REMOVED_NUMEROLOGY_TOOLS = new Set([
  'name-numerology-calculator',
  'destiny-number-calculator',
  'soul-urge-number-calculator',
  'personality-number-calculator',
  'numerology-compatibility-calculator',
  'lo-shu-grid-maker',
]);

const LEGACY_ASTROLOGY_GUIDE =
  /^\/guides\/astrology-and-numerology-([a-z0-9-]+)$/u;

export function removedToolRedirect(pathname: string): string | null {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/u, '') : pathname;
  const exact = EXACT_REDIRECTS[path];
  if (exact) return exact;

  const legacy = LEGACY_ASTROLOGY_GUIDE.exec(path);
  if (!legacy) return null;
  const tool = legacy[1];
  if (MOVED_NUMEROLOGY_TOOLS.has(tool))
    return `/guides/date-time-and-productivity-${tool}`;
  if (REMOVED_NUMEROLOGY_TOOLS.has(tool))
    return '/guides/date-time-and-productivity-life-path-number-calculator';
  // Every other legacy guide in this category was an astrology tool.
  return '/guides';
}
