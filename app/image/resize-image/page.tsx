import type { Metadata } from 'next';

import { ImageStudioTool } from '@/components/image-studio-tool';
import { relatedToolsFor } from '@/lib/seo/related-tools';
import { IMAGE_STUDIO_BY_ID } from '@/lib/tools/image-studio-operations';

/*
  Why this one job has a folder when its thirty-three siblings are generated.

  `catalog.test.ts` requires every manifest's `href` to be a real
  `app/<href>/page.tsx`, and `publicTools` needs one entry for the image studio
  so its tools appear in the sidebar's Image group and in site search rather
  than only in the sitemap. `/image/resize-image` is that address: the job most
  people arrive for, and the natural landing page for the set.

  It renders exactly what `/image/[tool]` would render for the same id — same
  component, same operation record, same related links — so this is one URL
  written out, not a second URL for the same tool.
  `excludedToolIdsForPrefix` takes `resize-image` back out of the dynamic
  route's `generateStaticParams`, which is what keeps that true.
*/

const OPERATION = IMAGE_STUDIO_BY_ID.get('resize-image')!;

export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/image/resize-image' },
  title: 'Resize Image Online — Exact Pixels, Free, No Upload',
  description:
    'Resize a photo to exact pixel dimensions, fit it inside a box without distorting it, or scale it by percentage. Runs in this browser tab.',
};

export default function Page() {
  return (
    <ImageStudioTool
      operation={OPERATION}
      relatedTools={relatedToolsFor('/image/resize-image')}
    />
  );
}
