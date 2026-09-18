import { describe, expect, it } from 'vitest';

import {
  countCharacters,
  groupIntoLines,
  pagesToBlocks,
  type PdfPageText,
  type PdfTextItem,
} from './pdf-text';

function item(
  text: string,
  x: number,
  y: number,
  options: Partial<PdfTextItem> = {},
): PdfTextItem {
  return {
    text,
    x,
    y,
    width: options.width ?? text.length * 5,
    fontSize: options.fontSize ?? 12,
    bold: options.bold ?? false,
  };
}

function paragraphTexts(pages: PdfPageText[]) {
  return pagesToBlocks(pages)
    .filter((block) => block.kind === 'paragraph')
    .map((block) =>
      block.kind === 'paragraph'
        ? block.runs.map((run) => run.text).join('')
        : '',
    );
}

describe('pdf text layout', () => {
  it('reads lines down the page, not in PDF storage order', () => {
    // PDF y grows upward, so the visually first line has the largest y.
    const lines = groupIntoLines([
      item('bottom', 50, 100),
      item('top', 50, 700),
      item('middle', 50, 400),
    ]);
    expect(lines.map((line) => line.items[0]!.text)).toEqual([
      'top',
      'middle',
      'bottom',
    ]);
  });

  it('joins items on one line and infers the spaces PDFs omit', () => {
    // "Hello" ends at x=80; "world" starts at 95 — a real gap.
    const [line] = paragraphTexts([
      {
        items: [item('Hello', 50, 700, { width: 30 }), item('world', 95, 700)],
      },
    ]);
    expect(line).toBe('Hello world');
  });

  it('does not invent a space between adjacent glyph runs', () => {
    const [line] = paragraphTexts([
      { items: [item('Rs', 50, 700, { width: 12 }), item('500', 62, 700)] },
    ]);
    expect(line).toBe('Rs500');
  });

  it('keeps a wrapped sentence as one paragraph', () => {
    const blocks = paragraphTexts([
      {
        items: [
          item('This sentence continues', 50, 700),
          item('onto the next line.', 50, 686),
        ],
      },
    ]);
    expect(blocks).toEqual(['This sentence continues onto the next line.']);
  });

  it('splits a paragraph when the vertical gap widens', () => {
    const blocks = paragraphTexts([
      {
        items: [
          item('First paragraph.', 50, 700),
          item('Still the first.', 50, 686),
          item('A separate paragraph.', 50, 610),
        ],
      },
    ]);
    expect(blocks).toEqual([
      'First paragraph. Still the first.',
      'A separate paragraph.',
    ]);
  });

  it('treats noticeably larger text as a heading and keeps it separate', () => {
    const blocks = pagesToBlocks([
      {
        items: [
          item('Section Title', 50, 700, { fontSize: 20 }),
          item('Body text follows here.', 50, 676),
          item('And continues.', 50, 662),
        ],
      },
    ]).filter((block) => block.kind === 'paragraph');

    expect(blocks).toHaveLength(2);
    const heading = blocks[0]!;
    const body = blocks[1]!;
    if (heading.kind !== 'paragraph' || body.kind !== 'paragraph') {
      throw new Error('expected paragraphs');
    }
    expect(heading.runs[0]!.text).toBe('Section Title');
    expect(heading.runs[0]!.bold).toBe(true);
    expect(heading.runs[0]!.sizeHalfPoints).toBe(40);
    expect(body.runs[0]!.text).toBe('Body text follows here. And continues.');
    expect(body.runs[0]!.bold).toBeUndefined();
  });

  it('puts a page break between pages and none before the first', () => {
    const blocks = pagesToBlocks([
      { items: [item('Page one', 50, 700)] },
      { items: [item('Page two', 50, 700)] },
    ]);
    expect(blocks.map((block) => block.kind)).toEqual([
      'paragraph',
      'pageBreak',
      'paragraph',
    ]);
  });

  it('still separates pages when a page has no text at all', () => {
    const blocks = pagesToBlocks([
      { items: [item('Only page with text', 50, 700)] },
      { items: [] },
    ]);
    expect(blocks.map((block) => block.kind)).toEqual([
      'paragraph',
      'pageBreak',
    ]);
  });

  it('counts only visible characters, so a scan reads as empty', () => {
    expect(
      countCharacters([{ items: [] }, { items: [item('   ', 0, 0)] }]),
    ).toBe(0);
    expect(countCharacters([{ items: [item('abc', 0, 0)] }])).toBe(3);
  });

  it('marks a bold font run as bold', () => {
    const blocks = pagesToBlocks([
      { items: [item('Important', 50, 700, { bold: true })] },
    ]);
    const first = blocks[0]!;
    if (first.kind !== 'paragraph') throw new Error('expected paragraph');
    expect(first.runs[0]!.bold).toBe(true);
  });
});
