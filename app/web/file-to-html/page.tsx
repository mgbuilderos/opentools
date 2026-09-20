import type { Metadata } from 'next';

import { FileToHtmlTool } from '@/components/file-to-html-tool';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'File to HTML Converter — Email Marketing & Web',
  description:
    'Convert JPEG, PNG, WebP, SVG images and multi-page PDFs into production-ready email marketing HTML packages and standalone web pages. Runs 100% locally in your browser.',
};

export default function Page() {
  return <FileToHtmlTool />;
}
