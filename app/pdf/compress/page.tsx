import type { Metadata } from 'next';

import { PdfCompressTool } from '@/components/pdf-compress-tool';
import { practiceBrief } from '@/lib/practice-briefs';

export const revalidate = 86400;

/*
  Re-pointed at one profession rather than at everyone, and wired to the
  fit-to-a-ceiling path that had no control anywhere on the site.

  Constraint C3: no upload ceiling appears in the title or the description
  below. A portal can move its limit without announcing it, and a cached meta
  description outlives the change by months. The figures live in
  `lib/portal-presets.ts` beside the portal page each was read from and the
  date it was read, and are rendered next to that citation.
*/

const BRIEF = practiceBrief('filing-bundle-under-portal-ceiling');

export const metadata: Metadata = {
  title: BRIEF.heading,
  description:
    'Shrink a PDF until it is under the upload ceiling a filing portal enforces, in your own browser. Published ceilings for the Income Tax e-filing and GST portals are offered as presets, each shown with its source and the date it was checked.',
};

export default function Page() {
  return <PdfCompressTool brief={BRIEF} />;
}
