import { BankStatementTool } from '@/components/bank-statement-tool';
import { PageDepthProvider } from '@/components/page-depth-provider';
import {
  requireToolPageDepth,
  toolPageMetadata,
} from '@/lib/seo/tool-page-depth';

const ROUTE = '/finance/bank-statement';

export const metadata = toolPageMetadata(ROUTE);

export default function BankStatementPage() {
  return (
    <PageDepthProvider content={requireToolPageDepth(ROUTE)}>
      <BankStatementTool />
    </PageDepthProvider>
  );
}
