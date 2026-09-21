import {
  ADVANCED_DEVELOPER_OPERATIONS,
  runAdvancedDeveloperOperation,
} from '@/lib/tools/developer-advanced-workbench';
import { adaptAsyncTextWorkbench } from './text-adapter';

export const developerAdvancedOperations = adaptAsyncTextWorkbench({
  source: 'developer-advanced',
  operations: ADVANCED_DEVELOPER_OPERATIONS,
  run: runAdvancedDeveloperOperation,
  nondeterministic: new Set([
    'ulid-generator',
    'nano-id-generator',
    'random-token-generator',
    'password-generator',
  ]),
});
