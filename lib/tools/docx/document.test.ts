import { describe, expect, it } from 'vitest';

import { buildDocumentXml, buildDocx, escapeXml } from './document';
import { crc32, createZip } from './zip';

function findEntryNames(zip: Uint8Array): string[] {
  // Walk local file headers rather than the central directory: if the two ever
  // disagree, this notices, and readers start from the local headers too.
  const names: string[] = [];
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const decoder = new TextDecoder();
  let offset = 0;
  while (
    offset + 30 <= zip.length &&
    view.getUint32(offset, true) === 0x04034b50
  ) {
    const compressedSize = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    names.push(
      decoder.decode(zip.subarray(offset + 30, offset + 30 + nameLength)),
    );
    offset += 30 + nameLength + extraLength + compressedSize;
  }
  return names;
}

describe('docx writer', () => {
  it('computes CRC-32 matching the published test vector', () => {
    // "123456789" -> 0xCBF43926 is the standard CRC-32 check value.
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
    expect(crc32(new Uint8Array(0))).toBe(0);
  });

  it('writes a ZIP whose local headers list every entry in order', async () => {
    const encoder = new TextEncoder();
    const zip = await createZip([
      { path: 'a.txt', data: encoder.encode('alpha') },
      { path: 'nested/b.txt', data: encoder.encode('beta') },
    ]);
    expect(zip[0]).toBe(0x50);
    expect(zip[1]).toBe(0x4b);
    expect(findEntryNames(zip)).toEqual(['a.txt', 'nested/b.txt']);
  });

  it('escapes XML and drops control characters a reader would reject', () => {
    expect(escapeXml('a & b < c > d "e" \'f\'')).toBe(
      'a &amp; b &lt; c &gt; d &quot;e&quot; &apos;f&apos;',
    );
    // A stray control byte from a PDF must not make the document unopenable.
    expect(escapeXml('keepthis')).toBe('keepthis');
    expect(escapeXml('tab\tnewline\n')).toBe('tab\tnewline\n');
  });

  it('keeps leading and trailing spaces inside a run', () => {
    const xml = buildDocumentXml([
      { kind: 'paragraph', runs: [{ text: '  indented  ' }] },
    ]);
    expect(xml).toContain('xml:space="preserve"');
    expect(xml).toContain('>  indented  <');
  });

  it('marks bold and size as direct formatting', () => {
    const xml = buildDocumentXml([
      {
        kind: 'paragraph',
        runs: [{ text: 'Title', bold: true, sizeHalfPoints: 32 }],
      },
    ]);
    expect(xml).toContain('<w:b/>');
    expect(xml).toContain('<w:sz w:val="32"/>');
  });

  it('emits a real page break block', () => {
    const xml = buildDocumentXml([{ kind: 'pageBreak' }]);
    expect(xml).toContain('<w:br w:type="page"/>');
  });

  it('packages the three parts a reader needs', async () => {
    const docx = await buildDocx([
      { kind: 'paragraph', runs: [{ text: 'Hello' }] },
    ]);
    const names = findEntryNames(docx);
    expect(names[0]).toBe('[Content_Types].xml');
    expect(names).toContain('_rels/.rels');
    expect(names).toContain('word/document.xml');
  });

  it('produces an empty paragraph rather than an empty run list', () => {
    expect(buildDocumentXml([{ kind: 'paragraph', runs: [] }])).toContain(
      '<w:p/>',
    );
  });
});
