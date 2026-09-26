import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import {
  decrypt,
  encrypt,
  inspect,
  PdfCryptError,
} from '@/lib/formats/pdfcrypt';

const fixture = (name: string) =>
  new Uint8Array(
    readFileSync(
      resolve(
        import.meta.dirname,
        '../../formats/pdfcrypt/__fixtures__',
        `${name}.pdf`,
      ),
    ),
  );

describe('PDF Password & Protection (/pdf/password)', () => {
  it('identifies owner-password-only file and allows unlocking with empty password', async () => {
    const ownerOnly = fixture('aes256OwnerOnly');
    const inspected = await inspect(ownerOnly);

    expect(inspected.encrypted).toBe(true);
    expect(inspected.passwordKind).toBe('owner-only');

    const decrypted = await decrypt(ownerOnly, '');
    expect(decrypted.bytes.length).toBeGreaterThan(0);
    expect(decrypted.usedOwnerPassword).toBe(false);
  });

  it('identifies user-password-locked file and unlocks with correct password', async () => {
    const userLocked = fixture('aes256UserPassword');
    const inspected = await inspect(userLocked);

    expect(inspected.encrypted).toBe(true);
    expect(inspected.passwordKind).toBe('user-password');

    const decrypted = await decrypt(userLocked, 'secret');
    expect(decrypted.bytes.length).toBeGreaterThan(0);
  });

  it('rejects wrong password with typed PdfCryptError', async () => {
    const userLocked = fixture('aes256UserPassword');
    await expect(decrypt(userLocked, 'wrong-password')).rejects.toThrow(
      PdfCryptError,
    );
    await expect(decrypt(userLocked, 'wrong-password')).rejects.toMatchObject({
      code: 'WRONG_PASSWORD',
    });
  });

  it('encrypts a plain document using AES-256 (Revision 6) and allows unlocking', async () => {
    const plain = fixture('plain');
    const encrypted = await encrypt(plain, {
      userPassword: 'my-password',
      ownerPassword: 'my-owner-password',
      permissions: -4,
    });

    const inspected = await inspect(encrypted);
    expect(inspected.encrypted).toBe(true);
    expect(inspected.revision).toBe(6);
    expect(inspected.algorithm).toBe('AES-256-CBC');

    const decrypted = await decrypt(encrypted, 'my-password');
    expect(decrypted.bytes.length).toBeGreaterThan(0);
  });

  it('ensures password never appears in error strings or stack traces', async () => {
    const secret = 'super-sensitive-token-999';
    let caughtError: unknown;
    try {
      await decrypt(fixture('aes256UserPassword'), secret);
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError).toBeInstanceOf(PdfCryptError);
    expect(String(caughtError)).not.toContain(secret);
    expect((caughtError as Error).message).not.toContain(secret);
    expect((caughtError as Error).stack).not.toContain(secret);
  });

  it('ensures password never reaches console logs', async () => {
    const secret = 'top-secret-password-xyz';
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      await decrypt(fixture('aes256UserPassword'), secret);
    } catch {
      // expected
    }

    expect(JSON.stringify(logSpy.mock.calls)).not.toContain(secret);
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain(secret);
    expect(JSON.stringify(warnSpy.mock.calls)).not.toContain(secret);

    logSpy.mockRestore();
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });
});
