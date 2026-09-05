'use client';

import { SchemaWorkbenchTool } from '@/components/schema-workbench-tool';
import {
  runWritingOperation,
  WRITING_OPERATIONS,
} from '@/lib/tools/writing-workbench';

export function WritingWorkbenchTool() {
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
      initialOperationId="markdown-to-html"
      run={runWritingOperation}
    />
  );
}
