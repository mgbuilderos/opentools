'use client';

import { SchemaWorkbenchTool } from '@/components/schema-workbench-tool';
import {
  QR_BARCODE_OPERATIONS,
  runQrBarcodeOperation,
} from '@/lib/tools/qr-barcode-workbench';

/*
  The two optional props are what let this workbench also serve as one tool on
  its own page: `app/<category>/[tool]/page.tsx` renders it once per operation
  with that operation's id and the category prefix. Unset, every behaviour is
  exactly what it was, and the workbench URL keeps working for anyone holding
  it.
*/
export function QrBarcodeWorkbenchTool({
  initialOperationId = 'qr-code-generator',
  routedBasePath,
}: {
  initialOperationId?: string;
  routedBasePath?: string;
} = {}) {
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
      initialOperationId={initialOperationId}
      routedBasePath={routedBasePath}
      run={runQrBarcodeOperation}
    />
  );
}
