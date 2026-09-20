import type { Metadata } from 'next';

import { DesignSvgTool } from '@/components/design-svg-tool';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'SVG Optimizer & PNG Converter — Clean Vector Graphics',
  description:
    'Optimize SVG files by stripping Inkscape/Illustrator metadata, XML comments, and redundant coordinate precision. Export high-resolution PNG or WebP rasters at up to 4x retina scale.',
};

export default function Page() {
  return <DesignSvgTool />;
}
