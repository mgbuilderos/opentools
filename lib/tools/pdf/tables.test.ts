import { describe, expect, it } from 'vitest';
import type { PdfPageText, PdfTextItem } from './pdf-text';
import {
  detectColumns,
  extractTableFromPdfPages,
  findHeaderLine,
  groupPageIntoSegments,
  looksLikeNumeric,
} from './tables';

describe('lib/tools/pdf/tables', () => {
  it('identifies numeric and amount tokens accurately', () => {
    expect(looksLikeNumeric('123.45')).toBe(true);
    expect(looksLikeNumeric('1,234.56')).toBe(true);
    expect(looksLikeNumeric('(1,234.56)')).toBe(true);
    expect(looksLikeNumeric('1,234.56-')).toBe(true);
    expect(looksLikeNumeric('$1,234.56')).toBe(true);
    expect(looksLikeNumeric('€1.234,56')).toBe(true);
    expect(looksLikeNumeric('₹1,23,456.78')).toBe(true);
    expect(looksLikeNumeric('500.00 CR')).toBe(true);
    expect(looksLikeNumeric('120.00 DR')).toBe(true);

    expect(looksLikeNumeric('Jan 15, 2026')).toBe(false);
    expect(looksLikeNumeric('COFFEE SHOP PURCHASE')).toBe(false);
    expect(looksLikeNumeric('')).toBe(false);
    expect(looksLikeNumeric('---')).toBe(false);
  });

  it('groups items into lines and merges adjacent words into segments', () => {
    const items: PdfTextItem[] = [
      { text: 'Date', x: 40, y: 700, width: 30, fontSize: 10, bold: true },
      {
        text: 'Description',
        x: 120,
        y: 700,
        width: 60,
        fontSize: 10,
        bold: true,
      },
      { text: 'Amount', x: 300, y: 700, width: 45, fontSize: 10, bold: true },
      { text: 'Balance', x: 400, y: 700, width: 45, fontSize: 10, bold: true },

      // Row 1: Description words split across items
      {
        text: '2026-01-15',
        x: 40,
        y: 680,
        width: 55,
        fontSize: 10,
        bold: false,
      },
      { text: 'COFFEE', x: 120, y: 680, width: 45, fontSize: 10, bold: false },
      { text: 'ROASTER', x: 170, y: 680, width: 50, fontSize: 10, bold: false },
      { text: 'MAIN', x: 225, y: 680, width: 30, fontSize: 10, bold: false },
      { text: '-4.50', x: 310, y: 680, width: 35, fontSize: 10, bold: false },
      {
        text: '1,495.50',
        x: 400,
        y: 680,
        width: 45,
        fontSize: 10,
        bold: false,
      },
    ];

    const lines = groupPageIntoSegments(items);
    expect(lines).toHaveLength(2);

    // Line 0: Header
    expect(lines[0]!.segments).toHaveLength(4);
    expect(lines[0]!.segments.map((s) => s.text)).toEqual([
      'Date',
      'Description',
      'Amount',
      'Balance',
    ]);

    // Line 1: Words in description merged
    expect(lines[1]!.segments).toHaveLength(4);
    expect(lines[1]!.segments[0]!.text).toBe('2026-01-15');
    expect(lines[1]!.segments[1]!.text).toBe('COFFEE ROASTER MAIN');
    expect(lines[1]!.segments[2]!.text).toBe('-4.50');
    expect(lines[1]!.segments[3]!.text).toBe('1,495.50');
  });

  it('detects header line and assigns roles', () => {
    const items: PdfTextItem[] = [
      {
        text: 'ACME BANK STATEMENT',
        x: 200,
        y: 780,
        width: 150,
        fontSize: 14,
        bold: true,
      },
      {
        text: 'Account: 12345678',
        x: 40,
        y: 750,
        width: 100,
        fontSize: 10,
        bold: false,
      },
      // Header line
      { text: 'Date', x: 40, y: 710, width: 30, fontSize: 10, bold: true },
      {
        text: 'Particulars',
        x: 120,
        y: 710,
        width: 60,
        fontSize: 10,
        bold: true,
      },
      {
        text: 'Withdrawals',
        x: 280,
        y: 710,
        width: 60,
        fontSize: 10,
        bold: true,
      },
      { text: 'Deposits', x: 370, y: 710, width: 50, fontSize: 10, bold: true },
      { text: 'Balance', x: 450, y: 710, width: 45, fontSize: 10, bold: true },
    ];

    const lines = groupPageIntoSegments(items);
    const header = findHeaderLine(lines);
    expect(header).not.toBeNull();
    expect(header?.line.segments.map((s) => s.text)).toEqual([
      'Date',
      'Particulars',
      'Withdrawals',
      'Deposits',
      'Balance',
    ]);

    const cols = detectColumns(lines, header?.line ?? null);
    expect(cols).toHaveLength(5);
    expect(cols[0]!.detectedRole).toBe('date');
    expect(cols[1]!.detectedRole).toBe('description');
    expect(cols[2]!.detectedRole).toBe('debit');
    expect(cols[2]!.alignment).toBe('right');
    expect(cols[3]!.detectedRole).toBe('credit');
    expect(cols[3]!.alignment).toBe('right');
    expect(cols[4]!.detectedRole).toBe('balance');
    expect(cols[4]!.alignment).toBe('right');
  });

  it('merges multi-line descriptions into the parent transaction row', () => {
    const page: PdfPageText = {
      items: [
        // Header
        { text: 'Date', x: 50, y: 700, width: 30, fontSize: 10, bold: true },
        {
          text: 'Description',
          x: 150,
          y: 700,
          width: 70,
          fontSize: 10,
          bold: true,
        },
        { text: 'Amount', x: 350, y: 700, width: 40, fontSize: 10, bold: true },
        {
          text: 'Balance',
          x: 450,
          y: 700,
          width: 40,
          fontSize: 10,
          bold: true,
        },

        // Row 1: Line 1
        {
          text: '01/05/2026',
          x: 50,
          y: 670,
          width: 55,
          fontSize: 10,
          bold: false,
        },
        {
          text: 'WIRE TRANSFER INVOICE #8921',
          x: 150,
          y: 670,
          width: 140,
          fontSize: 10,
          bold: false,
        },
        {
          text: '2,500.00',
          x: 350,
          y: 670,
          width: 45,
          fontSize: 10,
          bold: false,
        },
        {
          text: '5,000.00',
          x: 450,
          y: 670,
          width: 45,
          fontSize: 10,
          bold: false,
        },

        // Row 1: Line 2 (Continuation - no date, no amount)
        {
          text: 'CLIENT ACME CORP SAN FRANCISCO',
          x: 150,
          y: 658,
          width: 150,
          fontSize: 9,
          bold: false,
        },

        // Row 1: Line 3 (Continuation - ref note)
        {
          text: 'REF: 9948201',
          x: 150,
          y: 646,
          width: 60,
          fontSize: 9,
          bold: false,
        },

        // Row 2: Standard single-line transaction
        {
          text: '02/05/2026',
          x: 50,
          y: 620,
          width: 55,
          fontSize: 10,
          bold: false,
        },
        {
          text: 'MONTHLY SOFTWARE SUBSCRIPTION',
          x: 150,
          y: 620,
          width: 150,
          fontSize: 10,
          bold: false,
        },
        {
          text: '-49.00',
          x: 350,
          y: 620,
          width: 35,
          fontSize: 10,
          bold: false,
        },
        {
          text: '4,951.00',
          x: 450,
          y: 620,
          width: 45,
          fontSize: 10,
          bold: false,
        },
      ],
    };

    const result = extractTableFromPdfPages([page]);
    expect(result.rows).toHaveLength(2);

    // First row should have merged all 3 lines
    const row1 = result.rows[0]!;
    expect(row1.cells[0]).toBe('01/05/2026');
    expect(row1.cells[1]).toBe(
      'WIRE TRANSFER INVOICE #8921 CLIENT ACME CORP SAN FRANCISCO REF: 9948201',
    );
    expect(row1.cells[2]).toBe('2,500.00');
    expect(row1.cells[3]).toBe('5,000.00');
    expect(row1.rawLines).toBe(3);

    // Second row
    const row2 = result.rows[1]!;
    expect(row2.cells[0]).toBe('02/05/2026');
    expect(row2.cells[1]).toBe('MONTHLY SOFTWARE SUBSCRIPTION');
    expect(row2.cells[2]).toBe('-49.00');
    expect(row2.cells[3]).toBe('4,951.00');
    expect(row2.rawLines).toBe(1);
  });

  it('joins multi-page statements and ignores repeated headers and footers', () => {
    const page1: PdfPageText = {
      items: [
        { text: 'Date', x: 50, y: 700, width: 30, fontSize: 10, bold: true },
        {
          text: 'Description',
          x: 150,
          y: 700,
          width: 60,
          fontSize: 10,
          bold: true,
        },
        { text: 'Amount', x: 350, y: 700, width: 40, fontSize: 10, bold: true },

        {
          text: '01/02/2026',
          x: 50,
          y: 670,
          width: 50,
          fontSize: 10,
          bold: false,
        },
        {
          text: 'SALARY DEPOSIT',
          x: 150,
          y: 670,
          width: 90,
          fontSize: 10,
          bold: false,
        },
        {
          text: '4,000.00',
          x: 350,
          y: 670,
          width: 45,
          fontSize: 10,
          bold: false,
        },

        // Page 1 footer
        {
          text: 'Page 1 of 2',
          x: 250,
          y: 50,
          width: 60,
          fontSize: 9,
          bold: false,
        },
        {
          text: 'Continued on next page...',
          x: 230,
          y: 35,
          width: 100,
          fontSize: 9,
          bold: false,
        },
      ],
    };

    const page2: PdfPageText = {
      items: [
        // Repeated header on page 2
        { text: 'Date', x: 50, y: 700, width: 30, fontSize: 10, bold: true },
        {
          text: 'Description',
          x: 150,
          y: 700,
          width: 60,
          fontSize: 10,
          bold: true,
        },
        { text: 'Amount', x: 350, y: 700, width: 40, fontSize: 10, bold: true },

        // Page 2 data row
        {
          text: '03/02/2026',
          x: 50,
          y: 670,
          width: 50,
          fontSize: 10,
          bold: false,
        },
        {
          text: 'GROCERY STORE',
          x: 150,
          y: 670,
          width: 80,
          fontSize: 10,
          bold: false,
        },
        {
          text: '-85.20',
          x: 350,
          y: 670,
          width: 35,
          fontSize: 10,
          bold: false,
        },

        // Page 2 footer
        {
          text: 'Page 2 of 2',
          x: 250,
          y: 50,
          width: 60,
          fontSize: 9,
          bold: false,
        },
      ],
    };

    const result = extractTableFromPdfPages([page1, page2]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]!.cells[0]).toBe('01/02/2026');
    expect(result.rows[0]!.pageNumber).toBe(1);
    expect(result.rows[1]!.cells[0]).toBe('03/02/2026');
    expect(result.rows[1]!.pageNumber).toBe(2);
  });

  it('refuses scanned/image-only PDFs with 0 characters by name', () => {
    const emptyPage: PdfPageText = { items: [] };
    const result = extractTableFromPdfPages([emptyPage]);

    expect(result.rows).toHaveLength(0);
    expect(result.refusalReason).toBeDefined();
    expect(result.refusalReason).toContain('no readable text layer');
    expect(result.refusalReason).toContain('scanned document');
    expect(result.refusalReason).toContain('CSV/OFX/QIF');
  });

  describe('column boundaries set by hand on the page view', () => {
    function page(): PdfPageText {
      const item = (
        text: string,
        x: number,
        y: number,
        width: number,
      ): PdfTextItem => ({ text, x, y, width, fontSize: 9, bold: false });
      return {
        items: [
          item('Date', 40, 200, 20),
          item('Description', 110, 200, 50),
          item('Amount', 300, 200, 30),
          item('01/04/2026', 40, 180, 45),
          item('RENT PAYMENT', 110, 180, 60),
          item('1,100.00', 300, 180, 35),
          item('02/04/2026', 40, 160, 45),
          item('CARD PURCHASE', 110, 160, 65),
          item('82.15', 320, 160, 25),
        ],
      };
    }

    it('uses the boundaries it is given instead of inferring its own', () => {
      const table = extractTableFromPdfPages([page()], {
        columnEdges: [35, 105, 295, 400],
      });
      expect(table.columns).toHaveLength(3);
      expect(table.columns.map((column) => column.left)).toEqual([
        35, 105, 295,
      ]);
      expect(table.headers).toEqual(['Date', 'Description', 'Amount']);
      expect(table.rows[0]!.cells).toEqual([
        '01/04/2026',
        'RENT PAYMENT',
        '1,100.00',
      ]);
    });

    it('merges two columns when the user removes the divider between them', () => {
      // The same page with the Date/Description divider taken out.
      const table = extractTableFromPdfPages([page()], {
        columnEdges: [35, 295, 400],
      });
      expect(table.columns).toHaveLength(2);
      expect(table.rows[0]!.cells[0]).toBe('01/04/2026 RENT PAYMENT');
      expect(table.rows[0]!.cells[1]).toBe('1,100.00');
    });

    it('reads a column of figures as right-aligned', () => {
      const table = extractTableFromPdfPages([page()], {
        columnEdges: [35, 105, 295, 400],
      });
      expect(table.columns[2]!.alignment).toBe('right');
      expect(table.columns[1]!.alignment).toBe('left');
    });

    it('falls back to inferring them when given too few to be a table', () => {
      const withEdges = extractTableFromPdfPages([page()], {
        columnEdges: [35],
      });
      const withNone = extractTableFromPdfPages([page()]);
      expect(withEdges.columns.length).toBe(withNone.columns.length);
    });
  });
});
