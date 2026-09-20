'use client';

import { SchemaWorkbenchTool } from '@/components/schema-workbench-tool';
import {
  DEVELOPER_DATA_OPERATIONS,
  runDeveloperDataOperation,
} from '@/lib/tools/developer-data-workbench';

/*
  The two optional props are what let this workbench also serve as one tool on
  its own page: `app/<category>/[tool]/page.tsx` renders it once per operation
  with that operation's id and the category prefix. Unset, every behaviour is
  exactly what it was, and the workbench URL keeps working for anyone holding
  it.
*/
export function DeveloperDataWorkbenchTool({
  initialOperationId = 'url-encode-component',
  routedBasePath,
}: {
  initialOperationId?: string;
  routedBasePath?: string;
} = {}) {
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
      initialOperationId={initialOperationId}
      routedBasePath={routedBasePath}
      run={runDeveloperDataOperation}
    />
  );
}
