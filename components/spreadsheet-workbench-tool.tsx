'use client';

import { SchemaWorkbenchTool } from '@/components/schema-workbench-tool';
import type { RelatedTool } from '@/lib/seo/related-tools';
import {
  runSpreadsheetOperation,
  SPREADSHEET_OPERATIONS,
} from '@/lib/tools/spreadsheet-workbench';

/*
  The two optional props are what let this workbench also serve as one tool on
  its own page: `app/<category>/[tool]/page.tsx` renders it once per operation
  with that operation's id and the category prefix. Unset, every behaviour is
  exactly what it was, and the workbench URL keeps working for anyone holding
  it.
*/
export function SpreadsheetWorkbenchTool({
  initialOperationId = 'csv-viewer',
  routedBasePath,
  relatedTools,
}: {
  initialOperationId?: string;
  routedBasePath?: string;
  /** Built by `lib/seo/related-tools.ts` in the route file; see there. */
  relatedTools?: readonly RelatedTool[];
} = {}) {
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
      initialOperationId={initialOperationId}
      routedBasePath={routedBasePath}
      relatedTools={relatedTools}
      run={runSpreadsheetOperation}
    />
  );
}
