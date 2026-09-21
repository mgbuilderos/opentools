import {
  DEVELOPER_DATA_OPERATIONS,
  runDeveloperDataOperation,
} from '@/lib/tools/developer-data-workbench';
import { adaptAsyncTextWorkbench } from './text-adapter';

export const developerDataOperations = adaptAsyncTextWorkbench({
  source: 'developer-data',
  operations: DEVELOPER_DATA_OPERATIONS,
  run: runDeveloperDataOperation,
});
