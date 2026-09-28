import type {
  FileWorkbenchOperation,
  FileWorkbenchResult,
  LocalFileInput,
} from '@/lib/tools/file-workbench';
import type { StreamingFileInput } from '@/lib/kernel/stream';
import type {
  KernelOperation,
  OperationContext,
  OperationParam,
  OperationResult,
  OperationRuntime,
  OperationSource,
} from '@/lib/kernel/types';

type FileRunner = (
  operationId: string,
  values: Record<string, string>,
  files: readonly LocalFileInput[],
) => Promise<FileWorkbenchResult>;

export interface FileAdapterOptions {
  source: OperationSource;
  operations: readonly FileWorkbenchOperation[];
  run: FileRunner;
  runtime?: OperationRuntime | Readonly<Record<string, OperationRuntime>>;
  serialisableTextParams?: ReadonlySet<string>;
  nondeterministic?: ReadonlySet<string>;
  /**
   * Operation id → the number of leading bytes that operation reads.
   *
   * A workbench operation is written against a buffered `LocalFileInput`, so
   * the honest way to make one streamable is not to rewrite it: it is to say
   * how little of the file it actually looks at. An operation listed here is
   * declared `streamable`, and the pipeline hands it a bounded prefix read out
   * of the Blob instead of the whole file. `0` means it reads no content at
   * all — name, size and type are all it touches.
   *
   * Declaring too few bytes is a bug, and `file-adapter.test.ts` is built to
   * catch it: every listed operation must produce byte-identical output from
   * the prefix and from the complete file.
   */
  streamPrefixBytes?: Readonly<Record<string, number>>;
}

function abortError(): DOMException {
  return new DOMException('The operation was cancelled.', 'AbortError');
}

/**
 * Reads each input down to the declared prefix. The Blob is sliced once, so a
 * two-gigabyte video handed to an operation that reads sixty-four bytes costs
 * sixty-four bytes, not two gigabytes.
 */
async function prefixInputs(
  streams: readonly StreamingFileInput[],
  prefixBytes: number,
  signal: AbortSignal,
): Promise<readonly LocalFileInput[]> {
  return Promise.all(
    streams.map(async (stream) => {
      const wanted = Math.min(prefixBytes, stream.size);
      const truncated = wanted < stream.size;
      return {
        name: stream.name,
        ...(stream.path ? { path: stream.path } : {}),
        type: stream.type,
        size: stream.size,
        lastModified: stream.lastModified,
        bytes:
          wanted > 0 ? await stream.read(0, wanted, signal) : new Uint8Array(0),
        // Only when the bytes really are short of the file: a small file read
        // whole stays under the strict size/length integrity check.
        ...(truncated ? { bytesArePrefix: true as const } : {}),
      };
    }),
  );
}

function resolvePrefixes(
  options: FileAdapterOptions,
): ReadonlyMap<string, number> {
  const prefixes = new Map<string, number>();
  for (const [id, bytes] of Object.entries(options.streamPrefixBytes ?? {})) {
    const operation = options.operations.find((item) => item.id === id);
    if (!operation)
      throw new Error(`${options.source} has no operation "${id}" to stream.`);
    if (!operation.requiresFiles)
      throw new Error(`${id} takes no files, so it has nothing to stream.`);
    if (!Number.isSafeInteger(bytes) || bytes < 0)
      throw new Error(`${id} declared a stream prefix that is not byte count.`);
    prefixes.set(id, bytes);
  }
  return prefixes;
}

export function adaptFileWorkbench(
  options: FileAdapterOptions,
): readonly KernelOperation[] {
  const prefixes = resolvePrefixes(options);
  return options.operations.map((operation) => {
    const prefixBytes = prefixes.get(operation.id);
    const params: OperationParam[] = operation.fields.map((field) => ({
      id: field.id,
      label: field.label,
      type: field.type,
      defaultValue: field.defaultValue,
      ...(field.options ? { options: field.options } : {}),
      serialisable:
        field.type === 'number' ||
        field.type === 'select' ||
        Boolean(options.serialisableTextParams?.has(field.id)),
    }));
    return {
      id: operation.id,
      source: options.source,
      name: operation.name,
      description: operation.description,
      input: operation.requiresFiles
        ? operation.multiple || operation.directory
          ? 'files'
          : 'file'
        : 'none',
      params,
      output: { kind: 'files' },
      runtime:
        typeof options.runtime === 'string'
          ? options.runtime
          : (options.runtime?.[operation.id] ?? 'pure'),
      deterministic: !options.nondeterministic?.has(operation.id),
      ...(prefixBytes === undefined
        ? {}
        : // The largest buffer the streamed path retains per file is the
          // prefix itself, whatever the input weighs.
          { streamable: true as const, chunkSizeBytes: prefixBytes }),
      ...(operation.notice ? { notice: operation.notice } : {}),
      async run(context: OperationContext): Promise<OperationResult> {
        if (context.signal.aborted) throw abortError();
        context.onProgress?.(0);
        const values = Object.fromEntries(
          operation.fields.map((field) => [
            field.id,
            context.params[field.id] ?? field.defaultValue,
          ]),
        );
        const files =
          prefixBytes !== undefined && context.streams?.length
            ? await prefixInputs(context.streams, prefixBytes, context.signal)
            : context.files;
        const result = await options.run(operation.id, values, files);
        if (context.signal.aborted) throw abortError();
        context.onProgress?.(1);
        if (result.downloads.length > 0) {
          return {
            kind: 'files',
            files: result.downloads,
            summary: result.summary,
          };
        }
        if (!result.output) {
          throw new Error(`${operation.name} returned no result.`);
        }
        return { kind: 'text', text: result.output };
      },
    } satisfies KernelOperation;
  });
}
