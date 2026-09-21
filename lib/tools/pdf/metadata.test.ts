import { describe, expect, it } from 'vitest';
import { PDFDocument, PDFHexString, PDFName } from 'pdf-lib';

import { readPdfMetadata, stripPdfMetadata } from './metadata';
import { compressPdf } from './engine';

/**
 * The fixture is built here rather than committed because its whole point is
 * the XMP packet, and a packet written by this file is readable in the diff —
 * a reviewer can see exactly which strings are supposed to disappear.
 */
const XMP = `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:xmp="http://ns.adobe.com/xap/1.0/"
    xmlns:xmpMM="http://ns.adobe.com/xap/1.0/mm/">
   <dc:title><rdf:Alt><rdf:li xml:lang="x-default">Confidential Merger Memo</rdf:li></rdf:Alt></dc:title>
   <dc:creator><rdf:Seq><rdf:li>Jane Partner</rdf:li></rdf:Seq></dc:creator>
   <xmp:CreatorTool>AcmeWriter 9</xmp:CreatorTool>
   <xmpMM:DocumentID>uuid:9f2b-lineage</xmpMM:DocumentID>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;

/** A document carrying identity in all four places. */
async function revealingPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create({ updateMetadata: false });
  doc.addPage();
  doc.setTitle('Confidential Merger Memo');
  doc.setAuthor('Jane Partner');
  doc.setSubject('Project Falcon');
  doc.setCreator('AcmeWriter 9');
  doc.setProducer('AcmeWriter 9');
  doc.setCreationDate(new Date('2021-03-04T05:06:07Z'));
  doc.setModificationDate(new Date('2022-07-08T09:10:11Z'));
  const stream = doc.context.stream(XMP, { Type: 'Metadata', Subtype: 'XML' });
  doc.catalog.set(PDFName.of('Metadata'), doc.context.register(stream));
  // pdf-lib writes no /ID of its own, but real writers do, so the fixture
  // carries one — otherwise the identifier path would never be exercised.
  doc.context.trailerInfo.ID = doc.context.obj([
    PDFHexString.of('0123456789abcdef0123456789abcdef'),
    PDFHexString.of('fedcba9876543210fedcba9876543210'),
  ]);
  return doc.save();
}

const asText = (bytes: Uint8Array) => Buffer.from(bytes).toString('latin1');

describe('reading what a PDF says about itself', () => {
  it('reports the Info fields', async () => {
    const report = await readPdfMetadata(await revealingPdf());
    const labels = report.findings.map((f) => f.label);
    expect(labels).toContain('Title');
    expect(labels).toContain('Author');
    expect(report.findings.find((f) => f.label === 'Author')?.value).toBe(
      'Jane Partner',
    );
  });

  it('reports the XMP packet separately from the Info fields', async () => {
    const report = await readPdfMetadata(await revealingPdf());
    expect(report.hasXmp).toBe(true);
    expect(report.xmpByteLength).toBeGreaterThan(0);
    const xmp = report.findings.filter((f) => f.source === 'xmp');
    expect(xmp.map((f) => f.label)).toContain('Authoring tool');
    expect(xmp.find((f) => f.label === 'Author (XMP)')?.value).toBe(
      'Jane Partner',
    );
    expect(xmp.find((f) => f.label === 'Document lineage id')?.value).toBe(
      'uuid:9f2b-lineage',
    );
  });

  it('reports both dates', async () => {
    const report = await readPdfMetadata(await revealingPdf());
    const dates = report.findings.filter((f) => f.source === 'dates');
    expect(dates.map((f) => f.label).sort()).toEqual(['Created', 'Modified']);
    expect(dates.find((f) => f.label === 'Created')?.value).toContain('2021');
  });

  it('finds nothing in a document that carries nothing', async () => {
    const bare = await PDFDocument.create({ updateMetadata: false });
    bare.addPage();
    const report = await readPdfMetadata(await bare.save());
    expect(report.findings).toEqual([]);
    expect(report.hasXmp).toBe(false);
  });
});

describe('stripping it', () => {
  /**
   * The regression this module exists for. `compressPdf`'s old option cleared
   * the six Info fields and left the XMP packet, so these exact strings
   * survived into a file the user believed was clean.
   */
  it('removes the names the old Info-only strip left behind', async () => {
    const { bytes } = await stripPdfMetadata(await revealingPdf());
    const text = asText(bytes);
    expect(text).not.toContain('Jane Partner');
    expect(text).not.toContain('Confidential Merger Memo');
    expect(text).not.toContain('AcmeWriter 9');
    expect(text).not.toContain('uuid:9f2b-lineage');
    expect(text).not.toContain('xmpmeta');
  });

  it('leaves no Info dictionary, XMP stream or file identifier', async () => {
    const { bytes } = await stripPdfMetadata(await revealingPdf());
    const after = await PDFDocument.load(bytes, { updateMetadata: false });
    expect(after.catalog.get(PDFName.of('Metadata'))).toBeUndefined();
    expect(after.context.trailerInfo.Info).toBeUndefined();
    expect(after.context.trailerInfo.ID).toBeUndefined();
    expect((await readPdfMetadata(bytes)).findings).toEqual([]);
  });

  it('does not stamp pdf-lib as the producer of the cleaned file', async () => {
    // Measured before this module existed: a default load-and-save wrote
    // `pdf-lib (https://github.com/Hopding/pdf-lib)` into Producer even after
    // setProducer(''). Loading with updateMetadata:false is what prevents it.
    const { bytes } = await stripPdfMetadata(await revealingPdf());
    expect(asText(bytes)).not.toContain('pdf-lib');
    expect(asText(bytes)).not.toContain('Hopding');
  });

  it('does not stamp a fresh modification date on a cleaned file', async () => {
    const { bytes } = await stripPdfMetadata(await revealingPdf());
    const after = await PDFDocument.load(bytes, { updateMetadata: false });
    expect(after.context.trailerInfo.Info).toBeUndefined();
    expect(asText(bytes)).not.toContain('ModDate');
  });

  it('keeps the page count, because this touches nothing on the page', async () => {
    const original = await revealingPdf();
    const { bytes } = await stripPdfMetadata(original);
    const before = await PDFDocument.load(original, { updateMetadata: false });
    const after = await PDFDocument.load(bytes, { updateMetadata: false });
    expect(after.getPageCount()).toBe(before.getPageCount());
  });

  it('reports exactly what it removed', async () => {
    const { removed, alreadyClean } = await stripPdfMetadata(
      await revealingPdf(),
    );
    expect(alreadyClean).toBe(false);
    const sources = new Set(removed.map((f) => f.source));
    expect([...sources].sort()).toEqual(['dates', 'id', 'info', 'xmp']);
  });

  it('returns a clean file unchanged rather than rewriting it', async () => {
    const bare = await PDFDocument.create({ updateMetadata: false });
    bare.addPage();
    const original = await bare.save();
    const result = await stripPdfMetadata(original);
    expect(result.alreadyClean).toBe(true);
    expect(result.removed).toEqual([]);
    expect(result.bytes).toBe(original);
  });
});

