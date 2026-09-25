import type { GeneratedFile, LocalFileInput } from '@/lib/tools/file-workbench';
import type { StreamingFileInput } from './stream';

export type OperationInputKind = 'text' | 'file' | 'files' | 'none';
export type OperationRuntime = 'pure' | 'web' | 'worker';

/**
 * Kept open deliberately: Phase 2b may register sources such as
 * `engine:metadata` without widening a central enum.
 */
export type OperationSource = string;
export type WorkbenchSource = OperationSource;

export interface OperationParam {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'boolean';
  defaultValue: string;
  options?: readonly { value: string; label: string }[];
  /** Only declared settings may be written to a pipeline or link. */
  serialisable: boolean;
}

export interface OperationOutput {
  kind: 'text' | 'files';
  extension?: string;
}

export interface EngineDownload {
  name: string;
  bytes: number;
}

export interface OperationTransferPolicy {
  /** Whether this operation can send the visitor's content over a network. */
  userContentUpload: 'none' | 'possible';
  /** `reported` means every engine/model download is reported through context. */
  engineAssets: 'none' | 'reported';
}

export interface OperationContext {
  text: string;
  files: readonly LocalFileInput[];
  /** Present instead of `files` when a streamable operation receives Blob data. */
  streams?: readonly StreamingFileInput[];
  params: Readonly<Record<string, string>>;
  signal: AbortSignal;
  onProgress?: (fraction: number) => void;
  reportEngineDownload?: (download: EngineDownload) => void;
}

export type OutputFile = GeneratedFile;

export type OperationResult =
  | { kind: 'text'; text: string }
  | { kind: 'files'; files: readonly OutputFile[]; summary: string };

export interface KernelOperationDescriptor {
  id: string;
  source: OperationSource;
  name: string;
  description: string;
  input: OperationInputKind;
  params: readonly OperationParam[];
  output: OperationOutput;
  runtime: OperationRuntime;
  deterministic: boolean;
  /** Explicit in the public manifest; omitted legacy adapters resolve to false. */
  streamable?: boolean;
  /** Maximum accepted input even when device memory would permit more. */
  inputLimitBytes?: number;
  /** Peak working-set bytes expected per byte of buffered input. */
  workingSetMultiplier?: number;
  /** Maximum chunk retained by the streaming implementation. */
  chunkSizeBytes?: number;
  transfer?: OperationTransferPolicy;
  notice?: string;
}

export interface KernelOperation extends KernelOperationDescriptor {
  run(context: OperationContext): Promise<OperationResult>;
}
