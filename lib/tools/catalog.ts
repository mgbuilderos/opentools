import type { ToolManifest } from './types';
import type { NavGroupId } from './navigation';
import { CREATOR_OPERATIONS } from './creator-workbench';
import { DATE_OPERATIONS } from './date-workbench';
import { ADVANCED_DEVELOPER_OPERATIONS } from './developer-advanced-workbench';
import { DEVELOPER_DATA_OPERATIONS } from './developer-data-workbench';
import { DOCUMENT_OPERATIONS } from './document-workbench';
import { FILE_WORKBENCH_OPERATIONS } from './file-workbench';
import { FINANCE_OPERATIONS } from './finance-business-workbench';
import { LIFE_ADMIN_OPERATIONS } from './life-admin-workbench';
import { MATH_OPERATIONS } from './math-workbench';
import { PRODUCTIVITY_OPERATIONS } from './productivity-workbench';
import { QR_BARCODE_OPERATIONS } from './qr-barcode-workbench';
import { SCIENCE_OPERATIONS } from './science-education-workbench';
import { SPREADSHEET_OPERATIONS } from './spreadsheet-workbench';
import { SUBTITLE_OPERATIONS } from './subtitle-workbench';
import { TEXT_OPERATIONS } from './text-workbench';
import { WEB_OPERATIONS } from './web-workbench';
import { WRITING_OPERATIONS } from './writing-workbench';

function searchEntries(
  href: string,
  operations: readonly { id: string; name: string; description: string }[],
) {
  return operations.map((operation) => ({
    id: operation.id,
    name: operation.name,
    description: operation.description,
    href: `${href}?tool=${operation.id}`,
  }));
}

export const MP3_TOOLKIT_OPERATIONS = [
  {
    id: 'mp3-cut',
    name: 'MP3 cutter',
    description:
      'Trim a clip out of an MP3 on frame boundaries, with no re-encoding.',
  },
  {
    id: 'mp3-join',
    name: 'MP3 joiner',
    description:
      'Join MP3s that share a sample rate and channel count, end to end.',
  },
  {
    id: 'mp3-tags',
    name: 'MP3 tag editor',
    description: 'Read, replace or remove ID3 tags without touching the audio.',
  },
  {
    id: 'mp3-inspect',
    name: 'MP3 inspector',
    description:
      'Measure bitrate, sample rate, frame count and tags in an MP3.',
  },
] as const;

export const PDF_PAGE_OPERATIONS = [
  {
    id: 'rotate-pdf',
    name: 'Rotate PDF',
    description: 'Rotate every PDF page by a quarter turn.',
  },
  {
    id: 'reorder-pdf-pages',
    name: 'Reorder PDF pages',
    description: 'Save PDF pages in a new requested order.',
  },
  {
    id: 'delete-pdf-pages',
    name: 'Delete PDF pages',
    description: 'Omit selected pages from a new local PDF.',
  },
  {
    id: 'pdf-page-numbers',
    name: 'PDF page numbers',
    description: 'Add centered page numbers to every output page.',
  },
  {
    id: 'pdf-watermark',
    name: 'PDF watermark',
    description: 'Place a text watermark across every PDF page.',
  },
  {
    id: 'pdf-metadata-editor',
    name: 'PDF metadata editor',
    description: 'Set PDF title, author, subject, and keywords.',
  },
] as const;

export const IMAGE_EDITOR_OPERATIONS = [
  {
    id: 'image-cropper',
    name: 'Image cropper',
    description: 'Crop an image to exact pixel coordinates.',
  },
  {
    id: 'image-flipper',
    name: 'Image flipper',
    description: 'Flip an image horizontally in the browser.',
  },
  {
    id: 'image-rotator',
    name: 'Rotate image',
    description: 'Rotate an image in 90 degree steps.',
  },
  {
    id: 'image-brightness',
    name: 'Image brightness',
    description: 'Adjust image brightness before saving.',
  },
  {
    id: 'image-contrast',
    name: 'Image contrast',
    description: 'Adjust image contrast before saving.',
  },
  {
    id: 'image-grayscale',
    name: 'Image grayscale',
    description: 'Convert image colors toward grayscale.',
  },
  {
    id: 'solid-background-remover',
    name: 'Solid background remover',
    description: 'Make a selected plain-color image background transparent.',
  },
] as const;

