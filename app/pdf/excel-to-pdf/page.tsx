import { ExcelToPdfTool } from '@/components/excel-to-pdf-tool';
import { PageDepthProvider } from '@/components/page-depth-provider';
import { relatedToolsFor } from '@/lib/seo/related-tools';
import {
  requireToolPageDepth,
  toolPageMetadata,
} from '@/lib/seo/tool-page-depth';
import { ToolJsonLd } from '@/components/tool-json-ld';

export const revalidate = 86400;

const ROUTE = '/pdf/excel-to-pdf';

export const metadata = toolPageMetadata(ROUTE);

export default function Page() {
  const related = relatedToolsFor(ROUTE);
  return (
    <>
      <ToolJsonLd route="/pdf/excel-to-pdf" meta={metadata} />
      <PageDepthProvider content={requireToolPageDepth(ROUTE)}>
        <ExcelToPdfTool relatedTools={related} />
      </PageDepthProvider>
    </>
  );
}
