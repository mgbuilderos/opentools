import { describe, expect, it } from 'vitest';

import {
  FILE_WORKBENCH_OPERATIONS,
  type LocalFileInput,
  runFileWorkbenchOperation,
} from './file-workbench';

function makeFile(
  name: string,
  content: string | number[] | Uint8Array,
  type = 'application/octet-stream',
  path = name,
): LocalFileInput {
  const bytes =
    typeof content === 'string'
      ? new TextEncoder().encode(content)
      : content instanceof Uint8Array
        ? content
        : Uint8Array.from(content);
  return {
    name,
    path,
    type,
    size: bytes.length,
    lastModified: Date.parse('2026-09-06T00:00:00Z'),
    bytes,
  };
}

const hello = makeFile(
  'draft hello.txt',
  'hello',
  'text/plain',
  'notes/draft hello.txt',
);
const helloCopy = makeFile(
  'copy.txt',
  'hello',
  'text/plain',
  'copies/copy.txt',
);
const world = makeFile('world.txt', ' world', 'text/plain', 'notes/world.txt');
const changed = makeFile('changed.txt', 'hallo', 'text/plain');
const empty = makeFile('empty.txt', '', 'text/plain', 'empty.txt');
const png = makeFile(
  'pixel.png',
  [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0],
  'image/png',
  'images/pixel.png',
);

function defaults(id: string) {
  const operation = FILE_WORKBENCH_OPERATIONS.find((item) => item.id === id);
  if (!operation) throw new Error(`Missing operation ${id}`);
  const result = Object.fromEntries(
    operation.fields.map((field) => [field.id, field.defaultValue]),
  );
  if (id === 'file-encrypt' || id === 'file-decrypt') {
    result.password = 'testpassword';
  }
  return result;
}

function filesFor(id: string, sampleEnc?: LocalFileInput) {
  if (id === 'base64-file-decoder' || id === 'data-uri-file-extractor')
    return [];
  if (id === 'file-chunk-joiner') return [hello, world];
  if (id === 'duplicate-file-finder') return [hello, helloCopy, world];
  if (id === 'hex-patch-generator') return [hello, changed];
  if (id === 'file-decrypt') return [sampleEnc ?? hello];
  const operation = FILE_WORKBENCH_OPERATIONS.find((item) => item.id === id);
  return operation?.multiple ? [hello, png, empty] : [hello];
}

