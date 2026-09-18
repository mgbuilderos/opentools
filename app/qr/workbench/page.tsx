import type { Metadata } from 'next';

import { QrBarcodeWorkbenchTool } from '@/components/qr-barcode-workbench-tool';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'QR Code & Barcode Generator Workbench',
  description:
    'Generate QR codes, QR sheets, EAN, UPC-A, Code 39, and ITF-14 SVGs locally in your browser.',
};

export default function Page() {
  return <QrBarcodeWorkbenchTool />;
}
