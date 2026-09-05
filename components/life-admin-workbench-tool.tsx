'use client';

import { SchemaWorkbenchTool } from '@/components/schema-workbench-tool';
import {
  LIFE_ADMIN_OPERATIONS,
  runLifeAdminOperation,
} from '@/lib/tools/life-admin-workbench';

export function LifeAdminWorkbenchTool() {
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
      initialOperationId="aadhaar-masking-tool"
      run={runLifeAdminOperation}
    />
  );
}
