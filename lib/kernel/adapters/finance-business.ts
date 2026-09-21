import {
  FINANCE_OPERATIONS,
  runFinanceOperation,
} from '@/lib/tools/finance-business-workbench';
import { adaptTextWorkbench } from './text-adapter';

export const financeBusinessOperations = adaptTextWorkbench({
  source: 'finance-business',
  operations: FINANCE_OPERATIONS,
  run: runFinanceOperation,
});
