import { describe, expect, it } from 'vitest';

import { runWritingOperation, WRITING_OPERATIONS } from './writing-workbench';

function defaults(id: string) {
  const operation = WRITING_OPERATIONS.find((item) => item.id === id);
  if (!operation) throw new Error(`Missing operation ${id}`);
  return Object.fromEntries(
    operation.fields.map((field) => [field.id, field.defaultValue]),
  );
}

describe('writing workbench', () => {
  it('publishes 17 unique operations whose defaults all run', () => {
    expect(WRITING_OPERATIONS).toHaveLength(17);
    expect(new Set(WRITING_OPERATIONS.map((item) => item.id)).size).toBe(17);
    for (const operation of WRITING_OPERATIONS) {
      expect(
        runWritingOperation(operation.id, defaults(operation.id)),
      ).not.toBe('');
    }
  });

  it('converts a documented Markdown subset to escaped HTML', () => {
    const output = runWritingOperation('markdown-to-html', {
      input:
        '# Title\n\nA **strong** <script>alert(1)</script> line.\n\n- One\n- Two',
    });
    expect(output).toContain('<h1>Title</h1>');
    expect(output).toContain('<strong>strong</strong>');
    expect(output).toContain('&lt;script&gt;');
    expect(output).toContain('<ul>');
  });

  it('converts common HTML and removes script/style contents', () => {
    const output = runWritingOperation('html-to-markdown', {
      input:
        '<script>ignore()</script><h2>Heading</h2><p>Hello <strong>world</strong>.</p><ul><li>One</li></ul>',
    });
    expect(output).toContain('## Heading');
    expect(output).toContain('Hello **world**.');
    expect(output).toContain('- One');
    expect(output).not.toContain('ignore');
  });

  it('diffs and merges bounded text blocks', () => {
    expect(
      runWritingOperation('text-diff', {
        before: 'A\nOld\nC',
        after: 'A\nNew\nC',
      }),
    ).toBe('  A\n- Old\n+ New\n  C');
    expect(
      runWritingOperation('text-merge', {
        blocks: 'One\n---\nTwo',
        divider: '---',
        separator: '\\n\\n',
      }),
    ).toBe('One\n\nTwo');
  });

  it('converts disclosed spelling variants while retaining simple case', () => {
    expect(
      runWritingOperation('spelling-variant-converter', {
        direction: 'us-to-uk',
        input: 'Color, behavior, and CENTER.',
      }),
    ).toBe('Colour, behaviour, and CENTRE.');
  });

  it('translates basic Braille and round-trips classical ciphers', () => {
    expect(
      runWritingOperation('braille-translator', { input: 'Ab 1!' }),
    ).toContain('⠠⠁⠃ ⠼⠁⠖');
    const encoded = runWritingOperation('caesar-cipher', {
      mode: 'encode',
      input: 'Meet at noon.',
      shift: '3',
    });
    expect(
      runWritingOperation('caesar-cipher', {
        mode: 'decode',
        input: encoded,
        shift: '3',
      }),
    ).toBe('Meet at noon.');
    const vigenere = runWritingOperation('vigenere-cipher', {
      mode: 'encode',
      input: 'ATTACKATDAWN',
      key: 'LEMON',
    });
    expect(vigenere).toBe('LXFOPVEFRNHR');
  });

  it('creates an extractive summary without inventing text', () => {
    const source =
      'Privacy matters for files. Local tools keep files private. Weather is pleasant today.';
    const summary = runWritingOperation('text-summarization-workspace', {
      input: source,
      sentences: '1',
    });
    expect(source).toContain(summary);
    expect(summary).toContain('Local tools keep files private.');
  });

  it('builds outlines and structured prompt templates', () => {
    expect(
      runWritingOperation('outline-builder', {
        items: '1 | Product\n2 | Privacy',
      }),
    ).toBe('# Product\n\n## Privacy');
    expect(
      runWritingOperation(
        'prompt-template-builder',
        defaults('prompt-template-builder'),
      ),
    ).toContain('# Required output');
  });

  it('escapes email signature facts and validates URL schemes', () => {
    const output = runWritingOperation('email-signature-generator', {
      ...defaults('email-signature-generator'),
      name: '<Ada>',
    });
    expect(output).toContain('&lt;Ada&gt;');
    expect(output).not.toContain('<Ada>');
    expect(() =>
      runWritingOperation('email-signature-generator', {
        ...defaults('email-signature-generator'),
        website: 'javascript:alert(1)',
      }),
    ).toThrow('HTTP or HTTPS');
  });

  it('rejects invalid keys, counts, and malformed outline rows', () => {
    expect(() =>
      runWritingOperation('vigenere-cipher', {
        mode: 'encode',
        input: 'text',
        key: 'bad key!',
      }),
    ).toThrow('Latin letters only');
    expect(() =>
      runWritingOperation('text-summarization-workspace', {
        input: 'Text.',
        sentences: '0',
      }),
    ).toThrow('whole number');
    expect(() =>
      runWritingOperation('outline-builder', { items: 'Heading only' }),
    ).toThrow('level | heading');
  });

  it('formats Markdown into printable publication-grade HTML documents', () => {
    const output = runWritingOperation('markdown-to-pdf-doc', {
      markdown:
        '# Project Title\n\nExecutive brief on private tools.\n\n- Feature 1\n- Feature 2',
      title: 'Project Title',
      pageSize: 'A4',
      orientation: 'portrait',
      theme: 'modern-clean',
    });
    expect(output).toContain('<h1>Project Title</h1>');
    expect(output).toContain('Executive brief on private tools.');
    expect(output).toContain('@page {');
    expect(output).toContain('size: A4 portrait;');
    expect(output).toContain('@media print');
    expect(output).toContain('window.print()');
  });
});
