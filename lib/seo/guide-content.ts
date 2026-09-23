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
import { TITLE_SUFFIX_LENGTH } from './title-budget';

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
  // lib/tools/id-mask/mask.ts (maskIdentifiers, the rules comment at the top,
  // maskAadhaarValue, maskPanValue, verhoeffValid), lib/tools/id-mask/recheck.ts
  // (findUnmaskedIdentifiers and its exceptions comment),
  // components/aadhaar-pan-masker-tool.tsx (TEXT_EXTENSIONS, MAX_BYTES,
  // LISTED_FINDINGS, the acknowledgement that gates copy and download) and
  // lib/tools/id-mask/mask.test.ts. Every masked and refused example below was
  // run through the built engine.
  'india-and-life-admin-mask-aadhaar-and-pan-numbers': {
    directAnswer:
      'Paste the text, or open a .txt, .csv, .tsv, .json, .md or .log file of up to 20 MB, and press Mask numbers. Every Aadhaar number found has its first eight digits replaced by X and every PAN its first six characters, with your spacing and punctuation left exactly as they were. A second, looser detector then reads the masked result, and if anything in it still looks like one of these numbers, copy and download stay locked until you tick a box saying you have checked each place it names.',
    leadParagraph:
      'This hides Indian identity numbers inside running text, so a document can be passed on without the full numbers in it. It is text only: it reads .txt, .csv, .tsv, .json, .md and .log files and refuses images, scans and PDFs by name, so a photograph of a card cannot be masked here. A number is hidden whether or not it passes the Aadhaar checksum, because a number with a typo in it is still somebody\x27s number, and the report counts the two cases separately. Some shapes are deliberately left alone — any run of 13 or more digits, and the 16-digit card-or-Virtual-ID shape, which cannot be told apart from a card number reliably — and those are counted for you to look at yourself. Nothing here proves that a number is real or that it belongs to anyone; it recognises shapes and one checksum.',
    faqs: [
      {
        question: 'How much is hidden, and is my layout kept?',
        answer:
          'For Aadhaar, the first eight digits become X and the last four stay, which is the masked form commonly printed on documents. Your separators and spacing are kept character for character, so 2345-6789-0123 becomes XXXX-XXXX-0123, hyphens and all, and an unspaced 234567890123 becomes XXXXXXXX0123. The output is exactly as long as the input, because each character is replaced where it stands rather than the number being rewritten. PAN numbers show their last four characters by default, so ABCPE1234F becomes XXXXXX234F; a second option hides all ten.',
      },
      {
        question: 'What does it deliberately leave alone?',
        answer:
          'Four things, each for a stated reason. A single run of 13 or more digits, and any run of four or five four-digit groups, are counted as long number runs and left unchanged, because a 16-digit card number and a 16-digit Aadhaar Virtual ID have the same shape as each other. A run of four-digit groups is read as Aadhaar only when the number of groups divides by three, so three groups are one number and six groups are two. A number whose first digit is 0 or 1 is not masked, because no Aadhaar number begins with those. And a PAN with a letter or digit pressed against it, such as refABCPE1234F, is left alone, because five letters and four digits is an ordinary shape in addresses and part numbers.',
      },
      {
        question: 'What is the second check that blocks copying?',
        answer:
          'A separate detector, written apart from the masker and sharing no code with it, reads the masked result and flags anything that still looks like one of these numbers. It is deliberately looser: it counts decimal digits from every script, allows up to three separator characters between groups, accepts any grouping and any first digit, and flags five letters, four digits and a letter in any case with any fourth letter. So 2345 followed by three spaces then 6789 0123, and a PAN written ABCPE 1234 F or ABCPE-1234-F, all of which the masker leaves alone, are reported here. Findings are listed by line and column, up to fifty of them, and the copy and download buttons stay locked until you tick the acknowledgement. Three narrow exceptions keep ordinary text quiet: a dotted IPv4 address, an Indian phone number written as +91 and ten digits, and a PAN shape whose letters are already XXXXX.',
      },
      {
        question: 'Which files can it open, and what comes back?',
        answer:
          'It reads .txt, .csv, .tsv, .json, .md and .log files up to 20 MB; anything else is refused with a message saying it reads text files only and that a scanned card cannot be masked here. A file whose first 65,536 characters contain a null byte is refused as binary rather than read as text. Pasted text has no separate limit of its own. The masking runs in a background worker inside the page, and the result saves under your original file name with -masked added before the extension, or as masked-text.txt when you pasted rather than opened a file.',
      },
      {
        question: 'Is a masked number recoverable, and is this a guarantee?',
        answer:
          'No to both. Masking replaces characters with the letter X; there is nothing hidden underneath and nothing to reverse, and equally nothing about the output is a legal assurance. The report separates Aadhaar numbers whose checksum passes from those it calls shape only, which fail the checksum — perhaps because of a typo — and are masked anyway. Digits written in Devanagari, Tamil, Bengali and several other Indic scripts are read by value and masked, and invisible formatting characters cannot be used to hide a number from the scan. Read the masked document yourself before you send it, starting with anywhere the second check raised a flag.',
      },
    ],
  },

  // components/image-editor-tool.tsx (EDITOR_TASKS, MAX_BYTES, chooseImage, the
  // run() canvas pipeline and its transform order, the format and quality
  // controls, the download name), lib/tools/image.ts (transformedDimensions,
  // validateCrop, supportedRasterTypes, extensionForRasterType, canvasFilter)
  // and lib/tools/image.test.ts.
  'image-image-rotator': {
    directAnswer:
      'Open a JPEG, PNG or WebP image of up to 25 MB and press Rotate: each press turns the picture another 90 degrees, cycling through 90, 180, 270 and back to none. Width and height swap on a quarter turn, so a 640 by 480 photograph becomes 480 by 640. Nothing is written until you press the button below the controls, and the saved file is re-encoded as WebP unless you pick JPEG or PNG in the format box.',
    leadParagraph:
      'This turns a picture in quarter turns on a canvas inside the page. There is no free angle and no straighten slider — the control advances in 90 degree steps only, and there is no anticlockwise button, so a left turn is three presses. The whole editor is one pass over one picture, so the crop boxes, the two flip buttons and the brightness, contrast, greyscale and sepia sliders sit on the same page and all apply in the same run; rotation is simply the job this page is named for. The picture is decoded by your browser, drawn to a canvas and encoded again, so what you save is new pixels rather than the original file with a tag changed, and nothing from the original file\x27s metadata is carried across — there is no code here that reads or writes it. The source is capped at 25 MB and the finished image at 64 megapixels.',
    faqs: [
      {
        question: 'Can I rotate by a free angle or straighten a crooked photo?',
        answer:
          'No. The rotation this editor holds is one of exactly four values — 0, 90, 180 or 270 degrees — and the button steps through them in order. There is no degree field, no slider and no grid overlay for levelling a horizon, so a photograph that is three degrees off cannot be fixed here. If a quarter turn is all you need, this does it exactly, with no interpolation and no softening, because the pixels land on whole pixel positions.',
      },
      {
        question: 'What format and quality does the result come back in?',
        answer:
          'The format box offers WebP, JPEG and PNG, and it starts on WebP, so a JPEG you rotate is saved as a WebP file unless you change it. The quality slider runs from 10 to 100 and starts at 90; it is switched off and reads lossless when PNG is chosen. JPEG has no transparency, so the canvas is painted white before the picture is drawn, which means a transparent PNG rotated and saved as JPEG comes back on a white background. The saved file is always called edited-image with the extension of the format the browser actually produced — some browsers answer a WebP request with a PNG, and the tool reports the format it really got rather than naming the file for one it is not.',
      },
      {
        question: 'Why was my image refused?',
        answer:
          'Four named refusals. A file that is not a JPEG, PNG or WebP gives "Choose a static JPEG, PNG, or WebP image.", which rules out GIF, HEIC, AVIF, TIFF and SVG. A file over 25 MB gives "This candidate limits source images to 25 MB." A file the browser cannot decode gives "The browser could not decode this image." And a turned or cropped result over 64 megapixels gives "The edited image exceeds the 64 megapixel canvas limit." After encoding, the result is read back and its width and height are compared with what was asked for; a mismatch stops with "The edited image failed its dimension check." rather than handing you a wrong-sized file.',
      },
      {
        question: 'Does rotating lose quality, and is my EXIF data kept?',
        answer:
          'The turn itself loses nothing, because a quarter turn simply moves whole pixels. The saving does: the file is encoded fresh, so a lossy format loses a little each round trip, and repeated edits compound that. Choose PNG, or raise the quality slider, when that matters. No metadata is carried over — there is no path in this tool that copies EXIF, so camera settings, capture time, colour profile and any location recorded in the original are not written into the file you save.',
      },
      {
        question: 'Does the order of rotate and flip matter?',
        answer:
          'Yes, and it can surprise you. The mirror is applied in the picture\x27s own axes and the turn is applied after it, so once a quarter turn is in place the Flip H button mirrors the visible result top to bottom rather than left to right, and Flip V mirrors it left to right. If you want to mirror what you can see on screen, either flip before you rotate or simply press the other flip button. Choosing a new image resets the rotation, both flips and every slider to their starting values.',
      },
    ],
  },

  // lib/tools/spreadsheet-workbench.ts (csv-sorter case with its stable
  // fallback, the table / header / toCsv / csvCell helpers and their limits),
  // lib/tools/spreadsheet-workbench.test.ts, lib/tools/structured.ts
  // (csvToRecords and parseCsvRows, which supply every parse refusal quoted
  // here) and components/schema-workbench-tool.tsx for the download extension.
  'spreadsheet-and-data-csv-sorter': {
    directAnswer:
      'Paste the CSV, type the exact name of the column to sort by, pick one of the four comparisons — number descending, number ascending, text A to Z, text Z to A — and run it. Rows that compare equal keep the order they arrived in, so sorting by one column and then by another preserves both. The header row is written back unchanged and the rows below it are re-quoted as valid CSV.',
    leadParagraph:
      'This sorts the data rows of one comma-separated table by one named column. The sort is stable by construction: when two values compare equal the tie is broken by the row\x27s original position, which is what makes a second pass on another column useful rather than destructive. Numeric mode reads both cells as numbers and stops the run the moment a pair cannot both be read that way; text mode uses the browser\x27s own language-aware comparison with numbers recognised inside the text, so item2 sorts before item10 rather than after it. There is one sort key and no more — no second column, no custom order, and no option to treat a column as dates. The table itself must be strict CSV with a non-empty, unique header on every column, and is capped at 2,000,000 characters, 100,000 rows and 1,000 columns.',
    faqs: [
      {
        question: 'What counts as non-numeric, and what does a blank cell do?',
        answer:
          'A blank cell is read as the number zero and sorts with the zeros, silently — it does not stop the run. Only a cell that cannot be read as a number at all triggers "Column score contains a non-numeric value.", naming the column you chose. There is a second gap worth knowing: the check runs inside the comparison, so a table with a single data row is never compared with anything and a non-numeric value in it passes straight through untouched. Look at the column before you trust a numeric sort of a short table.',
      },
      {
        question: 'Why does it say my column is unknown?',
        answer:
          'The name you type is trimmed of spaces and then has to match a header exactly, capital letters included: typing Team against a header written team gives "Unknown column: Team." Leaving the box empty gives "Unknown column: (blank)." Headers in the file are themselves trimmed when it is parsed, so stray spaces around a header name are not the problem — spelling and case are.',
      },
      {
        question: 'How is text sorted?',
        answer:
          'By the browser\x27s own comparison for the visitor\x27s language, with runs of digits inside the text compared as numbers. That has two consequences. Accented letters and capitals are ordered by language rules rather than by character code, so the result is not a plain byte order and two people in different regions can get slightly different orders for the same file. And file2 comes before file10, which is usually what you want but is not what a strict alphabetical sort would do. Text Z to A is the exact reverse of Text A to Z.',
      },
      {
        question: 'Why was my file refused before the sort even started?',
        answer:
          'The parser is strict and names the problem. An empty cell in the first row gives "Every CSV column needs a header in the first row.", which usually means a title line above the real header. Two identical headers give "CSV headers must be unique before conversion." A row with the wrong number of fields gives its row number and both counts, for example "Row 2 has 1 columns; expected 2." A quotation mark that is opened and never closed gives "CSV contains an unclosed quoted field." Fields are separated by commas only, so a semicolon-separated export arrives as a single column and there is no setting to change that.',
      },
      {
        question: 'What does the output look like, and what is downloaded?',
        answer:
          'The result is written out fresh rather than copied, so quoting can differ from your input even where no value changed: a field is wrapped in double quotes only when it contains a comma, a double quote, a carriage return or a line feed, and an inner double quote is doubled. The download button saves the result as csv-sorter.txt with a plain-text type, because the CSV tools in this workbench do not declare a file extension of their own — rename it to .csv before opening it in a spreadsheet, or use the copy button and paste instead.',
      },
    ],
  },

  // lib/tools/notation/markup.ts (htmlToMarkdown and decodeEntities),
  // lib/tools/writing-workbench.ts (the html-to-markdown operation, its notice
  // and outputExtension), lib/tools/writing-workbench.test.ts and
  // components/schema-workbench-tool.tsx. Each conversion quoted below was run
  // through the built function.
  'text-and-writing-html-to-markdown': {
    directAnswer:
      'Paste the HTML and run it; the Markdown appears beside it, ready to copy or to download as html-to-markdown.md. Headings, bold, italic, inline code, links, list items, line breaks and horizontal rules are converted, script and style elements are removed with everything inside them, and every other tag is simply deleted with its text kept. The page carries its own caution above the button: it converts a documented common subset, not an arbitrary HTML document.',
    leadParagraph:
      'This turns a fragment of HTML into readable Markdown using a sequence of pattern replacements rather than an HTML parser. That single fact explains most of what it does and does not do, because it never builds a tree and so cannot tell that one element sits inside another. Headings one to six, strong and b, em and i, code, anchors carrying an href, list items, br and hr each have a rule; paragraph, div, section, article, header, footer and blockquote become a blank line; everything left has its tags stripped and its text kept. Tables, images and nested structure do not survive that, and the tool says so in its own words: review the generated output before publishing. There is no character limit on the box, so the practical ceiling is whatever the browser tab will hold.',
    faqs: [
      {
        question: 'What is lost in the conversion?',
        answer:
          'More than you might expect. A numbered list becomes a bulleted one, because every list item becomes a dash and the numbering is not read. A table loses all of its structure and its cells run together with no separator at all, so a row holding a and b comes out as the two letters joined. An image disappears completely, alt text included — no image syntax is ever produced. A blockquote loses its marker and reads as an ordinary paragraph. And because the replacements are not nesting-aware, bold inside bold closes at the first closing tag, so strong wrapped around strong comes out as one run of bold text followed by plain text.',
      },
      {
        question: 'What happens to escaped characters in my HTML?',
        answer:
          'They are decoded at the very end, without exception. Named entities for ampersand, less-than, greater-than, quotation mark and apostrophe, and numeric references in decimal or hexadecimal, are all turned back into the characters they stand for. So a page that carefully escaped a script tag in order to display it as text hands you Markdown containing a real script tag. That is harmless while the text stays Markdown, and it is undone if you send the result through the Markdown to HTML tool on this site, which escapes every angle bracket before writing anything. But paste it into a renderer that passes raw HTML through and the tag will run. Check the output whenever the page you converted showed markup as words.',
      },
      {
        question: 'Are script and style contents really removed?',
        answer:
          'Yes — the tags and everything between them go before any other rule runs, and a test in this repository converts a fragment beginning with a script element and requires its contents to be absent from the result. Comments go too, because the final rule deletes everything from a less-than sign to the next greater-than sign. That last rule cuts both ways: a bare less-than sign in ordinary prose swallows the text up to the next greater-than sign, so a line reading a, less-than, b, greater-than, c comes back as a and c with the middle gone. Watch for that in text about mathematics or code.',
      },
      {
        question: 'Which links survive, and is the address checked?',
        answer:
          'An anchor is converted when it carries an href, whether that href is in double quotes, single quotes or none at all, and the address is copied through exactly as written with no checking whatsoever. A relative path stays a relative path, and a javascript address is written into the Markdown unchanged, so read any link in converted output before you publish it. An anchor with no href — a named anchor, say — loses its tags and keeps only its visible text.',
      },
      {
        question: 'What are the limits, and what does the download contain?',
        answer:
          'An empty box, or one holding only spaces, stops with "HTML is required." There is no character limit and no file picker: this tool takes pasted markup, not an .html file. The conversion is deterministic, so the same input always produces the same output. The download button writes what you see to html-to-markdown.md as UTF-8 text, and the copy button puts the same text on your clipboard.',
      },
    ],
  },

  // lib/tools/developer-advanced-workbench.ts (the json-editor case, the json()
  // and required() helpers and MAX_TEXT), lib/tools/structured.ts
  // (assertJsonNumbersAreSafe, which the sibling CSV-to-JSON path uses and this
  // one does not), lib/tools/structured.test.ts and
  // app/developer/[tool]/page.tsx. Every output below was produced by running
  // the built operation.
  'developer-and-data-json-editor': {
    directAnswer:
      'Paste the JSON and run it: the text is parsed and written straight back out with two-space indentation, ready to copy or to download as json-editor.json. If it comes back, it parsed — a failure stops the run and repeats the browser\x27s own message, including the position of the character that broke it. There is one output style and no settings here: no minifying, no key sorting and no schema checking.',
    leadParagraph:
      'This validates and reformats JSON in a single step, using the browser\x27s own reader and writer. That is fast and strict, but it is not lossless, and three of the ways it changes a document are worth knowing before you paste anything that matters. Numbers are rewritten rather than copied through, a repeated key collapses to the last one with nothing said, and any key that reads as a whole number is moved ahead of the others in ascending order. Input is trimmed and capped at 1,000,000 characters. It is a formatter and a validator rather than an editor in the usual sense: there is no tree view, no folding and no way to change one value in place.',
    faqs: [
      {
        question: 'Does it change my numbers?',
        answer:
          'Yes, and it does not warn you. A long integer is rounded to what a double-precision number can hold, so 12345678901234567890 comes back as 12345678901234567000 with its last digits changed. A number too large to represent at all, written as 1 followed by E400, is written back as null. Spellings are normalised too: 1.0 becomes 1, 1e3 becomes 1000, and minus zero becomes 0. The CSV-to-JSON path in this same project refuses an integer outside the exact range by name rather than rounding it, so where every digit of an identifier matters, quote it as text before you paste it here.',
      },
      {
        question: 'What happens to duplicate keys and to key order?',
        answer:
          'A repeated key resolves to the last one silently: an object written with a set to 1 and then a set to 2 comes back holding only 2, with no mention of the value that was dropped. Ordinary keys keep the order they were written in, but any key that reads as a whole number jumps ahead of them and is sorted upwards, so an object written b then 2 then 1 comes back as 1, 2, b. That is how JavaScript orders object properties, and there is no setting here to prevent it.',
      },
      {
        question: 'Why was my JSON refused?',
        answer:
          'An empty box, or one holding only spaces, gives "JSON is required." More than 1,000,000 characters after trimming gives "JSON is limited to 1,000,000 characters." Everything else is a parse failure, reported as "JSON is invalid:" followed by the browser\x27s own wording and the character position — a trailing comma before a closing brace, for instance, is reported as an expected property name at the position where the brace sits. The reader is strict JSON, so comments, trailing commas, single-quoted strings and unquoted keys are all refused; this does not read JSON5 or the commented JSON some editors use for configuration.',
      },
      {
        question: 'Can I minify, sort keys, or check against a schema?',
        answer:
          'Not on this page. There is exactly one output: two-space indentation. Minifying and key sorting exist as separate paths in this project rather than as switches here, and there is no schema validation, no JSON Path box and no diff. It does accept any valid JSON value rather than only an object, so a bare string, number, boolean or array is parsed and returned just the same.',
      },
      {
        question: 'What happens to escapes and non-ASCII text?',
        answer:
          'Escape sequences are resolved and written back as real characters, so a backslash-u escape for an accented letter comes back as that letter. The output is UTF-8 and is not escaped back to ASCII, which is right almost everywhere but will surprise you if something downstream expects an ASCII-only file. Control characters that must stay escaped in JSON remain escaped. The download button writes exactly what you see to json-editor.json.',
      },
    ],
  },

  // lib/tools/web-workbench.ts (the serp-snippet-preview case and the
  // required() and absoluteUrl() helpers it calls),
  // lib/tools/web-workbench.test.ts and components/schema-workbench-tool.tsx.
  // The counts and normalised addresses below were produced by running it.
  'web-and-seo-serp-snippet-preview': {
    directAnswer:
      'Type the title, the description and the page address, then run it. The three lines come back as plain text with a count of the characters in the title and in the description, followed by the tool\x27s own reminder that search engines may rewrite or truncate what you wrote. The address is put through the browser\x27s URL parser first, so what is printed is the tidied-up form of what you typed.',
    leadParagraph:
      'This is a character counter with the three fields laid out in the order a result page shows them, not a picture of a search result. Nothing is drawn: no site icon, no breadcrumb trail, no date, no star rating, and no grey ellipsis showing where a long title would be cut. There is no target either — it reports the counts and leaves the judgement to you, which is honest, because search engines cut a title by how wide it renders rather than by how many characters it holds, and a line of capital letters is far wider than the same number of lower-case ones. Counts are in Unicode code points, so an emoji from outside the basic range counts as one. Use it to see all three fields together and count them truthfully, not to predict what will be displayed.',
    faqs: [
      {
        question: 'Does it show me where my title will be cut off?',
        answer:
          'No. There is no truncation preview, no pixel-width measurement, no recommended length and no warning when a field is long — the tool prints the count and stops. It also ends every run with the line "Preview only — search engines may rewrite or truncate this content.", which is the honest position: a search engine may show your description, may write its own from the page, or may show nothing you supplied at all.',
      },
      {
        question: 'How exactly does it count?',
        answer:
          'Leading and trailing spaces are removed first, then the characters are counted as Unicode code points rather than as the storage units a text box uses. A single emoji counts as one. An emoji built from several joined parts, such as a flag or a family, counts once for each part it is made of, so it can add more than one to the total. One rough edge to expect in the output: the line always reads "characters", so a one-character description is reported as 1 characters.',
      },
      {
        question:
          'Why was my address refused, and why did it come back changed?',
        answer:
          'The address has to be a complete web address. A bare domain with no scheme gives "URL must be an absolute HTTP(S) URL." and a scheme that is not HTTP or HTTPS gives "URL must use HTTP or HTTPS." — note that both messages say URL, though the field itself is labelled Display URL. What is printed back is the parsed and re-serialised form: the host is lower-cased, an empty path gains a trailing slash, and a space in the path becomes a percent escape. Query parameters stay in the order you typed them and the fragment is kept.',
      },
      {
        question: 'What are the field limits?',
        answer:
          'Title and description are both required — leaving either blank stops with "Title is required." or "Description is required." — and each accepts up to 200,000 characters, which is far beyond anything a snippet would use. So the tool never stops you from writing a title that is much too long; it just tells you how long it is.',
      },
      {
        question: 'Does it look at my live page at all?',
        answer:
          'No. It does not fetch your URL, does not read the title or meta description already on the page, and does not compare anything against what is indexed — every value shown is one you typed. The result is text, so there is nothing to paste into a document as a picture; the download button saves it as serp-snippet-preview.txt. To write the tags themselves, the Open Graph and Twitter card tools in the same workbench emit the markup.',
      },
    ],
  },

  // lib/tools/qr-barcode-workbench.ts (the text-qr-code operation, buildQrPayload,
  // required(), qrStyle() and renderQr()), lib/tools/qr-barcode-workbench.test.ts
  // and the capacity table in node_modules/qrcode/README.md. The fitting and
  // refusal examples below were produced by running the built operation.
  'qr-and-barcode-text-qr-code': {
    directAnswer:
      'Type or paste the text, choose an error-correction level and a width in pixels, then generate. The words themselves go into the symbol, with no link and no redirect in between, and the result downloads as an SVG file named text-qr-code.svg. Spaces at the start and end are removed before encoding; line breaks inside the text are kept.',
    leadParagraph:
      'This puts your text inside the symbol, so scanning it shows the words rather than opening anything. Two things follow from that: the content is fixed once the code is printed and can never be repointed, and anyone who can see the printed code can read the text, because a QR code carries no secrecy of any kind. The box accepts up to 8,000 characters, but that is the field limit and not the symbol limit — a QR code in byte mode holds at most 2,953 characters at the weakest recovery level and 1,273 at the strongest, and anything longer is refused by the encoder. The symbol is drawn as an SVG with a four-module quiet zone, black on white, at a width you choose between 160 and 1,200 pixels.',
    faqs: [
      {
        question: 'How much text actually fits?',
        answer:
          'Less than the field allows, and it depends on what the text is. The field stops at 8,000 characters with the message "content must be at most 8000 characters." — the wording begins with a lower-case word and prints the number without a separator, which is the tool\x27s own phrasing. The symbol is the real limit: in byte mode the encoder documents 2,953 characters at level L, 2,331 at M, 1,663 at Q and 1,273 at H, and plain letters at the default M level do fit at 2,331 and fail at 3,000. Digits fit far more, because a denser mode is chosen automatically for them — 4,000 digits encode without complaint at M. Accented and non-Latin characters and emoji each cost several of those bytes, so a few hundred emoji will not fit at any level.',
      },
      {
        question: 'What do the four error-correction levels do?',
        answer:
          'They set how much of the symbol can be damaged or obscured and still be read. L recovers the least and leaves the most room for content, M is the default, and Q and H recover progressively more while holding progressively less — the capacity drops from 2,953 bytes at L to 1,273 at H. Choose a higher level for a code that will be printed small, on a curved or textured surface, or anywhere it may be scuffed; choose L when the content is long. Any other value gives "Choose a valid correction level."',
      },
      {
        question: 'Can I change the size or the colours?',
        answer:
          'The width is yours between 160 and 1,200 pixels, and anything outside that gives "SVG width must be between 160 and 1200." Because the file is an SVG with the module grid in its view box, it scales to any print size without going blocky, whatever pixel width you picked. The colours on this page are fixed at black on white, the quiet zone is fixed at four modules, and there is no PNG or JPEG export here — save the SVG and convert it if your printer needs a raster file.',
      },
      {
        question: 'Is the text hidden or protected in any way?',
        answer:
          'Not at all. The text sits in the symbol in the clear, and any scanner app displays it. Treat a printed text QR code exactly as you would treat the same words printed underneath it, and do not put a password, a one-time code or anything private into one. Nothing is logged and nothing counts scans either, which is the other side of the same coin: there is no way to tell how often the code was read.',
      },
      {
        question: 'Will it scan reliably?',
        answer:
          'Test it, which is what the page itself asks you to do: try the downloaded symbol with the exact devices, print size, surface and lighting you intend to use. Longer text makes a denser symbol with smaller modules, so if a long code reads poorly, shorten the text, drop the recovery level, or print it larger. Whether a scanner shows your line breaks, or runs the text together, is decided by that scanner app and not by the code.',
      },
    ],
  },

  // lib/tools/finance-business-workbench.ts (the compound-interest-calculator
  // case, compoundFields(), the future(), finite(), percent() and format()
  // helpers and scenarioNotice) and
  // lib/tools/finance-business-workbench.test.ts. The figures and refusals below
  // came from running the built operation.
  'finance-and-business-compound-interest-calculator': {
    directAnswer:
      'Enter the starting amount, the annual rate as a percentage, the number of years and how many times a year interest compounds, then run it. You get the future value from the standard formula — the starting amount times one plus the rate divided by the frequency, raised to the power of years times frequency — and the growth, which is that value minus what you put in. It is an estimate built only from the numbers you type, not financial advice.',
    leadParagraph:
      'This is one formula with four inputs and nothing hidden inside it. Nothing is added along the way: no contributions, no fees, no tax, no inflation adjustment and no currency, so the answer is a bare number in whatever unit you had in mind. The compounding frequency is a whole number from 1 to 365, which covers yearly, half-yearly, quarterly, monthly and daily, but not continuous compounding, which is not offered here. A negative rate is accepted down to minus 99.999999 per cent, so a shrinking balance can be modelled. The page carries its own notice: scenario math only, and rates, fees, compounding, timing, taxes, insurance, rounding and provider rules can all change the real result.',
    faqs: [
      {
        question: 'What exactly does it calculate?',
        answer:
          'The future value of a single amount left to compound at a constant rate. With 100,000 at 8 per cent for 10 years compounding 12 times a year it returns a future value of 221964.023454 and a growth of 121964.023454. Results are printed to 12 significant digits with trailing zeros dropped, and there is no currency symbol and no thousands separator, because the tool has no idea which currency you mean. Growth is simply the future value minus the starting amount, so it is not a return figure and takes no account of anything you paid in along the way.',
      },
      {
        question: 'What happens if I leave a box empty?',
        answer:
          'It is read as zero, and you get a confident-looking answer rather than a warning. An empty rate box returns a future value equal to the starting amount and a growth of exactly 0; an empty starting amount returns 0 and 0; an empty years box does the same. None of those stop the run, because zero is inside the allowed range for each field. Check that every box actually holds a number before you rely on a result, particularly the rate.',
      },
      {
        question: 'Why was one of my numbers refused?',
        answer:
          'The compounding frequency must be a whole number from 1 to 365: 2.5 gives "Frequency must be a whole number from 1 to 365." and 366 gives a differently worded message naming the internal field instead of the label you filled in. Years multiplied by frequency must itself land on a whole number no greater than 1,000,000, so 10.5 years compounding once a year is refused with "Years × frequency must be a whole number no greater than 1,000,000." while 10.5 years compounding monthly is fine, because that is 126 periods. A negative starting amount is refused too, with a message that ends in the largest number a browser can hold — an awkward line, but it means the field must not be negative.',
      },
      {
        question: 'Does it handle contributions, tax or inflation?',
        answer:
          'No, none of the three. Nothing is added to the balance after the start, nothing is deducted for tax, charges or an account fee, and no adjustment is made for inflation, so the answer is in the money of the day you started. Regular paying-in is a separate tool in the same workbench, which projects end-of-month contributions at a constant monthly-equivalent rate. To see a result in today\x27s money, work the inflation out yourself afterwards.',
      },
      {
        question: 'How exact is the arithmetic?',
        answer:
          'The calculation uses double-precision floating point and the answer is rounded to 12 significant digits, with anything smaller than a ten-billionth printed as 0. That is far more precision than the inputs deserve. The bigger caveat is the model, not the arithmetic: it assumes the rate is exactly constant for the whole term and that compounding falls at perfectly even intervals, and a real account changes its rate, counts days its own way and rounds at every step.',
      },
    ],
  },

  // lib/tools/date-workbench.ts (the business-days-calculator case, the
  // businessDays() and weekdaysInClosedRange() helpers and parseDateOnly) and
  // lib/tools/date-workbench.test.ts. Every count below was produced by running
  // the built operation.
  'date-time-and-productivity-business-days-calculator': {
    directAnswer:
      'Enter a start date and an end date, each written as a four-digit year, month and day joined by hyphens, then run it. The tool counts the Monday to Friday dates between them, leaving the start date out and counting the end date in — so Monday 5 January to Friday 9 January 2026 comes to 4 business days, not 5. Reversing the two dates returns the same number with a minus sign in front.',
    leadParagraph:
      'This counts weekdays and nothing else. Saturday and Sunday are the only days it skips: there is no public holiday list for any country, no field for pasting your own, and no way to say your working week runs Sunday to Thursday. Counting from Thursday 24 December 2026 to Monday 28 December 2026 returns 2 business days, because Christmas Day falls on the Friday and is treated as an ordinary working day. The arithmetic is done on whole dates in UTC, so no clock, no time zone and no daylight-saving change can shift a result by a day. Dates from the year 0100 to 9999 are accepted.',
    faqs: [
      {
        question: 'Is the start day counted?',
        answer:
          'No — the end day is, and the start day is not. That is the single thing to check before you use a number from here, because many people expect both ends to be included. Monday to Friday of the same week gives 4, not 5. The same date twice gives 0 business days. Monday to Tuesday gives 1 business day. A Saturday to the Sunday after it gives 0. If your deadline rule counts the first day too, add one whenever the start date is itself a weekday.',
      },
      {
        question: 'Does it know about public holidays?',
        answer:
          'No, for any country. There is no holiday list built in, no regional setting and no box for entering your own dates, so a national holiday, a bank holiday, a festival day and an office closure are all counted as working days. The sibling workday calculator in the same workbench says the same thing in its own description. Count the holidays that fall inside your range yourself and subtract them.',
      },
      {
        question: 'Can I change which days are the weekend?',
        answer:
          'No. Saturday and Sunday are fixed in the code as the non-working days, so a six-day week, a Friday and Saturday weekend, a four-day week and a shift pattern cannot be represented. For those, count the calendar days with the date difference tool in the same workbench and do the weekend arithmetic yourself.',
      },
      {
        question: 'What date format does it accept?',
        answer:
          'Only a four-digit year, a two-digit month and a two-digit day joined by hyphens. Anything else, including 05/01/2026, stops with "Use a valid date in YYYY-MM-DD form." A value that has the right shape but is not a real date, such as 2026-02-30, stops with "Use a valid calendar date." Years outside 0100 to 9999 are refused. Leap days are handled as real calendar dates rather than as arithmetic on day counts.',
      },
      {
        question: 'What do I get back?',
        answer:
          'One line of text: the number followed by "business days", or "business day" when the count is exactly one either way. When the end date is earlier than the start, the count comes back negative and is the exact mirror of the forward count, so swapping the dates never changes the size of the answer. The download button saves that line as business-days-calculator.txt, and the copy button puts it on your clipboard.',
      },
    ],
  },

  // lib/tools/science-education-workbench.ts (the
  // solution-dilution-calculator case, the positive(), finite() and format()
  // helpers and physicsNotice) and lib/tools/science-education-workbench.test.ts.
  // The worked figures and refusals below came from running the built operation.
  'science-and-education-solution-dilution-calculator': {
    directAnswer:
      'Enter the starting concentration, the starting volume and the concentration you want, then run it: the tool rearranges C1 V1 = C2 V2 and returns V2, the total final volume, in whatever unit you used for V1. It does not tell you how much solvent to add — that is V2 minus V1, which you work out yourself, and the two concentrations have to be in the same unit already, because nothing here converts between molarity, percentage and parts per million. It is a calculation aid, not medical advice and not a substitute for a checked protocol.',
    leadParagraph:
      'This is the ideal dilution relation and nothing more: one multiplication and one division, with no units attached to any of the three boxes. That is deliberate, and it is easy to misread — C1 and C2 have to match each other, and the answer carries the unit you used for V1, which the output line states in so many words. Serial dilutions, dilution factors, making up a solution from a solid, and working out molarity from mass and molar mass are all either separate tools or not offered at all. The calculation assumes volumes simply add, which is close enough for dilute aqueous work and is not true for concentrated acids or for alcohol and water. The page carries its own notice about checking significant figures, uncertainty, conditions and domain assumptions before laboratory or engineering use.',
    faqs: [
      {
        question: 'How much solvent do I actually add?',
        answer:
          'The final volume minus the starting volume, which you do yourself. Diluting 100 mL of a 1 molar stock to 0.25 molar returns a required final volume of 400, so you take the 100 mL and make it up to 400 mL, adding 300 mL of solvent. The tool prints 400 and stops there. Making up to a mark in a volumetric flask is the accurate way to reach that final volume; measuring out the solvent separately and adding it is only as good as the assumption that the volumes add.',
      },
      {
        question: 'Which units should I use?',
        answer:
          'Any, as long as you are consistent. The two concentrations must be in the same unit as each other — both molar, or both per cent, or both parts per million — and the answer comes back in whatever unit the starting volume was in, which the output line spells out as "same volume unit as V1". Nothing is converted and nothing is labelled, so mixing a molarity with a percentage produces an answer that is arithmetically correct and physically meaningless.',
      },
      {
        question: 'What if the target concentration is higher than the start?',
        answer:
          'It answers anyway, with no warning at all. Asking to go from 0.25 to 1 in 100 units of volume returns 25, a final volume smaller than the one you started with. Adding solvent cannot raise a concentration, so a result below your starting volume means you have asked for a concentration step rather than a dilution — check which way round C1 and C2 are before using the number.',
      },
      {
        question: 'Why was one of my numbers refused?',
        answer:
          'All three boxes must hold a number greater than zero. A zero, a negative or an empty box gives a message that names the internal field and prints the smallest and largest numbers a browser can represent — for example a message about c2 that ends in a very long exponent. It is an awkward line, and what it means is simply that the field needs a positive number in it. There is no upper limit in practice, and no check on whether your numbers are physically sensible.',
      },
      {
        question:
          'How is the answer rounded, and what does it not account for?',
        answer:
          'To 12 significant digits, which is far beyond what any pipette, balance or volumetric flask justifies — round it to your own significant figures before writing it down. The calculation takes no account of temperature, of the purity or true strength of your stock, of activity coefficients, or of the tolerance of the glassware you are using. It answers the arithmetic question only; the laboratory judgement stays with you.',
      },
    ],
  },

  // lib/tools/life-admin-workbench.ts (the pin-code-format-checker case, the
  // formatCheck() and required() helpers and syntaxNotice) and
  // lib/tools/life-admin-workbench.test.ts. Every verdict quoted below was
  // produced by running the built operation.
  'india-and-life-admin-pin-code-format-checker': {
    directAnswer:
      'Type the code and run it: every space is stripped, and the tool reports either MATCHES FORMAT or DOES NOT MATCH FORMAT, prints the cleaned value it actually tested, and names the rule it applied. That rule is six digits whose first digit is not zero. It checks shape only and never looks anything up, so it cannot tell you whether a code exists or which post office it belongs to.',
    leadParagraph:
      'An Indian postal index number is six digits, and the first digit identifies the postal region, which is why no PIN code begins with a zero. That is the whole of what is checked here: one digit from 1 to 9 followed by five more digits. The output says as much itself, printing "Rule: six digits; first digit is not zero" and then "Not an existence or ownership check." There is no data behind it — no list of live codes, no mapping to a state, district or post office, and nothing about whether post is actually delivered there. It is also looser than the real numbering plan in one place worth knowing: the 9 series belongs to the Army Postal Service rather than to ordinary civilian addresses, and a code such as 900001 is still reported here as matching the format. Use it to catch a typo, not to confirm an address.',
    faqs: [
      {
        question: 'What exactly does it accept?',
        answer:
          'Six digits with a first digit from 1 to 9. Every space is removed before the test, so 560 038 and even 5 6 0 0 3 8 both match. Nothing else is removed: 560-038 keeps its hyphen, is reported as not matching, and the Normalized line shows you the hyphen it kept, which is the quickest way to see why. A leading zero such as 060038 does not match, and seven digits does not match. There is no check of the last five digits at all — any combination of them is accepted.',
      },
      {
        question: 'Does a matching result mean the code is real?',
        answer:
          'No, and the tool says so on its own last line. Every six-digit number from 100000 to 999999 matches this rule, which is nine hundred thousand possibilities, and only a fraction of those are codes India Post actually uses. Nothing is looked up, nothing is fetched and no list is consulted. To confirm a real code, check it against India Post or the delivery address you were given.',
      },
      {
        question: 'Will it tell me the state, district or post office?',
        answer:
          'No. It does not decode the first digit into a region, the first two into a postal circle, the third into a sorting district or the last three into a delivery office. The result is four lines and no more: the verdict, the normalised value it tested, the rule, and the reminder that this is not an existence or ownership check.',
      },
      {
        question: 'Why does it say "Enter a pin code first."?',
        answer:
          'That is the message when the box is empty or holds only spaces. The wording lower-cases PIN, which is a slip in the message rather than a different check — the rule applied is the same either way. There is also a length guard at 100,000 characters, which nobody entering a postal code will ever reach.',
      },
      {
        question: 'Can I check several codes at once?',
        answer:
          'No. The field is a single line and one value is tested per run, so a list has to be checked one code at a time. Pasting a whole address does not work either, because the letters in it are not removed and the value fails the digits-only rule. The address formatter in the same workbench lays an address out on separate lines, and it carries the same caution: it does not verify a locality, a PIN code, deliverability or any government address record.',
      },
    ],
  },

  // lib/tools/creator-workbench.ts (the youtube-tag-workspace case and the
  // tags() helper that splits, strips and deduplicates) and
  // lib/tools/creator-workbench.test.ts. The splitting shown below was produced
  // by running the built operation on the default value the tool ships with.
  'creator-and-social-youtube-tag-workspace': {
    directAnswer:
      'Paste your tags and run it: leading hash signs are stripped, duplicates are removed ignoring case, and the survivors come back joined by commas with a count of the tags and of the characters. Check the result before you use it, because the splitting is done on spaces as well as on commas, so a multi-word tag is broken into separate one-word tags. Where a tag repeats, the first spelling is the one kept.',
    leadParagraph:
      'The operation describes itself as working on comma or newline separated tags, but the code splits on any run of spaces, tabs, line breaks or commas. A phrase therefore does not survive: "how to bake bread, sourdough starter" comes back as six tags — how, to, bake, bread, sourdough, starter — and even the example the tool ships with, "privacy tools, browser tools, productivity, privacy tools", comes back as the four single words privacy, tools, browser, productivity. Since a video tag is usually a phrase, treat this as a deduplicating word list rather than a tag editor, and read the output against what you meant to type. Deduplication compares without regard to case and keeps the first spelling, so Baking, baking and BAKING collapse to Baking. Between one and 1,000 pieces are accepted after the splitting.',
    faqs: [
      {
        question: 'Why did my multi-word tags split up?',
        answer:
          'Because the splitter treats a space exactly as it treats a comma, even though the tool\x27s own description mentions only commas and new lines. Every run of spaces, tabs, line breaks and commas is a boundary, so "browser tools" is two tags and not one, and there is no setting anywhere on the page to change the separator. If you need phrase tags, keep the list somewhere else and use this only for single words, or paste the result back into your own editor and rejoin the pieces by hand.',
      },
      {
        question: 'What does the character count include?',
        answer:
          'The whole joined string, counting the comma and space written between each pair of tags, measured in Unicode code points. It is reported and nothing more: the count is not compared against any platform limit, there is no warning when it gets large, and no colour or threshold appears. Expect one rough edge in the wording — a result holding a single tag still reads "1 unique tags", because the label is not made singular.',
      },
      {
        question: 'How does the deduplication work?',
        answer:
          'Each piece is lower-cased for comparison only, so two spellings that differ just by case are treated as the same tag and the first one you wrote is the one that survives; the others are dropped without a note. A leading hash sign is removed before that comparison, so a hashtag and a plain word are the same tag. Nothing else is trimmed, so a trailing exclamation mark or a stray full stop makes a separate tag, and the order of everything that survives is the order you typed it in.',
      },
      {
        question: 'What are the limits?',
        answer:
          'After splitting there must be between one and 1,000 pieces; outside that range the run stops with "Enter from one to 1,000 tags.", and an empty box gives the same message. There is no maximum length for an individual tag and no cap on the combined length, so nothing stops you producing a list longer than a platform will accept — the count is there for you to judge that yourself.',
      },
      {
        question: 'Does it suggest tags or tell me what is popular?',
        answer:
          'No. Nothing is fetched, no video is read, no search data exists here and no ranking of any kind is implied or possible. It is a list cleaner that runs on the text you paste. The hashtag tools in the same workbench do the identical job and put a hash in front of each surviving word, which is the only difference between them.',
      },
    ],
  },

  // components/image-editor-tool.tsx (EDITOR_TASKS, MAX_BYTES, chooseImage, the
  // run() canvas pipeline including the scale() call and the JPEG background
  // fill, the format and quality controls and the download name),
  // lib/tools/image.ts (supportedRasterTypes, transformedDimensions,
  // extensionForRasterType) and lib/tools/image.test.ts.
  'image-image-flipper': {
    directAnswer:
      'Open a JPEG, PNG or WebP image of up to 25 MB, then press Flip H to mirror it left to right, Flip V to mirror it top to bottom, or both to end up with a 180 degree turn. Each button is a toggle and nothing is written until you press the button below the controls. The saved file is re-encoded as WebP unless you choose JPEG or PNG in the format box.',
    leadParagraph:
      'Mirroring is done by drawing the picture to a canvas with a negative scale, so the pixels are genuinely rearranged in the file rather than a flag being set that a viewer may or may not respect. The dimensions do not change: a mirrored 640 by 480 photograph is still 640 by 480. Because the whole editor is one pass over one picture, the crop boxes, the rotate button and the brightness, contrast, greyscale and sepia sliders sit on the same page and all apply in the same run. The output is encoded fresh from the canvas and nothing in this tool reads or copies the original file\x27s metadata, so none of it is carried across. And any text or logo in the picture will come out backwards, which is what mirroring means and the usual reason a mirrored photograph looks wrong.',
    faqs: [
      {
        question: 'What is the difference between flipping and rotating?',
        answer:
          'A flip is a mirror and a rotation is a turn. Flipping left to right and then top to bottom gives the same picture as a 180 degree rotation, which is why both buttons together look like a turn. A single flip can never be produced by rotating, though: text reads backwards after a mirror and stays readable after a turn. The rotate button on this same page works in 90 degree steps and swaps the width and height on a quarter turn, which a flip never does.',
      },
      {
        question:
          'Why does Flip H mirror my picture up and down after I rotate it?',
        answer:
          'Because the mirror is applied in the picture\x27s own axes and the turn is applied after it. Once a quarter turn is in place, what was the picture\x27s left-to-right axis is the output\x27s vertical one, so Flip H mirrors the visible result top to bottom and Flip V mirrors it left to right. If you want to mirror what you can see on screen, either do the flip before setting the rotation, or simply press the other flip button.',
      },
      {
        question: 'Why was my image refused?',
        answer:
          'A file that is not a JPEG, PNG or WebP gives "Choose a static JPEG, PNG, or WebP image.", which rules out GIF, HEIC, AVIF, TIFF and SVG. A file over 25 MB gives "This candidate limits source images to 25 MB." A file the browser cannot decode gives "The browser could not decode this image." A result over 64 megapixels gives "The edited image exceeds the 64 megapixel canvas limit." After encoding, the finished image is read back and its dimensions checked against what was asked for, and a mismatch stops with "The edited image failed its dimension check." rather than handing you the wrong file.',
      },
      {
        question: 'What file do I get back?',
        answer:
          'The format box starts on WebP, so a JPEG you mirror is saved as a WebP file unless you change it, and the quality slider runs from 10 to 100 starting at 90. Choosing PNG switches the slider off and reads lossless. JPEG has no transparency, so the canvas is painted white first and a transparent PNG saved as JPEG comes back on white. The saved file is always called edited-image with the extension of the format the browser really produced: some browsers answer a WebP request with a PNG, and the tool reports the format it got rather than naming the file for one it is not.',
      },
      {
        question: 'Does mirroring lose any quality?',
        answer:
          'The mirror itself loses nothing, because it moves whole pixels onto whole pixel positions with no interpolation. The saving does, if you choose a lossy format: the file is encoded again from scratch, so repeated edit-and-save rounds compound the loss. Choose PNG for a lossless save, or push the quality slider up for WebP and JPEG. Selecting a different image resets both flips, the rotation and every slider to their starting values.',
      },
    ],
  },

  // lib/tools/spreadsheet-workbench.ts (the csv-filter case with its five
  // operators and their differing case handling, plus the table / header /
  // toCsv helpers), lib/tools/spreadsheet-workbench.test.ts,
  // lib/tools/structured.ts (csvToRecords, which supplies the parse refusals)
  // and components/schema-workbench-tool.tsx for the download extension. Each
  // behaviour below was run through the built operation.
  'spreadsheet-and-data-csv-filter': {
    directAnswer:
      'Paste the CSV, type the exact name of the column to test, choose one of five conditions — equals, contains, starts with, number greater than, number less than — and type the value to compare against. Rows whose cell passes are kept in their original order, and the header row always comes back even when nothing matches. One condition is applied per run: there is no way to combine two tests.',
    leadParagraph:
      'This keeps the rows you want from one comma-separated table and discards the rest. The case rules are the first thing to check, because they are not the same for all five conditions: Equals compares the cell to your value exactly, capital letters and spaces included, while Contains and Starts with lower-case both sides before comparing. So a Team column holding Blue is kept by Contains with the value blue and dropped by Equals with that same value. The two numeric conditions read both sides as numbers and stop the run with "Numeric filters require finite numbers." when either side cannot be read as one. There is no ends-with, no not-equals, no greater-or-equal, no pattern matching and no comparison of dates as dates.',
    faqs: [
      {
        question: 'Why did Equals miss a row that Contains found?',
        answer:
          'Because Equals is the only condition that respects capital letters. Contains and Starts with lower-case the cell and your value before comparing, so they ignore case; Equals compares the two strings exactly as they stand. Equals is also sensitive to spaces the eye does not see — a cell exported as Blue with a trailing space will not equal Blue. Run the CSV cleaner in the same workbench first if your export leaves padding around its values.',
      },
      {
        question: 'What happens to blank cells and to a blank value?',
        answer:
          'Both cases pass silently rather than raising anything. An empty cell is read as the number zero by the two numeric conditions, so filtering a score column for numbers less than 5 keeps the row whose score is simply missing. And leaving the value box empty with Contains keeps every single row, because every piece of text contains nothing. Neither is reported, so check the row count of the result against what you expected.',
      },
      {
        question:
          'Can I use two conditions, or drop rows instead of keeping them?',
        answer:
          'No to both. One column, one condition, one value, and the rows that pass are the rows you keep. There is no invert switch, so removing rows means writing a condition that only the rows you want to keep can pass. Running the tool twice, feeding one result into the next, gives you an and of two conditions but can only ever narrow the result — an or of two conditions cannot be expressed here at all.',
      },
      {
        question: 'Why does it say my column is unknown?',
        answer:
          'The name you type is trimmed and then has to match a header exactly, capital letters included: typing Team against a header written team gives "Unknown column: Team." An empty box gives "Unknown column: (blank)." Headers in the file are trimmed when it is parsed, so spaces around a header name in the source are not the cause — only spelling and case are.',
      },
      {
        question: 'What comes back, and what does the download contain?',
        answer:
          'A fresh CSV with the same headers and only the rows that passed, still in their original order; a filter that matches nothing returns the header line on its own. Quoting is rewritten rather than copied, so a field is wrapped in double quotes only when it contains a comma, a double quote or a line break. The download button saves the result as csv-filter.txt with a plain-text type, because the CSV tools in this workbench declare no file extension of their own — rename it to .csv for a spreadsheet, or copy and paste instead. Tables are limited to 2,000,000 characters, 100,000 rows and 1,000 columns, and the strict parser refuses a blank or duplicate header and any row with the wrong number of fields, naming the row.',
      },
    ],
  },

  // lib/tools/notation/markup.ts (markdownToHtml, inlineMarkdown and
  // escapeHtml), lib/tools/writing-workbench.ts (the markdown-to-html
  // operation, its notice and outputExtension),
  // lib/tools/writing-workbench.test.ts and components/schema-workbench-tool.tsx.
  // Every conversion described below was run through the built function.
  'text-and-writing-markdown-to-html': {
    directAnswer:
      'Paste the Markdown and run it; the HTML appears beside it, ready to copy or to download as markdown-to-html.html. Every character is escaped before a single Markdown rule is applied, so raw markup in your source comes out as visible text rather than as live tags — a script tag in the input becomes words on the page. The tool states its own scope above the button: a documented common subset, not every Markdown extension.',
    leadParagraph:
      'This converts a small and deliberately safe slice of Markdown: headings written with one to six hashes and a space, fenced code blocks between triple backticks, bulleted lists marked with a hyphen or an asterisk, numbered lists marked with a digit and a full stop or bracket, and inline backticks, double-asterisk bold, single-asterisk italic and square-bracket links. Anything that matches none of those becomes a paragraph. Because the escaping happens first, the output can never contain markup you did not ask for, and the price of that is that you cannot mix HTML into your Markdown at all. Links are checked before they are written: only web and mail addresses become links, and anything else, a relative path included, is written out as the label followed by the address in brackets. Each line is its own block, so a paragraph you soft-wrapped across three lines becomes three separate paragraphs.',
    faqs: [
      {
        question: 'What Markdown is not supported?',
        answer:
          'Tables, blockquotes, nested lists, images, horizontal rules, task lists, strikethrough, footnotes, reference-style links, and underscores for emphasis. Each of those falls through to a paragraph holding its literal text: a line of three hyphens becomes a paragraph containing three hyphens, a table row becomes a paragraph full of pipe characters, and an indented sub-item becomes a paragraph because the list rules require the marker at the very start of the line. Bold and italic must use asterisks, because the underscore forms are not recognised. A numbered list always renders from one — the number you wrote is discarded.',
      },
      {
        question: 'Does it protect me from HTML inside my Markdown?',
        answer:
          'Yes, completely. Every ampersand, angle bracket, double quote and apostrophe is replaced with an escape before any rule runs, and a test in this repository requires a script tag in the input to come back escaped. One visible side effect is that apostrophes and quotation marks in ordinary prose are written as numeric character references in the source, which renders identically but makes the HTML look noisier than you wrote it. The other side of the guarantee is that a fragment of HTML you wanted to keep, an embedded player for instance, is shown as text rather than kept.',
      },
      {
        question: 'Are there quirks I should check in the output?',
        answer:
          'Two, both worth seeing before you publish. Inside a fenced code block every line is followed by a blank one, so a three-line snippet comes out double-spaced on the rendered page and needs tidying by hand. And backticks do not make their contents inert: the inline code rule runs first, so bold, italic and link syntax written inside backticks is still converted, and a link written inside backticks becomes a real link sitting inside the code element. Keep syntax examples out of backticks, or fix the result afterwards.',
      },
      {
        question: 'How are links and code fences handled?',
        answer:
          'A link is parsed as a full address first. Web and mail addresses become links; anything the parser rejects, and any relative path such as a leading slash and a page name, is written as the label followed by the address in brackets as plain text. The address is re-serialised by the parser, so the host is lower-cased and an empty path gains a trailing slash. A space anywhere in the address stops it being read as a link at all. For code, the language written after the opening backticks is discarded and no class is added, so a syntax highlighter has nothing to key on, and a fence you forget to close is closed for you at the end of the document.',
      },
      {
        question: 'What are the limits, and what exactly is downloaded?',
        answer:
          'An empty box, or one holding only spaces, stops with "Markdown is required." There is no character limit, so the practical ceiling is what the browser tab holds, and Windows line endings are normalised before parsing. What you get is an HTML fragment and not a complete document: there is no doctype, no page or head element and no stylesheet, so wrap it in your own template before serving it. The download button saves that fragment as markdown-to-html.html.',
      },
    ],
  },

  // lib/tools/math-workbench.ts (MATH_OPERATIONS 'proportion-calculator',
  // runMathOperation, numeric, format), lib/tools/math-workbench.test.ts,
  // components/math-workbench-tool.tsx and app/math/[tool]/page.tsx
  'math-and-units-proportion-calculator': {
    directAnswer:
      'Type the three terms you know into a, b and c, and the fourth is worked out for you as x = (b × c) ÷ a. There is no button: the answer is recalculated a quarter of a second after you stop typing, and shown on one line as x = followed by the value. The unknown is always the fourth term, so a proportion with its gap somewhere else has to be reordered before you type it in.',
    leadParagraph:
      'This solves a:b = c:x by cross-multiplication and nothing more. The three boxes start at 2, 3 and 8, which gives x = 12, and that exact case is pinned by a test in this repository. Each box is read with JavaScript\x27s own number conversion, so decimals, negatives and forms such as 1e3 are all accepted, an empty box reads as zero, and anything that is not a number stops the run by name. The answer is printed to twelve significant figures — enough that a recurring result such as one third is visibly rounded rather than exact. Nothing about units, currency or percentages is understood here; the tool sees four numbers in a ratio and returns the one you left out.',
    faqs: [
      {
        question:
          'Which of the four values does the proportion calculator solve for?',
        answer:
          'Always the fourth one, called x. The page reads a, b and c and returns x = (b × c) ÷ a, so it answers a:b = c:x and only that arrangement. If your unknown sits in the first position — x:3 = 8:12, say — rewrite the proportion so the gap is last, which here means entering 8, 12 and 3 to get x = 4.5. There is no setting that moves the unknown, and no second output line showing the other terms.',
      },
      {
        question:
          'What happens if I leave a box empty or type something that is not a number?',
        answer:
          'An empty box is read as zero, because each value goes through JavaScript\x27s own number conversion before anything else happens. That matters most for the first box: a zero in a stops the run with "a cannot be zero.", since dividing by it has no answer. A box holding letters or a currency symbol gives "Enter a finite number for a." with the name of the offending box, and the previous answer stays on screen until a valid set of three numbers is typed.',
      },
      {
        question: 'How precise is the answer from the proportion calculator?',
        answer:
          'Twelve significant figures. The result is computed in ordinary binary floating point and then reduced to twelve digits of precision before it is printed, so a value such as two thirds comes out as 0.666666666667 rather than running on. A result that overflows — very large terms multiplied together — is refused with "The result is outside the finite number range." rather than shown as infinity. Treat the twelve digits as a display limit, not as a promise of exactness in the last place.',
      },
      {
        question: 'Does it understand units, percentages or currency?',
        answer:
          'No. It is pure cross-multiplication on four bare numbers, so the units are yours to keep track of. Scaling a recipe from 2 cups to 8 cups works because both sides are in cups; mixing grams on one side with ounces on the other produces a number that is arithmetically right and practically wrong. The same applies to percentages: enter 15 if you mean fifteen, not 0.15, and keep the same convention on both sides of the proportion.',
      },
      {
        question:
          'Can I save the result, and where does the calculation happen?',
        answer:
          'There is a copy button beside the result, labelled Copy result, and that is the only way out — this calculator produces one line of text, so it offers no file to download. The arithmetic runs in the page itself, in the same tab you have open, and the three numbers you type are never sent anywhere to be worked out. Switching to another calculator from the dropdown navigates to that calculator\x27s own page and resets the boxes to its defaults.',
      },
    ],
  },

  // lib/tools/math-workbench.ts (MATH_OPERATIONS 'average-calculator',
  // runMathOperation, parseList, format), lib/tools/math-workbench.test.ts
  // and components/math-workbench-tool.tsx
  'math-and-units-average-calculator': {
    directAnswer:
      'Paste your numbers into the one box — separated by spaces, commas, semicolons or new lines, in any mixture — and the arithmetic mean appears a quarter of a second later. The list is added left to right and divided by how many values were found, then printed to twelve significant figures. One trap is worth knowing before you paste: a comma is a separator here, so 1,000 is read as two numbers rather than one thousand.',
    leadParagraph:
      'This is the arithmetic mean and only the arithmetic mean — the sum divided by the count. The box splits on any run of whitespace, commas or semicolons, drops the empty pieces, and converts each remaining piece with JavaScript\x27s own number conversion, so 1,2,3,4 gives 2.5 and that case is pinned by a test in this repository. Negatives, decimals and exponent forms such as 2.5e3 all survive; a currency symbol, a percent sign or a stray letter does not, and the whole run stops rather than skipping the bad value. Lists are capped at 100,000 values, which is a limit on the paste, not on the arithmetic. Median, mode, variance and standard deviation are separate calculators in the same dropdown, because each answers a different question about the same list.',
    faqs: [
      {
        question: 'How do I separate the numbers in the average calculator?',
        answer:
          'Any run of spaces, tabs, commas, semicolons or line breaks counts as one separator, and you can mix them freely in the same paste. That means a column copied out of a spreadsheet works as it stands, and so does a comma-separated line, and so does a mixture of the two. Empty pieces between separators are dropped, so trailing commas and blank lines do no harm. There is no setting to change the separator, and no way to tell it to treat a character as part of a number instead.',
      },
      {
        question:
          'Why did my numbers with thousands separators give a strange average?',
        answer:
          'Because the comma is a separator here, not part of the number. Pasting 1,000 produces two values — 1 and 000, which converts to 0 — so a single figure of one thousand becomes two figures averaging 0.5. The same happens with a space used as a grouping mark: 1 000 is read as 1 and 0. Strip the grouping marks before pasting, or export the column without them, and check the count the result panel implies against how many figures you meant to supply.',
      },
      {
        question: 'Which average does this calculate?',
        answer:
          'The mean: every value added together and divided by the number of values. It is not the median, which is the middle value once the list is sorted, and not the mode, which is the most frequent value; those are separate tools in the same dropdown on this site. There is no weighting either — every value counts once, so a list where one figure represents a hundred observations will not reflect that unless you repeat it a hundred times.',
      },
      {
        question: 'What will the average calculator refuse?',
        answer:
          'Three things, each by name. An empty box, or a box holding only separators, gives "Enter a list of finite numbers separated by spaces or commas." So does any single piece that will not convert to a finite number — a percent sign, a rupee or pound symbol, the word Infinity, or a stray letter — and the whole run stops rather than quietly ignoring that one value. More than 100,000 values gives "Number lists are limited to 100,000 values." Nothing is skipped or guessed at to make a messy paste work.',
      },
      {
        question: 'How exact is the sum on a long list?',
        answer:
          'The values are added one at a time from left to right in ordinary binary floating point, and the result is then printed to twelve significant figures. On a long list of values with very different magnitudes, that accumulation order can lose precision in the last places — a known property of floating-point addition rather than anything particular to this page. For a few hundred ordinary measurements it makes no visible difference; for accounting work where the last penny is contractual, total in a tool built for exact decimal arithmetic.',
      },
    ],
  },

  // lib/tools/life-admin-workbench.ts (LIFE_ADMIN_OPERATIONS
  // 'ifsc-format-checker', runLifeAdminOperation, formatCheck, required),
  // lib/tools/life-admin-workbench.test.ts,
  // components/life-admin-workbench-tool.tsx and
  // components/schema-workbench-tool.tsx
  'india-and-life-admin-ifsc-format-checker': {
    directAnswer:
      'Paste an IFSC into the box and the page reports MATCHES FORMAT or DOES NOT MATCH FORMAT against the shape the Reserve Bank documents: four letters, then the digit zero, then six letters or digits. It is a shape check and it says so on screen — the last line of every result reads "Not an existence or ownership check." No directory is consulted, so a code that matches may still belong to no branch at all.',
    leadParagraph:
      'The test applied is one regular expression, ^[A-Z]{4}0[A-Z0-9]{6}$, which is the eleven-character structure and nothing looser. Your typing is tidied first: leading and trailing spaces are removed, every remaining space is stripped, and the whole thing is upper-cased, so sbin 0001 234 and SBIN0001234 are treated as the same code. A test in this repository checks both directions — lower-case sbin0001234 matches, and SBIN1001234 does not, because the fifth character has to be the digit zero. The result is four lines: the verdict, the normalised code, the rule in words, and the disclaimer. IFSC carries no check digit, so shape is the most that can be established without a directory; whether the branch exists, is still open, or is the one you want is a question only the bank or the RBI can answer.',
    faqs: [
      {
        question: 'What exactly does the IFSC format checker test?',
        answer:
          'Eleven characters in a fixed order: positions one to four must be letters A to Z, position five must be the digit zero, and positions six to eleven may each be a letter or a digit. That is the whole test. It does not look up the four-letter bank code against any list, so a made-up code such as ZZZZ0000001 matches the format perfectly. It does not check length against a shorter or longer variant either — ten or twelve characters simply fail.',
      },
      {
        question: 'Does a match mean the bank branch actually exists?',
        answer:
          'No, and the tool prints that limit as part of every result. A matching IFSC has the right shape and nothing more: the branch may have merged, closed, been renumbered, or never have existed. Nothing is looked up, because no directory is consulted and no request leaves the page to check. Before sending money to a branch you have not used, confirm the code against the bank\x27s own published list or the Reserve Bank of India, and confirm the account name separately.',
      },
      {
        question: 'How is my typing cleaned up before the check?',
        answer:
          'Surrounding whitespace is trimmed, then every space anywhere in the value is removed, then the result is turned to upper case. So sbin 0001 234 passes and prints as SBIN0001234 on the Normalized line. Other punctuation is not removed: a hyphen, a slash or a full stop stays in the string, is not a letter or a digit, and therefore fails the check. If your code came from a PDF or a bank statement, strip the separators before pasting.',
      },
      {
        question: 'Why is my IFSC being refused when it looks correct?',
        answer:
          'Three causes account for almost all of it. The fifth character must be the digit zero and not the capital letter O, and the two are hard to tell apart in many fonts. The code must be exactly eleven characters, so a truncated copy or an extra character fails. And any punctuation you pasted — a hyphen between the bank code and the branch code, for instance — is not stripped and will fail. Leaving the box empty gives "Enter an ifsc first." instead.',
      },
      {
        question: 'What is on screen after a check, and can I keep it?',
        answer:
          'Four lines: MATCHES FORMAT or DOES NOT MATCH FORMAT, then Normalized with the cleaned code, then Rule reading "four letters + 0 + six alphanumerics", then "Not an existence or ownership check." You can copy that block or save it, though the save button writes it as ifsc-format-checker.txt as plain text rather than as any banking format. The MICR checker on this site answers a different question about the same cheque: the nine-digit code printed along the bottom.',
      },
    ],
  },

  // lib/tools/life-admin-workbench.ts (LIFE_ADMIN_OPERATIONS
  // 'micr-format-checker', runLifeAdminOperation, formatCheck, required,
  // syntaxNotice), lib/tools/life-admin-workbench.test.ts and
  // components/schema-workbench-tool.tsx
  'india-and-life-admin-micr-format-checker': {
    directAnswer:
      'Paste the nine-digit code printed along the bottom of an Indian cheque and the page reports MATCHES FORMAT or DOES NOT MATCH FORMAT. The rule it applies is exactly nine digits and nothing else, after spaces and hyphens have been removed, so 400-002-001 and 400 002 001 both pass. The three parts of a MICR line — city, bank and branch — are not separated out or checked against any list.',
    leadParagraph:
      'The test is one regular expression, ^\\d{9}$, applied to your value once every space and hyphen has been stripped out. A MICR line on an Indian cheque is conventionally read as three groups of three — the first three digits the city, the next three the bank, the last three the branch — but this tool does not split them, does not look any of them up, and does not know which combinations have been issued. A test in this repository checks the obvious failure: ABC400002001 does not match, because letters are not digits. The result is four lines — the verdict, the normalised digits, the rule in words, and a reminder that a matching shape proves nothing about existence — and the page carries its own notice saying a match does not prove that the identifier, account, branch, address or beneficiary exists or is active. There is no check digit in a nine-digit Indian MICR, so no arithmetic test is possible; 000000000 matches the format as readily as a real code does.',
    faqs: [
      {
        question: 'What does the MICR format checker actually verify?',
        answer:
          'That the value, once spaces and hyphens are removed, is exactly nine characters and that every one of them is a digit from 0 to 9. Nothing else. It does not confirm that the first three digits are a real city code, that the middle three belong to a bank, or that the last three name a branch that exists. A string of nine zeros passes, and so does any other nine digits you invent.',
      },
      {
        question: 'Which characters are removed before the check?',
        answer:
          'Spaces and hyphens, anywhere in the value, along with any whitespace at either end. That covers the two ways a MICR code is usually written down, so 400 002 001 and 400-002-001 both reduce to 400002001 and pass. Anything else stays: a full stop, a slash, a colon or a stray letter survives the tidy-up, fails the digits-only test, and the result tells you the value does not match. The cleaned value is shown back to you on the Normalized line so you can see what was actually tested.',
      },
      {
        question: 'Does a matching MICR mean the cheque or branch is valid?',
        answer:
          'No. The page states this twice — once in the last line of the result, "Not an existence or ownership check.", and once in the notice above the tool, which says a match does not prove that the identifier, account, branch, address or beneficiary exists or is active. Bank branches are renumbered and closed, and a nine-digit MICR has no check digit, so there is no arithmetic that could catch a transposed pair of digits. Verify the code against the cheque itself and with your bank.',
      },
      {
        question:
          'How does this differ from the IFSC checker on the same site?',
        answer:
          'They check two different codes that appear on the same cheque. MICR is the nine-digit number printed in magnetic ink along the bottom edge, used for physical cheque clearing. IFSC is the eleven-character code — four letters, the digit zero, then six letters or digits — used for electronic transfers. The IFSC checker on this site applies that eleven-character rule. Neither tool converts one code to the other, because the mapping between them is a directory lookup and no directory is consulted here.',
      },
      {
        question: 'What happens with an empty box or a very long paste?',
        answer:
          'An empty or whitespace-only box stops the run with "Enter a micr code first." rather than reporting a failed match, so a blank field and a wrong code are never confused. A value longer than 100,000 characters is refused as too long before any checking happens. Anything in between is checked normally, which means a long paste that happens to contain nine digits and other characters is reported as not matching, not partially matched — there is no search for a nine-digit run inside a larger string.',
      },
    ],
  },

  // lib/tools/creator-workbench.ts (CREATOR_OPERATIONS
  // 'youtube-title-length-checker', runCreatorOperation, required,
  // positiveLimit), components/creator-workbench-tool.tsx,
  // components/schema-workbench-tool.tsx and app/creator/[tool]/page.tsx
  'creator-and-social-youtube-title-length-checker': {
    directAnswer:
      'Type or paste your video title, set the character limit you are working to, and the count appears below it as a count against that limit with either "within selected limit" or the number of characters you are over. The limit box starts at 100 but it is yours to change — this page counts against the number you type and does not know or enforce any platform\x27s current rule. Leading and trailing spaces are trimmed before counting.',
    leadParagraph:
      'Counting characters sounds simple until an emoji is involved, so it is worth being exact about what this tool counts: Unicode code points, obtained by spreading the title into its code points and taking the length. An ordinary Latin or Devanagari letter is one code point and counts as one, a flag emoji is built from two regional-indicator code points and counts as two, and a skin-toned or joined emoji such as a woman technologist is four code points and counts as four even though it draws as a single picture. The character counter elsewhere on this site counts whole grapheme clusters instead and would call that same emoji one character, so the two tools will disagree on a title containing emoji — deliberately, because they answer different questions. Nothing here judges the words: it will not tell you where a title gets cut off in a search result, whether a keyword helps, or whether a character will render on someone else\x27s device.',
    faqs: [
      {
        question:
          'How does the title-length checker count emoji and accented letters?',
        answer:
          'By Unicode code points. A precomposed accented letter such as é is one code point and counts as one; the same letter typed as e followed by a combining accent is two code points and counts as two, even though both look identical on screen. Emoji are where this shows most: a flag counts as two, and a joined emoji with a skin tone counts as four. If you want whole visible characters counted instead, the character counter on this site segments by grapheme cluster and will give a lower number for the same title.',
      },
      {
        question: 'Is 100 the real limit for a YouTube title?',
        answer:
          'One hundred is simply the value the box opens with, and this tool treats it as nothing more than that. The count is always measured against whatever number you type, and the result wording says "within selected limit" or "over selected limit" rather than naming any platform, because the page has no way to check what a site currently allows. Confirm the limit in the platform\x27s own help pages before you rely on it, and change the box to match.',
      },
      {
        question: 'Does it change my title before counting it?',
        answer:
          'Only at the ends. Whitespace before the first character and after the last is trimmed away before the count, so a title pasted with a trailing space is not penalised for it. Everything inside is counted exactly as typed, including double spaces, tabs and any line break you managed to paste in. The title is printed back above the count, so you can see precisely what was measured rather than having to trust it.',
      },
      {
        question: 'What will the title-length checker refuse?',
        answer:
          'An empty title, or one that is only whitespace, stops with "Title is required." A title longer than 500,000 characters is refused as too long, which no real title will reach but a mis-paste can. The limit box must hold a whole number from 1 to 100,000; a decimal, a negative number or text gives a message naming that range. Nothing is truncated to make a run succeed — an over-length title is reported as over, not cut.',
      },
      {
        question: 'What does this tool not tell me?',
        answer:
          'Where the title is shortened with an ellipsis on a phone, in a sidebar or in a search result — that depends on pixel width and the reader\x27s device, not on a character count. It does not check for words a platform disallows, does not score the title for search, and does not check whether an emoji or a rare script will actually display for your viewers. Use the count to stay inside a limit, then look at the real thing on a real phone before publishing.',
      },
    ],
  },

  // components/audio-convert-tool.tsx, lib/tools/audio/decode.ts,
  // lib/tools/audio/probe.ts (probeMp4, MP4_CODECS), lib/tools/audio/wav.ts
  // (encodeWav, wavByteLength, writeInteger), lib/tools/audio/pcm.ts and
  // app/audio/convert/page.tsx
  'audio-m4a-to-wav': {
    directAnswer:
      'Choose an .m4a of up to 100 MB, pick a bit depth, and convert. The MP4 container is read first so the sample rate written in the file is known before decoding starts, and the audio is then decoded at that rate and written straight out as a WAV — a 44,100 Hz voice memo stays at 44,100 Hz instead of being quietly lifted to 48,000. Output is WAV only; there is no encoder on this page that would write the audio back into a compressed format.',
    leadParagraph:
      'An M4A is an MP4 container, usually holding AAC, sometimes Apple Lossless, and the useful facts are buried in its box structure. This page walks that structure itself: the brand in the ftyp box decides whether the file is labelled M4A or MP4, then it descends moov to trak to mdia, skips any track whose handler is not sound — which is how a video file\x27s picture track is passed over — reads the timescale in mdhd as the sample rate and the duration beside it, and reads the codec and channel count out of stsd. That rate is then used to build the audio context the browser decodes into, which is the whole point of reading it: the browser\x27s decoder resamples its output to whatever rate the context was created at and reports nothing about having done so. Where the rate cannot be honoured — it could not be read, or it falls outside the 8,000 to 96,000 Hz range a context can be built at — 48,000 Hz is used and the page tells you what the file declared and what it actually got. AAC is lossy, so what you save is what the decoder produced, not the original recording; Apple Lossless inside an M4A is exact, and the page says so.',
    faqs: [
      {
        question: 'Will my M4A be resampled without telling me?',
        answer:
          'No — avoiding exactly that is why the container is parsed before decoding. The sample rate is read from the mdhd box, the decoding context is built at that rate, and the sample-rate control defaults to "Keep each source rate", so a file arrives and leaves at the same rate unless you choose otherwise. When the rate genuinely cannot be honoured, because it was unreadable or lies outside 8,000 to 96,000 Hz, the file is decoded at 48,000 Hz and the page prints both numbers: what the file declares, and what your browser decoded it at.',
      },
      {
        question: 'What bit depth and sample rate does the WAV come out at?',
        answer:
          'Bit depth is yours to choose from 16-bit, 24-bit and 32-bit float, and it opens on 16-bit, so a high-resolution source will be written at 16-bit unless you change it. The 32-bit option writes IEEE floating-point samples along with the extra format field and the fact chunk that make such a file open widely, not 32-bit integers. Sample rate defaults to keeping the source rate; 48,000, 44,100, 22,050 and 8,000 Hz are the alternatives and are reached through the browser\x27s own resampler. Channels are kept unless you ask for a mono mixdown or for one side only.',
      },
      {
        question: 'Does converting an M4A to WAV recover the original quality?',
        answer:
          'Not if the M4A holds AAC, which most do. AAC discards detail when it encodes, and no conversion can put that back — the WAV faithfully holds what the decoder produced, which is the compressed version at full uncompressed size. The one exception is Apple Lossless, which the page recognises in the stsd box and flags with its own note, because a lossless track really does come out as an exact copy of the samples. Converting to WAV is worth doing to edit or to feed a tool that needs uncompressed input, not to improve what is already there.',
      },
      {
        question: 'Could a 32-bit file come out silent here?',
        answer:
          'Not on this page. An M4A never passes through a raw sample reader at all: the browser hands back floating-point samples, and the only place this project reads stored integers is its own WAV and AIFF reader, which has a branch for every width it admits — 8-bit unsigned, 16-bit, 24-bit and 32-bit signed integers, and 32-bit and 64-bit floats — and refuses any other width by name. Worth knowing about a different tool: the separate audio trimmer on this site reads only 8-, 16- and 24-bit WAV, and a 32-bit integer WAV given to it decodes to silence rather than to an error. Play the result here before you save it either way.',
      },
      {
        question: 'What are the size limits, and what is left out of the WAV?',
        answer:
          'One file is limited to 100 MB, and the message names the size of the file you chose; in a multi-file run an oversized file is skipped with "The 100 MB limit was exceeded." rather than stopping the batch. A projected output over 500 MB is refused before it is built, with the projected size and a suggestion to trim it or lower the bit depth or sample rate. The WAV writer emits a RIFF header, a format chunk, a fact chunk for float output and the audio data — nothing else — so cover art, titles and other tags do not survive the conversion. The download takes your file\x27s name with .wav in place of its old extension.',
      },
    ],
  },

  // components/audio-convert-tool.tsx, lib/tools/audio/decode.ts,
  // lib/tools/audio/probe.ts (probeFlac, readFlacStreamInfo),
  // lib/tools/audio/wav.ts (encodeWav, writeInteger, readSamples),
  // lib/tools/audio/pcm.ts and app/audio/convert/page.tsx
  'audio-flac-to-wav': {
    directAnswer:
      'Choose a .flac of up to 100 MB, set the bit depth, and convert. The STREAMINFO block is read before anything is decoded, so the file\x27s own sample rate, channel count and bit depth are known and the audio is decoded at that rate rather than being resampled to whatever the browser would otherwise have picked. FLAC is lossless, so the WAV holds the samples FLAC was compressing — but the bit-depth control opens on 16-bit, so a 24-bit source needs that changed to stay 24-bit.',
    leadParagraph:
      'FLAC stores its essentials in a STREAMINFO block that is a bit field rather than a byte layout, and this page assembles it by shifting: the sample rate is twenty bits beginning partway through one byte and ending partway through another, the channel count is three bits plus one, the bit depth is five bits plus one, and the total sample count is thirty-six bits — too wide for JavaScript\x27s 32-bit shifts, so it is built with multiplication instead. That gives the page a rate to build its decoding context at, which is the point: the browser\x27s decoder resamples whatever it decodes to the rate of the context it was called on, silently, and reading the header first is what stops that happening. The page then shows the codec as FLAC with its stated bit depth, and carries its own note that lossless in means lossless out. Decoding is still done by your browser, so a FLAC variant your browser will not play is refused with "This browser could not decode that audio file." rather than producing a broken WAV.',
    faqs: [
      {
        question: 'Does the WAV keep the 24-bit depth of my FLAC?',
        answer:
          'Only if you ask it to. The page reads and displays the bit depth from STREAMINFO, but the output control opens on 16-bit, so a 24-bit FLAC converted without touching it is written as a 16-bit WAV. Change the control to 24-bit to keep it. A 24-bit sample scaled into a 32-bit float is exactly representable, so the round trip preserves the integers, with one documented exception: full positive scale has no step that far out in integer PCM and comes back a single step short. That is a property of the format rather than of this page.',
      },
      {
        question: 'Is a WAV made from a FLAC identical to the original audio?',
        answer:
          'In sample values, yes, subject to the bit depth you choose and to the one topmost step noted above — FLAC is lossless compression, so decoding it returns the samples that went in. What does not survive is everything around the audio: the WAV writer emits a RIFF header, a format chunk, a fact chunk for float output and the audio data and nothing else, so FLAC tags, cover art, cue sheets and ReplayGain values are all left behind. The file will also be several times larger, because WAV stores every sample uncompressed.',
      },
      {
        question: 'Will the sample rate change during conversion?',
        answer:
          'Not unless you choose to change it. The rate read from STREAMINFO is used to build the decoding context, and the sample-rate control defaults to keeping the source rate, so a 96 kHz FLAC stays at 96 kHz. If the declared rate falls outside the 8,000 to 96,000 Hz range a browser will build a context at, the file is decoded at 48,000 Hz instead and the page prints both figures so the change is never implicit. Choosing 48,000, 44,100, 22,050 or 8,000 Hz renders the audio through the browser\x27s own resampler at that rate.',
      },
      {
        question: 'Could a converted file come out silent?',
        answer:
          'Not through this page. A FLAC is decoded by the browser into floating-point samples and written out by this project\x27s own WAV writer, so no raw integer sample reader is involved on the way in. Where this project does read stored integers — its own WAV and AIFF reader — every admitted width has a branch, and an unadmitted width is refused by name rather than read as something it is not. The separate audio trimmer on this site is the exception worth knowing about: its reader covers only 8-, 16- and 24-bit WAV, so a 32-bit integer WAV fed to that tool decodes to silence with no error. Play the result in the page before saving, either way.',
      },
      {
        question:
          'What are the limits, and what else can the page do on the way through?',
        answer:
          'One file is limited to 100 MB; in a batch an oversized file is skipped and reported rather than stopping the run. A projected WAV over 500 MB is refused before it is built, naming the projected size — easy to reach from a long high-resolution FLAC at 24-bit or 32-bit. On the way through you can trim by start and end in seconds, apply linear fades, mix down to mono by averaging the channels or keep just the left or right, and normalise the loudest peak to a ceiling you set in decibels below full scale. Peak normalisation is not loudness matching, and the page does not claim it is.',
      },
    ],
  },

  // lib/tools/spreadsheet-workbench.ts (SPREADSHEET_OPERATIONS
  // 'csv-column-renamer', runSpreadsheetOperation, table, header, toCsv,
  // csvCell), lib/tools/structured.ts (parseCsvRows, csvToRecords),
  // lib/tools/spreadsheet-workbench.test.ts and
  // components/schema-workbench-tool.tsx
  'spreadsheet-and-data-csv-column-renamer': {
    directAnswer:
      'Paste your CSV into the first box, then write one rename per line in the second as old=new, and the whole file comes back with those headers changed and every row rebuilt under the new names. Renaming a column that is not in the file is an error rather than a silent no-op, and so is ending up with two columns of the same name. Column order and row order are untouched — only the names in the first row change.',
    leadParagraph:
      'Both boxes take text, so the CSV is pasted rather than picked from disk. It is parsed by the same strict reader the other CSV tools here use: a byte-order mark is stripped, headers are trimmed, every column must have a non-empty header, headers must already be unique, and every row must carry exactly as many fields as there are headers or the run stops naming the row and both counts. Each rename line is split at its first equals sign, the old name is looked up and must exist, and the new name is trimmed and must not be blank. Once the new header list is assembled it is checked for duplicates, so renaming score to name in a file that already has a name column is refused rather than quietly collapsing two columns into one. The output is the file re-emitted: commas between fields, a line feed between rows, and quotes added only around cells that contain a comma, a double quote or a line break — so unnecessary quoting in your original is dropped.',
    faqs: [
      {
        question: 'How do I write the rename lines?',
        answer:
          'One per line, in the form old=new, with the existing header on the left and the name you want on the right. The line is split at its first equals sign, so a new name may itself contain an equals sign but an old name may not. Spaces around either side are trimmed away, so score = points works as well as score=points. Blank lines are ignored. Columns you do not mention keep their names, so you only need a line for each column you are actually changing.',
      },
      {
        question: 'What happens if I name a column that is not in my file?',
        answer:
          'The run stops with "Unknown column:" and the name you typed, rather than quietly doing nothing. That is deliberate: a rename that silently fails is how a pipeline ends up reading the old header name downstream and nobody notices. Headers are trimmed before comparison but are otherwise matched exactly, so case and internal spacing have to be right — Score and score are two different columns as far as this tool is concerned.',
      },
      {
        question: 'Can two columns end up with the same name?',
        answer:
          'No. After the renames are applied the full header list is checked, and any duplicate stops the run with "Renamed columns must be unique." That catches both the obvious case — two rename lines pointing at the same new name — and the easier mistake of renaming one column to a name another column already has. There is one behaviour worth knowing: if two rename lines name the same old column, the last one wins without a warning, because they are collected into a lookup keyed by the old name.',
      },
      {
        question: 'Why was my CSV refused before any renaming happened?',
        answer:
          'The parser is strict, and it names its reason. An empty cell in the first row gives "Every CSV column needs a header in the first row.", which usually means the export began with a title line or a blank column. Two identical headers give "CSV headers must be unique before conversion." A row with the wrong number of fields is reported with its row number and both counts. An opening double quote that is never closed gives "CSV contains an unclosed quoted field." Nothing is padded or discarded to make a ragged file fit.',
      },
      {
        question:
          'What are the limits, and what does the saved file look like?',
        answer:
          'The pasted table is limited to 2,000,000 characters, 100,000 rows and 1,000 columns, each refused by name. The output is re-emitted CSV using commas and line feeds, with a cell quoted only when it contains a comma, a double quote or a line break — so cells are normalised, not passed through byte for byte. One awkward detail: the save button writes the result as csv-column-renamer.txt with a plain-text type, so rename it to .csv before opening it in a spreadsheet. Copying the output straight out of the box avoids that entirely.',
      },
    ],
  },

  // lib/tools/text-workbench.ts (TEXT_OPERATIONS 'character-counter',
  // runTextOperation, graphemes), lib/tools/text-workbench.test.ts and
  // components/text-workbench-tool.tsx
  'text-and-writing-character-counter': {
    directAnswer:
      'Paste or type into the box and two numbers appear: Characters, counting everything including spaces and line breaks, and Without spaces, counting the same text with all whitespace removed first. Both are counts of whole visible characters rather than of the units a computer stores them in, so an emoji made from several joined parts counts as one, not four. The text box takes up to 2,000,000 characters.',
    leadParagraph:
      'The counting method is the thing worth being precise about, because three reasonable answers exist for the same text: UTF-16 code units, which a plain length property gives and which make one emoji four or more; code points, which make the same emoji several; and grapheme clusters, the segments a reader would point at and call one character. This page counts grapheme clusters, using the browser\x27s own Unicode segmenter, and a test in this repository pins it — the letter A, a space, and a joined woman-technologist emoji with a skin tone come to three characters, not six and not nine. A Devanagari syllable written as a consonant plus a vowel sign likewise counts as one. The second figure strips whitespace first — not only spaces but tabs, line breaks and the Unicode space separators — and then counts the remainder the same way. Nothing else is measured here: words, sentences, paragraphs and reading time are separate tools in the same list.',
    faqs: [
      {
        question: 'Does the character counter count an emoji as one character?',
        answer:
          'Yes, when your browser can segment it. Counting is done with the browser\x27s Unicode segmenter at grapheme granularity, which groups a base character with its modifiers, joiners and skin tones into one segment. A joined emoji such as a woman technologist with a skin tone is one character here, though the same emoji is four code points and nine UTF-16 units. On a browser with no segmenter available the count falls back to code points, which would give four for that emoji — a fallback worth knowing about if your number ever looks unexpectedly high.',
      },
      {
        question: 'Are spaces and line breaks included in the count?',
        answer:
          'In the first figure, yes — Characters counts everything in the box exactly as it stands, including spaces, tabs and every line break. The second figure, Without spaces, removes all whitespace first and then counts what is left, and it removes more than the space bar produces: tabs, carriage returns, line feeds, no-break spaces and the other Unicode space separators all go. Neither figure trims the ends of your text or collapses runs of spaces, so a paste with trailing blank lines is counted with them.',
      },
      {
        question:
          'Why does a different tool on this site give a different number for the same title?',
        answer:
          'Because they count different things on purpose. This character counter counts grapheme clusters — whole visible characters. The YouTube title-length checker on this site counts Unicode code points, so a flag emoji counts as two there and one here, and a joined emoji with a skin tone counts as four there and one here. For plain Latin text with no emoji or combining marks the two agree exactly. When a platform enforces a limit, its own counting method is the one that decides, and it may match either of these or neither.',
      },
      {
        question: 'How much text can I paste in?',
        answer:
          'Up to 2,000,000 characters, after which the run stops with "Text is limited to 2,000,000 characters in this candidate." That cap is measured in the units the browser stores text in rather than in the visible characters the tool reports, so a document heavy with emoji reaches it a little sooner than its displayed count suggests. Counting is done in the page as you type, a quarter of a second after you stop, and an empty box simply clears the result rather than showing an error.',
      },
      {
        question: 'What does it not count?',
        answer:
          'Words, sentences, paragraphs and reading time are all separate tools in the same dropdown here, each with its own definition — the word counter, for instance, matches runs of letters and digits with apostrophes allowed inside, and the reading-time estimate assumes 225 words a minute. This tool reports only the two character figures. It does not count bytes either: the number of bytes a piece of text occupies depends on the encoding, and one visible character can be anywhere from one to a dozen bytes in UTF-8.',
      },
    ],
  },

  // lib/tools/web-workbench.ts (WEB_OPERATIONS 'sitemap-generator',
  // runWebOperation, lines, absoluteUrl, html), lib/tools/web-workbench.test.ts,
  // components/web-workbench-tool.tsx and components/schema-workbench-tool.tsx
  'web-and-seo-sitemap-generator': {
    directAnswer:
      'Paste one absolute URL per line and a complete sitemap XML document comes back, with each address wrapped in a url and loc pair under the sitemaps.org 0.9 namespace. Every line must be a full http or https address — a bare path such as /about is refused by name rather than guessed at against some assumed domain. The file carries locations only: there are no lastmod, changefreq or priority elements anywhere in the output.',
    leadParagraph:
      'Each line is trimmed, blank lines are dropped, and what remains is parsed with the browser\x27s own URL parser, which both validates and normalises: a bare origin gains its trailing slash, the host is lower-cased, and characters that need percent-encoding get it. Anything the parser rejects gives "URL must be an absolute HTTP(S) URL.", and anything it accepts under another scheme — ftp, mailto, a file path — gives "URL must use HTTP or HTTPS." The addresses are then XML-escaped before being written, which is what makes a query string survive: a URL containing an ampersand comes out with it written as an entity, and a test in this repository checks that the result reads back correctly through the sitemap viewer on this site. The list is capped at 5,000 lines, well below the 50,000 the sitemap protocol allows in one file, and duplicate lines are not removed — paste the same address twice and it appears twice.',
    faqs: [
      {
        question: 'Does the sitemap generator crawl my site to find pages?',
        answer:
          'No. It fetches nothing and visits nothing; the URLs it writes are exactly the ones you paste. That means you need a list from somewhere else first — your content management system\x27s export, a build manifest, a crawl you ran yourself, or the addresses your framework already knows about. The upside is that you control precisely what is listed, including keeping pages out that a crawler would have found. If you already have a sitemap and want to read it, the sitemap viewer on this site extracts and decodes its loc values without making any requests either.',
      },
      {
        question: 'Can I add lastmod, changefreq or priority?',
        answer:
          'Not here. The generator writes one element per entry, the loc, inside a url wrapper, and offers no field for a modification date, a change frequency or a priority value. If you need those, add them to the output by hand or generate the file from your build system. The absence is deliberate rather than an oversight: a lastmod invented at the moment you paste a list is worse than none, since it tells a crawler a page changed when nothing about it did.',
      },
      {
        question: 'Why is one of my lines being refused?',
        answer:
          'Two messages cover it. "URL must be an absolute HTTP(S) URL." means the browser\x27s URL parser could not read that line at all, which is what happens to a bare path such as /pricing, to a domain with no scheme such as example.com/pricing, and to a line with a space in the middle of it. "URL must use HTTP or HTTPS." means the line parsed but under another scheme, such as ftp or mailto. One bad line stops the whole run, so the sitemap you get is always complete or not produced at all.',
      },
      {
        question: 'How many URLs can I put in one sitemap here?',
        answer:
          'Up to 5,000 lines, after which the run stops with "This tool is limited to 5,000 lines." The sitemap protocol itself allows 50,000 locations and 50 MB in a single file, so this cap is the tool\x27s, not the standard\x27s. For a larger site, split the list and generate several files, then write a sitemap index referring to them — this tool does not write an index, and it does not split a long list for you. Duplicates are not removed either, so de-duplicate your list before pasting if that matters.',
      },
      {
        question: 'What does the output look like, and how do I save it?',
        answer:
          'An XML declaration, a urlset element carrying the sitemaps.org 0.9 namespace, then one indented url element per address, then the closing tag. Ampersands, angle brackets, quotes and apostrophes inside your addresses are written as XML entities so the document stays well-formed. The save button writes it as sitemap-generator.txt with a plain-text type, so rename it to sitemap.xml before uploading it — or copy the text straight out of the box and paste it into the file your server actually serves.',
      },
    ],
  },

  // lib/tools/qr-barcode-workbench.ts (QR_BARCODE_OPERATIONS 'email-qr-code',
  // buildQrPayload, renderQr, qrStyle, required),
  // lib/tools/qr-barcode-workbench.test.ts and
  // components/schema-workbench-tool.tsx
  'qr-and-barcode-email-qr-code': {
    directAnswer:
      'Enter a recipient address, optionally a subject and a message, and the page draws an SVG QR code holding a mailto link that opens a pre-filled draft when it is scanned. The address is checked for shape only — something, an at sign, something, a dot, something — so a well-formed address that belongs to nobody will encode quite happily. The symbol is drawn at your chosen size in black on white and saved as email-qr-code.svg.',
    leadParagraph:
      'The payload is a mailto URI: the recipient after the colon, then a query string carrying whatever you put in the subject and message boxes, with either one left out entirely when its box is empty. Error correction is selectable from L, M, Q and H with M as the default, the width runs from 160 to 1,200 pixels with 360 as the default, and the standard four-module quiet zone is drawn around the symbol. Content is limited to 8,000 characters overall and the recipient to 254; when a long subject and message push the symbol past what the chosen error-correction level can hold, the run stops saying the content does not fit the selected settings rather than producing a truncated code. One encoding detail is worth knowing before you print anything: the query is assembled with the browser\x27s form-encoding, which writes a space as a plus sign, and the mailto specification does not define a plus as a space — so some mail applications will show your subject with literal plus signs in place of spaces. Test a scan on a real phone with the mail app your readers use before committing to a print run.',
    faqs: [
      {
        question:
          'Will the subject and message show up correctly when someone scans it?',
        answer:
          'The recipient always will. Subject and message usually do, but there is a real caveat: the query string is built with the browser\x27s form-encoding, which turns every space into a plus sign, and RFC 6068 — the specification for mailto links — treats a plus as a literal plus rather than as a space. Mail applications differ in how forgiving they are, so a subject such as Q3 report may arrive as Q3+report in some of them. Scan your own code with the app your audience actually uses before printing it, and consider a short subject with no spaces if it matters.',
      },
      {
        question: 'Does it check that the email address is real?',
        answer:
          'No. The address is tested for shape only: one or more characters that are not spaces or at signs, an at sign, more such characters, a dot, and more again. That accepts a@b.c and rejects an address with a space in it or no dot in the domain, and nothing else is verified — the mailbox may not exist, the domain may not resolve, and nothing is sent anywhere to find out. The page\x27s own notice puts it plainly: this creates a standards-shaped payload, not a live destination or ownership check. Send yourself a test message before the code goes out.',
      },
      {
        question: 'What size and error-correction level should I choose?',
        answer:
          'Error correction runs L, M, Q, H from most capacity to strongest recovery, and the box opens on M. Higher levels survive scuffing, glare and a partly covered symbol at the cost of holding less data, so a long subject and message may only fit at L or M. The width runs from 160 to 1,200 pixels and opens at 360; because the output is an SVG the drawing scales cleanly to any print size regardless of that number, which mostly governs how the preview appears. A four-module quiet zone is always drawn, and it needs to stay clear of other artwork.',
      },
      {
        question: 'What will this tool refuse?',
        answer:
          'An empty recipient box stops the run before anything is drawn. A recipient over 254 characters is refused as too long, as is a total payload over 8,000 characters. A width outside 160 to 1,200 is refused naming that range. And when the assembled mailto link is simply too long for a QR symbol at the error-correction level you picked, the run stops with a message saying the content does not fit the selected settings, followed by the encoder\x27s own reason — shorten the message or drop to a lower correction level.',
      },
      {
        question: 'Can I change the colours, and what is in the saved file?',
        answer:
          'Not on this tool — the email QR code is drawn in black on white, because this page offers only the recipient, subject, message, error-correction and width controls. The save button writes a real SVG named email-qr-code.svg, so the symbol is vector artwork you can scale to a poster without it going soft, and it can be recoloured in any vector editor afterwards. If you do recolour it, keep the dark modules genuinely dark against a light background: low contrast is the most common reason a printed code will not scan.',
      },
    ],
  },

  // lib/tools/finance-business-workbench.ts (FINANCE_OPERATIONS
  // 'lumpsum-investment-calculator', runFinanceOperation, future, percent,
  // finite, format, scenarioNotice),
  // lib/tools/finance-business-workbench.test.ts and
  // components/schema-workbench-tool.tsx
  'finance-and-business-lumpsum-investment-calculator': {
    directAnswer:
      'Enter a starting amount, an assumed annual rate as a percentage, and a number of years, and the page returns a projected value and the growth above what you put in. The compounding is monthly and fixed: the annual rate you type is divided by twelve and applied twelve times a year, so a nominal 10 per cent grows slightly faster than 10 per cent a year. This is scenario arithmetic on your own assumptions, not financial advice and not a forecast.',
    leadParagraph:
      'The formula is the plain compound-interest one: the starting amount multiplied by one plus the monthly rate, raised to the number of months. The monthly rate is the annual percentage divided by twelve rather than the twelfth root of annual growth, which is the usual banking convention for a nominal rate but does mean the effective annual figure is a little above the number you typed. Years times twelve must come out as a whole number of months, so 1.5 years works and 0.1 years is refused; the message names the whole-months requirement. Results are printed to twelve significant figures with no currency symbol and no thousands separators, so the units are whatever you put in. Nothing about inflation, tax, exit loads, fund expenses or fees enters the calculation, and the page carries its own notice saying as much: rates, fees, compounding, timing, taxes, insurance, rounding and provider rules can all change the real outcome.',
    faqs: [
      {
        question: 'How is the compounding done in the lump-sum calculator?',
        answer:
          'Monthly, and that is not adjustable on this tool. The annual percentage you enter is divided by one hundred and then by twelve to give a monthly rate, and the starting amount is multiplied by one plus that rate once for every month in the term. Because the rate is divided rather than compounded down, a nominal 10 per cent applied monthly produces a little over 10 per cent of actual growth in a year. If you need a different frequency, the fixed-deposit and future-value calculators on this site take a compounds-per-year figure from 1 to 365.',
      },
      {
        question: 'Can I enter a fraction of a year?',
        answer:
          'Yes, as long as it resolves to a whole number of months. The term is converted by multiplying by twelve, and that product has to be a whole number no greater than 1,000,000, so 0.5, 1.5 and 7.25 years are all fine while 0.1 years is refused with a message naming the whole-number requirement. Zero years is accepted and simply returns your starting amount with no growth. A negative starting amount is refused, with a message naming the permitted range in JavaScript\x27s own notation, which reads awkwardly but means nothing below zero.',
      },
      {
        question: 'Does the projection account for inflation, tax or fees?',
        answer:
          'No, none of them. The result is what a constant rate applied monthly to a fixed amount produces, and nothing else: no expense ratio, no exit load, no capital-gains tax, no indexation, no inflation adjustment and no allowance for a rate that changes. Real returns are rarely constant, and a figure that ignores costs will always look better than the outcome. Treat the number as one scenario among several — run it again at a lower rate to see how sensitive the answer is — and take advice from someone regulated before acting on it.',
      },
      {
        question: 'What currency does it use, and how is the result rounded?',
        answer:
          'No currency at all. The output carries no symbol and no thousands separators, so whatever unit you type in is the unit that comes out — rupees, pounds or anything else. Values are printed to twelve significant figures, and a result whose absolute value falls below a ten-billionth is printed as 0 rather than in exponent notation. There is no rounding to two decimal places, so a projected value will usually carry more digits than a bank statement would; round it yourself when you quote it.',
      },
      {
        question: 'What does the lump-sum calculator not do?',
        answer:
          'It does not model contributions added along the way — that is the recurring-deposit and monthly-contribution calculators on this site, which project a fixed sum paid in at the end of every month. It does not solve backwards for the rate or the term you would need to reach a target. It does not handle a rate that changes partway, a withdrawal, or a partial redemption. And it makes no claim about any real product: the page\x27s own notice says this is scenario arithmetic, not financial, investment, tax, accounting or lending advice.',
      },
    ],
  },

  // lib/tools/finance-business-workbench.ts (FINANCE_OPERATIONS
  // 'recurring-deposit-calculator', runFinanceOperation, monthlyContribution,
  // percent, positive, format, scenarioNotice),
  // lib/tools/finance-business-workbench.test.ts and
  // components/schema-workbench-tool.tsx
  'finance-and-business-recurring-deposit-calculator': {
    directAnswer:
      'Enter a monthly deposit, an assumed annual rate and a term in years, and the page returns three lines: the projected value at the end, the total you will have paid in, and the difference between them. Deposits are treated as arriving at the end of each month and each one earns the monthly rate for every remaining month. The monthly rate is the annual rate divided by twelve, compounded monthly — which is not how an Indian bank computes a recurring deposit, so read this as a scenario rather than as a quote.',
    leadParagraph:
      'The arithmetic is the standard future value of an ordinary annuity: the deposit multiplied by the quantity one plus the monthly rate raised to the number of months, less one, all divided by the monthly rate. When the rate is zero the formula would divide by zero, so that case is handled separately and returns the deposit times the number of months. The monthly rate is simply the annual percentage divided by twelve, which makes the effective yearly growth slightly higher than the figure you typed; Indian banks conventionally compound recurring deposits quarterly, so a real bank\x27s maturity figure will differ from this one even at the same headline rate. The term must resolve to between 1 and 12,000 whole months, and output is three plain numbers with no currency symbol and no thousands separators, printed to twelve significant figures. Tax deducted at source, penalties for a missed or late instalment, and premature-closure rules are not modelled at all, and the page carries a notice saying this is scenario arithmetic rather than financial, investment, tax, accounting or lending advice.',
    faqs: [
      {
        question:
          'Will this match what my bank quotes for a recurring deposit?',
        answer:
          'Probably not exactly, and the reason is the compounding convention. This calculator applies one twelfth of the annual rate every month, while Indian banks conventionally compound a recurring deposit quarterly, so the two grow at slightly different speeds from the same headline rate. Banks also round each instalment\x27s interest in their own way and may treat the deposit date differently. Use this figure to compare scenarios and to sanity-check an offer; use the bank\x27s own maturity quote for the number that will actually be paid.',
      },
      {
        question:
          'Are the deposits treated as paid at the start or the end of the month?',
        answer:
          'At the end. The formula used is the ordinary-annuity one, so the first deposit earns interest for one month less than a start-of-month schedule would give it, and the last deposit earns nothing at all before maturity. Over a five-year term that difference is small but real. If your bank debits your account on the first of the month and credits interest accordingly, expect its figure to sit slightly above this one for the same rate and deposit.',
      },
      {
        question:
          'What term lengths does the recurring-deposit calculator accept?',
        answer:
          'Anything that resolves to a whole number of months between 1 and 12,000, so 0.5 years, 5 years and 10.25 years all work while 0.1 years does not — the message reads "Term must resolve to 1–12,000 whole months." Zero or a negative term is refused too, though the message names the smallest and largest numbers JavaScript can hold rather than saying plainly that the term must be above zero. A rate of exactly zero is allowed and simply returns the total of the deposits.',
      },
      {
        question: 'What do the three output lines mean?',
        answer:
          'Projected value is the balance at the end of the term. Contributed is the arithmetic total you paid in, the monthly deposit times the number of months, with no interest in it at all. Scenario growth is the first minus the second, which is the interest the assumption produced. All three are printed to twelve significant figures with no currency symbol and no thousands separators, so the unit is whatever you entered, and none of the three is rounded to two decimal places for you.',
      },
      {
        question: 'Does it account for tax or a missed instalment?',
        answer:
          'No. Tax deducted at source on the interest, the income-tax treatment of that interest in your hands, penalties for a late or missed instalment, and any charge or interest adjustment for closing the deposit early are all outside this calculation. So is a rate that changes partway through the term. The page\x27s own notice states the limit directly: this is scenario arithmetic using only your inputs, not financial, investment, tax, accounting or lending advice, and contracts, penalties and provider rules can change the real result.',
      },
    ],
  },

  // lib/tools/date-workbench.ts (DATE_OPERATIONS 'birthday-countdown',
  // runDateOperation, parseDateOnly, epochDay, fromEpochDay),
  // lib/tools/date-workbench.test.ts, components/date-workbench-tool.tsx and
  // components/schema-workbench-tool.tsx
  'date-time-and-productivity-birthday-countdown': {
    directAnswer:
      'Put the birthday in the first box and the date you are counting from in the second, both as YYYY-MM-DD, and the page returns the number of whole calendar days to the next occurrence together with the date it lands on. The second box does not fill itself with today\x27s date — it opens on a fixed example, so change it to today before reading the answer. A birthday on 29 February falls back to 28 February in years that do not have one.',
    leadParagraph:
      'Both dates are parsed strictly: four digits, a hyphen, two digits, a hyphen, two digits, with the year between 0100 and 9999, and the day has to be a real calendar day or the run stops with "Use a valid calendar date." Everything after that is arithmetic on whole days counted in UTC, which is what keeps the answer stable regardless of where you are or whether a clock changes. The occurrence is built from the birthday\x27s month and day in the counting year, with the day clamped to the last day of that month — the 29 February case — and if that date has already passed, the following year is used instead. Counting from a birthday to itself gives zero days rather than a year. One wording quirk: the output always says "days" with an s, so a birthday tomorrow reads as "1 days". There is no clock here at all: no hours, no minutes, no live ticking countdown, and no time zone selection.',
    faqs: [
      {
        question: 'Does the birthday countdown know what today is?',
        answer:
          'No, and this is the thing most likely to catch you out. The "Count from" box opens on a fixed example date baked into the tool rather than on today, so a result read without changing it is counting from the wrong day. Type today\x27s date in the YYYY-MM-DD form before you trust the number. The upside of an explicit date is that you can count from any day you like — from the start of a month, from a trip, or from a date in the past to see how far a birthday was.',
      },
      {
        question: 'What happens to a birthday on 29 February?',
        answer:
          'It is observed on 28 February in years that have no 29th. The occurrence is built by taking the birthday\x27s month and day and clamping the day to the last day of that month in the counting year, so 29 February becomes 28 February in a common year and stays 29 February in a leap year. The same clamping quietly handles any other impossible combination, though 29 February is the only one that arises from a real date of birth.',
      },
      {
        question: 'Does it count hours, or tick down live?',
        answer:
          'Neither. This is whole-day calendar arithmetic and nothing else: two dates go in, a number of days and a date come out, and the figure only changes when you change a box. There is no hours-minutes-seconds display, no live counter, and no time-zone setting — the arithmetic is done in UTC precisely so that the answer does not shift depending on where the page is opened or when the clocks change. If you need a timestamped countdown, this is not the tool for it.',
      },
      {
        question: 'What does it say when the birthday is today?',
        answer:
          'Zero days, followed by today\x27s date. The next occurrence is only pushed into the following year when it falls strictly before the counting date, so the day itself counts as the occurrence rather than as a year away. A birthday that has already passed this year gives the days to next year\x27s. One small wording flaw to expect: the unit is always printed as "days", so the day before a birthday reads as "1 days" rather than "1 day".',
      },
      {
        question: 'Why was my date refused?',
        answer:
          'The format has to be exactly YYYY-MM-DD with two-digit month and day — 2026-9-6 fails where 2026-09-06 passes, and so does any slash-separated or day-first form. The message for that is "Use a valid date in YYYY-MM-DD form." A well-formed date that does not exist, such as 2026-02-30, gives "Use a valid calendar date." instead, because the parsed parts are rebuilt into a real date and compared back. Years outside 0100 to 9999 are refused by name.',
      },
    ],
  },

  // lib/tools/science-education-workbench.ts (SCIENCE_OPERATIONS
  // 'half-life-calculator', runScienceOperation, finite, positive, format,
  // physicsNotice), lib/tools/science-education-workbench.test.ts and
  // components/schema-workbench-tool.tsx
  'science-and-education-half-life-calculator': {
    directAnswer:
      'Enter an initial quantity, the time that has elapsed and the half-life, and the page returns how much is left along with how many half-lives that elapsed time represents. The calculation is the initial quantity multiplied by a half raised to the power of elapsed time divided by half-life — so ten years of a five-year half-life leaves a quarter. Elapsed time and half-life must be in the same unit, because the tool has no unit field and prints none.',
    leadParagraph:
      'This is the exponential-decay law expressed through the half-life rather than through a decay constant, and it goes one way only: quantity remaining after a known elapsed time. It will not solve backwards for the half-life from two measurements, and it will not tell you how long it takes to reach a given level. A test in this repository pins the base case — 100 units, 10 elapsed, a half-life of 5, leaving 25. The elapsed-half-lives figure is simply the ratio of the two times, shown because it is the number that makes the result easy to check by eye — three half-lives should leave an eighth — and both outputs are printed to twelve significant figures. The decay-constant form of the same law, N equals N-nought times e to the minus lambda t, is a separate calculator in this same list for when you have lambda rather than a half-life, and the page\x27s notice reminds you to check significant figures, uncertainty and domain assumptions before any laboratory or engineering use.',
    faqs: [
      {
        question: 'What units should I use in the half-life calculator?',
        answer:
          'Whatever you like, as long as the elapsed time and the half-life are in the same one. There is no unit selector and the answer carries no unit, so seconds with seconds, years with years, or minutes with minutes all work, and mixing them silently gives a wrong answer that looks perfectly reasonable. Convert before you type. The initial quantity is likewise unitless as far as the tool is concerned — grams, becquerels, counts or a percentage all pass straight through, and the remaining figure comes back in whatever you supplied.',
      },
      {
        question:
          'Can it work out the half-life itself, or how long until a level is reached?',
        answer:
          'No, neither. The calculation runs in one direction only: from an initial quantity, an elapsed time and a known half-life to the quantity remaining. Solving for the half-life from two measurements, or for the time needed to fall to a given fraction, would mean taking a logarithm and this tool does not offer it. If you already have a decay constant rather than a half-life, the radioactive-decay calculator in the same list applies the exponential form directly.',
      },
      {
        question: 'How is the answer calculated and rounded?',
        answer:
          'The remaining quantity is the initial quantity multiplied by one half raised to the power of the elapsed time divided by the half-life, computed in ordinary binary floating point. The second line divides the same two times to give the number of elapsed half-lives, which may be a fraction. Both numbers are printed to twelve significant figures, so very small remainders appear in exponent notation rather than as a long string of zeros. A result that is not finite stops the run rather than being displayed.',
      },
      {
        question: 'What values will it refuse?',
        answer:
          'A negative initial quantity or a negative elapsed time is refused, and so is a half-life of zero or below, since dividing by it has no answer. The messages are blunt in a way worth warning about: rather than saying the half-life must be greater than zero, the page names the smallest and largest numbers JavaScript can hold, which reads as an enormous range in exponent notation. Text that is not a number is refused the same way. An initial quantity of zero and an elapsed time of zero are both accepted and behave as you would expect.',
      },
      {
        question: 'Is this accurate enough for laboratory or medical use?',
        answer:
          'It is the idealised textbook law and should be treated as such. It assumes a single decay path with a constant half-life, a quantity large enough that the statistical nature of decay does not matter, and no branching, ingrowth of daughter products, chemical loss or biological clearance. The page\x27s own notice says to check significant figures, uncertainty, conditions and domain assumptions before any laboratory or engineering use. For dosimetry, waste-handling or clinical decisions, use the procedure and the reference data your institution requires.',
      },
    ],
  },

  // lib/tools/spreadsheet-workbench.ts (csv-deduplicator branch of
  // runSpreadsheetOperation, the csv() field, table / selectedHeaders / header
  // / toCsv / csvCell helpers), lib/tools/structured.ts (csvToRecords,
  // parseCsvRows), lib/tools/spreadsheet-workbench.test.ts and
  // components/schema-workbench-tool.tsx (the shared download helper).
  'spreadsheet-and-data-csv-deduplicator': {
    directAnswer:
      'Paste the CSV, name the key columns to compare, and the deduplicated table appears below as you type. The first row carrying each key is kept and every later row with the same key is dropped. Clear the key box to compare whole rows instead — and clear it before you run your own data, because it arrives holding the word score from the sample.',
    leadParagraph:
      'A duplicate here means whatever the key columns say it means: the tool builds a key from just those columns and compares the keys as exact text. Nothing is normalised first, so Ada and ada are two different rows, and Blue and a space followed by Blue are two different rows as well. Column headers are trimmed when the file is parsed, but cell values never are. With the key box empty every column joins the key, which is the closest this gets to whole-row deduplication. The surviving rows keep their original order, and the result is re-emitted as comma-separated text with quotes added only around values that contain a comma, a double quote or a line break.',
    faqs: [
      {
        question: 'What counts as a duplicate — the whole row or one column?',
        answer:
          'Either, and you decide. Name one or more columns, separated by commas, and only those columns form the key; two rows that agree on the key are duplicates even if every other column differs. Leave the box empty and every column joins the key, so only a fully identical row is dropped. With the sample data loaded and the key set to score, Mina is removed because her score of 91 repeats Ada\x27s, although her name, team and date are all different.',
      },
      {
        question: 'Is the comparison case-sensitive, and does spacing matter?',
        answer:
          'Yes to both. Comparison is exact text with nothing trimmed or folded, so Ada and ada both survive, and Blue and a space followed by Blue both survive. If your export has stray leading spaces or mixed capitalisation, run the CSV cleaner in the same workbench first — it trims headers and cells — and deduplicate the cleaned result.',
      },
      {
        question: 'Why does it say "Unknown column: score."?',
        answer:
          'Because the key-columns box ships holding the word score, which is a column in the sample data and almost certainly not a column in yours. Any name you list must match a header in the first row exactly, after that header has been trimmed, or the run stops and names it. Replace score with your own column names, or clear the box to compare whole rows. Listing the same column twice stops with "Column selection contains a duplicate."',
      },
      {
        question: 'Which copy of a duplicate is kept?',
        answer:
          'The first one in the file. Rows are walked from top to bottom, the first appearance of each key is kept, and every later row with that key is discarded. There is no option to keep the last one instead, and no report of what was removed — the output is the surviving table only. To see the duplicates before deleting anything, the same workbench has a spreadsheet duplicate finder that reports repeated values and the row numbers they appear on.',
      },
      {
        question: 'What are the limits, and what does the download save as?',
        answer:
          'The pasted CSV is capped at 2,000,000 characters, and the parsed table at 100,000 rows and 1,000 columns; going past either stops the run with a named message. The parser is strict before any of that: every column needs a non-empty header, headers must be unique, and each row must carry exactly as many fields as there are headers. One thing to expect: the download button saves the result as csv-deduplicator.txt, because this workbench declares no file extension of its own, so rename it to .csv yourself or copy the text straight out.',
      },
    ],
  },

  // lib/tools/text-workbench.ts (the sentence-counter branch of
  // runTextOperation and its regular expression), lib/tools/text-workbench.test.ts
  // and components/text-workbench-tool.tsx (the 250 ms auto-run and the
  // 2,000,000-character guard).
  'text-and-writing-sentence-counter': {
    directAnswer:
      'Paste or type the text and the count appears roughly a quarter of a second after you stop typing; there is no button to press. A sentence is any run of characters that ends at a full stop, an exclamation mark or a question mark, so "Dr. Smith arrived." counts as two.',
    leadParagraph:
      'The rule is deliberately simple and the tool calls the result an estimate in its own description. It scans for stretches of text containing none of those three marks, each closed either by a run of them or by the end of the text, and counts the stretches. A run of marks closes one sentence, not several, so "Wow!!! Really?" is two and "Wait... what?" is two. Nothing else is consulted: no dictionary of abbreviations, no rule about capital letters, no allowance for decimal points. That makes it fast and predictable, and it also means prose full of abbreviations or figures will read high.',
    faqs: [
      {
        question: 'Does an abbreviation or a decimal point split a sentence?',
        answer:
          'Yes, both do, and this is the single most useful thing to know about the tool. "Dr. Smith arrived." counts as two sentences, "It cost 3.5 million." counts as two, and "e.g. this" counts as three. There is no abbreviation list and no check of what follows the full stop. If your text is heavy with titles, initials, decimals or version numbers, expect the count to run above the number of sentences a reader would see.',
      },
      {
        question: 'What about a final sentence with no full stop?',
        answer:
          'It still counts. A closing stretch of text with no terminal mark is closed by the end of the text instead, so "Hello there" on its own counts as one sentence. A heading, a caption or a bullet with no punctuation is therefore counted as a sentence, which is worth remembering before you count a document made mostly of short lines.',
      },
      {
        question: 'Do three dots or an interrobang count more than once?',
        answer:
          'No. Consecutive full stops, exclamation marks and question marks are swallowed as one ending, whatever the mix. "Wow!!! Really?" is two sentences, and an ellipsis in the middle of a line closes the sentence before it rather than adding three.',
      },
      {
        question: 'Does a line break end a sentence?',
        answer:
          'No. Only the three terminal marks end a sentence, so a line of verse or a bulleted list with no punctuation is counted as one sentence no matter how many lines it runs to. Blank lines are what the paragraph counter looks for; this tool ignores them entirely.',
      },
      {
        question: 'What are the limits, and can I count a file?',
        answer:
          'Text is capped at 2,000,000 characters, with the message "Text is limited to 2,000,000 characters in this candidate." An empty box stops with "Enter some text first."; a box holding only spaces is accepted and reports zero. There is no file picker on this page — it takes pasted text only — and the result is a single number, with a line underneath reading, for example, 2 sentences estimated.',
      },
    ],
  },

  // lib/tools/web-workbench.ts (the sitemap-viewer branch of runWebOperation,
  // the required and decodeXml helpers) and lib/tools/web-workbench.test.ts,
  // which round-trips a generated sitemap back through the viewer.
  'web-and-seo-sitemap-viewer': {
    directAnswer:
      'Paste the sitemap XML itself into the box and it lists every URL it finds, one per line, with the count on the first line. It never makes a request of its own, so download or view-source the sitemap first and bring the text here.',
    leadParagraph:
      'This is a text tool, not a crawler. It searches the pasted text for loc elements with a pattern match rather than parsing the XML properly, takes what is between the opening and closing tags, trims it and turns the XML escapes for less-than, greater-than, double quote, apostrophe and ampersand back into ordinary characters. Everything else in the file is ignored — lastmod, changefreq, priority, namespaces and comments all pass by unread. Because a sitemap index uses the same loc tag for its child sitemaps, pasting an index lists the child sitemap addresses instead of page addresses. Nothing is checked, fetched or deduplicated: the list is what the file claims, in the order the file claims it.',
    faqs: [
      {
        question: 'Can I give it a sitemap address instead of the XML?',
        answer:
          'No. There is no address box and no request is made — the tool reads only the text in the box. Open the sitemap in a browser tab, copy the source, and paste it here. A compressed sitemap ending in .xml.gz has to be expanded first, because the compressed bytes contain no readable loc tags and the run would stop with "No <loc> values were found."',
      },
      {
        question: 'What does it read, and what does it ignore?',
        answer:
          'It reads loc elements and nothing else. A lastmod date, a changefreq hint and a priority value are all discarded, so the output cannot tell you when a page was last changed. Namespaced variants are not matched either: an image:loc or video:loc inside a page entry is skipped, and only the page loc is listed.',
      },
      {
        question: 'Does it work on a sitemap index file?',
        answer:
          'Yes, because an index lists its child sitemaps in the same loc tag. Pasting an index returns the addresses of the child sitemap files, which you then open and paste in turn. The tool does not follow them for you and has no way of knowing whether it is looking at an index or a page sitemap.',
      },
      {
        question: 'Does it validate the URLs or check they are reachable?',
        answer:
          'No. It does not test status codes, redirects, robots rules, canonical tags or indexability, and it does not check that an entry is even a well-formed address. It also does not remove repeats, so a URL listed twice in the file is listed twice here and counted twice — the number on the first line counts matches, not unique addresses. That line always reads URLs, including when there is only one.',
      },
      {
        question: 'What are the limits, and what is refused?',
        answer:
          'The pasted XML is capped at 200,000 characters, refused with "Sitemap XML is limited to 200,000 characters."; an empty box gives "Sitemap XML is required."; and text containing no loc tag at all gives "No <loc> values were found." There is no cap on how many URLs it will list, so the character limit is the only thing that bites on a large file — and because the count includes every surrounding tag, a sitemap is refused long before its URLs alone would fill 200,000 characters. Paste a big one in parts.',
      },
    ],
  },

  // lib/tools/qr-barcode-workbench.ts (sms-qr-code branch of buildQrPayload,
  // the local required / raw helpers, qrStyle and renderQr, which calls the
  // qrcode package) and components/schema-workbench-tool.tsx for the download.
  'qr-and-barcode-sms-qr-code': {
    directAnswer:
      'Enter the phone number and the message you want waiting in the compose box, choose an error-correction level and a width, then download the symbol as an SVG. The payload is exactly sms: followed by the number, then a question mark, body equals, and your message percent-encoded.',
    leadParagraph:
      'Spaces, round brackets and hyphens are stripped from the number before encoding, while a leading plus is kept, so +91 (987) 654-3210 is encoded as the digits with the plus in front. The message is carried through exactly as typed and then percent-encoded, with no trimming and no length check of its own. The body part is always appended, even when you leave the message empty, which produces a payload ending in body equals nothing. The symbol is drawn in the page by a QR encoder bundled with the site, at the level and width you pick, and it is vector output — there is no PNG option here.',
    faqs: [
      {
        question: 'What exactly ends up inside the code?',
        answer:
          'A single SMS address. With the default values it is sms:+919876543210?body=Hello — the number with separators removed, then the message percent-encoded. Nothing else is added: no sender name, no subject, no timestamp, and no redirect service between the scan and the messaging app.',
      },
      {
        question: 'Which phone numbers are accepted?',
        answer:
          'An optional leading plus followed by 7 to 25 characters drawn from digits, spaces, round brackets and hyphens. A number written with full stops, such as 555.123.4567, is refused with "Enter a valid-looking phone number.", and so is anything shorter than seven characters or carrying an extension after a comma. An empty box gives "Enter a phone number first." and more than 50 characters is refused outright. No check is made that the number exists or that it can receive messages.',
      },
      {
        question: 'Does scanning the code send the message?',
        answer:
          'No, and it should not. The payload only states a number and some text; what a scanning device does with it is up to that device, and the usual behaviour is to open the messaging app with the fields filled in so the person can read and send it themselves. The tool itself sends nothing and contacts nothing — it draws a picture of the text you supplied.',
      },
      {
        question: 'Why was my message refused as too long?',
        answer:
          'The encoded payload is capped at 1 to 8,000 characters, and percent-encoding is what usually pushes a short message over. A character outside the Latin range becomes nine characters once encoded, so roughly 900 characters of Devanagari or Chinese text already exceeds the cap and stops with "Encoded content must contain 1–8,000 characters." Even below the cap, a long message needs a denser symbol, and a higher recovery level leaves less room, so shorten the draft rather than pushing the encoder.',
      },
      {
        question: 'What settings does it have, and what do I get?',
        answer:
          'Error correction L, M, Q or H with M as the default, and a width from 160 to 1,200 pixels with 360 as the default — a width outside that range is refused with "SVG width must be between 160 and 1200." and an unrecognised level with "Choose a valid correction level." The result is an SVG with a four-module quiet zone, saved as sms-qr-code.svg, and because it is vector it prints at any size. The page carries its own notice that this builds a standards-shaped payload rather than a checked destination, so test the printed symbol with the devices that will actually scan it.',
      },
    ],
  },

  // lib/tools/math-workbench.ts (median-calculator branch of runMathOperation,
  // the parseList and format helpers) and lib/tools/math-workbench.test.ts,
  // plus components/math-workbench-tool.tsx for the 250 ms auto-run.
  'math-and-units-median-calculator': {
    directAnswer:
      'Type the numbers into the one box, separated by commas, spaces or semicolons, and the median appears below as you type. The list is sorted by value and the middle number is returned; with an even count the two middle numbers are averaged, so 4, 1, 3, 2 gives 2.5.',
    leadParagraph:
      'The median is the value with as many numbers above it as below, which is why it survives an outlier that would drag a mean sideways. Sorting is numeric rather than alphabetical, so 9 correctly sits below 10. Any run of spaces, commas or semicolons separates one number from the next, which means a value written with a thousands separator falls apart: 1,234 is read as the two numbers 1 and 234. Every token must be a finite number or the whole run stops, and the answer is printed to twelve significant digits.',
    faqs: [
      {
        question: 'How is an even-length list handled?',
        answer:
          'The two middle values are averaged. A list of 1, 2, 3, 4, 5, 6 gives 3.5, and 4, 1, 3, 2 gives 2.5 once sorted. That average is a real arithmetic mean of the two, so it can land on a value that never appeared in your data, which is normal and expected for an even count. An odd-length list simply returns its middle value untouched.',
      },
      {
        question: 'How do I separate the numbers, and what will break it?',
        answer:
          'Commas, spaces, semicolons or any mixture — line breaks work too, so a column pasted from a spreadsheet is fine. What breaks it is a thousands separator: 1,234 becomes 1 and 234, and the median of that pair is 117.5 rather than 1234. Currency symbols, per cent signs and units break it as well, because every token must parse as a number. Scientific notation such as 1e3 is accepted and read as 1000.',
      },
      {
        question: 'What is refused?',
        answer:
          'An empty box, or any token that is not a finite number, stops with "Enter a list of finite numbers separated by spaces or commas." — the word Infinity and a stray unit both trigger it. More than 100,000 values stops with "Number lists are limited to 100,000 values." There is no file picker: the numbers have to be in the box.',
      },
      {
        question: 'How is the answer rounded?',
        answer:
          'To twelve significant digits, then printed with any trailing zeros removed, so 2.50 shows as 2.5. Negative zero is printed as 0. The sorting and averaging themselves run in double-precision arithmetic before that formatting, so a halfway value between two very large numbers can be reported slightly off in the last digits.',
      },
      {
        question: 'Can it also give me the mean, the mode or quartiles?',
        answer:
          'Not from this page, which returns one number and nothing else. The same workbench has separate average, mode, variance and standard-deviation calculators that take the same kind of list. For several figures at once from a column of a table rather than a bare list, the CSV workbench has a column-statistics operation that reports the count, minimum, maximum, mean, median and population standard deviation together.',
      },
    ],
  },

  // lib/tools/finance-business-workbench.ts (the shared
  // compound-interest-calculator / fixed-deposit-calculator /
  // future-value-calculator branch of runFinanceOperation, compoundFields, the
  // future / finite / percent / currency / format helpers and scenarioNotice)
  // and lib/tools/finance-business-workbench.test.ts.
  'finance-and-business-fixed-deposit-calculator': {
    directAnswer:
      'Enter the starting amount, the annual rate as a percentage, the number of years and how many times a year interest compounds, then run it. It returns the future value and the growth, using future value = principal multiplied by (1 + rate divided by frequency) raised to the power of years times frequency. The default figures — 100,000 at 8% for 10 years compounding monthly — give 221964.023454.',
    leadParagraph:
      'Compounding frequency is a field, not an assumption, so the same form models a monthly, quarterly, half-yearly or annual deposit: 100,000 at 7% for 5 years compounded quarterly gives 141477.819576. This is exactly the same code as the compound-interest calculator and the future-value calculator in the same workbench — one branch, three names — so do not expect a deposit-specific answer from it. Nothing here knows what a fixed deposit is: there is no tax deducted at source, no senior-citizen rate, no premature-withdrawal penalty and no non-cumulative payout option. Treat the number as an estimate for comparison, not financial advice and not a quotation.',
    faqs: [
      {
        question: 'Which formula and which compounding does it use?',
        answer:
          'Future value equals the principal multiplied by (1 plus the annual rate divided by the compounding frequency), raised to the power of the number of years times that frequency. The frequency is whatever whole number you type from 1 to 365, so 1 is yearly, 4 quarterly and 12 monthly. A test in this repository pins the simplest case: 1,000 at 10% for 2 years compounding once a year gives a future value of 1210.',
      },
      {
        question:
          'Is this different from the compound-interest calculator on the same site?',
        answer:
          'No, and it is worth saying plainly: fixed deposit, compound interest and future value all run one identical branch with the same four fields. Only the page name and the wording around it differ. Whichever you open, you get the same arithmetic on the same inputs.',
      },
      {
        question: 'What does the projection leave out?',
        answer:
          'Everything a bank would add. Tax deducted at source and tax on the interest, a senior-citizen rate uplift, a penalty for breaking the deposit early, a non-cumulative deposit that pays interest out instead of reinvesting it, sweep-in and auto-renewal rules, and the day-count convention a bank applies when a term does not land neatly on a compounding date. It also assumes one unchanging rate for the whole term.',
      },
      {
        question: 'Why was my term or frequency refused?',
        answer:
          'Two separate guards. The frequency must be a whole number from 1 to 365, so 2.5 stops with "Frequency must be a whole number from 1 to 365." and 366 is out of range. Then the years multiplied by the frequency must itself be a whole number no greater than 1,000,000, so typing 0.583333 years with monthly compounding is refused with "Years × frequency must be a whole number no greater than 1,000,000." — for a seven-month term at monthly compounding you need a years figure that multiplies out exactly.',
      },
      {
        question: 'How exact are the figures, and is this financial advice?',
        answer:
          'It is not financial advice. The page carries its own notice that this is scenario arithmetic, and that rates, fees, compounding, timing, taxes and provider rules can all change the real result. Each of the two output lines is printed to twelve significant digits and rounded on its own, which is why the future value and the growth can show a different number of decimal places. No currency symbol is added, and nothing is rounded to the smallest currency unit the way a bank statement would be.',
      },
    ],
  },

  // lib/tools/date-workbench.ts (anniversary-calculator branch of
  // runDateOperation, the dateField / parseDateOnly / epochDay helpers) and
  // lib/tools/date-workbench.test.ts.
  'date-time-and-productivity-anniversary-calculator': {
    directAnswer:
      'Type the starting date and the comparison date, both in YYYY-MM-DD form, and it reports how many complete years have passed and how many days have gone by since the most recent anniversary. From 2015-09-06 to 2026-09-06 it reports 11 complete years and 0 days.',
    leadParagraph:
      'Both boxes are plain text with a YYYY-MM-DD hint rather than a calendar picker, and the format is checked strictly: four digits, a hyphen, two digits, a hyphen, two digits. All the arithmetic is done on whole calendar days in UTC, so no time of day and no time zone enters into it and a daylight-saving change cannot shift the answer by a day. The anniversary itself is the same month and day in a later year, with the day clamped down when that month is short — which is what makes 29 February work. The comparison date must not fall before the starting date.',
    faqs: [
      {
        question: 'How does it handle a 29 February anniversary?',
        answer:
          'By clamping the day down to the last day the month actually has in that year, so a 29 February start has its anniversary on 28 February in a common year. Counting from 2024-02-29 to 2025-02-28 gives 1 complete year and 0 days, and 2025-03-01 gives 1 complete year and 1 day. The rule is stated in the tool description itself.',
      },
      {
        question: 'What date format does it accept?',
        answer:
          'Only YYYY-MM-DD, with a four-digit year and two-digit month and day. A date written as 06/09/2015 is refused with "Use a valid date in YYYY-MM-DD form.", and a date that looks right but does not exist, such as 2026-02-30, is refused with "Use a valid calendar date." Years must fall between 0100 and 9999.',
      },
      {
        question: 'Can I count towards a future anniversary?',
        answer:
          'Not with this tool — the comparison date must be on or after the starting date, or it stops with "Comparison date must not be before the starting date." For a countdown to the next occurrence of a month and day, the same workbench has a birthday countdown that takes the date and a starting point and reports the days remaining and the date it lands on, using the same 29 February rule.',
      },
      {
        question: 'Does it give months or weeks as well?',
        answer:
          'No. The output is one line: complete years, then days since the most recent anniversary, separated by an interpunct. There is no month or week breakdown and no age-style years, months and days. For a plain count of days between two dates, use the date difference calculator in the same workbench.',
      },
      {
        question: 'Why does it say "1 complete years" and "1 days"?',
        answer:
          'Because the output line has no singular form — both words are written in the plural whatever the number, so a single year reads as 1 complete years and a single day as 1 days. It is a wording fault in the result line, not a counting fault: the numbers themselves are correct, and 2025-01-01 to 2026-01-02 really is one complete year and one day.',
      },
    ],
  },

  // lib/tools/science-education-workbench.ts (radioactive-decay-calculator
  // branch of runScienceOperation, the finite and format helpers and
  // physicsNotice) and lib/tools/science-education-workbench.test.ts.
  'science-and-education-radioactive-decay-calculator': {
    directAnswer:
      'Enter the initial quantity, the decay constant in reciprocal time units and the elapsed time, and it returns the quantity remaining from N equals N nought times e to the power of minus lambda t. With 100 at a decay constant of 0.1386294361 over 5 time units it reports 50.000000003.',
    leadParagraph:
      'This takes a decay constant, not a half-life, which is the main thing to check before typing. The two are related by lambda equals the natural logarithm of 2 divided by the half-life, and the default 0.1386294361 is that value rounded for a half-life of 5 — which is exactly why five time units leave 50.000000003 rather than a clean 50. Units are yours to keep consistent: the constant and the elapsed time must use the same time unit, and the quantity is unlabelled, so grams, atom counts and activity readings all behave the same. The output is a single line, and all three inputs must be zero or more.',
    faqs: [
      {
        question: 'Can I enter a half-life instead of a decay constant?',
        answer:
          'Not in this form — it reads a decay constant only. The same workbench has a separate half-life calculator that takes the initial quantity, the elapsed time and the half-life, and reports both the remaining quantity and how many half-lives have passed; a test pins 100 with a half-life of 5 over 10 elapsed units at 25 remaining. If you would rather stay here, convert first: lambda equals the natural logarithm of 2 divided by the half-life.',
      },
      {
        question: 'Which units does it expect?',
        answer:
          'Whichever you choose, provided the decay constant and the elapsed time agree. A constant per year needs a time in years; a constant per second needs a time in seconds. The quantity has no unit at all — whatever goes in comes out in the same terms, so a mass gives a mass and a count gives a count. The tool never labels the answer, so the units live in your head or your notes.',
      },
      {
        question: 'Does it identify isotopes or report activity?',
        answer:
          'No. There is no isotope table, so it cannot look up a half-life for you, and there is no conversion to becquerels or curies. It does not model decay chains, daughter products, branching ratios, or the build-up of a decay product. One exponential, one number out.',
      },
      {
        question: 'What is refused?',
        answer:
          'Any of the three inputs below zero, or any value that is not a number. A negative elapsed time is rejected with a message that begins "time must be a finite number from 0" and then prints the largest number the browser can hold — the message names the internal field and the raw bound rather than the friendly label, so it reads more starkly than the mistake deserves. A result that overflows the finite range stops with "The calculation did not produce a finite result."',
      },
      {
        question: 'How precise is the answer?',
        answer:
          'It is printed to twelve significant digits with no rounding to a sensible number of figures, which is why the default run shows 50.000000003 — the imprecision is in the rounded default constant, not the exponential. The page carries its own notice that it uses the stated idealised formula on the values you supply, and that significant figures, uncertainty and domain assumptions are yours to check before laboratory or engineering use.',
      },
    ],
  },

  // lib/tools/creator-workbench.ts (the shared instagram-caption-formatter /
  // linkedin-post-formatter / tiktok-caption-formatter branch of
  // runCreatorOperation, the content field, cleanContent, countReport,
  // positiveLimit and required helpers).
  'creator-and-social-instagram-caption-formatter': {
    directAnswer:
      'Paste the caption, set the character limit you are writing to, and it returns the tidied caption followed by a character count, a word count and how many characters you have left. Three rules are applied and no others: trailing spaces and tabs are stripped from every line, any run of three or more line breaks collapses to a single blank line, and the whole caption is trimmed top and bottom.',
    leadParagraph:
      'This is a measuring tool with a light tidy-up, not a rewriter. Your wording, capitalisation, emoji and hashtags come back exactly as you typed them. The character limit box starts at 2200 but it is just a number you can change, and the same code also drives the LinkedIn post formatter and the TikTok caption formatter in this workbench — the three pages differ only in the default limit. Characters are counted as Unicode code points, which is how a caption full of emoji can read longer here than you expect. The finished block is the caption, a blank line, an em dash on its own line, and then the counts.',
    faqs: [
      {
        question: 'What does it actually change in my caption?',
        answer:
          'Three things. Spaces and tabs left hanging at the end of a line are removed, three or more line breaks in a row become one blank line, and blank space at the very start and end is trimmed. Nothing else is touched — no rewriting, no capitalisation changes, no emoji substitution, and no invisible padding characters inserted to force line breaks. A deliberate four-line gap will come back as a single blank line.',
      },
      {
        question: 'Does it count hashtags?',
        answer:
          'No, although the tool description promises it does — the description says the tool reports characters, words and hashtags, and the output line reports characters and words only. That mismatch is a fault in the description, not something you can switch on. A hashtag is counted as one ordinary word, because the hash sign is not part of a word for counting purposes. For hashtag work, the same workbench has a hashtag workspace that normalises a list, removes repeats and reports how many unique tags remain.',
      },
      {
        question: 'How are characters counted?',
        answer:
          'As Unicode code points. A plain letter counts once, but an emoji built from several code points counts once per part: the woman-technologist emoji with a skin tone counts as four, so "Hi" plus a space plus that emoji reports 7 characters. An accented letter typed as a base letter plus a combining mark counts as two. A platform that counts differently will not agree with this number, so treat it as a close guide rather than the platform\x27s own figure.',
      },
      {
        question: 'What is refused?',
        answer:
          'An empty caption stops with "Content is required." and a caption over 500,000 characters with "Content is limited to 500,000 characters." The limit box must hold a whole number from 1 to 100,000; a decimal or a zero stops with "limit must be a whole number from 1 to 100,000." Going over the limit is not an error — the count line simply switches from remaining to over limit and tells you by how much.',
      },
      {
        question: 'Is there anything Instagram-specific about it?',
        answer:
          'Only the default of 2200 in the limit box. The transformation and the counting are shared with the LinkedIn and TikTok formatters here, and the tool has no knowledge of the platform at all: it will not post or schedule anything, it does not research or check hashtags, and it makes no claim about what any platform currently allows. Set the limit to whatever the surface you are writing for uses.',
      },
    ],
  },

  // lib/tools/spreadsheet-workbench.ts (csv-merger branch of
  // runSpreadsheetOperation, the csv() field, table / toCsv helpers),
  // lib/tools/structured.ts (csvToRecords, which trims headers) and
  // lib/tools/spreadsheet-workbench.test.ts, which pins the header rejection.
  'spreadsheet-and-data-csv-merger': {
    directAnswer:
      'Paste the first CSV in the top box and the second in the box below, and it returns one table with the second set of rows appended under the first. Both files must carry exactly the same headers in exactly the same order, or the run stops with "Both CSV inputs must have identical headers and order."',
    leadParagraph:
      'This is a stack, not a join: rows are copied through in order, first file then second, with no matching on any key and no attempt to reconcile columns. The header check compares the full list including its order, so the same columns written in a different sequence are refused and so is one extra column on either side. It is not fussy about spacing, though, because headers are trimmed when each file is parsed — a header written with a stray leading space matches the same header without one. Duplicate rows survive: an identical row present in both files appears twice in the result.',
    faqs: [
      {
        question: 'What happens if the two files have different headers?',
        answer:
          'The run stops with "Both CSV inputs must have identical headers and order." and nothing is produced. That covers a differently named column, an extra or missing column, and the same columns in a different order — a file headed name,score and a file headed score,name are both refused. Spacing is the one difference forgiven, because headers are trimmed before comparison. Fix the second file with the CSV column selector or the column renamer in the same workbench, then merge.',
      },
      {
        question: 'Can it match rows on a key column instead of stacking them?',
        answer:
          'No, and if that is what you need this is the wrong tool. The same workbench has a CSV join that takes a key column from each file and performs an inner or left join, adding the second file\x27s columns alongside the first file\x27s rows. Use the merger when both files are the same shape and you want more rows; use the join when you want more columns.',
      },
      {
        question: 'Does it remove duplicate rows?',
        answer:
          'No. A row that appears in both files appears twice in the merged output, exactly as it was. Run the CSV deduplicator on the result afterwards if you want them collapsed — it drops later rows that repeat a key you name, or the whole row when you leave its key box empty.',
      },
      {
        question: 'Can I merge more than two files at once?',
        answer:
          'Not in one pass — there are two boxes. Merge the first two, copy the result back into the top box, paste the third file into the second box, and repeat. Each round applies the same header check, so a file that drifts from the shared header will be caught at the point it is added rather than silently mangled.',
      },
      {
        question: 'What are the limits, and what does the output look like?',
        answer:
          'Each box is capped at 2,000,000 characters and each parsed table at 100,000 rows and 1,000 columns, checked separately — so the merged table can be larger than either limit on its own. The output is comma-separated with line-feed line endings, headers written in their trimmed form, and quotes added only around values containing a comma, a double quote or a line break. The download button saves it as csv-merger.txt, because this workbench declares no file extension, so rename it to .csv or copy the text directly.',
      },
    ],
  },

  // lib/tools/text-workbench.ts (the paragraph-counter branch of
  // runTextOperation and its splitting expression),
  // lib/tools/text-workbench.test.ts and components/text-workbench-tool.tsx.
  'text-and-writing-paragraph-counter': {
    directAnswer:
      'Paste the text and the paragraph count appears as you type, with no button to press. A paragraph ends only at a blank line — a single line break does not start a new one, so a three-line bulleted list counts as one paragraph.',
    leadParagraph:
      'The text is trimmed, then split wherever a line break is followed by a second line break with nothing but whitespace between them, and the resulting blocks that still contain something are counted. That makes a blank line the only separator this tool recognises. Several blank lines in a row do not create empty paragraphs — the run of them is treated as one break — and a line holding only spaces or tabs counts as blank. This is exactly where the tool parts company with a word processor, which starts a new paragraph at every hard return.',
    faqs: [
      {
        question: 'Does a single line break start a new paragraph?',
        answer:
          'No. Three lines separated by single line breaks count as one paragraph, which is the right answer for a bulleted list or an address block but the wrong one if your text came out of an editor that uses a plain return between paragraphs. Add a blank line between the blocks you want counted separately, or accept that a single-return document will report as one.',
      },
      {
        question: 'What counts as a blank line?',
        answer:
          'A line with nothing on it, or a line holding only spaces or tabs. Two blocks separated by a line containing a single space still count as two paragraphs, because whitespace between the two line breaks is allowed. Leading and trailing blank lines are trimmed away before counting and never produce an empty paragraph at either end.',
      },
      {
        question: 'Do several blank lines in a row inflate the count?',
        answer:
          'No. A run of two, three or five blank lines separates one paragraph from the next exactly once. The text One, blank, Two, two blanks, Three counts as three paragraphs, which a test in this repository pins.',
      },
      {
        question: 'Does it handle Windows line endings?',
        answer:
          'Yes. A carriage return followed by a line feed, twice over, still reads as a blank-line break, because the carriage return sits in the whitespace the split allows between the two line feeds. Text pasted from any of the usual editors behaves the same way.',
      },
      {
        question: 'What are the limits, and what is refused?',
        answer:
          'Text is capped at 2,000,000 characters with the message "Text is limited to 2,000,000 characters in this candidate." An empty box stops with "Enter some text first."; a box holding only whitespace is accepted and reports zero. There is no file picker on this page, so the text has to be pasted, and the result is a single number with a line underneath reading, for example, 3 paragraphs counted.',
      },
    ],
  },

  // lib/tools/web-workbench.ts (canonical-url-builder branch of
  // runWebOperation, the normalizedUrl / absoluteUrl / required / html
  // helpers) and lib/tools/web-workbench.test.ts.
  'web-and-seo-canonical-url-builder': {
    directAnswer:
      'Paste the absolute address and it returns a ready-to-paste link tag with rel set to canonical. Four things are normalised: the fragment is dropped, the host is lower-cased, a default port is removed, and the query parameters are sorted by name and then by value. So https://EXAMPLE.com:443/tools?b=2&a=1#section becomes https://example.com/tools?a=1&b=2.',
    leadParagraph:
      'What it does not change matters more than what it does. The path keeps its capitalisation exactly as typed, no trailing slash is added or removed, a www prefix is left alone, and tracking parameters are kept — they are merely re-ordered alongside everything else. The address is re-serialised by the browser address parser on the way through, so a space in the path comes back percent-encoded and an empty path gains the root slash. In the finished tag the ampersand between two parameters is written in its escaped HTML form, which is what makes the tag valid markup rather than a mistake.',
    faqs: [
      {
        question: 'Exactly what does it normalise?',
        answer:
          'Four things. Anything after a hash is discarded. The host name is lower-cased, so EXAMPLE.com becomes example.com. Port 443 on https and port 80 on http are removed as redundant. And the query parameters are re-ordered, sorted by name and then by value, so that two addresses listing the same parameters in a different order come out identical. The default example in the box shows all four at once.',
      },
      {
        question: 'Does it strip tracking parameters?',
        answer:
          'No. A campaign parameter such as utm_source is kept and only moved into sorted position, so an address with a tracking tag on it will produce a canonical tag pointing at the tracked address — which is usually not what you want. Remove those parameters yourself before pasting the address in.',
      },
      {
        question: 'Will it change my path or add a trailing slash?',
        answer:
          'No. Path capitalisation is preserved, so a path written with a capital letter stays that way; a trailing slash is neither added nor taken away; and a www prefix is untouched. The only path change comes from the address parser itself, which percent-encodes characters that are not allowed raw — a space becomes %20. An address with no path at all gains a single slash, because that is what the parser writes.',
      },
      {
        question: 'What kinds of address are refused?',
        answer:
          'Anything that is not a complete http or https address. A relative path such as /tools, a bare domain with no scheme, and an empty box all stop with "URL must be an absolute HTTP(S) URL."; another scheme such as ftp stops with "URL must use HTTP or HTTPS." Worth knowing: the length guard behind this tool can never report its own message, because a too-long address is caught by the parser first and reported as the absolute-address error instead.',
      },
      {
        question: 'Does it check the page or the rest of my markup?',
        answer:
          'No, and it makes no request of any kind. It is a text transform on the address you supply: it cannot tell you whether the page exists, whether it redirects, whether a noindex directive contradicts the tag, whether another canonical tag is already on the page, or whether a search engine will honour it. The tag is a suggestion to a crawler in any case, not an instruction.',
      },
    ],
  },

  // lib/tools/qr-barcode-workbench.ts (phone-qr-code branch of buildQrPayload,
  // sharing its number check with sms-qr-code, plus qrStyle and renderQr) and
  // components/schema-workbench-tool.tsx for the download.
  'qr-and-barcode-phone-qr-code': {
    directAnswer:
      'Enter the phone number, choose an error-correction level and a width, then download the symbol as an SVG. The payload is a tel address and nothing more — tel: followed by the number with spaces, round brackets and hyphens removed, so +91 (987) 654-3210 is encoded as tel:+919876543210.',
    leadParagraph:
      'A leading plus is kept, because that is what carries the international prefix, while separators are stripped so the encoded number is a single unbroken string. It shares its number check with the SMS code in the same workbench: an optional plus followed by 7 to 25 characters drawn from digits, spaces, round brackets and hyphens, and nothing else. This is the shortest payload of the whole QR set, which means a sparse symbol with large modules that survives printing small and scanning at a distance better than a long address would. Nothing about the number is checked beyond its shape.',
    faqs: [
      {
        question: 'What is inside the code?',
        answer:
          'One tel address and nothing else — no name, no label, no organisation, no extension. If you need the number to arrive with a name attached, the same workbench has a vCard QR code that carries a full name, phone, email and organisation in one symbol.',
      },
      {
        question: 'Which numbers are accepted?',
        answer:
          'An optional leading plus, then 7 to 25 characters made up of digits, spaces, round brackets and hyphens. A five-digit short code is refused for being too short, a number written with full stops is refused, and an extension written after a comma is refused — all with "Enter a valid-looking phone number." An empty box gives "Enter a phone number first." and anything over 50 characters is refused before the shape is even checked. Nothing verifies that the number is in service.',
      },
      {
        question: 'Should I include the country code?',
        answer:
          'Yes, if the code might be scanned outside its own country, because the tool adds nothing. It encodes what you type after removing separators, so a number written in national format is encoded in national format and will not connect for a visitor whose device has no local context. Type the plus and the country code yourself.',
      },
      {
        question: 'Does scanning it dial the number?',
        answer:
          'The payload only states a number; what happens next belongs to the scanning device, and the usual behaviour is to offer the number so the person can choose to call. The tool itself places no call and contacts nothing. Its own notice says this creates a standards-shaped payload rather than a checked destination, so review the number before printing it.',
      },
      {
        question: 'What settings are there, and what file do I get?',
        answer:
          'Error correction L, M, Q or H with M as the default, and a width from 160 to 1,200 pixels with 360 as the default — outside that range it stops with "SVG width must be between 160 and 1200." The output is an SVG with a four-module quiet zone, saved as phone-qr-code.svg; there is no PNG option, but vector output scales to any print size without going soft. The 8,000-character payload cap sits far above any phone number, so it will never be what stops you here.',
      },
    ],
  },

  // lib/tools/math-workbench.ts (mode-calculator branch of runMathOperation,
  // the parseList and format helpers) and lib/tools/math-workbench.test.ts,
  // plus components/math-workbench-tool.tsx for the 250 ms auto-run.
  'math-and-units-mode-calculator': {
    directAnswer:
      'Type the numbers into the one box, separated by commas, spaces or semicolons, and it returns every value that ties for the highest count, separated by commas. A list of 1, 2, 2, 3 gives 2; a list of 8, 2, 2, 8 gives 8, 2 — both of them, in the order they first appeared.',
    leadParagraph:
      'Counting is done on the numeric value, not on how you wrote it, so 2.50 and 2.5 are the same value and count together. Every value that reaches the highest count is returned, which means this tool never picks a winner for you and never reports a single mode when two are tied. The order is first appearance in your list, not ascending order, so the output of a tie tells you which value turned up first as well as which values tied. Values are printed to twelve significant digits, and the same list parsing applies as everywhere else in this workbench.',
    faqs: [
      {
        question: 'What happens when two values tie?',
        answer:
          'Both are returned, comma-separated, in the order they first appear in your list rather than in numeric order. A list of 8, 2, 2, 8 gives 8, 2 because 8 appeared first, and 5 5 1 1 9 gives 5, 1. Three or more values tied on the same count all come back the same way. The tool will not choose one for you and has no setting to make it.',
      },
      {
        question: 'What if no value repeats?',
        answer:
          'Every value is returned, because when nothing repeats the highest count is one and every value matches it. A list of 1, 2, 3 comes back as 1, 2, 3. That is the honest answer to a list with no mode, but it is worth recognising: if the output looks like your whole list handed back, it means nothing in it repeated.',
      },
      {
        question: 'How do I separate the numbers, and what will break it?',
        answer:
          'Commas, spaces, semicolons, line breaks, or any mixture. What breaks it is a thousands separator, because the comma splits: 1,234 is read as the two separate values 1 and 234. Currency symbols, per cent signs and units break it too, since every token must parse as a number. Scientific notation such as 1e3 is accepted and read as 1000.',
      },
      {
        question: 'What is refused?',
        answer:
          'An empty box, or any token that does not parse as a finite number, stops the run with "Enter a list of finite numbers separated by spaces or commas." More than 100,000 values stops with "Number lists are limited to 100,000 values." There is no file picker — the numbers have to be in the box — and there is no text mode, so a list of words or categories cannot be counted here.',
      },
      {
        question: 'How are the values printed?',
        answer:
          'Each one to twelve significant digits with trailing zeros removed, so 2.50 prints as 2.5 and negative zero prints as 0. One consequence to know about: counting happens on the full-precision value but printing happens afterwards, so two values that differ only beyond the twelfth significant digit are counted as two separate values and then printed identically — a tie between them would show the same number twice.',
      },
    ],
  },

  // lib/tools/finance-business-workbench.ts (cagr-calculator branch of
  // runFinanceOperation, the positive / finite / format helpers and
  // scenarioNotice) and lib/tools/finance-business-workbench.test.ts.
  'finance-and-business-cagr-calculator': {
    directAnswer:
      'Enter the beginning value, the ending value and the number of years, then run it. It returns one line: the compound annual growth rate as a percentage, from ((ending divided by beginning) raised to the power of one over years, minus one) multiplied by 100. A value of 100 growing to 180 over 5 years gives 12.4746113142%.',
    leadParagraph:
      'CAGR is the single constant yearly rate that would carry the first number to the second over that span, which is why it smooths away everything that happened in between. All three inputs must be greater than zero, so a position that fell to zero or below cannot be modelled here, but a fall is otherwise fine and simply reports a negative rate: 200 down to 100 over 3 years gives -20.6299474016%. The years figure may be fractional, so a span of eighteen months can be entered as 1.5. This is scenario arithmetic on three numbers, not financial advice.',
    faqs: [
      {
        question: 'Which formula does it use?',
        answer:
          'The ending value divided by the beginning value, raised to the power of one divided by the number of years, minus one, and multiplied by 100 to give a percentage. A test in this repository pins the clean case: 100 growing to 121 over 2 years gives exactly 10%. The default figures in the form, 100 to 180 over 5 years, give 12.4746113142%.',
      },
      {
        question: 'Can I use it for a loss?',
        answer:
          'Yes. An ending value below the beginning value gives a negative rate — 200 falling to 100 over 3 years reports -20.6299474016% — and that is a meaningful answer. What it cannot do is handle a value of zero or a negative value at either end, because a rate that carries a positive number to a negative one does not exist as a real annual rate. Both ends must be above zero.',
      },
      {
        question: 'Does it account for money added or taken out along the way?',
        answer:
          'No. It sees two values and a span, so contributions, withdrawals, dividends taken in cash and any dated cash flow are all invisible to it — the rate describes only the journey between the two numbers you typed. For a series of dated or irregular flows, the same workbench has IRR and XIRR operations that take a list of amounts, or dated amounts, instead.',
      },
      {
        question: 'Why was my input refused?',
        answer:
          'Because one of the three values was zero, negative or not a number. The message is blunt and unhelpful: it names the internal field, such as beginning or ending, and then states a range running from the smallest positive number a browser can hold up to the largest, rather than saying plainly that the value must be greater than zero. Read it as: all three boxes need a positive number.',
      },
      {
        question: 'Is this financial advice, and how is it rounded?',
        answer:
          'It is not financial advice. The page carries its own notice that this is scenario arithmetic and that rates, fees, compounding, timing, taxes and provider rules can change the real result. The percentage is printed to twelve significant digits, with no rounding to two decimal places and no adjustment for inflation, charges, tax or the currency the values are in. A growth rate quoted by a fund or a statement may use a different convention and will not necessarily match.',
      },
    ],
  },

  // lib/tools/developer-advanced-workbench.ts (the 'json-diff' operation, the
  // jsonDiff walker and the json/required helpers),
  // lib/tools/developer-advanced-workbench.test.ts,
  // components/schema-workbench-tool.tsx and app/developer/[tool]/page.tsx
  'developer-and-data-json-diff': {
    directAnswer:
      'Paste the earlier JSON into the Before box and the later JSON into the After box; the comparison re-runs on its own a quarter of a second after you stop typing. Both documents are parsed before anything is compared, so key order, indentation and line endings never show up as changes — only a value that really moved does. Each change prints as one line: the path, the old value, an arrow, then the new value.',
    leadParagraph:
      'This walks two parsed JSON values together and reports the leaves where they disagree. Objects are compared on the union of their keys, sorted, so reordering a file changes nothing; arrays are compared position by position, which is the behaviour that surprises people most, because inserting one element at the front makes every later position look changed. Where one side has no value at all the line prints the word missing, so an added or deleted key reads the same way as an edited one. The result is plain text, not a patch: there is no merge, no apply, no three-way compare and no schema check anywhere on this page. Each box accepts up to 1,000,000 characters and the walk stops at 10,000 changes rather than truncating the list.',
    faqs: [
      {
        question: 'What counts as a difference, and what is ignored?',
        answer:
          'The JSON Diff tool parses both sides first, so formatting is invisible to it: whitespace, indentation, line endings and the order of object keys never produce a line. What it reports is a leaf whose value differs — a string, a number, a boolean, a null, or a whole object or array where the other side has a scalar. A change to the nested value active reads as the single line "$.user.active: true → false", which is what a test in this repository requires of it.',
      },
      {
        question: 'How does it compare arrays?',
        answer:
          'By position, index against index, for as many positions as the longer array has. That is exact but blunt: insert one item at the start of a ten-item list and the JSON Diff tool reports ten changes, not one insertion, because every later item has moved to a new index. It has no idea of a matching key or an identity field, so it cannot tell a moved row from a rewritten one. When you are comparing lists of records, sort both sides by the same key first and you will get a readable result.',
      },
      {
        question: 'What does the word missing mean in a line?',
        answer:
          'That the value is absent on that side. When a key exists only in the After document the line reads missing on the left; when it exists only in the Before document it reads missing on the right. The JSON Diff tool does not label these as additions or deletions with separate wording, so a key that was added and a key whose value changed are two lines in the same shape. Read the side that says missing to tell which happened.',
      },
      {
        question: 'What are the limits, and what is saved when I download?',
        answer:
          'Each of the two boxes is limited to 1,000,000 characters, and going over gives "Before JSON is limited to 1,000,000 characters." naming the box. A document that will not parse is refused with the browser parser\x27s own message attached, as in "After JSON is invalid: ...". The walk itself stops at 10,000 changes with "JSON diff is limited to 10,000 changes." rather than showing a shortened list — two files that differ everywhere are refused, not summarised. The download button saves exactly the lines you can see, as json-diff.txt.',
      },
      {
        question: 'Are there cases where it reports a change I cannot see?',
        answer:
          'Two, both real. Comparing negative zero with zero is treated as a change, because the tool compares leaves with the identity test rather than the equals sign, yet both sides print as 0 — so a line reading "$.x: 0 → 0" is that case and nothing else. And a document that carries the same key twice keeps only the last of them, because that is what the browser\x27s JSON parser hands back, so a duplicate-key difference cannot be seen here at all. Identical documents give "No JSON differences."',
      },
    ],
  },

  // lib/tools/web-workbench.ts (the 'robots-txt-generator' operation and its
  // run case, plus the lines, required and absoluteUrl helpers),
  // components/schema-workbench-tool.tsx and app/web/[tool]/page.tsx
  'web-and-seo-robots-txt-generator': {
    directAnswer:
      'Type one user agent, list the paths to disallow one per line, list any paths to allow one per line, and the robots.txt text is rebuilt as you type. It emits four directive names and no others — User-agent, Disallow, Allow and Sitemap — for a single group. Copy the result and save it yourself as robots.txt at the root of your site; this page cannot publish it for you.',
    leadParagraph:
      'The output is assembled in a fixed order: the User-agent line, then every Disallow line, then every Allow line, then a Sitemap line if you filled that box in. Only one group is produced, so a file that treats one crawler differently from the rest has to be written by hand or assembled from two runs. The paths themselves are passed through untouched — they are trimmed and blank lines are dropped, and nothing else is checked, so a path missing its leading slash, a full URL, or a wildcard goes into the file exactly as you typed it. The Sitemap box is the one field that is validated: it must be an absolute HTTP or HTTPS address, and it is normalised by the browser\x27s own URL parser before it is written. Leave it blank and the Sitemap line is left out.',
    faqs: [
      {
        question: 'Which directives can it write?',
        answer:
          'Four. The Robots.txt Generator emits User-agent, Disallow, Allow and Sitemap, and there is no field for anything else — no Crawl-delay, no Host, no Noindex, no comment lines. If your file needs one of those, add it by hand after you copy the text out. Every Disallow is written before every Allow regardless of the order you typed them in, because the tool groups them by kind rather than preserving your sequence.',
      },
      {
        question: 'Can I write rules for more than one crawler?',
        answer:
          'Not in one run. The Robots.txt Generator has a single User agent field and produces a single group, so a file with a rule for everyone and a different rule for one named crawler needs two runs pasted together, with a blank line between the groups. The companion Robots.txt Tester on this site reads multi-group files, but it merges the groups it matches rather than picking the most specific one, so check its answer against the crawler\x27s own tooling before you rely on it.',
      },
      {
        question: 'Does it check that my paths are valid?',
        answer:
          'No, and that is worth knowing before you publish. The Robots.txt Generator trims each line and drops blank ones, then writes whatever is left after "Disallow: " or "Allow: " verbatim. It does not require a leading slash, does not reject a full URL pasted in by mistake, and does not interpret a star or a dollar sign — those characters are copied through for the crawler to interpret, not for this page to. Read the finished file before you upload it.',
      },
      {
        question: 'Why was my sitemap address refused?',
        answer:
          'Because the Sitemap box takes an absolute address only. A relative path such as /sitemap.xml gives "Sitemap URL must be an absolute HTTP(S) URL.", and an address on a scheme other than HTTP or HTTPS gives "Sitemap URL must use HTTP or HTTPS." A valid address is rewritten in normalised form, so a bare origin gains its trailing slash. Leaving the box empty is allowed and simply omits the line.',
      },
      {
        question: 'Does it fetch or publish my live robots.txt?',
        answer:
          'No. The Robots.txt Generator never requests anything from your domain and cannot write to it. It builds text in this tab from what you typed, and putting that text at the root of your site, at the exact address your host serves, is a step you do yourself. Each path list is capped at 5,000 lines, with "This tool is limited to 5,000 lines." past that, and the result downloads as robots-txt-generator.txt, which you rename to robots.txt.',
      },
    ],
  },

  // lib/tools/math-workbench.ts (the 'ratio-calculator' operation, its run
  // case and the integer, gcd and format helpers),
  // lib/tools/math-workbench.test.ts and app/math/[tool]/page.tsx
  'math-and-units-ratio-calculator': {
    directAnswer:
      'Enter two whole numbers and the page reduces them to lowest terms as you type, printing a result such as 2:3. It divides both values by their greatest common divisor and nothing else: no rounding, no decimals, no third term. Twelve and eighteen give 2:3, which is the case a test in this repository pins.',
    leadParagraph:
      'Both fields take whole numbers only, checked against the exact integer range the browser can hold, so a decimal such as 1.5 is refused rather than rounded into something it is not. The greatest common divisor is taken from the absolute values, and each side is divided by it, so the sign of each number survives the reduction unchanged — which means minus twelve to minus eighteen comes out as -2:-3 rather than the 2:3 most people would write. Zero is allowed on one side but not on both. This tool reduces; it does not scale a ratio up to a target, split a quantity in a given ratio, or solve for a missing term, and there is no way to enter a three-part ratio such as 2:3:5. The separate Proportion Calculator on this site is the one that solves a to b equals c to x.',
    faqs: [
      {
        question: 'What exactly does it calculate?',
        answer:
          'The Ratio Calculator divides both of your numbers by their greatest common divisor and prints the two results separated by a colon. For 12 and 18 the divisor is 6, so the answer is 2:3. Nothing else is reported — no decimal equivalent, no percentage, no fraction and no scale factor — and the divisor itself is not shown.',
      },
      {
        question: 'Can I enter decimals, or a third value?',
        answer:
          'No to both. Each field is checked as a whole number within the exact integer range, so 1.5 or 0.25 is refused with a message naming the field, such as "a must be a safe whole number." There are only two fields, so a three-part ratio such as 2:3:5 cannot be entered. Multiply decimals up to whole numbers first — 1.5 to 2 becomes 3 to 4 — and reduce a three-part ratio a pair at a time.',
      },
      {
        question: 'How does it handle negative numbers and zero?',
        answer:
          'Signs are carried straight through, because the common divisor is taken from the absolute values and then divided into each side as it stands. So minus 12 to 18 gives -2:3, and minus 12 to minus 18 gives -2:-3 rather than the 2:3 that most conventions would write for two negatives. Zero on one side is allowed and reduces to 0:1 or 0:-1; zero on both sides is refused with "At least one ratio value must be non-zero." Read a negative result with that quirk in mind.',
      },
      {
        question: 'Will it scale a ratio to a new total?',
        answer:
          'No. The Ratio Calculator only reduces. It will not tell you what 2:3 becomes when the total is 250, will not split an amount between two shares, and will not solve for a missing term. For the last of those, the Proportion Calculator alongside it takes a, b and c and solves a to b equals c to x, and the Percentage Calculator handles share-of-total questions.',
      },
    ],
  },

  // lib/tools/finance-business-workbench.ts (the 'sip-calculator' operation,
  // its run case, the monthlyContribution, finite, positive, percent and
  // format helpers and the scenario notice),
  // lib/tools/finance-business-workbench.test.ts and
  // app/finance/[tool]/page.tsx
  'finance-and-business-sip-calculator': {
    directAnswer:
      'Enter the monthly contribution, the annual rate you want to assume and the number of years, and the projection updates as you type. It applies the ordinary annuity future-value formula — the contribution multiplied by one plus the monthly rate raised to the number of months, less one, all divided by the monthly rate — and prints the projected value, the total contributed and the difference between them. This is scenario arithmetic on a rate you chose, not financial advice.',
    leadParagraph:
      'Two choices inside the formula decide the number, and both differ from calculators you may have used. Contributions are treated as arriving at the end of each month, which is what the tool\x27s own description says, whereas many published SIP formulas multiply by one more factor of one plus the rate for a start-of-month deposit and so return a slightly larger figure. The monthly rate is the annual rate divided by twelve, a plain nominal division rather than the twelfth root of annual growth, so a stated 12 per cent behaves as 1 per cent a month and compounds to a little more than 12 per cent over the year. Years times twelve must land on a whole number of months between 1 and 12,000, so 10.5 years is accepted and 10.3 is refused. All three figures print to twelve significant digits with no currency symbol and no rounding to paise or cents.',
    faqs: [
      {
        question: 'Which formula does it use?',
        answer:
          'The ordinary annuity future value. The SIP Calculator takes your contribution, multiplies by one plus the monthly rate raised to the number of months, subtracts one, and divides by the monthly rate. The monthly rate is simply the annual rate divided by twelve. A rate of exactly zero is handled separately as contribution times months, which is why 100 a month for one year at 0 per cent returns 1200 — a test in this repository requires that.',
      },
      {
        question:
          'Does it assume I invest at the start or the end of the month?',
        answer:
          'The end. The SIP Calculator applies the ordinary annuity form, so the first contribution earns nothing in its own month and the last one earns nothing at all. If your provider takes the money on the first of the month, the real outcome sits slightly above this figure, because each contribution has one extra month of growth. The gap is small over a year and grows with the term, so compare like with like before you read anything into a difference between this number and another calculator\x27s.',
      },
      {
        question: 'What do the three lines mean?',
        answer:
          'Projected value is the future value the formula produces. Contributed is simply your monthly amount times years times twelve, so it is the money you put in. Scenario growth is the first minus the second — the part that the assumed rate produced rather than you. None of the three is adjusted for inflation, fees, exit loads, taxes, a missed instalment or a change in the amount, because the SIP Calculator has no field for any of those.',
      },
      {
        question: 'Why was my term refused?',
        answer:
          'Because years times twelve has to resolve to a whole number of months from 1 to 12,000, and anything else stops with "Term must resolve to 1–12,000 whole months." A term of 10.5 years is 126 months and runs; 10.3 years is 123.6 months and does not. The rate field accepts a negative assumption down to just under minus 100 per cent, so a loss scenario is possible. The error messages for the amount and the term quote the raw floating-point bounds rather than something readable, which is a rough edge in the tool, not a problem with your input.',
      },
      {
        question: 'Is this a promise about what my investment will do?',
        answer:
          'No. The tool carries its own notice: scenario math only, not financial, investment, tax, accounting or lending advice, and rates, fees, compounding, timing, taxes, insurance, rounding and provider rules can all change the real result. It projects one constant rate that you typed in, and no market delivers a constant rate. Treat the figure as an estimate for comparing options, and take a decision to a licensed adviser.',
      },
    ],
  },

  // lib/tools/date-workbench.ts (the 'workday-calculator' operation, the
  // addWorkdays, parseDateOnly, epochDay, fromEpochDay, integer and
  // boundedShift helpers), lib/tools/date-workbench.test.ts and
  // app/date/[tool]/page.tsx
  'date-time-and-productivity-workday-calculator': {
    directAnswer:
      'Enter a starting date in YYYY-MM-DD form and the number of workdays to move, negative to count backwards, and the answer updates as you type. It counts Monday to Friday and nothing else: Saturday and Sunday are skipped, and public holidays are not deducted anywhere. From 9 January 2026, one workday forward is 2026-01-12, which a test in this repository pins.',
    leadParagraph:
      'Every date is handled as a whole number of days since the epoch in UTC, so no time zone, no clock and no daylight-saving change can shift an answer by a day. A start date that falls on a Saturday or a Sunday is first moved to the nearest weekday in the direction you are travelling, and that move uses up one of the days you asked for — so a Saturday plus one workday lands on the following Monday, and a Saturday minus one lands on the Friday before. Counting then runs in whole weeks where it can and one day at a time for the remainder. Dates are accepted from year 0100 through 9999 and the shift is capped at 100,000 workdays in either direction. The tool has no holiday calendar and no way to load one, so any answer near a public holiday or a company shutdown needs adjusting by hand.',
    faqs: [
      {
        question: 'Does it skip public holidays?',
        answer:
          'No. The Workday Calculator skips Saturdays and Sundays and nothing else — the tool\x27s own description says public holidays are not included. There is no country setting, no holiday list and no field to add your own dates. For a deadline that crosses Diwali, Christmas, a bank holiday or an office shutdown, count the closed weekdays yourself and add them to the number you type in.',
      },
      {
        question: 'What happens if my starting date is a weekend?',
        answer:
          'It is pulled onto a weekday first, in the direction you are counting, and that move consumes one of the workdays. So a Saturday plus one workday gives the following Monday, and a Saturday minus one gives the Friday before. A Friday plus one workday also gives the following Monday, so the two starts agree — which is convenient but worth knowing if you are checking the arithmetic by hand.',
      },
      {
        question: 'Can I count backwards, and how far can I go?',
        answer:
          'Yes: type a negative number of workdays and the Workday Calculator counts back through weekdays. The shift is limited to 100,000 workdays either way, with "Workday adjustments are limited to 100,000." past that, and the answer has to land between the years 0100 and 9999 or you get "The resulting date must be between 0100 and 9999." A shift of zero returns the starting date unchanged, weekend or not.',
      },
      {
        question: 'Why was my date refused?',
        answer:
          'The date field takes the YYYY-MM-DD form only — no slashes, no day-first order, no month names — and anything else gives "Use a valid date in YYYY-MM-DD form." A date in that shape that does not exist, such as 2026-02-30, gives "Use a valid calendar date." rather than rolling over into March. Years outside 0100 to 9999 give "Dates must use years from 0100 through 9999.", and the workday count has to be a whole number.',
      },
      {
        question: 'How is this different from adding calendar days?',
        answer:
          'Adding calendar days counts every day; the Workday Calculator counts only Monday to Friday, so ten workdays from a Monday is two weeks later rather than ten days later. If you want plain calendar arithmetic, the Add Days to Date and Subtract Days from Date tools on this site do that, and the Business Days Calculator counts the weekdays between two dates you already have rather than projecting a new one.',
      },
    ],
  },

  // lib/tools/science-education-workbench.ts (the 'ideal-weight-calculator'
  // operation, its run case and notice, and the positive helper),
  // lib/tools/science-education-workbench.test.ts and
  // app/science/[tool]/page.tsx
  'health-and-fitness-ideal-weight-calculator': {
    directAnswer:
      'Choose male or female, enter a height in centimetres, and four published estimates appear together, each named and dated: Devine 1974, Robinson 1983, Miller 1983 and Hamwi 1964. All four work from inches over five feet, so the height is converted and the excess measured from there, and every figure is given in kilograms to one decimal place. These are historical formulas, not medical advice.',
    leadParagraph:
      'The height you type is divided by 2.54 to get inches, and the number of inches above sixty — five feet — drives all four lines. Each formula is a base weight plus a fixed amount per inch: Devine adds 2.3 kg per inch to 50 kg for male or 45.5 kg for female, Robinson adds 1.9 kg to 52 kg or 1.7 kg to 49 kg, Miller adds 1.41 kg to 56.2 kg or 1.36 kg to 53.1 kg, and Hamwi adds 2.7 kg to 48 kg or 2.2 kg to 45.5 kg. For a male at 175 cm this gives 70.5, 68.9, 68.7 and 72.0 kg, the four figures a test in this repository fixes. Below five feet the excess is held at zero, so every height under 152.4 cm returns the same four base numbers — 150 cm and 120 cm produce identical output, which is a limit of formulas defined only above five feet rather than a statement about short people. There is no weight field, no age, no frame size and no body-composition input, and the form offers only male and female because those are the only two constant sets these equations define.',
    faqs: [
      {
        question: 'Which formulas does it use, and why four?',
        answer:
          'Devine from 1974, Robinson from 1983, Miller from 1983 and Hamwi from 1964, all four shown side by side with their years, in kilograms to one decimal place. The Ideal Weight Calculator shows all four rather than picking one because they disagree, and the spread between them is the honest answer. For a male at 175 cm they give 70.5, 68.9, 68.7 and 72.0 kg — a range of more than three kilograms from the same single height.',
      },
      {
        question: 'Why does my answer not change below about 152 cm?',
        answer:
          'Because all four formulas count inches above five feet, and the Ideal Weight Calculator holds that count at zero rather than letting it go negative. Five feet is 152.4 cm, so every height below it returns each formula\x27s base constant: 45.5, 49.0, 53.1 and 45.5 kg for female, and 50, 52, 56.2 and 48 kg for male. A height of 150 cm and a height of 120 cm give exactly the same output. These equations were never defined below five feet, so the figures there carry no meaning at all.',
      },
      {
        question: 'Does it take my current weight, age or build into account?',
        answer:
          'No. The Ideal Weight Calculator asks for two things only — biological sex and height in centimetres — so it has nothing else to work from. There is no weight field, no age, no frame-size option and no body-fat input, which means two people of the same height and sex always receive identical numbers whatever their build, muscle or history. Height in centimetres is the only accepted unit; convert feet and inches before typing.',
      },
      {
        question: 'Should I try to reach one of these numbers?',
        answer:
          'That is not a question this tool can answer. Its own notice says these are formula results only, not medical advice, and that they are historical formulas which do not describe what any individual should weigh. Several were written to help with drug dosing rather than to set a personal target. Take any figure from here to a clinician who can see the rest of the picture.',
      },
      {
        question: 'Why was my height refused?',
        answer:
          'The height field takes a finite number greater than zero, so a blank box, a zero, a negative value or text is rejected. The message quotes the raw floating-point bounds rather than something readable, which is a rough edge in the tool rather than a problem with what you typed — enter a plain positive number of centimetres, such as 175, and it runs.',
      },
    ],
  },

  // lib/tools/science-education-workbench.ts (the 'ph-calculator' operation,
  // its run case, its notice and the positive and format helpers),
  // lib/tools/science-education-workbench.test.ts and
  // app/science/[tool]/page.tsx
  'science-and-education-ph-calculator': {
    directAnswer:
      'Enter a hydrogen-ion concentration in moles per litre and the page returns the pH as the negative base-ten logarithm of that number, together with the pOH as fourteen minus the pH. It takes the ion concentration itself, not the concentration of an acid, so no dissociation is assumed or calculated anywhere. A concentration of 0.001 gives a pH of 3 and a pOH of 11.',
    leadParagraph:
      'There is one input field and it is labelled for what it wants — hydrogen-ion concentration in mol/L — and that single decision defines what the tool is and is not. It never asks whether your solution is an acid or a base, never asks for a dissociation constant, and never asks how many protons a molecule can donate, so it cannot assume full dissociation, because it is not given anything to dissociate. Working from a strong monoprotic acid, you are the one assuming that its molarity equals the hydrogen-ion concentration, and you make that assumption before you type; for a base you must convert to the hydrogen-ion figure yourself first. The pOH line assumes the ion product of water at 25 degrees Celsius and ideal activity, both stated in the tool\x27s own notice, so a warm solution or a concentrated one drifts away from it. The result is not clamped to the nought-to-fourteen range: a concentration above 1 mol/L returns a negative pH, and 2 mol/L gives roughly minus 0.301 with a pOH above 14.',
    faqs: [
      {
        question: 'Does it assume a strong acid fully dissociates?',
        answer:
          'It makes no dissociation assumption at all, because it never sees an acid. The pH Calculator has one field, the hydrogen-ion concentration in moles per litre, and it applies the negative base-ten logarithm to whatever you put there. Treating a strong monoprotic acid\x27s molarity as its hydrogen-ion concentration is a step you take in your head before typing, and it is the step where dissociation is assumed. For a weak acid that step is wrong, and this page will not warn you.',
      },
      {
        question:
          'Can I enter a base, or a pKa, or the pH to get back a concentration?',
        answer:
          'No to all three. There is no base option, no dissociation-constant field and no reverse direction on this page — the pH Calculator runs one way, from hydrogen-ion concentration to pH and pOH. To work from a hydroxide concentration, convert to the hydrogen-ion figure yourself first. To go the other way, raise ten to the power of minus your pH using the Scientific Calculator on this site.',
      },
      {
        question: 'How is the pOH figure produced?',
        answer:
          'By subtracting the pH from fourteen, nothing more. The pH Calculator\x27s own notice states the two assumptions behind that line: ideal activity, and pH plus pOH equal to fourteen at 25 degrees Celsius. The ion product of water changes with temperature, so at other temperatures the constant is not fourteen and the pOH shown here will be out. There is no temperature field to correct it with.',
      },
      {
        question: 'Why does it show a negative pH?',
        answer:
          'Because it does not clamp the answer to the familiar nought-to-fourteen range. Any concentration above 1 mol/L has a negative base-ten logarithm, so 2 mol/L returns a pH of about minus 0.301 and a pOH above fourteen. That is the arithmetic being honest rather than a fault, but it is also the region where the ideal-activity assumption breaks down badly, so a figure out there should not be taken as a measurement.',
      },
      {
        question: 'What does it refuse, and what must it not be used for?',
        answer:
          'Zero and negative concentrations are refused, because the logarithm of either is not a finite number — the field accepts a finite value greater than zero only, and the refusal quotes raw numeric bounds rather than a readable sentence, which is a rough edge in the tool. Beyond that, the notice is explicit: this is not suitable for clinical, safety, or process-control decisions. Use a calibrated meter for anything that matters.',
      },
    ],
  },

  // lib/tools/life-admin-workbench.ts (the 'indian-phone-number-formatter'
  // operation, its run case and notice, and the required and digits helpers),
  // components/schema-workbench-tool.tsx and app/life-admin/[tool]/page.tsx
  'india-and-life-admin-indian-phone-number-formatter': {
    directAnswer:
      'Paste a mobile number in whatever shape you have it and the page rewrites it as +91 followed by two groups of five digits. It strips every separator, drops a leading 91 from a twelve-digit number or a leading zero from an eleven-digit one, then requires exactly ten digits starting with 6, 7, 8 or 9. This checks the shape of a number and nothing else — not whether it is assigned, reachable or yours to contact.',
    leadParagraph:
      'The input is screened before anything else: only digits, spaces, round brackets, plus signs and hyphens are allowed through, so a number pasted with a letter or a dot in it is refused rather than silently cleaned. What survives is reduced to digits, and exactly two prefixes are recognised — a twelve-digit string beginning 91 loses those two digits and an eleven-digit string beginning 0 loses that zero — with nothing else stripped, so an international form written as 0091 is not understood. The remainder must be ten digits opening with 6 to 9, the range Indian mobile numbers use, and the output is always the same shape: +91, a space, five digits, a space, five digits. Because the leading-zero rule and the 6-to-9 rule run independently, a landline written with an STD code that starts with 8 or 9 — a Bengaluru 080 number, for example — passes the check and is reformatted as though it were a mobile. Read the result, not just the fact that it appeared.',
    faqs: [
      {
        question: 'Which input formats does it understand?',
        answer:
          'A bare ten-digit number, the same number with 91 or +91 in front, and the same number with a single leading zero. Separators do not matter: spaces, hyphens and round brackets are all removed, so +91 98765-43210 and (98765) 43210 both reduce to the same digits. What it does not understand is the 0091 form — those digits are not recognised as a country prefix, so the string ends up too long and is refused. Strip it to +91 or to the ten digits first.',
      },
      {
        question: 'Why was my number refused?',
        answer:
          'Two named checks stop it. Anything containing a character other than a digit, a space, a bracket, a plus or a hyphen gives "Mobile number accepts digits and common phone separators only." — a dot or a letter in a pasted number is the usual cause. Once the digits are extracted and any 91 or leading zero removed, what remains must be ten digits beginning 6, 7, 8 or 9, and anything else gives "Enter a 10-digit Indian mobile number beginning with 6–9." A blank box gives "Enter a mobile number first."',
      },
      {
        question: 'Will it catch a landline typed in by mistake?',
        answer:
          'Not always, and this is worth checking by eye. An eleven-digit landline written with its leading zero has that zero removed, and if the STD code then begins with 6, 7, 8 or 9 the number passes the mobile test. A Bengaluru landline written as 080 followed by eight digits is exactly that case: the Indian Phone Number Formatter accepts it and prints it as +91 80260 01234 or similar. The rule it applies is a digit-count and first-digit rule, not a directory lookup, so a plausible-looking landline can pass.',
      },
      {
        question: 'Does it check that the number exists or is reachable?',
        answer:
          'No. The tool\x27s own notice says this is a formatting check only, and that it does not verify assignment, ownership, reachability, consent, or DND status. Nothing leaves the page and no operator database is consulted. A number can be correctly shaped, correctly formatted by this tool, and still be unassigned, disconnected, or one you have no permission to message.',
      },
      {
        question: 'What does the output look like, and can I change it?',
        answer:
          'Always the same: +91, a space, the first five digits, a space, the last five. There is no setting for hyphens instead of spaces, no option to drop the country code, and no bulk mode for a list of numbers — one number in, one formatted number out. If you need a different grouping, edit the result after you copy it.',
      },
    ],
  },

  // lib/tools/creator-workbench.ts (the 'youtube-description-template'
  // operation, its run case and the pairs, lines, absoluteUrl, chapters,
  // timestamp and clock helpers), lib/tools/creator-workbench.test.ts and
  // app/creator/[tool]/page.tsx
  'creator-and-social-youtube-description-template': {
    directAnswer:
      'Write a summary, list your links one per line as a label, a vertical bar and a URL, and list your chapters one per line as a timestamp followed by a title. The page assembles a description with a LINKS heading and a CHAPTERS heading, validating every URL and every timestamp as it goes. All three boxes are required: it will not produce a description with no links or no chapters.',
    leadParagraph:
      'The value here is in the checking, not the layout. Every link is split on a vertical bar into exactly two non-empty parts, and the second is parsed as a web address — a relative path or a typo that will not parse is refused by line number rather than published as a dead link, and a valid address is rewritten in normalised form. Every chapter timestamp is parsed as seconds, minutes and seconds, or hours, minutes and seconds, with the minute and second parts capped at 59; the first chapter must start at zero, each must be later than the one before, and the output is rewritten in the compact form, so 00:00 becomes 0:00 and 3661 seconds becomes 1:01:01. What it does not check is anything about how many chapters you have or how long each one runs, so a list it accepts may still not turn into chapter markers on the platform. It also reports no character count, so measure the finished description against the platform limit yourself before you paste it in.',
    faqs: [
      {
        question: 'How do I write the chapters box?',
        answer:
          'One chapter per line as a timestamp, a space, then the title — 00:00 Introduction, then 01:25 Privacy, and so on. Do not type the vertical bar here even though the sibling YouTube Chapter Generator wants one: this tool inserts the bar itself after the first run of non-space characters, so a line already containing one ends up with two and is refused with "Line 1 must contain 2 non-empty pipe-separated fields." The same message appears for a chapter title that contains a vertical bar of its own, which this tool cannot carry.',
      },
      {
        question: 'What are the rules for the timestamps?',
        answer:
          'The first chapter must start at zero, or you get "The first chapter must start at 0:00." Each later one must be strictly later than the one before it, or you get "Chapter 2 must be later than the previous chapter." naming the line. Timestamps may be written as seconds, as minutes and seconds, or as hours, minutes and seconds, and the parts after the first cannot exceed 59 — anything else gives "Invalid timestamp:" followed by what you typed. The output is normalised, so 00:00 comes back as 0:00 and an hour-long mark comes back as 1:01:01.',
      },
      {
        question: 'Why was one of my links refused?',
        answer:
          'Each line in the links box must be a label, a vertical bar, and a URL, both parts non-empty, or the line number is named in the error. The URL part must be an absolute web address: a relative path such as /shop, or a typo the browser cannot parse, gives "URLs must be absolute HTTP(S) URLs.", and an address on another scheme gives "URLs must use HTTP or HTTPS." Valid addresses are normalised, so a bare domain comes back with its trailing slash.',
      },
      {
        question: 'Can I leave out the links or the chapters?',
        answer:
          'No. All three boxes are required, and an empty links or chapters box stops with "Enter at least one non-empty line." while an empty summary gives "Summary is required." The YouTube Description Template always writes both headings, in the order summary, then LINKS, then CHAPTERS, and there is no way to reorder them, rename them or drop one. If you want a description without chapters, delete the section after you copy the text out.',
      },
      {
        question: 'Does it count characters against the platform limit?',
        answer:
          'No, and this is the one thing to check by hand. The YouTube Description Template reports no character count at all, unlike the title and caption tools on this site which count against a limit you pick. It also does not check how many chapters you have listed or how long each one lasts, so a chapter list it happily accepts may still not become chapter markers. The summary box takes up to 500,000 characters and each list up to 10,000 lines, which are the tool\x27s limits rather than any platform\x27s.',
      },
    ],
  },

  // components/pdf-page-tools.tsx (the page-order field, the 150 MB gate and
  // the worker call), lib/tools/pdf/page-selection.ts and its test,
  // lib/tools/pdf/engine.ts (transformPdfPages, loadPdf) and
  // app/pdf/[tool]/page.tsx
  'pdf-delete-pdf-pages': {
    directAnswer:
      'Choose a PDF of up to 150 MB, then edit the page box to list the pages you want to keep — it opens prefilled with the whole document, and you delete a page by removing it from that list. The pages you keep are copied into a new PDF in the order you typed, inside a background worker in this tab, and the result is reopened and its page count checked before you are offered the file. The box takes single pages and ranges, as in 3, 1-2.',
    leadParagraph:
      'This is the one thing to know before you start: there is no box for the pages to remove. The field is labelled Pages in output order and its help text says to omit a page to remove it, so deleting pages 4 and 7 from a ten-page file means typing 1-3, 5-6, 8-10. That design makes the same box do three jobs at once, because the order you type is the order you get and a page listed twice is kept only once — so you can delete and reorder in a single pass, but you cannot duplicate a page. The output is a newly created document holding only the pages you kept, with its producer set by this tool, which means the original\x27s stored title, author, subject and keywords do not come across unless you type them into the metadata fields on the same page. Rotation, page numbers, a watermark and metadata are all applied in that same pass, so leave them alone if all you want is a deletion.',
    faqs: [
      {
        question: 'How do I actually delete a page?',
        answer:
          'By leaving it out of the list. When you choose a file the box is filled in with the full range, such as 1-12, and the Delete PDF Pages tool keeps exactly what that box names. To drop pages 4 and 7 from a twelve-page file, change it to 1-3, 5-6, 8-12. There is no separate field for pages to remove and no checkbox beside a page thumbnail; the list of survivors is the whole interface.',
      },
      {
        question: 'What can I type in the page box?',
        answer:
          'Single page numbers and ranges, separated by commas — 3, 1-2 is valid and produces pages 3, 1 and 2 in that order. A repeated page is kept once, at its first position, so 3, 1-2, 2, 5 gives 3, 1, 2, 5 as a test in this repository requires. A range that runs backwards is refused with a message telling you the right way round, as in "Range 5-3 runs backwards. Use 3-5 instead.", a page outside the file gives "Choose pages between 1 and 12.", and anything that is not a number or a range is quoted back as not a valid page or range. One range may cover at most 2,000 pages.',
      },
      {
        question: 'What does the finished PDF keep, and what does it lose?',
        answer:
          'It keeps the pages you listed, with their content and their size, copied into a brand-new document. What it does not keep is what lived outside those pages: the document\x27s own title, author, subject and keywords are not carried across, and the file is written with this tool named as its producer. The metadata fields on the same page let you set those four values yourself in the same run. If your file has bookmarks, a form or anything else document-wide, open the saved result and check it before you send it on.',
      },
      {
        question: 'Is the result checked before I download it?',
        answer:
          'Yes, and the check is not cosmetic. After the new PDF is written it is loaded again from the bytes that were produced, its page count is compared with the number of pages you asked for, and every page\x27s rotation is confirmed to be a multiple of ninety degrees. A mismatch stops the run with "The edited PDF failed its page-count check." or the matching rotation message rather than handing you a file. The page reports how long that reopening took alongside the result.',
      },
      {
        question: 'What will it refuse?',
        answer:
          'A file over 150 MB, with "This candidate limits a source PDF to 150 MB." A file that is not a PDF at all, with "This file could not be read as a supported PDF." A password-protected PDF, with "This PDF is encrypted. Remove its password locally, then try again." — the encryption is never guessed at or worked around. And an empty selection, with "Keep at least one page in the output.", because a PDF with no pages is not a document. Your original file is never modified; the result is a separate download.',
      },
    ],
  },

  // lib/tools/spreadsheet-workbench.ts (the 'csv-column-selector' operation
  // and the table, selectedHeaders, header, toCsv and csvCell helpers),
  // lib/tools/structured.ts (parseCsvRows, csvToRecords),
  // lib/tools/spreadsheet-workbench.test.ts and app/data/[tool]/page.tsx
  'spreadsheet-and-data-csv-column-selector': {
    directAnswer:
      'Paste a CSV into the data box, type the column names you want to keep as a comma-separated list, and the trimmed table rebuilds as you type. The order you type the names is the order the columns come out in, so this reorders as well as filters. Every row is kept — this tool changes which columns you have, never which rows.',
    leadParagraph:
      'Columns are chosen by header name, not by position, so the selection survives a file whose columns move. The names you type are trimmed and matched exactly against the headers in the first row, and an unrecognised name stops the run by name rather than being quietly skipped. The parser underneath is the strict one this site uses everywhere: each column needs a non-empty header, headers must be unique, and every row must carry exactly as many fields as there are headers. Values are carried through as text, and the output is re-quoted where it needs to be, so a field holding a comma, a double quote or a line break comes back correctly wrapped. Two things it cannot do: a column whose own name contains a comma cannot be named in the selection box, because that box is split on commas, and there is no way to select by position, by pattern or by everything-except.',
    faqs: [
      {
        question: 'Does it change the order of the columns?',
        answer:
          'Yes, and deliberately. The CSV Column Selector emits the columns in the order you typed them, not the order they appear in the file, so typing score,name gives you score first. That makes it a reordering tool as well as a filter. Rows are never reordered and never removed — every data row in the file comes out, with only the chosen columns on it.',
      },
      {
        question: 'Why was my column not found?',
        answer:
          'Because the name must match the header exactly once both sides are trimmed, and case matters. A missing or misspelt name gives "Unknown column: Score." quoting what you typed, an empty selection gives "Choose at least one column.", and naming the same column twice gives "Column selection contains a duplicate." A column whose header genuinely contains a comma cannot be selected at all, because the selection box splits on commas — rename that header in the source first.',
      },
      {
        question: 'How strict is the CSV parsing?',
        answer:
          'Strict, and it will tell you why it stopped. A blank cell anywhere in the header row gives "Every CSV column needs a header in the first row.", two identical headers give "CSV headers must be unique before conversion.", and a row with the wrong number of fields is named with both counts, as in "Row 4 has 3 columns; expected 4." An opening double quote that is never closed gives "CSV contains an unclosed quoted field." Nothing is padded or dropped to make a ragged file fit. A byte-order mark at the very start is removed, and blank lines at the end are ignored.',
      },
      {
        question:
          'Are quotes, commas and line breaks inside a field preserved?',
        answer:
          'Yes. A quoted field may hold commas and line breaks, and two double quotes inside it mean one literal double quote; on the way out, any value containing a comma, a double quote, a carriage return or a newline is wrapped in double quotes with its own quotes doubled. Values are never trimmed, converted or re-typed, so a postcode with a leading zero and a long account number come through with every character intact.',
      },
      {
        question: 'What are the limits, and what does the download contain?',
        answer:
          'The data box accepts up to 2,000,000 characters, with "Tabular input is limited to 2,000,000 characters." past that, and the parsed table is capped at 100,000 rows and 1,000 columns with "Tables are limited to 100,000 rows and 1,000 columns." The download holds exactly the CSV text you can see, but it is saved with a .txt extension rather than .csv, because this workbench has no file type declared for table results — rename it after saving if your spreadsheet program cares.',
      },
    ],
  },

  // lib/tools/text-workbench.ts (the 'word-counter' operation, its run case
  // and the words helper), lib/tools/text-workbench.test.ts and
  // components/text-workbench-tool.tsx, app/text/[tool]/page.tsx
  'text-and-writing-word-counter': {
    directAnswer:
      'Paste or type your text and the count updates on its own a quarter of a second after you stop. A word here is a run of Unicode letters or digits, optionally joined by apostrophes to further runs — so don\x27t is one word, well-known is two, and 3.14 is two. The result is the number and nothing else: characters, sentences, paragraphs and reading time are four separate tools on this site.',
    leadParagraph:
      'The rule is a single pattern rather than a split on spaces, and knowing it explains every answer this tool gives: one or more letters or digits from any script, then any number of groups of an apostrophe — straight or curly — followed by more letters or digits. Everything else is a boundary, so hyphens make well-known two words and state-of-the-art four, underscores make snake_case two, and a full stop or a comma inside a number makes 3.14 and 1,000 two words each. Emoji and punctuation match nothing and are not counted, and a trailing apostrophe is dropped, so dogs\x27 counts once as dogs. The pattern reads the text by Unicode code point rather than by storage unit, so letters outside the basic range are handled as single characters. What it has no answer for is a script written without spaces: a run of Chinese or Japanese characters counts as one word however long it is.',
    faqs: [
      {
        question: 'What counts as one word?',
        answer:
          'A run of Unicode letters or digits, plus any apostrophe-joined continuations. So don\x27t, o\x27clock and rock\x27n\x27roll are each one word, and the curly apostrophe works the same as the straight one. One café, two. counts as three, which a test in this repository pins. A trailing apostrophe is not part of the word: dogs\x27 counts once, as dogs.',
      },
      {
        question: 'How are hyphens, numbers and underscores handled?',
        answer:
          'All three are word boundaries, which is where this differs from a word processor. Well-known counts as two words, state-of-the-art as four, and snake_case as two. Numbers written with a decimal point or a thousands separator split as well, so 3.14 is two words and 1,000 is two. If your text is full of hyphenated compounds the figure here will run higher than the one your editor shows.',
      },
      {
        question: 'Does it work for Chinese, Japanese or Thai text?',
        answer:
          'Not meaningfully. The Word Counter matches unbroken runs of letters, and those scripts are written without spaces, so an entire sentence of Chinese or Japanese characters is counted as one word. Latin, Cyrillic, Greek, Devanagari and other space-separated scripts count correctly, and accented and non-Latin letters are treated as ordinary letters rather than boundaries.',
      },
      {
        question: 'Why does it only show a word count?',
        answer:
          'Because each measurement is its own tool here. The Word Counter prints the number of words; the Character Counter alongside it counts characters with and without spaces and does so by grapheme, so a family emoji counts as one; the Sentence Counter estimates sentences from terminal punctuation; the Paragraph Counter counts blocks separated by blank lines; and the Reading Time tool divides the word count by 225 words a minute. The Input figure in the panel below the result is a raw storage count and will disagree with the Character Counter on emoji.',
      },
      {
        question: 'What are the limits?',
        answer:
          'Text is capped at 2,000,000 characters, and going over gives "Text is limited to 2,000,000 characters in this candidate." An empty box gives "Enter some text first." — though the page holds that back until you have typed something, so it does not greet you with an error. The count re-runs by itself a quarter of a second after each change, and the copy and download buttons save the number as it stands.',
      },
    ],
  },

  // lib/tools/developer-advanced-workbench.ts (the 'json-path-tester'
  // operation, its notice and the resolveJsonPath and json helpers),
  // lib/tools/developer-advanced-workbench.test.ts and
  // app/developer/[tool]/page.tsx
  'developer-and-data-json-path-tester': {
    directAnswer:
      'Paste a JSON document, type a path starting with a dollar sign, and the value it points at is printed as formatted JSON. Three notations are understood and no others: a dot followed by a plain property name, square brackets round a number, and square brackets round a quoted property name. This is a bounded path resolver, not a query language — there are no wildcards, no filters and no recursive search.',
    leadParagraph:
      'The path is read left to right and each step must match one of the three accepted forms, so $.users[0].name and $.users[0]["display name"] both work, the second being the form a test in this repository fixes. A dot-property name has to look like an identifier — letters, digits, underscores and dollar signs, not starting with a digit — which is exactly why the quoted bracket form exists: any name with a space, a hyphen or a full stop in it goes inside quotes, single or double, with backslash escapes honoured. Anything the reader does not recognise stops immediately and quotes the offending text back at you. Resolution is then a simple walk: at each step the current value must be an object or an array that carries the key, and if it does not, the run stops naming the step rather than returning nothing. That means a missing key is an error here, not an empty result, which is the opposite of how a query language behaves.',
    faqs: [
      {
        question: 'Which path syntax does it accept?',
        answer:
          'Three forms. A dollar sign for the root; a dot followed by an identifier-shaped property name, as in $.user.name; square brackets round a whole number for an array position, as in $.users[0]; and square brackets round a quoted property name for anything the dot form cannot carry, as in $.users[0]["display name"] or $["first-name"]. Single and double quotes both work inside the brackets, with backslash escapes. A path that does not start with a dollar sign is refused with "Path must start with $."',
      },
      {
        question: 'Can I use wildcards, filters or a recursive search?',
        answer:
          'No. The JSON Path Tester\x27s own notice says it supports the dollar sign, dot properties, numeric indexes and quoted bracket properties, and that it is not a full JSONPath query language. A star, a double dot, a slice such as [1:3] and a filter expression are all unrecognised and stop the run with "Unsupported path syntax near:" followed by the first part of the text it could not read. One path resolves to one value, never to a list of matches.',
      },
      {
        question: 'What happens when the path does not exist?',
        answer:
          'The run stops and names the step it could not take, as in "Path does not exist at name." You do not get an empty array or a null. The same message appears when a step tries to go inside a value that is not an object or an array — indexing into a string, for example. A path longer than 1,000 steps is refused with "Path is limited to 1,000 segments.", and the path text itself is capped at 10,000 characters.',
      },
      {
        question: 'Why does a path I never put in my data still resolve?',
        answer:
          'Because the existence check reaches into the built-in properties that every JavaScript object and array carries, not just the keys in your document. So $.users.length returns the array\x27s length even though there is no length key in your JSON, and paths such as $.constructor or $.toString resolve too and print the word undefined, because the thing they found cannot be written as JSON. That is a real defect in the JSON Path Tester rather than something in your data: if you see undefined, or a number appearing from a key you never wrote, you have hit a built-in rather than your own value.',
      },
      {
        question:
          'What does the output look like, and what are the size limits?',
        answer:
          'The resolved value is printed as JSON with two-space indentation, so a string comes back in quotes, an object comes back formatted, and a number comes back bare. The JSON document box takes up to 1,000,000 characters and a document that will not parse is refused with the browser parser\x27s own message attached. The download button saves the resolved value as json-path-tester.json.',
      },
    ],
  },

  // lib/tools/web-workbench.ts (the 'robots-txt-tester' operation and its run
  // case: group building, agent matching, the longest-prefix sort and the
  // three result strings), lib/tools/web-workbench.test.ts and
  // app/web/[tool]/page.tsx
  'web-and-seo-robots-txt-tester': {
    directAnswer:
      'Paste the text of a robots.txt file, name the crawler you are asking about, type a URL path beginning with a slash, and the page tells you which single rule wins. Rules are matched as plain prefixes and the longest matching one decides, with an Allow beating a Disallow of the same length. It never fetches your live file — you paste the text, so what you test is what you pasted.',
    leadParagraph:
      'The file is read line by line: anything after a hash is dropped as a comment, blank lines are skipped, and each remaining line is split at its first colon. A User-agent line opens a group, consecutive User-agent lines join the same group, and Allow and Disallow lines attach to whichever group is open — so rules written before any User-agent line are ignored entirely, and directives the tool does not handle, such as Sitemap and Crawl-delay, are read and discarded. A group applies when one of its agents is a star or when the name you typed contains that agent as a substring, which is how a request for Googlebot-Image picks up a group written for googlebot. Matching a path is a plain prefix test, then the candidates are sorted by rule length with Allow winning ties. One important deviation follows from all this and is covered below: every matching group is pooled rather than the most specific one being chosen alone.',
    faqs: [
      {
        question: 'How does it decide which rule wins?',
        answer:
          'Every rule whose path is a prefix of your path is a candidate, and the longest one wins; where two are the same length the Allow wins. So against Disallow: /private and Allow: /private/public, the path /private/public/page comes back as "Allowed by Allow: /private/public", which a test in this repository requires. When nothing matches you get "Allowed — no matching Disallow rule." A Disallow line with nothing after the colon is ignored rather than treated as a rule, which is the conventional reading of an empty value.',
      },
      {
        question: 'Does it handle a star or a dollar sign in a rule?',
        answer:
          'No, and the tool\x27s own description says so: wildcards are not interpreted. A rule such as Disallow: /*.pdf$ is treated as the literal text /*.pdf$ and therefore matches nothing, so a path that a real crawler would block comes back here as allowed. Any file that leans on pattern rules will be read wrongly by this page, and you should check it with the crawler\x27s own tooling instead.',
      },
      {
        question: 'Does a rule for one named crawler override the star group?',
        answer:
          'It should, and here it does not. The Robots.txt Tester pools the rules of every group that matches the agent you typed, including the star group, instead of using only the most specific matching group. So a file with Disallow: /admin under User-agent: star and Allow: / under User-agent: Googlebot reports /admin/page as "Blocked by Disallow: /admin" for Googlebot, because the longer star-group rule wins the pooled comparison. This is a real defect. Where a file gives one crawler different treatment from the rest, delete the groups that do not apply before you paste it in, and confirm the answer with the crawler\x27s own tester.',
      },
      {
        question: 'How is the crawler name matched?',
        answer:
          'Case is ignored, and a group applies when the name you typed contains the group\x27s agent as a substring — so a group for googlebot also answers for Googlebot-News, which is roughly what real crawlers do with their own family names. The looseness cuts both ways: a group written for the agent bot would match any name ending in bot. A User-agent line with nothing after the colon produces an empty agent that matches every name you could type, which is another rough edge worth knowing about.',
      },
      {
        question: 'Does it check my live site?',
        answer:
          'No. There is no address field on this page and nothing is requested from your domain — you paste the robots.txt text and the Robots.txt Tester works only on that. This means you can test a file before you publish it, and it also means a stale paste gives a stale answer. The path must begin with a slash, or you get "Path must start with /.", so strip the scheme and host yourself; comparison is case-sensitive and nothing is percent-decoded, so /Private and /private are different paths here.',
      },
    ],
  },

  // lib/tools/qr-barcode-workbench.ts (the 'vcard-qr-code' operation, its run
  // case and notice, and the required, escapePayload, qrStyle and renderQr
  // helpers), components/schema-workbench-tool.tsx and app/qr/[tool]/page.tsx
  'qr-and-barcode-vcard-qr-code': {
    directAnswer:
      'Fill in a full name, a phone number, an email address and optionally an organisation, and the page builds a vCard 3.0 payload and draws it as an SVG QR symbol in this tab. Four vCard properties are written and no others: FN for the name, TEL, EMAIL and ORG. Scan the saved symbol with the phone you actually intend people to use before you print it.',
    leadParagraph:
      'The payload is a plain vCard 3.0 card, opened with BEGIN:VCARD and VERSION:3.0 and closed with END:VCARD, with carriage-return line endings between the properties. Only the email address is checked for shape — it must contain an at sign and a dot in the usual arrangement — while the phone field is accepted as typed, which is a difference from the separate Phone QR Code tool on this site, where a number pattern is enforced. Values are escaped before they go in: a backslash, semicolon, comma, colon or double quote is preceded by a backslash and a line break becomes the two characters backslash and n. That escaping is broader than the format calls for, so an organisation such as Example: Studio is written as Example\\: Studio and may arrive in a contacts app with the backslash showing. The symbol is drawn at your chosen error-correction level with a four-module quiet zone, between 160 and 1,200 pixels wide, and saves as an SVG named after the tool.',
    faqs: [
      {
        question: 'Which vCard version and which fields does it write?',
        answer:
          'Version 3.0, with four properties: FN for the full name, TEL for the phone, EMAIL for the address and ORG for the organisation. That is the whole card. There is no structured N property, no postal address, no website, no job title, no note and no photo, and there is no way to add a second number or a second address. Some contacts apps prefer the structured name property, so check how the scanned card files itself before you commit to a print run.',
      },
      {
        question: 'How much can the symbol hold?',
        answer:
          'The name is capped at 200 characters, the phone at 50 and the email at 254, with each limit named if you pass it, as in "Full name must be at most 200 characters." The finished payload as a whole is capped at 8,000 characters with "Encoded content must contain 1–8,000 characters." — but the QR format itself runs out long before that, and when it does the run stops with "The content does not fit the selected QR settings." followed by the encoder\x27s own reason. A longer organisation name or a higher error-correction level both bring that point closer.',
      },
      {
        question: 'Does it check the phone number?',
        answer:
          'No. The vCard QR Code tool takes the phone exactly as you type it, up to 50 characters, and escapes it — it applies no pattern, no country rule and no length rule, unlike the Phone QR Code and SMS QR Code tools alongside it, which require a recognisable number. The email is the only field with a shape check, refused with "Enter a valid-looking email address." if it does not have an at sign and a dot in the usual places. Nothing here is verified against a directory: the tool\x27s own notice says it creates a standards-shaped payload, not a live destination or ownership check.',
      },
      {
        question: 'What do the error-correction and size settings change?',
        answer:
          'Error correction chooses how much of a damaged or partly obscured symbol can still be read: L gives the most capacity, M is the default, and Q and H recover more at the cost of a denser symbol for the same content. SVG width sets the drawing size between 160 and 1,200 pixels, defaulting to 360, with "SVG width must be between 160 and 1200." outside that. The quiet zone is fixed at four modules. Because the output is SVG, printing it larger costs no sharpness.',
      },
      {
        question: 'Is a contact card in a QR code private?',
        answer:
          'Not in the sense people sometimes assume. Everything in the card is written into the symbol as readable text, so anyone who scans it, photographs it or reads the SVG file in a text editor sees the name, number, email and organisation. The encoding happens in this tab and the details are not sent anywhere by this page, but a printed symbol is a published business card. Leave out anything you would not put on paper.',
      },
    ],
  },

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
/**
 * The explainer for a tool by its catalogue id, for pages that know the id
 * rather than the URL — the dedicated `app/<category>/<tool>/page.tsx` pages,
 * which pass `currentToolId` and never build a routed path.
 *
 * Those were the thinnest pages on the site when measured on 2026-09-21:
 * `/developer/base64-encoder` and `/developer/base64-decoder` carried 35
 * visible words, `/developer/uuid-generator` 37, `/math/percentage-calculator`
 * 45 — and each of them is a tool whose guide survived consolidation, so a
 * hand-written explainer for it already existed.
 */
