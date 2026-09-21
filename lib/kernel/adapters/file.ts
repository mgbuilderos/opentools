import {
  FILE_WORKBENCH_OPERATIONS,
  runFileWorkbenchOperation,
} from '@/lib/tools/file-workbench';
import { adaptFileWorkbench } from './file-adapter';

export const fileOperations = adaptFileWorkbench({
  source: 'file-workbench',
  operations: FILE_WORKBENCH_OPERATIONS,
  run: runFileWorkbenchOperation,
  nondeterministic: new Set(['file-encrypt']),
});
