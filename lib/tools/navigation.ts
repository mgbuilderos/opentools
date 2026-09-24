/**
 * The sidebar's own data: enough to draw the menu, and nothing more.
 *
 * WHY THIS FILE EXISTS. `catalog.ts` imports all eighteen workbench operation
 * modules, because `publicTools` needs every operation's name and description
 * for search. `app-shell.tsx` renders on every page and imported `catalog.ts`
 * for four things -- the sections, the groups, a per-group count and
 * `searchTools` -- which pulled the whole catalogue into the shell chunk:
 * **655 KB on every page view**, carrying 677 operation descriptions to draw a
 * list of seventeen links. Measured 2026-09-20, before this split.
 *
 * So the menu reads from here, which imports nothing, and the catalogue is
 * fetched only when someone actually types in the search box.
 *
 * KEEPING IT HONEST. `destinationCount` is written down rather than computed,
 * because computing it is exactly the import this file exists to avoid.
 * `navigation.test.ts` fails if any field here drifts from `toolGroups`, so a
 * stale number cannot ship -- add a tool, run the tests, and it tells you.
 */

export type NavGroupId =
  | 'pdf'
  | 'images'
  | 'audio'
  | 'video'
  | 'documents'
  | 'files'
  | 'text-data'
  | 'spreadsheets'
  | 'developer-files'
  | 'web-seo'
  | 'calculators'
  | 'dates'
  | 'finance'
  | 'science'
  | 'qr-barcode'
  | 'creator'
  | 'life-admin';

export interface NavGroup {
  id: NavGroupId;
  name: string;
  shortDescription: string;
  /** Destinations a visitor can open from this group. Guarded by navigation.test.ts. */
  destinationCount: number;
  /** Tool ids, used only to mark the current group. No operation data. */
  toolIds: readonly string[];
}

