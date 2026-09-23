import { PdfCompareTool } from '@/components/pdf-compare-tool';
import { PageDepthProvider } from '@/components/page-depth-provider';
import { relatedToolsFor } from '@/lib/seo/related-tools';
import {
  requireToolPageDepth,
  toolPageMetadata,
} from '@/lib/seo/tool-page-depth';

export const revalidate = 86400;

/*
  The title, the description, the self-canonical and the written half of this
  page all come from `lib/seo/tool-page-depth.ts`, which `PageDepthProvider`
  hands to the app shell. See `lib/seo/tool-page-depth.test.ts` for the floor
  they are held to.
*/

const ROUTE = '/pdf/compare';

export const metadata = toolPageMetadata(ROUTE);

export default function Page() {
  const related = relatedToolsFor(ROUTE);
  return (
    <PageDepthProvider content={requireToolPageDepth(ROUTE)}>
      <PdfCompareTool relatedTools={related} />
    </PageDepthProvider>
  );
}
