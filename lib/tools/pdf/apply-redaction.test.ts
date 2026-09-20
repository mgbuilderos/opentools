import { describe, expect, it } from 'vitest';
import { PDFDocument, PDFName, rgb, StandardFonts } from 'pdf-lib';
import { applyRedaction } from './apply-redaction';
import type { RedactionTarget } from './redaction-targets';

describe('apply-redaction engine', () => {
  async function createTestPdfWithMetadata(): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);

    // Page 1: Sensitive info
    const page1 = doc.addPage([400, 400]);
    page1.drawText('CONFIDENTIAL SETTLEMENT: Johnathan Doe', {
      x: 50,
      y: 350,
      size: 14,
      font,
      color: rgb(0, 0, 0),
    });
    page1.drawText('Secret Wire: $500,000 to Account 987654321', {
      x: 50,
      y: 300,
      size: 12,
      font,
      color: rgb(0, 0, 0),
    });

    // Page 2: General terms (untouched)
    const page2 = doc.addPage([400, 400]);
    page2.drawText('General Terms & Conditions: Governed by California law.', {
      x: 50,
      y: 350,
      size: 12,
      font,
      color: rgb(0, 0, 0),
    });

    // Metadata leaks
    doc.setTitle('Confidential Settlement - Johnathan Doe');
    doc.setAuthor('Attorney Jane Smith');
    doc.setSubject('Client Secrets');
    doc.setKeywords(['confidential', 'doe', 'settlement']);

    // Set fake XMP metadata
    const catalog = doc.catalog;
    const xmpStream = doc.context.stream('<x:xmpmeta>Secret Author Johnathan Doe</x:xmpmeta>');
    catalog.set(PDFName.of('Metadata'), doc.context.register(xmpStream));

    // Add an annotation to page 2
    page2.node.set(PDFName.of('Annots'), doc.context.obj([doc.context.obj({ Subtype: 'Text' })]));

    return doc.save();
  }

  it('rejects empty PDF (0 bytes)', async () => {
    await expect(applyRedaction(new Uint8Array(0), [])).rejects.toThrow(
      'This PDF file is empty (0 bytes)',
    );
  });

  it('rejects 0-page PDF', async () => {
    const zeroPagePdf = `%PDF-1.4\n1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj\n2 0 obj <</Type /Pages /Kids [] /Count 0>> endobj\nxref\n0 3\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \ntrailer <</Size 3 /Root 1 0 R>>\nstartxref\n114\n%%EOF`;
    const bytes = new TextEncoder().encode(zeroPagePdf);
    await expect(applyRedaction(bytes, [])).rejects.toThrow(
      'This PDF contains 0 pages',
    );
  });

  it('rasterises only the redacted page and leaves the unredacted page intact', async () => {
    const pdfBytes = await createTestPdfWithMetadata();

    const targets: RedactionTarget[] = [
      {
        id: 'redact-1',
        pageNumber: 1,
        rect: { x: 45, y: 340, width: 300, height: 25 },
        label: 'Client Name',
        source: 'manual',
      },
    ];

    const result = await applyRedaction(pdfBytes, targets, { dpi: 150 });

    expect(result.redactedPagesCount).toBe(1);
    expect(result.unredactedPagesCount).toBe(1);
    expect(result.totalRedactionsCount).toBe(1);
    expect(result.rasterizedPages).toEqual([1]);
    expect(result.purgedMetadata.infoCleared).toBe(true);
    expect(result.purgedMetadata.xmpPurged).toBe(true);
    expect(result.purgedMetadata.annotationsPurged).toBe(true);

    // Verify output with pdfjs-dist
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const loading = pdfjs.getDocument({ data: result.bytes, useSystemFonts: false });
    const verifiedDoc = await loading.promise;

    expect(verifiedDoc.numPages).toBe(2);

    // Page 1 should have ZERO text items (rasterised image page)
    const p1 = await verifiedDoc.getPage(1);
    const c1 = await p1.getTextContent();
    expect(c1.items.length).toBe(0);

    // Page 2 should retain its text layer (untouched page)
    const p2 = await verifiedDoc.getPage(2);
    const c2 = await p2.getTextContent();
    expect(c2.items.length).toBeGreaterThan(0);
    const page2Text = c2.items.map((i: any) => i.str).join(' ');
    expect(page2Text).toContain('General Terms & Conditions');
  });

  it('purges document metadata, title, author, XMP stream, and annotations', async () => {
    const pdfBytes = await createTestPdfWithMetadata();
    const result = await applyRedaction(pdfBytes, []);

    const loaded = await PDFDocument.load(result.bytes);
    expect(loaded.getTitle()).toBe('');
    expect(loaded.getAuthor()).toBe('');
    expect(loaded.getSubject()).toBe('');
    expect(loaded.getKeywords()).toBe('');

    // Catalog should have no Metadata object
    expect(loaded.catalog.has(PDFName.of('Metadata'))).toBe(false);

    // Pages should have no Annots
    for (const p of loaded.getPages()) {
      expect(p.node.has(PDFName.of('Annots'))).toBe(false);
    }
  });
});
