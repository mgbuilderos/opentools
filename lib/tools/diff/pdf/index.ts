import { linearizePdfDocument } from './linearize';
import type { PdfDiffResult } from './types';
import { computeWordDiff } from './word-diff';

export * from './types';
export { generateAnnotatedPdf } from './annotated-pdf';
export { generateChangeListCsv } from './change-list';
export { generateRedlineDocx } from './redline-docx';

export interface ComparePdfOptions {
  docAName?: string;
  docBName?: string;
}

export async function comparePdfs(
  pdfBytesA: Uint8Array,
  pdfBytesB: Uint8Array,
  options: ComparePdfOptions = {},
): Promise<PdfDiffResult> {
  const docAName = options.docAName || 'Original Document.pdf';
  const docBName = options.docBName || 'Revised Document.pdf';

  // 1. Linearize both documents into whole-document word streams
  // Refuses scans with no text layer by throwing NoTextLayerError
  const [docA, docB] = await Promise.all([
    linearizePdfDocument(pdfBytesA, 'A', docAName),
    linearizePdfDocument(pdfBytesB, 'B', docBName),
  ]);

  // 2. Perform whole-document word-level diff
  return computeWordDiff(
    docA.words,
    docB.words,
    docAName,
    docBName,
    docA.pageCount,
    docB.pageCount,
  );
}