export function getToolExplainerById(toolId: string): GuideDetail | undefined {
  // Catalogue ids are namespaced — `developer-and-data.uuid-generator` — while
  // these pages pass the bare tool id they use for `currentToolId`. Match the
  // full id first, then the segment after the dot.
  //
  // An ambiguous suffix returns nothing rather than guessing. Two categories
  // can legitimately own a tool of the same name, and showing one tool's
  // limits on another tool's page would be worse than showing none: the whole
  // value of this text is that it is true of the thing in front of you.
  // Three keys, because none alone covers these pages. The catalogue id is
  // namespaced (`developer-and-data.unix-timestamp-converter`), the page
  // passes a short id (`unix-timestamp`), and the two do not always agree —
  // the catalogue calls it a converter and the route does not. The last
  // segment of `destinationUrl` is what the route actually is, so it matches
  // when the names have drifted.
  const matches = LIVE_TOOL_CATALOG.filter(
    (tool) =>
      tool.id === toolId ||
      tool.id.split('.').pop() === toolId ||
      tool.destinationUrl.split('?')[0]!.split('/').pop() === toolId,
  );
  if (matches.length !== 1) return undefined;
  return GUIDE_DETAILS[matches[0]!.slug];
}

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
  /*
    The fullest of these that still fits a result snippet, the site's own
    twelve-character title suffix counted. A fixed suffix put
    `Date Difference Calculator` 13 characters past what Google shows, so the
    guide's subject was cut off by the promise attached to it.
  */
  const metaTitle =
    [
      `${tool.name} — free, in your browser, no upload`,
      `${tool.name} — free, no upload, no sign-up`,
      `${tool.name} — free, no upload`,
    ].find((title) => title.length + TITLE_SUFFIX_LENGTH <= 60) ?? tool.name;
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
