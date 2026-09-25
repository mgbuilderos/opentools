import type { Metadata } from 'next';

import { QrBarcodeWorkbenchTool } from '@/components/qr-barcode-workbench-tool';
import { ToolJsonLd } from '@/components/tool-json-ld';

export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/qr/workbench' },
  title: 'QR Code & Barcode Generator Workbench',
  description:
    'Generate QR codes, QR sheets, EAN, UPC-A, Code 39, and ITF-14 SVGs locally in your browser.',
};

export default function Page() {
  return (
    <>
      <ToolJsonLd route="/qr/workbench" meta={metadata} />
      <QrBarcodeWorkbenchTool />
    </>
  );
}
