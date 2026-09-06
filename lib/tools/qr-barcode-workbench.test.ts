import { describe, expect, it } from 'vitest';

import {
  buildQrPayload,
  gs1CheckDigit,
  QR_BARCODE_OPERATIONS,
  runQrBarcodeOperation,
} from './qr-barcode-workbench';

const onePixelPng =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

function defaults(operationId: string) {
  const operation = QR_BARCODE_OPERATIONS.find(
    (item) => item.id === operationId,
  );
  if (!operation) throw new Error(`Missing operation: ${operationId}`);
  const values = Object.fromEntries(
    operation.fields.map((field) => [field.id, field.defaultValue]),
  );
  if (operationId === 'qr-code-logo-embedder') values.logo = onePixelPng;
  return values;
}

describe('QR and barcode workbench', () => {
  it('ships 24 unique executable SVG operations', async () => {
    expect(QR_BARCODE_OPERATIONS).toHaveLength(24);
    expect(
      new Set(QR_BARCODE_OPERATIONS.map((operation) => operation.id)).size,
    ).toBe(24);

    for (const operation of QR_BARCODE_OPERATIONS) {
      const result = await runQrBarcodeOperation(
        operation.id,
        defaults(operation.id),
      );
      expect(result).toMatch(/^<svg/u);
      expect(result).toContain('</svg>');
      expect(operation.notice.length).toBeGreaterThan(40);
    }
  });

  it('builds destination-specific payloads without a redirect service', () => {
    expect(
      buildQrPayload('wi-fi-qr-code', {
        ssid: 'Guest;Floor 1',
        password: 'p:ass',
        security: 'WPA',
        hidden: 'false',
      }),
    ).toBe('WIFI:T:WPA;S:Guest\\;Floor 1;P:p\\:ass;H:false;;');
    expect(
      buildQrPayload('email-qr-code', {
        email: 'hello@example.com',
        subject: 'Hello world',
        body: 'Thanks',
      }),
    ).toBe('mailto:hello@example.com?subject=Hello+world&body=Thanks');
    expect(
      buildQrPayload('location-qr-code', {
        latitude: '19.076',
        longitude: '72.8777',
        label: 'Mumbai',
      }),
    ).toBe('geo:19.076,72.8777?q=19.076,72.8777(Mumbai)');
    expect(
      buildQrPayload('upi-qr-code', {
        payee: 'sample@bank',
        name: 'Sample Payee',
        amount: '125.5',
        note: 'Invoice 5',
      }),
    ).toBe(
      'upi://pay?pa=sample%40bank&pn=Sample+Payee&cu=INR&am=125.50&tn=Invoice+5',
    );
  });

  it('rejects unsafe or malformed destination values', () => {
    expect(() =>
      buildQrPayload('url-qr-code', { url: 'javascript:alert(1)' }),
    ).toThrow(/Only HTTP and HTTPS/u);
    expect(() =>
      buildQrPayload('url-qr-code', { url: 'https://user:secret@example.com' }),
    ).toThrow(/embedded usernames or passwords/u);
    expect(() =>
      buildQrPayload('calendar-event-qr-code', {
        title: 'Bad event',
        start: '20260910T100000Z',
        end: '20260910T090000Z',
        location: '',
      }),
    ).toThrow(/end must be after/u);
  });

  it('creates valid GS1 check digits from published examples', () => {
    expect(gs1CheckDigit('400638133393')).toBe('1');
    expect(gs1CheckDigit('7351353')).toBe('7');
    expect(gs1CheckDigit('03600029145')).toBe('2');
  });

  it('draws checked EAN, UPC-A, ITF-14, and Code 39 SVGs', async () => {
    await expect(
      runQrBarcodeOperation('ean-13-generator', { value: '400638133393' }),
    ).resolves.toContain('4006381333931');
    await expect(
      runQrBarcodeOperation('ean-8-generator', { value: '7351353' }),
    ).resolves.toContain('73513537');
    await expect(
      runQrBarcodeOperation('upc-a-generator', { value: '03600029145' }),
    ).resolves.toContain('0036000291452');
    await expect(
      runQrBarcodeOperation('itf-14-generator', { value: '1001234567890' }),
    ).resolves.toMatch(/<rect/u);
    await expect(
      runQrBarcodeOperation('code-39-generator', { value: 'tools-123' }),
    ).resolves.toContain('TOOLS-123');
  });

  it('fails closed for wrong check digits and unsupported Code 39 text', async () => {
    await expect(
      runQrBarcodeOperation('ean-13-generator', { value: '4006381333932' }),
    ).rejects.toThrow(/check digit does not match/u);
    await expect(
      runQrBarcodeOperation('code-39-generator', { value: 'emoji🙂' }),
    ).rejects.toThrow(/Code 39 accepts/u);
  });

  it('embeds a local raster logo and creates bounded sheets', async () => {
    const logo = await runQrBarcodeOperation('qr-code-logo-embedder', {
      payload: 'Logo test',
      logo: onePixelPng,
      size: '360',
    });
    expect(logo).toContain('<image href="data:image/png;base64,');

    await expect(
      runQrBarcodeOperation('qr-code-batch-generator', {
        items: Array.from({ length: 13 }, (_, index) => `Item ${index}`).join(
          '\n',
        ),
        error: 'M',
      }),
    ).rejects.toThrow(/at most 12/u);
  });
});
