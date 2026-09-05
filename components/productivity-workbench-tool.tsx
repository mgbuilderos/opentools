'use client';

import { SchemaWorkbenchTool } from '@/components/schema-workbench-tool';
import {
  PRODUCTIVITY_OPERATIONS,
  runProductivityOperation,
} from '@/lib/tools/productivity-workbench';

export function ProductivityWorkbenchTool() {
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
      initialOperationId="task-prioritization-matrix"
      run={runProductivityOperation}
    />
  );
}