export const NAV_GROUPS: readonly NavGroup[] = [
  {
    id: 'pdf',
    name: 'PDF',
    shortDescription: 'Merge, compress, extract, and reorder pages.',
    destinationCount: 22,
    toolIds: [
      'pdf-merge',
      'pdf-compress',
      'pdf-ocr',
      'pdf-sign',
      'pdf-extract',
      'images-to-pdf',
      'pdf-page-tools',
      'pdf-bates',
      'pdf-metadata',
      'pdf-to-word',
      'pdf-to-excel',
      'pdf-redact',
      'pdf-compare',
      'pdf-drawing-register',
      'pdf-preflight',
      'pdf-burst',
      'excel-to-pdf',
    ],
  },
  {
    id: 'images',
    name: 'Image',
    shortDescription: 'Compress, resize, convert, crop, and adjust images.',
    destinationCount: 13,
    toolIds: [
      'image-optimize',
      'image-to-text',
      'image-exact-size',
      'image-editor',
      'photo-metadata',
      'svg-optimizer',
      'color-converter',
    ],
  },
  {
    id: 'audio',
    name: 'Audio',
    shortDescription:
      'Cut, join and tag MP3s without re-encoding, and convert other audio to WAV.',
    destinationCount: 6,
    toolIds: ['mp3-toolkit', 'audio-convert', 'audio-loudness'],
  },
  {
    id: 'video',
    name: 'Video',
    shortDescription:
      'Trim, mute and extract audio from MP4 and MOV without re-encoding.',
    destinationCount: 1,
    toolIds: ['video-trim'],
  },
  {
    id: 'documents',
    name: 'Documents & office',
    shortDescription:
      'Word and office documents, LaTeX tables, citations, and letters.',
    destinationCount: 40,
    toolIds: ['document-workbench', 'docx-metadata', 'latex-hub'],
  },
  {
    id: 'files',
    name: 'Files & archives',
    shortDescription: 'ZIP archives, checksums, renaming, and file inspection.',
    destinationCount: 34,
    toolIds: ['file-hash', 'archive-toolkit', 'file-workbench', 'bench'],
  },
  {
    id: 'text-data',
    name: 'Text & writing',
    shortDescription: 'Case conversion, counting, cleaning, and writing tools.',
    destinationCount: 51,
    toolIds: ['text-case-converter', 'text-workbench', 'writing-workbench'],
  },
  {
    id: 'spreadsheets',
    name: 'Spreadsheets & data',
    shortDescription: 'JSON, CSV, Excel, and tabular data cleanup.',
    destinationCount: 45,
    toolIds: [
      'spreadsheet-workbench',
      'excel-converter',
      'csv-to-json',
      'format-converter',
      'json-format',
      'list-hygiene',
      'data-workbook-audit',
    ],
  },
  {
    id: 'developer-files',
    name: 'Developer',
    shortDescription: 'Base64, UUIDs, timestamps, regex, and schema tools.',
    destinationCount: 105,
    toolIds: [
      'base64-encode',
      'base64-decode',
      'uuid-generator',
      'unix-timestamp',
      'developer-data-workbench',
      'developer-advanced-workbench',
      'schema-hub',
    ],
  },
  {
    id: 'web-seo',
    name: 'Web & SEO',
    shortDescription: 'Metadata, URLs, CSS, HTML, and accessibility checks.',
    destinationCount: 48,
    toolIds: ['web-workbench', 'file-to-html'],
  },
  {
    id: 'calculators',
    name: 'Calculators & units',
    shortDescription: 'Percentages, arithmetic, formulas, and unit conversion.',
    destinationCount: 68,
    toolIds: ['percentage-calculator', 'math-workbench'],
  },
  {
    id: 'dates',
    name: 'Dates & planning',
    shortDescription: 'Date maths, age, timesheets, schedules, and checklists.',
    destinationCount: 36,
    toolIds: [
      'date-difference',
      'age-calculator',
      'date-workbench',
      'productivity-workbench',
    ],
  },
  {
    id: 'finance',
    name: 'Finance & business',
    shortDescription: 'Loans, tax, invoices, margins, and business maths.',
    destinationCount: 56,
    toolIds: ['finance-business-workbench'],
  },
  {
    id: 'science',
    name: 'Science & learning',
    shortDescription: 'Physics, chemistry, statistics, and study tools.',
    destinationCount: 52,
    toolIds: ['science-education-workbench'],
  },
  {
    id: 'qr-barcode',
    name: 'QR & barcodes',
    shortDescription: 'QR payloads, SVG sheets, product codes, and labels.',
    destinationCount: 28,
    toolIds: ['qr-barcode-workbench'],
  },
  {
    id: 'creator',
    name: 'Creator & social',
    shortDescription: 'Captions, subtitles, thumbnails, and social formats.',
    destinationCount: 63,
    toolIds: ['creator-workbench', 'subtitle-workbench'],
  },
  {
    id: 'life-admin',
    name: 'India & life admin',
    shortDescription: 'Indian paperwork, identifiers, and household admin.',
    destinationCount: 27,
    toolIds: ['aadhaar-pan-masker', 'life-admin-workbench'],
  },
];

export interface NavSection {
  id: string;
  title: string;
  groupCategoryIds: readonly NavGroupId[];
}

export const NAVIGATION_MAJOR_SECTIONS: readonly NavSection[] = [
  {
    id: 'files-you-have',
    title: 'Files you have',
    groupCategoryIds: ['pdf', 'images', 'audio', 'video', 'documents', 'files'],
  },
  {
    id: 'text-data-code',
    title: 'Text, data & code',
    groupCategoryIds: [
      'text-data',
      'spreadsheets',
      'developer-files',
      'web-seo',
    ],
  },
  {
    id: 'work-it-out',
    title: 'Work it out',
    groupCategoryIds: ['calculators', 'dates', 'finance', 'science'],
  },
  {
    id: 'everyday',
    title: 'Everyday',
    groupCategoryIds: ['qr-barcode', 'creator', 'life-admin'],
  },
];
