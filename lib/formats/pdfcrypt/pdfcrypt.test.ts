import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { PDFDocument, PDFRawStream } from 'pdf-lib';
import { describe, expect, it, vi } from 'vitest';

import {
  PdfCryptError,
  decrypt,
  encrypt,
  inspect,
  md5,
  rc4,
  type PdfEncryptionAlgorithm,
} from './index';

const fixture = (name: string) =>
  new Uint8Array(
    readFileSync(resolve(import.meta.dirname, '__fixtures__', `${name}.pdf`)),
  );

const revisions = [
  ['rc440', 2, 'RC4-40'],
  ['rc4128', 3, 'RC4-128'],
  ['aes128', 4, 'AES-128-CBC'],
  ['aes256', 6, 'AES-256-CBC'],
] as const satisfies readonly (readonly [
  string,
  number,
  PdfEncryptionAlgorithm,
])[];

async function contentStreams(bytes: Uint8Array) {
  const document = await PDFDocument.load(bytes, { updateMetadata: false });
  return document.context
    .enumerateIndirectObjects()
    .filter(([, object]) => object instanceof PDFRawStream)
    .map(([, object]) => Array.from((object as PDFRawStream).getContents()));
}

describe('PDF Standard security handler', () => {
  it('matches published MD5 and RC4 vectors used by legacy revisions', () => {
    const text = (value: string) => new TextEncoder().encode(value);
    expect(Buffer.from(md5(text('abc'))).toString('hex')).toBe(
      '900150983cd24fb0d6963f7d28e17f72',
    );
    expect(
      Buffer.from(rc4(text('Key'), text('Plaintext'))).toString('hex'),
    ).toBe('bbf316e8d940af0ad3');
  });

  for (const [name, revision, algorithm] of revisions) {
    it(`inspects and decrypts revision ${revision} (${algorithm}) fixtures`, async () => {
      const ownerOnly = fixture(`${name}OwnerOnly`);
      const userLocked = fixture(`${name}UserPassword`);

      await expect(inspect(ownerOnly)).resolves.toEqual({
        encrypted: true,
        revision,
        algorithm,
        passwordKind: 'owner-only',
      });
      await expect(inspect(userLocked)).resolves.toEqual({
        encrypted: true,
        revision,
        algorithm,
        passwordKind: 'user-password',
      });

      const open = await decrypt(ownerOnly, '');
      const unlocked = await decrypt(userLocked, 'secret');
      expect(open).toMatchObject({ revision, usedOwnerPassword: false });
      expect(unlocked).toMatchObject({ revision, usedOwnerPassword: false });
      expect(await contentStreams(open.bytes)).toEqual(
        await contentStreams(unlocked.bytes),
      );
    });
  }

  it('rejects a wrong password with a typed error instead of returning bytes', async () => {
    await expect(
      decrypt(fixture('aes256UserPassword'), 'wrong'),
    ).rejects.toMatchObject({
      name: 'PdfCryptError',
      code: 'WRONG_PASSWORD',
    });
  });

  it('accepts the owner password and records which credential opened the file', async () => {
    await expect(
      decrypt(fixture('aes256UserPassword'), 'owner'),
    ).resolves.toMatchObject({ revision: 6, usedOwnerPassword: true });
  });

  it('encrypts new files only with revision 6 and round-trips their streams', async () => {
    const plain = fixture('plain');
    const encrypted = await encrypt(plain, {
      userPassword: 'user-pass',
      ownerPassword: 'owner-pass',
      permissions: -4,
    });
    await expect(inspect(encrypted)).resolves.toMatchObject({
      encrypted: true,
      revision: 6,
      algorithm: 'AES-256-CBC',
      passwordKind: 'user-password',
    });
    const decrypted = await decrypt(encrypted, 'user-pass');
    expect(await contentStreams(decrypted.bytes)).toEqual(
      await contentStreams(plain),
    );
    await expect(decrypt(encrypted, 'owner-pass')).resolves.toMatchObject({
      usedOwnerPassword: true,
    });
  });

  it('never returns, reports, or logs a supplied password', async () => {
    const password = 'unique-do-not-leak-7wP!';
    const ownerPassword = 'unique-owner-do-not-leak-9qZ!';
    const consoleSpies = [
      vi.spyOn(console, 'log').mockImplementation(() => undefined),
      vi.spyOn(console, 'warn').mockImplementation(() => undefined),
      vi.spyOn(console, 'error').mockImplementation(() => undefined),
    ];
    let caught: unknown;
    try {
      await decrypt(fixture('aes256UserPassword'), password);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(PdfCryptError);
    expect(String(caught)).not.toContain(password);
    expect((caught as Error).stack ?? '').not.toContain(password);
    expect(JSON.stringify(caught)).not.toContain(password);
    const encrypted = await encrypt(fixture('plain'), {
      userPassword: password,
      ownerPassword,
      permissions: -4,
    });
    expect(Buffer.from(encrypted).includes(Buffer.from(password))).toBe(false);
    expect(Buffer.from(encrypted).includes(Buffer.from(ownerPassword))).toBe(
      false,
    );
    const result = await decrypt(encrypted, password);
    expect(JSON.stringify(result)).not.toContain(password);
    expect(JSON.stringify(result)).not.toContain(ownerPassword);
    for (const spy of consoleSpies) {
      expect(JSON.stringify(spy.mock.calls)).not.toContain(password);
      expect(JSON.stringify(spy.mock.calls)).not.toContain(ownerPassword);
      spy.mockRestore();
    }
  });

  it('reports an unencrypted PDF without guessing a revision', async () => {
    await expect(inspect(fixture('plain'))).resolves.toEqual({
      encrypted: false,
      revision: null,
      algorithm: null,
      passwordKind: 'none',
    });
  });

  it.each([
    ['wrong magic', fixture('wrong-magic')],
    ['truncated', fixture('truncated')],
    ['declared stream beyond the buffer', fixture('declared-length')],
  ])('throws a typed error for %s', async (_name, bytes) => {
    await expect(decrypt(bytes, '')).rejects.toBeInstanceOf(PdfCryptError);
  });
});
