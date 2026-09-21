import { createBatchZip, runBatch } from '@/lib/batch/run';
import type { KernelOperation, OperationResult } from '@/lib/kernel/types';
import type { LocalFileInput } from '@/lib/tools/file-workbench';

export interface BenchInput {
  file: File;
  name: string;
  path: string;
}

export interface BenchOutput {
  blob: Blob;
  fileName: string;
  summary: string;
}

export interface NameTemplateValues {
  name: string;
  ext: string;
  index: number;
  operation: string;
  date: string;
}

export function outputName(
  template: string,
  values: NameTemplateValues,
): string {
  const rendered = template.replace(
    /\{(name|ext|index|operation|date)\}/gu,
    (_, key: keyof NameTemplateValues) => String(values[key]),
  );
  const safe = Array.from(rendered, (character) => {
    const code = character.codePointAt(0) ?? 0;
    return code < 32 || '/\\:?*"<>|'.includes(character) ? '_' : character;
  }).join('');
  return safe.replace(/^\.+/u, '_') || 'result';
}

function stemAndExtension(name: string) {
  const dot = name.lastIndexOf('.');
  return dot > 0
    ? { stem: name.slice(0, dot), extension: name.slice(dot + 1) }
    : { stem: name, extension: '' };
}

async function localFile(input: BenchInput): Promise<LocalFileInput> {
  return {
    name: input.name,
    path: input.path,
    type: input.file.type,
    size: input.file.size,
    lastModified: input.file.lastModified,
    bytes: new Uint8Array(await input.file.arrayBuffer()),
  };
}

async function resultOutputs(
  result: OperationResult,
  operation: KernelOperation,
  input: BenchInput,
  index: number,
  template: string,
): Promise<BenchOutput[]> {
  const source = stemAndExtension(input.name);
  const date = new Date().toISOString().slice(0, 10);
  if (result.kind === 'text') {
    const ext = operation.output.extension ?? 'txt';
    return [
      {
        blob: new Blob([result.text], { type: 'text/plain;charset=utf-8' }),
        fileName: outputName(template, {
          name: source.stem,
          ext,
          index: index + 1,
          operation: operation.id,
          date,
        }),
        summary: `${result.text.length.toLocaleString()} characters`,
      },
    ];
  }
  return result.files.map((file, fileIndex) => {
    const generated = stemAndExtension(file.name);
    const ext =
      generated.extension || operation.output.extension || source.extension;
    const base = outputName(template, {
      name:
        result.files.length === 1
          ? source.stem
          : `${source.stem}-${fileIndex + 1}`,
      ext,
      index: index + 1,
      operation: operation.id,
      date,
    });
    return {
      blob: new Blob([Uint8Array.from(file.bytes)], { type: file.type }),
      fileName: base,
      summary: result.summary,
    };
  });
}

export async function runBenchInput(options: {
  input: BenchInput;
  index: number;
  operation: KernelOperation;
  params: Readonly<Record<string, string>>;
  template: string;
  signal: AbortSignal;
}): Promise<BenchOutput[]> {
  const file = await localFile(options.input);
  const text =
    options.operation.input === 'text'
      ? new TextDecoder().decode(file.bytes)
      : '';
  const result = await options.operation.run({
    text,
    files: options.operation.input === 'none' ? [] : [file],
    params: options.params,
    signal: options.signal,
  });
  return resultOutputs(
    result,
    options.operation,
    options.input,
    options.index,
    options.template,
  );
}

export async function runBench(options: {
  inputs: readonly BenchInput[];
  operation: KernelOperation;
  params: Readonly<Record<string, string>>;
  template: string;
  signal: AbortSignal;
  onProgress?: Parameters<
    typeof runBatch<BenchInput, BenchOutput[]>
  >[0]['onProgress'];
}) {
  return runBatch({
    inputs: options.inputs,
    signal: options.signal,
    onProgress: options.onProgress,
    process: async (input, index, signal) => ({
      status: 'done',
      output: await runBenchInput({ ...options, input, index, signal }),
    }),
  });
}

export async function zipBenchOutputs(outputs: readonly BenchOutput[]) {
  return createBatchZip(outputs);
}
