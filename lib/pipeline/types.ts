import type { EngineDownload } from '@/lib/kernel/types';
import type { StreamingFileInput } from '@/lib/kernel/stream';

export interface PipelineStep {
  op: string;
  source: string;
  params: Readonly<Record<string, string>>;
}

export interface Pipeline {
  version: 1;
  name: string;
  steps: readonly PipelineStep[];
  droppedParams?: readonly string[];
}

export interface PipelineFileArtifact {
  name: string;
  path?: string;
  type: string;
  size: number;
  lastModified: number;
  /** Buffered operation output. The same view is handed to the next step. */
  bytes?: Uint8Array;
  /** Blob-backed input for operations that declare `streamable: true`. */
  stream?: StreamingFileInput;
}

export type PipelineArtifact =
  | { kind: 'none' }
  | { kind: 'text'; text: string }
  | { kind: 'file'; file: PipelineFileArtifact }
  | {
      kind: 'files';
      files: readonly PipelineFileArtifact[];
      summary?: string;
    };

export interface PipelineStepTrace {
  step: number;
  id: string;
  source: string;
  inputBytes: number;
  outputBytes: number | null;
  ms: number;
  status: 'done' | 'failed';
  engineDownloads: readonly EngineDownload[];
  error?: string;
}

export interface PipelineTrace {
  steps: readonly PipelineStepTrace[];
  engineDownloads: readonly (EngineDownload & {
    step: number;
    id: string;
    source: string;
  })[];
  /** Present only when every operation declares that content upload is none. */
  bytesUploaded?: 0;
}

export interface FailedPipelineStep {
  step: number;
  id: string;
  source: string;
  message: string;
}

export type PipelineExecutionResult =
  | {
      ok: true;
      artifact: PipelineArtifact;
      trace: PipelineTrace;
    }
  | {
      ok: false;
      lastGoodArtifact: PipelineArtifact;
      failedStep: FailedPipelineStep;
      trace: PipelineTrace;
    };
