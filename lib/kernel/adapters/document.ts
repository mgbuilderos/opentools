import {
  DOCUMENT_OPERATIONS,
  runDocumentOperation,
} from '@/lib/tools/document-workbench';
import { adaptTextWorkbench } from './text-adapter';

export const documentOperations = adaptTextWorkbench({
  source: 'document',
  operations: DOCUMENT_OPERATIONS,
  run: runDocumentOperation,
});