describe('file workbench', () => {
  it('publishes 31 unique operations whose defaults all run', async () => {
    expect(FILE_WORKBENCH_OPERATIONS).toHaveLength(31);
    expect(new Set(FILE_WORKBENCH_OPERATIONS.map((item) => item.id)).size).toBe(
      31,
    );
    const encResult = await runFileWorkbenchOperation(
      'file-encrypt',
      { password: 'testpassword' },
      [hello],
    );
    const sampleEnc = makeFile('test.txt.enc', encResult.downloads[0].bytes);
    for (const operation of FILE_WORKBENCH_OPERATIONS) {
      await expect(
        runFileWorkbenchOperation(
          operation.id,
          defaults(operation.id),
          filesFor(operation.id, sampleEnc),
        ),
      ).resolves.toMatchObject({ summary: expect.any(String) });
    }
  });

  it('encrypts and decrypts files with authenticated AES-GCM and PBKDF2', async () => {
    const original = makeFile(
      'secret.pdf',
      'CONFIDENTIAL CONTRACT DATA',
      'application/pdf',
    );
    const encrypted = await runFileWorkbenchOperation(
      'file-encrypt',
      { password: 'my-strong-password' },
      [original],
    );
    expect(encrypted.downloads[0].name).toBe('secret.pdf.enc');
    expect(encrypted.downloads[0].bytes.length).toBeGreaterThan(
      original.size + 32,
    );

    const encFile = makeFile('secret.pdf.enc', encrypted.downloads[0].bytes);
    const decrypted = await runFileWorkbenchOperation(
      'file-decrypt',
      { password: 'my-strong-password' },
      [encFile],
    );
    expect(decrypted.downloads[0].name).toBe('secret.pdf');
    expect(new TextDecoder().decode(decrypted.downloads[0].bytes)).toBe(
      'CONFIDENTIAL CONTRACT DATA',
    );

    await expect(
      runFileWorkbenchOperation(
        'file-decrypt',
        { password: 'wrong-password' },
        [encFile],
      ),
    ).rejects.toThrow('Incorrect password');
  });

  it('gzip-compresses and restores exact bytes', async () => {
    const source = makeFile('repeat.txt', 'hello '.repeat(1000), 'text/plain');
    const compressed = await runFileWorkbenchOperation('file-compressor', {}, [
      source,
    ]);
    expect(compressed.downloads[0].name).toBe('repeat.txt.gz');
    expect(compressed.downloads[0].bytes.length).toBeLessThan(source.size);
    const compressedCopy = new Uint8Array(compressed.downloads[0].bytes.length);
    compressedCopy.set(compressed.downloads[0].bytes);
    const restored = new Uint8Array(
      await new Response(
        new Blob([compressedCopy])
          .stream()
          .pipeThrough(new DecompressionStream('gzip')),
      ).arrayBuffer(),
    );
    expect(restored).toEqual(source.bytes);
  });

  it('splits and joins byte-exact chunks in selected order', async () => {
    const source = makeFile('sample.bin', 'abcdefghij');
    const split = await runFileWorkbenchOperation(
      'file-chunk-splitter',
      { chunkSize: '4' },
      [source],
    );
    expect(split.downloads.map((item) => item.bytes.length)).toEqual([4, 4, 2]);
    const joined = await runFileWorkbenchOperation(
      'file-chunk-joiner',
      { outputName: 'joined.bin' },
      split.downloads.map((item) => ({
        ...item,
        size: item.bytes.length,
        lastModified: 0,
      })),
    );
    expect(joined.downloads[0].bytes).toEqual(source.bytes);
  });

  it('verifies checksums and groups only exact-byte duplicates', async () => {
    await expect(
      runFileWorkbenchOperation(
        'file-checksum-verifier',
        defaults('file-checksum-verifier'),
        [hello],
      ),
    ).resolves.toMatchObject({ summary: 'Checksum matches' });
    const duplicates = await runFileWorkbenchOperation(
      'duplicate-file-finder',
      {},
      [hello, helloCopy, changed],
    );
    expect(duplicates.summary).toBe('1 duplicate groups');
    expect(duplicates.output).toContain('copy.txt');
  });

  it('detects common signatures and shows magic bytes', async () => {
    const detected = await runFileWorkbenchOperation('mime-type-detector', {}, [
      png,
    ]);
    expect(detected.output).toContain('signature: image/png (PNG)');
    const magic = await runFileWorkbenchOperation('magic-byte-inspector', {}, [
      png,
    ]);
    expect(magic.output).toContain('89 50 4e 47');
  });

  it('renames download copies without changing bytes', async () => {
    const cleaned = await runFileWorkbenchOperation(
      'filename-cleaner',
      { replacement: '-' },
      [hello],
    );
    expect(cleaned.downloads[0].name).toBe('draft-hello.txt');
    expect(cleaned.downloads[0].bytes).toEqual(hello.bytes);
    const sequence = await runFileWorkbenchOperation(
      'sequential-file-renamer',
      { prefix: 'photo', start: '7', padding: '3' },
      [png, hello],
    );
    expect(sequence.downloads.map((file) => file.name)).toEqual([
      'photo-007.png',
      'photo-008.txt',
    ]);
  });

  it('builds directory trees, hashed manifests, and CSV lists', async () => {
    const tree = await runFileWorkbenchOperation(
      'directory-tree-generator',
      {},
      [hello, png],
    );
    expect(tree.output).toContain('notes');
    expect(tree.output).toContain('images');
    const manifest = await runFileWorkbenchOperation(
      'folder-manifest-generator',
      {},
      [hello, png],
    );
    expect(manifest.output).toContain('"sha256"');
    expect(manifest.downloads[0].name).toBe('folder-manifest.json');
    const csv = await runFileWorkbenchOperation('file-list-to-csv', {}, [
      hello,
    ]);
    expect(csv.output).toContain('path,name,size_bytes');
  });

  it('finds empty/large files and renders bounded byte views', async () => {
    const emptyResult = await runFileWorkbenchOperation(
      'empty-file-finder',
      {},
      [hello, empty],
    );
    expect(emptyResult.output).toBe('empty.txt');
    const large = await runFileWorkbenchOperation(
      'large-file-finder',
      { threshold: '5' },
      [hello, world, empty],
    );
    expect(large.summary).toBe('2 files at or above 5 bytes');
    const view = await runFileWorkbenchOperation(
      'hex-viewer',
      { offset: '0', length: '5' },
      [hello],
    );
    expect(view.output).toContain('68 65 6c 6c 6f');
  });

  it('generates reviewable patches without mutating inputs', async () => {
    const before = hello.bytes.slice();
    const patch = await runFileWorkbenchOperation('hex-patch-generator', {}, [
      hello,
      changed,
    ]);
    expect(patch.summary).toBe('1 byte replacements');
    expect(patch.output).toContain('00000001: 65 -> 61');
    expect(hello.bytes).toEqual(before);
  });

  it('round-trips file bytes through Base64 and data URIs', async () => {
    const encoded = await runFileWorkbenchOperation('base64-file-encoder', {}, [
      hello,
    ]);
    expect(encoded.output).toBe('aGVsbG8=');
    const decoded = await runFileWorkbenchOperation(
      'base64-file-decoder',
      {
        input: encoded.output,
        outputName: 'decoded.txt',
        mime: 'text/plain',
      },
      [],
    );
    expect(decoded.downloads[0].bytes).toEqual(hello.bytes);
    const uri = await runFileWorkbenchOperation('data-uri-file-maker', {}, [
      hello,
    ]);
    const extracted = await runFileWorkbenchOperation(
      'data-uri-file-extractor',
      { input: uri.output, outputName: 'restored.txt' },
      [],
    );
    expect(extracted.downloads[0].bytes).toEqual(hello.bytes);
  });

  it('rejects unsafe sizes, malformed Base64, and unequal patch inputs', async () => {
    const mismatch = { ...hello, size: hello.size + 1 };
    await expect(
      runFileWorkbenchOperation('hex-viewer', { offset: '0', length: '5' }, [
        mismatch,
      ]),
    ).rejects.toThrow('does not match');
    await expect(
      runFileWorkbenchOperation(
        'base64-file-decoder',
        { input: '***', outputName: 'bad.bin', mime: '' },
        [],
      ),
    ).rejects.toThrow('valid standard Base64');
    await expect(
      runFileWorkbenchOperation('hex-patch-generator', {}, [hello, world]),
    ).rejects.toThrow('equal byte length');
  });

  it('inspects and strips EXIF metadata from JPEG and PNG files', async () => {
    const sampleJpegWithExif = makeFile(
      'photo.jpg',
      new Uint8Array([
        0xff,
        0xd8, // SOI
        0xff,
        0xe1, // APP1
        0x00,
        0x16, // Length (22 bytes)
        0x45,
        0x78,
        0x69,
        0x66,
        0x00,
        0x00, // "Exif\0\0"
        0x49,
        0x49, // II
        0x2a,
        0x00, // 42
        0x08,
        0x00,
        0x00,
        0x00, // IFD0 offset
        0x00,
        0x00, // 0 entries
        0xff,
        0xdb, // DQT
        0x00,
        0x04,
        0x00,
        0x00,
        0xff,
        0xda, // SOS
        0x00,
        0x02,
        0x12,
        0x34,
        0xff,
        0xd9, // EOI
      ]),
      'image/jpeg',
    );

    const inspected = await runFileWorkbenchOperation(
      'exif-metadata-inspector',
      {},
      [sampleJpegWithExif],
    );
    expect(inspected.summary).toContain('Inspected metadata across 1 file(s)');

    const stripped = await runFileWorkbenchOperation(
      'exif-metadata-stripper',
      { outputSuffix: '_clean' },
      [sampleJpegWithExif],
    );
    expect(stripped.summary).toContain('Scrubbed metadata from 1 image(s)');
    expect(stripped.downloads[0].name).toBe('photo_clean.jpg');
    // Ensure stripped JPEG does not contain APP1 (0xFF 0xE1)
    const outBytes = stripped.downloads[0].bytes;
    let foundApp1 = false;
    for (let i = 0; i < outBytes.length - 1; i++) {
      if (outBytes[i] === 0xff && outBytes[i + 1] === 0xe1) {
        foundApp1 = true;
        break;
      }
    }
    expect(foundApp1).toBe(false);
  });
});
