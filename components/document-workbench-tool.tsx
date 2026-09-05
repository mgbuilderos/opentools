'use client';

import { SchemaWorkbenchTool } from '@/components/schema-workbench-tool';
import {
  DOCUMENT_OPERATIONS,
  runDocumentOperation,
} from '@/lib/tools/document-workbench';

export function DocumentWorkbenchTool() {
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
      initialOperationId="readme-generator"
      run={runDocumentOperation}
    />
  );
}
