import { runBatch } from '@/lib/batch/run';
import { outputName, type BenchInput, type BenchOutput } from '@/lib/bench/run';
import { getOperation } from '@/lib/kernel';
import type {
  KernelOperation,
  OperationResult,
  OutputFile,
} from '@/lib/kernel/types';
import type { LocalFileInput } from '@/lib/tools/file-workbench';
import type { Pipeline } from './types';
import { validate, type PipelineOperationResolver } from './validate';

function messageFor(cause: unknown): string {
  if (cause instanceof Error && cause.message.trim()) return cause.message;
  return 'The step could not be completed.';
}

function stemAndExtension(name: string) {
  const dot = name.lastIndexOf('.');
  return dot > 0
    ? { stem: name.slice(0, dot), extension: name.slice(dot + 1) }
    : { stem: name, extension: '' };
}

async function localFile(input: BenchInput): Promise<LocalFileInput> {
  const bytes = new Uint8Array(await input.file.arrayBuffer());
  return {
    name: input.name,
    path: input.path,
    type: input.file.type,
    size: bytes.byteLength,
    lastModified: input.file.lastModified,
    bytes,
  };
}

function generatedFile(file: OutputFile): LocalFileInput {
  return {
    name: file.name,
    path: file.name,
    type: file.type,
    size: file.bytes.byteLength,
    lastModified: 0,
    bytes: file.bytes,
  };
}

function finalOutputs(
  result: OperationResult,
  operation: KernelOperation,
  input: BenchInput,
  inputIndex: number,
  template: string,
): BenchOutput[] {
  const source = stemAndExtension(input.name);
  const date = new Date().toISOString().slice(0, 10);
  if (result.kind === 'text') {
    const extension = operation.output.extension ?? 'txt';
    return [
      {
        blob: new Blob([result.text], { type: 'text/plain;charset=utf-8' }),
        fileName: outputName(template, {
          name: source.stem,
          ext: extension,
          index: inputIndex + 1,
          operation: operation.id,
          date,
        }),
        summary: `${result.text.length.toLocaleString()} characters`,
      },
    ];
  }
  return result.files.map((file, fileIndex) => {
    const generated = stemAndExtension(file.name);
    const extension =
      generated.extension || operation.output.extension || source.extension;
    return {
      blob: new Blob([Uint8Array.from(file.bytes)], { type: file.type }),
      fileName: outputName(template, {
        name:
          result.files.length === 1
            ? source.stem
            : `${source.stem}-${fileIndex + 1}`,
        ext: extension,
        index: inputIndex + 1,
        operation: operation.id,
        date,
      }),
      summary: result.summary,
    };
  });
}

async function runSteps(options: {
  input: BenchInput;
  inputIndex: number;
  pipeline: Pipeline;
  operations: readonly KernelOperation[];
  template: string;
  signal: AbortSignal;
}): Promise<BenchOutput[]> {
  let currentText = '';
  let currentFiles: readonly LocalFileInput[] = [
    await localFile(options.input),
  ];
  let finalResult: OperationResult | undefined;

  for (let index = 0; index < options.operations.length; index += 1) {
    const operation = options.operations[index]!;
    const step = options.pipeline.steps[index]!;
    if (index === 0 && operation.input === 'text') {
      currentText = new TextDecoder().decode(currentFiles[0]?.bytes);
      currentFiles = [];
    }

    try {
      finalResult = await operation.run({
        text: operation.input === 'text' ? currentText : '',
        files:
          operation.input === 'file' || operation.input === 'files'
            ? currentFiles
            : [],
        params: step.params,
        signal: options.signal,
      });
    } catch (cause) {
      if (options.signal.aborted) throw cause;
      throw new Error(
        `Step ${index + 1} "${operation.name}" (${operation.id} @ ${operation.source}) failed: ${messageFor(cause)}`,
      );
    }

    if (finalResult.kind === 'text') {
      currentText = finalResult.text;
      currentFiles = [];
    } else {
      currentFiles = finalResult.files.map(generatedFile);
      currentText = '';
    }
  }

  if (!finalResult) throw new Error('The pipeline has no steps to run.');
  return finalOutputs(
    finalResult,
    options.operations.at(-1)!,
    options.input,
    options.inputIndex,
    options.template,
  );
}

export interface RunPipelineOptions {
  inputs: readonly BenchInput[];
  pipeline: Pipeline;
  template: string;
  signal: AbortSignal;
  onProgress?: Parameters<
    typeof runBatch<BenchInput, BenchOutput[]>
  >[0]['onProgress'];
  resolveOperation?: PipelineOperationResolver;
}

export async function runPipeline(options: RunPipelineOptions) {
  const resolveOperation = options.resolveOperation ?? getOperation;
  const errors = validate(options.pipeline, resolveOperation);
  if (errors.length) throw new Error(errors.join(' '));
  const operations = options.pipeline.steps.map((step) =>
    resolveOperation(step.op, step.source)!,
  );

  return runBatch({
    inputs: options.inputs,
    signal: options.signal,
    onProgress: options.onProgress,
    process: async (input, inputIndex, signal) => ({
      status: 'done' as const,
      output: await runSteps({
        input,
        inputIndex,
        pipeline: options.pipeline,
        operations,
        template: options.template,
        signal,
      }),
    }),
  });
}
