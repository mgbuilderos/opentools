import { PdfToWordTool } from '@/components/pdf-to-word-tool';
import { PageDepthProvider } from '@/components/page-depth-provider';
import {
  requireToolPageDepth,
  toolPageMetadata,
} from '@/lib/seo/tool-page-depth';

export const revalidate = 86400;

/*
  The title, the description, the self-canonical and the written half of this
  page all come from `lib/seo/tool-page-depth.ts`, which `PageDepthProvider`
  hands to the app shell. They live together because they are one decision: on
  2026-09-23 the 19 PDF and 13 image tool pages carried a few hundred words each
  and a bare product-name title, while their guides carried four times as much
  and the title that matched what people search for -- and the guide is the page
  that cannot do the job. `lib/seo/tool-page-depth.test.ts` keeps them together.
*/

const ROUTE = '/pdf/to-word';

export const metadata = toolPageMetadata(ROUTE);

export default function Page() {
  return (
    <PageDepthProvider content={requireToolPageDepth(ROUTE)}>
      <PdfToWordTool />
    </PageDepthProvider>
  );
}
