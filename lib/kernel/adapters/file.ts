import {
  FILE_WORKBENCH_OPERATIONS,
  runFileWorkbenchOperation,
} from '@/lib/tools/file-workbench';
import { adaptFileWorkbench } from './file-adapter';
import {
  FILE_STREAM_PREFIX_BYTES,
  FILE_STREAM_WINDOWS,
} from './file-stream-prefixes';

export const fileOperations = adaptFileWorkbench({
  source: 'file-workbench',
  operations: FILE_WORKBENCH_OPERATIONS,
  run: runFileWorkbenchOperation,
  nondeterministic: new Set(['file-encrypt']),
  streamPrefixBytes: FILE_STREAM_PREFIX_BYTES,
  streamWindows: FILE_STREAM_WINDOWS,
});
