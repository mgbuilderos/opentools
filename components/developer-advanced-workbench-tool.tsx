'use client';

import { SchemaWorkbenchTool } from '@/components/schema-workbench-tool';
import {
  ADVANCED_DEVELOPER_OPERATIONS,
  runAdvancedDeveloperOperation,
} from '@/lib/tools/developer-advanced-workbench';

export function DeveloperAdvancedWorkbenchTool() {
  return (
    <SchemaWorkbenchTool
      currentToolId="developer-advanced-workbench"
      eyebrow="Developer & data"
      title="Advanced developer workbench"
      introduction="Inspect structured data, create secure local tokens, calculate networks, and generate common project configuration in this browser tab. Formal runtime egress proof is pending."
      selectorLabel="Developer tool"
      actionLabel="Run locally"
      methodLabel="Bounded browser APIs and deterministic parsers"
      operations={ADVANCED_DEVELOPER_OPERATIONS}
      initialOperationId="json-diff"
      run={runAdvancedDeveloperOperation}
    />
  );
}
