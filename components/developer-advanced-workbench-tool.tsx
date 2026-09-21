'use client';

import { SchemaWorkbenchTool } from '@/components/schema-workbench-tool';
import type { RelatedTool } from '@/lib/seo/related-tools';
import {
  ADVANCED_DEVELOPER_OPERATIONS,
  runAdvancedDeveloperOperation,
} from '@/lib/tools/developer-advanced-workbench';

/*
  The two optional props are what let this workbench also serve as one tool on
  its own page: `app/<category>/[tool]/page.tsx` renders it once per operation
  with that operation's id and the category prefix. Unset, every behaviour is
  exactly what it was, and the workbench URL keeps working for anyone holding
  it.
*/
export function DeveloperAdvancedWorkbenchTool({
  initialOperationId = 'json-diff',
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
      currentToolId="developer-advanced-workbench"
      eyebrow="Developer & data"
      title="Advanced developer workbench"
      introduction="Inspect structured data, create secure local tokens, calculate networks, and generate common project configuration without sending inputs away."
      selectorLabel="Developer tool"
      actionLabel="Run locally"
      methodLabel="Bounded browser APIs and deterministic parsers"
      operations={ADVANCED_DEVELOPER_OPERATIONS}
      initialOperationId={initialOperationId}
      routedBasePath={routedBasePath}
      relatedTools={relatedTools}
      run={runAdvancedDeveloperOperation}
    />
  );
}
