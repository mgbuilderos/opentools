import type { ToolManifest } from './types';
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
  {
    id: 'reverse-pdf-pages',
    name: 'Reverse PDF pages',
    description: 'Save PDF pages in reverse order from last to first.',
  },
  {
    id: 'split-pdf-ranges',
    name: 'Split PDF ranges',
    description: 'Extract and assemble custom comma-separated page ranges.',
  },
  {
    id: 'flatten-pdf',
    name: 'Flatten PDF',
    description:
      'Flatten interactive form fields and annotations into static pages.',
  },
  {
    id: 'pdf-to-images',
    name: 'PDF to images',
    description:
      'Extract or render PDF pages into high-resolution image files.',
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
  id:
    | 'pdf'
    | 'images'
    | 'text-data'
    | 'developer-files'
    | 'calculators'
    | 'documents-office'
    | 'science-education'
    | 'finance-business'
    | 'web-seo'
    | 'creator-social'
    | 'life-admin'
    | 'qr-barcode';
  name: string;
  shortDescription: string;
  toolIds: string[];
}

export const toolGroups: ToolGroup[] = [
  {
    id: 'pdf',
    name: 'PDF',
    shortDescription: 'Merge, split, extract, and reorder pages.',
    toolIds: ['pdf-merge', 'pdf-extract', 'images-to-pdf', 'pdf-page-tools'],
  },
  {
    id: 'images',
    name: 'Images',
    shortDescription: 'Compress, resize, convert, and remove metadata.',
    toolIds: ['image-optimize', 'image-editor'],
  },
  {
    id: 'text-data',
    name: 'Text & data',
    shortDescription: 'Case conversion, JSON, and CSV utilities.',
    toolIds: [
      'text-case-converter',
      'text-workbench',
      'writing-workbench',
      'json-format',
      'csv-to-json',
      'spreadsheet-workbench',
    ],
  },
  {
    id: 'qr-barcode',
    name: 'QR & barcodes',
    shortDescription: 'QR payloads, SVG sheets, product codes, and labels.',
    toolIds: ['qr-barcode-workbench'],
  },
  {
    id: 'calculators',
    name: 'Calculators',
    shortDescription: 'Percentage, date difference, and age.',
    toolIds: [
      'percentage-calculator',
      'math-workbench',
      'date-difference',
      'age-calculator',
      'date-workbench',
      'productivity-workbench',
    ],
  },
  {
    id: 'developer-files',
    name: 'Developer & files',
    shortDescription: 'Base64, UUID, timestamps, and file checksums.',
    toolIds: [
      'base64-encode',
      'base64-decode',
      'uuid-generator',
      'unix-timestamp',
      'file-hash',
      'file-workbench',
      'developer-data-workbench',
      'developer-advanced-workbench',
    ],
  },
  {
    id: 'documents-office',
    name: 'Documents & office',
    shortDescription:
      'Drafts, templates, mail merge, citations, and comparison.',
    toolIds: ['document-workbench'],
  },
  {
    id: 'web-seo',
    name: 'Web & SEO',
    shortDescription: 'Metadata, URLs, CSS, HTML, and accessibility checks.',
    toolIds: ['web-workbench'],
  },
  {
    id: 'finance-business',
    name: 'Finance & business',
    shortDescription: 'Scenario math for money, pricing, budgets, and metrics.',
    toolIds: ['finance-business-workbench'],
  },
  {
    id: 'science-education',
    name: 'Science & education',
    shortDescription: 'Physics formulas, grades, study aids, logic, and sets.',
    toolIds: ['science-education-workbench'],
  },
  {
    id: 'creator-social',
    name: 'Creator & social',
    shortDescription: 'Content formatting, feeds, planning, and creator math.',
    toolIds: ['creator-workbench'],
  },
  {
    id: 'life-admin',
    name: 'India & life admin',
    shortDescription:
      'Everyday privacy, household, travel, payment, and date helpers.',
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
