import { describe, expect, it } from 'vitest';
import {
  exportRegisterCsv,
  filterItemsInBox,
  parseTitleBlockText,
  type TitleBlockBoundingBox,
} from './drawing-register';
import type { PdfPageGeometry } from './pdf-geometry';

describe('PDF Drawing Register Engine', () => {
  it('parses typical architectural title block lines accurately', () => {
    const lines = [
      'PROJECT: METRO STATION EXTENSION',
      'TITLE: GROUND FLOOR HVAC LAYOUT',
      'DWG NO: A-102.1',
      'REV: 03',
      'DATE: 2026-09-23',
      'DRAWN BY: M. PATEL',
    ];

    const parsed = parseTitleBlockText(lines);
    expect(parsed.drawingNumber).toBe('A-102.1');
    expect(parsed.title).toBe('GROUND FLOOR HVAC LAYOUT');
    expect(parsed.revision).toBe('03');
    expect(parsed.date).toBe('2026-09-23');
    expect(parsed.author).toBe('M. PATEL');
  });

  it('filters items correctly within bounding box', () => {
    const page: PdfPageGeometry = {
      viewBox: [0, 0, 1000, 1000],
      rotate: 0,
      segments: [],
      items: [
        {
          text: 'Header Top Left',
          x: 50,
          y: 950,
          width: 100,
          fontSize: 12,
          bold: false,
        },
        { text: 'A-101', x: 800, y: 100, width: 50, fontSize: 16, bold: true },
        { text: 'REV 01', x: 800, y: 50, width: 50, fontSize: 10, bold: false },
      ],
    };

    const box: TitleBlockBoundingBox = {
      xMinRatio: 0.7,
      yMinRatio: 0.0,
      xMaxRatio: 1.0,
      yMaxRatio: 0.2,
    };

    const items = filterItemsInBox(page, box);
    expect(items).toContain('A-101');
    expect(items).toContain('REV 01');
    expect(items).not.toContain('Header Top Left');
  });

  it('generates well-formatted CSV register', () => {
    const result = {
      entries: [
        {
          pageNumber: 1,
          drawingNumber: 'A-101',
          title: 'Floor Plan',
          revision: '01',
          date: '2026-09-23',
          author: 'Engineer A',
          rawText: '',
          isScanned: false,
        },
      ],
      totalPages: 1,
      scannedPagesCount: 0,
      boundingBox: { xMinRatio: 0, yMinRatio: 0, xMaxRatio: 1, yMaxRatio: 1 },
    };

    const csv = exportRegisterCsv(result);
    expect(csv).toContain(
      'Sheet #,Drawing Number,Title,Revision,Date,Drawn By',
    );
    expect(csv).toContain(
      '1,"A-101","Floor Plan","01","2026-09-23","Engineer A"',
    );
  });
});
