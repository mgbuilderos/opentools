import {
  CREATOR_OPERATIONS,
  runCreatorOperation,
} from '@/lib/tools/creator-workbench';
import { adaptTextWorkbench } from './text-adapter';

export const creatorOperations = adaptTextWorkbench({
  source: 'creator',
  operations: CREATOR_OPERATIONS,
  run: runCreatorOperation,
});
