import {
  runTextOperation,
  TEXT_OPERATIONS,
  type TextOperationOptions,
} from '@/lib/tools/text-workbench';
import type {
  KernelOperation,
  OperationContext,
  OperationParam,
} from '@/lib/kernel/types';

const nondeterministic = new Set([
  'line-shuffler',
  'lorem-ipsum-generator',
  'random-word-generator',
]);

function optionParams(
  operation: (typeof TEXT_OPERATIONS)[number],
): OperationParam[] {
  switch (operation.optionKind) {
    case 'find':
    case 'regex':
      return [
        {
          id: 'find',
          label:
            operation.optionKind === 'regex'
              ? 'Regular expression'
              : 'Text to find',
          type: 'text',
          defaultValue: '',
          serialisable: operation.optionKind === 'regex',
        },
        {
          id: 'replacement',
          label: 'Replacement',
          type: 'text',
          defaultValue: '',
          serialisable: false,
        },
        {
          id: 'caseSensitive',
          label: 'Case sensitive',
          type: 'boolean',
          defaultValue: 'false',
          serialisable: true,
        },
      ];
    case 'repeat':
      return [
        {
          id: 'repeatCount',
          label: 'Repeat count',
          type: 'number',
          defaultValue: '2',
          serialisable: true,
        },
      ];
    case 'separator':
      return [
        {
          id: 'separator',
          label: 'Separator',
          type: 'text',
          defaultValue: ',',
          serialisable: true,
        },
      ];
    case 'normalization':
      return [
        {
          id: 'normalization',
          label: 'Normalization form',
          type: 'select',
          defaultValue: 'NFC',
          options: ['NFC', 'NFD', 'NFKC', 'NFKD'].map((value) => ({
            value,
            label: value,
          })),
          serialisable: true,
        },
      ];
    case 'sort':
      return [
        {
          id: 'sortDirection',
          label: 'Sort direction',
          type: 'select',
          defaultValue: 'ascending',
          options: [
            { value: 'ascending', label: 'Ascending' },
            { value: 'descending', label: 'Descending' },
          ],
          serialisable: true,
        },
      ];
    case 'count':
      return [
        {
          id: 'count',
          label: 'Count',
          type: 'number',
          defaultValue: '3',
          serialisable: true,
        },
      ];
    case 'candidates':
      return [
        {
          id: 'candidates',
          label: 'Candidate words',
          type: 'textarea',
          defaultValue: '',
          serialisable: false,
        },
      ];
    default:
      return [];
  }
}

function optionsFor(
  params: readonly OperationParam[],
  context: OperationContext,
): TextOperationOptions {
  const value = (id: string) =>
    context.params[id] ?? params.find((param) => param.id === id)?.defaultValue;
  return {
    ...(value('find') !== undefined ? { find: value('find') } : {}),
    ...(value('replacement') !== undefined
      ? { replacement: value('replacement') }
      : {}),
    ...(value('caseSensitive') !== undefined
      ? { caseSensitive: value('caseSensitive') === 'true' }
      : {}),
    ...(value('repeatCount') !== undefined
      ? { repeatCount: Number(value('repeatCount')) }
      : {}),
    ...(value('separator') !== undefined
      ? { separator: value('separator') }
      : {}),
    ...(value('normalization') !== undefined
      ? {
          normalization: value(
            'normalization',
          ) as TextOperationOptions['normalization'],
        }
      : {}),
    ...(value('sortDirection') !== undefined
      ? {
          sortDirection: value(
            'sortDirection',
          ) as TextOperationOptions['sortDirection'],
        }
      : {}),
    ...(value('count') !== undefined ? { count: Number(value('count')) } : {}),
    ...(value('candidates') !== undefined
      ? { candidates: value('candidates') }
      : {}),
  };
}

export const textOperations: readonly KernelOperation[] = TEXT_OPERATIONS.map(
  (operation) => {
    const params = optionParams(operation);
    return {
      id: operation.id,
      source: 'text',
      name: operation.name,
      description: operation.description,
      input: operation.needsInput === false ? 'none' : 'text',
      params,
      output: { kind: 'text' },
      runtime: 'pure',
      deterministic: !nondeterministic.has(operation.id),
      async run(context) {
        if (context.signal.aborted)
          throw new DOMException('The operation was cancelled.', 'AbortError');
        const result = runTextOperation(
          operation.id,
          context.text,
          optionsFor(params, context),
        );
        if (!result.output)
          throw new Error(`${operation.name} returned no text.`);
        return { kind: 'text', text: result.output };
      },
    } satisfies KernelOperation;
  },
);
