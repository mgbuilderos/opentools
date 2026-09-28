import {
  FILE_WORKBENCH_OPERATIONS,
  runFileWorkbenchOperation,
} from '@/lib/tools/file-workbench';
import { adaptFileWorkbench } from './file-adapter';
import { FILE_STREAM_PREFIX_BYTES } from './file-stream-prefixes';

export const fileOperations = adaptFileWorkbench({
  source: 'file-workbench',
  operations: FILE_WORKBENCH_OPERATIONS,
  run: runFileWorkbenchOperation,
  nondeterministic: new Set(['file-encrypt']),
  streamPrefixBytes: FILE_STREAM_PREFIX_BYTES,
});
