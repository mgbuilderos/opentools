import type { Metadata } from 'next';

import { AadhaarPanMaskerTool } from '@/components/aadhaar-pan-masker-tool';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Mask Aadhaar and PAN numbers in text',
  description:
    'Detects and masks Aadhaar and PAN numbers in text on your device. Aadhaar numbers keep only their last 4 digits. Text only: images, scans and PDFs are not read.',
};

export default function Page() {
  return <AadhaarPanMaskerTool />;
}
