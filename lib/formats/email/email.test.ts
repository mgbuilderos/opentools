import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  EmailFormatError,
  parseEmail,
  parseEml,
  parseMbox,
  parseMsg,
} from './index';

const fixtures = resolve(import.meta.dirname, '__fixtures__');

async function fixture(name: string): Promise<Uint8Array> {
  return new Uint8Array(await readFile(resolve(fixtures, name)));
}

describe('email formats', () => {
  it('parses MIME alternatives, RFC 2047 headers, and two attachments', async () => {
    const [message] = await parseEml(await fixture('multipart.eml'));

    expect(message?.headers.subject).toBe('Quarterly ✓ report');
    expect(message?.headers.from).toBe('sender@example.invalid');
    expect(message?.textBody).toContain('Plain body with a check mark: ✓');
    expect(message?.htmlBody).toContain('<p>HTML body ✓</p>');
    expect(message?.htmlBody).toContain('https://remote.invalid/pixel.png');
    expect(message?.attachments).toHaveLength(2);
    expect(message?.attachments[0]).toMatchObject({
      filename: 'report.csv',
      contentType: 'text/csv',
    });
    expect(new TextDecoder().decode(message?.attachments[0]?.bytes)).toBe(
      'name,value\nalpha,1\n',
    );
    expect(new TextDecoder().decode(message?.attachments[1]?.bytes)).toBe(
      'Generated attachment.',
    );
  });

  it('parses three mbox messages and unescapes body From lines', async () => {
    const messages = await parseMbox(await fixture('three-message.mbox'));

    expect(messages.map((message) => message.headers.subject)).toEqual([
      'First',
      'Second',
      'Third',
    ]);
    expect(messages[0]?.textBody).toContain('From this body line was escaped');
    expect(messages[0]?.textBody).not.toContain('>From this body');
  });

  it('parses CFB miniFAT MSG streams with a Unicode subject', async () => {
    const [message] = await parseMsg(await fixture('unicode.msg'));

    expect(message?.headers.subject).toBe('Synthetic résumé ✓');
    expect(message?.textBody).toBe('Synthetic MSG body.');
    expect(message?.htmlBody).toBe('<p>MSG HTML body</p>');
    expect(message?.attachments).toHaveLength(1);
    expect(message?.attachments[0]).toMatchObject({
      filename: 'note.txt',
      contentType: 'text/plain',
    });
    expect(new TextDecoder().decode(message?.attachments[0]?.bytes)).toBe(
      'hello\n',
    );
  });

  it('falls back to ANSI MSG property streams', async () => {
    const [message] = await parseMsg(await fixture('ansi.msg'));
    expect(message?.headers.subject).toBe('Synthetic ANSI subject');
    expect(message?.textBody).toBe('Synthetic ANSI body.');
  });

  it('auto-detects EML, mbox, and MSG bytes without a filename', async () => {
    await expect(
      parseEmail(await fixture('multipart.eml')),
    ).resolves.toHaveLength(1);
    await expect(
      parseEmail(await fixture('three-message.mbox')),
    ).resolves.toHaveLength(3);
    await expect(
      parseEmail(await fixture('unicode.msg')),
    ).resolves.toHaveLength(1);
  });

  it.each([
    ['truncated.eml', 'MALFORMED_MIME'],
    ['wrong-magic.bin', 'UNSUPPORTED_FORMAT'],
    ['declared-length.msg', 'DECLARED_LENGTH_EXCEEDS_BUFFER'],
  ])('returns a typed error for %s', async (name, code) => {
    const error = await parseEmail(await fixture(name)).catch(
      (reason: unknown) => reason,
    );
    expect(error).toBeInstanceOf(EmailFormatError);
    expect(error).toMatchObject({ code });
  });
});
