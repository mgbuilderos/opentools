import { PdfToExcelTool } from '@/components/pdf-to-excel-tool';
import { PageDepthProvider } from '@/components/page-depth-provider';
import { practiceBrief } from '@/lib/practice-briefs';
import {
  requireToolPageDepth,
  toolPageMetadata,
} from '@/lib/seo/tool-page-depth';
import { ToolJsonLd } from '@/components/tool-json-ld';

export const revalidate = 86400;

/*
  Re-pointed at one profession rather than at everyone.

  The tool is unchanged and the URL is unchanged; the heading and standfirst
  name the job — a client's bank statement, into the books — instead of naming
  the file formats. "PDF to Excel converter" is what the page did; "the
  statement the bank emailed, as rows I can post" is what somebody is actually
  looking for at nine on a Monday.

  The title, description, canonical and the written half of the page come from
  `lib/seo/tool-page-depth.ts`, which `PageDepthProvider` hands to the app
  shell. `lib/seo/tool-page-depth.test.ts` keeps them together.
*/

const ROUTE = '/pdf/to-excel';
const BRIEF = practiceBrief('bank-statement-to-books');

export const metadata = toolPageMetadata(ROUTE);

export default function Page() {
  return (
    <>
      <ToolJsonLd route="/pdf/to-excel" meta={metadata} />
      <PageDepthProvider content={requireToolPageDepth(ROUTE)}>
        <PdfToExcelTool brief={BRIEF} />
      </PageDepthProvider>
    </>
  );
}
