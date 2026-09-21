import {
  LIFE_ADMIN_OPERATIONS,
  runLifeAdminOperation,
} from '@/lib/tools/life-admin-workbench';
import { adaptTextWorkbench } from './text-adapter';

export const lifeAdminOperations = adaptTextWorkbench({
  source: 'life-admin',
  operations: LIFE_ADMIN_OPERATIONS,
  run: runLifeAdminOperation,
});
