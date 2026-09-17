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
  // The metadata scrubber refuses anything that is not a JPEG or PNG, so the
  // smoke pass has to hand it a real image rather than a text file.
  if (id === 'exif-metadata-stripper' || id === 'exif-metadata-inspector')
    return [png];
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
    expect(stripped.summary).toContain('Cleaned 1 of 1 image(s)');
    expect(stripped.output).toContain('EXIF block (APP1)');
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

describe('image metadata scrubber', () => {
  const DQT = [0xff, 0xdb, 0x00, 0x04, 0x00, 0x00];
  const SOS = [0xff, 0xda, 0x00, 0x02, 0x12, 0x34];
  const EOI = [0xff, 0xd9];

  function segment(marker: number, payload: readonly number[]) {
    const length = payload.length + 2;
    return [0xff, marker, (length >> 8) & 0xff, length & 0xff, ...payload];
  }

  function ascii(text: string) {
    return Array.from(text, (character) => character.charCodeAt(0));
  }

  /** A real EXIF APP1 carrying exactly one tag: Orientation. */
  function exifOrientation(orientation: number) {
    return segment(0xe1, [
      ...ascii('Exif'),
      0x00,
      0x00,
      0x49,
      0x49,
      0x2a,
      0x00,
      0x08,
      0x00,
      0x00,
      0x00,
      0x01,
      0x00, // one entry
      0x12,
      0x01, // Orientation
      0x03,
      0x00, // SHORT
      0x01,
      0x00,
      0x00,
      0x00,
      orientation,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
    ]);
  }

  function jpegFile(name: string, ...body: number[][]) {
    return makeFile(
      name,
      Uint8Array.from([0xff, 0xd8, ...body.flat(), ...DQT, ...SOS, ...EOI]),
      'image/jpeg',
    );
  }

  function scrub(file: LocalFileInput) {
    return runFileWorkbenchOperation(
      'exif-metadata-stripper',
      { outputSuffix: '_clean' },
      [file],
    );
  }

  function contains(haystack: Uint8Array, needle: readonly number[]) {
    outer: for (
      let index = 0;
      index <= haystack.length - needle.length;
      index++
    ) {
      for (let offset = 0; offset < needle.length; offset++) {
        if (haystack[index + offset] !== needle[offset]) continue outer;
      }
      return true;
    }
    return false;
  }

  it.each([
    ['photo.webp', [...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WEBP')], 'WebP'],
    ['photo.heic', [0, 0, 0, 0x18, ...ascii('ftypheic')], 'HEIC/HEIF'],
    ['photo.avif', [0, 0, 0, 0x18, ...ascii('ftypavif')], 'AVIF'],
    ['scan.tif', [0x49, 0x49, 0x2a, 0x00, 0, 0, 0, 0], 'TIFF'],
    ['anim.gif', [...ascii('GIF89a'), 0, 0], 'GIF'],
  ])(
    'refuses %s instead of returning it unchanged',
    async (name, bytes, label) => {
      await expect(scrub(makeFile(name, bytes))).rejects.toThrow(label);
    },
  );

  it('keeps the ICC profile and the Adobe marker while dropping EXIF', async () => {
    const file = jpegFile(
      'shot.jpg',
      exifOrientation(1),
      segment(0xe2, [...ascii('ICC_PROFILE'), 0x00, 0x01, 0x01]),
      segment(0xee, [...ascii('Adobe'), 0x00, 0x64, 0x00, 0x00]),
    );
    const output = await scrub(file);
    const bytes = output.downloads[0].bytes;

    expect(contains(bytes, ascii('ICC_PROFILE'))).toBe(true);
    expect(contains(bytes, ascii('Adobe'))).toBe(true);
    expect(contains(bytes, ascii('Exif'))).toBe(false);
    expect(output.output).toContain('ICC colour profile (APP2)');
    expect(output.output).toContain('Adobe colour transform (APP14)');
  });

  it('preserves a rotation so the photo does not turn sideways', async () => {
    const output = await scrub(jpegFile('rotated.jpg', exifOrientation(6)));
    const bytes = output.downloads[0].bytes;

    // The only EXIF left is the exact 36-byte Orientation segment we re-wrote:
    // APP1, length 34, "Exif\0\0", little-endian TIFF, one SHORT tag 0x0112 = 6.
    expect(
      contains(bytes, [
        0xff,
        0xe1,
        0x00,
        0x22,
        ...ascii('Exif'),
        0x00,
        0x00,
        0x49,
        0x49,
        0x2a,
        0x00,
        0x08,
        0x00,
        0x00,
        0x00,
        0x01,
        0x00,
        0x12,
        0x01,
        0x03,
        0x00,
        0x01,
        0x00,
        0x00,
        0x00,
        0x06,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
      ]),
    ).toBe(true);
    // and nothing else from the original EXIF survived.
    expect(
      bytes.filter((byte, index) => byte === 0xff && bytes[index + 1] === 0xe1),
    ).toHaveLength(1);
    expect(output.output).toContain('Orientation 6');
  });

  it('drops XMP and comment blocks and names them in the report', async () => {
    const output = await scrub(
      jpegFile(
        'tagged.jpg',
        segment(0xe1, [...ascii('http://ns.adobe.com/xap/1.0/'), 0x00]),
        segment(0xfe, ascii('camera serial 12345')),
      ),
    );

    expect(contains(output.downloads[0].bytes, ascii('ns.adobe.com'))).toBe(
      false,
    );
    expect(contains(output.downloads[0].bytes, ascii('serial'))).toBe(false);
    expect(output.output).toContain('XMP metadata (APP1)');
    expect(output.output).toContain('JPEG comment (COM)');
  });

  it('removes a trailer hidden after the end-of-image marker', async () => {
    const withTrailer = makeFile(
      'motion.jpg',
      Uint8Array.from([
        0xff,
        0xd8,
        ...DQT,
        ...SOS,
        ...EOI,
        ...ascii('GPS 12.9716,77.5946'),
      ]),
      'image/jpeg',
    );
    const output = await scrub(withTrailer);

    expect(contains(output.downloads[0].bytes, ascii('GPS 12.9716'))).toBe(
      false,
    );
    expect(output.output).toContain('bytes after end-of-image');
  });

  it('keeps a PNG named .png and reports the chunks it removed', async () => {
    const textChunk = [
      0x00,
      0x00,
      0x00,
      0x05,
      ...ascii('tEXt'),
      ...ascii('hello'),
      0x00,
      0x00,
      0x00,
      0x00,
    ];
    const iend = [
      0x00,
      0x00,
      0x00,
      0x00,
      ...ascii('IEND'),
      0x00,
      0x00,
      0x00,
      0x00,
    ];
    const file = makeFile(
      'chart.png',
      Uint8Array.from([
        0x89,
        0x50,
        0x4e,
        0x47,
        0x0d,
        0x0a,
        0x1a,
        0x0a,
        ...textChunk,
        ...iend,
      ]),
      'image/png',
    );

    const output = await scrub(file);
    expect(output.downloads[0].name).toBe('chart_clean.png');
    expect(output.downloads[0].type).toBe('image/png');
    expect(contains(output.downloads[0].bytes, ascii('hello'))).toBe(false);
    expect(output.output).toContain('tEXt chunk');
  });

  it('cleans what it can and names what it refused in a mixed batch', async () => {
    const output = await runFileWorkbenchOperation(
      'exif-metadata-stripper',
      { outputSuffix: '_clean' },
      [
        jpegFile('ok.jpg', segment(0xfe, ascii('comment'))),
        makeFile('nope.webp', [...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WEBP')]),
      ],
    );

    expect(output.summary).toBe('Cleaned 1 of 2 image(s)');
    expect(output.downloads).toHaveLength(1);
    expect(output.output).toContain('nope.webp (WebP)');
    expect(output.output).toContain('no file was produced');
  });
});
