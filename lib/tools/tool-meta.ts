/**
 * The two fields a tool component needs about itself, and nothing else.
 *
 * WHY THIS FILE EXISTS. Sixteen tool components did
 * `publicTools.find((tool) => tool.id === 'pdf-merge')!` to read
 * `manifest.version` -- and importing `publicTools` imports `catalog.ts`,
 * which imports all eighteen workbench operation modules. Every one of those
 * pages shipped ~600 KB of other tools' names and descriptions to print one
 * version string. Measured 2026-09-20.
 *
 * Fourteen call sites read `version`, three read `shortDescription`. That is
 * the whole surface, so that is the whole file.
 *
 * KEEPING IT HONEST. `tool-meta.test.ts` fails if any entry drifts from
 * `publicTools`, or if a tool is missing from here.
 */

export interface ToolMeta {
  version: string;
  shortDescription: string;
}

export const TOOL_META: Readonly<Record<string, ToolMeta>> = {
  'text-case-converter': {
    version: '0.1.0-canary',
    shortDescription: 'Change text to sentence, title, upper, or lower case.',
  },
  'text-workbench': {
    version: '0.1.0-canary',
    shortDescription:
      'Count, clean, transform, inspect, and translate text locally.',
  },
  'writing-workbench': {
    version: '0.1.0-canary',
    shortDescription:
      'Edit, convert, compare, summarize, structure, and export writing.',
  },
  'json-format': {
    version: '0.1.0-canary',
    shortDescription:
      'Validate, format, minify, or sort JSON without sending it away.',
  },
  'csv-to-json': {
    version: '0.1.0-canary',
    shortDescription: 'Turn quoted CSV rows into structured JSON in this tab.',
  },
  'spreadsheet-workbench': {
    version: '0.1.0-canary',
    shortDescription:
      'Clean, reshape, compare, inspect, and convert tabular data.',
  },
  'pdf-merge': {
    version: '0.1.0-canary',
    shortDescription: 'Combine PDF files in the order you choose.',
  },
  'pdf-compress': {
    version: '0.1.0-canary',
    shortDescription:
      'Rewrite a PDF more compactly and re-encode the photos inside it.',
  },
  'pdf-ocr': {
    version: '0.1.0-canary',
    shortDescription:
      'Add an invisible searchable English text layer to a scanned PDF while preserving its visible pages.',
  },
  'pdf-to-word': {
    version: '0.1.0-canary',
    shortDescription:
      'Pull the text out of a PDF into an editable .docx. Text only — layout, tables and images are not carried across.',
  },
  'pdf-to-excel': {
    version: '0.1.0-canary',
    shortDescription:
      'Convert bank statements and PDF tables into clean Excel (.xlsx) and CSV with column detection, reconciliation and zero server uploads.',
  },
  'pdf-sign': {
    version: '0.1.0-canary',
    shortDescription: 'Complete a PDF form and draw a signature onto the page.',
  },
  'pdf-extract': {
    version: '0.1.0-canary',
    shortDescription: 'Choose pages or ranges and save them as a new PDF.',
  },
  'images-to-pdf': {
    version: '0.1.0-canary',
    shortDescription:
      'Arrange JPEG and PNG images into one locally generated PDF.',
  },
  'pdf-page-tools': {
    version: '0.1.0-canary',
    shortDescription:
      'Reorder, remove, rotate, number, watermark, and label PDF pages.',
  },
  'mp3-toolkit': {
    version: '0.1.0-canary',
    shortDescription:
      'Cut, join, tag and inspect MP3s by copying frames — no re-encoding.',
  },
  'audio-convert': {
    version: '0.1.0-canary',
    shortDescription:
      'Convert M4A, FLAC, OGG, AIFF or MP3 to WAV, with trimming, fades and levelling.',
  },
  'video-trim': {
    version: '0.1.0-canary',
    shortDescription:
      'Cut, mute or extract the audio from an MP4 or MOV without re-encoding it.',
  },
  'excel-converter': {
    version: '0.1.0-canary',
    shortDescription:
      'Turn an .xlsx into a CSV, or a CSV into a real Excel file, in this tab.',
  },
  'pdf-bates': {
    version: '0.1.0-canary',
    shortDescription:
      'Stamp sequential exhibit numbers across a bundle of PDFs, continuing the count from one file to the next.',
  },
  'pdf-redact': {
    version: '0.1.0-canary',
    shortDescription:
      'Permanently black out text, rectangles, or sensitive PII. Rasterises redacted pages and purges metadata and annotations.',
  },
  'docx-metadata': {
    version: '0.1.0-canary',
    shortDescription:
      'See the author, company, editing time, tracked changes and deleted text held inside a .docx, then remove them.',
  },
  'file-to-html': {
    version: '0.1.0-canary',
    shortDescription:
      'Turn images into email-ready HTML with the images packaged alongside it, or into one standalone web page.',
  },
  'svg-optimizer': {
    version: '0.1.0-canary',
    shortDescription:
      'Strip editor leftovers and excess precision from an SVG, then export it as a PNG or WebP at up to 4x.',
  },
  'color-converter': {
    version: '0.1.0-canary',
    shortDescription:
      'Convert a colour between HEX, RGB, HSL and CMYK, and pull the dominant palette out of an image.',
  },
  'list-hygiene': {
    version: '0.1.0-canary',
    shortDescription:
      'De-duplicate, merge, split and compare contact lists, and tidy names, emails and phone numbers.',
  },
  'photo-metadata': {
    version: '0.1.0-canary',
    shortDescription:
      'See the camera, date and GPS location hidden in a photo, then remove them.',
  },
  'image-optimize': {
    version: '0.1.0-canary',
    shortDescription: 'Resize, compress, and convert a static image locally.',
  },
  'image-to-text': {
    version: '0.1.0-canary',
    shortDescription:
      'Read selectable English text from screenshots, photos and scanned images.',
  },
  'image-exact-size': {
    version: '0.1.0-canary',
    shortDescription:
      'Fit an image under a KB limit at exact pixels with a real DPI value.',
  },
  'image-editor': {
    version: '0.1.0-canary',
    shortDescription: 'Crop, rotate, flip, and adjust a static image locally.',
  },
  'base64-encode': {
    version: '0.1.0-canary',
    shortDescription: 'Encode Unicode text as standard Base64 in this tab.',
  },
  'base64-decode': {
    version: '0.1.0-canary',
    shortDescription: 'Decode standard Base64 into validated UTF-8 text.',
  },
  'uuid-generator': {
    version: '0.1.0-canary',
    shortDescription: 'Generate cryptographically random UUID v4 values.',
  },
  'unix-timestamp': {
    version: '0.1.0-canary',
    shortDescription: 'Convert Unix seconds, milliseconds, and ISO dates.',
  },
  'file-hash': {
    version: '0.1.0-canary',
    shortDescription: 'Calculate SHA-256, SHA-384, or SHA-512 locally.',
  },
  'archive-toolkit': {
    version: '0.1.0-canary',
    shortDescription:
      'Open a ZIP, see what is inside, take files out, and pack new archives.',
  },
  'file-workbench': {
    version: '0.1.0-canary',
    shortDescription:
      'Inspect, hash, split, join, rename, encode, and download local files.',
  },
  'developer-data-workbench': {
    version: '0.1.0-canary',
    shortDescription:
      'Encode, decode, inspect, convert, test, and hash developer data.',
  },
  'developer-advanced-workbench': {
    version: '0.1.0-canary',
    shortDescription:
      'Inspect JSON, generate secure tokens, calculate networks, and build configs.',
  },
  'percentage-calculator': {
    version: '0.1.0-canary',
    shortDescription: 'Calculate percentages, ratios, and percentage change.',
  },
  'math-workbench': {
    version: '0.1.0-canary',
    shortDescription:
      'Arithmetic, statistics, number theory, geometry, and unit conversion.',
  },
  'date-difference': {
    version: '0.1.0-canary',
    shortDescription: 'Count exact calendar days between two dates.',
  },
  'age-calculator': {
    version: '0.1.0-canary',
    shortDescription: 'Calculate calendar age and total elapsed days.',
  },
  'date-workbench': {
    version: '0.1.0-canary',
    shortDescription:
      'Calculate dates, workdays, time zones, hours, and timesheets.',
  },
  'web-workbench': {
    version: '0.1.0-canary',
    shortDescription:
      'Generate and inspect metadata, URLs, CSS, HTML, and SEO assets.',
  },
  'productivity-workbench': {
    version: '0.1.0-canary',
    shortDescription:
      'Prioritize, schedule, compare, pick, group, and plan locally.',
  },
  'finance-business-workbench': {
    version: '0.1.0-canary',
    shortDescription:
      'Transparent borrowing, savings, pricing, budget, and operating scenarios.',
  },
  'science-education-workbench': {
    version: '0.1.0-canary',
    shortDescription:
      'Transparent formula calculators, study materials, logic, and sets.',
  },
  'document-workbench': {
    version: '0.1.0-canary',
    shortDescription:
      'Draft, calculate, inspect, compare, merge, and download documents.',
  },
  'subtitle-workbench': {
    version: '0.1.0-canary',
    shortDescription:
      'Convert, resync, join, trim and check SRT, WebVTT, SBV and LRC subtitles.',
  },
  'creator-workbench': {
    version: '0.1.0-canary',
    shortDescription:
      'Format, plan, measure, and package creator content locally.',
  },
  'life-admin-workbench': {
    version: '0.1.0-canary',
    shortDescription:
      'Mask identifiers, check formats, estimate household costs, and plan dates.',
  },
  'qr-barcode-workbench': {
    version: '0.1.0-canary',
    shortDescription:
      'Create QR payloads, printable sheets, and common linear barcodes locally.',
  },
};

/** Throws on an unknown id, the same way the `.find(...)!` it replaces would. */
export function toolMeta(id: string): ToolMeta {
  const meta = TOOL_META[id];
  if (!meta) throw new Error(`No tool metadata for '${id}'`);
  return meta;
}
