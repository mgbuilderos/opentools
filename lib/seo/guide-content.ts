import {
  contentSecurityPolicy,
  loadsLocalModel,
} from '../security/content-security-policy';
import type { ToolCatalogEntry } from './tool-catalog-data';
import { getLiveToolBySlug, LIVE_TOOL_CATALOG } from './live-tools';
import {
  type CategoryPillarInfo,
  type RelatedToolLink,
  getCategoryPillar,
  getRelatedToolLinks,
} from './internal-linking-graph';

export interface GuideStep {
  name: string;
  text: string;
}

export interface GuideFaq {
  question: string;
  answer: string;
}

export interface GuideComparisonRow {
  aspect: string;
  localTools: string;
  traditionalCloud: string;
}

export interface ToolGuideData {
  tool: ToolCatalogEntry;
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  heading: string;
  directAnswer: string;
  leadParagraph: string;
  technicalArchitecture: string;
  /** The Content-Security-Policy this tool's own route is served with. */
  cspHeader: string;
  diagramSvg: string;
  steps: readonly GuideStep[];
  comparison: readonly GuideComparisonRow[];
  faqs: readonly GuideFaq[];
  relatedTools: readonly RelatedToolLink[];
  categoryPillar?: CategoryPillarInfo;
  jsonLd: Record<string, unknown>;
}

function getSemanticEntities(tool: ToolCatalogEntry) {
  const entities: Array<{ '@type': string; name: string }> = [
    { '@type': 'Thing', name: `${tool.category} processing` },
    { '@type': 'Thing', name: 'Client-side computing' },
    { '@type': 'Thing', name: 'Zero-egress architecture' },
  ];
  if (tool.category === 'PDF') {
    entities.push({
      '@type': 'Standard',
      name: 'ISO 32000-1 (Document Management - PDF)',
    });
  } else if (tool.category === 'Archive and File') {
    entities.push({
      '@type': 'Standard',
      name: 'POSIX tar / ZIP Archive Specification (ISO/IEC 21320-1)',
    });
  } else if (tool.category === 'Audio') {
    entities.push({
      '@type': 'Standard',
      name: 'W3C Web Audio API Recommendation',
    });
  } else if (tool.executionMode === 'local-wasm') {
    entities.push({
      '@type': 'Standard',
      name: 'W3C WebAssembly Core Specification',
    });
  }
  return entities;
}

