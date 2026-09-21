'use client';

import { SchemaWorkbenchTool } from '@/components/schema-workbench-tool';
import type { RelatedTool } from '@/lib/seo/related-tools';
import {
  CREATOR_OPERATIONS,
  runCreatorOperation,
} from '@/lib/tools/creator-workbench';

/*
  The two optional props are what let this workbench also serve as one tool on
  its own page: `app/<category>/[tool]/page.tsx` renders it once per operation
  with that operation's id and the category prefix. Unset, every behaviour is
  exactly what it was, and the workbench URL keeps working for anyone holding
  it.
*/
export function CreatorWorkbenchTool({
  initialOperationId = 'youtube-chapter-generator',
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
      currentToolId="creator-workbench"
      eyebrow="Creator & social"
      title="Creator workbench"
      introduction="Format, plan, measure, and package creator content with explicit local rules and no trend-data claims."
      selectorLabel="Creator tool"
      actionLabel="Build result"
      methodLabel="Deterministic local transform"
      operations={CREATOR_OPERATIONS}
      initialOperationId={initialOperationId}
      routedBasePath={routedBasePath}
      relatedTools={relatedTools}
      run={runCreatorOperation}
    />
  );
}
