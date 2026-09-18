import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createZip, crc32 } from '../docx/zip';
import {
  extractEntry,
  readZip,
  SUPPORTED_METHODS,
  unsafePathReason,
} from './zip-reader';

const fixtureDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '__fixtures__',
);

function fixture(name: string): Uint8Array {
  return new Uint8Array(readFileSync(path.join(fixtureDir, name)));
}

const decoder = new TextDecoder();

/**
 * A one-entry stored ZIP with whatever name bytes and flags a test needs.
 * Hand-built because the writer in `docx/zip.ts` always declares UTF-8 names,
 * and half the archives in the world do not.
 */
function buildZip(options: {
  nameBytes: Uint8Array;
  data: Uint8Array;
  flags: number;
  method?: number;
}): Uint8Array {
  const { nameBytes, data, flags } = options;
  const method = options.method ?? 0;
  const crc = crc32(data);

  const local = new Uint8Array(30 + nameBytes.length);
  const localView = new DataView(local.buffer);
  localView.setUint32(0, 0x04034b50, true);
  localView.setUint16(4, 20, true);
  localView.setUint16(6, flags, true);
  localView.setUint16(8, method, true);
  localView.setUint32(14, crc, true);
  localView.setUint32(18, data.length, true);
  localView.setUint32(22, data.length, true);
  localView.setUint16(26, nameBytes.length, true);
  local.set(nameBytes, 30);

  const central = new Uint8Array(46 + nameBytes.length);
  const centralView = new DataView(central.buffer);
  centralView.setUint32(0, 0x02014b50, true);
  centralView.setUint16(6, 20, true);
  centralView.setUint16(8, flags, true);
  centralView.setUint16(10, method, true);
  centralView.setUint32(16, crc, true);
  centralView.setUint32(20, data.length, true);
  centralView.setUint32(24, data.length, true);
  centralView.setUint16(28, nameBytes.length, true);
  centralView.setUint32(42, 0, true);
  central.set(nameBytes, 46);

  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, 1, true);
  endView.setUint16(10, 1, true);
  endView.setUint32(12, central.length, true);
  endView.setUint32(16, local.length + data.length, true);

  const out = new Uint8Array(
    local.length + data.length + central.length + end.length,
  );
  out.set(local, 0);
  out.set(data, local.length);
  out.set(central, local.length + data.length);
  out.set(end, local.length + data.length + central.length);
  return out;
}

describe('reading a real archive', () => {
  // Ground truth from `unzip -l`: 5 entries, 2 of them folders, 470 bytes of
  // content across notes/readme.txt (429), notes/sub/second.txt (12) and the
  // Devanagari-named file (29).
  it('lists everything the system unzip lists', () => {
    const archive = readZip(fixture('simple.zip'));
    expect(archive.entries).toHaveLength(5);
    expect(archive.fileCount).toBe(3);
    expect(archive.directoryCount).toBe(2);
    expect(archive.totalUncompressed).toBe(470);
    expect(archive.encryptedCount).toBe(0);
    expect(archive.unsupportedCount).toBe(0);
    expect(archive.unsafeCount).toBe(0);
  });

  it('keeps folder entries apart from files', () => {
    const archive = readZip(fixture('simple.zip'));
    const folders = archive.entries.filter((entry) => entry.isDirectory);
    expect(folders.map((entry) => entry.path).sort()).toEqual([
      'notes/',
      'notes/sub/',
    ]);
  });

  it('reads a Devanagari filename even though the archive never flagged it as UTF-8', () => {
    // macOS `zip` writes UTF-8 names with the UTF-8 flag cleared. Trusting the
    // flag would turn this name into CP437 line-drawing characters.
    const archive = readZip(fixture('simple.zip'));
    const names = archive.entries.map((entry) => entry.path);
    expect(names).toContain('notes/हिंदी.txt');
  });

  it('gives each entry a real modification date', () => {
    const archive = readZip(fixture('simple.zip'));
    const file = archive.entries.find(
      (entry) => entry.path === 'notes/readme.txt',
    )!;
    expect(file.modified).toBeInstanceOf(Date);
    expect(file.modified!.getFullYear()).toBeGreaterThanOrEqual(2026);
  });

  it('reports deflate and stored as the methods they are', () => {
    const deflated = readZip(fixture('simple.zip')).entries.find(
      (entry) => entry.path === 'notes/readme.txt',
    )!;
    expect(deflated.method).toBe(8);
    expect(deflated.methodName).toBe('deflate');
    expect(deflated.compressedSize).toBeLessThan(deflated.uncompressedSize);

    const stored = readZip(fixture('stored.zip')).entries.find(
      (entry) => !entry.isDirectory,
    )!;
    expect(stored.method).toBe(0);
    expect(stored.methodName).toBe('stored (no compression)');
    expect(stored.compressedSize).toBe(stored.uncompressedSize);
  });
});

