import {
  QR_BARCODE_OPERATIONS,
  runQrBarcodeOperation,
} from '@/lib/tools/qr-barcode-workbench';
import { adaptAsyncTextWorkbench } from './text-adapter';

export const qrBarcodeOperations = adaptAsyncTextWorkbench({
  source: 'qr-barcode',
  operations: QR_BARCODE_OPERATIONS,
  run: runQrBarcodeOperation,
});
