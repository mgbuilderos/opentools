import {
  PRODUCTIVITY_OPERATIONS,
  runProductivityOperation,
} from '@/lib/tools/productivity-workbench';
import { adaptTextWorkbench } from './text-adapter';

export const productivityOperations = adaptTextWorkbench({
  source: 'productivity',
  operations: PRODUCTIVITY_OPERATIONS,
  run: runProductivityOperation,
  nondeterministic: new Set([
    'random-picker',
    'name-picker',
    'team-generator',
    'seating-chart-maker',
  ]),
});
