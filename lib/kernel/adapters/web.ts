import { runWebOperation, WEB_OPERATIONS } from '@/lib/tools/web-workbench';
import { adaptTextWorkbench } from './text-adapter';

export const webOperations = adaptTextWorkbench({
  source: 'web',
  operations: WEB_OPERATIONS,
  run: runWebOperation,
});
