import type { KernelOperation } from '@/lib/kernel/types';

import { parseEml, parseMbox, parseMsg } from './email';

function inputFile(context: Parameters<KernelOperation['run']>[0]) {
  if (context.signal.aborted) {
    throw new DOMException('Operation cancelled.', 'AbortError');
  }
  const file = context.files[0];
  if (!file) throw new Error('Choose an email file first.');
  return file;
}

const definitions = [
  {
    id: 'email-parse-eml',
    name: 'Parse EML',
    description:
      'Read RFC 5322 headers, MIME bodies, and attachments from EML.',
    parse: parseEml,
  },
  {
    id: 'email-parse-mbox',
    name: 'Parse mbox',
    description:
      'Read messages and escaped body separators from an mbox archive.',
    parse: parseMbox,
  },
  {
    id: 'email-parse-msg',
    name: 'Parse MSG',
    description:
      'Read Unicode or ANSI properties and attachments from MSG CFB storage.',
    parse: parseMsg,
  },
] as const;

export const emailOperations = definitions.map(
  (definition) =>
    ({
      id: definition.id,
      source: 'formats-email',
      name: definition.name,
      description: definition.description,
      input: 'file',
      params: [],
      output: { kind: 'text', extension: 'json' },
      runtime: 'pure',
      deterministic: true,
      async run(context) {
        return {
          kind: 'text',
          text: JSON.stringify(
            await definition.parse(inputFile(context).bytes),
            null,
            2,
          ),
        };
      },
    }) satisfies KernelOperation,
);
