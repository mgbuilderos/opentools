'use client';

import { SchemaWorkbenchTool } from '@/components/schema-workbench-tool';
import type { RelatedTool } from '@/lib/seo/related-tools';
import {
  runWritingOperation,
  WRITING_OPERATIONS,
} from '@/lib/tools/writing-workbench';

/*
  The two optional props are what let this workbench also serve as one tool on
  its own page: `app/<category>/[tool]/page.tsx` renders it once per operation
  with that operation's id and the category prefix. Unset, every behaviour is
  exactly what it was, and the workbench URL keeps working for anyone holding
  it.
*/
export function WritingWorkbenchTool({
  initialOperationId = 'markdown-to-html',
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
      currentToolId="writing-workbench"
      eyebrow="Text & writing"
      title="Writing workbench"
      introduction="Edit, convert, compare, summarize, structure, and export writing with bounded local logic and no account."
      selectorLabel="Writing tool"
      actionLabel="Transform locally"
      methodLabel="Bounded deterministic text transforms"
      operations={WRITING_OPERATIONS}
      initialOperationId={initialOperationId}
      routedBasePath={routedBasePath}
      relatedTools={relatedTools}
      run={runWritingOperation}
    />
  );
}
