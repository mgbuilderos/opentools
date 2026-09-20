export interface OcrBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface OcrWord {
  text: string;
  confidence: number;
  box: OcrBox;
  lowConfidence: boolean;
}

export interface OcrResult {
  text: string;
  words: OcrWord[];
  confidence: number;
  width: number;
  height: number;
}

export interface OcrProgress {
  status: string;
  progress: number;
}

export interface RecogniseOptions {
  signal?: AbortSignal;
  lowConfidenceThreshold?: number;
  onProgress?: (progress: OcrProgress) => void;
}

export interface OcrSession {
  recognise(image: Blob, options?: RecogniseOptions): Promise<OcrResult>;
  terminate(): Promise<void>;
}
