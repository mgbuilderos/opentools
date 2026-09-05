'use client';

import { SchemaWorkbenchTool } from '@/components/schema-workbench-tool';
import {
  runSpreadsheetOperation,
  SPREADSHEET_OPERATIONS,
} from '@/lib/tools/spreadsheet-workbench';

export function SpreadsheetWorkbenchTool() {
  return (
    <SchemaWorkbenchTool
      currentToolId="spreadsheet-workbench"
      eyebrow="Spreadsheet & data"
      title="CSV & spreadsheet workbench"
      introduction="Clean, reshape, compare, inspect, and convert tabular data inside one compact browser workspace."
      selectorLabel="Table tool"
      actionLabel="Run tool"
      methodLabel="Bounded local table transform"
      operations={SPREADSHEET_OPERATIONS}
      initialOperationId="csv-viewer"
      run={runSpreadsheetOperation}
    />
  );
}
