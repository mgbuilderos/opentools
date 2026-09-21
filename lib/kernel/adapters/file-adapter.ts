import type {
  FileWorkbenchOperation,
  FileWorkbenchResult,
  LocalFileInput,
} from '@/lib/tools/file-workbench';
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
}

function abortError(): DOMException {
  return new DOMException('The operation was cancelled.', 'AbortError');
}

export function adaptFileWorkbench(
  options: FileAdapterOptions,
): readonly KernelOperation[] {
  return options.operations.map((operation) => {
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
        const result = await options.run(operation.id, values, context.files);
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
