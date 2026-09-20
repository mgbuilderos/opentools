'use client';

import { SchemaWorkbenchTool } from '@/components/schema-workbench-tool';
import {
  LIFE_ADMIN_OPERATIONS,
  runLifeAdminOperation,
} from '@/lib/tools/life-admin-workbench';

/*
  The two optional props are what let this workbench also serve as one tool on
  its own page: `app/<category>/[tool]/page.tsx` renders it once per operation
  with that operation's id and the category prefix. Unset, every behaviour is
  exactly what it was, and the workbench URL keeps working for anyone holding
  it.
*/
export function LifeAdminWorkbenchTool({
  initialOperationId = 'aadhaar-masking-tool',
  routedBasePath,
}: {
  initialOperationId?: string;
  routedBasePath?: string;
} = {}) {
  return (
    <SchemaWorkbenchTool
      currentToolId="life-admin-workbench"
      eyebrow="India & life admin"
      title="India & life-admin workbench"
      introduction="Mask sensitive references, check common Indian identifier formats, and run everyday household, travel, budget, and calendar calculations without sending your inputs away."
      selectorLabel="Everyday tool"
      actionLabel="Run locally"
      methodLabel="Deterministic browser-local rules and supplied assumptions"
      operations={LIFE_ADMIN_OPERATIONS}
      initialOperationId={initialOperationId}
      routedBasePath={routedBasePath}
      run={runLifeAdminOperation}
    />
  );
}
