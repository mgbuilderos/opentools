/**
 * The guide slugs served from the cached route.
 *
 * WHY THIS IS A PLAIN LIST. `next.config.ts` builds one rewrite per entry, and
 * config is evaluated before anything else in the build -- importing
 * `live-tools` there would drag the whole tool catalogue and every workbench
 * module into config evaluation. So these are literal strings with no imports,
 * and `cached-guides.test.ts` fails the build if the list ever stops matching
 * the catalogue rule below.
 *
 * WHY ONLY 50. All 550 guides cost 1,100 KV writes, which does not fit the free
 * plan's ~1,000/day at any setting (see docs/CACHE_BUDGET.md). 50 costs 100.
 * The selection is the same `releaseWave === 'P0' || rank <= 5` rule that
 * `generateStaticParams` already used, so nothing new is being guessed at.
 *
 * The other 500 guides keep rendering on demand and cost no writes at all.
 */
export const CACHED_GUIDE_SLUGS = [
  'subtitles-sync-fixer',
  'subtitles-frame-rate-converter',
  'subtitles-joiner',
  'subtitles-caption-checker',
  'audio-mp3-cutter',
  'audio-mp3-joiner',
  'pdf-merge-pdf',
  'pdf-compress-pdf',
  'pdf-rotate-pdf',
  'pdf-reorder-pdf-pages',
  'pdf-extract-pdf-pages',
  'pdf-images-to-pdf',
  'image-image-cropper',
  'image-image-rotator',
  'image-image-flipper',
  'image-background-remover',
  'audio-audio-trimmer',
  'spreadsheet-and-data-csv-viewer',
  'spreadsheet-and-data-csv-editor',
  'spreadsheet-and-data-csv-cleaner',
  'spreadsheet-and-data-csv-sorter',
  'spreadsheet-and-data-csv-filter',
  'text-and-writing-text-editor',
  'text-and-writing-markdown-editor',
  'text-and-writing-html-to-markdown',
  'text-and-writing-markdown-to-html',
  'developer-and-data-json-editor',
  'developer-and-data-json-diff',
  'developer-and-data-unix-timestamp-converter',
  'web-and-seo-meta-tag-generator',
  'web-and-seo-open-graph-generator',
  'web-and-seo-twitter-card-generator',
  'web-and-seo-serp-snippet-preview',
  'web-and-seo-robots-txt-generator',
  'qr-and-barcode-qr-code-generator',
  'qr-and-barcode-url-qr-code',
  'qr-and-barcode-text-qr-code',
  'qr-and-barcode-wi-fi-qr-code',
  'qr-and-barcode-upi-qr-code',
  'math-and-units-basic-calculator',
  'math-and-units-scientific-calculator',
  'math-and-units-fraction-calculator',
  'math-and-units-percentage-calculator',
  'math-and-units-ratio-calculator',
  'finance-and-business-loan-emi-calculator',
  'finance-and-business-mortgage-calculator',
  'finance-and-business-simple-interest-calculator',
  'finance-and-business-compound-interest-calculator',
  'finance-and-business-sip-calculator',
  'finance-and-business-gst-calculator',
] as const;

export function isCachedGuideSlug(slug: string): boolean {
  return (CACHED_GUIDE_SLUGS as readonly string[]).includes(slug);
}
