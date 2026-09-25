import type { KernelOperation } from '@/lib/kernel/types';

import { parseOfx, parseQif, reconcile } from './finance';

function inputFile(context: Parameters<KernelOperation['run']>[0]) {
  if (context.signal.aborted) {
    throw new DOMException('Operation cancelled.', 'AbortError');
  }
  const file = context.files[0];
  if (!file) throw new Error('Choose a finance file first.');
  return file;
}

function jsonText(value: unknown) {
  return { kind: 'text' as const, text: JSON.stringify(value, null, 2) };
}

export const financeOperations = [
  {
    id: 'finance-parse-ofx',
    source: 'formats-finance',
    name: 'Parse OFX',
    description:
      'Read accounts, transactions, and balances from OFX 1.x or 2.x.',
    input: 'file',
    params: [],
    output: { kind: 'text', extension: 'json' },
    runtime: 'pure',
    deterministic: true,
    async run(context) {
      return jsonText(await parseOfx(inputFile(context).bytes));
    },
  },
  {
    id: 'finance-parse-qif',
    source: 'formats-finance',
    name: 'Parse QIF',
    description:
      'Read QIF account metadata, transactions, and statement balances.',
    input: 'file',
    params: [],
    output: { kind: 'text', extension: 'json' },
    runtime: 'pure',
    deterministic: true,
    async run(context) {
      return jsonText(await parseQif(inputFile(context).bytes));
    },
  },
  {
    id: 'finance-reconcile',
    source: 'formats-finance',
    name: 'Reconcile statement totals',
    description:
      'Compare opening balance plus transactions with the closing balance without rounding.',
    input: 'text',
    params: [],
    output: { kind: 'text', extension: 'json' },
    runtime: 'pure',
    deterministic: true,
    async run(context) {
      if (context.signal.aborted) {
        throw new DOMException('Operation cancelled.', 'AbortError');
      }
      const input = JSON.parse(context.text) as Parameters<typeof reconcile>[0];
      return jsonText(reconcile(input));
    },
  },
] as const satisfies readonly KernelOperation[];
