import {
  SUBTITLE_OPERATIONS,
  runSubtitleOperation,
} from '@/lib/tools/subtitle-workbench';
import { adaptTextWorkbench } from './text-adapter';

export const subtitleOperations = adaptTextWorkbench({
  source: 'subtitle',
  operations: SUBTITLE_OPERATIONS,
  run: runSubtitleOperation,
});
