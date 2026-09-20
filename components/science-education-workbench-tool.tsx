'use client';

import { SchemaWorkbenchTool } from '@/components/schema-workbench-tool';
import {
  SCIENCE_OPERATIONS,
  runScienceOperation,
} from '@/lib/tools/science-education-workbench';

/*
  The two optional props are what let this workbench also serve as one tool on
  its own page: `app/<category>/[tool]/page.tsx` renders it once per operation
  with that operation's id and the category prefix. Unset, every behaviour is
  exactly what it was, and the workbench URL keeps working for anyone holding
  it.
*/
export function ScienceEducationWorkbenchTool({
  initialOperationId = 'ohm-s-law-calculator',
  routedBasePath,
}: {
  initialOperationId?: string;
  routedBasePath?: string;
} = {}) {
  return (
    <SchemaWorkbenchTool
      currentToolId="science-education-workbench"
      eyebrow="Science & education"
      title="Science & learning workbench"
      introduction="Run transparent formula calculators, build study materials, inspect sets and truth tables, and format supplied academic facts locally."
      selectorLabel="Science or learning tool"
      actionLabel="Calculate locally"
      methodLabel="Declared formulas and bounded local logic"
      operations={SCIENCE_OPERATIONS}
      initialOperationId={initialOperationId}
      routedBasePath={routedBasePath}
      run={runScienceOperation}
    />
  );
}
