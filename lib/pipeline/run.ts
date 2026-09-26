import { runBatch } from '@/lib/batch/run';
import { outputName, type BenchInput, type BenchOutput } from '@/lib/bench/run';
import { getOperation } from '@/lib/kernel';
import type { KernelOperation } from '@/lib/kernel/types';
import { artifactFromBlob, executePipeline } from './execute';
import type {
  Pipeline,
  PipelineArtifact,
  PipelineFileArtifact,
  PipelineTrace,
} from './types';
import { validate, type PipelineOperationResolver } from './validate';

/**
 * The bench's folder runner, on top of `executePipeline`.
 *
 * WHY IT DELEGATES. This module used to walk the steps itself, and the two
 * implementations had drifted: `execute.ts` handed a `streamable` operation a
 * blob-backed `StreamingFileInput` and recorded a per-step trace, while the
 * loop here read every input into memory with `arrayBuffer()` and kept no
 * measurements at all. The weaker of the two was the one the bench ran, on the
 * page whose whole offer is a folder of four thousand files. There is one
 * execution path now, and it is the one that can stream.
 *
 * What stays here is what the *bench* adds on top: turning a `File` into the
 * artifact the first step accepts, naming outputs from the user's template,
 * and running the batch so one bad file does not stop the folder.
 */

function stemAndExtension(name: string) {
  const dot = name.lastIndexOf('.');
  return dot > 0
    ? { stem: name.slice(0, dot), extension: name.slice(dot + 1) }
    : { stem: name, extension: '' };
}

/**
 * A text-input first step gets the file decoded, not the file. The bench feeds
 * whatever is on disk, so without this a chain beginning with a text operation
 * would be refused for handing a file to something that wanted text.
 */
async function inputArtifact(
  input: BenchInput,
  first: KernelOperation,
): Promise<PipelineArtifact> {
  if (first.input === 'text')
    return { kind: 'text', text: await input.file.text() };
  return artifactFromBlob(input.file, {
    name: input.name,
    path: input.path,
    type: input.file.type,
    lastModified: input.file.lastModified,
  });
}

function bytesOf(file: PipelineFileArtifact): Uint8Array {
  if (!file.bytes)
    throw new Error(`${file.name} produced no bytes to write out.`);
  return file.bytes;
}

function artifactFiles(
  artifact: PipelineArtifact,
): readonly PipelineFileArtifact[] {
  if (artifact.kind === 'file') return [artifact.file];
  if (artifact.kind === 'files') return artifact.files;
  return [];
}

function finalOutputs(
  artifact: PipelineArtifact,
  operation: KernelOperation,
  input: BenchInput,
  inputIndex: number,
  template: string,
): BenchOutput[] {
  const source = stemAndExtension(input.name);
  const date = new Date().toISOString().slice(0, 10);

  if (artifact.kind === 'text') {
    const extension = operation.output.extension ?? 'txt';
    return [
      {
        blob: new Blob([artifact.text], { type: 'text/plain;charset=utf-8' }),
        fileName: outputName(template, {
          name: source.stem,
          ext: extension,
          index: inputIndex + 1,
          operation: operation.id,
          date,
        }),
        summary: `${artifact.text.length.toLocaleString()} characters`,
      },
    ];
  }

  const files = artifactFiles(artifact);
  const summary = artifact.kind === 'files' ? artifact.summary : undefined;
  return files.map((file, fileIndex) => {
    const generated = stemAndExtension(file.name);
    const extension =
      generated.extension || operation.output.extension || source.extension;
    return {
      blob: new Blob([Uint8Array.from(bytesOf(file))], { type: file.type }),
      fileName: outputName(template, {
        name:
          files.length === 1 ? source.stem : `${source.stem}-${fileIndex + 1}`,
        ext: extension,
        index: inputIndex + 1,
        operation: operation.id,
        date,
      }),
      // `artifactFor` always carries the operation's own summary; the size is
      // the honest fallback for an artifact that reached here without one.
      summary: summary ?? `${file.size.toLocaleString()} bytes`,
    };
  });
}

export interface RunPipelineOptions {
  inputs: readonly BenchInput[];
  pipeline: Pipeline;
  template: string;
  signal: AbortSignal;
  onProgress?: Parameters<
    typeof runBatch<BenchInput, BenchOutput[]>
  >[0]['onProgress'];
  /** Per-input measurements, for the receipt. Reported for failures too. */
  onTrace?: (trace: PipelineTrace, input: BenchInput, index: number) => void;
  resolveOperation?: PipelineOperationResolver;
}

export async function runPipeline(options: RunPipelineOptions) {
  const resolveOperation = options.resolveOperation ?? getOperation;
  const errors = validate(options.pipeline, resolveOperation);
  if (errors.length) throw new Error(errors.join(' '));
  const operations = options.pipeline.steps.map((step) =>
    resolveOperation(step.op, step.source)!,
  );
  const first = operations[0]!;
  const last = operations.at(-1)!;

  return runBatch({
    inputs: options.inputs,
    signal: options.signal,
    onProgress: options.onProgress,
    process: async (input, inputIndex, signal) => {
      const result = await executePipeline({
        pipeline: options.pipeline,
        input: await inputArtifact(input, first),
        signal,
        resolveOperation,
      });
      options.onTrace?.(result.trace, input, inputIndex);

      if (!result.ok) {
        const { step, id, source, message } = result.failedStep;
        const failed = operations[step - 1];
        throw new Error(
          `Step ${step} "${failed?.name ?? id}" (${id} @ ${source}) failed: ${message}`,
        );
      }

      return {
        status: 'done' as const,
        output: finalOutputs(
          result.artifact,
          last,
          input,
          inputIndex,
          options.template,
        ),
      };
    },
  });
}
