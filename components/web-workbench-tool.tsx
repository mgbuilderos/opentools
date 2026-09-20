'use client';

import { SchemaWorkbenchTool } from '@/components/schema-workbench-tool';
import { runWebOperation, WEB_OPERATIONS } from '@/lib/tools/web-workbench';

/*
  The two optional props are what let this workbench also serve as one tool on
  its own page: `app/<category>/[tool]/page.tsx` renders it once per operation
  with that operation's id and the category prefix. Unset, every behaviour is
  exactly what it was, and the workbench URL keeps working for anyone holding
  it.
*/
export function WebWorkbenchTool({
  initialOperationId = 'meta-tag-generator',
  routedBasePath,
}: {
  initialOperationId?: string;
  routedBasePath?: string;
} = {}) {
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
      initialOperationId={initialOperationId}
      routedBasePath={routedBasePath}
      run={runWebOperation}
    />
  );
}
