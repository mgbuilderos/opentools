import { describe, expect, it } from 'vitest';

import {
  DOCUMENT_OPERATIONS,
  runDocumentOperation,
} from './document-workbench';

function defaults(id: string) {
  const operation = DOCUMENT_OPERATIONS.find((item) => item.id === id);
  if (!operation) throw new Error(`Missing operation ${id}`);
  return Object.fromEntries(
    operation.fields.map((field) => [field.id, field.defaultValue]),
  );
}

describe('documents and office workbench', () => {
  it('publishes 24 unique operations whose defaults all run', () => {
    expect(DOCUMENT_OPERATIONS).toHaveLength(24);
    expect(new Set(DOCUMENT_OPERATIONS.map((item) => item.id)).size).toBe(24);
    for (const operation of DOCUMENT_OPERATIONS) {
      expect(
        runDocumentOperation(operation.id, defaults(operation.id)),
      ).not.toBe('');
    }
  });

  it('builds README and changelog files from explicit facts', () => {
    expect(
      runDocumentOperation('readme-generator', defaults('readme-generator')),
    ).toContain('## Installation');
    expect(
      runDocumentOperation(
        'changelog-generator',
        defaults('changelog-generator'),
      ),
    ).toContain('### Fixed');
  });

  it('calculates exact commercial document totals', () => {
    const invoice = runDocumentOperation(
      'invoice-generator',
      defaults('invoice-generator'),
    );
    expect(invoice).toContain('**Subtotal:** ₹13000.00');
    expect(invoice).toContain('**Total:** ₹15340.00');
  });

  it('fills CSV mail merge and JSON document templates', () => {
    expect(
      runDocumentOperation(
        'mail-merge-preview',
        defaults('mail-merge-preview'),
      ),
    ).toContain('Hello Ada');
    expect(
      runDocumentOperation(
        'document-template-filler',
        defaults('document-template-filler'),
      ),
    ).toContain('Status: Ready');
  });

  it('creates a stable line-level document diff', () => {
    expect(
      runDocumentOperation('document-compare', {
        before: 'Title\nOld sentence\nShared line',
        after: 'Title\nNew sentence\nShared line',
      }),
    ).toBe('  Title\n- Old sentence\n+ New sentence\n  Shared line');
  });

  it('inspects simple BibTeX and RIS records locally', () => {
    expect(
      runDocumentOperation('bibtex-viewer', defaults('bibtex-viewer')),
    ).toContain('Citation key: example2026');
    expect(
      runDocumentOperation(
        'ris-citation-viewer',
        defaults('ris-citation-viewer'),
      ),
    ).toContain('TI: Private browser tools');
  });

  it('escapes LaTeX table content once without corrupting escapes', () => {
    const output = runDocumentOperation('latex-table-generator', {
      csv: 'Name,Value\nA&B,100%\nPath,C:\\tmp',
      alignment: 'l',
    });
    expect(output).toContain('A\\&B & 100\\%');
    expect(output).toContain('C:\\textbackslash{}tmp');
    expect(output).not.toContain('textbackslash{}&');
  });

  it('counts Unicode words and totals agenda duration', () => {
    expect(
      runDocumentOperation('document-word-counter', {
        content: 'Hello भारत',
        wordsPerMinute: '200',
      }),
    ).toContain('Words: 2');
    expect(
      runDocumentOperation('agenda-generator', defaults('agenda-generator')),
    ).toContain('**Planned duration:** 30 minutes');
  });

  it('rejects impossible dates, missing merge keys, and malformed items', () => {
    expect(() =>
      runDocumentOperation('changelog-generator', {
        ...defaults('changelog-generator'),
        date: '2026-02-31',
      }),
    ).toThrow('Invalid YYYY-MM-DD');
    expect(() =>
      runDocumentOperation('mail-merge-preview', {
        template: 'Hello {{missing}}',
        csv: 'name\nAda',
      }),
    ).toThrow('missing from CSV');
    expect(() =>
      runDocumentOperation('invoice-generator', {
        ...defaults('invoice-generator'),
        items: 'Broken | two | 10',
      }),
    ).toThrow('positive quantity');
  });
});
