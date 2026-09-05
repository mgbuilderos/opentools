'use client';

import { SchemaWorkbenchTool } from '@/components/schema-workbench-tool';
import {
  FINANCE_OPERATIONS,
  runFinanceOperation,
} from '@/lib/tools/finance-business-workbench';

export function FinanceBusinessWorkbenchTool() {
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
      initialOperationId="loan-emi-calculator"
      run={runFinanceOperation}
    />
  );
}
