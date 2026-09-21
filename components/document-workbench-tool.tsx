'use client';

import { SchemaWorkbenchTool } from '@/components/schema-workbench-tool';
import type { RelatedTool } from '@/lib/seo/related-tools';
import {
  DOCUMENT_OPERATIONS,
  runDocumentOperation,
} from '@/lib/tools/document-workbench';

/*
  The two optional props are what let this workbench also serve as one tool on
  its own page: `app/<category>/[tool]/page.tsx` renders it once per operation
  with that operation's id and the category prefix. Unset, every behaviour is
  exactly what it was, and the workbench URL keeps working for anyone holding
  it.
*/
export function DocumentWorkbenchTool({
  initialOperationId = 'readme-generator',
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
      currentToolId="document-workbench"
      eyebrow="Documents & office"
      title="Document workbench"
      introduction="Draft, calculate, inspect, compare, merge, and download everyday office documents entirely in this browser tab."
      selectorLabel="Document tool"
      actionLabel="Build result"
      methodLabel="Deterministic local document logic"
      operations={DOCUMENT_OPERATIONS}
      initialOperationId={initialOperationId}
      routedBasePath={routedBasePath}
      relatedTools={relatedTools}
      run={runDocumentOperation}
    />
  );
}
