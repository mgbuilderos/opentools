'use client';

import { SchemaWorkbenchTool } from '@/components/schema-workbench-tool';
import { DATE_OPERATIONS, runDateOperation } from '@/lib/tools/date-workbench';

/*
  The two optional props are what let this workbench also serve as one tool on
  its own page: `app/<category>/[tool]/page.tsx` renders it once per operation
  with that operation's id and the category prefix. Unset, every behaviour is
  exactly what it was, and the workbench URL keeps working for anyone holding
  it.
*/
export function DateWorkbenchTool({
  initialOperationId = 'add-days-to-date',
  routedBasePath,
}: {
  initialOperationId?: string;
  routedBasePath?: string;
} = {}) {
  return (
    <SchemaWorkbenchTool
      currentToolId="date-workbench"
      eyebrow="Date & time"
      title="Date & time workbench"
      introduction="Calendar arithmetic, time-zone formatting, durations, and timesheets in one compact local workspace."
      selectorLabel="Date or time tool"
      actionLabel="Calculate"
      methodLabel="UTC-stable local calculation"
      operations={DATE_OPERATIONS}
      initialOperationId={initialOperationId}
      routedBasePath={routedBasePath}
      run={runDateOperation}
    />
  );
}
