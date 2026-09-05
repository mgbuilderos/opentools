import { describe, expect, it } from 'vitest';

import {
  DEVELOPER_DATA_OPERATIONS,
  runDeveloperDataOperation,
} from './developer-data-workbench';

function defaults(id: string) {
  const operation = DEVELOPER_DATA_OPERATIONS.find((item) => item.id === id);
  if (!operation) throw new Error(`Missing operation ${id}`);
  return Object.fromEntries(
    operation.fields.map((field) => [field.id, field.defaultValue]),
  );
}

describe('developer and data workbench', () => {
  it('publishes 45 unique operations whose defaults all run', async () => {
    expect(DEVELOPER_DATA_OPERATIONS).toHaveLength(45);
    expect(
      new Set(DEVELOPER_DATA_OPERATIONS.map((operation) => operation.id)).size,
    ).toBe(45);
    for (const operation of DEVELOPER_DATA_OPERATIONS) {
      await expect(
        runDeveloperDataOperation(operation.id, defaults(operation.id)),
      ).resolves.not.toBe('');
    }
  });

  it('round-trips Unicode Base64 and Base64URL', async () => {
    const encoded = await runDeveloperDataOperation('base64-encode-text', {
      input: 'Hello, 世界',
    });
    await expect(
      runDeveloperDataOperation('base64-decode-text', { input: encoded }),
    ).resolves.toBe('Hello, 世界');
    const urlEncoded = await runDeveloperDataOperation(
      'base64url-encode-text',
      { input: 'Hello? yes/no' },
    );
    await expect(
      runDeveloperDataOperation('base64url-decode-text', {
        input: urlEncoded,
      }),
    ).resolves.toBe('Hello? yes/no');
  });

  it('labels decoded JWT content as unverified', async () => {
    await expect(
      runDeveloperDataOperation('jwt-inspector', {
        input:
          'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxMjMiLCJuYW1lIjoiQWRhIn0.',
      }),
    ).resolves.toContain('NOT VERIFIED');
  });

  it('converts JSON and quoted CSV in both directions', async () => {
    await expect(
      runDeveloperDataOperation('json-to-csv', {
        input: '[{"name":"Ada, A.","active":true}]',
      }),
    ).resolves.toContain('"Ada, A."');
    await expect(
      runDeveloperDataOperation('csv-to-json', {
        input: 'name,role\n"Ada, A.",Engineer',
      }),
    ).resolves.toContain('Ada, A.');
  });

  it('preserves repeated query values and safely mutates URLs', async () => {
    await expect(
      runDeveloperDataOperation('query-string-parser', {
        input: '?tag=a&tag=b',
      }),
    ).resolves.toContain('[\n    "a",\n    "b"\n  ]');
    await expect(
      runDeveloperDataOperation('query-parameter-set', {
        input: 'https://example.com/?page=1',
        key: 'page',
        value: '2',
      }),
    ).resolves.toBe('https://example.com/?page=2');
  });

  it('bounds regex behavior and rejects nested explosive quantifiers', async () => {
    await expect(
      runDeveloperDataOperation('regex-extractor', {
        input: 'Order 42, order 108.',
        pattern: '\\d+',
        flags: 'g',
        group: '0',
      }),
    ).resolves.toBe('42\n108');
    await expect(
      runDeveloperDataOperation('regex-tester', {
        input: 'aaaaaaaaaaaaaaaa!',
        pattern: '(a+)+$',
        flags: 'g',
      }),
    ).rejects.toThrow('quantified pattern');
  });

  it('round-trips Unicode scalar and UTF-8 byte representations', async () => {
    await expect(
      runDeveloperDataOperation('code-points-to-text', {
        input: 'U+0041 U+2615 U+1F600',
      }),
    ).resolves.toBe('A☕😀');
    await expect(
      runDeveloperDataOperation('utf8-byte-decoder', {
        input: '65 226 152 149',
      }),
    ).resolves.toBe('A☕');
  });

  it('hashes text through Web Crypto', async () => {
    await expect(
      runDeveloperDataOperation('sha-256-text', { input: 'hello' }),
    ).resolves.toBe(
      '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
    );
  });

  it('converts common color forms', async () => {
    await expect(
      runDeveloperDataOperation('hex-to-rgb', { input: '#336699' }),
    ).resolves.toBe('rgb(51 102 153)');
    await expect(
      runDeveloperDataOperation('hsl-to-hex', {
        input: '',
        hue: '210',
        saturation: '50',
        lightness: '40',
        alpha: '1',
      }),
    ).resolves.toBe('#336699');
  });

  it('rejects invalid encodings and non-HTTP URLs', async () => {
    await expect(
      runDeveloperDataOperation('base64-decode-text', { input: '***' }),
    ).rejects.toThrow('valid standard Base64');
    await expect(
      runDeveloperDataOperation('url-parser', { input: 'file:///tmp/a' }),
    ).rejects.toThrow('Only HTTP and HTTPS');
    await expect(
      runDeveloperDataOperation('code-points-to-text', { input: 'U+D800' }),
    ).rejects.toThrow('Not a Unicode scalar');
  });
});
