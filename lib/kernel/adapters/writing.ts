import {
  runWritingOperation,
  WRITING_OPERATIONS,
} from '@/lib/tools/writing-workbench';
import { adaptTextWorkbench } from './text-adapter';

export const writingOperations = adaptTextWorkbench({
  source: 'writing',
  operations: WRITING_OPERATIONS,
  run: runWritingOperation,
});
