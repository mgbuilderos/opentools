import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import { readStandardEncryption } from './engine';
import { classifyEncryption, md5, rc4 } from './pdf-encryption';
import { encryptedPdfFixtures, fixtureBytes } from './pdf-encryption.fixtures';

const hex = (bytes: Uint8Array) => Buffer.from(bytes).toString('hex');
const text = (value: string) => new TextEncoder().encode(value);

describe('PDF encryption classification', () => {
  it('computes MD5 like RFC 1321', () => {
    expect(hex(md5(text('')))).toBe('d41d8cd98f00b204e9800998ecf8427e');
    expect(hex(md5(text('abc')))).toBe('900150983cd24fb0d6963f7d28e17f72');
    expect(
      hex(
        md5(
          text(
            '12345678901234567890123456789012345678901234567890123456789012345678901234567890',
          ),
        ),
      ),
    ).toBe('57edf4a22be3c955ac49da2e2107b67a');
  });

  it('computes RC4 like the published test vector', () => {
    expect(hex(rc4(text('Key'), text('Plaintext')))).toBe('bbf316e8d940af0ad3');
  });

  for (const [name, base64] of Object.entries(encryptedPdfFixtures)) {
    const expected = name.endsWith('OwnerOnly')
      ? 'owner-only'
      : 'user-password';
    it(`classifies ${name} as ${expected}`, async () => {
      const document = await PDFDocument.load(fixtureBytes(base64), {
        ignoreEncryption: true,
        updateMetadata: false,
      });
      const encryption = readStandardEncryption(document);
      expect(encryption).toBeDefined();
      expect(await classifyEncryption(encryption!)).toBe(expected);
    });
  }

  it('reports anything other than the Standard handler as unknown', async () => {
    expect(
      await classifyEncryption({
        filter: 'Adobe.PubSec',
        revision: 4,
        lengthBits: 128,
        owner: new Uint8Array(32),
        user: new Uint8Array(32),
        permissions: -4,
        encryptMetadata: true,
        firstId: new Uint8Array(16),
      }),
    ).toBe('unknown');
  });
});