describe('taking a file out of an archive', () => {
  it('inflates a deflated entry back to its exact contents', async () => {
    const bytes = fixture('simple.zip');
    const entry = readZip(bytes).entries.find(
      (item) => item.path === 'notes/readme.txt',
    )!;
    const data = await extractEntry(bytes, entry);
    expect(data.length).toBe(429);
    expect(decoder.decode(data)).toContain('Hello from a deflated file.');
  });

  it('returns a stored entry byte for byte', async () => {
    const bytes = fixture('stored.zip');
    const entry = readZip(bytes).entries.find((item) => !item.isDirectory)!;
    const data = await extractEntry(bytes, entry);
    expect(crc32(data)).toBe(entry.crc32);
  });

  it('returns Unicode content unchanged', async () => {
    const bytes = fixture('simple.zip');
    const entry = readZip(bytes).entries.find(
      (item) => item.path === 'notes/हिंदी.txt',
    )!;
    expect(decoder.decode(await extractEntry(bytes, entry))).toBe(
      'रिपोर्ट ₹500\n',
    );
  });

  it('refuses a folder rather than returning nothing', async () => {
    const bytes = fixture('simple.zip');
    const folder = readZip(bytes).entries.find((item) => item.isDirectory)!;
    await expect(extractEntry(bytes, folder)).rejects.toThrow(
      'is a folder, not a file',
    );
  });

  it('round-trips through our own writer', async () => {
    const original = new Uint8Array(1000);
    for (let index = 0; index < original.length; index += 1) {
      original[index] = index % 251;
    }
    const zip = await createZip([{ path: 'data/blob.bin', data: original }]);
    const archive = readZip(zip);
    expect(archive.fileCount).toBe(1);
    const back = await extractEntry(zip, archive.entries[0]);
    expect(Buffer.from(back)).toEqual(Buffer.from(original));
  });
});

describe('what it refuses, and why', () => {
  it('names a password-protected entry instead of returning rubbish', async () => {
    const bytes = fixture('encrypted.zip');
    const archive = readZip(bytes);
    const entry = archive.entries.find((item) => !item.isDirectory)!;
    expect(entry.encrypted).toBe(true);
    expect(archive.encryptedCount).toBe(1);
    await expect(extractEntry(bytes, entry)).rejects.toThrow(
      'password-protected',
    );
  });

  it('catches a damaged entry through its checksum', async () => {
    const bytes = fixture('stored.zip');
    const archive = readZip(bytes);
    const entry = archive.entries.find((item) => !item.isDirectory)!;
    // Flip one byte of the stored payload. The size still matches, so only the
    // checksum can tell that this file is no longer what was put in.
    const damaged = bytes.slice();
    const view = new DataView(damaged.buffer);
    const dataStart =
      entry.localHeaderOffset +
      30 +
      view.getUint16(entry.localHeaderOffset + 26, true) +
      view.getUint16(entry.localHeaderOffset + 28, true);
    damaged[dataStart] ^= 0xff;

    await expect(extractEntry(damaged, entry)).rejects.toThrow(
      'failed its checksum',
    );
  });

  it('says a truncated archive is truncated', () => {
    const bytes = fixture('simple.zip');
    expect(() => readZip(bytes.slice(0, bytes.length - 40))).toThrow(
      'its index is missing',
    );
  });

  it('tells RAR and 7z apart from ZIP rather than failing vaguely', () => {
    const rar = new Uint8Array([
      0x52,
      0x61,
      0x72,
      0x21,
      0x1a,
      0x07,
      0,
      ...new Uint8Array(40),
    ]);
    expect(() => readZip(rar)).toThrow(
      'RAR, 7z and tar.gz are different formats',
    );
    expect(() => readZip(new Uint8Array(4))).toThrow('too small to be a ZIP');
  });

  it('refuses ZIP64 by name instead of reading it wrongly', () => {
    const zip = buildZip({
      nameBytes: new TextEncoder().encode('a.txt'),
      data: new TextEncoder().encode('hi'),
      flags: 0x0800,
    });
    // Saturate the entry count, which is how ZIP64 announces itself.
    const view = new DataView(zip.buffer);
    view.setUint16(zip.length - 22 + 10, 0xffff, true);
    expect(() => readZip(zip)).toThrow('ZIP64 archive');
  });

  it('refuses a compression method it cannot actually do', async () => {
    const zip = buildZip({
      nameBytes: new TextEncoder().encode('a.txt'),
      data: new TextEncoder().encode('hi'),
      flags: 0x0800,
      method: 14, // LZMA
    });
    const archive = readZip(zip);
    expect(archive.entries[0].supported).toBe(false);
    expect(archive.entries[0].methodName).toBe('LZMA');
    expect(archive.unsupportedCount).toBe(1);
    await expect(extractEntry(zip, archive.entries[0])).rejects.toThrow(
      'uses LZMA, which this page cannot decompress',
    );
  });

  it('supports exactly the two methods it claims to', () => {
    expect([...SUPPORTED_METHODS].sort((a, b) => a - b)).toEqual([0, 8]);
  });
});

