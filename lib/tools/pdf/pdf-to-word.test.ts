import { PDFDocument, StandardFonts } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import { buildDocx } from '../docx/document';
import { countCharacters, pagesToBlocks, readPdfText } from './pdf-text';
import { convertPdfToWord, PdfToWordError } from './pdf-to-word';

/** A PDF with a real text layer, laid out like an ordinary document. */
async function textPdf(): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const body = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const one = pdf.addPage([595, 842]);
  one.drawText('Rental Agreement', { x: 60, y: 780, size: 20, font: bold });
  one.drawText('This agreement is made between the owner', {
    x: 60,
    y: 740,
    size: 11,
    font: body,
  });
  one.drawText('and the tenant on the date below.', {
    x: 60,
    y: 726,
    size: 11,
    font: body,
  });
  one.drawText('Rent is payable monthly in advance.', {
    x: 60,
    y: 660,
    size: 11,
    font: body,
  });

  const two = pdf.addPage([595, 842]);
  two.drawText('Second page content.', {
    x: 60,
    y: 780,
    size: 11,
    font: body,
  });
  return pdf.save();
}

/** A page with no text layer at all — what a scan or photo produces. */
async function scannedPdf(): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  page.drawRectangle({ x: 40, y: 40, width: 500, height: 700 });
  return pdf.save();
}

describe('pdf to word, end to end', () => {
  it('pulls the text out of a real PDF in reading order', async () => {
    const pages = await readPdfText(await textPdf());
    expect(pages).toHaveLength(2);

    const blocks = pagesToBlocks(pages);
    const paragraphs = blocks
      .filter((block) => block.kind === 'paragraph')
      .map((block) =>
        block.kind === 'paragraph'
          ? block.runs.map((run) => run.text).join('')
          : '',
      );

    expect(paragraphs[0]).toBe('Rental Agreement');
    // The two wrapped lines become one paragraph, in order.
    expect(paragraphs[1]).toBe(
      'This agreement is made between the owner and the tenant on the date below.',
    );
    expect(paragraphs[2]).toBe('Rent is payable monthly in advance.');
    expect(paragraphs[3]).toBe('Second page content.');
    expect(blocks.some((block) => block.kind === 'pageBreak')).toBe(true);
  });

  it('marks the larger title as a heading', async () => {
    const blocks = pagesToBlocks(await readPdfText(await textPdf()));
    const first = blocks[0]!;
    if (first.kind !== 'paragraph') throw new Error('expected a paragraph');
    expect(first.runs[0]!.text).toBe('Rental Agreement');
    expect(first.runs[0]!.bold).toBe(true);
  });

  it('produces a .docx that carries the PDF text', async () => {
    const blocks = pagesToBlocks(await readPdfText(await textPdf()));
    const docx = await buildDocx(blocks);
    // ZIP magic, so a reader will open it at all.
    expect(docx[0]).toBe(0x50);
    expect(docx[1]).toBe(0x4b);
    const asText = new TextDecoder().decode(docx);
    // The parts are deflated, so assert on size and structure rather than text.
    expect(asText).toContain('word/document.xml');
    expect(docx.length).toBeGreaterThan(500);
  });

  it('reports a scanned page as having no text, rather than converting it to nothing', async () => {
    const pages = await readPdfText(await scannedPdf());
    expect(pages).toHaveLength(1);
    expect(countCharacters(pages)).toBe(0);
  });
});

describe('convertPdfToWord', () => {
  it('returns a document plus counts taken from the real conversion', async () => {
    const result = await convertPdfToWord(await textPdf());
    expect(result.pageCount).toBe(2);
    expect(result.paragraphCount).toBe(4);
    expect(result.characterCount).toBeGreaterThan(100);
    expect(result.pagesWithoutText).toBe(0);
    expect(result.bytes[0]).toBe(0x50);
  });

  it('refuses a scanned PDF by name instead of producing an empty file', async () => {
    await expect(convertPdfToWord(await scannedPdf())).rejects.toThrow(
      PdfToWordError,
    );
    await expect(convertPdfToWord(await scannedPdf())).rejects.toThrow(
      /no text in it/iu,
    );
    // The reason has to be machine-readable so the page can explain it.
    await expect(convertPdfToWord(await scannedPdf())).rejects.toMatchObject({
      code: 'NO_TEXT_LAYER',
    });
  });

  it('refuses a file that is not a PDF at all', async () => {
    const notAPdf = new TextEncoder().encode('this is plainly not a PDF');
    await expect(convertPdfToWord(notAPdf)).rejects.toMatchObject({
      code: 'UNREADABLE_PDF',
    });
  });

  it('counts pages that carry no text, so a part-scanned file is not silently halved', async () => {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    pdf.addPage([595, 842]).drawText('Only this page has text.', {
      x: 60,
      y: 780,
      size: 11,
      font,
    });
    pdf.addPage([595, 842]).drawRectangle({
      x: 40,
      y: 40,
      width: 500,
      height: 700,
    });
    const result = await convertPdfToWord(await pdf.save());
    expect(result.pageCount).toBe(2);
    expect(result.pagesWithoutText).toBe(1);
  });
});
