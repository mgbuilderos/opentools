'use client';

import { SchemaWorkbenchTool } from '@/components/schema-workbench-tool';
import { runWebOperation, WEB_OPERATIONS } from '@/lib/tools/web-workbench';

export function WebWorkbenchTool() {
  return (
    <SchemaWorkbenchTool
      currentToolId="web-workbench"
      eyebrow="Web & SEO"
      title="Web & SEO workbench"
      introduction="Generate, inspect, and calculate common web assets without sending source, URLs, or campaign data to a service."
      selectorLabel="Web tool"
      actionLabel="Run tool"
      methodLabel="Deterministic local transform"
      operations={WEB_OPERATIONS}
      initialOperationId="meta-tag-generator"
      run={runWebOperation}
    />
  );
}