describe('paths that would escape the folder you extract into', () => {
  it.each([
    ['../escape.txt', 'walks out of the folder'],
    ['a/../../escape.txt', 'walks out of the folder'],
    ['/etc/passwd', 'root of the drive'],
    ['C:\\Windows\\System32\\x.dll', 'Windows drive letter'],
    ['folder\\file.txt', 'backslashes'],
    ['', 'no name'],
  ])('flags %s', (badPath, reason) => {
    expect(unsafePathReason(badPath)).toContain(reason);
  });

  it.each(['notes/readme.txt', 'a.txt', 'deep/nested/path/file.bin'])(
    'leaves %s alone',
    (goodPath) => {
      expect(unsafePathReason(goodPath)).toBeNull();
    },
  );

  it('flags a name that hides control characters', () => {
    const sneaky = `invoice${String.fromCharCode(13)}.exe`;
    expect(unsafePathReason(sneaky)).toContain('control characters');
  });

  it('counts an unsafe entry in the archive summary', () => {
    const zip = buildZip({
      nameBytes: new TextEncoder().encode('../../.ssh/authorized_keys'),
      data: new TextEncoder().encode('ssh-rsa AAAA'),
      flags: 0x0800,
    });
    const archive = readZip(zip);
    expect(archive.unsafeCount).toBe(1);
    expect(archive.entries[0].pathWarning).toContain('walks out of the folder');
  });
});

describe('filenames from archives that are not UTF-8', () => {
  it('reads a CP437 name, which is what older Windows tools write', () => {
    // 0x81 is ü and 0xA4 is ñ in code page 437. Read as UTF-8 or Latin-1 these
    // would come out as replacement characters or the wrong letters entirely.
    const nameBytes = new Uint8Array([
      0x6d, 0x81, 0x6e, 0x63, 0x68, 0x65, 0x6e, 0x2d, 0xa4, 0x2e, 0x74, 0x78,
      0x74,
    ]);
    const zip = buildZip({
      nameBytes,
      data: new TextEncoder().encode('x'),
      flags: 0, // no UTF-8 flag
    });
    const archive = readZip(zip);
    expect(archive.entries[0].path).toBe('münchen-ñ.txt');
    expect(archive.entries[0].nameEncoding).toBe('cp437');
  });

  it('falls back to CP437 when a name claims UTF-8 and is not', () => {
    const zip = buildZip({
      nameBytes: new Uint8Array([0xff, 0xfe, 0x2e, 0x74, 0x78, 0x74]),
      data: new TextEncoder().encode('x'),
      flags: 0x0800, // claims UTF-8, but these bytes are not valid UTF-8
    });
    expect(readZip(zip).entries[0].path).toBe(
      String.fromCharCode(0xa0) + '■.txt',
    );
  });
});
