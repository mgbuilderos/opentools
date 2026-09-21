import {
  SCIENCE_OPERATIONS,
  runScienceOperation,
} from '@/lib/tools/science-education-workbench';
import { adaptTextWorkbench } from './text-adapter';

export const scienceEducationOperations = adaptTextWorkbench({
  source: 'science-education',
  operations: SCIENCE_OPERATIONS,
  run: runScienceOperation,
});
