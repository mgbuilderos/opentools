export interface DetectedAction {
  label: string;
  href: string;
  variant?: 'default' | 'outline';
  isPrimary?: boolean;
}

export type DetectedInputType =
  | 'pdf'
  | 'image'
  | 'csv'
  | 'json'
  | 'code'
  | 'generic-file'
  | 'timestamp'
  | 'color'
  | 'sql'
  | 'url'
  | 'base64'
  | 'text';

export const SMART_DROPZONE_ACTIONS: Record<
  DetectedInputType,
  readonly DetectedAction[]
> = {
  pdf: [
    {
      label: 'Rotate PDF',
      href: '/pdf/page-tools?tool=rotate-pdf',
      isPrimary: true,
    },
    { label: 'Reorder Pages', href: '/pdf/page-tools?tool=reorder-pdf-pages' },
    { label: 'Delete Pages', href: '/pdf/page-tools?tool=delete-pdf-pages' },
    { label: 'Page Numbers', href: '/pdf/page-tools?tool=pdf-page-numbers' },
    { label: 'Merge PDFs', href: '/pdf/merge' },
    { label: 'Extract Pages', href: '/pdf/extract-pages' },
  ],
  image: [
    {
      label: 'Compress & Optimize',
      href: '/image/optimize',
      isPrimary: true,
    },
    { label: 'Remove Background', href: '/image/background-remover' },
    { label: 'Crop & Resize', href: '/image/editor?tool=image-cropper' },
    { label: 'Convert to PDF', href: '/pdf/images-to-pdf' },
  ],
  csv: [
    {
      label: 'Convert CSV to JSON',
      href: '/data/csv-to-json',
      isPrimary: true,
    },
    {
      label: 'Spreadsheet Viewer',
      href: '/data/workbench?tool=csv-viewer',
    },
    {
      label: 'Filter CSV',
      href: '/data/workbench?tool=csv-filter',
    },
    {
      label: 'Sort CSV',
      href: '/data/workbench?tool=csv-sorter',
    },
  ],
  json: [
    {
      label: 'Format & Validate JSON',
      href: '/developer/workbench?tool=json-format',
      isPrimary: true,
    },
    {
      label: 'Generate Zod Schema',
      href: '/developer/advanced?tool=json-to-zod-schema',
    },
    {
      label: 'Generate TypeScript Types',
      href: '/developer/advanced?tool=json-to-typescript',
    },
    {
      label: 'Minify JSON',
      href: '/developer/workbench?tool=json-minify',
    },
  ],
  code: [
    {
      label: 'SHA-256 / Checksums',
      href: '/file/hash-calculator',
      isPrimary: true,
    },
    { label: 'Writing Workbench', href: '/text/writing' },
    { label: 'File Workbench', href: '/file/workbench' },
  ],
  'generic-file': [
    {
      label: 'Compute SHA-256 / Hashes',
      href: '/file/hash-calculator',
      isPrimary: true,
    },
    {
      label: 'File Inspection Workbench',
      href: '/file/workbench',
    },
  ],
  timestamp: [
    {
      label: 'Unix Timestamp Converter',
      href: '/developer/unix-timestamp',
      isPrimary: true,
    },
    {
      label: 'Date Difference Calculator',
      href: '/date/date-difference',
    },
    { label: 'Age Calculator', href: '/date/age-calculator' },
  ],
  color: [
    {
      label: 'Contrast Ratio Checker',
      href: '/web/workbench?tool=accessibility-contrast-checker',
      isPrimary: true,
    },
    {
      label: 'CSS Box Shadow Builder',
      href: '/creator/workbench?tool=css-box-shadow',
    },
  ],
  sql: [
    {
      label: 'Format SQL',
      href: '/developer/advanced?tool=sql-formatter',
      isPrimary: true,
    },
    {
      label: 'ER Diagram from DDL',
      href: '/developer/advanced?tool=sql-to-er-diagram',
    },
    {
      label: 'Minify SQL',
      href: '/developer/advanced?tool=sql-minifier',
    },
    {
      label: 'Sanitize SQL PII',
      href: '/developer/advanced?tool=sql-pii-obfuscator',
    },
  ],
  url: [
    {
      label: 'Generate QR Code',
      href: '/qr/workbench?tool=url-qr-code',
      isPrimary: true,
    },
    {
      label: 'Open Graph Generator',
      href: '/web/workbench?tool=open-graph-generator',
    },
    {
      label: 'URL Component Encoder',
      href: '/developer/workbench?tool=url-encode-component',
    },
  ],
  base64: [
    {
      label: 'Decode Base64',
      href: '/developer/base64-decoder',
      isPrimary: true,
    },
    { label: 'Encode Base64', href: '/developer/base64-encoder' },
    { label: 'Hash Calculator (SHA-256)', href: '/file/hash-calculator' },
  ],
  text: [
    {
      label: 'Word Counter & Stats',
      href: '/text/workbench?tool=word-counter',
      isPrimary: true,
    },
    { label: 'Convert Letter Case', href: '/text/case-converter' },
    { label: 'Writing Workbench', href: '/text/writing' },
  ],
};
