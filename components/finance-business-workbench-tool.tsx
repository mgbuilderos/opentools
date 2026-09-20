'use client';

import { SchemaWorkbenchTool } from '@/components/schema-workbench-tool';
import {
  FINANCE_OPERATIONS,
  runFinanceOperation,
} from '@/lib/tools/finance-business-workbench';

/*
  The two optional props are what let this workbench also serve as one tool on
  its own page: `app/<category>/[tool]/page.tsx` renders it once per operation
  with that operation's id and the category prefix. Unset, every behaviour is
  exactly what it was, and the workbench URL keeps working for anyone holding
  it.
*/
export function FinanceBusinessWorkbenchTool({
  initialOperationId = 'loan-emi-calculator',
  routedBasePath,
}: {
  initialOperationId?: string;
  routedBasePath?: string;
} = {}) {
  return (
    <SchemaWorkbenchTool
      currentToolId="finance-business-workbench"
      eyebrow="Finance & business"
      title="Finance & business workbench"
      introduction="Run transparent scenario math for borrowing, saving, pricing, budgets, and operating metrics without sending financial inputs away."
      selectorLabel="Scenario calculator"
      actionLabel="Calculate scenario"
      methodLabel="Declared formulas using supplied assumptions"
      operations={FINANCE_OPERATIONS}
      initialOperationId={initialOperationId}
      routedBasePath={routedBasePath}
      run={runFinanceOperation}
    />
  );
}
