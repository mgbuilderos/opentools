export type PdfWorkerInput = {
  id: string;
  name: string;
  bytes: ArrayBuffer;
};

export type PdfInspectRequest = {
  type: 'inspect';
  inputs: PdfWorkerInput[];
};

export type PdfMergeRequest = {
  type: 'merge';
  inputs: PdfWorkerInput[];
};

export type PdfExtractRequest = {
  type: 'extract';
  input: PdfWorkerInput;
  pages: number[];
};

export type PdfWorkerRequest =
  | PdfInspectRequest
  | PdfMergeRequest
  | PdfExtractRequest;

export type PdfWorkerResponse =
  | {
      type: 'inspected';
      files: Array<{ id: string; pages: number }>;
    }
  | {
      type: 'progress';
      completed: number;
      total: number;
      phase: 'reading' | 'copying' | 'validating';
    }
  | {
      type: 'result';
      bytes: ArrayBuffer;
      pageCount: number;
      computeDurationMs: number;
      validationDurationMs: number;
    }
  | {
      type: 'error';
      code:
        | 'INVALID_PDF'
        | 'ENCRYPTED_PDF'
        | 'EMPTY_PDF'
        | 'MERGE_FAILED'
        | 'EXTRACT_FAILED';
      message: string;
      inputId?: string;
    };
