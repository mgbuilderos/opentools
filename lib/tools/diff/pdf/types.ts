export type DiffChangeType = 'insert' | 'delete' | 'move' | 'format';

export interface DiffWord {
  id: string; // e.g. "docA_p1_w0"
  text: string;
  normalizedText: string;
  pageNumber: number; // 1-indexed
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  bold: boolean;
  itemIndex: number;
}

export interface PdfDiffChange {
  id: string;
  type: DiffChangeType;
  pageA?: number;
  pageB?: number;
  originalText?: string;
  revisedText?: string;
  wordsA?: DiffWord[];
  wordsB?: DiffWord[];
  description: string;
  // Bounding boxes for DOM overlays and PDF highlights
  boxA?: { page: number; x: number; y: number; width: number; height: number };
  boxB?: { page: number; x: number; y: number; width: number; height: number };
  movedFromPage?: number;
  movedToPage?: number;
}

export interface PageDiffSummary {
  pageNumber: number;
  insertCount: number;
  deleteCount: number;
  moveCount: number;
  formatCount: number;
  hasSubstantiveChanges: boolean;
}

export interface PdfDiffSummary {
  docAName: string;
  docBName: string;
  pageCountA: number;
  pageCountB: number;
  totalWordsA: number;
  totalWordsB: number;
  totalChanges: number;
  insertions: number;
  deletions: number;
  moves: number;
  formatOnly: number;
  changedPagesA: number[];
  changedPagesB: number[];
  pageSummariesA: PageDiffSummary[];
  pageSummariesB: PageDiffSummary[];
}

export interface PdfDiffResult {
  summary: PdfDiffSummary;
  changes: PdfDiffChange[];
  streamA: DiffWord[];
  streamB: DiffWord[];
}

export class NoTextLayerError extends Error {
  code: 'NO_TEXT_LAYER';
  documentSide: 'A' | 'B' | 'both';
  documentName?: string;

  constructor(documentSide: 'A' | 'B' | 'both', docName?: string) {
    const sideName =
      documentSide === 'both'
        ? 'Both PDFs'
        : `Document ${documentSide}${docName ? ` (${docName})` : ''}`;
    super(
      `${sideName} contains no text layer (scanned pages only). Run it through /pdf/ocr to extract text before comparing.`,
    );
    this.name = 'NoTextLayerError';
    this.code = 'NO_TEXT_LAYER';
    this.documentSide = documentSide;
    this.documentName = docName;
  }
}
