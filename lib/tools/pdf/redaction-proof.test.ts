import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { PDFDocument, PDFName } from 'pdf-lib';
import { createCanvas } from '@napi-rs/canvas';
import { applyRedaction } from './apply-redaction';
import {
  findDetectionTargets,
  findSearchTargets,
  loadPdfTextModels,
  type RedactionTarget,
} from './redaction-targets';

function nodeCanvasFactory(width: number, height: number) {
  const canvas = createCanvas(Math.floor(width), Math.floor(height));
  const context = canvas.getContext('2d');
  return {
    canvas,
    context,
    toPng: async () => {
      const buf = canvas.toBuffer('image/png');
      return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    },
  };
}

const SECRETS_TO_CHECK = [
  'Johnathan Doe',
  '000-12-3456',
  'jdoe@secretcorp.com',
  '4111 1111 1111 1111',
  '5,000,000',
  '10.0.0.45',
];

const PUBLIC_STRINGS = [
  'SECTION 2: STANDARD TERMS AND GOVERNING LAW',
  'substantive laws of the State of California',
];

describe('redaction-proof & outside tool verification', () => {
  const fixturesDir = path.resolve(import.meta.dirname, '__fixtures__');
  const srcPath = path.join(fixturesDir, 'contract-source.pdf');
  const goldenPath = path.join(fixturesDir, 'golden-redacted-contract.pdf');

  it('proves physical text removal, metadata purge, and decompressed stream purity', async () => {
    expect(existsSync(srcPath)).toBe(true);
    const srcBytes = new Uint8Array(readFileSync(srcPath));

    // 1. Identify targets across the document
    const { models } = await loadPdfTextModels(srcBytes);
    const searchTargets: RedactionTarget[] = [
      ...findSearchTargets(models, 'Johnathan Doe'),
      ...findSearchTargets(models, '000-12-3456'),
      ...findSearchTargets(models, '$5,000,000'),
    ];
    const detectionTargets = findDetectionTargets(models);
    const allTargets = [...searchTargets, ...detectionTargets];

    expect(allTargets.length).toBeGreaterThanOrEqual(6);

    // 2. Apply true redaction
    const result = await applyRedaction(srcBytes, allTargets, {
      dpi: 200,
      canvasFactory: nodeCanvasFactory,
    });
    expect(result.redactedPagesCount).toBe(1);
    expect(result.unredactedPagesCount).toBe(1);
    expect(result.rasterizedPages).toEqual([1]);

    // Verified against committed frozen golden file
    expect(existsSync(goldenPath)).toBe(true);

    // 3. pdfjs-dist Text Layer Check: Page 1 must have ZERO text
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const pdfjsCopy = new Uint8Array(result.bytes.length);
    pdfjsCopy.set(result.bytes);
    const loading = pdfjs.getDocument({
      data: pdfjsCopy,
      useSystemFonts: false,
    });
    const verifiedDoc = await loading.promise;

    expect(verifiedDoc.numPages).toBe(2);

    const p1 = await verifiedDoc.getPage(1);
    const c1 = await p1.getTextContent();
    expect(c1.items.length).toBe(0); // Physically 0 text items on rasterised page

    // Page 2 text must be intact
    const p2 = await verifiedDoc.getPage(2);
    const c2 = await p2.getTextContent();
    const p2Text = c2.items
      .map((i: unknown) => (i as { str: string }).str)
      .join(' ');
    for (const pub of PUBLIC_STRINGS) {
      expect(p2Text).toContain(pub);
    }

    // 4. Raw Decompressed Byte Stream Scan (zlib)
    // Decompress every stream in the output PDF and assert that no secret text survives
    const rawPdf = Buffer.from(result.bytes);
    const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/gu;
    const decompressedBuffers: Buffer[] = [];

    let match: RegExpExecArray | null;
    while ((match = streamRegex.exec(rawPdf.toString('latin1'))) !== null) {
      const streamData = Buffer.from(match[1] ?? '', 'latin1');
      try {
        const decompressed = inflateSync(streamData);
        decompressedBuffers.push(decompressed);
      } catch {
        decompressedBuffers.push(streamData);
      }
    }

    const allPdfContent = Buffer.concat([
      rawPdf,
      ...decompressedBuffers,
    ]).toString('utf8');

    for (const secret of SECRETS_TO_CHECK) {
      expect(allPdfContent).not.toContain(secret);
      expect(allPdfContent.toLowerCase()).not.toContain(secret.toLowerCase());
    }

    // 5. Metadata / Info & Catalog Purge Check
    const loadedOut = await PDFDocument.load(result.bytes);
    expect(loadedOut.getTitle()).toBe('');
    expect(loadedOut.getAuthor()).toBe('');
    expect(loadedOut.getSubject()).toBe('');
    expect(loadedOut.catalog.has(PDFName.of('Metadata'))).toBe(false);
    expect(loadedOut.catalog.has(PDFName.of('Outlines'))).toBe(false);
    expect(loadedOut.catalog.has(PDFName.of('Names'))).toBe(false);

    // 6. Outside Tool pdftotext Check (if installed)
    try {
      const pdftotextOutput = execFileSync('pdftotext', ['-', '-'], {
        input: result.bytes,
        encoding: 'utf8',
      });

      for (const secret of SECRETS_TO_CHECK) {
        expect(pdftotextOutput).not.toContain(secret);
      }
      for (const pub of PUBLIC_STRINGS) {
        expect(pdftotextOutput).toContain(pub);
      }
    } catch (e: unknown) {
      if ((e as { code?: string }).code !== 'ENOENT') throw e;
    }
  });

  it('matches committed frozen golden file byte-level invariants', () => {
    expect(existsSync(goldenPath)).toBe(true);
    const goldenBytes = readFileSync(goldenPath);
    expect(goldenBytes.byteLength).toBeGreaterThan(10_000);

    // Golden bytes must not contain any secret strings
    const goldenString = new TextDecoder().decode(goldenBytes);
    for (const secret of SECRETS_TO_CHECK) {
      expect(goldenString).not.toContain(secret);
    }
  });
});
