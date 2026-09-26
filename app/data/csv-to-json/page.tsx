import { CsvToJsonTool } from '@/components/structured-tools';
import { PageDepthProvider } from '@/components/page-depth-provider';
import {
  requireToolPageDepth,
  toolPageMetadata,
} from '@/lib/seo/tool-page-depth';
import { ToolJsonLd } from '@/components/tool-json-ld';

export const revalidate = 86400;

const ROUTE = '/data/csv-to-json';

export const metadata = toolPageMetadata(ROUTE);

export default function Page() {
  return (
    <>
      <ToolJsonLd route="/data/csv-to-json" meta={metadata} />
      <PageDepthProvider content={requireToolPageDepth(ROUTE)}>
        <CsvToJsonTool />
      </PageDepthProvider>
    </>
  );
}
