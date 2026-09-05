'use client';

import { SchemaWorkbenchTool } from '@/components/schema-workbench-tool';
import { DATE_OPERATIONS, runDateOperation } from '@/lib/tools/date-workbench';

export function DateWorkbenchTool() {
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
      initialOperationId="add-days-to-date"
      run={runDateOperation}
    />
  );
}
