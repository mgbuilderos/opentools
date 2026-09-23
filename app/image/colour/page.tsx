import type { Metadata } from 'next';

import { DesignColourTool } from '@/components/design-colour-tool';

export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/image/colour' },
  title: 'Colour Converter & Palette Extractor — HEX, RGB, HSL, CMYK',
  description:
    'Convert between HEX, RGB, HSL, and CMYK colour spaces with honest device profile notices. Extract dominant colour palettes from photos using Median Cut quantization.',
};

export default function Page() {
  return <DesignColourTool />;
}
