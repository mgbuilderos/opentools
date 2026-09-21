import {
  SPREADSHEET_OPERATIONS,
  runSpreadsheetOperation,
} from '@/lib/tools/spreadsheet-workbench';
import { adaptTextWorkbench } from './text-adapter';

export const spreadsheetOperations = adaptTextWorkbench({
  source: 'spreadsheet',
  operations: SPREADSHEET_OPERATIONS,
  run: runSpreadsheetOperation,
  nondeterministic: new Set(['data-sampling-tool', 'random-row-selector']),
});
