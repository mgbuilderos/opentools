import {
  createStreamingFileInput,
  type BlobSliceSource,
} from '@/lib/kernel/stream';
import { getOperation } from '@/lib/kernel';
import type {
  EngineDownload,
  KernelOperation,
  OperationContext,
  OperationInputKind,
  OperationResult,
} from '@/lib/kernel/types';
import type { LocalFileInput } from '@/lib/tools/file-workbench';
import type {
  Pipeline,
  PipelineArtifact,
  PipelineExecutionResult,
  PipelineFileArtifact,
  PipelineStepTrace,
  PipelineTrace,
} from './types';
import { validate, type PipelineOperationResolver } from './validate';

const textEncoder = new TextEncoder();

export class PipelineValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PipelineValidationError';
  }
}

function messageFor(error: unknown): string {
  return error instanceof Error && error.message.trim()
    ? error.message
    : 'The step could not be completed.';
}

function artifactFiles(
  artifact: PipelineArtifact,
): readonly PipelineFileArtifact[] {
  if (artifact.kind === 'file') return [artifact.file];
  if (artifact.kind === 'files') return artifact.files;
  return [];
}

export function artifactBytes(artifact: PipelineArtifact): number {
  if (artifact.kind === 'text') return textEncoder.encode(artifact.text).length;
  return artifactFiles(artifact).reduce((total, file) => total + file.size, 0);
}

function acceptsArtifact(
  input: OperationInputKind,
  artifact: PipelineArtifact,
): boolean {
  if (input === 'none') return artifact.kind === 'none';
  if (input === 'text') return artifact.kind === 'text';
  if (input === 'file')
    return artifact.kind === 'file' || artifact.kind === 'files';
  return artifact.kind === 'file' || artifact.kind === 'files';
}

function streamingSourceFromBytes(bytes: Uint8Array): BlobSliceSource {
  return {
    size: bytes.byteLength,
    slice(start, end) {
      const chunk = bytes.slice(start, end);
      return {
        size: chunk.byteLength,
        async arrayBuffer() {
          return chunk.buffer;
        },
      };
    },
  };
}

function asStreamingFile(file: PipelineFileArtifact) {
  if (file.stream) return file.stream;
  if (!file.bytes)
    throw new Error(`${file.name} has neither buffered nor streaming bytes.`);
  return createStreamingFileInput(streamingSourceFromBytes(file.bytes), {
    name: file.name,
    ...(file.path ? { path: file.path } : {}),
    type: file.type,
    lastModified: file.lastModified,
  });
}

async function materialiseFile(
  file: PipelineFileArtifact,
  signal: AbortSignal,
): Promise<LocalFileInput> {
  if (file.bytes) {
    return {
      name: file.name,
      ...(file.path ? { path: file.path } : {}),
      type: file.type,
      size: file.size,
      lastModified: file.lastModified,
      bytes: file.bytes,
    };
  }
  if (!file.stream)
    throw new Error(`${file.name} has neither buffered nor streaming bytes.`);
  const bytes = new Uint8Array(file.size);
  const reader = file.stream.stream(signal).getReader();
  let offset = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes.set(value, offset);
    offset += value.byteLength;
  }
  if (offset !== file.size)
    throw new Error(
      `${file.name} ended after ${offset} of ${file.size} bytes.`,
    );
  return {
    name: file.name,
    ...(file.path ? { path: file.path } : {}),
    type: file.type,
    size: file.size,
    lastModified: file.lastModified,
    bytes,
  };
}

async function contextFor(
  artifact: PipelineArtifact,
  operation: KernelOperation,
  params: Readonly<Record<string, string>>,
  signal: AbortSignal,
  engineDownloads: EngineDownload[],
): Promise<OperationContext> {
  const files = artifactFiles(artifact);
  for (const file of files) {
    if (file.bytes && file.bytes.byteLength !== file.size) {
      throw new Error(
        `${file.name} has ${file.bytes.byteLength} buffered bytes but declares ${file.size}.`,
      );
    }
    if (
      operation.inputLimitBytes !== undefined &&
      file.size > operation.inputLimitBytes
    ) {
      throw new Error(
        `${file.name} is ${file.size} bytes; ${operation.name} accepts at most ${operation.inputLimitBytes} bytes.`,
      );
    }
  }
  const reportEngineDownload = (download: EngineDownload) => {
    if (operation.transfer?.engineAssets !== 'reported') {
      throw new Error(
        `${operation.name} reported an engine download without declaring reported engine assets.`,
      );
    }
    if (
      !download.name.trim() ||
      !Number.isSafeInteger(download.bytes) ||
      download.bytes < 0
    ) {
      throw new Error(`${operation.name} reported an invalid engine download.`);
    }
    engineDownloads.push({ ...download });
  };

  if (operation.streamable === true && files.length) {
    return {
      text: '',
      files: [],
      streams: files.map(asStreamingFile),
      params,
      signal,
      reportEngineDownload,
    };
  }
  return {
    text: artifact.kind === 'text' ? artifact.text : '',
    files: await Promise.all(
      files.map((file) => materialiseFile(file, signal)),
    ),
    params,
    signal,
    reportEngineDownload,
  };
}

