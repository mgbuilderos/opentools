'use client';

import { SchemaWorkbenchTool } from '@/components/schema-workbench-tool';
import {
  CREATOR_OPERATIONS,
  runCreatorOperation,
} from '@/lib/tools/creator-workbench';

export function CreatorWorkbenchTool() {
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
      initialOperationId="youtube-chapter-generator"
      run={runCreatorOperation}
    />
  );
}