export const publicTools: ToolManifest[] = [
  {
    id: 'text-case-converter',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'Text case converter',
    shortDescription: 'Change text to sentence, title, upper, or lower case.',
    category: 'Text',
    aliases: [
      'uppercase converter',
      'lowercase converter',
      'title case',
      'sentence case',
      'capitalize text',
    ],
    jobs: ['change text case', 'fix capitalization', 'make text uppercase'],
    href: '/text/case-converter',
    execution: {
      mode: 'local-js',
      capabilities: ['text.transform.case'],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'text-workbench',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'Text workbench',
    shortDescription:
      'Count, clean, transform, inspect, and translate text locally.',
    category: 'Text',
    aliases: TEXT_OPERATIONS.map((operation) => operation.name),
    jobs: TEXT_OPERATIONS.map((operation) => operation.description),
    searchEntries: searchEntries('/text/workbench', TEXT_OPERATIONS),
    href: '/text/workbench',
    execution: {
      mode: 'local-js',
      capabilities: ['text.workbench.transform'],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'writing-workbench',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'Writing workbench',
    shortDescription:
      'Edit, convert, compare, summarize, structure, and export writing.',
    category: 'Text',
    aliases: WRITING_OPERATIONS.map((operation) => operation.name),
    jobs: WRITING_OPERATIONS.map((operation) => operation.description),
    searchEntries: searchEntries('/text/writing', WRITING_OPERATIONS),
    href: '/text/writing',
    execution: {
      mode: 'local-js',
      capabilities: [
        'text.markup.convert',
        'text.diff.merge',
        'text.extractive.summarize',
      ],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'json-format',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'JSON formatter',
    shortDescription:
      'Validate, format, minify, or sort JSON without sending it away.',
    category: 'Data',
    aliases: [
      'json beautifier',
      'json validator',
      'pretty print json',
      'minify json',
    ],
    jobs: [
      'format json',
      'validate json',
      'sort json keys',
      'make json readable',
    ],
    href: '/data/json',
    execution: {
      mode: 'local-js',
      capabilities: ['data.json.transform'],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'csv-to-json',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'CSV to JSON',
    shortDescription: 'Turn quoted CSV rows into structured JSON in this tab.',
    category: 'Data',
    aliases: ['convert csv', 'csv json converter', 'spreadsheet to json'],
    jobs: ['convert csv to json', 'inspect csv', 'make json from csv'],
    href: '/data/csv-to-json',
    execution: {
      mode: 'local-js',
      capabilities: ['data.csv.parse', 'data.json.serialize'],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'spreadsheet-workbench',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'CSV & spreadsheet workbench',
    shortDescription:
      'Clean, reshape, compare, inspect, and convert tabular data.',
    category: 'Data',
    aliases: SPREADSHEET_OPERATIONS.map((operation) => operation.name),
    jobs: SPREADSHEET_OPERATIONS.map((operation) => operation.description),
    searchEntries: searchEntries('/data/workbench', SPREADSHEET_OPERATIONS),
    href: '/data/workbench',
    execution: {
      mode: 'local-js',
      capabilities: ['data.table.transform', 'data.table.profile'],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'pdf-merge',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'Merge PDF',
    shortDescription: 'Combine PDF files in the order you choose.',
    category: 'PDF',
    aliases: [
      'combine pdf',
      'join pdf files',
      'pdf merger',
      'put pdfs together',
    ],
    jobs: ['merge pdf files', 'combine documents', 'join two pdfs'],
    href: '/pdf/merge',
    execution: {
      mode: 'local-js',
      capabilities: ['pdf.pagegraph.merge'],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'pdf-compress',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'Compress PDF',
    shortDescription:
      'Rewrite a PDF more compactly and re-encode the photos inside it.',
    category: 'PDF',
    aliases: [
      'compress pdf',
      'reduce pdf size',
      'shrink pdf',
      'make pdf smaller',
      'optimize pdf',
    ],
    jobs: [
      'compress a pdf without uploading it',
      'reduce a pdf below an email attachment limit',
      'strip document metadata from a pdf',
    ],
    href: '/pdf/compress',
    execution: {
      mode: 'local-js',
      capabilities: ['pdf.stream.rewrite', 'pdf.image.recompress'],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'pdf-to-word',
    version: '0.1.0-canary',
    status: 'canary',
    // Named for the job people search for, while the page itself is explicit
    // that this recovers text and does not rebuild the PDF's layout.
    name: 'PDF to Word',
    shortDescription:
      'Pull the text out of a PDF into an editable .docx. Text only — layout, tables and images are not carried across.',
    category: 'PDF',
    aliases: [
      'pdf to word',
      'pdf to docx',
      'convert pdf to word',
      'extract text from pdf',
      'pdf text extractor',
      'pdf to editable document',
    ],
    jobs: [
      'get the text out of a pdf without uploading it',
      'turn a pdf contract into an editable document',
      'copy text from a pdf that blocks selection',
    ],
    href: '/pdf/to-word',
    execution: {
      mode: 'local-js',
      capabilities: ['pdf.text.extract', 'docx.write'],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'pdf-ocr',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'OCR PDF',
    shortDescription:
      'Add an invisible searchable English text layer to a scanned PDF while preserving its visible pages.',
    category: 'PDF',
    aliases: [
      'ocr pdf',
      'searchable pdf',
      'scan to searchable pdf',
      'extract text from scanned pdf',
      'pdf optical character recognition',
    ],
    jobs: [
      'make a scanned pdf searchable',
      'copy text from a photographed document',
      'download text from an image-only pdf',
    ],
    href: '/pdf/ocr',
    execution: {
      mode: 'local-wasm',
      capabilities: [
        'pdf.page.render',
        'ocr.english.recognize',
        'pdf.text.layer',
      ],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'pdf-to-excel',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'PDF to Excel',
    shortDescription:
      'Convert bank statements and PDF tables into clean Excel (.xlsx) and CSV with column detection, reconciliation and zero server uploads.',
    category: 'PDF',
    aliases: [
      'pdf to excel',
      'pdf to xlsx',
      'bank statement converter',
      'bank statement to excel',
      'bank statement to csv',
      'pdf table extractor',
      'convert pdf to spreadsheet',
    ],
    jobs: [
      'convert pdf bank statement to excel without uploading client data',
      'extract table from pdf to csv',
      'convert bank statement to spreadsheet',
      'reconcile running balance on pdf statement',
    ],
    href: '/pdf/to-excel',
    execution: {
      mode: 'local-js',
      capabilities: [
        'pdf.table.extract',
        'spreadsheet.xlsx.write',
        'spreadsheet.csv.transform',
      ],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'pdf-sign',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'Sign and fill PDF',
    shortDescription: 'Complete a PDF form and draw a signature onto the page.',
    category: 'PDF',
    aliases: [
      'sign pdf',
      'fill pdf form',
      'pdf signature',
      'esign pdf',
      'complete pdf form',
    ],
    jobs: [
      'sign a pdf without uploading it',
      'fill in a pdf form and make it final',
      'add a handwritten signature to a document',
    ],
    href: '/pdf/sign',
    execution: {
      mode: 'local-js',
      capabilities: ['pdf.acroform.fill', 'pdf.annotation.draw'],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'pdf-extract',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'Extract PDF pages',
    shortDescription: 'Choose pages or ranges and save them as a new PDF.',
    category: 'PDF',
    aliases: [
      'split pdf',
      'select pdf pages',
      'save pdf pages',
      'pdf page extractor',
    ],
    jobs: ['extract pages from pdf', 'split a pdf', 'keep selected pdf pages'],
    href: '/pdf/extract-pages',
    execution: {
      mode: 'local-js',
      capabilities: ['pdf.pagegraph.extract'],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'images-to-pdf',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'Images to PDF',
    shortDescription:
      'Arrange JPEG and PNG images into one locally generated PDF.',
    category: 'PDF',
    aliases: [
      'jpg to pdf',
      'jpeg to pdf',
      'png to pdf',
      'photo to pdf',
      'image pdf converter',
    ],
    jobs: [
      'convert images to pdf',
      'combine photos into a pdf',
      'make a pdf from jpg files',
    ],
    href: '/pdf/images-to-pdf',
    execution: {
      mode: 'local-js',
      capabilities: ['pdf.image.embed', 'pdf.document.create'],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'pdf-page-tools',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'PDF page tools',
    shortDescription:
      'Reorder, remove, rotate, number, watermark, and label PDF pages.',
    category: 'PDF',
    aliases: PDF_PAGE_OPERATIONS.map((operation) => operation.name),
    jobs: PDF_PAGE_OPERATIONS.map((operation) => operation.description),
    searchEntries: searchEntries('/pdf/page-tools', PDF_PAGE_OPERATIONS),
    href: '/pdf/page-tools',
    execution: {
      mode: 'local-js',
      capabilities: ['pdf.pagegraph.transform', 'pdf.annotation.draw'],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'mp3-toolkit',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'MP3 toolkit',
    shortDescription:
      'Cut, join, tag and inspect MP3s by copying frames — no re-encoding.',
    category: 'Audio',
    aliases: [
      'mp3 cutter',
      'mp3 trimmer',
      'audio cutter',
      'mp3 joiner',
      'mp3 merger',
      'id3 tag editor',
      'ringtone maker',
    ],
    jobs: [
      'cut an mp3',
      'trim a song',
      'make a ringtone',
      'join mp3 files',
      'merge audio files',
      'edit mp3 tags',
      'remove mp3 tags',
      'check mp3 bitrate',
    ],
    searchEntries: searchEntries('/audio/mp3-toolkit', MP3_TOOLKIT_OPERATIONS),
    href: '/audio/mp3-toolkit',
    execution: {
      mode: 'local-js',
      capabilities: [
        'audio.mpeg.parse',
        'audio.mpeg.frame-copy',
        'audio.id3.read-write',
      ],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'audio-convert',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'Audio to WAV converter',
    shortDescription:
      'Convert M4A, FLAC, OGG, AIFF or MP3 to WAV, with trimming, fades and levelling.',
    category: 'Audio',
    aliases: [
      'audio converter',
      'm4a to wav',
      'flac to wav',
      'ogg to wav',
      'aiff to wav',
      'mp3 to wav',
      'convert audio to wav',
      'audio file converter',
    ],
    jobs: [
      'convert m4a to wav',
      'convert flac to wav',
      'convert a voice memo to wav',
      'turn audio into wav',
      'make an audio file mono',
      'change the sample rate of audio',
      'normalise the volume of a recording',
      'fade audio in and out',
    ],
    href: '/audio/convert',
    execution: {
      mode: 'local-js',
      capabilities: [
        'audio.container.probe',
        'audio.decode.webaudio',
        'audio.wav.write',
      ],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'video-trim',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'Video trimmer',
    shortDescription:
      'Cut, mute or extract the audio from an MP4 or MOV without re-encoding it.',
    category: 'Video',
    aliases: [
      'video trimmer',
      'video cutter',
      'trim mp4',
      'cut video online',
      'mute video',
      'remove audio from video',
      'extract audio from video',
      'video to mp3',
    ],
    jobs: [
      'trim a video',
      'cut the start off a video',
      'mute a video',
      'remove sound from a video',
      'extract the audio from a video',
      'shorten a clip for social media',
    ],
    href: '/video/trim',
    execution: {
      mode: 'local-js',
      capabilities: ['video.mp4.demux', 'video.mp4.mux', 'video.sample.copy'],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'excel-converter',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'Excel converter',
    shortDescription:
      'Turn an .xlsx into a CSV, or a CSV into a real Excel file, in this tab.',
    category: 'Data',
    aliases: [
      'xlsx to csv',
      'excel to csv',
      'csv to excel',
      'csv to xlsx',
      'open xlsx online',
      'excel viewer',
      'spreadsheet converter',
      'convert excel file',
    ],
    jobs: [
      'convert xlsx to csv',
      'convert excel to csv',
      'turn a csv into an excel file',
      'open a spreadsheet without excel',
      'read an xlsx file',
      'export one sheet from a workbook',
    ],
    href: '/data/excel',
    execution: {
      mode: 'local-js',
      capabilities: [
        'spreadsheet.xlsx.read',
        'spreadsheet.xlsx.write',
        'spreadsheet.csv.transform',
      ],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'pdf-bates',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'Bates numbering for PDFs',
    shortDescription:
      'Stamp sequential exhibit numbers across a bundle of PDFs, continuing the count from one file to the next.',
    category: 'PDF',
    aliases: [
      'bates numbering',
      'bates stamp',
      'number legal exhibits',
      'exhibit stamping',
      'stamp pdf pages',
      'legal document numbering',
    ],
    jobs: [
      'number a bundle of exhibits for filing',
      'stamp bates numbers on a pdf',
      'continue a bates sequence across several files',
      'add a prefix and page number to every page',
    ],
    href: '/pdf/bates',
    execution: {
      mode: 'local-js',
      capabilities: ['pdf.page.stamp', 'pdf.sequence.number'],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'pdf-redact',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'Redact & Black Out PDF',
    shortDescription:
      'Permanently black out text, rectangles, or sensitive PII. Rasterises redacted pages and purges metadata and annotations.',
    category: 'PDF',
    aliases: [
      'redact pdf',
      'black out pdf',
      'remove text from pdf',
      'black out text in pdf',
      'redact sensitive pdf text',
      'pdf pii removal',
    ],
    jobs: [
      'black out confidential text in a pdf',
      'redact sensitive pii like emails or card numbers',
      'draw black redaction boxes on a pdf',
      'permanently remove private text and purge metadata',
    ],
    href: '/pdf/redact',
    execution: {
      mode: 'local-js',
      capabilities: ['pdf.page.redact', 'pdf.metadata.purge'],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'pdf-metadata',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'PDF metadata viewer and remover',
    shortDescription:
      'See the author, the authoring program, the dates and the XMP packet held inside a PDF, then remove all of them.',
    category: 'PDF',
    aliases: [
      'pdf metadata',
      'remove pdf metadata',
      'pdf properties',
      'remove author from pdf',
      'strip pdf metadata',
      'pdf xmp',
      'clear pdf document properties',
    ],
    jobs: [
      'see who wrote a pdf',
      'remove my name from a pdf before sending it',
      'check what a pdf reveals about me',
      'clear the dates and author from a pdf',
    ],
    href: '/pdf/metadata',
    execution: {
      mode: 'local-js',
      capabilities: [
        'pdf.metadata.read',
        'pdf.metadata.strip',
        'pdf.xmp.strip',
      ],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'docx-metadata',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'Word document metadata viewer and stripper',
    shortDescription:
      'See the author, company, editing time, tracked changes and deleted text held inside a .docx, then remove them.',
    category: 'Document',
    aliases: [
      'docx metadata',
      'word document properties',
      'remove author from word document',
      'strip docx metadata',
      'find tracked changes',
      'word document hidden text',
    ],
    jobs: [
      'see who wrote a word document',
      'remove author details before sending a document',
      'find tracked changes and comments in a docx',
      'check a document for deleted text still inside it',
    ],
    href: '/documents/metadata',
    execution: {
      mode: 'local-js',
      capabilities: [
        'docx.metadata.read',
        'docx.metadata.strip',
        'docx.revisions.read',
      ],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'file-to-html',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'File to HTML converter',
    shortDescription:
      'Turn images into email-ready HTML with the images packaged alongside it, or into one standalone web page.',
    category: 'Web',
    aliases: [
      'image to html',
      'jpg to html',
      'png to html',
      'email html generator',
      'html email template',
      'psd slice to html',
      'convert image to email',
    ],
    jobs: [
      'turn a designed banner into an email i can send',
      'build an html email from images',
      'make a standalone web page from an image',
      'package images and html for a campaign',
    ],
    href: '/web/file-to-html',
    execution: {
      mode: 'local-js',
      capabilities: ['html.email.generate', 'html.page.generate', 'zip.write'],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'svg-optimizer',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'SVG optimizer and PNG converter',
    shortDescription:
      'Strip editor leftovers and excess precision from an SVG, then export it as a PNG or WebP at up to 4x.',
    category: 'Image',
    aliases: [
      'svg optimizer',
      'minify svg',
      'compress svg',
      'svg to png',
      'svg to webp',
      'clean up svg',
      'export svg at 2x',
    ],
    jobs: [
      'make an svg smaller before shipping it',
      'remove illustrator and inkscape leftovers from an svg',
      'export an icon as a png at 2x',
      'convert an svg to webp',
    ],
    href: '/image/svg',
    execution: {
      mode: 'local-js',
      capabilities: ['svg.optimize', 'svg.sanitize', 'svg.rasterize'],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'color-converter',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'Colour converter and palette extractor',
    shortDescription:
      'Convert a colour between HEX, RGB, HSL and CMYK, and pull the dominant palette out of an image.',
    category: 'Image',
    aliases: [
      'hex to rgb',
      'rgb to hex',
      'hex to cmyk',
      'hsl converter',
      'colour picker from image',
      'extract palette from image',
      'dominant colours',
    ],
    jobs: [
      'convert a brand hex to cmyk for print',
      'get the rgb value of a hex colour',
      'pull the palette out of a photo',
      'find the dominant colours in an image',
    ],
    href: '/image/colour',
    execution: {
      mode: 'local-js',
      capabilities: ['colour.convert', 'image.palette.extract'],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'list-hygiene',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'Contact list hygiene and deduplicator',
    shortDescription:
      'De-duplicate, merge, split and compare contact lists, and tidy names, emails and phone numbers.',
    category: 'Data',
    aliases: [
      'remove duplicate emails',
      'dedupe csv',
      'merge mailing lists',
      'split a csv',
      'compare two lists',
      'clean subscriber list',
      'deduplicate contacts',
    ],
    jobs: [
      'remove duplicate subscribers from a list',
      'merge two mailing lists',
      'split a big list into smaller files',
      'find which contacts are in both lists',
      'tidy names and phone numbers in a csv',
    ],
    href: '/data/lists',
    execution: {
      mode: 'local-js',
      capabilities: ['list.dedupe', 'list.merge', 'list.split', 'list.compare'],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'photo-metadata',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'Photo metadata viewer and stripper',
    shortDescription:
      'See the camera, date and GPS location hidden in a photo, then remove them.',
    category: 'Image',
    aliases: [
      'exif viewer',
      'remove exif data',
      'strip photo metadata',
      'check photo location',
      'remove gps from photo',
      'exif remover',
      'photo metadata viewer',
      'clean photo before sharing',
    ],
    jobs: [
      'see what a photo reveals about me',
      'remove gps location from a photo',
      'strip exif data before sharing',
      'check where a photo was taken',
      'find a camera serial number in a photo',
      'clean client photos before publishing',
    ],
    href: '/image/metadata',
    execution: {
      mode: 'local-js',
      capabilities: [
        'image.exif.read',
        'image.metadata.strip',
        'image.container.rewrite',
      ],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'image-optimize',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'Optimize image',
    shortDescription: 'Resize, compress, and convert a static image locally.',
    category: 'Image',
    aliases: [
      'image compressor',
      'resize image',
      'convert image',
      'webp converter',
    ],
    jobs: [
      'compress image',
      'make image smaller',
      'resize photo',
      'convert png to webp',
    ],
    href: '/image/optimize',
    execution: {
      mode: 'local-js',
      capabilities: ['image.raster.decode', 'image.raster.encode'],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'image-to-text',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'Image to text',
    shortDescription:
      'Read selectable English text from screenshots, photos and scanned images.',
    category: 'Image',
    aliases: [
      'image to text',
      'photo to text',
      'screenshot text extractor',
      'picture ocr',
      'optical character recognition',
    ],
    jobs: [
      'copy text from a screenshot',
      'read text from a photographed page',
      'extract text from several scanned images',
    ],
    href: '/image/to-text',
    execution: {
      mode: 'local-wasm',
      capabilities: ['image.raster.decode', 'ocr.english.recognize'],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'image-exact-size',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'Resize image to exact KB',
    shortDescription:
      'Fit an image under a KB limit at exact pixels with a real DPI value.',
    category: 'Image',
    aliases: [
      'resize image to kb',
      'reduce photo size in kb',
      'image size reducer',
      'compress image to exact size',
      'photo and signature resizer',
      'change image dpi',
    ],
    jobs: [
      'make a photo under 50 kb',
      'resize a signature for an online form',
      'set exact pixels and dpi for a portal upload',
    ],
    href: '/image/exact-size',
    execution: {
      mode: 'local-js',
      capabilities: [
        'image.raster.decode',
        'image.raster.encode',
        'image.metadata.density',
      ],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'image-editor',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'Image editor',
    shortDescription: 'Crop, rotate, flip, and adjust a static image locally.',
    category: 'Image',
    aliases: IMAGE_EDITOR_OPERATIONS.map((operation) => operation.name),
    jobs: IMAGE_EDITOR_OPERATIONS.map((operation) => operation.description),
    searchEntries: IMAGE_EDITOR_OPERATIONS.map((operation) => ({
      ...operation,
      href:
        operation.id === 'solid-background-remover'
          ? '/image/background-remover?tool=solid-background-remover'
          : `/image/editor?tool=${operation.id}`,
    })),
    href: '/image/editor',
    execution: {
      mode: 'local-js',
      capabilities: ['image.raster.crop', 'image.raster.transform'],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'base64-encode',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'Base64 encoder',
    shortDescription: 'Encode Unicode text as standard Base64 in this tab.',
    category: 'Developer',
    aliases: ['encode base64', 'text to base64', 'base 64 encoder'],
    jobs: ['convert text to base64', 'encode utf-8 text'],
    href: '/developer/base64-encoder',
    execution: {
      mode: 'local-js',
      capabilities: ['text.base64.encode'],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'base64-decode',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'Base64 decoder',
    shortDescription: 'Decode standard Base64 into validated UTF-8 text.',
    category: 'Developer',
    aliases: ['decode base64', 'base64 to text', 'base 64 decoder'],
    jobs: ['convert base64 to text', 'decode utf-8 base64'],
    href: '/developer/base64-decoder',
    execution: {
      mode: 'local-js',
      capabilities: ['text.base64.decode'],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'uuid-generator',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'UUID generator',
    shortDescription: 'Generate cryptographically random UUID v4 values.',
    category: 'Developer',
    aliases: ['guid generator', 'random uuid', 'uuid v4'],
    jobs: ['generate uuid', 'make random identifiers'],
    href: '/developer/uuid-generator',
    execution: {
      mode: 'local-js',
      capabilities: ['crypto.uuid.v4'],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'unix-timestamp',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'Unix timestamp converter',
    shortDescription: 'Convert Unix seconds, milliseconds, and ISO dates.',
    category: 'Developer',
    aliases: ['epoch converter', 'unix time', 'timestamp to date'],
    jobs: ['convert unix timestamp', 'convert date to epoch'],
    href: '/developer/unix-timestamp',
    execution: {
      mode: 'local-js',
      capabilities: ['date.timestamp.convert'],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'file-hash',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'File hash calculator',
    shortDescription: 'Calculate SHA-256, SHA-384, or SHA-512 locally.',
    category: 'File',
    aliases: ['sha256 file', 'checksum calculator', 'file fingerprint'],
    jobs: ['calculate file hash', 'verify file checksum'],
    href: '/file/hash-calculator',
    execution: {
      mode: 'local-js',
      capabilities: ['crypto.digest.file'],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'archive-toolkit',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'ZIP opener and packer',
    shortDescription:
      'Open a ZIP, see what is inside, take files out, and pack new archives.',
    category: 'File',
    aliases: [
      'unzip online',
      'open zip file',
      'zip extractor',
      'zip viewer',
      'make a zip',
      'zip files online',
    ],
    jobs: [
      'unzip a file',
      'open a zip archive',
      'see what is inside a zip',
      'extract one file from a zip',
      'make a zip file',
      'check a zip for damage',
    ],
    href: '/file/archive',
    execution: {
      mode: 'local-js',
      capabilities: [
        'archive.zip.read',
        'archive.zip.write',
        'archive.zip.verify-checksum',
      ],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'file-workbench',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'Private file workbench',
    shortDescription:
      'Inspect, hash, split, join, rename, encode, and download local files.',
    category: 'File',
    aliases: FILE_WORKBENCH_OPERATIONS.map((operation) => operation.name),
    jobs: FILE_WORKBENCH_OPERATIONS.map((operation) => operation.description),
    searchEntries: searchEntries('/file/workbench', FILE_WORKBENCH_OPERATIONS),
    href: '/file/workbench',
    execution: {
      mode: 'local-js',
      capabilities: [
        'file.bytes.inspect',
        'file.bytes.transform',
        'file.crypto.digest',
      ],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'developer-data-workbench',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'Developer & data workbench',
    shortDescription:
      'Encode, decode, inspect, convert, test, and hash developer data.',
    category: 'Developer',
    aliases: DEVELOPER_DATA_OPERATIONS.map((operation) => operation.name),
    jobs: DEVELOPER_DATA_OPERATIONS.map((operation) => operation.description),
    searchEntries: searchEntries(
      '/developer/workbench',
      DEVELOPER_DATA_OPERATIONS,
    ),
    href: '/developer/workbench',
    execution: {
      mode: 'local-js',
      capabilities: [
        'developer.data.transform',
        'developer.regex.bounded',
        'crypto.digest.text',
      ],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'developer-advanced-workbench',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'Advanced developer workbench',
    shortDescription:
      'Inspect JSON, generate secure tokens, calculate networks, and build configs.',
    category: 'Developer',
    aliases: ADVANCED_DEVELOPER_OPERATIONS.map((operation) => operation.name),
    jobs: ADVANCED_DEVELOPER_OPERATIONS.map(
      (operation) => operation.description,
    ),
    searchEntries: searchEntries(
      '/developer/advanced',
      ADVANCED_DEVELOPER_OPERATIONS,
    ),
    href: '/developer/advanced',
    execution: {
      mode: 'local-js',
      capabilities: [
        'developer.structured.inspect',
        'crypto.random.generate',
        'network.ipv4.calculate',
      ],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'percentage-calculator',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'Percentage calculator',
    shortDescription: 'Calculate percentages, ratios, and percentage change.',
    category: 'Math',
    aliases: ['percent calculator', 'percentage change', 'what percent'],
    jobs: ['calculate percentage', 'find percent change'],
    href: '/math/percentage-calculator',
    execution: {
      mode: 'local-js',
      capabilities: ['math.percentage'],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'math-workbench',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'Math & unit workbench',
    shortDescription:
      'Arithmetic, statistics, number theory, geometry, and unit conversion.',
    category: 'Math',
    aliases: MATH_OPERATIONS.map((operation) => operation.name),
    jobs: MATH_OPERATIONS.map((operation) => operation.description),
    searchEntries: searchEntries('/math/workbench', MATH_OPERATIONS),
    href: '/math/workbench',
    execution: {
      mode: 'local-js',
      capabilities: ['math.workbench.calculate', 'units.linear.convert'],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'date-difference',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'Date difference calculator',
    shortDescription: 'Count exact calendar days between two dates.',
    category: 'Date',
    aliases: ['days between dates', 'date duration', 'day counter'],
    jobs: ['calculate date difference', 'count days between dates'],
    href: '/date/date-difference',
    execution: {
      mode: 'local-js',
      capabilities: ['date.calendar.difference'],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'age-calculator',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'Age calculator',
    shortDescription: 'Calculate calendar age and total elapsed days.',
    category: 'Date',
    aliases: ['birthday age', 'how old am i', 'date of birth calculator'],
    jobs: ['calculate age', 'age on a date'],
    href: '/date/age-calculator',
    execution: {
      mode: 'local-js',
      capabilities: ['date.calendar.age'],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'date-workbench',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'Date & time workbench',
    shortDescription:
      'Calculate dates, workdays, time zones, hours, and timesheets.',
    category: 'Date',
    aliases: DATE_OPERATIONS.map((operation) => operation.name),
    jobs: DATE_OPERATIONS.map((operation) => operation.description),
    searchEntries: searchEntries('/date/workbench', DATE_OPERATIONS),
    href: '/date/workbench',
    execution: {
      mode: 'local-js',
      capabilities: ['date.calendar.calculate', 'time.zone.format'],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'web-workbench',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'Web & SEO workbench',
    shortDescription:
      'Generate and inspect metadata, URLs, CSS, HTML, and SEO assets.',
    category: 'Web',
    aliases: WEB_OPERATIONS.map((operation) => operation.name),
    jobs: WEB_OPERATIONS.map((operation) => operation.description),
    searchEntries: searchEntries('/web/workbench', WEB_OPERATIONS),
    href: '/web/workbench',
    execution: {
      mode: 'local-js',
      capabilities: ['web.metadata.transform', 'web.css.calculate'],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'productivity-workbench',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'Planning & productivity workbench',
    shortDescription:
      'Prioritize, schedule, compare, pick, group, and plan locally.',
    category: 'Date',
    aliases: PRODUCTIVITY_OPERATIONS.map((operation) => operation.name),
    jobs: PRODUCTIVITY_OPERATIONS.map((operation) => operation.description),
    searchEntries: searchEntries(
      '/productivity/workbench',
      PRODUCTIVITY_OPERATIONS,
    ),
    href: '/productivity/workbench',
    execution: {
      mode: 'local-js',
      capabilities: ['productivity.plan', 'productivity.randomize'],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'finance-business-workbench',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'Finance & business workbench',
    shortDescription:
      'Transparent borrowing, savings, pricing, budget, and operating scenarios.',
    category: 'Finance',
    aliases: FINANCE_OPERATIONS.map((operation) => operation.name),
    jobs: FINANCE_OPERATIONS.map((operation) => operation.description),
    searchEntries: searchEntries('/finance/workbench', FINANCE_OPERATIONS),
    href: '/finance/workbench',
    execution: {
      mode: 'local-js',
      capabilities: [
        'finance.scenario.calculate',
        'business.metric.calculate',
        'cashflow.root.solve',
      ],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'science-education-workbench',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'Science & learning workbench',
    shortDescription:
      'Transparent formula calculators, study materials, logic, and sets.',
    category: 'Science',
    aliases: SCIENCE_OPERATIONS.map((operation) => operation.name),
    jobs: SCIENCE_OPERATIONS.map((operation) => operation.description),
    searchEntries: searchEntries('/science/workbench', SCIENCE_OPERATIONS),
    href: '/science/workbench',
    execution: {
      mode: 'local-js',
      capabilities: [
        'science.formula.calculate',
        'education.material.structure',
        'logic.truth-table.evaluate',
      ],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'document-workbench',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'Documents & office workbench',
    shortDescription:
      'Draft, calculate, inspect, compare, merge, and download documents.',
    category: 'Document',
    aliases: DOCUMENT_OPERATIONS.map((operation) => operation.name),
    jobs: DOCUMENT_OPERATIONS.map((operation) => operation.description),
    searchEntries: searchEntries('/documents/workbench', DOCUMENT_OPERATIONS),
    href: '/documents/workbench',
    execution: {
      mode: 'local-js',
      capabilities: [
        'document.template.render',
        'document.table.calculate',
        'document.text.inspect',
      ],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'subtitle-workbench',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'Subtitle workbench',
    shortDescription:
      'Convert, resync, join, trim and check SRT, WebVTT, SBV and LRC subtitles.',
    category: 'Creator',
    aliases: [
      'srt to vtt',
      'vtt to srt',
      'subtitle converter',
      'subtitle sync',
      'caption converter',
      'srt editor',
      'subtitle timing',
    ],
    jobs: [
      'convert srt to vtt',
      'convert vtt to srt',
      'fix out of sync subtitles',
      'shift subtitle timing',
      'join subtitle files',
      'turn subtitles into a transcript',
      'check caption reading speed',
    ],
    searchEntries: searchEntries('/subtitles/workbench', SUBTITLE_OPERATIONS),
    href: '/subtitles/workbench',
    execution: {
      mode: 'local-js',
      capabilities: [
        'subtitle.parse',
        'subtitle.format',
        'subtitle.retime',
        'text.encoding.detect',
      ],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'creator-workbench',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'Creator & social workbench',
    shortDescription:
      'Format, plan, measure, and package creator content locally.',
    category: 'Creator',
    aliases: CREATOR_OPERATIONS.map((operation) => operation.name),
    jobs: CREATOR_OPERATIONS.map((operation) => operation.description),
    searchEntries: searchEntries('/creator/workbench', CREATOR_OPERATIONS),
    href: '/creator/workbench',
    execution: {
      mode: 'local-js',
      capabilities: ['creator.content.transform', 'creator.metrics.calculate'],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'life-admin-workbench',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'India & life-admin workbench',
    shortDescription:
      'Mask identifiers, check formats, estimate household costs, and plan dates.',
    category: 'Life Admin',
    aliases: LIFE_ADMIN_OPERATIONS.map((operation) => operation.name),
    jobs: LIFE_ADMIN_OPERATIONS.map((operation) => operation.description),
    searchEntries: searchEntries(
      '/life-admin/workbench',
      LIFE_ADMIN_OPERATIONS,
    ),
    href: '/life-admin/workbench',
    execution: {
      mode: 'local-js',
      capabilities: [
        'life-admin.identifier.mask',
        'life-admin.format.check',
        'life-admin.plan.calculate',
      ],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'qr-barcode-workbench',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'QR & barcode workbench',
    shortDescription:
      'Create QR payloads, printable sheets, and common linear barcodes locally.',
    category: 'QR & Barcode',
    aliases: QR_BARCODE_OPERATIONS.map((operation) => operation.name),
    jobs: QR_BARCODE_OPERATIONS.map((operation) => operation.description),
    searchEntries: searchEntries('/qr/workbench', QR_BARCODE_OPERATIONS),
    href: '/qr/workbench',
    execution: {
      mode: 'local-js',
      capabilities: [
        'qr.payload.compose',
        'qr.svg.encode',
        'barcode.linear.encode',
      ],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
];

export interface ToolGroup {
  // The union lives in `navigation.ts` so the sidebar and the catalogue cannot
  // disagree about which groups exist. Each id is also a public URL
  // (`/?category=<id>`), so an id is added or kept, never renamed --
  // `home-workspace.tsx` answers an unknown category with PDF instead of
  // saying the link is dead.
  id: NavGroupId;
  name: string;
  shortDescription: string;
  toolIds: string[];
}

// Seventeen groups, one per kind of work a visitor arrives looking for.
//
// There were nine, and they hid a third of the site: `video` was a group the
// sidebar never listed, and six workbenches -- Documents, Finance, Science,
// Creator, Life admin and Planning -- belonged to no group at all, so 239 live
// destinations could be reached only by typing the right word into search.
// Google was already sending people to one of them (`latex table generator`
// resolves to `/documents/workbench`) with no menu path to follow.
//
// Every id that existed before is kept, contents reshuffled, because
// `/?category=<id>` is a public URL. New work gets a new id; nothing is renamed.
export const toolGroups: ToolGroup[] = [
  {
    id: 'pdf',
    name: 'PDF',
    shortDescription: 'Merge, compress, extract, and reorder pages.',
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
    ],
  },
  {
    id: 'images',
    name: 'Image',
    shortDescription: 'Compress, resize, convert, crop, and adjust images.',
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
    toolIds: ['mp3-toolkit', 'audio-convert'],
  },
  {
    id: 'video',
    name: 'Video',
    shortDescription:
      'Trim, mute and extract audio from MP4 and MOV without re-encoding.',
    toolIds: ['video-trim'],
  },
  {
    id: 'documents',
    name: 'Documents & office',
    shortDescription:
      'Word and office documents, LaTeX tables, citations, and letters.',
    toolIds: ['document-workbench', 'docx-metadata'],
  },
  {
    id: 'files',
    name: 'Files & archives',
    shortDescription: 'ZIP archives, checksums, renaming, and file inspection.',
    toolIds: ['file-hash', 'archive-toolkit', 'file-workbench'],
  },
  {
    id: 'text-data',
    name: 'Text & writing',
    shortDescription: 'Case conversion, counting, cleaning, and writing tools.',
    toolIds: ['text-case-converter', 'text-workbench', 'writing-workbench'],
  },
  {
    id: 'spreadsheets',
    name: 'Spreadsheets & data',
    shortDescription: 'JSON, CSV, Excel, and tabular data cleanup.',
    toolIds: [
      'spreadsheet-workbench',
      'excel-converter',
      'csv-to-json',
      'json-format',
      'list-hygiene',
    ],
  },
  {
    id: 'developer-files',
    name: 'Developer',
    shortDescription: 'Base64, UUIDs, timestamps, regex, and schema tools.',
    toolIds: [
      'base64-encode',
      'base64-decode',
      'uuid-generator',
      'unix-timestamp',
      'developer-data-workbench',
      'developer-advanced-workbench',
    ],
  },
  {
    id: 'web-seo',
    name: 'Web & SEO',
    shortDescription: 'Metadata, URLs, CSS, HTML, and accessibility checks.',
    toolIds: ['web-workbench', 'file-to-html'],
  },
  {
    id: 'calculators',
    name: 'Calculators & units',
    shortDescription: 'Percentages, arithmetic, formulas, and unit conversion.',
    toolIds: ['percentage-calculator', 'math-workbench'],
  },
  {
    id: 'dates',
    name: 'Dates & planning',
    shortDescription: 'Date maths, age, timesheets, schedules, and checklists.',
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
    toolIds: ['finance-business-workbench'],
  },
  {
    id: 'science',
    name: 'Science & learning',
    shortDescription: 'Physics, chemistry, statistics, and study tools.',
    toolIds: ['science-education-workbench'],
  },
  {
    id: 'qr-barcode',
    name: 'QR & barcodes',
    shortDescription: 'QR payloads, SVG sheets, product codes, and labels.',
    toolIds: ['qr-barcode-workbench'],
  },
  {
    id: 'creator',
    name: 'Creator & social',
    shortDescription: 'Captions, subtitles, thumbnails, and social formats.',
    toolIds: ['creator-workbench', 'subtitle-workbench'],
  },
  {
    id: 'life-admin',
    name: 'India & life admin',
    shortDescription: 'Indian paperwork, identifiers, and household admin.',
    toolIds: ['life-admin-workbench'],
  },
];

export function toolsForGroup(group: ToolGroup) {
  const ids = new Set(group.toolIds);
  return publicTools.filter((tool) => ids.has(tool.id));
}

export interface ToolDestination {
  id: string;
  name: string;
  description: string;
  href: string;
  workspaceId: string;
}

export function toolDestinationsForGroup(group: ToolGroup): ToolDestination[] {
  return toolsForGroup(group).flatMap((tool) =>
    tool.searchEntries?.length
      ? tool.searchEntries.map((entry) => ({
          id: `${tool.id}:${entry.id}`,
          name: entry.name,
          description: entry.description,
          href: entry.href,
          workspaceId: tool.id,
        }))
      : [
          {
            id: tool.id,
            name: tool.name,
            description: tool.shortDescription,
            href: tool.href,
            workspaceId: tool.id,
          },
        ],
  );
}

export interface ToolSubsection {
  id: string;
  title: string;
  description: string;
  destinations: ToolDestination[];
}

export function toolSubsectionsForGroup(group: ToolGroup): ToolSubsection[] {
  const destinations = toolDestinationsForGroup(group);

  if (group.id === 'pdf') {
    const coreIds = new Set([
      'pdf-merge',
      'pdf-compress',
      'pdf-sign',
      'pdf-extract',
      'images-to-pdf',
    ]);
    const layoutIds = new Set([
      'pdf-page-tools:rotate-pdf',
      'pdf-page-tools:reorder-pdf-pages',
      'pdf-page-tools:delete-pdf-pages',
    ]);
    const securityIds = new Set([
      'pdf-page-tools:pdf-page-numbers',
      'pdf-page-tools:pdf-watermark',
      'pdf-page-tools:pdf-metadata-editor',
    ]);

    const core = destinations.filter((d) => coreIds.has(d.id));
    const layout = destinations.filter((d) => layoutIds.has(d.id));
    const security = destinations.filter((d) => securityIds.has(d.id));
    const assigned = new Set([...coreIds, ...layoutIds, ...securityIds]);
    const remaining = destinations.filter((d) => !assigned.has(d.id));

    return [
      {
        id: 'core-operations',
        title: 'Core Page Operations',
        description:
          'Merge PDFs, make one smaller, extract pages, and turn images into a PDF.',
        destinations: [...core, ...remaining],
      },
      {
        id: 'layout-transform',
        title: 'Layout & Page Transformation',
        description: 'Rotate, reorder, and remove pages.',
        destinations: layout,
      },
      {
        id: 'security-presentation',
        title: 'Document Presentation',
        description: 'Page numbers, watermarks, and metadata.',
        destinations: security,
      },
    ].filter((section) => section.destinations.length > 0);
  }

  if (group.id === 'images') {
    const backgroundIds = new Set(['image-editor:solid-background-remover']);
    const optIds = new Set(['image-optimize', 'image-exact-size']);
    const studioIds = new Set([
      'image-editor:image-cropper',
      'image-editor:image-flipper',
      'image-editor:image-rotator',
      'image-editor:image-brightness',
      'image-editor:image-contrast',
      'image-editor:image-grayscale',
    ]);

    const background = destinations.filter((d) => backgroundIds.has(d.id));
    const opt = destinations.filter((d) => optIds.has(d.id));
    const studio = destinations.filter((d) => studioIds.has(d.id));
    const assigned = new Set([...backgroundIds, ...optIds, ...studioIds]);
    const remaining = destinations.filter((d) => !assigned.has(d.id));

    return [
      {
        id: 'background-removal',
        title: 'Background Removal',
        description: 'Make a plain-color image background transparent.',
        destinations: background,
      },
      {
        id: 'optimization-conversion',
        title: 'Optimization & Compression',
        description: 'Resize, compress, and convert images in your browser.',
        destinations: [...opt, ...remaining],
      },
      {
        id: 'canvas-studio',
        title: 'Canvas Studio & Adjustments',
        description: 'Crop, flip, rotate, and fine-tune image color channels.',
        destinations: studio,
      },
    ].filter((section) => section.destinations.length > 0);
  }

  if (group.id === 'developer-files') {
    const isTokens = (d: ToolDestination) =>
      d.id === 'base64-encode' ||
      d.id === 'base64-decode' ||
      d.id === 'uuid-generator' ||
      d.id === 'unix-timestamp';
    const isWorkbench = (d: ToolDestination) =>
      d.id.startsWith('developer-data-workbench') ||
      d.id.startsWith('developer-advanced-workbench');

    const tokens = destinations.filter(isTokens);
    const workbenches = destinations.filter(isWorkbench);
    const assigned = new Set([
      ...tokens.map((d) => d.id),
      ...workbenches.map((d) => d.id),
    ]);
    const remaining = destinations.filter((d) => !assigned.has(d.id));

    return [
      {
        id: 'encodings-tokens-hashes',
        title: 'Encodings, Tokens & Hashes',
        description: 'Base64, UUID v4, and Unix timestamps.',
        destinations: tokens,
      },
      {
        id: 'engineering-workbenches',
        title: 'Engineering Workbenches',
        description: 'Type generators, regex, token parsers, and converters.',
        destinations: [...workbenches, ...remaining],
      },
    ].filter((section) => section.destinations.length > 0);
  }

  if (group.id === 'qr-barcode') {
    const isBarcode = (d: ToolDestination) =>
      /barcode|ean|upc|code-128|code-39|sheet|label/i.test(
        `${d.id} ${d.name} ${d.description}`,
      );

    const barcode = destinations.filter(isBarcode);
    const qr = destinations.filter((d) => !isBarcode(d));

    return [
      {
        id: 'qr-generators',
        title: 'QR Code Generators',
        description:
          'Wi-Fi, URLs, contact vCards, payments, and custom payloads.',
        destinations: qr.length ? qr : destinations,
      },
      {
        id: 'barcode-labels',
        title: 'Linear Barcodes & Print Sheets',
        description:
          'EAN-13, EAN-8, UPC-A, Code 39, ITF-14, and printable code sheets.',
        destinations: barcode,
      },
    ].filter((section) => section.destinations.length > 0);
  }

  if (group.id === 'web-seo') {
    const isCss = (d: ToolDestination) =>
      /css|gradient|glass|neumorph|animat|shadow|palette/i.test(
        `${d.id} ${d.name} ${d.description}`,
      );

    const css = destinations.filter(isCss);
    const seo = destinations.filter((d) => !isCss(d));

    return [
      {
        id: 'css-visual-studios',
        title: 'CSS & Visual Design Studios',
        description:
          'Multi-stop gradients, glassmorphism, neumorphism, and animations.',
        destinations: css,
      },
      {
        id: 'webmaster-metadata',
        title: 'Webmaster & Search Engine Metadata',
        description: 'Meta tags, Open Graph tags, robots.txt, and sitemaps.',
        destinations: seo.length ? seo : destinations,
      },
    ].filter((section) => section.destinations.length > 0);
  }

  return [
    {
      id: group.id,
      title: group.name,
      description: group.shortDescription,
      destinations,
    },
  ];
}

// Both now live in `navigation.ts`, which the sidebar imports on its own so it
// never pulls this file's eighteen operation modules into the shell chunk.
// Re-exported here because callers that already hold the catalogue should not
// have to learn a second import path.
export type { NavSection as NavMajorSection } from './navigation';
export { NAVIGATION_MAJOR_SECTIONS } from './navigation';

const normalizeToken = (token: string) =>
  token.length > 3 && token.endsWith('s') ? token.slice(0, -1) : token;

const tokenize = (value: string) =>
  value
    .normalize('NFKD')
    .toLocaleLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .map(normalizeToken);

interface PreindexedCandidate {
  tool: ToolManifest;
  resultId: string;
  name: string;
  shortDescription: string;
  href: string;
  normalizedName: string;
  nameTokens: readonly string[];
  documentTokens: readonly string[];
}

const PREINDEXED_CANDIDATES: readonly PreindexedCandidate[] =
  publicTools.flatMap((tool) => {
    const mainScoreText = [
      tool.name,
      tool.shortDescription,
      ...tool.aliases,
      ...tool.jobs,
    ].join(' ');

    const mainCandidate: PreindexedCandidate = {
      tool,
      resultId: tool.id,
      name: tool.name,
      shortDescription: tool.shortDescription,
      href: tool.href,
      normalizedName: tool.name.toLocaleLowerCase('en-US'),
      nameTokens: tokenize(tool.name),
      documentTokens: tokenize(mainScoreText),
    };

    const entryCandidates: PreindexedCandidate[] = (
      tool.searchEntries ?? []
    ).map((entry) => ({
      tool,
      resultId: `${tool.id}:${entry.id}`,
      name: entry.name,
      shortDescription: entry.description,
      href: entry.href,
      normalizedName: entry.name.toLocaleLowerCase('en-US'),
      nameTokens: tokenize(entry.name),
      documentTokens: tokenize(`${entry.name} ${entry.description}`),
    }));

    return [mainCandidate, ...entryCandidates];
  });

export function searchTools(query: string): ToolManifest[] {
  const queryTokens = tokenize(query);
  if (!queryTokens.length)
    return publicTools.map((tool) => ({ ...tool, resultId: tool.id }));

  const tokenMatches = (documentToken: string, queryToken: string) => {
    if (documentToken === queryToken) return true;
    if (documentToken.length < 4 || queryToken.length < 4) return false;
    return (
      documentToken.startsWith(queryToken) ||
      queryToken.startsWith(documentToken)
    );
  };

  const normalizedQuery = query.trim().toLocaleLowerCase('en-US');
  return PREINDEXED_CANDIDATES.flatMap((candidate) => {
    if (
      !queryTokens.every((queryToken) =>
        candidate.documentTokens.some((documentToken) =>
          tokenMatches(documentToken, queryToken),
        ),
      )
    ) {
      return [];
    }

    const score =
      candidate.normalizedName === normalizedQuery
        ? 100
        : candidate.normalizedName.startsWith(normalizedQuery)
          ? 80
          : queryTokens.every((token) => candidate.nameTokens.includes(token))
            ? 60
            : candidate.resultId === candidate.tool.id
              ? 20
              : 40;

    return [
      {
        ...candidate.tool,
        resultId: candidate.resultId,
        name: candidate.name,
        shortDescription: candidate.shortDescription,
        href: candidate.href,
        score,
      },
    ];
  })
    .sort(
      (left, right) =>
        right.score - left.score || left.name.localeCompare(right.name),
    )
    .slice(0, 20);
}
