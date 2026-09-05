'use client';

import { SchemaWorkbenchTool } from '@/components/schema-workbench-tool';
import {
  DEVELOPER_DATA_OPERATIONS,
  runDeveloperDataOperation,
} from '@/lib/tools/developer-data-workbench';

export function DeveloperDataWorkbenchTool() {
  return (
    <SchemaWorkbenchTool
      currentToolId="developer-data-workbench"
      eyebrow="Developer & data"
      title="Developer & data workbench"
      introduction="Encode, decode, inspect, convert, test, and hash common developer data without pasting it into a remote service."
      selectorLabel="Developer tool"
      actionLabel="Run tool"
      methodLabel="Local JavaScript / Web Crypto"
      operations={DEVELOPER_DATA_OPERATIONS}
      initialOperationId="url-encode-component"
      run={runDeveloperDataOperation}
    />
  );
}
