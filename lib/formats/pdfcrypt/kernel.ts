import type { KernelOperation } from '@/lib/kernel/types';

import { decrypt, encrypt, inspect } from './pdfcrypt';

function inputFile(context: Parameters<KernelOperation['run']>[0]) {
  if (context.signal.aborted)
    throw new DOMException('Operation cancelled.', 'AbortError');
  const file = context.files[0];
  if (!file) throw new Error('Choose a PDF file first.');
  return file;
}

export const pdfCryptOperations = [
  {
    id: 'pdfcrypt-inspect',
    source: 'formats-pdfcrypt',
    name: 'Inspect PDF encryption',
    description:
      'Identify the Standard security-handler revision and password kind.',
    input: 'file',
    params: [],
    output: { kind: 'text', extension: 'json' },
    runtime: 'pure',
    deterministic: true,
    async run(context) {
      const file = inputFile(context);
      return {
        kind: 'text',
        text: JSON.stringify(await inspect(file.bytes), null, 2),
      };
    },
  },
  {
    id: 'pdfcrypt-decrypt',
    source: 'formats-pdfcrypt',
    name: 'Unlock PDF',
    description:
      'Decrypt a Standard-handler PDF with a supplied user or owner password.',
    input: 'file',
    params: [
      {
        id: 'password',
        label: 'Password',
        type: 'text',
        defaultValue: '',
        serialisable: false,
      },
    ],
    output: { kind: 'files', extension: 'pdf' },
    runtime: 'pure',
    deterministic: true,
    async run(context) {
      const file = inputFile(context);
      const result = await decrypt(file.bytes, context.params.password ?? '');
      return {
        kind: 'files',
        files: [
          {
            name: 'unlocked.pdf',
            type: 'application/pdf',
            bytes: result.bytes,
          },
        ],
        summary: `Unlocked a revision ${result.revision} PDF.`,
      };
    },
  },
  {
    id: 'pdfcrypt-encrypt-r6',
    source: 'formats-pdfcrypt',
    name: 'Protect PDF with AES-256',
    description: 'Encrypt a PDF with revision 6 AES-256 Standard security.',
    input: 'file',
    params: [
      {
        id: 'userPassword',
        label: 'Open password',
        type: 'text',
        defaultValue: '',
        serialisable: false,
      },
      {
        id: 'ownerPassword',
        label: 'Owner password',
        type: 'text',
        defaultValue: '',
        serialisable: false,
      },
      {
        id: 'permissions',
        label: 'Permission mask',
        type: 'number',
        defaultValue: '-4',
        serialisable: true,
      },
    ],
    output: { kind: 'files', extension: 'pdf' },
    runtime: 'pure',
    deterministic: false,
    async run(context) {
      const file = inputFile(context);
      const bytes = await encrypt(file.bytes, {
        userPassword: context.params.userPassword ?? '',
        ownerPassword: context.params.ownerPassword ?? '',
        permissions: Number(context.params.permissions ?? -4),
      });
      return {
        kind: 'files',
        files: [{ name: 'protected.pdf', type: 'application/pdf', bytes }],
        summary: 'Protected the PDF with revision 6 AES-256 encryption.',
      };
    },
  },
] as const satisfies readonly KernelOperation[];