describe('the compress option that promised this all along', () => {
  /**
   * `metadata.test.ts` above proves the strip works. It cannot prove
   * `compressPdf` calls it — and for the whole life of the old code the Info
   * fields were cleared by hand there, so the unit tests of every other part
   * stayed green while the option under-delivered. This is the wiring test.
   */
  it('removes the XMP packet the old Info-only clear left behind', async () => {
    const original = await revealingPdf();
    const result = await compressPdf(
      {
        id: 'metadata-wiring',
        name: 'memo.pdf',
        bytes: original.buffer.slice(
          original.byteOffset,
          original.byteOffset + original.byteLength,
        ) as ArrayBuffer,
      },
      {
        recompressImages: false,
        imageQuality: 80,
        maxImageDimension: 2000,
        removeMetadata: true,
      },
    );
    const text = asText(result.bytes);
    expect(text).not.toContain('Jane Partner');
    expect(text).not.toContain('xmpmeta');
    expect(text).not.toContain('AcmeWriter 9');
  });

  it('leaves metadata alone when the option is off', async () => {
    const original = await revealingPdf();
    const result = await compressPdf(
      {
        id: 'metadata-wiring-off',
        name: 'memo.pdf',
        bytes: original.buffer.slice(
          original.byteOffset,
          original.byteOffset + original.byteLength,
        ) as ArrayBuffer,
      },
      {
        recompressImages: false,
        imageQuality: 80,
        maxImageDimension: 2000,
        removeMetadata: false,
      },
    );
    expect(asText(result.bytes)).toContain('Jane Partner');
  });
});
