import { AadhaarPanMaskerTool } from '@/components/aadhaar-pan-masker-tool';
import { PageDepthProvider } from '@/components/page-depth-provider';
import { practiceBrief } from '@/lib/practice-briefs';
import {
  requireToolPageDepth,
  toolPageMetadata,
} from '@/lib/seo/tool-page-depth';
import { ToolJsonLd } from '@/components/tool-json-ld';

export const revalidate = 86400;

/*
  Re-pointed at one profession rather than at everyone. The tool and the URL
  are unchanged; the page now names the moment it is needed, which is not
  "I would like to mask a number" but "this working paper is about to go to
  the bank and it still has the client's Aadhaar in it".
*/

const ROUTE = '/life-admin/aadhaar-pan-masker';
const BRIEF = practiceBrief('mask-before-it-leaves-the-firm');

export const metadata = toolPageMetadata(ROUTE);

export default function Page() {
  return (
    <>
      <ToolJsonLd route="/life-admin/aadhaar-pan-masker" meta={metadata} />
      <PageDepthProvider content={requireToolPageDepth(ROUTE)}>
        <AadhaarPanMaskerTool brief={BRIEF} />
      </PageDepthProvider>
    </>
  );
}
