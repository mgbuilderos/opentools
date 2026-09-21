import { MATH_OPERATIONS, runMathOperation } from '@/lib/tools/math-workbench';
import { adaptTextWorkbench } from './text-adapter';

export const mathOperations = adaptTextWorkbench({
  source: 'math',
  operations: MATH_OPERATIONS,
  run: runMathOperation,
  nondeterministic: new Set([
    'random-number-generator',
    'dice-roller',
    'coin-flipper',
  ]),
});
