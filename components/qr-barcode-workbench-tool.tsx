'use client';

import { SchemaWorkbenchTool } from '@/components/schema-workbench-tool';
import {
  QR_BARCODE_OPERATIONS,
  runQrBarcodeOperation,
} from '@/lib/tools/qr-barcode-workbench';

export function QrBarcodeWorkbenchTool() {
  return (
    <SchemaWorkbenchTool
      currentToolId="qr-barcode-workbench"
      eyebrow="QR & barcodes"
      title="QR & barcode workbench"
      introduction="Create payload-specific QR symbols, local batch sheets, recovery-level comparisons, and common linear barcodes as downloadable SVG—without a redirect service or upload."
      selectorLabel="Code tool"
      actionLabel="Generate locally"
      methodLabel="Local QR encoding or deterministic barcode patterns"
      operations={QR_BARCODE_OPERATIONS}
      initialOperationId="qr-code-generator"
      run={runQrBarcodeOperation}
    />
  );
}
