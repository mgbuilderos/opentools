import type {
  KernelOperation,
  OperationContext,
  OperationParam,
  OperationResult,
  OperationRuntime,
  OperationSource,
} from '@/lib/kernel/types';

export interface FieldLike {
  id: string;
  label: string;
  type: string;
  defaultValue: string;
  options?: readonly { value: string; label: string }[];
}

export interface TextOperationLike {
  id: string;
  name: string;
  description: string;
  fields?: readonly FieldLike[];
  notice?: string;
  outputExtension?: string;
}

type TextRunner = (
  operationId: string,
  values: Record<string, string>,
) => string | Promise<string>;

export interface TextAdapterOptions {
  source: OperationSource;
  operations: readonly TextOperationLike[];
  run: TextRunner;
  runtime?: OperationRuntime | Readonly<Record<string, OperationRuntime>>;
  nondeterministic?: ReadonlySet<string>;
  serialisableTextParams?: ReadonlySet<string>;
}

const PARAM_TYPES = new Set([
  'text',
  'textarea',
  'number',
  'select',
  'boolean',
]);

function paramFor(
  field: FieldLike,
  serialisableTextParams: ReadonlySet<string>,
): OperationParam {
  const type = PARAM_TYPES.has(field.type)
    ? (field.type as OperationParam['type'])
    : 'text';
  return {
    id: field.id,
    label: field.label,
    type,
    defaultValue: field.defaultValue,
    ...(field.options ? { options: field.options } : {}),
    serialisable:
      type === 'number' ||
      type === 'select' ||
      type === 'boolean' ||
      serialisableTextParams.has(field.id),
  };
}

function runtimeFor(
  operationId: string,
  runtime: TextAdapterOptions['runtime'],
): OperationRuntime {
  if (!runtime) return 'pure';
  return typeof runtime === 'string'
    ? runtime
    : (runtime[operationId] ?? 'pure');
}

function abortError(): DOMException {
  return new DOMException('The operation was cancelled.', 'AbortError');
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw abortError();
}

function primaryContentField(
  fields: readonly FieldLike[],
): FieldLike | undefined {
  return fields.find(
    (field) => field.type === 'textarea' || field.type === 'text',
  );
}

function valuesFor(
  fields: readonly FieldLike[],
  contentField: FieldLike | undefined,
  context: OperationContext,
): Record<string, string> {
  return Object.fromEntries(
    fields.map((field) => [
      field.id,
      field.id === contentField?.id
        ? context.text || field.defaultValue
        : (context.params[field.id] ?? field.defaultValue),
    ]),
  );
}

export function adaptTextWorkbench(
  options: TextAdapterOptions,
): readonly KernelOperation[] {
  return options.operations.map((operation) => {
    const fields = operation.fields ?? [];
    const contentField = primaryContentField(fields);
    const params = fields
      .filter((field) => field.id !== contentField?.id)
      .map((field) =>
        paramFor(field, options.serialisableTextParams ?? new Set()),
      );
    return {
      id: operation.id,
      source: options.source,
      name: operation.name,
      description: operation.description,
      input: contentField ? 'text' : 'none',
      params,
      output: {
        kind: 'text',
        ...(operation.outputExtension
          ? { extension: operation.outputExtension }
          : {}),
      },
      runtime: runtimeFor(operation.id, options.runtime),
      deterministic: !options.nondeterministic?.has(operation.id),
      ...(operation.notice ? { notice: operation.notice } : {}),
      async run(context: OperationContext): Promise<OperationResult> {
        throwIfAborted(context.signal);
        context.onProgress?.(0);
        const text = await options.run(
          operation.id,
          valuesFor(fields, contentField, context),
        );
        throwIfAborted(context.signal);
        if (typeof text !== 'string' || text.length === 0) {
          throw new Error(`${operation.name} returned no text.`);
        }
        context.onProgress?.(1);
        return { kind: 'text', text };
      },
    } satisfies KernelOperation;
  });
}

export function adaptAsyncTextWorkbench(
  options: TextAdapterOptions,
): readonly KernelOperation[] {
  return adaptTextWorkbench(options);
}
