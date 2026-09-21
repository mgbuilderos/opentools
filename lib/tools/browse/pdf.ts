// Generated from `toolSubsectionsForGroup` -- see lib/tools/browse.ts for why,
// and browse.test.ts, which fails if this file drifts from the catalogue.
import type { BrowseSection } from '../browse';

export const SECTIONS: readonly BrowseSection[] = [
  {
    id: 'core-operations',
    title: 'Core Page Operations',
    description:
      'Merge PDFs, make one smaller, extract pages, and turn images into a PDF.',
    destinations: [
      {
        id: 'pdf-merge',
        name: 'Merge PDF',
        description: 'Combine PDF files in the order you choose.',
        href: '/pdf/merge',
        workspaceId: 'pdf-merge',
      },
      {
        id: 'pdf-compress',
        name: 'Compress PDF',
        description:
          'Rewrite a PDF more compactly and re-encode the photos inside it.',
        href: '/pdf/compress',
        workspaceId: 'pdf-compress',
      },
      {
        id: 'pdf-sign',
        name: 'Sign and fill PDF',
        description: 'Complete a PDF form and draw a signature onto the page.',
        href: '/pdf/sign',
        workspaceId: 'pdf-sign',
      },
      {
        id: 'pdf-extract',
        name: 'Extract PDF pages',
        description: 'Choose pages or ranges and save them as a new PDF.',
        href: '/pdf/extract-pages',
        workspaceId: 'pdf-extract',
      },
      {
        id: 'images-to-pdf',
        name: 'Images to PDF',
        description:
          'Arrange JPEG and PNG images into one locally generated PDF.',
        href: '/pdf/images-to-pdf',
        workspaceId: 'images-to-pdf',
      },
      {
        id: 'pdf-to-word',
        name: 'PDF to Word',
        description:
          'Pull the text out of a PDF into an editable .docx. Text only — layout, tables and images are not carried across.',
        href: '/pdf/to-word',
        workspaceId: 'pdf-to-word',
      },
      {
        id: 'pdf-ocr',
        name: 'OCR PDF',
        description:
          'Add an invisible searchable English text layer to a scanned PDF while preserving its visible pages.',
        href: '/pdf/ocr',
        workspaceId: 'pdf-ocr',
      },
      {
        id: 'pdf-to-excel',
        name: 'PDF to Excel',
        description:
          'Convert bank statements and PDF tables into clean Excel (.xlsx) and CSV with column detection, reconciliation and zero server uploads.',
        href: '/pdf/to-excel',
        workspaceId: 'pdf-to-excel',
      },
      {
        id: 'pdf-bates',
        name: 'Bates numbering for PDFs',
        description:
          'Stamp sequential exhibit numbers across a bundle of PDFs, continuing the count from one file to the next.',
        href: '/pdf/bates',
        workspaceId: 'pdf-bates',
      },
      {
        id: 'pdf-redact',
        name: 'Redact & Black Out PDF',
        description:
          'Permanently black out text, rectangles, or sensitive PII. Rasterises redacted pages and purges metadata and annotations.',
        href: '/pdf/redact',
        workspaceId: 'pdf-redact',
      },
      {
        id: 'pdf-metadata',
        name: 'PDF metadata viewer and remover',
        description:
          'See the author, the authoring program, the dates and the XMP packet held inside a PDF, then remove all of them.',
        href: '/pdf/metadata',
        workspaceId: 'pdf-metadata',
      },
    ],
  },
  {
    id: 'layout-transform',
    title: 'Layout & Page Transformation',
    description: 'Rotate, reorder, and remove pages.',
    destinations: [
      {
        id: 'pdf-page-tools:rotate-pdf',
        name: 'Rotate PDF',
        description: 'Rotate every PDF page by a quarter turn.',
        href: '/pdf/page-tools?tool=rotate-pdf',
        workspaceId: 'pdf-page-tools',
      },
      {
        id: 'pdf-page-tools:reorder-pdf-pages',
        name: 'Reorder PDF pages',
        description: 'Save PDF pages in a new requested order.',
        href: '/pdf/page-tools?tool=reorder-pdf-pages',
        workspaceId: 'pdf-page-tools',
      },
      {
        id: 'pdf-page-tools:delete-pdf-pages',
        name: 'Delete PDF pages',
        description: 'Omit selected pages from a new local PDF.',
        href: '/pdf/page-tools?tool=delete-pdf-pages',
        workspaceId: 'pdf-page-tools',
      },
    ],
  },
  {
    id: 'security-presentation',
    title: 'Document Presentation',
    description: 'Page numbers, watermarks, and metadata.',
    destinations: [
      {
        id: 'pdf-page-tools:pdf-page-numbers',
        name: 'PDF page numbers',
        description: 'Add centered page numbers to every output page.',
        href: '/pdf/page-tools?tool=pdf-page-numbers',
        workspaceId: 'pdf-page-tools',
      },
      {
        id: 'pdf-page-tools:pdf-watermark',
        name: 'PDF watermark',
        description: 'Place a text watermark across every PDF page.',
        href: '/pdf/page-tools?tool=pdf-watermark',
        workspaceId: 'pdf-page-tools',
      },
      {
        id: 'pdf-page-tools:pdf-metadata-editor',
        name: 'PDF metadata editor',
        description: 'Set PDF title, author, subject, and keywords.',
        href: '/pdf/page-tools?tool=pdf-metadata-editor',
        workspaceId: 'pdf-page-tools',
      },
    ],
  },
];