function artifactFor(result: OperationResult): PipelineArtifact {
  if (result.kind === 'text') return { kind: 'text', text: result.text };
  return {
    kind: 'files',
    files: result.files.map((file) => ({
      name: file.name,
      type: file.type,
      size: file.bytes.byteLength,
      lastModified: 0,
      bytes: file.bytes,
    })),
    summary: result.summary,
  };
}

function buildTrace(
  steps: readonly PipelineStepTrace[],
  operations: readonly KernelOperation[],
): PipelineTrace {
  const engineDownloads = steps.flatMap((step) =>
    step.engineDownloads.map((download) => ({
      ...download,
      step: step.step,
      id: step.id,
      source: step.source,
    })),
  );
  return {
    steps,
    engineDownloads,
    ...(operations.every(
      (operation) => operation.transfer?.userContentUpload === 'none',
    )
      ? { bytesUploaded: 0 as const }
      : {}),
  };
}

function resolveOperations(
  pipeline: Pipeline,
  resolveOperation: PipelineOperationResolver,
): readonly KernelOperation[] {
  const errors = validate(pipeline, resolveOperation);
  if (errors.length)
    throw new PipelineValidationError(`Invalid pipeline: ${errors.join(' ')}`);
  return pipeline.steps.map((step) =>
    resolveOperation(step.op, step.source),
  ) as readonly KernelOperation[];
}

export interface ExecutePipelineOptions {
  pipeline: Pipeline;
  input: PipelineArtifact;
  signal: AbortSignal;
  resolveOperation?: PipelineOperationResolver;
}

/** Executes one artifact through an already-saved pipeline without downloads. */
export async function executePipeline(
  options: ExecutePipelineOptions,
): Promise<PipelineExecutionResult> {
  const resolveOperation = options.resolveOperation ?? getOperation;
  const operations = resolveOperations(options.pipeline, resolveOperation);
  const first = operations[0]!;
  if (!acceptsArtifact(first.input, options.input)) {
    throw new PipelineValidationError(
      `Invalid pipeline input: ${first.name} accepts ${first.input}, not ${options.input.kind}.`,
    );
  }

  let current = options.input;
  const traces: PipelineStepTrace[] = [];
  for (let index = 0; index < operations.length; index += 1) {
    const operation = operations[index]!;
    const step = options.pipeline.steps[index]!;
    const inputBytes = artifactBytes(current);
    const engineDownloads: EngineDownload[] = [];
    const started = performance.now();
    try {
      const context = await contextFor(
        current,
        operation,
        step.params,
        options.signal,
        engineDownloads,
      );
      const result = await operation.run(context);
      current = artifactFor(result);
      traces.push({
        step: index + 1,
        id: operation.id,
        source: operation.source,
        inputBytes,
        outputBytes: artifactBytes(current),
        ms: performance.now() - started,
        status: 'done',
        engineDownloads,
      });
    } catch (error) {
      const message = messageFor(error);
      traces.push({
        step: index + 1,
        id: operation.id,
        source: operation.source,
        inputBytes,
        outputBytes: null,
        ms: performance.now() - started,
        status: 'failed',
        engineDownloads,
        error: message,
      });
      return {
        ok: false,
        lastGoodArtifact: current,
        failedStep: {
          step: index + 1,
          id: operation.id,
          source: operation.source,
          message,
        },
        trace: buildTrace(traces, operations),
      };
    }
  }

  return {
    ok: true,
    artifact: current,
    trace: buildTrace(traces, operations),
  };
}

export interface BlobArtifactMetadata {
  name?: string;
  path?: string;
  type?: string;
  lastModified?: number;
  chunkSizeBytes?: number;
}

export function artifactFromBlob(
  blob: Blob,
  metadata: BlobArtifactMetadata = {},
): PipelineArtifact {
  const named = blob as Blob & { name?: string; lastModified?: number };
  const stream = createStreamingFileInput(
    blob,
    {
      name: metadata.name ?? named.name ?? 'input.bin',
      ...(metadata.path ? { path: metadata.path } : {}),
      type: metadata.type ?? blob.type,
      lastModified: metadata.lastModified ?? named.lastModified ?? 0,
    },
    metadata.chunkSizeBytes,
  );
  return {
    kind: 'file',
    file: {
      name: stream.name,
      ...(stream.path ? { path: stream.path } : {}),
      type: stream.type,
      size: stream.size,
      lastModified: stream.lastModified,
      stream,
    },
  };
}
