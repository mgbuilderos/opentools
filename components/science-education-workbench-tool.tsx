'use client';

import { SchemaWorkbenchTool } from '@/components/schema-workbench-tool';
import {
  SCIENCE_OPERATIONS,
  runScienceOperation,
} from '@/lib/tools/science-education-workbench';

export function ScienceEducationWorkbenchTool() {
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
      initialOperationId="ohm-s-law-calculator"
      run={runScienceOperation}
    />
  );
}
