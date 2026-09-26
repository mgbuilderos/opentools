import { HeicConvertTool } from '@/components/heic-convert-tool';
import { PageDepthProvider } from '@/components/page-depth-provider';
import {
  requireToolPageDepth,
  toolPageMetadata,
} from '@/lib/seo/tool-page-depth';
import { ToolJsonLd } from '@/components/tool-json-ld';

export const revalidate = 86400;

/*
  Two routes, one component. The JPEG page is the one the search is for --
  "heic to jpg" is the query a person types when Windows will not open the
  photograph their phone took. The PNG page answers a different, smaller need
  and says so in its own words; neither is a view of the other, so each is its
  own self-canonical address. See HEIC_BUILD_SPEC.md section 6.
*/

const ROUTE = '/image/heic-to-jpg';

export const metadata = toolPageMetadata(ROUTE);

export default function HeicToJpgPage() {
  return (
    <>
      <ToolJsonLd route="/image/heic-to-jpg" meta={metadata} />
      <PageDepthProvider content={requireToolPageDepth(ROUTE)}>
        <HeicConvertTool targetFormatId="jpg" />
      </PageDepthProvider>
    </>
  );
}
