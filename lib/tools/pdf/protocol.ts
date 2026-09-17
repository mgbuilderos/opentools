export type PdfWorkerInput = {
  id: string;
  name: string;
  bytes: ArrayBuffer;
};

export type PdfImageInput = PdfWorkerInput & {
  mimeType: 'image/jpeg' | 'image/png';
};

export type ImagesToPdfOptions = {
  pageSize: 'image' | 'a4' | 'letter';
  orientation: 'auto' | 'portrait' | 'landscape';
  margin: 0 | 12 | 24 | 36;
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

export type PdfPageTransformOptions = {
  pageOrder: number[];
  rotation: 0 | 90 | 180 | 270;
  pageNumbers: boolean;
  watermark: string;
  metadata: {
    title: string;
    author: string;
    subject: string;
    keywords: string;
  };
  flatten?: boolean;
};

export type PdfTransformRequest = {
  type: 'transform';
  input: PdfWorkerInput;
  options: PdfPageTransformOptions;
};

export type ImagesToPdfRequest = {
  type: 'images-to-pdf';
  inputs: PdfImageInput[];
  options: ImagesToPdfOptions;
};

export type PdfCompressOptions = {
  /** Re-encode embedded JPEGs. Off means the lossless rewrite only. */
  recompressImages: boolean;
  /** JPEG quality, 1-100. Ignored when recompressImages is false. */
  imageQuality: number;
  /** Longest edge an embedded image may keep, in pixels. */
  maxImageDimension: number;
  removeMetadata: boolean;
};

export type PdfCompressRequest = {
  type: 'compress';
  input: PdfWorkerInput;
  options: PdfCompressOptions;
};

export type PdfWorkerRequest =
  | PdfInspectRequest
  | PdfMergeRequest
  | PdfExtractRequest
  | PdfTransformRequest
  | ImagesToPdfRequest
  | PdfCompressRequest;

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
      /** Set by compression only; every other task leaves these undefined. */
      originalByteLength?: number;
      compressedByteLength?: number;
      imagesRecompressed?: number;
      imagesLeftAlone?: number;
    }
  | {
      type: 'error';
      code:
        | 'INVALID_PDF'
        | 'ENCRYPTED_PDF'
        | 'EMPTY_PDF'
        | 'MERGE_FAILED'
        | 'EXTRACT_FAILED'
        | 'TRANSFORM_FAILED'
        | 'COMPRESS_FAILED'
        | 'IMAGE_TO_PDF_FAILED';
      message: string;
      inputId?: string;
    };