export function generateArchitectureDiagramSvg(
  toolName: string,
  executionMode: string,
  connectSrc = "connect-src 'none'",
): string {
  const runtime =
    executionMode === 'local-wasm'
      ? 'WebAssembly (WASM)'
      : 'JavaScript (V8/JSC)';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 260" width="100%" height="100%" fill="none" class="rounded-xl border bg-card">
  <!-- Grid background accents -->
  <defs>
    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" stroke-opacity="0.04" stroke-width="1" />
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#grid)" />

  <!-- Top track: Traditional Cloud Tools (Risky) -->
  <g transform="translate(20, 25)">
    <text x="0" y="14" fill="currentColor" fill-opacity="0.5" font-family="monospace" font-size="11" font-weight="600">TRADITIONAL CLOUD CONVERTERS (SERVER-SIDE)</text>
    
    <rect x="0" y="26" width="160" height="60" rx="8" stroke="currentColor" stroke-opacity="0.2" fill="currentColor" fill-opacity="0.02" />
    <text x="14" y="52" fill="currentColor" font-family="system-ui, sans-serif" font-size="12" font-weight="600">Your Device</text>
    <text x="14" y="70" fill="currentColor" fill-opacity="0.5" font-family="monospace" font-size="10">Raw Document</text>

    <!-- Arrow -->
    <path d="M 165 56 L 225 56" stroke="currentColor" stroke-opacity="0.3" stroke-width="1.5" stroke-dasharray="4 3" />
    <text x="175" y="48" fill="currentColor" fill-opacity="0.5" font-family="monospace" font-size="9">Internet Upload</text>

    <rect x="230" y="26" width="180" height="60" rx="8" stroke="currentColor" stroke-opacity="0.3" fill="currentColor" fill-opacity="0.04" />
    <text x="244" y="52" fill="currentColor" font-family="system-ui, sans-serif" font-size="12" font-weight="600">Cloud Server Disk</text>
    <text x="244" y="70" fill="currentColor" fill-opacity="0.5" font-family="monospace" font-size="10">Stored &amp; Queued</text>

    <!-- Arrow -->
    <path d="M 415 56 L 475 56" stroke="currentColor" stroke-opacity="0.3" stroke-width="1.5" stroke-dasharray="4 3" />
    <text x="425" y="48" fill="currentColor" fill-opacity="0.5" font-family="monospace" font-size="9">Cloud Download</text>

    <rect x="480" y="26" width="230" height="60" rx="8" stroke="currentColor" stroke-opacity="0.2" fill="currentColor" fill-opacity="0.02" />
    <text x="494" y="52" fill="currentColor" font-family="system-ui, sans-serif" font-size="12" font-weight="600">Download Output</text>
    <text x="494" y="70" fill="currentColor" fill-opacity="0.5" font-family="monospace" font-size="10">Provider keeps a copy</text>
  </g>

  <!-- Divider -->
  <line x1="20" y1="135" x2="740" y2="135" stroke="currentColor" stroke-opacity="0.1" stroke-dasharray="2 2" />

  <!-- Bottom track: OpenTools Zero-Egress In-Browser Architecture -->
  <g transform="translate(20, 150)">
    <text x="0" y="14" fill="currentColor" font-family="monospace" font-size="11" font-weight="700">OPENTOOLS: THE WORK HAPPENS IN THE PAGE</text>

    <rect x="0" y="26" width="220" height="64" rx="8" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.03" />
    <text x="14" y="50" fill="currentColor" font-family="system-ui, sans-serif" font-size="13" font-weight="700">Your Browser Tab</text>
    <text x="14" y="70" fill="currentColor" fill-opacity="0.6" font-family="monospace" font-size="10">File read into the page</text>

    <!-- Arrow -->
    <path d="M 225 58 L 275 58" stroke="currentColor" stroke-width="2" />
    <polygon points="275,54 285,58 275,62" fill="currentColor" />
    <text x="232" y="48" fill="currentColor" fill-opacity="0.7" font-family="monospace" font-size="9">No upload</text>

    <rect x="288" y="26" width="240" height="64" rx="8" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.05" />
    <text x="302" y="50" fill="currentColor" font-family="system-ui, sans-serif" font-size="13" font-weight="700">${runtime}</text>
    <text x="302" y="70" fill="currentColor" fill-opacity="0.6" font-family="monospace" font-size="10">${connectSrc}</text>

    <!-- Arrow -->
    <path d="M 533 58 L 578 58" stroke="currentColor" stroke-width="2" />
    <polygon points="578,54 588,58 578,62" fill="currentColor" />
    <text x="540" y="48" fill="currentColor" fill-opacity="0.7" font-family="monospace" font-size="9">Save</text>

    <rect x="592" y="26" width="128" height="64" rx="8" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.03" />
    <text x="606" y="50" fill="currentColor" font-family="system-ui, sans-serif" font-size="13" font-weight="700">Local Disk</text>
    <text x="606" y="70" fill="currentColor" fill-opacity="0.6" font-family="monospace" font-size="10">Your own disk</text>
  </g>
</svg>`;
}

/**
 * Tool-specific wording for guides whose generic text would leave out what the
 * tool actually does or where it stops. Every sentence here is backed by the
 * tool's own code and tests.
 */
export interface GuideDetail {
  directAnswer: string;
  leadParagraph: string;
  faqs: readonly GuideFaq[];
}

const GUIDE_DETAILS: Readonly<Record<string, GuideDetail>> = {
  // lib/tools/structured.ts (parseCsvRows, csvToRecords, csvToJson),
  // lib/tools/structured.test.ts, components/structured-tools.tsx
  // (CsvToJsonTool, EditorPair) and app/data/csv-to-json/page.tsx
  'spreadsheet-and-data-csv-to-json': {
    directAnswer:
      'Paste a CSV into the box, or choose a .csv file of up to 20 MB, then press Convert to JSON. The first row becomes the keys, every later row becomes one object, and the result is a JSON array printed with two-space indentation that you can copy or download as converted.json. Every value arrives as a JSON string, because nothing here is read as a number, a date or a boolean.',
    leadParagraph:
      'This turns a comma-separated file into an array of JSON objects, one object per row, keyed by the header names in the first row. Values are carried through as text from parse to output — the page says so in its own footer, "Values remain strings by design" — so a postcode with a leading zero and a sixteen-digit account number come out with every character they went in with. The parser is strict rather than forgiving: every column needs a non-empty header, headers must be unique, and each row must carry exactly as many fields as there are headers, or the run stops and names the row. Fields are separated by commas only, so a semicolon-separated export reads as a single column and there is no setting to change the separator. The file picker accepts .csv up to 20 MB; the paste box has no character limit of its own, so a very large paste is bounded only by what the tab can hold.',
    faqs: [
      {
        question: 'Does it convert numbers, dates and true or false values?',
        answer:
          'No, and that is the point. Every cell becomes a JSON string, so 007 stays 007, a long account or order number keeps all of its digits, and a value such as 1-2 is not turned into a date. Type coercion is where a CSV quietly loses information, because a value that is too long to be held exactly as a number comes back changed; the JSON tools in the same file refuse an integer outside the exact range rather than round it, which is the same hazard seen from the other side. Cast the values yourself afterwards, column by column, where you can see what you are deciding.',
      },
      {
        question:
          'How does it handle quotes, commas and line breaks inside a field?',
        answer:
          'It follows the usual CSV quoting rules. A field that begins with a double quote is read as quoted and may hold commas and line breaks, and two double quotes inside it mean one literal double quote. A double quote that appears after other characters in the same field is kept as an ordinary character rather than opening a quoted section. An opening quote that is never closed stops the run with "CSV contains an unclosed quoted field." A test in this repository parses a file with a quoted comma, a doubled quote and a line break inside a field, and requires all three back intact.',
      },
      {
        question: 'Why was my file refused?',
        answer:
          'Three named checks reject a file. An empty cell anywhere in the first row gives "Every CSV column needs a header in the first row.", which usually means the export began with a title line or a blank column. Two identical headers give "CSV headers must be unique before conversion.", because a duplicate key would silently overwrite a column. A row with the wrong number of fields gives its row number and both counts, for example "Row 2 has 1 columns; expected 2." Nothing is padded or discarded to make a ragged file fit.',
      },
      {
        question: 'What happens to blank lines and to a byte-order mark?',
        answer:
          'A byte-order mark at the very start of the file is removed before parsing, and blank lines at the end of the file are dropped. A blank line in the middle is not: in a file with more than one column it counts as a row holding one empty field, and it is refused with the row number like any other short row. Delete the stray line and run it again.',
      },
      {
        question: 'What are the limits, and what does the download contain?',
        answer:
          'The file picker accepts .csv or text/csv and stops at 20 MB with "This candidate limits CSV files to 20 MB." The download button writes the JSON you see to a file named converted.json as UTF-8 JSON, and the result panel reports how many rows and columns were converted. The file is written from the page to your own disk; nothing is posted anywhere.',
      },
    ],
  },

  // components/audio-convert-tool.tsx, lib/tools/audio/decode.ts,
  // lib/tools/audio/wav.ts (decodeWav, encodeWav, wavByteLength),
  // lib/tools/audio/pcm.ts, lib/tools/audio/probe.ts and
  // app/audio/convert/page.tsx
  'audio-audio-to-wav': {
    directAnswer:
      'Choose an audio file of up to 100 MB, pick a bit depth, and convert. The samples are decoded inside the page at the rate the file\x27s own header declares and written straight back out as a WAV, so nothing is resampled unless you ask for it. Output is WAV only: there is no MP3 encoder on this page.',
    leadParagraph:
      'This converts audio to uncompressed WAV using the decoders your browser already carries, then writes the file byte by byte with this project\x27s own WAV writer. The trap it exists to avoid is silent resampling: the browser\x27s decodeAudioData resamples whatever it decodes to the rate of the audio context it was called on and says nothing about having done so, so the rate is read out of the file header first and the context is built at that rate. Where that cannot be honoured — Opus is always 48 kHz, some containers do not state a rate, and a rate outside 8,000 to 96,000 Hz is outside what a context can be built at — the page shows the original rate rather than leaving it unsaid. You can write 16-bit, 24-bit or 32-bit float, keep or change the sample rate, keep or mix the channels, trim, fade and normalise the peak. One file is limited to 100 MB and an output projected over 500 MB is refused before it is built, with a message naming the size.',
    faqs: [
      {
        question: 'Which files can it open?',
        answer:
          'The picker accepts any audio type your browser offers plus .mp3, .m4a, .aac, .flac, .ogg, .opus, .oga, .wav, .aiff, .aif, .caf and .webm, and the decoding is done by your browser, so the real answer is whatever your browser can play. WAV and AIFF are the exception: this project reads those itself rather than handing them over, because a Chromium browser turns AIFF down where WebKit accepts it, and reading them directly also removes the resampling question entirely. When neither reader can make sense of a file you get "This browser could not decode that audio file." rather than a broken WAV.',
      },
      {
        question: 'What bit depth and sample rate does the WAV come out at?',
        answer:
          'Bit depth is yours to choose: 16-bit, 24-bit, or 32-bit float. The 32-bit option writes IEEE floating-point samples with the extra format field and the fact chunk that makes such a file open widely, not 32-bit integers. Sample rate defaults to "Keep each source rate", so the file keeps the rate it arrived with; choosing 48,000, 44,100, 22,050 or 8,000 Hz renders the audio through the browser\x27s own resampler at that rate instead. Channel count is kept unless you ask for a mono mixdown or for only the left or the right channel.',
      },
      {
        question: 'Does a 32-bit WAV decode correctly here?',
        answer:
          'Yes. This page\x27s WAV reader has a branch for every width it admits — 8-bit unsigned, 16-bit, 24-bit and 32-bit signed integers, and 32-bit or 64-bit floating point — and refuses any other width by name instead of reading it as something it is not. That matters because a reader with a missing branch produces silence rather than an error, and silence is the failure you only notice after you have saved the file. Play the result in the page before you save it either way.',
      },
      {
        question: 'Why is my WAV so much larger than the file I started with?',
        answer:
          'Because WAV stores every sample uncompressed. A minute of 44,100 Hz 16-bit stereo is a little over ten megabytes whatever it was compressed to before, and 24-bit or 32-bit output is half again or twice that. The page projects the size before encoding and refuses anything over 500 MB with a message telling you to trim it or choose a lower bit depth or sample rate. Going the other way is not offered: there is no MP3 encoder here, because shipping one means shipping a licensed encoder and re-encoding would throw away quality the original still has.',
      },
      {
        question: 'What do the trim, fade and normalise boxes do?',
        answer:
          'Start and end are in seconds and are clamped into the file, so asking for the first minute of a forty-second recording gives you the forty seconds; an end at or before the start is refused. Fades are linear in amplitude and are shortened to fit when they are longer than the audio. Normalise matches the loudest peak in the recording to the ceiling you type in decibels below full scale — both 3 and -3 mean three decibels down — which is not the same as making two recordings sound equally loud, a measurement this page does not make. Selecting several files at once applies one set of settings to all of them, and any file over 100 MB is skipped and reported rather than stopping the batch.',
      },
    ],
  },

  // lib/tools/pdf/pdf-to-word.ts, lib/tools/pdf/pdf-text.ts,
  // lib/tools/docx/document.ts, lib/tools/pdf/pdf-to-word.test.ts and
  // components/pdf-to-word-tool.tsx
  'pdf-pdf-to-word': {
    directAnswer:
      'Choose a PDF of up to 150 MB and convert it. The text layer is read in the page, regrouped into lines and paragraphs by the coordinates of the characters, and written to a .docx named after your PDF. This recovers the words, not the page: it is a text extraction, and the page says so above the button.',
    leadParagraph:
      'A PDF stores glyphs at coordinates, not paragraphs, so reading order, line grouping and paragraph boundaries all have to be reconstructed from geometry — and that reconstruction is what you get. Reading order, paragraphs, page breaks and headings set in larger type do come across. Layout, columns, tables as tables, images and fonts do not, and calling the result a conversion rather than an extraction would be overstating it. A PDF with no text at all — a scan, or a photograph of paper — is refused by name rather than handed back as an empty document, with a button that passes the same file to the character-recognition tool on this site. A file over 150 MB is refused, and in a multi-file run it is skipped with "The 150 MB limit was exceeded."',
    faqs: [
      {
        question: 'What happens to a scanned PDF?',
        answer:
          'It is refused, deliberately. The conversion counts the visible characters in the text layer first, and when that total is zero the run stops with a message saying every page is an image, which is what a scan or a phone photograph produces, and that there is nothing to copy into a Word file. The refusal carries a machine-readable reason, which is what lets the page offer you a button to open the same file in the character-recognition tool instead. A file that is not a PDF at all is refused separately, as unreadable.',
      },
      {
        question: 'What is kept, and what is lost?',
        answer:
          'Kept: the words, the order they are read in, paragraph breaks, a real page break between every page, bold where the font name says bold, and headings. Lost: columns, tables as real tables, images, page furniture, colours, margins and the original fonts. A table will come through as its text in reading order, which is usually not the shape you want — the PDF to Excel tool on this site is the one that reconstructs a table as a grid.',
      },
      {
        question: 'How does it decide what a heading is?',
        answer:
          'By size, against the whole document. The median character size across every page is taken as the body size, and any line set at least 1.18 times that is treated as a heading: it is written bold and at its own measured size. A document whose body text is already large and whose headings are only slightly larger will therefore have none detected, and a document with a lot of large display text will have several. Headings are written as direct formatting rather than as named Word styles, because the file carries no styles part, so they will not appear in a navigation pane.',
      },
      {
        question: 'Why is my two-column page mixed up?',
        answer:
          'Because lines are grouped by their baseline. Two characters at the same height on a two-column page are treated as belonging to the same line whichever column they sit in, so a two-column layout reads across the page rather than down each column. There is no column detection in this tool. If the source is in columns, expect to reorder the paragraphs after the conversion, or to split the pages first.',
      },
      {
        question: 'What does the Word file itself look like?',
        answer:
          'A minimal three-part .docx: paragraphs, runs carrying bold and a size, and page breaks. The page size written into it is fixed at A4, 11906 by 16838 twips, whatever size the PDF pages were, so a Letter-size original will reflow when you open it. Control characters that XML forbids are dropped during the write, because leaving one in makes the whole document refuse to open, which is a worse loss than one glyph. The result panel reports the page count, the paragraph count, the character count and how many pages carried no text, so a part-scanned document is not silently half-converted.',
      },
    ],
  },

  // components/pdf-to-excel-tool.tsx, lib/tools/pdf/tables.ts,
  // lib/tools/pdf/rulings.ts, lib/tools/pdf/lattice.ts,
  // lib/tools/pdf/cell-flags.ts, lib/tools/pdf/statement-values.ts,
  // components/pdf-grid-overlay.tsx and lib/tools/spreadsheet/xlsx-writer.ts
  'pdf-pdf-to-excel': {
    directAnswer:
      'Choose a statement or table PDF of up to 100 MB. The page finds the columns, rebuilds the rows, and shows you the table over an image of the page with the column dividers drawn on it so you can drag any that landed in the wrong place; then you label each column and export .xlsx or .csv. It extracts the one table it finds, not the whole document.',
    leadParagraph:
      'This is built for the kind of PDF that holds a grid of transactions — a bank or card statement, a ledger, a priced list — and it reconstructs that grid rather than dumping the text. Where the PDF draws its own table borders, the column positions are read from those lines and the panel says "Read from the drawn lines"; where it does not, they are worked out from the spacing and the panel says so, because an estimate presented as a fact is how a plausible, wrong table gets trusted. Descriptions that wrap onto a second line are merged back into their row, repeated headers on later pages are dropped, and footers such as "Page 1 of 5" or "continued on next page" are stripped. A PDF with no readable text is refused outright rather than guessed at with character recognition, which misreads digits and can corrupt a ledger without saying it has. Nothing outside the table — logos, addresses, covering text, images — is exported.',
    faqs: [
      {
        question: 'What happens with a scanned statement?',
        answer:
          'It is refused, with a panel headed "Scanned / Image-Only PDF Refused" naming your file and explaining why. Reading a scan means character recognition, and in a financial table that turns an 8 into a 3 or drops a decimal point without telling you, so the tool declines to produce numbers it cannot stand behind. The panel points you at the three things that do work: download the digital PDF from your banking portal, use the portal\x27s own export, or scan with your scanner\x27s searchable-PDF setting so real text is embedded before you come back. A PDF that does have text but no table in it stops separately, with "No tabular statement data could be extracted" and your file\x27s name, rather than handing you an empty spreadsheet.',
      },
      {
        question: 'How do I fix a column that landed in the wrong place?',
        answer:
          'Drag the divider. The page is drawn with each column boundary on top of it as a real button, so you can drag one with the mouse or focus it and move it with the arrow keys, and you can add or remove a divider as well. A divider running through the middle of a description is visible at a glance, which is the whole reason the page is shown rather than only the table. You can also edit any cell, delete a row and add a row before exporting; changing anything clears the prepared download so you cannot save a stale file.',
      },
      {
        question: 'Do the amounts and dates come out as real numbers?',
        answer:
          'In the .xlsx, yes, when they can be read: you label each column as Date, Description, Debit, Credit, Amount, Running Balance or Ignore, and a labelled date becomes a real date and a labelled money column becomes a real number. The number convention is detected per column, so a European 1.234,56 and an Indian 1,23,456.78 are both read correctly. Anything that cannot be read is written as the original text rather than as a wrong number. The .csv is more conservative: dates are written in ISO form and every other value is written exactly as it appeared, because a CSV has no way to say what a cell is meant to be. Columns you set to Ignore are left out of both files, both downloads take your PDF\x27s name with a .xlsx or .csv ending, and the sheet inside the workbook is named after the file with the .pdf removed and cut to thirty characters.',
      },
      {
        question: 'How do I know which cells to check?',
        answer:
          'The page names them instead of scoring them. There is no accuracy percentage anywhere, because the tool cannot measure your document. What it does is flag each cell with something checkable wrong with it: two separate figures sitting in one cell, a money column holding something that is not a number, a date column holding something that is not a date, a missing date, or a running balance that does not continue from the row before. Up to twelve are spelled out with their reasons and the rest stay outlined in the table. Most of them share one cause, a column boundary in the wrong place, which is the thing the dividers fix.',
      },
      {
        question:
          'Why is it asking me whether my dates are day or month first?',
        answer:
          'Because your date column is genuinely ambiguous — every value in it works read either way, so 03/04 could be the third of April or the fourth of March. Guessing is how a year of transactions ends up silently shifted, so the page asks and uses your answer for both exports. When the column settles the question by itself, for example because some day is above twelve, no question is asked and the format it settled on is shown to you.',
      },
    ],
  },

  // lib/tools/pdf/bates.ts, lib/tools/pdf/bates.test.ts,
  // lib/tools/pdf/signature-placement.ts and components/pdf-bates-tool.tsx
  'pdf-pdf-bates-numbering': {
    directAnswer:
      'Add the PDFs of a bundle, put them in the order you want with the up and down arrows, set a prefix, a starting number and a padding width, and stamp. Every page of every file is numbered, and the count carries on from one file into the next, so a two-page exhibit followed by a three-page exhibit runs 000001 to 000005 across both. Your originals are never touched: each file is stamped in the page and offered as a new download.',
    leadParagraph:
      'Bates numbering is the practice of putting one unbroken sequence across a whole production so any page can be cited by number, and that is what this does: prefix, a zero-padded number, optional suffix, on every page, continuing across the files in the list. The stamp is drawn into the page content in Helvetica at the size and margin you choose, and it is placed by the page as a reader shows it, so it sits upright and in the right corner on pages that carry a rotation of 90, 180 or 270 degrees and on pages with a crop box that does not start at the origin. There is no page-range box: the range is the whole bundle, and leaving pages out means leaving files out or splitting them first. Up to 100 MB of PDFs in total, checked as you add them, and an encrypted file is named and refused rather than half-read.',
    faqs: [
      {
        question: 'What does the number look like, and can I change it?',
        answer:
          'It is a prefix, then the number padded with leading zeros, then an optional suffix — EXHIBIT-000001 by default. The prefix and suffix are free text, the starting number is yours from zero upwards, and the padding is 4, 5, 6, 7 or 8 digits or none at all, so PLTF-0005-CONF and DOC-7 are both available. A number longer than the padding is not cut: with six-digit padding, page one million stamps as 1000000. The page shows you the range the current settings would produce before you run it.',
      },
      {
        question: 'Does the numbering continue across several files?',
        answer:
          'Yes, and that is the reason to use it on a bundle rather than a file at a time. The files are stamped top to bottom in the list, and the count carries straight on, so three exhibits of two, three and one pages run 000001 to 000002, then 000003 to 000005, then 000006. Each file comes back separately with -bates added to its name, and when there is more than one file you also get the whole bundle merged into a single exhibit-bundle-bates.pdf carrying the same numbers. Your originals are not written to: every file is read into the page, stamped on a copy held in memory, and offered to you as a new download.',
      },
      {
        question: 'Where does the stamp go on the page?',
        answer:
          'Any of six positions — top left, top centre, top right, bottom left, bottom centre, bottom right — with bottom right as the default. The margin is 18, 24, 36, 48 or 72 points from the edge and the type is Helvetica in black at 8, 9, 10, 11, 12 or 14 point. There is no white box behind it, so the number is drawn over whatever is already in that corner; if a stamp lands on existing content, move it to another corner or increase the margin and run it again. It is ordinary page content rather than an annotation, so it cannot be switched off in a reader afterwards.',
      },
      {
        question: 'Will the page numbers in my reader match the stamps?',
        answer:
          'Yes, unless you switch it off. By default the tool also writes page labels into the document, which is the part of the file a reader uses for its own page-number box, so a page stamped EXHIBIT-000042 is shown as EXHIBIT-000042 rather than as page 42 of 60. The merged bundle gets the same labels across all its pages. Turning the option off leaves the visible stamp in place and the reader back on ordinary counting.',
      },
      {
        question: 'What will it refuse?',
        answer:
          'A password-protected or encrypted PDF, named as such — remove the password locally and try again. A file that will not parse, reported as a failure to parse that file by name. A PDF with no pages in it. And a prefix or suffix holding a character the standard PDF fonts cannot write: the tool names the offending character back to you, which is what happens to a rupee sign or an emoji, and asks for ordinary letters, numbers or punctuation instead.',
      },
    ],
  },
  // lib/tools/ocr/{assets,runtime,layout}.ts and their tests
  'image-image-to-text': {
    directAnswer:
      'Open the image-to-text tool, choose a picture containing printed text, and run it. Recognition happens in your browser with Tesseract, so the picture is never sent anywhere; the first run downloads the engine and the English model, and later runs reuse the cached copies.',
    leadParagraph:
      'This reads printed text out of a photograph or screenshot and gives you characters you can copy. It ships English only, and the model recognises printed type rather than handwriting. The first run downloads 9,819,346 bytes (9.36 MiB) — the worker, the English traineddata and the WebAssembly core — which your browser then caches, so it is a one-off rather than a per-image cost. Accuracy depends on the picture: straight, well-lit, reasonably large text reads well, and a skewed phone photograph of a curved page does not.',
    faqs: [
      {
        question: 'Is my image uploaded when I convert it to text?',
        answer:
          'No. Recognition runs in your own browser using a Tesseract worker loaded from this site, and the picture is read into the page rather than posted anywhere. The worker is created from a same-origin script rather than a blob URL specifically so it inherits this site\x27s narrow asset policy instead of a broader one.',
      },
      {
        question: 'How much does the first run download?',
        answer:
          'Up to 9,819,346 bytes, about 9.36 MiB: a 111,307-byte worker, a 2,952,873-byte English model, and a WebAssembly core of roughly 6.7 MiB. Your browser caches all three, so subsequent images cost nothing extra to download. The exact core size varies slightly with the SIMD support your browser reports.',
      },
      {
        question: 'Which languages does it recognise?',
        answer:
          'English only. The engine is created with the single language code eng, and no other traineddata file is served, so text in other scripts will either be misread as English or produce nothing useful.',
      },
      {
        question:
          'Why is some of the recognised text marked as low confidence?',
        answer:
          'Every word carries a confidence score from the engine, and anything below 75 is flagged so you can check it rather than trust it silently. Low scores cluster around small text, low contrast, unusual fonts and compression artefacts.',
      },
      {
        question: 'Can it read handwriting or a photograph of a curved page?',
        answer:
          'Not reliably. The model is trained on printed type, and lines are grouped by comparing each word\x27s vertical centre against the median word height — an assumption that holds for flat, straight text and breaks down on curved, skewed or heavily rotated pages.',
      },
    ],
  },
  // lib/tools/web-workbench.ts (open-graph-generator operation, the
  // open-graph-generator branch of runWebOperation, and the absoluteUrl /
  // required / html helpers) and lib/tools/web-workbench.test.ts.
  'web-and-seo-open-graph-generator': {
    directAnswer:
      'Type a title, a description, the page URL and the image URL, then generate. The tool writes five Open Graph meta tags — og:title, og:description, og:url, og:image and og:type — with every value HTML-escaped, and you paste the block into the head of your page.',
    leadParagraph:
      'Open Graph tags are what a chat app or social network reads to build the preview card for a link. This tool composes that markup from the four values you type; it never loads your page, so it reports nothing about what a crawler would find there. og:type is fixed to website, so article, profile and video types are not offered here. The page URL and the image URL must both be complete HTTP or HTTPS addresses — a bare domain with no scheme is refused.',
    faqs: [
      {
        question: 'Which Open Graph tags does it write?',
        answer:
          'Exactly five: og:title, og:description, og:url, og:image and og:type. og:type is hard-coded to website. It does not write og:site_name, og:locale, og:image:alt, og:image:width or og:image:height, and it has no article or video variants — add those by hand if you need them.',
      },
      {
        question: 'Does it check that my image exists or is the right size?',
        answer:
          'No. The only check is that the image address parses as an absolute HTTP or HTTPS URL. Nothing is fetched, so the file size, dimensions, aspect ratio and content type are never examined. Open the image in a browser yourself before you rely on the preview.',
      },
      {
        question: 'Why is my URL rejected?',
        answer:
          'The page URL and image URL are parsed with the browser URL parser and must be absolute. A bare host with no scheme fails with "Page URL must be an absolute HTTP(S) URL", and any scheme other than http or https fails with "must use HTTP or HTTPS".',
      },
      {
        question:
          'Are quotation marks and angle brackets in my title handled safely?',
        answer:
          'Yes. Five characters are replaced with their HTML entity before the value is placed in a content attribute: the ampersand, the less-than and greater-than signs, the double quote and the apostrophe. A title containing angle brackets and an ampersand therefore comes out fully escaped and cannot break out of the tag it sits in.',
      },
      {
        question: 'Does it limit how long my title or description can be?',
        answer:
          'No. Both fields only have to be non-empty; nothing is counted or truncated. Each network applies its own cut-off when it renders the card, so check the preview in the place you actually share. The SERP Snippet Preview in the same workbench does count characters, but for search results rather than social cards.',
      },
    ],
  },

  // lib/tools/web-workbench.ts (twitter-card-generator operation, its branch of
  // runWebOperation, the select helper that sets the default card type, and the
  // absoluteUrl / html helpers) and lib/tools/web-workbench.test.ts.
  'web-and-seo-twitter-card-generator': {
    directAnswer:
      'Pick the card type, type a title, a description and an image URL, then generate. The tool writes four meta tags — twitter:card, twitter:title, twitter:description and twitter:image — with every value HTML-escaped, ready to paste into the head of your page.',
    leadParagraph:
      'This composes card markup from the values you type and nothing else: your page is never loaded and the image is never fetched. The card type is a choice of two, summary_large_image (the default) or summary, and whichever you pick is written verbatim into twitter:card. The image address must be a complete HTTP or HTTPS URL; a relative path or a bare domain is refused. How each card type is finally drawn is decided by the network that renders it, not by this tool.',
    faqs: [
      {
        question: 'Which tags does it write?',
        answer:
          'Four: twitter:card, twitter:title, twitter:description and twitter:image. It does not write twitter:site, twitter:creator or twitter:image:alt — add those by hand if your account or accessibility review needs them.',
      },
      {
        question: 'What are the two card types it offers?',
        answer:
          'summary_large_image, labelled "Large image", and summary. The value you pick is written into the twitter:card tag exactly as chosen. The tool makes no layout decision of its own; the rendering difference belongs to the network reading the tag.',
      },
      {
        question: 'Does it validate my image?',
        answer:
          'Only as an address. It must parse as an absolute HTTP or HTTPS URL, and that is the whole check. No request is made, so dimensions, file size, format and whether the file exists at all are never verified.',
      },
      {
        question: 'Is my text escaped before it goes into the tag?',
        answer:
          'Yes. Ampersand, less-than, greater-than, double quote and apostrophe are each replaced with their HTML entity, so a title containing quotation marks or angle brackets cannot break the attribute it sits in.',
      },
      {
        question: 'Should I also add Open Graph tags?',
        answer:
          'This tool writes only the twitter: tags. The Open Graph generator in the same workbench writes og:title, og:description, og:url, og:image and og:type; run both and paste both blocks if you want each set present explicitly rather than relying on one network falling back to the other.',
      },
    ],
  },

  // lib/tools/qr-barcode-workbench.ts (qr-code-generator operation, qrStyle,
  // renderQr, buildQrPayload), lib/tools/qr-barcode-workbench.test.ts,
  // components/schema-workbench-tool.tsx (download and preview), and the
  // qrcode dependency pinned at 1.5.4 in package.json.
  'qr-and-barcode-qr-code-generator': {
    directAnswer:
      'Paste the content you want encoded, choose an error-correction level and a width, then generate. The symbol is drawn in the page as SVG with a four-module quiet zone and saves to your disk as qr-code-generator.svg.',
    leadParagraph:
      'Encoding is done by the qrcode library pinned at version 1.5.4 in this project, called with the level and pixel width you pick. The content box accepts 1 to 8,000 characters, but the QR format itself holds far less than that, so long content is refused rather than silently truncated. Output is SVG only — 160 to 1,200 pixels wide, 360 by default — which scales cleanly to any print size. Nothing is shortened, redirected or counted: whatever you type is exactly what a scan returns.',
    faqs: [
      {
        question: 'Which error-correction level should I choose?',
        answer:
          'Four are offered: L, M (the default), Q and H. The encoding library documents these as tolerating roughly 7%, 15%, 25% and 30% damage to the symbol before it stops reading. Higher recovery costs capacity, so a level that survives a scuffed label also fits fewer characters.',
      },
      {
        question: 'How much content actually fits?',
        answer:
          'The input box caps at 8,000 characters, but the format is the real limit. In byte mode the encoder documents a maximum of 2,953 characters at level L, 2,331 at M, 1,663 at Q and 1,273 at H. Over that you get "The content does not fit the selected QR settings" — shorten the content or drop to a lower recovery level.',
      },
      {
        question: 'What file do I get, and can I have a PNG?',
        answer:
          'One SVG file, served as image/svg+xml and named qr-code-generator.svg. There is no PNG or JPEG export in this workbench. SVG is usually the better choice for print anyway, because it has no fixed resolution; the pixel width you set only controls the width attribute on the vector.',
      },
      {
        question: 'Can I change the colours?',
        answer:
          'Not on this page — it draws black on white, which is the safest contrast for scanning. The QR Code SVG Export operation in the same workbench adds foreground and background fields, which must be 6- or 8-digit hex values. Test any non-default colour pairing on real devices before printing.',
      },
      {
        question: 'Does it check that what I encoded works?',
        answer:
          'No. It encodes the characters you supply and draws the symbol; it does not visit a link, confirm a destination or verify any format. Scan the downloaded symbol with the devices, print size, surface and lighting you actually intend to use before you commit to a print run.',
      },
    ],
  },

  // lib/tools/qr-barcode-workbench.ts (url-qr-code operation, the safeUrl
  // helper, required, renderQr) and lib/tools/qr-barcode-workbench.test.ts,
  // which asserts the rejections quoted below.
  'qr-and-barcode-url-qr-code': {
    directAnswer:
      'Paste the full web address, including the scheme, choose an error-correction level and a width, then generate. The address is parsed and checked before encoding, and the symbol downloads as an SVG file.',
    leadParagraph:
      'This encodes your address directly into the symbol. There is no short link, no redirect service and no scan counter, which means nobody sits between the scan and your page — and also that a printed code can never be repointed later. The address must be a complete HTTP or HTTPS URL of at most 2,048 characters; other schemes and addresses carrying a username or password are refused. The address is re-serialised by the browser URL parser before encoding, so what is in the symbol is the normalised form of what you typed.',
    faqs: [
      {
        question: 'Why was my address rejected?',
        answer:
          'Three checks can refuse it. An address with no scheme, such as a bare domain, fails with "Enter a complete HTTP or HTTPS URL". Any other scheme — a javascript: address, for instance — fails with "Only HTTP and HTTPS URLs are accepted here". An address carrying credentials fails with "Remove embedded usernames or passwords from the URL". The limit is 2,048 characters.',
      },
      {
        question: 'Does it shorten the link or track scans?',
        answer:
          'No. Your exact address is what gets encoded — no redirect service, no analytics, no counter, and nothing to sign up for. The trade-off is that the destination is fixed at print time: to send scanners somewhere else later, point the code at a URL you control and change where that URL leads.',
      },
      {
        question: 'Is my URL changed before it is encoded?',
        answer:
          'It is normalised by the browser URL parser. In practice that lower-cases the host and adds a trailing slash when the path is empty. The query string and fragment are carried through as you typed them. Check the encoded result if the exact spelling of the path matters to your server.',
      },
      {
        question: 'My URL is long — will it still scan?',
        answer:
          'A longer address needs a denser symbol, and error correction costs capacity too: in byte mode the encoder documents 2,953 characters at level L down to 1,273 at level H. If a long link produces a symbol that reads poorly, lower the recovery level or print it larger, and test with the devices that will actually scan it.',
      },
    ],
  },

  // lib/tools/qr-barcode-workbench.ts (wi-fi-qr-code operation, its branch of
  // buildQrPayload, and the escapePayload helper) and
  // lib/tools/qr-barcode-workbench.test.ts, which pins the escaped payload.
  'qr-and-barcode-wi-fi-qr-code': {
    directAnswer:
      'Enter the network name, the password and the security type, say whether the network is hidden, then generate. The tool builds a WIFI: payload in the form WIFI:T:WPA;S:name;P:password;H:false;; and encodes it as an SVG symbol.',
    leadParagraph:
      'This writes the standard Wi-Fi configuration payload that phone cameras and scanner apps recognise, so a guest can join without typing the password. The password is carried in that payload as plain text — it is not encrypted and not hidden, so anyone who scans or photographs the printed code can read it. Three security types are offered: WPA (covering WPA, WPA2 and WPA3), WEP, and an open network, which encodes an empty password. Whether a particular phone offers to join is decided by its own camera or scanner app, so test the printed symbol on the devices your guests will use.',
    faqs: [
      {
        question: 'What exactly is inside the code?',
        answer:
          'A single line of text: WIFI: followed by T for the security type, S for the network name, P for the password and H for whether the network is hidden, each ending in a semicolon, with a final empty field closing the payload. The hidden flag is always written out explicitly as true or false.',
      },
      {
        question: 'Is the password protected in any way?',
        answer:
          'No. It sits in the payload in clear text. Anyone who scans the symbol, or photographs it and decodes the picture, reads the password. Treat a printed Wi-Fi code exactly as you would treat the password written on the same card, and consider a separate guest network rather than your main one.',
      },
      {
        question:
          'My network name contains a semicolon or a colon — will that break it?',
        answer:
          'No. A backslash, semicolon, comma, colon and double quote are each escaped with a backslash before encoding, and a line break becomes \\n. A network called Guest;Floor 1 with the password p:ass encodes as WIFI:T:WPA;S:Guest\\;Floor 1;P:p\\:ass;H:false;; so the separators stay unambiguous. The network name may be up to 128 characters and the password up to 256.',
      },
      {
        question: 'Can I encode a university or corporate enterprise network?',
        answer:
          'No. Only WPA, WEP and open networks can be encoded here. There is no field for an identity, a username or a certificate, so an 802.1X enterprise network, which needs those, cannot be represented in this payload.',
      },
      {
        question: 'How do I encode a hidden network?',
        answer:
          'Set Hidden network to Yes, which writes H:true into the payload. Leaving it at No writes H:false. The flag is always present either way, because some scanners need to be told the network will not appear in a normal scan.',
      },
    ],
  },

  // lib/tools/qr-barcode-workbench.ts (upi-qr-code operation, its branch of
  // buildQrPayload, the required / finite helpers and the operation notice) and
  // lib/tools/qr-barcode-workbench.test.ts, which pins the encoded parameters.
  'qr-and-barcode-upi-qr-code': {
    directAnswer:
      'Enter the UPI ID, the payee name, an amount (or 0 to leave it open) and an optional note, then generate. The tool builds a UPI deep link carrying pa, pn and cu, adds am and tn when you supply them, and encodes it as an SVG symbol.',
    leadParagraph:
      'This composes a payment request payload from the values you type. It moves no money, contacts no bank and confirms nothing: it cannot check that a UPI ID exists, that it belongs to the person you think, that the handle is active, or that a payment went through. The currency parameter is fixed to INR and cannot be changed. Always read the payee name your payment app displays before authorising anything — that name comes from the payment network, not from this code.',
    faqs: [
      {
        question: 'Which parameters does it write into the link?',
        answer:
          'pa for the payee UPI ID, pn for the payee name and cu for the currency, which is always INR. am is added only when you enter a non-zero amount, and tn only when you type a note. Values are form-encoded, so an @ becomes %40 and a space becomes a plus sign: a payee of sample@bank paying 125.5 with the note Invoice 5 encodes as pa=sample%40bank&pn=Sample+Payee&cu=INR&am=125.50&tn=Invoice+5.',
      },
      {
        question: 'Can I leave the amount for the payer to fill in?',
        answer:
          'Yes. Enter 0 and the am parameter is left out entirely, so the payer types the amount in their app. Any non-zero amount is written with exactly two decimal places, so 125.5 is encoded as 125.50. The accepted range is 0 to 10,000,000,000.',
      },
      {
        question: 'Can I use a currency other than rupees?',
        answer:
          'No. The currency parameter is hard-coded to INR in the payload this tool builds, and there is no field to change it.',
      },
      {
        question: 'Is this a merchant QR code?',
        answer:
          'No. It carries no merchant category code, no transaction reference or transaction id, and no signature, so it is a plain personal-style payment link rather than a signed merchant code. If you need a signed merchant QR for a shop or an aggregator, your bank or payment service provider has to issue it.',
      },
      {
        question: 'What does it check about the UPI ID?',
        answer:
          'Only the shape. It must look like user@handle — letters, digits, dots, underscores or hyphens, at least two characters on each side of the @ — and be at most 45 characters, with the payee name at most 100. Nothing beyond that shape is verified, so check the ID character by character and confirm the payee name in the payment app before you authorise.',
      },
    ],
  },

  // lib/tools/math-workbench.ts (basic-calculator operation, the tokens
  // tokeniser, the evaluate recursive-descent parser and the format helper) and
  // lib/tools/math-workbench.test.ts.
  'math-and-units-basic-calculator': {
    directAnswer:
      'Type the whole expression on one line and run it. It is parsed by a small recursive-descent parser written for this tool, never handed to eval, and the answer is printed to 12 significant digits.',
    leadParagraph:
      'This accepts numbers — with an optional decimal point and an optional e exponent — together with the symbols ( ) + - * / % and ^, up to 200 characters in all. Anything else is an unsupported token, which is why text such as a function name or a stray letter is refused outright rather than evaluated. The ordinary precedence rules apply: parentheses first, then powers, then multiplication, division and remainder, then addition and subtraction. Results are plain numbers with no thousands separators.',
    faqs: [
      {
        question: 'Which symbols can I type?',
        answer:
          'Digits, a decimal point, an e exponent such as 1e3, and the symbols ( ) + - * / % and ^. Use the asterisk for multiply and the slash for divide: the typographic signs × and ÷, and the Unicode minus −, are not recognised and produce "The expression contains an unsupported token". The whole expression is limited to 200 characters.',
      },
      {
        question: 'Does % mean percent?',
        answer:
          'No. Here % is the remainder operator, so 7 % 3 gives 1, not a percentage. For percentage questions use the Percentage Calculator, which has explicit modes for "X% of Y", "X is what % of Y" and percentage change.',
      },
      {
        question: 'How are powers and negative numbers handled?',
        answer:
          'The caret raises to a power and groups from the right, so 2^3^2 is 512 rather than 64. A leading minus is applied after the power, so -2^2 is -4. Dividing or taking a remainder by zero stops with "Division by zero is not defined".',
      },
      {
        question: 'Why will my expression not evaluate?',
        answer:
          'Three common reasons. There is no implied multiplication, so 2(3) fails with "The expression could not be fully evaluated" — write 2*(3). There are no constants and no functions, so pi, sin and log are unsupported tokens. And unbalanced brackets stop with "Parentheses are not balanced".',
      },
      {
        question: 'How is the answer rounded?',
        answer:
          'To 12 significant digits, with trailing zeros dropped, and negative zero printed as 0. The arithmetic underneath uses double-precision floating point, so results that cannot be represented exactly in binary still show the usual small drift before that rounding is applied.',
      },
    ],
  },

  // lib/tools/math-workbench.ts (scientific-calculator operation, its branch of
  // runMathOperation and the format helper) and
  // lib/tools/math-workbench.test.ts.
  'math-and-units-scientific-calculator': {
    directAnswer:
      'Choose one function, type one number, and set the angle mode to degrees or radians. The answer is printed to 12 significant digits, so the sine of 30 degrees comes out as exactly 0.5 rather than a long floating-point tail.',
    leadParagraph:
      'Ten functions are available: sine, cosine, tangent, arc sine, arc cosine, arc tangent, natural logarithm, base-10 logarithm, square root and absolute value. The angle mode applies in both directions — in degrees mode the input to sine, cosine and tangent is converted to radians first, and the output of the three arc functions is converted back to degrees. Logarithms, square root and absolute value ignore the angle mode entirely. This applies one function to one number; it is not an expression calculator, so there are no brackets, no chaining and no memory keys.',
    faqs: [
      {
        question: 'Which functions are available?',
        answer:
          'Sine, cosine, tangent, arc sine, arc cosine, arc tangent, natural logarithm, base-10 logarithm, square root and absolute value. There are no hyperbolic functions and no factorial. For a logarithm to an arbitrary base, the same workbench has a separate Logarithm Calculator that takes the value and the base as two fields.',
      },
      {
        question: 'How does the degrees and radians setting work?',
        answer:
          'In degrees mode the value you type is multiplied by pi over 180 before sine, cosine or tangent is applied, and the radian result of arc sine, arc cosine or arc tangent is converted back to degrees. In radians mode the number is used as it stands. Natural logarithm, base-10 logarithm, square root and absolute value are unaffected by this setting.',
      },
      {
        question: 'Can I chain several operations together?',
        answer:
          'No. Each run applies one function to one number. To combine steps, either feed one result into the next run or use the Basic Calculator, which parses a full expression with brackets, powers and the four operators.',
      },
      {
        question: 'What happens if the value is outside the function domain?',
        answer:
          'The run stops with "The result is outside the finite number range". That covers the square root of a negative number, the logarithm of zero or a negative number, and arc sine or arc cosine of a value beyond -1 to 1 — all cases where the underlying maths gives no finite real answer.',
      },
      {
        question: 'Why does the tangent of 90 degrees give a huge number?',
        answer:
          'Because 90 degrees becomes a binary approximation of pi over 2 rather than the exact value, so the tangent is a finite but enormous number, around 1.63 times ten to the sixteenth, instead of an error. Mathematically it is undefined; read any result of that magnitude as undefined rather than as a measurement.',
      },
    ],
  },

  // lib/tools/math-workbench.ts (fraction-calculator operation, its branch of
  // runMathOperation, and the integer / gcd helpers) and
  // lib/tools/math-workbench.test.ts.
  'math-and-units-fraction-calculator': {
    directAnswer:
      'Type the numerator and denominator of each fraction, choose add, subtract, multiply or divide, and run it. The result is cross-multiplied, divided by the greatest common divisor and returned as one fraction in lowest terms — a half plus a third gives 5/6.',
    leadParagraph:
      'All four inputs must be whole numbers; a decimal such as 1.5 is refused, and so is a mixed number, so convert one and a half to 3/2 yourself before entering it. Addition and subtraction cross-multiply over the product of the two denominators, multiplication multiplies across, and division multiplies by the reciprocal. The reduced result always prints as numerator over denominator with the sign carried on the numerator and the denominator kept positive. It never converts to a decimal and never returns a mixed number, so a whole-number answer appears with a denominator of 1.',
    faqs: [
      {
        question: 'What form does the answer take?',
        answer:
          'Always a single fraction in lowest terms, written as numerator/denominator, with any minus sign on the numerator and the denominator always positive. There is no decimal output and no mixed-number output, so an answer equal to two is shown as 2/1.',
      },
      {
        question: 'Can I enter a decimal or a mixed number?',
        answer:
          'No. Each of the four boxes must hold a whole number, and anything else stops with a message saying the value must be a safe whole number. Convert first: one and a half is 3/2, and 0.25 is 1/4.',
      },
      {
        question: 'How is each operation worked out?',
        answer:
          'Addition and subtraction use cross-multiplication — a/b plus c/d becomes (a×d + c×b) over (b×d), with a minus in place of the plus for subtraction. Multiplication gives (a×c) over (b×d). Division gives (a×d) over (b×c). The result is then divided top and bottom by their greatest common divisor, found with the Euclidean algorithm.',
      },
      {
        question: 'Which inputs are refused?',
        answer:
          'A zero in either denominator stops with "Fraction denominators cannot be zero". Dividing by a fraction whose numerator is zero stops with "Cannot divide by a zero fraction". Any value that is not a whole number is refused before the arithmetic starts.',
      },
      {
        question: 'Can it handle three or more fractions at once?',
        answer:
          'No. Each run takes exactly two fractions and one operation. To combine more, run it once, then type the reduced result back in as the first fraction for the next step.',
      },
    ],
  },

  // lib/tools/utility.ts (calculatePercentage and formatNumber),
  // lib/tools/utility.test.ts, components/utility-tools.tsx (PercentageTool)
  // and app/math/percentage-calculator/page.tsx.
  'math-and-units-percentage-calculator': {
    directAnswer:
      'Pick one of the three modes — "X% of Y", "X is what % of Y", or "% change" — fill in the two boxes and press Calculate. Twenty per cent of 150 is 30, 30 is 20% of 150, and a move from 80 to 100 is a 25% change.',
    leadParagraph:
      'Each mode is one explicit formula: percent-of multiplies the value by the percentage over 100; what-percent divides the part by the whole and multiplies by 100; percentage change divides the difference by the absolute value of the starting number and multiplies by 100. Using the absolute value means a change that starts from a negative number still reports a sign that follows the direction of the move. The first mode returns a plain number and the other two append a per cent sign. Results are displayed to at most eight decimal places, grouped according to your browser locale.',
    faqs: [
      {
        question: 'Which three questions can it answer?',
        answer:
          '"X% of Y" gives (X ÷ 100) × Y, so 20% of 150 is 30. "X is what % of Y" gives (X ÷ Y) × 100, so 30 out of 150 is 20%. "% change" gives ((end − start) ÷ |start|) × 100, so 80 rising to 100 is a 25% change.',
      },
      {
        question: 'Why can the starting value not be zero for a change?',
        answer:
          'Because the change is divided by the starting value, and there is no meaningful percentage increase from nothing. That case stops with "The starting value cannot be zero". In the same way, a whole of zero in "X is what % of Y" stops with "The reference value cannot be zero".',
      },
      {
        question: 'What happens with negative numbers?',
        answer:
          'Percentage change divides by the absolute value of the starting number, so the sign of the answer reflects whether the value rose or fell rather than flipping with the sign of the start. A move from -50 to -25 is reported as a rise, because the value went up.',
      },
      {
        question: 'How is the answer rounded?',
        answer:
          'Display is limited to eight decimal places and uses your browser locale for grouping and the decimal mark. The calculation itself is done in double-precision floating point before that formatting, so a result that repeats endlessly is rounded for display rather than reported exactly.',
      },
      {
        question: 'Can it work out VAT, GST or a discounted price?',
        answer:
          'Not directly — it has these three modes and nothing else, so there is no reverse-percentage mode and no tax mode. For tax at a rate you supply, the finance workbench has a GST calculator that reports the tax and the total, for example 1,000 at 18% giving a total of 1,180.',
      },
    ],
  },

  // lib/tools/finance-business-workbench.ts (loan-emi-calculator branch of
  // runFinanceOperation, the payment / percent / positive / currency helpers
  // and the operation notice) and lib/tools/finance-business-workbench.test.ts.
  'finance-and-business-loan-emi-calculator': {
    directAnswer:
      'Enter the principal, the annual rate as a percentage and the term in years, then run it. It returns the monthly principal-and-interest payment, the number of payments, the total paid and the total interest, using the standard reducing-balance formula EMI = P × r × (1 + r)ⁿ ÷ ((1 + r)ⁿ − 1).',
    leadParagraph:
      'In that formula r is the annual rate divided by 100 and then by 12, and n is the term in months, so interest is charged on the balance that remains each month. A rate of zero is handled separately and simply divides the principal by the number of months. This is an estimate for comparing options, not financial advice and not a quotation: fees, insurance, taxes, prepayments and any change in a floating rate all move the real number. Check the schedule your lender issues before you commit.',
    faqs: [
      {
        question: 'Which EMI formula does it use?',
        answer:
          'The standard reducing-balance annuity payment: EMI = P × r × (1 + r)ⁿ ÷ ((1 + r)ⁿ − 1), where P is the principal, r is the annual percentage rate divided by 100 and then by 12, and n is the term in months. At a rate of exactly zero it returns the principal divided by the number of months instead — 1,200 over one year gives 100 a month.',
      },
      {
        question: 'What is left out of the monthly figure?',
        answer:
          'Everything except principal and interest. Processing and arrangement fees, insurance premiums, tax on fees, late charges, prepayment or part-payment, a moratorium or holiday period, and any movement in a floating rate are all outside the calculation, which assumes one fixed rate for the whole term.',
      },
      {
        question: 'Why does my bank quote a slightly different EMI?',
        answer:
          'Two reasons show up most often. This tool uses a plain monthly rate of the annual rate divided by twelve, while a lender may use a different convention. And it prints unrounded figures to twelve significant digits, computing the totals from the unrounded monthly amount, whereas a lender rounds every instalment to the smallest currency unit and usually adjusts the final one to clear the balance exactly.',
      },
      {
        question: 'Can I model a part-payment or a rate change?',
        answer:
          'Not in this calculator — it assumes a single fixed rate and an unchanged schedule. The same workbench has a separate mortgage extra-payment operation that reports the accelerated monthly payment, the total interest saved and how much the payoff time shortens.',
      },
      {
        question: 'What are the input limits?',
        answer:
          'The principal must be greater than zero, and the term must resolve to a whole number of months between 1 and 12,000 — a term of 1.1 years is refused with "Term must resolve to 1–12,000 whole months". The annual rate is accepted from -99.999999% to 1,000,000%, which is deliberately wide so that unusual scenarios can still be modelled.',
      },
    ],
  },

  // lib/tools/finance-business-workbench.ts (mortgage-calculator, which shares
  // the loan-emi-calculator branch of runFinanceOperation, plus its own notice
  // and the payment helper) and lib/tools/finance-business-workbench.test.ts.
  'finance-and-business-mortgage-calculator': {
    directAnswer:
      'Enter the loan amount, the annual rate as a percentage and the term in years, then run it. It returns the monthly principal and interest, the number of payments, the total paid and the total interest — 100,000 at 6% over 30 years gives 599.550525153 a month across 360 payments.',
    leadParagraph:
      'The monthly figure is the standard amortising payment, P × r × (1 + r)ⁿ ÷ ((1 + r)ⁿ − 1), with r the annual rate divided by 100 and then by 12 and n the term in months; the loan EMI calculator in the same workbench runs exactly this code. What it gives you is the principal-and-interest portion only. A real housing payment also carries property tax, buildings and contents insurance, mortgage insurance where it applies, arrangement and valuation fees, escrow adjustments and any association or maintenance charge — none of which are modelled here. Treat the result as an estimate for comparison rather than financial advice or an offer.',
    faqs: [
      {
        question: 'What does the monthly figure include?',
        answer:
          'Principal and interest, and nothing else. Property tax, home insurance, mortgage insurance, arrangement or valuation fees, escrow changes and association or maintenance fees are all excluded, so a lender illustration of the full monthly outgoing will be higher than this number.',
      },
      {
        question: 'Which formula does it use?',
        answer:
          'The standard amortising payment: P × r × (1 + r)ⁿ ÷ ((1 + r)ⁿ − 1), where r is the annual percentage rate divided by 100 and then by 12 and n is the term in months. A loan of 100,000 at 6% over 30 years gives 599.550525153 a month over 360 payments. At a rate of zero it divides the principal by the number of months instead.',
      },
      {
        question: 'Can I add extra payments or see an amortisation schedule?',
        answer:
          'Not from this calculator, which reports four summary lines and no month-by-month table. The same workbench has a separate mortgage extra-payment operation that takes an extra monthly amount and reports the accelerated payment, the total interest saved and how much sooner the loan clears.',
      },
      {
        question: 'Does it handle a variable rate or an interest-only period?',
        answer:
          'No. One fixed rate applies for the whole term, and every payment is a full principal-and-interest instalment. Tracker, adjustable, offset, interest-only and balloon structures are outside what this calculation represents.',
      },
      {
        question: 'How exact are the totals?',
        answer:
          'They are arithmetic to twelve significant digits, with the total paid computed from the unrounded monthly figure and the total interest taken as the total paid minus the principal. A lender rounds each instalment to the smallest currency unit and adjusts the final one, so a real schedule will differ slightly. The term must also resolve to a whole number of months between 1 and 12,000.',
      },
    ],
  },

  // lib/tools/finance-business-workbench.ts (simple-interest-calculator branch
  // of runFinanceOperation, the finite / percent / currency helpers and the
  // operation notice) and lib/tools/finance-business-workbench.test.ts.
  'finance-and-business-simple-interest-calculator': {
    directAnswer:
      'Enter the principal, the annual rate as a percentage and the time in years, then run it. It returns the interest as P × r × t and the final amount as principal plus interest — 1,000 at 10% for two years gives 200 interest and a final amount of 1,200.',
    leadParagraph:
      'Simple interest is charged on the original principal only, so the interest never earns interest and each year adds the same amount. The rate you type is divided by 100 and multiplied by the number of years exactly as you enter it; unlike the loan calculators, a fractional term such as 0.5 is accepted. There is no day-count convention here, so for a part period you decide the fraction of a year yourself. This is arithmetic for comparison, not financial advice: tax on the interest, deductions at source and any fee are outside the calculation.',
    faqs: [
      {
        question: 'Which formula does it use?',
        answer:
          'Interest = principal × rate × time, with the rate taken as the annual percentage divided by 100 and time measured in years. The final amount is the principal plus that interest. A principal of 1,000 at 10% for two years gives 200 interest and 1,200 in total; the default figures, 100,000 at 8% for three years, give 24,000 interest and 124,000 in total.',
      },
      {
        question: 'Does the interest compound?',
        answer:
          'No. Simple interest applies to the original principal every period, so nothing is ever earned on earlier interest. The same workbench has a compound-interest calculator that takes a compounding frequency: 1,000 at 10% for two years compounded once a year gives a future value of 1,210 there, against 1,200 here.',
      },
      {
        question: 'Can I enter months or days instead of years?',
        answer:
          'The field is in years, but it accepts a fraction, so six months is 0.5. For a number of days you convert it yourself — the tool applies no day-count rule of its own, so a schedule your bank quotes on a 30/360 or actual/365 basis will only match if you supply the matching fraction.',
      },
      {
        question: 'What are the input limits and how are results rounded?',
        answer:
          'The principal and the number of years must both be zero or more, and the annual rate is accepted from -99.999999% to 1,000,000%. Results print to twelve significant digits, and any value smaller than one ten-billionth is shown as 0.',
      },
      {
        question: 'Is this financial advice?',
        answer:
          'No. It is scenario arithmetic on the three numbers you type, and it is not financial, investment, tax, accounting or lending advice. Tax on interest, deductions at source, fees, and the exact dates on which interest is credited can all change what you actually receive — check the terms of the product itself.',
      },
    ],
  },
  // lib/tools/finance-business-workbench.ts (taxFields, tax(), the
  // 'gst-calculator' operation and the shared currency/format helpers) and
  // lib/tools/finance-business-workbench.test.ts
  'finance-and-business-gst-calculator': {
    directAnswer:
      'To add GST to a pre-tax amount: open the GST calculator, enter the amount before tax and the GST percentage you have been told to apply, then select Calculate scenario. The page multiplies the two in your own browser tab and prints the pre-tax amount, the rate it used, the tax amount and the total.',
    leadParagraph:
      'This is plain arithmetic on the two numbers you type, and it works in one direction only: it adds a rate to an amount that does not yet include tax. It has no built-in table of GST slabs, it will not work backwards from a tax-inclusive price, and it does not split the tax into CGST, SGST and IGST — the output is one tax figure and one total. The rate is whatever you enter, so the answer is only as right as the rate. The same code also drives the VAT and sales-tax calculators on this site, because the arithmetic is identical. This is arithmetic, not tax advice.',
    faqs: [
      {
        question:
          'Can it work out the GST inside a price that already includes tax?',
        answer:
          'No. The tool only adds a rate to an amount that does not yet include tax: it multiplies the amount you enter by the rate you enter, then adds the two together. Entering 1000 at 18% gives a tax figure of 180 and a total of 1180. If you hold a tax-inclusive price, this tool will not separate it back into base and tax.',
      },
      {
        question: 'Does it split the result into CGST, SGST and IGST?',
        answer:
          'No. It prints one tax amount and one total, whatever rate you enter. The form never asks whether the supply is intra-state or inter-state, so the tool has no basis on which to produce that split.',
      },
      {
        question: 'Which GST rate should I enter?',
        answer:
          'The one that applies to your supply — the tool does not choose it for you and carries no table of rates. Its own notice states that it does not determine jurisdiction, classification, exemptions, filing, credits, thresholds or the legally correct rate. If you are unsure which rate applies, ask a tax professional rather than the calculator.',
      },
      {
        question: 'Why does the total show so many decimal places?',
        answer:
          'Results are printed to up to twelve significant figures and are not rounded to two decimal places, and no currency symbol is added — the output is plain numbers. Round the figures yourself to whatever your invoice or return requires.',
      },
    ],
  },

  // lib/tools/utility.ts (dateDifference, parseDateOnly, epochDay),
  // lib/tools/utility.test.ts, components/utility-tools.tsx (DatePairTool)
  // and lib/tools/date-workbench.ts for the business-days operation
  'date-time-and-productivity-date-difference-calculator': {
    directAnswer:
      'To count the days between two dates: open the date difference calculator, pick the first date and the second date in the two date boxes, then select Calculate difference. The result is the number of whole calendar days between them, worked out in your browser from the two dates alone.',
    leadParagraph:
      'The count is the gap between the dates, not a tally of the dates themselves: 28 February 2024 to 1 March 2024 comes out as 2 days, because it counts the days that pass rather than both endpoints. The order you enter them in makes no difference, because the tool takes the absolute difference — you will never get a negative number from it. Both dates are converted to whole UTC days before subtracting, so your time zone and any clock change are irrelevant to the answer. Every calendar day counts, including weekends, public holidays and 29 February. There is no time-of-day field, so it cannot measure hours or part-days.',
    faqs: [
      {
        question: 'Does the count include the last day?',
        answer:
          'No. It counts the days between the two dates, so 28 February 2024 to 1 March 2024 returns 2 days rather than 3. If the thing you are counting needs both endpoints included, add one to the answer yourself.',
      },
      {
        question: 'Does it matter which date I put first?',
        answer:
          'No. The tool takes the absolute difference, so 2024-02-28 to 2024-03-01 and 2024-03-01 to 2024-02-28 both return 2 days. The result is never signed, so it will not tell you which date came first.',
      },
      {
        question: 'Does it count 29 February?',
        answer:
          'Yes. Leap days are ordinary days here — the count is a straight subtraction of calendar days, so every 29 February inside the range is included in the total.',
      },
      {
        question: 'Does it skip weekends and public holidays?',
        answer:
          'No, it counts every calendar day. A separate business-days calculator on this site counts Monday to Friday dates only, excluding the start date and including the end date, and that one does not know about public holidays either.',
      },
      {
        question: 'Can daylight saving or my time zone change the answer?',
        answer:
          'No. Both dates are converted to whole UTC days before they are subtracted, so the result depends only on the two calendar dates you picked and not on where you are or what your clock did overnight.',
      },
    ],
  },

  // lib/tools/date-workbench.ts (the 'add-days-to-date' operation,
  // parseDateOnly, epochDay, fromEpochDay, integer, boundedShift) and
  // lib/tools/date-workbench.test.ts
  'date-time-and-productivity-add-days-to-date': {
    directAnswer:
      'To add days to a date: open the add-days tool, type the starting date as YYYY-MM-DD, type how many days to add, then select Calculate. It returns a single date in YYYY-MM-DD form, reached by adding whole calendar days to the date you gave it.',
    leadParagraph:
      'The arithmetic is a straight count of calendar days, so every day counts the same: weekends, public holidays and 29 February are each one day. Because it adds days rather than months, the awkward month-end question never arises — you are counting days, not naming a date one month later. Dates are handled as whole UTC days, so no clock change can move the answer by a day. The starting date must be a real calendar date written as YYYY-MM-DD with a year from 0100 to 9999, and 2026-02-30 is refused. The shift is capped at 1,000,000 days in either direction, and the resulting year must also fall between 0100 and 9999.',
    faqs: [
      {
        question: 'Does it count 29 February?',
        answer:
          'Yes. Adding one day to 2028-02-28 returns 2028-02-29, because 2028 is a leap year and the tool steps through real calendar days rather than a fixed 365-day year.',
      },
      {
        question: 'Can I add months or years instead of days?',
        answer:
          'No. This tool adds whole days only. That is also why it never has to decide what one month after 31 January should mean — the question does not arise when the unit is a day.',
      },
      {
        question: 'What happens if I enter a negative number of days?',
        answer:
          'It counts backwards. Adding minus 30 days gives the same date as subtracting 30 days, because the tool adds the signed whole number you typed to the starting date.',
      },
      {
        question: 'What date format does it accept?',
        answer:
          'Only YYYY-MM-DD, and only a date that actually exists. A value such as 2026-02-30 is refused with a message asking for a valid calendar date, and years outside 0100 to 9999 are refused as well.',
      },
      {
        question: 'Is there a limit on how many days I can add?',
        answer:
          'Yes, 1,000,000 days in either direction. The number must also be a whole number — decimals are refused — and the date it lands on has to stay inside the 0100 to 9999 range.',
      },
    ],
  },

  // lib/tools/date-workbench.ts (the 'subtract-days-from-date' and
  // 'workday-calculator' operations, parseDateOnly, fromEpochDay,
  // boundedShift) and lib/tools/date-workbench.test.ts
  'date-time-and-productivity-subtract-days-from-date': {
    directAnswer:
      'To subtract days from a date: open the subtract-days tool, type the date you are counting back from as YYYY-MM-DD, type how many days to go back, then select Calculate. The answer is a single date in YYYY-MM-DD form.',
    leadParagraph:
      'This is the same day-counting arithmetic as the add-days tool with the sign reversed: it takes your starting date, steps back the whole number of days you give it and prints where it lands. Every day on the way back counts, so weekends, public holidays and 29 February are one day each. The date it lands on may itself be a Saturday, Sunday or holiday — nothing is skipped, and a separate workday calculator on this site is the one that moves by weekdays, though it does not know public holidays either. A negative number reverses the direction and moves forwards instead. The date must be a real calendar date in YYYY-MM-DD form with a year from 0100 to 9999, and the shift is capped at 1,000,000 days.',
    faqs: [
      {
        question: 'What happens around a leap day?',
        answer:
          'Leap days are counted like any other day. Subtracting one day from 2028-03-01 returns 2028-02-29, because 2028 is a leap year and 29 February is a real day on that calendar.',
      },
      {
        question: 'Will the answer ever skip a weekend or a holiday?',
        answer:
          'No. This tool counts calendar days, so the result can land on any day of the week. If you need to count back in working days, the separate workday calculator on this site moves by weekdays — but public holidays are not built into that one either.',
      },
      {
        question: 'Can I use it to count forwards?',
        answer:
          'Yes, enter a negative number of days. The tool subtracts whatever signed whole number you type, so minus 30 moves the date 30 days forward.',
      },
      {
        question: 'Why was my date rejected?',
        answer:
          'The date must be written as YYYY-MM-DD and must exist on the calendar, so 2026-02-30 is refused. The year has to be between 0100 and 9999, and the year of the result does too.',
      },
      {
        question: 'Is there a limit on the number of days?',
        answer:
          'Yes. The shift is limited to 1,000,000 days, and it must be a whole number — a decimal such as 1.5 is refused rather than rounded.',
      },
    ],
  },

  // lib/tools/utility.ts (calendarAge, addMonthsClamped, daysInMonth,
  // epochDay), lib/tools/utility.test.ts and
  // components/utility-tools.tsx (DatePairTool)
  'date-time-and-productivity-age-calculator': {
    directAnswer:
      'To work out an exact age: open the age calculator, pick the birth date and the date you want the age on, then select Calculate age. It returns completed years, months and days, along with the total number of days between the two dates.',
    leadParagraph:
      'Age is counted the way birthdays are counted: complete years first, then complete months since the last birthday, then the days left over. The months figure is therefore always between 0 and 11, and the days figure counts from the most recent monthly anniversary. When stepping by months would land on a day that does not exist in the target month, the day is clamped to the end of that month — which is exactly how a 29 February birth date is handled in a year that has no 29 February. Both dates are treated as whole UTC days, so time zones and clock changes cannot shift the result, and there is no time-of-day input. The birth date must not be later than the comparison date, but the comparison date itself may be in the future.',
    faqs: [
      {
        question: 'How does it handle a 29 February birthday?',
        answer:
          'It counts the anniversary on 28 February in years that have no 29 February. Someone born on 2000-02-29 is reported as 25 years old on 2025-02-28 by this tool.',
      },
      {
        question: 'What exactly do the months and days figures mean?',
        answer:
          'Months are complete calendar months since the last birthday, so that figure is never more than 11, and days are the days elapsed since that monthly anniversary. A birth date of 2000-01-15 measured on 2026-09-05 gives 26 years, 7 months and 21 days, with 9,730 total days.',
      },
      {
        question: 'What happens if someone was born on the 31st?',
        answer:
          'The monthly step is clamped to the last day of a shorter month. One month after 31 January is 29 February in a leap year and 28 February otherwise, and the days count then restarts from that clamped date.',
      },
      {
        question: 'Can I calculate an age on a future date?',
        answer:
          'Yes. The second date can be any date on or after the birth date. Only the reverse is refused: if the birth date falls after the comparison date the tool reports that rather than returning a negative age.',
      },
      {
        question: 'Does it account for the time of birth?',
        answer:
          'No. Both inputs are calendar dates only, and the finest unit in the answer is a whole day. The total-days line is a straight subtraction of calendar days, so it includes every leap day in between.',
      },
    ],
  },

  // lib/tools/science-education-workbench.ts (the 'bmi-calculator'
  // operation and its run case) and
  // lib/tools/science-education-workbench.test.ts
  'health-and-fitness-bmi-calculator': {
    directAnswer:
      'To calculate a BMI: open the BMI calculator, enter weight in kilograms and height in centimetres, then select Calculate locally. It divides the weight by the square of the height in metres and reports the result to two decimal places in kg/m².',
    leadParagraph:
      'The tool prints the number and the formula it used, then deliberately stops: there is no category, no healthy range and no percentile anywhere in the output, and a test in the repository fails if that kind of wording appears. It also prints the Ponderal index, which is the same weight divided by the height in metres cubed. The only inputs are weight and height — no age, no sex, no body-composition field — so two people with the same measurements always get the same number. Both values are metric and both must be greater than zero; there is no pounds or feet-and-inches option. This is a formula result, not medical advice, and as the tool notice says, BMI does not distinguish muscle from body fat.',
    faqs: [
      {
        question: 'Does it tell me whether my BMI is healthy?',
        answer:
          'No, and that is deliberate. The output is the BMI figure, the Ponderal index and the formula, with no category, range or interpretation attached. A test in the repository checks the result for words such as classification, healthy and clinical, and fails if any of them appear.',
      },
      {
        question:
          'Can I enter my weight in pounds or my height in feet and inches?',
        answer:
          'No. The two fields are weight in kilograms and height in centimetres, and nothing is converted for you beyond dividing the height by 100 to get metres. Convert imperial measurements before you type them in.',
      },
      {
        question: 'What is the Ponderal index line?',
        answer:
          'It is the same weight divided by the height in metres cubed rather than squared, reported in kg/m³. For 70 kg at 175 cm the tool gives a BMI of 22.86 kg/m² and a Ponderal index of 13.06 kg/m³.',
      },
      {
        question: 'Is a figure from this tool medical advice?',
        answer:
          'No. It is arithmetic on two numbers you typed. The tool carries the notice that this is a formula result only, not medical advice, and that BMI does not distinguish muscle from body fat. Ask a clinician what any figure means for you.',
      },
    ],
  },

  // lib/tools/science-education-workbench.ts (the 'bmr-calculator'
  // operation and its run case) and
  // lib/tools/science-education-workbench.test.ts
  'health-and-fitness-bmr-calculator': {
    directAnswer:
      'To estimate a basal metabolic rate: open the BMR calculator, choose male or female, enter age in years, weight in kilograms and height in centimetres, then select Calculate locally. It returns a Mifflin-St Jeor estimate and a Revised Harris-Benedict estimate side by side, both in kcal per day.',
    leadParagraph:
      'The Mifflin-St Jeor line is 10 × weight in kg, plus 6.25 × height in cm, minus 5 × age, then plus 5 for male or minus 161 for female. The Revised Harris-Benedict line uses its own constants: 88.362 + 13.397 × weight + 4.799 × height − 5.677 × age for male, and 447.593 + 9.247 × weight + 3.098 × height − 4.33 × age for female. Two further lines divide the Mifflin-St Jeor figure by 24 for an hourly rate and by body weight for a kcal-per-kilogram figure. The form offers only male and female, because those are the only two constant sets these equations define, and it asks nothing about body composition. These are population formulas rather than measurements, and not medical advice.',
    faqs: [
      {
        question: 'Which formulas does it use?',
        answer:
          'Two, both named in the output. Mifflin-St Jeor is 10 × weight in kg, plus 6.25 × height in cm, minus 5 × age, plus 5 for male or minus 161 for female; the Revised Harris-Benedict figure is calculated alongside it from its own set of constants. For a 30-year-old male at 70 kg and 175 cm the Mifflin-St Jeor result is 1648.8 kcal per day.',
      },
      {
        question: 'Why are the two numbers different?',
        answer:
          'They are two different published equations with different constants, so they rarely agree exactly. The tool shows both and does not pick one for you. The hourly rate and the kcal-per-kilogram line underneath are both derived from the Mifflin-St Jeor figure, not from the Harris-Benedict one.',
      },
      {
        question: 'Does it take body fat or muscle into account?',
        answer:
          'No. It asks only for sex, age, weight and height, so it has nothing to work from. Any formula based on lean mass would need a body-fat figure, and this tool never collects one.',
      },
      {
        question: 'Is this a medical result?',
        answer:
          'No. The tool notice states that these are formula results only, not medical advice, and that the formulas are population estimates whose individual values vary. Use a clinician or a measured test if you need a figure you can act on.',
      },
    ],
  },

  // lib/tools/science-education-workbench.ts (the 'tdee-calculator'
  // operation, its activity select and its run case) and
  // lib/tools/science-education-workbench.test.ts
  'health-and-fitness-tdee-calculator': {
    directAnswer:
      'To estimate total daily energy expenditure: open the TDEE calculator, choose male or female, enter age, weight in kilograms and height in centimetres, pick one of the five activity levels, then select Calculate locally. It works out a Mifflin-St Jeor BMR, multiplies it by that level\x27s multiplier and prints all three figures.',
    leadParagraph:
      'The five activity levels and their multipliers are fixed and shown on the form: sedentary 1.2, light exercise on 1 to 3 days a week 1.375, moderate exercise on 3 to 5 days 1.55, heavy exercise on 6 to 7 days 1.725, and a physical job or twice-daily training 1.9. The BMR underneath comes from Mifflin-St Jeor only — the Revised Harris-Benedict figure that the BMR calculator also prints is not used here. The output is three lines: the BMR to one decimal place, the multiplier it applied, and the TDEE rounded to a whole kcal per day. It suggests no deficit, no surplus, no goal weight and no macronutrient split. Both the equation and the five-step multiplier are population approximations, so this is an estimate, and it is not medical or dietary advice.',
    faqs: [
      {
        question: 'What multiplier does each activity level use?',
        answer:
          'Five fixed values, all named on the form: sedentary 1.2, light (exercise 1 to 3 days a week) 1.375, moderate (3 to 5 days) 1.55, active (heavy exercise 6 to 7 days) 1.725, and very active (physical job or two sessions a day) 1.9. The result echoes the multiplier that was applied, so you can see which one produced the number.',
      },
      {
        question: 'Which BMR formula sits underneath the estimate?',
        answer:
          'Mifflin-St Jeor, and only that one. For a 30-year-old male at 70 kg and 175 cm the tool reports a BMR of 1648.8 kcal per day, a multiplier of 1.55 at the moderate setting, and a TDEE of 2556 kcal per day.',
      },
      {
        question:
          'Does it give me a calorie target for losing or gaining weight?',
        answer:
          'No. It prints the BMR, the multiplier and the TDEE, and nothing else. There is no deficit, surplus, goal weight or macronutrient output anywhere in this tool.',
      },
      {
        question: 'How accurate is the number?',
        answer:
          'It rests on two approximations: a population regression equation for the BMR and a five-step multiplier standing in for everything you do in a day. The tool notice says plainly that the activity multipliers are rough population estimates and that this is not medical or dietary advice.',
      },
    ],
  },

  // lib/tools/science-education-workbench.ts (the 'mole-calculator'
  // operation, its run case and the format/positive helpers) and
  // lib/tools/science-education-workbench.test.ts
  'science-and-education-mole-calculator': {
    directAnswer:
      'To convert a mass to moles: open the mole calculator, enter the mass in grams and the molar mass in grams per mole, then select Calculate locally. It divides the first by the second and also multiplies that result by the Avogadro constant to give a particle count.',
    leadParagraph:
      'The arithmetic is one division and one multiplication: moles = mass ÷ molar mass, and particles = moles × 6.02214076 × 10²³, the exact value fixed in the SI definition of the mole. Units are fixed at grams and grams per mole, so convert milligrams or kilograms before typing, and both numbers must be greater than zero. The tool does not work out a molar mass from a chemical formula — you supply that number yourself. It runs in one direction only: there is no moles-to-mass mode and no volume or concentration input. Figures are printed to up to twelve significant figures, so check significant figures and uncertainty yourself before using a result in a report.',
    faqs: [
      {
        question: 'Where do I get the molar mass to enter?',
        answer:
          'From your own source. This tool does not derive it from a chemical formula; it simply expects a number in grams per mole, and the form arrives pre-filled with 18.015. Entering a mass of 36.03 g against a molar mass of 18.015 g/mol returns 2 mol.',
      },
      {
        question: 'Which value of the Avogadro constant does it use?',
        answer:
          '6.02214076 × 10²³ per mole, the exact value fixed in the SI definition of the mole. The particle count is nothing more than the mole figure multiplied by that constant.',
      },
      {
        question: 'Can it go the other way, from moles back to mass?',
        answer:
          'No. The tool only divides mass by molar mass — there is no reverse mode and no concentration, volume or dilution input on this page. Multiply the moles by the molar mass yourself if you need the mass back.',
      },
      {
        question: 'Why is the particle count written with an e in it?',
        answer:
          'Large numbers are printed in exponent form, so a result such as 1.204428152e+24 means 1.204428152 × 10²⁴. The same twelve-significant-figure formatting applies to the mole figure above it.',
      },
      {
        question: 'What units does it expect?',
        answer:
          'Grams for the mass and grams per mole for the molar mass, and nothing else. There is no unit selector, so convert any other unit before you type, and note that both values must be greater than zero.',
      },
    ],
  },

  // lib/tools/life-admin-workbench.ts (the 'aadhaar-masking-tool'
  // operation, its run case and the required/digits helpers) and
  // lib/tools/life-admin-workbench.test.ts
  'india-and-life-admin-aadhaar-masking-tool': {
    directAnswer:
      'To mask an Aadhaar number: open the Aadhaar masking tool, type or paste the twelve digits — spaces and hyphens are fine — and select Run locally. It returns xxxx-xxxx- followed by the last four digits, with the first eight replaced.',
    leadParagraph:
      'The tool implements the convention its own notice names: only the last four digits are shown and the first eight are replaced with the letter x. The output is always written the same way, xxxx-xxxx-9012, whatever spacing you typed. Input is restricted to digits, spaces and hyphens, and once the non-digits are stripped there must be exactly twelve digits left, so it handles one number at a time. It does not validate the number, test a checksum, look anything up or keep a copy — the page is served with a policy that blocks the browser from making network requests at all. Masking is a text transform and the last four digits survive it, so a masked number is reduced exposure rather than anonymity.',
    faqs: [
      {
        question: 'Exactly which digits are hidden and which are kept?',
        answer:
          'The first eight digits are replaced with lowercase x and the last four are kept. The result is always written as xxxx-xxxx- followed by those four digits, so 1234 5678 9012 becomes xxxx-xxxx-9012 whether you typed spaces, hyphens or neither.',
      },
      {
        question: 'Can the masked number be turned back into the original?',
        answer:
          'Not from the masked string itself. The eight hidden digits are replaced by literal x characters and are not encoded anywhere in the output, so nothing in the result can reconstruct them. That is not the same as anonymity: the last four digits remain, so anyone already holding a candidate number can check it against the masked one.',
      },
      {
        question: 'Does it check that the Aadhaar number is genuine?',
        answer:
          'No. It counts twelve digits and does nothing else — no checksum test, no lookup, no authority consulted. The tool notice states that it does not validate, authenticate, store or retrieve Aadhaar data.',
      },
      {
        question: 'Can it mask the number on a photo or scan of the card?',
        answer:
          'No. This tool takes text in and gives text out. It does not open images or PDFs, and it does nothing to a QR code, a name, a date of birth or an address printed alongside the number. Masking the typed number protects that one string and nothing else on the document.',
      },
      {
        question: 'Can I mask several numbers at once?',
        answer:
          'No. Everything you paste is reduced to its digits and the total must come to exactly twelve, so two numbers in the box are rejected with a message about the digit count. Run them one at a time.',
      },
    ],
  },

  // lib/tools/life-admin-workbench.ts (the 'pan-masking-tool' operation
  // and its run case) and lib/tools/life-admin-workbench.test.ts
  'india-and-life-admin-pan-masking-tool': {
    directAnswer:
      'To mask a PAN: open the PAN masking tool, type or paste the ten-character PAN, then select Run locally. It returns six capital X characters followed by the last four characters of what you typed, in capitals.',
    leadParagraph:
      'The transform is fixed: whitespace is removed, the value is converted to capitals, then the first six characters are replaced with X and the last four are kept. ABCDE1234F becomes XXXXXX234F, and a lower-case abcde1234f gives the same answer. The length check accepts any ten letters or digits and does not test the five-letters, four-digits, one-letter shape of a real PAN, so a value that is not a PAN at all will still be masked rather than refused. As its notice says, it does not validate PAN structure, ownership, status or tax records. The last four characters stay visible, so this reduces exposure rather than making the value anonymous.',
    faqs: [
      {
        question: 'Which characters are kept and which are replaced?',
        answer:
          'The last four are kept, exactly as typed but in capitals, and the first six are replaced with the letter X. ABCDE1234F becomes XXXXXX234F. Note that the replacement character here is a capital X, while the Aadhaar masking tool on this site uses a lower-case x.',
      },
      {
        question: 'Does it check that the PAN is valid?',
        answer:
          'No. The only check is that exactly ten letters or digits remain once whitespace is removed, so a value such as 1234567890 is masked just as readily as a real PAN. The tool notice states that it does not validate PAN structure, ownership, status or tax records.',
      },
      {
        question: 'Is the masking reversible?',
        answer:
          'Not from the output. The six hidden characters become literal X characters and are not stored in the result, so the original cannot be recovered from the masked string. The four visible characters still narrow down which PAN it is, so treat a masked PAN as less exposed rather than anonymous.',
      },
      {
        question: 'Why did my lower-case PAN come back in capitals?',
        answer:
          'The tool converts the value to capitals before masking it, so the four kept characters are always capitals. It also means the ten-character check is case-insensitive.',
      },
      {
        question: 'What happens to spaces in what I paste?',
        answer:
          'All whitespace is removed before the length is counted, so A BCDE 1234 F is treated as the ten-character value ABCDE1234F. Other punctuation is not stripped, so a hyphen makes the value fail the ten-character check.',
      },
    ],
  },

  // lib/tools/life-admin-workbench.ts (the 'indian-address-formatter' and
  // 'pin-code-format-checker' operations and their run cases) and
  // lib/tools/life-admin-workbench.test.ts
  'india-and-life-admin-indian-address-formatter': {
    directAnswer:
      'To lay out an Indian address: open the Indian address formatter, paste the address into the box and select Run locally. It splits the text at every comma and line break, tidies the spacing inside each part, and puts each part on its own line ending in a comma.',
    leadParagraph:
      'This is a layout helper and nothing more. It breaks the address at commas and newlines, trims each piece, collapses runs of spaces inside a piece down to one, drops empty pieces and rejoins them with a comma and a line break, leaving no trailing comma on the last line. It never adds, removes, reorders or capitalises any words, and it adds no country line. It has no knowledge of localities or postal codes: a PIN code stays attached to whatever part you typed it in, so Karnataka 560038 comes out on a single line. As its notice says, it does not verify a locality, PIN code, deliverability or any government address record.',
    faqs: [
      {
        question: 'What does it actually change?',
        answer:
          'Line breaks and spacing, and nothing else. Every comma and every existing line break becomes a new line, leading and trailing spaces are removed, and runs of whitespace inside a line collapse to a single space. The words come back exactly as you typed them.',
      },
      {
        question: 'Does it put the PIN code on its own line?',
        answer:
          'Only if you typed a comma before it. The tool splits at commas and line breaks, so Karnataka 560038 stays on one line while Karnataka, 560038 becomes two. Nothing in the tool recognises a PIN code as such.',
      },
      {
        question: 'Does it check the PIN code or the address?',
        answer:
          'No, it verifies nothing at all. A separate PIN code format checker on this site tests only the shape of a code — six digits with a non-zero first digit — and even that does not prove the code exists or is in use.',
      },
      {
        question: 'What happens to double commas and blank lines?',
        answer:
          'They collapse. Consecutive commas and newlines are treated as a single break and empty pieces are dropped, so a stray comma at the end of a line does not leave a blank line in the output.',
      },
      {
        question: 'Does it capitalise or reorder anything?',
        answer:
          'No. There is no title-casing, no expansion of state names, no reordering of the parts and no country line added. If the input reads bengaluru, the output reads bengaluru.',
      },
    ],
  },

  // lib/tools/creator-workbench.ts (the 'youtube-chapter-generator'
  // operation and the chapters/pairs/timestamp/clock/lines helpers) and
  // lib/tools/creator-workbench.test.ts
  'creator-and-social-youtube-chapter-generator': {
    directAnswer:
      'To build a YouTube chapter list: open the chapter generator, type one chapter per line as a timestamp, a pipe character and a title, then select Build result. It checks that the first chapter is at zero and that every later timestamp is higher, and rewrites the times in clock form.',
    leadParagraph:
      'This tool does not watch your video — it validates and reformats a list you supply. Each line must be timestamp, pipe, title, with both fields filled, as in 00:00 | Introduction. It refuses a list whose first chapter is not at 0, and refuses any chapter that is not strictly later than the one above it. What it does not check is how many chapters you have or how long each one lasts: two chapters a second apart pass here, even though YouTube itself asks for at least three chapters of at least ten seconds each. Count your chapters and check their spacing yourself before pasting the list into a description.',
    faqs: [
      {
        question: 'Does it generate the chapters from my video?',
        answer:
          'No. It takes a list you write and checks and reformats it. Nothing in the tool opens a video file, reads a transcript, detects scene changes or invents titles.',
      },
      {
        question: 'Why is my first chapter rejected?',
        answer:
          'Because the tool enforces a start at zero: if the first line is not at 0 seconds it stops and says the first chapter must start at 0:00. Add a line such as 00:00 | Introduction at the top of the list.',
      },
      {
        question:
          'Does it enforce the minimum of three chapters and ten seconds each?',
        answer:
          'No, and this is the gap to watch. The only rules it applies are that the first chapter is at zero and that every timestamp is strictly later than the one before, so a two-chapter list a second apart passes here and would still not produce chapters on YouTube. Check the count and the length of each chapter yourself.',
      },
      {
        question: 'What timestamp formats can I type?',
        answer:
          'One, two or three colon-separated whole numbers: 90, 01:25 or 1:01:01. Every part after the first must be 59 or lower, so 1:75 is refused. Output is normalised to M:SS below an hour and H:MM:SS from an hour up, which is why 00:00 comes back as 0:00.',
      },
      {
        question: 'How is the finished list formatted?',
        answer:
          'One line per chapter: the normalised timestamp, a single space, then the title, with the pipe removed. The tool accepts up to 10,000 lines, and the result has a copy button and a download button that saves it as a .txt file.',
      },
    ],
  },

  // lib/tools/creator-workbench.ts (the 'youtube-timestamp-formatter'
  // operation and the pairs/clock/lines helpers) and
  // lib/tools/creator-workbench.test.ts
  'creator-and-social-youtube-timestamp-formatter': {
    directAnswer:
      'To turn second counts into YouTube timestamps: open the timestamp formatter, type one entry per line as a number of seconds, a pipe character and a label, then select Build result. Each line comes back as a clock timestamp followed by its label, so 3661 | Long section becomes 1:01:01 Long section.',
    leadParagraph:
      'The conversion runs one way, from seconds to clock time: below an hour the output is M:SS and from an hour up it is H:MM:SS with the minutes and seconds zero-padded. Despite the field being labelled seconds | optional label, and the tool description promising optional labels, the label is not in fact optional — every line needs both fields filled, and a bare number on its own line is refused. Second values must be whole, not negative, and strictly increasing down the list, so duplicates and out-of-order entries stop the run. Unlike the chapter generator, the first line here does not have to be 0, which makes this the tool for a partial list. It never opens a video and never reads a timestamp back into seconds.',
    faqs: [
      {
        question: 'Is the label really optional?',
        answer:
          'No, despite the field label and the tool description both saying it is. Every line must contain exactly two non-empty fields separated by a pipe, so 85 on its own is rejected while 85 | Section two is accepted. Type a placeholder label if you do not have the real one yet.',
      },
      {
        question: 'Does the first line have to be zero?',
        answer:
          'No. That rule belongs to the chapter generator, not to this tool. Here the first value can be any whole number from 0 upwards, which is what makes it usable for a partial list of timestamps rather than a complete chapter set.',
      },
      {
        question: 'How are values of an hour or more formatted?',
        answer:
          'As H:MM:SS with the minutes and seconds zero-padded, so 3661 becomes 1:01:01. Below an hour the hour part is dropped entirely and the format is M:SS, so 85 becomes 1:25.',
      },
      {
        question: 'Why was my list rejected?',
        answer:
          'Second values must be whole numbers, must not be negative, and must increase strictly down the list. Repeating a value, or putting a smaller number after a larger one, stops the run with a message about non-negative whole numbers in ascending order.',
      },
      {
        question: 'Can it convert timestamps back into seconds?',
        answer:
          'No. This tool goes only from a number of seconds to a clock timestamp. There is no reverse mode, and it never reads a video file or a transcript.',
      },
    ],
  },
  // lib/tools/subtitles/transform.ts (syncToAnchors, scaleCues),
  // lib/tools/subtitles/core.ts, lib/tools/subtitle-workbench.ts and
  // lib/tools/subtitles/transform.test.ts
  'subtitles-sync-fixer': {
    directAnswer:
      'To fix subtitles that drift further out of step as the video goes on: load the .srt, .vtt, .sbv, .lrc or .ass file, type the true time of the FIRST subtitle and the true time of the LAST one, and run it. The tool works out a single stretch factor and a single shift from those two anchors and applies both to every cue, so both moments land exactly where you said they were.',
    leadParagraph:
      'Subtitles that start about right but are seconds out by the end are wrong by a rate, not by a constant, which is why moving every line by the same amount never fixes them. This tool takes two known moments and stretches the whole file between them; it reports the factor it used to six decimal places, and says so when the factor works out to exactly 1 and only a shift was needed. Every time is held as whole milliseconds rather than a float, so the arithmetic does not accumulate error across a long file. What it will not do is find the drift for you — you have to watch the video and read the two true times off your player yourself.',
    faqs: [
      {
        question: 'What exactly do I type into the two time boxes?',
        answer:
          'The true time of the first subtitle and the true time of the last one, as you read them off your player. Each box accepts a timecode such as 00:01:23,500 or a plain number of seconds such as 83.5. The last time must be later than the first, and a file whose first and last subtitles start at the same moment is refused, because there is nothing to stretch between.',
      },
      {
        question:
          'How is this different from shifting subtitles by a fixed amount?',
        answer:
          'A shift moves every line by the same number of seconds. Two-point sync multiplies every time by a factor and then shifts, which is the only correction that fixes a file that is close at the start and seconds out at the end. If the two anchors you give imply a factor of 1, the tool tells you a plain shift was all that was needed.',
      },
      {
        question: 'Which subtitle formats does it read and write?',
        answer:
          'It reads SubRip (.srt), WebVTT (.vtt), YouTube SBV (.sbv), LRC lyrics and SubStation Alpha (.ass/.ssa), and saves as SRT, VTT, SBV, LRC or plain text. A chosen file may be up to 8 MB, or you can paste the subtitles into the box instead. The character encoding is worked out from the bytes — a UTF-16 or UTF-8 byte order mark first, then strict UTF-8, then Windows-1252 — and the one that was used is reported rather than assumed.',
      },
      {
        question: 'Does the saved file record what was changed?',
        answer:
          'Only when you save as WebVTT. WebVTT has a NOTE syntax that can carry the stretch factor and the shift without a player displaying them. SubRip, SBV and LRC have no comment syntax at all, so a note written into those would be text a player tries to show on screen; those formats come back exactly as the format defines them.',
      },
      {
        question: 'What happens if part of my file cannot be read?',
        answer:
          'Nothing is produced. If any block of the file fails to parse, the run stops and names the first three unreadable blocks, instead of quietly dropping cues you would never miss. If the format was detected wrongly, you can choose it by hand rather than leaving the selector on automatic.',
      },
    ],
  },

  // lib/tools/subtitles/transform.ts (convertFrameRate, FRAME_RATES),
  // lib/tools/subtitle-workbench.ts and lib/tools/subtitles/transform.test.ts
  'subtitles-frame-rate-converter': {
    directAnswer:
      'To retime subtitles made for one frame rate so they match a video running at another: load the subtitle file, choose the rate the subtitles were timed for and the rate the video actually runs at, then run it. Every start and end time is multiplied by the first rate divided by the second and rounded to whole milliseconds.',
    leadParagraph:
      'A file timed for 25 fps PAL played against a 23.976 fps transfer runs slow by the ratio of the two — about four per cent, which is minutes of error across a feature and is why captions look progressively later as a film goes on. The tool offers the five rates this actually happens between: 23.976 (NTSC film), 24 (cinema), 25 (PAL), 29.97 (NTSC video) and 30, in either direction. It reports the exact factor it applied, so 25 to 23.976 is shown as ×1.042709 rather than described vaguely. It cannot detect your video\x27s frame rate; you need that from the player or the file\x27s own properties.',
    faqs: [
      {
        question: 'Which frame rates can I convert between?',
        answer:
          'Any pair of 23.976, 24, 25, 29.97 and 30 fps, in either direction. Choosing the same rate for both is refused with a message saying nothing would change, rather than handing back an identical file as though work had been done.',
      },
      {
        question: 'How is the new timing calculated?',
        answer:
          'Every start and end time is multiplied by the source rate divided by the target rate, then rounded to a whole number of milliseconds. Converting 25 fps subtitles for a 23.976 fps video is a factor of ×1.042709, so a cue at 10:00 moves to about 10:25. The factor used is printed with the result to six decimal places.',
      },
      {
        question:
          'Will this fix subtitles that are simply a few seconds late throughout?',
        answer:
          'No. A constant lag is an offset, not a rate error, and a frame rate conversion would make it worse by stretching the file as well. Use the shift operation for a constant lag, and two-point sync when the error grows as the video plays.',
      },
      {
        question: 'Are positioning and styling kept?',
        answer:
          'Only what the output format can hold. WebVTT cue identifiers and positioning settings are carried across when the source had them. SubRip has no way to store positioning, fonts or colours, so converting to .srt keeps the words and the times exactly and drops the rest. A SubStation file using overrides such as {\\an8} is flagged when it is read, so the loss is never silent.',
      },
      {
        question: 'What are the input limits?',
        answer:
          'One subtitle file of up to 8 MB, in SubRip, WebVTT, SBV, LRC or SubStation Alpha, or text pasted into the box. If any block of the file cannot be read the run stops and names it, so a converted file never quietly contains fewer cues than the one you started with.',
      },
    ],
  },

  // lib/tools/subtitles/transform.ts (mergeDocuments, shiftCues),
  // lib/tools/subtitle-workbench.ts (subtitle-merge, requireTime) and
  // lib/tools/subtitles/transform.test.ts
  'subtitles-joiner': {
    directAnswer:
      'To join two subtitle files for a video assembled from two parts: load the first file, load the second, and type the time at which the second file\x27s own 00:00 should land — normally the exact length of the first video. Every cue in the second file is moved by that offset, the two sets are merged into one document in time order, and the result is renumbered from one.',
    leadParagraph:
      'When a film arrives as two parts with a subtitle file each, the second file starts again at zero, so it has to be pushed out by the length of the first part before the two can become one. This tool does exactly that and nothing more: it reads both files, shifts the second, and writes a single file sorted by start time. The two inputs do not have to be the same format — a WebVTT second half can be joined to a SubRip first half — and you choose what the joined file is saved as. It will not work out the offset for you, and it does not check the seam for overlaps.',
    faqs: [
      {
        question: 'What should I put in the offset box?',
        answer:
          'The point where the second file\x27s own 00:00 belongs on the joined timeline, which is normally the exact running length of the first video. It accepts a timecode such as 00:45:12,000 or a number of seconds. A negative offset is refused, and so is one that would push any cue before the start of the video.',
      },
      {
        question: 'Can I join three or more files at once?',
        answer:
          'No. This operation takes exactly two files, a first and a second. To join three, join the first two, save the result, then join that file to the third with the combined length as the new offset.',
      },
      {
        question: 'Do both files have to be in the same format?',
        answer:
          'No. Each file\x27s format is detected on its own, or you can set it by hand for either one, and each may be SubRip, WebVTT, SBV, LRC or SubStation Alpha. The joined file is written in whichever format you pick — SRT, VTT, SBV, LRC or plain text — and numbering restarts from one across the whole result.',
      },
      {
        question: 'Does it check the join for overlapping subtitles?',
        answer:
          'No. It places the second file exactly where you tell it and sorts by start time; if your offset is a little short, cues from the two halves will overlap and nothing will say so. Running the joined file through the caption check afterwards lists every overlap with the cue number and the size of the overlap.',
      },
    ],
  },

  // lib/tools/subtitles/transform.ts (checkSubtitles, MAX_LINE_LENGTH,
  // MAX_LINES, MAX_CHARS_PER_SECOND, MIN_DURATION_MS, plainText),
  // lib/tools/subtitle-workbench.ts and lib/tools/subtitles/transform.test.ts
  'subtitles-caption-checker': {
    directAnswer:
      'To check a caption file against the usual broadcast readability limits: load the .srt, .vtt, .sbv, .lrc or .ass file and run the check. It writes a plain-text report naming every cue that overlaps the one before it, sits on screen for less than 700 ms, runs to more than two lines, has a line longer than 42 characters, or reads faster than 21 characters a second — and it changes nothing.',
    leadParagraph:
      'Most caption files that get sent back break one of a small set of numbers somewhere in the middle, where nobody scrolled. This report names the limits it used on the report itself, and lists each problem against the cue number and the timecode it is at, so you can go straight to it in your editor. It also gives the cue count, the first start time, the last end time, the total time text is on screen and the number of characters. Nothing is corrected — these are the common broadcast conventions rather than any one broadcaster\x27s rulebook, so the tool reports and leaves the judgement to you.',
    faqs: [
      {
        question: 'Which limits does the check use?',
        answer:
          'At most two lines per cue, at most 42 characters on a line, a reading speed of at most 21 characters a second, and at least 700 ms on screen. It also flags a cue with no words in it, a cue that ends at or before it starts, and a cue that overlaps the one before it — reporting the overlap in milliseconds, for example "Overlaps cue 1 by 1000 ms".',
      },
      {
        question: 'Do formatting tags count towards the line length?',
        answer:
          'No. Italic and font tags such as <i>, and SubStation overrides such as {\\an8}, are stripped before anything is counted, so a line is measured as the words a viewer actually reads. The same stripped text is used for the reading-speed figure.',
      },
      {
        question: 'How is reading speed worked out?',
        answer:
          'The characters of a cue divided by the seconds it is on screen. Anything above 21 characters a second is listed with the measured figure to one decimal place, so you can tell a cue that is marginally fast from one that is impossible to read.',
      },
      {
        question: 'Does it report cues that are in the wrong order?',
        answer:
          'Not on this page. The file is sorted by start time before the check runs, so the report is always in time order and an out-of-order cue is simply read in its correct place. Overlaps between neighbouring cues are still found and listed.',
      },
      {
        question: 'Can it fix what it finds?',
        answer:
          'No — the check never alters the file. The separate clean-up operation is the one that strips formatting tags, drops cues with no words, enforces a minimum time on screen and pulls back a cue that runs into the next one, and it counts every change it makes so you can see what was altered.',
      },
    ],
  },

  // lib/tools/audio/mp3.ts (parseMp3, sliceMp3, parseTimecode),
  // lib/tools/audio/mp3-frames.ts, lib/tools/audio/mp3.test.ts and
  // components/mp3-toolkit-tool.tsx
  'audio-mp3-cutter': {
    directAnswer:
      'To cut a section out of an MP3 without re-encoding it: choose the file, type a start and an end time such as 1:23.5, 83.5 or 1:02:03, and cut. The compressed MPEG frames covering that range are copied straight through, so the clip keeps the original bitrate, sample rate and channel layout exactly.',
    leadParagraph:
      'An MP3 is a stream of fixed-length frames, and a cut that copies whole frames changes nothing about the audio it keeps — no decoder and no encoder is involved, so there is no generation loss. The trade is resolution in time: an MPEG-1 Layer III frame is 1,152 samples, about 26 ms at 44.1 kHz, so both edges expand outward to the enclosing frame boundary and the page reports how far each one moved. The page accepts MP3 only, up to 100 MB a file; when no MPEG frames are found it says so and names M4A, WAV, FLAC and OGG as formats it cannot cut this way. Before the download is offered, the clip is read back through the same parser that read your original.',
    faqs: [
      {
        question: 'How exact is the cut?',
        answer:
          'To a frame, not to an arbitrary point in time. Both edges move outward to the frame boundary enclosing them, so the clip always contains everything you asked for and at most one extra frame at each end. The result panel shows the drift at each edge to one decimal place, so the imprecision is stated rather than hidden — at 44.1 kHz a frame is 1,152 samples, about 26 ms.',
      },
      {
        question: 'Does cutting reduce the audio quality?',
        answer:
          'No. The frames are copied byte for byte with nothing decoded or re-encoded, so the clip is the original audio. There is one caveat inherent to every lossless MP3 cut: a frame may borrow up to 511 bytes from the frames before it, the bit reservoir, so the opening moment after a cut can decode slightly differently from the same moment in the source.',
      },
      {
        question: 'What happens to the ID3 tags and the track length?',
        answer:
          'Title, artist, album and the rest are carried across by default and written as a fresh ID3v2 tag. The source file\x27s old Xing or Info bitrate header is not copied; where one is needed, a new one is written with the real frame and byte counts of the clip, so players show the clip\x27s length rather than the original\x27s.',
      },
      {
        question: 'What time formats can I type?',
        answer:
          '1:23.5, 83.5 and 1:02:03 all work, so a timestamp pasted from a player is accepted as it is. A start time past the end of the file is refused and the message names the file\x27s real length; an end time beyond the file is pulled back to the last frame instead of failing.',
      },
      {
        question: 'Which files will it refuse?',
        answer:
          'Anything over 100 MB, and anything that is not MPEG audio — the error names the file type rather than guessing. A file that holds tags but no audio, or only a bitrate header and no audio frames, is refused by name too. Junk found between frames is counted and reported rather than treated as sound.',
      },
    ],
  },

  // lib/tools/audio/mp3.ts (joinMp3, assemble, retagMp3),
  // lib/tools/audio/mp3.test.ts and components/mp3-toolkit-tool.tsx
  'audio-mp3-joiner': {
    directAnswer:
      'To join MP3s end to end without re-encoding them: choose two or more files, set their order with the arrows, and join. Each file\x27s frames are copied through in that order into one MP3, and a correct bitrate header is written for the combined length.',
    leadParagraph:
      'Joining by copying frames keeps every file\x27s audio exactly as it was, but it only works when the streams have the same shape. Files must share a sample rate, a channel count and an MPEG version and layer; when one does not match, the join is refused and the message names both files and the value each has, because concatenating mismatched streams would play at the wrong speed after the seam. Differing bitrates are fine — the joined file is simply variable bitrate and gets a Xing header with the real frame and byte counts. The page reads MP3 only, up to 100 MB a file, and re-reads the joined file with the same parser before offering it.',
    faqs: [
      {
        question: 'What has to match between the files?',
        answer:
          'Sample rate, channel count and MPEG version and layer. Bitrate does not have to match. When something does not match, nothing is produced and the error names the two files and the values — for example that one file is 48,000 Hz while the first is 44,100 Hz, or that one is mono and the first is stereo.',
      },
      {
        question: 'Is there a gap, a crossfade or gap trimming at the join?',
        answer:
          'None of them. The frames of each file are placed one after another exactly as they were, so the join is a hard cut on a frame boundary. Nothing is faded, nothing is padded with silence and no existing silence is trimmed.',
      },
      {
        question: 'Which file\x27s tags does the joined file get?',
        answer:
          'The first file\x27s, rewritten as a fresh ID3v2 tag. The other files\x27 tags are not merged in, and any trailing ID3v1 or APE tag on any of the inputs is left behind rather than ending up in the middle of the result.',
      },
      {
        question: 'How many files can I join, and how is the order set?',
        answer:
          'At least two — a single file is refused — and each may be up to 100 MB. They are joined top to bottom in the order shown on the page, and each row has arrows to move it earlier or later before you join.',
      },
      {
        question: 'Is the audio re-encoded at any point?',
        answer:
          'No. No decoder and no encoder runs; the compressed frames are copied and only the tag and the bitrate header around them are new. The result panel states this alongside the frame count that was copied.',
      },
    ],
  },

  // lib/tools/pdf/engine.ts (mergePdfInputs, inspectPdfInputs, loadPdf),
  // lib/tools/pdf/engine.test.ts and components/pdf-merge-tool.tsx
  'pdf-merge-pdf': {
    directAnswer:
      'To combine several PDFs into one: choose the files, set their order with the up and down arrows, and merge. Every page of every file is copied into a new document in that order, and the saved bytes are opened again and their page count checked against the total of the inputs before a download is offered.',
    leadParagraph:
      'This page joins whole PDFs in the order you set — up to 20 files at a time and 150 MB across all of them — using pdf-lib inside the browser tab. Each row of the list shows a file\x27s page count and size, so you can check what you are about to join before you join it. What the current scope covers is page content and page order: bookmarks, digital signatures, form fields, attachments and document-level metadata are not yet guaranteed to survive, and the page says so above the button. An encrypted PDF is refused with a message to remove its password locally first, rather than being half-read.',
    faqs: [
      {
        question: 'How many PDFs can I combine at once, and how large?',
        answer:
          'Up to 20 files, and 150 MB in total across them. Both limits are checked when you choose the files, and the message names which one you reached. The 20-file limit counts files already in the list, so you can add them in batches up to that total.',
      },
      {
        question: 'How do I control the order the pages end up in?',
        answer:
          'Files are joined top to bottom in the list shown on the page. Every row has an arrow to move that file earlier, an arrow to move it later, and a button to remove it. Pages within a file keep their own order; this tool does not reorder or drop pages inside a file.',
      },
      {
        question: 'What is not carried across?',
        answer:
          'Bookmarks, digital signatures, form fields, attachments and document-level metadata. The scope today is page content and page order. If your files carry any of those, open the result and check before you rely on it.',
      },
      {
        question: 'What happens with an encrypted or damaged file?',
        answer:
          'An encrypted PDF is refused with advice to remove its password locally and try again. A file that is not a PDF is refused on its first five bytes, before any parsing. In both cases the error identifies only the file you chose — nothing read from inside it appears in the message.',
      },
      {
        question: 'How do I know the result is complete?',
        answer:
          'The saved bytes are loaded again as a PDF and the page count is compared with the number of pages that went in. If the two disagree the run fails instead of handing you a file, and that check runs every time rather than on request. The result panel reports the page count and how long the work took.',
      },
    ],
  },

  // lib/tools/pdf/engine.ts (compressPdf, isRecompressibleJpeg),
  // lib/tools/pdf/jpeg-reencode.ts, lib/tools/pdf/engine.test.ts and
  // components/pdf-compress-tool.tsx
  'pdf-compress-pdf': {
    directAnswer:
      'To make a PDF smaller in the browser: choose the file, decide whether to re-encode the photos inside it, and run it. The document is rewritten with object streams, eligible JPEGs are optionally re-encoded at the quality and maximum edge you choose, and the real before and after sizes are reported.',
    leadParagraph:
      'There are two passes here and both are measured rather than estimated. The first is lossless — the file is rewritten using object streams, and the title, author, subject, keywords, producer and creator can be cleared — and it changes nothing visible on the page. The second is optional, and is where the size usually is: embedded JPEGs are decoded and re-encoded through the browser\x27s own canvas at a quality between 40 and 95 per cent, and scaled down first if their longest edge is over the limit you picked. A PDF that is mostly text has very little to give up, and if the rewritten file is not smaller than the original you are handed your original back, byte for byte, with the page saying exactly that.',
    faqs: [
      {
        question: 'Which images get re-encoded, and which are left alone?',
        answer:
          'Only an image stream that can be rewritten without changing how the page renders: a single DCTDecode (JPEG) filter, 8 bits per component, a DeviceRGB or DeviceGray colour space, and no custom decode array or decode parameters. A CMYK photo, an indexed or separation colour space, or a Flate-encoded image is counted as left alone rather than risk shifting the document\x27s colour. The result panel reports how many images were re-encoded.',
      },
      {
        question: 'What do the two photo controls do?',
        answer:
          'Photo quality is a JPEG quality between 40 and 95 per cent, 70 by default. Largest photo edge caps the longest side of an embedded image at 4000, 2400, 1600 or 1000 pixels, and anything bigger is scaled down before re-encoding. A re-encoded image is only kept when its new bytes are genuinely smaller than the old ones; otherwise the original image stays in the file.',
      },
      {
        question: 'What happens if the file cannot be made smaller?',
        answer:
          'You get your original file back unchanged, and the page says the PDF was already as small as it can make it, with a note that a text-heavy PDF has little to squeeze and that the gains come from photos. Returning a larger file under a heading about size would be untrue, so the output is compared with the input before anything is offered.',
      },
      {
        question: 'Can it change the pages or the text?',
        answer:
          'No. Text and vector content are never touched — only image streams are rewritten, and only those that qualify. After the rewrite the file is opened again and its page count compared with the original; a mismatch fails the run rather than producing a file.',
      },
      {
        question: 'What are the limits, and does clearing metadata help?',
        answer:
          'One PDF of up to 150 MB. Clearing the title, author, subject, keywords, producer and creator is switched on by default: it saves very little in bytes, but that metadata often names the person and the software that made the file. Where the browser cannot re-encode images at all, the run falls back to the lossless rewrite and reports that no images were touched.',
      },
    ],
  },

  // lib/tools/pdf/engine.ts (transformPdfPages), lib/tools/pdf/protocol.ts,
  // lib/tools/pdf/engine.test.ts and components/pdf-page-tools.tsx
  'pdf-rotate-pdf': {
    directAnswer:
      'To turn the pages of a PDF: choose the file, leave the page list as it is, pick 90°, 180° or 270° clockwise, and apply. The angle you choose is added to each page\x27s existing rotation, and after saving the file is opened again and every page checked to be sitting on a whole quarter turn.',
    leadParagraph:
      'Rotation here is a page property, not a redraw: the page content is copied unchanged and only the rotation value moves, so nothing is rasterised and no quality is lost. One angle applies to every page in the output, so turning only some pages means listing just those pages, running it, and putting the file back together afterwards — there is no per-page angle on this screen. The same page also reorders and removes pages, adds page numbers and a watermark, and writes document metadata, all in a single pass. It takes one PDF of up to 150 MB, and an encrypted file is refused with advice to remove its password locally first.',
    faqs: [
      {
        question: 'Which angles are available?',
        answer:
          'No rotation, 90° clockwise, 180°, or 270° clockwise. The angle is added to whatever rotation the page already carries and reduced modulo 360, so a page already turned 90° that you rotate 90° again ends up at 180°. To turn a page anticlockwise, choose 270°.',
      },
      {
        question: 'Can I rotate one page and leave the others alone?',
        answer:
          'Not in a single pass — the angle applies to every page in the output. What works is to put only the pages that need turning into the page list, rotate them, and merge that file back with the rest afterwards.',
      },
      {
        question: 'Does rotating redraw or degrade the pages?',
        answer:
          'No. The rotation is stored as a page attribute and the page content is copied as it is, so there is no rasterising and no loss of text or vectors. After saving, the file is reopened and every page\x27s rotation is checked to be a multiple of 90 before the download is offered; if any page is not, the run fails.',
      },
      {
        question: 'What else changes when I apply?',
        answer:
          'The pages are copied into a newly created document, so document-level metadata from the source does not come across: what gets written is whatever you type into the title, author, subject and keywords boxes, plus a producer of "Browser Tools". A watermark of up to 80 characters is drawn across the middle of each page at 20 per cent opacity when you enter one, and page numbers, when switched on, are set in 10 pt Helvetica centred near the foot of the page.',
      },
    ],
  },

  // lib/tools/pdf/engine.ts (transformPdfPages),
  // lib/tools/pdf/page-selection.ts, lib/tools/pdf/page-selection.test.ts and
  // components/pdf-page-tools.tsx
  'pdf-reorder-pdf-pages': {
    directAnswer:
      'To put a PDF\x27s pages into a different order: choose the file and type the page numbers in the order you want them, such as 3, 1-2. The pages are copied into a new document in exactly that order, and any page you leave out of the list is left out of the file.',
    leadParagraph:
      'The page list is the whole interface: commas separate entries, a hyphen makes a range, and the order you type is the order you get. Leaving a page out removes it, which is why the same box is also how pages are deleted. Two things it will not do: a page listed twice still appears once, because repeats are dropped, and a range that runs backwards is refused with the right way round suggested — so a document cannot be reversed by typing 10-1. It takes one unencrypted PDF of up to 150 MB, and the pages themselves are copied whole, so their content, size and orientation are untouched.',
    faqs: [
      {
        question: 'How do I write the page order?',
        answer:
          'Page numbers and ranges separated by commas — 3, 1-2 moves page three to the front of a three-page file. Spaces around a hyphen are accepted. Any number outside your document is refused with the valid range quoted back, and a single range may cover at most 2,000 pages.',
      },
      {
        question: 'Can I repeat a page so it appears twice?',
        answer:
          'No. Repeated numbers are dropped, so 1, 1, 2 produces a two-page file. If you need a page twice, extract it into its own file and merge that file in at the position you want.',
      },
      {
        question: 'Can I reverse a document by typing 10-1?',
        answer:
          'No. A backwards range is refused and the message suggests 1-10 instead, because a range that silently reversed itself would be a different operation from the one you typed. Reversing means writing the numbers out in the order you want them.',
      },
      {
        question: 'How do I delete pages rather than reorder them?',
        answer:
          'Leave them out of the list. There is no separate delete box: on a ten-page document, typing 2-9 keeps eight pages and drops the first and the last. Reordering and removing are the same pass, so you can do both at once.',
      },
      {
        question: 'Is the result checked before I download it?',
        answer:
          'Yes. The saved file is loaded again and its page count compared with the number of pages you asked for, and every page\x27s rotation is checked to be a whole quarter turn. A mismatch fails the run instead of producing a file.',
      },
    ],
  },

  // lib/tools/pdf/engine.ts (extractPdfPages),
  // lib/tools/pdf/page-selection.ts and components/pdf-extract-tool.tsx
  'pdf-extract-pdf-pages': {
    directAnswer:
      'To pull selected pages out of a PDF into a file of their own: choose the PDF, type the pages as numbers and ranges — 1-3, 5, 8-10 — and extract. The pages are copied whole into a new document in the order you listed them, and the file on your disk is not modified.',
    leadParagraph:
      'This is the keep-only-these half of page editing: whatever you list is what the new PDF contains, in your order. The document\x27s page count is read as soon as you choose it, so a number your file does not have is rejected before any work starts, with the valid range quoted. Duplicates are removed, and one range can cover at most 2,000 pages. Pages come across as pages — content, size and rotation unchanged — because they are copied rather than redrawn; it takes one PDF of up to 150 MB, and an encrypted file is refused with advice to remove its password locally first.',
    faqs: [
      {
        question: 'How do I write the page selection?',
        answer:
          'Numbers and ranges separated by commas, such as 1-3, 5, 8-10, with spaces around a hyphen allowed. Anything that is not a number or a range is refused and the offending part is quoted back, so a typo stops the run rather than quietly extracting the wrong pages.',
      },
      {
        question: 'Does the order I type change the order of the output?',
        answer:
          'Yes. Pages appear in the order you list them, so 5, 1 gives a two-page file that starts with page five. Listing a page twice does not produce it twice — repeats are removed — so the output page count is the number of distinct pages you named.',
      },
      {
        question: 'Are the extracted pages altered in any way?',
        answer:
          'The pages themselves are copied, so page content, page size and rotation are as they were, and the file is saved with object streams. What does not follow is the material around the pages: the output is a newly created document rather than a trimmed copy of the original, so document-level metadata does not come across.',
      },
      {
        question: 'How large a PDF can I work with?',
        answer:
          'One file of up to 150 MB. Larger files are refused when you choose them. The page count is read first and shown on the page, so you can write the selection against the real number of pages rather than guessing.',
      },
      {
        question: 'Is the extracted file verified?',
        answer:
          'Yes. After saving it is opened again and its page count compared with how many pages you asked for. If the two do not match the run fails rather than offering a download, and the result panel shows the page count along with the input and output sizes.',
      },
    ],
  },

  // lib/tools/pdf/engine.ts (imagesToPdf, hasImageSignature,
  // FIXED_PAGE_SIZES), lib/tools/pdf/protocol.ts,
  // lib/tools/pdf/engine.test.ts and components/images-to-pdf-tool.tsx
  'pdf-images-to-pdf': {
    directAnswer:
      'To turn JPEG or PNG images into a single PDF: choose the images, set their order with the arrows, pick a page size and a margin, and generate. Each image becomes one page, centred and scaled to fit inside the margins with its proportions kept.',
    leadParagraph:
      'JPEG and PNG only, up to 40 images and 100 MB in total, one page per image in the order shown on the page. The fixed sizes are A4 (595.28 × 841.89 points) and US Letter (612 × 792), with orientation matched to each image or forced to portrait or landscape; choosing "Fit each image" instead makes every page exactly the size of its image plus the margin and never enlarges the image. Margins are none, small, medium or large — 0, 12, 24 or 36 points. Every file is verified against its declared type by its own signature bytes, so something renamed to .png that is not a PNG is refused rather than embedded.',
    faqs: [
      {
        question: 'Which image formats are accepted?',
        answer:
          'JPEG and PNG. The bytes are checked against the type before embedding — a JPEG must begin FF D8 FF and a PNG with the eight-byte PNG signature — so a mislabelled or truncated file is refused and the page it would have become is never written. HEIC, WebP, TIFF, GIF and SVG are not accepted here.',
      },
      {
        question: 'How many images can go into one PDF?',
        answer:
          'Up to 40, and 100 MB across all of them. Both are checked as you add files, and adding more than 40 is refused with that number named. Files are placed one per page, top to bottom in the list, and each row has arrows to move it before you generate.',
      },
      {
        question: 'How is each image placed on its page?',
        answer:
          'Centred, with its aspect ratio kept, scaled to fit the page minus the margin on all four sides. On A4 or US Letter an image smaller than the printable area is scaled up to fill it; with "Fit each image" the page is built around the image, so the image is used at its own pixel size and never enlarged. A margin that would leave no printable area is refused.',
      },
      {
        question: 'Does it re-compress my photos?',
        answer:
          'The tool itself does not resize or re-encode them: the bytes you chose are passed to the PDF library\x27s JPEG or PNG embedder as they are. The page size and margin change how the image is scaled when the page is displayed or printed, not the image data that goes into the file.',
      },
      {
        question: 'Is the generated PDF checked?',
        answer:
          'Yes. It is loaded again after saving and its page count compared with the number of images you supplied; a mismatch fails the run. The producer is set to "Browser Tools" and the creation date to the moment the file was made.',
      },
    ],
  },

  // lib/tools/image.ts (validateCrop, transformedDimensions, canvasFilter,
  // supportedRasterTypes), lib/tools/image.test.ts and
  // components/image-editor-tool.tsx
  'image-image-cropper': {
    directAnswer:
      'To crop an image to exact pixel coordinates: choose a JPEG, PNG or WebP of up to 25 MB, type the crop\x27s X, Y, width and height into the four boxes, and export. The rectangle is taken from the source pixels with the browser\x27s canvas, and the saved file\x27s dimensions are read back and compared with what was asked for before the download is offered.',
    leadParagraph:
      'The crop is numeric rather than drawn: four whole-number boxes in the image\x27s own pixels, with X and Y measured from the top-left corner. That is exactly right when you already know the rectangle — from a specification, a screenshot grid, or a crop you made before — and it is the wrong tool when you want to drag a box by eye, because there is no drag handle and no aspect-ratio preset. When an image is loaded the four boxes start at its full size, so you narrow down from there. The same screen also turns the image in quarter turns, flips it, adjusts brightness, contrast, greyscale and sepia, and saves as WebP, JPEG or PNG.',
    faqs: [
      {
        question: 'How do I set the crop area?',
        answer:
          'X and Y are the top-left corner of the crop in the image\x27s own pixels, and width and height are its size. All four must be whole numbers, width and height at least 1, and the rectangle has to stay inside the image; if it does not, the run is refused and the message quotes the image\x27s real dimensions in pixels.',
      },
      {
        question: 'Is there a drag handle or a square or 16:9 preset?',
        answer:
          'No. Crops are typed as numbers and there are no ratio presets, so a fixed-ratio crop means working the numbers out yourself. In exchange, the same numbers give the same crop every time, which a dragged box cannot promise.',
      },
      {
        question:
          'Which formats can I save as, and what does the quality slider do?',
        answer:
          'WebP, JPEG or PNG, with a quality slider from 10 to 100 per cent that applies to the lossy formats. Because JPEG has no transparency, the canvas is filled white before the crop is drawn when you save as JPEG. Some browsers answer a WebP request with a different format; when that happens the tool reports the format the browser really produced rather than naming the file for a format it is not.',
      },
      {
        question: 'What are the size limits?',
        answer:
          'A source image of up to 25 MB in JPEG, PNG or WebP, and a result of no more than 64 megapixels — that is width × height after the crop and any quarter turn. Anything larger is refused with the limit named rather than failing silently in the canvas.',
      },
      {
        question: 'Is EXIF metadata kept in the cropped file?',
        answer:
          'No. The crop is drawn onto a canvas and re-encoded by the browser, and nothing in this tool writes metadata back, so the saved file carries no EXIF from the original — no camera settings and no GPS location. If you need that information, keep the original file as well.',
      },
    ],
  },
  // lib/tools/background-removal/u2netp.ts, workers/background-removal.worker.ts,
  // components/image-editor-tool.tsx, lib/tools/image.ts,
  // lib/security/content-security-policy.ts, and u2netp.test.ts / image.test.ts
  'image-background-remover': {
    directAnswer:
      'To remove a background without uploading the photo: open the OpenTools background remover, choose a JPEG, PNG or WebP file, and the cut-out starts on its own. AI Subject mode runs the U²-Net small model (u2netp) in a Web Worker inside your tab; Solid Color mode instead clears one colour you pick. Save the result as PNG or WebP, the two formats that can hold transparency.',
    leadParagraph:
      'The subject cut-out runs u2netp through ONNX Runtime Web on a single WebAssembly thread; the weights are about 4.4 MB and the runtime binary about 12 MB, and both are served from this site, which is why this page allows same-origin requests (connect-src \x27self\x27) instead of blocking every connection. The model sees your image squashed into a fixed 320 x 320 square, so the mask it returns is 320 x 320 and is stretched back over the full-resolution photo; fine edges are limited by that. Source images must be JPEG, PNG or WebP and no larger than 25 MB, and the edited result is capped at 64 megapixels. If fewer than 0.2% of the mask pixels come back as foreground the tool stops with "No clear subject was found in this image. Try Solid Color mode." rather than handing you a blank picture.',
    faqs: [
      {
        question:
          'What is the difference between AI Subject and Solid Color mode?',
        answer:
          'AI Subject runs the U²-Net small model on your image and keeps whatever it scores as the subject, so it can work on a photograph with a busy background. Solid Color does no inference at all: it clears every pixel within a chosen distance of one colour you pick, with a default tolerance of 36 and an edge softness of 24 measured as straight-line RGB distance. Solid Color is limited to 16 megapixels per image; AI Subject is bounded by the 64 megapixel canvas cap that applies to every edit here.',
      },
      {
        question: 'Why can I not save the result as a JPEG?',
        answer:
          'JPEG has no alpha channel, so it cannot carry a transparent background. With background removal switched on the tool refuses JPEG with "Choose PNG or WebP to preserve the transparent background." and defaults the output to PNG. If you want a flat background instead, turn background removal off: the editor then fills the canvas with white before drawing, which is what JPEG output needs.',
      },
      {
        question: 'Does the model run on a server?',
        answer:
          'No. The weights (u2netp.onnx) and the ONNX Runtime WebAssembly binary are static files on this site, fetched by a Web Worker in your own tab, and this page\x27s Content Security Policy allows connections to this site only, so no third-party origin is reachable. The worker is terminated as soon as the cut-out finishes or you leave the page, so it does not sit holding the model afterwards.',
      },
      {
        question: 'Why are the edges of my cut-out rough?',
        answer:
          'The mask is produced at 320 x 320 pixels and then scaled up to your image\x27s own size with smoothing, so it cannot resolve detail finer than that grid. Hair, fur, fine mesh and thin branches are where this shows first. For a photo taken against a plain backdrop, Solid Color mode with a raised edge softness often gives a cleaner edge than the model does.',
      },
      {
        question: 'Which files does it refuse?',
        answer:
          'Anything that is not a static JPEG, PNG or WebP is refused with "Choose a static JPEG, PNG, or WebP image.", and a file over 25 MB with "This candidate limits source images to 25 MB." HEIC, AVIF, TIFF, GIF and RAW camera files are not accepted. After encoding, the tool also re-reads the saved image and refuses to hand you a file whose dimensions do not match what it drew.',
      },
    ],
  },

  // lib/tools/metadata/index.ts, jpeg.ts, png.ts, webp.ts, types.ts,
  // lib/tools/metadata/golden.test.ts and components/metadata-tool.tsx
  'image-exif-remover': {
    directAnswer:
      'To strip EXIF from a photo without uploading it: open the OpenTools photo metadata tool, choose a JPEG, PNG or WebP file up to 50 MB, read what it found, then save the cleaned copy. The tool rewrites the container only: it deletes the metadata blocks and copies the compressed image data through untouched, so the picture is never re-encoded and loses no quality.',
    leadParagraph:
      'A photo from a phone or camera usually carries an EXIF block holding GPS coordinates, the camera make, model and serial number, an owner name and the exact moment of the shot; PNG and WebP files carry similar information in their own chunks. This tool parses those blocks, shows you every field it can read, and writes a copy with them removed. It handles JPEG, PNG and WebP only, and refuses anything else with "Unsupported file container." It cannot remove anything that is part of the picture itself, such as a date the camera burned into the corner.',
    faqs: [
      {
        question: 'Does stripping metadata reduce the image quality?',
        answer:
          'No. The compressed image data is copied across byte for byte and only the metadata segments around it are dropped; the pixels are never decoded and re-encoded. Frozen tests in this repository compare the JPEG scan data, the PNG IDAT chunks and the WebP VP8 chunk before and after stripping and require them to be identical.',
      },
      {
        question: 'What exactly is removed from a JPEG?',
        answer:
          'The EXIF block (APP1), any XMP metadata packet, JPEG comment blocks (COM), the IPTC metadata record (APP13), other APPn application segments, and any bytes sitting after the end-of-image marker, which is where a phone hides the video half of a motion photo. The JFIF header (APP0), the ICC colour profile (APP2) and the APP14 colour-transform segment are kept, because dropping those changes how the picture is displayed.',
      },
      {
        question: 'Will my photo come out rotated?',
        answer:
          'No. Orientation is an EXIF tag, so deleting the whole EXIF block would silently rotate phone photos on download. When the source declares a rotation (orientation 2 to 8) the tool writes a fresh minimal APP1 segment whose only tag is orientation: no GPS, no serial number, no timestamp and no thumbnail travel with it.',
      },
      {
        question: 'What is removed from PNG and WebP files?',
        answer:
          'From a PNG it removes the eXIf chunk, the tEXt, zTXt and iTXt text chunks, the tIME modification timestamp and any bytes after IEND, while keeping the image, palette and colour chunks including iCCP and sRGB. From a WebP it removes the EXIF and XMP chunks, clears the two VP8X header flag bits that claim those chunks exist, and rewrites the RIFF size; the ICCP colour profile is kept.',
      },
      {
        question: 'Can it read the GPS location before I strip it?',
        answer:
          'Yes. When a photo carries GPS tags the tool shows latitude and longitude as signed decimal degrees and in degrees, minutes and seconds, the altitude if present, the UTC time and date stamp, and an OpenStreetMap link built from those numbers. Nothing is looked up for you; the link is only assembled, and following it is your choice.',
      },
    ],
  },

  // lib/tools/creator-workbench.ts (operation 'audio-trimmer', decodePcmWav,
  // encodePcmWav, parseSeconds), lib/tools/creator-workbench.test.ts,
  // lib/tools/workbench-helpers.ts and components/schema-workbench-tool.tsx
  'audio-audio-trimmer': {
    directAnswer:
      'To cut a section out of an audio file without uploading it: open the OpenTools audio trimmer, choose an uncompressed PCM WAV file, type the start and end timestamps, and run it. The audio is decoded to samples inside the page, cut, optionally gained and faded, and written back as a 16-bit WAV you can play in the result panel before saving.',
    leadParagraph:
      'This tool reads WAV files only, and only uncompressed PCM inside them, at 8, 16 or 24 bits per sample. An MP3, M4A, OGG or FLAC file is refused with "Only uncompressed PCM WAV files are supported. Convert the audio to WAV first." because it neither converts formats nor decodes compressed audio. The file picker accepts up to 25 MB, which is roughly two and a half minutes of 44.1 kHz 16-bit stereo. Output is always 16-bit PCM WAV at the source sample rate and channel count, so a 24-bit master comes back at 16-bit.',
    faqs: [
      {
        question: 'Which audio formats does it accept?',
        answer:
          'WAV files containing uncompressed PCM, and nothing else. The decoder checks the RIFF and WAVE signatures and then the fmt chunk: if the format tag is not 1, the file is refused by name, which is what happens to compressed WAV variants and to IEEE-float WAV as well as to MP3. A WAV recorded at 32 bits per sample passes the format check but has no branch in the sample reader, so it decodes as silence; play the result before you save it.',
      },
      {
        question: 'How do I write the start and end times?',
        answer:
          'Plain seconds (12.5), M:SS (1:45) and H:MM:SS (1:02:30) all work. Leave the end at 0, or set it at or before the start, and the clip runs to the end of the file. Times are converted to whole samples at the file\x27s own sample rate, so every cut lands on a sample boundary.',
      },
      {
        question: 'What do the gain and fade settings do?',
        answer:
          'Gain multiplies every sample and is clamped to between 0 and 10; because samples are clamped to full scale when the WAV is written, a gain above 1 can clip a loud passage instead of making it louder. The fade options apply a linear 50-millisecond ramp at the start, the end or both, shortened automatically to half the clip when the clip is shorter than 100 milliseconds. Fades are there to stop the click you hear when a cut lands mid-waveform.',
      },
      {
        question: 'What will it not do?',
        answer:
          'It will not change the sample rate, mix or split channels, normalise loudness, or join two files. It cuts one continuous section, so removing a passage from the middle and closing the gap is not possible in a single run. Output is fixed at 16-bit, and the input file must be 25 MB or smaller or you get "Choose a file no larger than 25.0 MB."',
      },
      {
        question: 'Can I hear the result before saving it?',
        answer:
          'Yes. The trimmed clip is handed to an audio player in the result panel so you can check the in and out points, and the download button then saves it as audio-trimmer.wav. The playback and the saved file are the same bytes, built in the page.',
      },
    ],
  },

  // lib/tools/spreadsheet-workbench.ts (operation 'csv-viewer' and table()),
  // lib/tools/structured.ts (csvToRecords, parseCsvRows),
  // lib/tools/structured.test.ts and components/schema-workbench-tool.tsx
  'spreadsheet-and-data-csv-viewer': {
    directAnswer:
      'To look inside a CSV without uploading it: open the OpenTools CSV viewer, paste the file contents into the CSV data box, and run it. The parser reads the first row as headers and prints the table with tab-separated columns, which lines up in the result panel and pastes straight into a spreadsheet.',
    leadParagraph:
      'This is a strict reader rather than a forgiving one, and that is the point: it tells you where a file is malformed instead of quietly shifting your columns. Every column needs a non-empty header, headers must be unique, and every row must carry exactly as many fields as there are headers, so a short row is refused by number, for example "Row 2 has 1 columns; expected 2." Fields are separated by commas only, so a semicolon-delimited export, which is what many European locales produce, reads as a single column. The input is a text box rather than a file picker, and it is capped at 2,000,000 characters, 100,000 rows and 1,000 columns.',
    faqs: [
      {
        question:
          'How does it handle quotes, commas and line breaks inside a field?',
        answer:
          'It follows the usual CSV quoting rules. A field that begins with a double quote is read as quoted and may contain commas and line breaks, and a doubled quote inside it means one literal quote. A quote that appears after other characters in the same field is treated as an ordinary character, not as the start of a quoted section. If a quoted field is never closed the parse stops with "CSV contains an unclosed quoted field."',
      },
      {
        question: 'Does it change my values?',
        answer:
          'No. Every cell is kept as the text it was, because nothing is parsed as a number, a date or a boolean, so a leading zero in a postcode survives and a long account number keeps every digit. Only the header names are trimmed of surrounding spaces. A byte-order mark at the very start of the file is dropped, and blank lines at the end are ignored.',
      },
      {
        question: 'Why does my file fail with a header error?',
        answer:
          'Two checks can reject it. If any cell in the first row is empty after trimming you get "Every CSV column needs a header in the first row.", which usually means the export began with a title line or a blank column. If two headers are identical you get "CSV headers must be unique before conversion.", because rows are built as records keyed by header name and a duplicate would silently overwrite a column.',
      },
      {
        question: 'What does the download button save?',
        answer:
          'The tab-separated preview, as a plain text file named csv-viewer.txt. It is not a re-serialised CSV; for that, the CSV editor on this site writes proper comma-separated output with the quoting rules applied. Either way the file is written from the page to your own disk and nothing is uploaded.',
      },
    ],
  },

  // lib/tools/spreadsheet-workbench.ts (operation 'csv-editor', toCsv, table),
  // lib/tools/structured.ts, lib/tools/spreadsheet-workbench.test.ts and
  // components/schema-workbench-tool.tsx
  'spreadsheet-and-data-csv-editor': {
    directAnswer:
      'To edit a CSV without uploading it: open the OpenTools CSV editor, paste the file into the CSV data box, make your changes there, and run it to validate and rewrite the file. The tool re-parses what you typed and writes clean comma-separated output, quoting only the fields that need it.',
    leadParagraph:
      'This is a text editor with a CSV validator behind it, not a spreadsheet grid, so there are no clickable cells, no formulas and no column widths. What it gives you is a check and a clean rewrite: the same strict parse as the CSV viewer, then a re-serialisation that quotes a field only when it contains a double quote, a comma, a carriage return or a line feed, doubling any embedded quotes. Rows are joined with LF, so a file that arrived with Windows CRLF line endings leaves with Unix ones. The box is capped at 2,000,000 characters, and the table at 100,000 rows and 1,000 columns.',
    faqs: [
      {
        question: 'How is this different from the CSV viewer?',
        answer:
          'They read the file with exactly the same parser and enforce the same rules. The viewer prints tab-separated columns so you can read them or paste them into a spreadsheet; the editor writes valid CSV back out, with quoting normalised and line endings set to LF. Use the viewer to inspect a file, the editor to produce a corrected one.',
      },
      {
        question: 'Will it fix a broken CSV for me?',
        answer:
          'Only the quoting and the line endings. Structural problems are refused rather than guessed at: a row with the wrong number of fields is reported with its row number and both counts, a missing or duplicated header stops the parse, and an unclosed quote is named as such. Repairing a ragged row would mean inventing data, and this tool will not do that silently.',
      },
      {
        question: 'Does it keep my numbers and codes intact?',
        answer:
          'Yes. Cells are handled as text from parse to output, so a leading zero, a long numeric identifier or a value like 007 comes out the way it went in. No cell is converted to a number, a date or a boolean at any point, which is where most CSV round-trips quietly lose information.',
      },
      {
        question: 'What is the output file called?',
        answer:
          'The download button saves the rewritten CSV as csv-editor.txt, because this workbench names the file after the tool and falls back to a .txt extension. Rename it to .csv after saving if the program you are feeding insists on the extension; the contents are valid comma-separated text either way.',
      },
    ],
  },

  // lib/tools/spreadsheet-workbench.ts (operation 'csv-cleaner', toCsv, table),
  // lib/tools/structured.ts and lib/tools/spreadsheet-workbench.test.ts
  'spreadsheet-and-data-csv-cleaner': {
    directAnswer:
      'To tidy a CSV without uploading it: open the OpenTools CSV cleaner, paste the file into the CSV data box, and run it. It trims the whitespace from every cell, drops any record that is empty in every column, and writes the result back out as properly quoted CSV.',
    leadParagraph:
      'The cleaner does two specific things and says so: it trims leading and trailing whitespace from each cell, and it removes records that are empty in every column after that trim. Header names are trimmed by the parser before that happens, and duplicate headers are refused rather than merged. Everything else is left alone, so it does not deduplicate rows, change the delimiter, repair a mis-decoded character set, split a joined column or fill a blank cell. Rows with the wrong number of fields are refused by row number rather than padded, so a ragged export has to be fixed before this tool will touch it.',
    faqs: [
      {
        question: 'What counts as an empty row?',
        answer:
          'A record whose every cell is an empty string once surrounding whitespace has been trimmed. A row of commas with nothing between them qualifies, and so does a row whose only content is a single space, because the space is trimmed first. A row that still holds any value in any column is kept, even if most of its cells are blank.',
      },
      {
        question: 'Does it remove duplicate rows?',
        answer:
          'No. Deduplication is a separate tool on this site, because removing duplicates requires you to say which columns define a duplicate, and guessing that is how real records get lost. The cleaner only trims cells and drops fully blank records.',
      },
      {
        question: 'Can it fix rows that have too many or too few columns?',
        answer:
          'No, and it does not pretend to. The parser refuses a ragged file with the row number and both counts, for example "Row 2 has 1 columns; expected 2." Padding a short row or discarding the overflow from a long one would invent or delete data without telling you, so the file is handed back for you to correct.',
      },
      {
        question: 'What are the size limits?',
        answer:
          'Two million characters of pasted text, 100,000 rows and 1,000 columns; past any of those the run stops with the limit named. The input is a text box rather than a file picker, so a very large export has to be cut down first or handled in a spreadsheet program. The cleaned result downloads as csv-cleaner.txt and copies out of the result panel as ordinary CSV.',
      },
    ],
  },

  // lib/tools/writing-workbench.ts (operation 'text-editor' and required()),
  // lib/tools/writing-workbench.test.ts and components/schema-workbench-tool.tsx
  'text-and-writing-text-editor': {
    directAnswer:
      'To write or clean up plain text and save it without uploading it: open the OpenTools text editor, type or paste into the Text box, and run it. The tool converts every line ending to LF, trims the whitespace around the whole document, and gives you the result to copy or to download as a UTF-8 .txt file.',
    leadParagraph:
      'This is a deliberately small tool: a box you write in, one normalising pass, and a download. The pass rewrites Windows CRLF and old Mac CR line endings as single LF characters and removes whitespace from the very start and the very end of the document; blank lines and indentation inside the text are left exactly as they are. Content is required and capped at 1,000,000 characters, reported as "Content is limited to 1,000,000 characters." There is no file picker, no autosave and nothing kept between visits, so save the file when you are done.',
    faqs: [
      {
        question: 'What does it actually change in my text?',
        answer:
          'Two things. Every CRLF pair and every lone CR becomes a single LF, which is what most build tools, version control systems and Unix programs expect. Whitespace at the very start and very end of the document is removed. Nothing inside is touched: spacing, tabs, blank lines and Unicode characters all survive unchanged.',
      },
      {
        question: 'Can I open an existing file in it?',
        answer:
          'Not through a file picker, because the input is a text box, so you paste the content in. The output side does write a real file: the download button saves it as text-editor.txt with a UTF-8 text type, straight from the page to your own disk.',
      },
      {
        question: 'Does it save my work automatically?',
        answer:
          'No. Nothing is stored, neither on a server nor in your browser between visits. The text lives in the page while the tab is open and is gone when you close it, so copy or download anything you want to keep.',
      },
      {
        question: 'Is it a code editor?',
        answer:
          'No. There is no syntax highlighting, no line numbering, no find and replace and no cursor tracking. It is for writing, pasting and normalising plain text before you save it. For comparing two versions, converting Markdown or merging blocks, the text and writing category on this site has separate tools that each do one of those.',
      },
    ],
  },

  // lib/tools/writing-workbench.ts (operations 'markdown-editor' and
  // 'markdown-to-html', required()), lib/tools/writing-workbench.test.ts and
  // components/schema-workbench-tool.tsx
  'text-and-writing-markdown-editor': {
    directAnswer:
      'To draft Markdown and save it without uploading it: open the OpenTools Markdown editor, write or paste into the Markdown box, and run it. The tool normalises line endings to LF, trims the whitespace around the document, and hands you a UTF-8 file that downloads as markdown-editor.md.',
    leadParagraph:
      'This editor holds and cleans your Markdown source; it does not render it. The result panel shows the same text in a monospaced block and the download writes a .md file, so there is no live preview pane and no HTML output here. Rendering is a separate tool on this site, Markdown to HTML, which converts a documented common subset of Markdown and escapes raw HTML it finds, so a pasted script tag comes out as visible text rather than as markup. The Markdown box is required, capped at 1,000,000 characters, and nothing is kept between visits.',
    faqs: [
      {
        question: 'Does it show a live preview of my Markdown?',
        answer:
          'No. The result panel shows your Markdown as plain monospaced text, exactly as it will be written to the file. To see it as HTML, use the Markdown to HTML tool on this site: it covers a documented common subset of Markdown rather than every extension, and it escapes raw HTML in the source instead of passing it through.',
      },
      {
        question: 'Which Markdown flavour does it support?',
        answer:
          'All of them, in the sense that it interprets none of them. The editor treats your text as text: it normalises line endings and trims the ends of the document, and every character in between, including tables, footnotes, front matter and custom directives, is written to the file untouched. Flavour only starts to matter when something else renders the file.',
      },
      {
        question: 'What does it change in my text?',
        answer:
          'Windows CRLF and lone CR line endings become LF, and whitespace at the very start and end of the document is removed. That second one matters for Markdown: a blank line before an opening front matter delimiter is removed. Indentation and blank lines inside the document, which Markdown uses for code blocks and list nesting, are left untouched.',
      },
      {
        question: 'Can I open and edit an existing .md file?',
        answer:
          'Not through a file picker; paste the contents into the box instead. The download side writes a real file named markdown-editor.md, saved from the page to your own disk, so the round trip is paste in, edit, download, and rename the file if you want a different name.',
      },
    ],
  },

  // lib/tools/utility.ts (encodeBase64Text), lib/tools/utility.test.ts and
  // components/utility-tools.tsx (TextTransformTool, TEXT_LIMIT)
  'developer-and-data-base64-encoder': {
    directAnswer:
      'To turn text into Base64 without uploading it: open the OpenTools Base64 encoder, paste the text into the box, and press Encode text. The text is converted to UTF-8 bytes and then to standard Base64 in the page, and the result appears below for you to copy or download.',
    leadParagraph:
      'This encoder handles text, not files: the input is a text box, so it will not turn an image or a PDF into a data URI. It produces standard Base64, using the alphabet A to Z, a to z, 0 to 9, plus and slash with equals padding, as one unbroken line with no wrapping at 76 characters and no URL-safe variant. Because the text is encoded as UTF-8 first, non-Latin scripts and emoji round-trip exactly; a test in this repository encodes and decodes a string mixing English, Devanagari and an emoji and requires the original back. Input is capped at 2,000,000 characters, reported as "Text is limited to 2,000,000 characters in this candidate."',
    faqs: [
      {
        question: 'Is the output URL-safe?',
        answer:
          'No. It is standard Base64, which uses plus and slash, and both carry their own meaning in a URL or a filename. For the URL-safe variant you would replace plus with minus and slash with underscore yourself. The padding equals signs are always present, because the output comes from the browser\x27s own standard Base64 encoder.',
      },
      {
        question: 'Can I encode an image or a file?',
        answer:
          'Not with this tool. The input is a text area, so there is no file picker and nothing to drop a file onto, and the encoder begins by treating the input as a Unicode string. If you paste the raw contents of a binary file as text, the bytes that could not be read as text are already lost before encoding starts.',
      },
      {
        question: 'How are accented characters, Chinese or emoji handled?',
        answer:
          'They are encoded as UTF-8 first, so each character becomes the one to four bytes UTF-8 defines for it, and those bytes are what get Base64-encoded. Any UTF-8-aware Base64 decoder gives the original string back. The matching decoder on this site validates UTF-8 strictly, so a round trip either returns your exact text or reports a failure.',
      },
      {
        question: 'How long can the input be?',
        answer:
          'Two million characters. Past that the tool stops with "Text is limited to 2,000,000 characters in this candidate." rather than freezing the tab. Expect the encoded result to be about a third longer than the byte length of your input, because Base64 spends four characters on every three bytes.',
      },
    ],
  },

  // lib/tools/utility.ts (decodeBase64Text), lib/tools/utility.test.ts,
  // components/utility-tools.tsx and lib/security/content-security-policy.ts
  'developer-and-data-base64-decoder': {
    directAnswer:
      'To decode Base64 back into text without uploading it: open the OpenTools Base64 decoder, paste the Base64 into the box, and press Decode text. The tool checks that the input is well-formed standard Base64, decodes it, and then requires the resulting bytes to be valid UTF-8 before it shows you anything.',
    leadParagraph:
      'The decoder is strict in two places, and both are deliberate. First it removes all whitespace and then requires the remaining characters to be standard Base64 with correct padding, meaning a length that is a multiple of four and the usual one or two trailing equals signs, or it stops with "Enter valid standard Base64 with correct padding." Second, it decodes with a UTF-8 decoder in fatal mode, so bytes that are not valid UTF-8 produce "The Base64 value does not contain valid UTF-8 text." instead of a page of replacement characters. That means it recovers text, not files: a Base64-encoded image or archive fails the second check by design.',
    faqs: [
      {
        question: 'Why does my Base64 string fail validation?',
        answer:
          'Three common reasons. It is URL-safe Base64, using minus and underscore instead of plus and slash, which this tool does not accept, so convert those two characters first. Its padding has been stripped, so the length is not a multiple of four. Or it contains a character outside the standard alphabet, such as a stray quotation mark copied with the string. Whitespace and line breaks are fine; they are removed before the check.',
      },
      {
        question: 'Can I decode a Base64 image or PDF back into a file?',
        answer:
          'No. After decoding the bytes, the tool requires them to be valid UTF-8 text and refuses anything else with "The Base64 value does not contain valid UTF-8 text." A decoder that guessed instead would hand you a corrupted text file. This tool decodes values that were text to begin with: messages, tokens, configuration values and encoded payloads.',
      },
      {
        question: 'Is it safe to paste a token or a secret in here?',
        answer:
          'The decoding happens in the page you have open, and this page is served with a policy that stops the browser opening a network connection at all, so the value is not sent anywhere. What remains is ordinary local risk: the value sits in your browser tab, in your clipboard if you copy it, and in the saved file if you download one. Treat those as your own policy treats any local copy of a secret.',
      },
      {
        question: 'What happens with an empty box?',
        answer:
          'Nothing is decoded and no error is raised: input that is blank or only whitespace returns an empty string, and the Decode button stays disabled until there is something to decode. The input limit is the same 2,000,000 characters as the encoder.',
      },
    ],
  },

  // lib/tools/utility.ts (generateUuids), lib/tools/utility.test.ts and
  // components/utility-tools.tsx (UuidGeneratorTool)
  'developer-and-data-uuid-generator': {
    directAnswer:
      'To generate UUIDs without uploading anything: open the OpenTools UUID generator, set how many you want between 1 and 100, and press Generate UUIDs. Each value comes from the browser\x27s own cryptographic UUID function, which produces a random version 4 UUID, and they are listed one per line to copy or download.',
    leadParagraph:
      'Every value is version 4 and random: the tool calls the browser\x27s cryptographic UUID generator and has no fallback to Math.random, so it either returns a proper random UUID or it reports a failure. The count must be a whole number between 1 and 100, and anything else is refused with "Choose between 1 and 100 UUIDs." Output is lowercase, hyphenated and one per line, with no options for braces, uppercase, a compact hyphen-free form, or the time-based and name-based versions 1, 3, 5 and 7. A test in this repository generates ten at a time and requires all ten to be distinct and to match the version 4 and variant bit pattern.',
    faqs: [
      {
        question: 'What kind of UUID does it produce?',
        answer:
          'Version 4, the fully random kind, with the version nibble fixed to 4 and the variant nibble to one of 8, 9, a or b. A test in this repository checks exactly that pattern on generated values. Versions 1, 3, 5 and 7 are not offered, because those need a MAC address, a namespace and a name, or a timestamp, and this tool generates only random identifiers.',
      },
      {
        question: 'Are these safe to use as database keys or tokens?',
        answer:
          'They come from the browser\x27s cryptographic random source, so they suit anywhere a random version 4 UUID suits: primary keys, correlation ids, filenames, idempotency keys. Version 4 UUIDs are random rather than sortable, so consecutive inserts will not sit next to each other in an index; if that matters for your database, a time-ordered scheme is the right answer rather than this tool.',
      },
      {
        question: 'Why can I only generate 100 at a time?',
        answer:
          'That is the limit the generator enforces, and it is checked before any value is produced: the count must be a whole number from 1 to 100 or you get "Choose between 1 and 100 UUIDs." For a larger batch, run it again; each run draws fresh random values and none is derived from a previous one.',
      },
      {
        question: 'Can I get them in uppercase or without hyphens?',
        answer:
          'Not from this tool. It returns exactly what the browser produces: lowercase hexadecimal in the 8-4-4-4-12 hyphenated form. Uppercase and hyphen-free variants are the same identifier written differently, so changing the case or stripping the hyphens afterwards does not alter the value.',
      },
    ],
  },

  // lib/tools/utility.ts (convertTimestamp), lib/tools/utility.test.ts and
  // components/utility-tools.tsx (TimestampTool)
  'developer-and-data-unix-timestamp-converter': {
    directAnswer:
      'To convert a Unix timestamp without uploading anything: open the OpenTools timestamp converter, type a number or an ISO date into the box, and press Convert timestamp. It answers with three lines: the UTC time in ISO 8601 form, the Unix value in seconds, and the Unix value in milliseconds.',
    leadParagraph:
      'A plain number is read as seconds or as milliseconds by its magnitude: below 100,000,000,000 it is treated as seconds, at or above that as milliseconds. That rule is worth knowing, because a genuine millisecond timestamp from before 3 March 1973 falls under the threshold and will be read as seconds. A number too large to be held exactly in JavaScript is refused with "The timestamp is outside the exact integer range." rather than being silently rounded. Anything that is not a plain integer is handed to the browser\x27s own date parser, so an ISO 8601 string such as 2024-01-01T00:00:00Z works and anything the browser cannot read is refused with "The timestamp or date is not valid."',
    faqs: [
      {
        question: 'Does it show my local time zone?',
        answer:
          'No. Every answer is in UTC: the ISO line always ends in Z, and the two Unix numbers are time-zone independent by definition. There is no local-time output, no named time zone picker and no relative phrasing such as "two hours ago". If you need local time, convert it yourself from the UTC value shown.',
      },
      {
        question: 'How does it decide between seconds and milliseconds?',
        answer:
          'By size alone. An integer whose absolute value is below 100,000,000,000 is multiplied by 1,000 and treated as seconds; anything at or above that is treated as already being in milliseconds. In practice ten-digit timestamps are read as seconds and thirteen-digit ones as milliseconds, which is what almost every system emits, but a millisecond value from before March 1973 is small enough to be misread as seconds.',
      },
      {
        question: 'Can it handle dates before 1970?',
        answer:
          'Yes. Negative integers are accepted and converted the same way, so -86400 gives 1969-12-31T00:00:00.000Z. The Unix seconds line is rounded down towards the more negative value, so for a time before the epoch that carries fractional milliseconds the seconds line can sit one second earlier than a simple truncation would give.',
      },
      {
        question: 'What date formats does it accept as text?',
        answer:
          'Whatever your browser\x27s date parser accepts, which reliably means ISO 8601: 2024-01-01, 2024-01-01T00:00:00Z, and offsets such as +05:30. Other formats are left to the browser and can differ between them, so a string like 01/02/2024 may be read differently in one browser than another, or refused outright. Using an ISO string removes the ambiguity.',
      },
      {
        question: 'Is there a download button?',
        answer:
          'No. The three lines appear in the result panel with a copy button, and unlike the other developer tools here there is no file to save, because the answer is three short lines. Nothing about the conversion leaves the page either way.',
      },
    ],
  },

  // lib/tools/web-workbench.ts (operation 'meta-tag-generator', html(),
  // absoluteUrl(), required()), lib/tools/web-workbench.test.ts and
  // components/schema-workbench-tool.tsx
  'web-and-seo-meta-tag-generator': {
    directAnswer:
      'To build a head block of meta tags without uploading anything: open the OpenTools meta tag generator, fill in the page title, meta description, canonical URL and robots directive, and run it. It returns four lines, a title element and meta tags for description and robots plus a canonical link, with every value HTML-escaped and ready to paste into your head.',
    leadParagraph:
      'The output is exactly those four tags and nothing more; Open Graph and Twitter card tags are separate tools on this site. Every value is escaped for the ampersand, less-than, greater-than, double quote and single quote characters, so a title containing "Fast & private" cannot break out of the attribute it sits in. The canonical must be an absolute HTTP or HTTPS address: a relative path or an empty field is refused with "Canonical URL must be an absolute HTTP(S) URL." and a javascript: or data: URL with "Canonical URL must use HTTP or HTTPS." The URL is then normalised by the browser\x27s own URL parser, so https://example.com is written out as https://example.com/.',
    faqs: [
      {
        question: 'Does it warn me if my title or description is too long?',
        answer:
          'No. This tool escapes and formats what you give it, applies no length rule and truncates nothing; the title, description and robots fields are each capped at 200,000 characters, which is a safety bound, not SEO advice. The SERP snippet preview tool on this site is the one that counts characters, and it states plainly that search engines may rewrite or truncate what you wrote.',
      },
      {
        question: 'Does it check my URL or fetch my page?',
        answer:
          'No, and it cannot: this page is served with a policy that blocks the browser from opening a network connection. The canonical URL is checked for shape only, meaning that it parses as an absolute URL and uses HTTP or HTTPS. Whether that address resolves, returns a 200 or points at the page you meant is not something this tool can see.',
      },
      {
        question: 'What can I put in the robots directive?',
        answer:
          'Any text. It is escaped and copied into the tag verbatim, with no validation against the known directives. Common values are index,follow and noindex,nofollow, and directives such as noarchive or max-snippet go in the same comma-separated list. Because nothing is checked, a typo such as "noindex, nofolow" is written out exactly as typed, so read the finished block before you paste it.',
      },
      {
        question: 'Why does my canonical URL come back slightly different?',
        answer:
          'It is parsed and re-serialised by the browser\x27s URL implementation, which adds the missing trailing slash on a bare origin, percent-encodes characters that need it, and lowercases the scheme and host. The path and query are otherwise preserved. If the result differs from what you typed in a way you did not expect, the parsed form is the one browsers and crawlers will actually see.',
      },
      {
        question: 'Can I leave the canonical blank?',
        answer:
          'No. All four fields are required, and an empty canonical stops the run with "Canonical URL must be an absolute HTTP(S) URL." If a page genuinely should not declare a canonical, delete that one line from the generated block before pasting it; the other three tags stand on their own.',
      },
    ],
  },
  // lib/tools/exact-size.ts and e2e/image-exact-size.spec.ts
  'image-resize-image-to-exact-kb': {
    directAnswer:
      'To resize an image to an exact KB size without uploading it: open the OpenTools exact-size tool, enter the maximum KB, the pixels and the DPI your form asks for, and choose Fit to size. The browser re-encodes the image with Canvas, searches JPEG quality until the file fits, and checks the saved bytes.',
    leadParagraph:
      'Exam, job and government portal uploads (photo and signature) often ask for a file under a set number of KB, at set pixels and sometimes a set DPI. This tool does that in your browser tab with the Canvas API, not WebAssembly, and reports whether the saved file meets each limit. Portal limits change — check the current notice for the exact size, pixels and format.',
    faqs: [
      {
        question: 'What does KB mean in this tool?',
        answer:
          'By default 1 KB is 1,024 bytes. Some portals use 1,000 instead, so you can choose, and the result shows the exact byte limit that was used. Check which one your portal means.',
      },
      {
        question: 'What happens if the image cannot get under the limit?',
        answer:
          'The tool says so and does not change your pixels on its own. The lowest JPEG quality it tries is 10%. If you turn on "Allow smaller pixels", it keeps the shape, reduces the dimensions until the file fits and reports the final pixels. PNG has no quality setting, so only pixels change its size.',
      },
      {
        question: 'Can it make a small file bigger to reach a minimum size?',
        answer:
          'Only by using a higher quality. If the file is still under the minimum at full quality, the tool reports that. It does not pad the file with filler bytes.',
      },
      {
        question: 'Does it really change the DPI?',
        answer:
          'Yes. It writes the density into the file itself — the JFIF header for JPEG and the pHYs chunk for PNG — and reads it back from the saved bytes. The image is re-encoded by the browser, so metadata other than DPI, such as EXIF, is not kept.',
      },
    ],
  },
};

/**
 * Slugs whose guide carries hand-verified, tool-specific content.
 *
 * Exported so `guide-differentiation.test.ts` can derive its ratchet from what
 * is actually here rather than from a list someone has to remember to edit —
 * a debt list that does not update itself stops being true on the first commit
 * that ignores it.
 */
export const DIFFERENTIATED_GUIDE_SLUGS: ReadonlySet<string> = new Set(
  Object.keys(GUIDE_DETAILS),
);

/**
 * The hand-written explainer for a tool URL, or undefined when there is none.
 *
 * WHY THIS EXISTS. Guide consolidation left 15 guide pages published and sent
 * the other 552 URLs to their tool pages by 301. Measured on production
 * 2026-09-21, those tool pages carry between 37 and 259 visible words — the
 * redirects now land somewhere thinner than what they replaced. Meanwhile 45
 * of the 60 entries below describe tools whose guide no longer renders, so the
 * writing exists and simply has nowhere to appear.
 *
 * This maps a routed tool URL such as `/data/csv-to-json` back to its catalogue
 * slug and returns that entry, so the tool page can show what the guide would
 * have. The lookup is by `destinationUrl` with the query stripped, because a
 * workbench tool's catalogue URL may carry `?tool=` while the routed page does
 * not.
 */
export function getToolExplainer(toolUrl: string): GuideDetail | undefined {
  const path = toolUrl.split('?')[0];
  const entry = LIVE_TOOL_CATALOG.find(
    (tool) => tool.destinationUrl.split('?')[0] === path,
  );
  return entry ? GUIDE_DETAILS[entry.slug] : undefined;
}

export function generateToolGuide(tool: ToolCatalogEntry): ToolGuideData {
  const runtime =
    tool.executionMode === 'local-wasm' ? 'WebAssembly' : 'browser JavaScript';
  const route = tool.destinationUrl.split('?')[0]!;
  const localModel = loadsLocalModel(route);
  const cspHeader = contentSecurityPolicy({ localModel });

  // Tool names in this catalogue are noun phrases -- "MP3 Cutter", "SQL to ER
  // Diagram Generator" -- so "How to <name>" was ungrammatical on 548 of the
  // 562 guides. Google shows the title verbatim, so that was the first thing a
  // searcher saw. Leading with the name also matches what people actually
  // type: every query in Search Console on 2026-09-20 was a tool name
  // ("latex table generator", "er diagram from sql"), not a how-to phrase.
  const metaTitle = `${tool.name} — free, in your browser, no upload`;
  const metaDescription = `${tool.name} runs in your own browser tab. Your files and inputs never touch a server, no account is needed, and there is no paywall.`;
  const eyebrow = `${tool.category} / Free Browser Utility`;
  const heading = `${tool.name} — online, without uploading your files`;
  const detail = GUIDE_DETAILS[tool.slug];
  const directAnswer =
    detail?.directAnswer ??
    `To use the OpenTools ${tool.name} without uploading anything: open it, load your input, and run it. The work happens in the page itself using ${runtime}, and the result is saved straight from your browser to your own disk.`;
  const leadParagraph =
    detail?.leadParagraph ??
    `${tool.name} runs inside your browser tab. Where a conventional online converter sends your file to its servers and returns a result, this tool reads the file in the page using ${tool.executionMode === 'local-wasm' ? 'WebAssembly and typed memory buffers' : 'the browser\x27s own APIs'}. Your files and inputs never touch a server.`;

  const technicalArchitecture = localModel
    ? `This page is served with a Content Security Policy that allows network requests to this site only (connect-src \x27self\x27), because the background remover loads its model weights and WebAssembly runtime from this same site. No third-party origin is reachable, and your image is never sent anywhere — it is read into the page and processed there.`
    : `This page is served with a Content Security Policy that blocks every network connection the page could make (connect-src \x27none\x27). Your browser will not send the file, its name or its contents to any server, including this one. The exact header is below.`;

  const diagramSvg = generateArchitectureDiagramSvg(
    tool.name,
    tool.executionMode,
    localModel ? "connect-src 'self'" : "connect-src 'none'",
  );

  const steps: GuideStep[] = [
    {
      name: `Open the ${tool.name} workbench`,
      text: `Open the workspace in your browser. The code it needs loads with the page — there is nothing to install and no account to create.`,
    },
    {
      name: `Provide your input files or parameters`,
      text: `Select, drag, or configure your input. The file is read into the page and processed there, so there is no upload to wait for.`,
    },
    {
      name: `Save your output`,
      text: `Preview the result and click download. The file is written from the page straight to your disk; nothing is stored on a server.`,
    },
  ];

  const comparison: GuideComparisonRow[] = [
    {
      aspect: 'Where your file goes',
      localTools: 'Stays in the page; it never touches a server',
      traditionalCloud: 'Uploaded to and processed on the provider’s servers',
    },
    {
      aspect: 'Waiting to upload',
      localTools: 'None — there is no upload step',
      traditionalCloud: 'Upload time, then a place in the server queue',
    },
    {
      aspect: 'Price',
      localTools: 'Free, with no paywall and no sign-up',
      traditionalCloud: 'Often a free tier with daily limits or a subscription',
    },
    {
      aspect: 'Retention',
      localTools: 'Nothing to retain; the file was never sent',
      traditionalCloud: 'Stored on the provider’s disks under their policy',
    },
    {
      aspect: 'Account & tracking',
      localTools:
        'No account, no third-party trackers, no client-side analytics',
      traditionalCloud: 'Often an email sign-up and advertising trackers',
    },
  ];

  const faqs: GuideFaq[] = [
    ...(detail?.faqs ?? []),
    {
      question: `Does ${tool.name} upload my files or data to any server?`,
      answer: `No. The work happens in the page you have open. ${localModel ? 'This page may fetch its own model and WebAssembly files from this site, and its Content Security Policy allows no other origin.' : 'This page is served with a Content Security Policy of connect-src \x27none\x27 and webrtc \x27block\x27, so the browser will not let it open a connection to any server, including this one.'}`,
    },
    {
      question: `Is ${tool.name} free?`,
      answer: `Yes. There is no paywall, no usage limit and no account. If the tool is useful to you, you can choose to support the project.`,
    },
    {
      question: `Can I use this for confidential legal or financial records?`,
      answer: `Your file is not sent anywhere, so it is not exposed to this site or to a third party. What remains is your own device and browser — treat it the way your organisation's policy treats any local file.`,
    },
    {
      question: `Does the site collect anything when I visit?`,
      answer: `The server records one coarse metadata event per page visit (see the security policy for exactly what). There are no third-party trackers and no client-side analytics, and nothing from the tool itself — your files, inputs or results — is included.`,
    },
  ];

  // Sign PDF and Fill PDF Form share /pdf/sign. State its limits so the guide
  // never promises more than a drawn or typed signature.
  if (route === '/pdf/sign') {
    faqs.push({
      question: `Does ${tool.name} certify a signature?`,
      answer: `No. It fills the form fields you change and can draw or type a signature onto the page. It does not certify one or check who signed. A PDF that already carries a digital signature is refused, because any change would break that signature. Form fields accept only basic Latin text for now.`,
    });
  }

  const relatedTools = getRelatedToolLinks(tool.slug, 4);
  const categoryPillar = getCategoryPillar(tool.category);

  const semanticEntities = getSemanticEntities(tool);

  const httpsScheme = ['https:', '//'].join('');
  const siteUrl = `${httpsScheme}getopentools.com`;
  const schemaContext = `${httpsScheme}schema.org`;

  const jsonLd = {
    '@context': schemaContext,
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        name: tool.name,
        applicationCategory: `${tool.category}Application`,
        operatingSystem: 'Web Browser (Chrome, Safari, Firefox, Edge)',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        featureList: [
          'Runs in the browser tab',
          'Your files and inputs never touch a server',
          'No account and no paywall',
        ],
        about: semanticEntities,
      },
      {
        '@type': 'HowTo',
        name: `How to use ${tool.name} in your browser`,
        description: directAnswer,
        step: steps.map((step, index) => ({
          '@type': 'HowToStep',
          position: index + 1,
          name: step.name,
          text: step.text,
        })),
      },
      {
        '@type': 'FAQPage',
        mainEntity: faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: siteUrl,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Guides',
            item: `${siteUrl}/guides`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: tool.category,
            item: `${siteUrl}/guides/category/${categoryPillar?.slug ?? tool.category.toLowerCase()}`,
          },
          {
            '@type': 'ListItem',
            position: 4,
            name: tool.name,
            item: `${siteUrl}/guides/${tool.slug}`,
          },
        ],
      },
    ],
  };

  return {
    tool,
    metaTitle,
    metaDescription,
    eyebrow,
    heading,
    directAnswer,
    leadParagraph,
    technicalArchitecture,
    cspHeader,
    diagramSvg,
    steps,
    comparison,
    faqs,
    relatedTools,
    categoryPillar,
    jsonLd,
  };
}

/** Undefined when no live tool answers this slug, so the page can 404. */
export function getGuideBySlug(slug: string): ToolGuideData | undefined {
  const tool = getLiveToolBySlug(slug);
  if (!tool) return undefined;
  return generateToolGuide(tool);
}
