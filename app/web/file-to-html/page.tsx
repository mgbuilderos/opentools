import type { Metadata } from 'next';

import { FileToHtmlTool } from '@/components/file-to-html-tool';

export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/web/file-to-html' },
  title: 'File to HTML Converter — Email Marketing & Web',
  description:
    'Convert JPEG, PNG, WebP, SVG images and multi-page PDFs into email-ready HTML packages and standalone web pages, entirely in your own browser tab.',
};

export default function Page() {
  return <FileToHtmlTool />;
}
