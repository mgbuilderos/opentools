import { DATE_OPERATIONS, runDateOperation } from '@/lib/tools/date-workbench';
import { adaptTextWorkbench } from './text-adapter';

export const dateOperations = adaptTextWorkbench({
  source: 'date',
  operations: DATE_OPERATIONS,
  run: runDateOperation,
});
