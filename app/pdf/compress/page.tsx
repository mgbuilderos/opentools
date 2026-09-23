import { PdfCompressTool } from '@/components/pdf-compress-tool';
import { PageDepthProvider } from '@/components/page-depth-provider';
import { practiceBrief } from '@/lib/practice-briefs';
import {
  requireToolPageDepth,
  toolPageMetadata,
} from '@/lib/seo/tool-page-depth';

export const revalidate = 86400;

/*
  Re-pointed at one profession rather than at everyone, and wired to the
  fit-to-a-ceiling path that had no control anywhere on the site.

  Constraint C3: no upload ceiling appears in the title or the description,
  which now come from `lib/seo/tool-page-depth.ts`. A portal can move its limit
  without announcing it, and a cached meta description outlives the change by
  months. The figures live in `lib/portal-presets.ts` beside the portal page
  each was read from and the date it was read, and are rendered next to that
  citation.

  The written half of the page is in the same module and reaches the app shell
  through `PageDepthProvider`; `lib/seo/tool-page-depth.test.ts` keeps the title
  and the prose from drifting apart.
*/

const ROUTE = '/pdf/compress';
const BRIEF = practiceBrief('filing-bundle-under-portal-ceiling');

export const metadata = toolPageMetadata(ROUTE);

export default function Page() {
  return (
    <PageDepthProvider content={requireToolPageDepth(ROUTE)}>
      <PdfCompressTool brief={BRIEF} />
    </PageDepthProvider>
  );
}
