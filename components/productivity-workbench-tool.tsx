'use client';

import { SchemaWorkbenchTool } from '@/components/schema-workbench-tool';
import {
  PRODUCTIVITY_OPERATIONS,
  runProductivityOperation,
} from '@/lib/tools/productivity-workbench';

/*
  The two optional props are what let this workbench also serve as one tool on
  its own page: `app/<category>/[tool]/page.tsx` renders it once per operation
  with that operation's id and the category prefix. Unset, every behaviour is
  exactly what it was, and the workbench URL keeps working for anyone holding
  it.
*/
export function ProductivityWorkbenchTool({
  initialOperationId = 'task-prioritization-matrix',
  routedBasePath,
}: {
  initialOperationId?: string;
  routedBasePath?: string;
} = {}) {
  return (
    <SchemaWorkbenchTool
      currentToolId="productivity-workbench"
      eyebrow="Planning & productivity"
      title="Planning workbench"
      introduction="Prioritize, schedule, decide, pick, group, and plan with transparent local logic instead of another account."
      selectorLabel="Planning tool"
      actionLabel="Build result"
      methodLabel="Transparent local planning logic"
      operations={PRODUCTIVITY_OPERATIONS}
      initialOperationId={initialOperationId}
      routedBasePath={routedBasePath}
      run={runProductivityOperation}
    />
  );
}
