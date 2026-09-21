import type { GeneratedFile, LocalFileInput } from '@/lib/tools/file-workbench';

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

export interface OperationContext {
  text: string;
  files: readonly LocalFileInput[];
  params: Readonly<Record<string, string>>;
  signal: AbortSignal;
  onProgress?: (fraction: number) => void;
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
  notice?: string;
}

export interface KernelOperation extends KernelOperationDescriptor {
  run(context: OperationContext): Promise<OperationResult>;
}
