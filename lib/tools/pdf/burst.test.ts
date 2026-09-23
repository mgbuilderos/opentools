import { describe, expect, it } from 'vitest';
import { formatBurstFilename, isPageBlank } from './burst';

describe('PDF Burst by Rule Engine', () => {
  it('formats filename with tokens correctly', () => {
    const formatted = formatBurstFilename('Invoice_{match}_{page}.pdf', {
      match: 'INV-9923',
      index: 1,
      page: 4,
    });
    expect(formatted).toBe('Invoice_INV-9923_4.pdf');
  });

  it('detects blank pages reliably', () => {
    expect(isPageBlank({ items: [] })).toBe(true);
    expect(
      isPageBlank({
        items: [
          { text: '   ', x: 0, y: 0, width: 0, fontSize: 12, bold: false },
        ],
      }),
    ).toBe(true);
    expect(
      isPageBlank({
        items: [
          {
            text: 'Invoice #101',
            x: 0,
            y: 0,
            width: 50,
            fontSize: 12,
            bold: false,
          },
        ],
      }),
    ).toBe(false);
  });
});
