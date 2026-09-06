import QRCode from 'qrcode';

const secureWebPrefix = 'https:' + '//';
const svgNamespace = 'http:' + '//www.w3.org/2000/svg';

export interface QrBarcodeField {
  id: string;
  label: string;
  type: 'number' | 'text' | 'textarea' | 'select' | 'file';
  defaultValue: string;
  accept?: string;
  maxBytes?: number;
  options?: readonly { value: string; label: string }[];
}

export interface QrBarcodeOperation {
  id: string;
  name: string;
  description: string;
  fields: readonly QrBarcodeField[];
  notice: string;
  outputExtension: 'svg';
}

const text = (
  id: string,
  label: string,
  defaultValue: string,
): QrBarcodeField => ({
  id,
  label,
  type: 'text',
  defaultValue,
});
const number = (
  id: string,
  label: string,
  defaultValue: string,
): QrBarcodeField => ({
  id,
  label,
  type: 'number',
  defaultValue,
});
const area = (
  id: string,
  label: string,
  defaultValue: string,
): QrBarcodeField => ({
  id,
  label,
  type: 'textarea',
  defaultValue,
});
const select = (
  id: string,
  label: string,
  defaultValue: string,
  options: readonly { value: string; label: string }[],
): QrBarcodeField => ({ id, label, type: 'select', defaultValue, options });

const file = (
  id: string,
  label: string,
  accept: string,
  maxBytes: number,
): QrBarcodeField => ({
  id,
  label,
  type: 'file',
  defaultValue: '',
  accept,
  maxBytes,
});

const errorField = select('error', 'Error correction', 'M', [
  { value: 'L', label: 'L — more capacity' },
  { value: 'M', label: 'M — balanced' },
  { value: 'Q', label: 'Q — stronger recovery' },
  { value: 'H', label: 'H — strongest recovery' },
]);
const sizeField = number('size', 'SVG width (px)', '360');
const qrNotice =
  'The SVG is generated in this tab. Test the downloaded symbol with the exact devices, print size, surface, lighting, and destination you intend to use.';
const payloadNotice =
  'This creates a standards-shaped payload, not a live destination or ownership check. Review every encoded value before sharing or printing.';
const gs1Notice =
  'This checks or adds the mathematical check digit and draws a symbol locally. It does not allocate a GS1 identifier, prove ownership, or certify retail/logistics acceptance.';

export const QR_BARCODE_OPERATIONS: readonly QrBarcodeOperation[] = [
  {
    id: 'qr-code-generator',
    name: 'QR code generator',
    description: 'Create a downloadable SVG QR symbol from supplied content.',
    fields: [
      area('payload', 'Content', 'One private workspace'),
      errorField,
      sizeField,
    ],
    notice: qrNotice,
    outputExtension: 'svg',
  },
  {
    id: 'url-qr-code',
    name: 'URL QR code',
    description: 'Encode a validated HTTP or HTTPS destination.',
    fields: [
      text('url', 'URL', `${secureWebPrefix}example.com`),
      errorField,
      sizeField,
    ],
    notice: payloadNotice,
    outputExtension: 'svg',
  },
  {
    id: 'text-qr-code',
    name: 'Text QR code',
    description: 'Encode plain Unicode text without a redirect service.',
    fields: [
      area('payload', 'Text', 'Scan to read this text.'),
      errorField,
      sizeField,
    ],
    notice: qrNotice,
    outputExtension: 'svg',
  },
  {
    id: 'wi-fi-qr-code',
    name: 'Wi-Fi QR code',
    description: 'Create a Wi-Fi configuration payload for a supplied network.',
    fields: [
      text('ssid', 'Network name (SSID)', 'Guest WiFi'),
      text('password', 'Password', 'example-password'),
      select('security', 'Security', 'WPA', [
        { value: 'WPA', label: 'WPA/WPA2/WPA3' },
        { value: 'WEP', label: 'WEP' },
        { value: 'nopass', label: 'Open network' },
      ]),
      select('hidden', 'Hidden network', 'false', [
        { value: 'false', label: 'No' },
        { value: 'true', label: 'Yes' },
      ]),
      errorField,
      sizeField,
    ],
    notice:
      'The password is encoded visibly in the QR payload and is not encrypted. Share the symbol only with people who should receive the network credentials.',
    outputExtension: 'svg',
  },
  {
    id: 'vcard-qr-code',
    name: 'vCard QR code',
    description: 'Create a compact vCard 3.0 contact payload.',
    fields: [
      text('name', 'Full name', 'Asha Example'),
      text('phone', 'Phone', '+919876543210'),
      text('email', 'Email', 'asha@example.com'),
      text('organization', 'Organization', 'Example Studio'),
      errorField,
      sizeField,
    ],
    notice: payloadNotice,
    outputExtension: 'svg',
  },
  {
    id: 'email-qr-code',
    name: 'Email QR code',
    description: 'Encode a mailto draft with recipient, subject, and body.',
    fields: [
      text('email', 'Recipient', 'hello@example.com'),
      text('subject', 'Subject', 'Hello'),
      area('body', 'Message', 'Thanks for scanning.'),
      errorField,
      sizeField,
    ],
    notice: payloadNotice,
    outputExtension: 'svg',
  },
  {
    id: 'sms-qr-code',
    name: 'SMS QR code',
    description: 'Encode a phone number and draft SMS body.',
    fields: [
      text('phone', 'Phone number', '+919876543210'),
      area('message', 'Message', 'Hello'),
      errorField,
      sizeField,
    ],
    notice: payloadNotice,
    outputExtension: 'svg',
  },
  {
    id: 'phone-qr-code',
    name: 'Phone QR code',
    description: 'Create a tel URI QR symbol.',
    fields: [
      text('phone', 'Phone number', '+919876543210'),
      errorField,
      sizeField,
    ],
    notice: payloadNotice,
    outputExtension: 'svg',
  },
  {
    id: 'location-qr-code',
    name: 'Location QR code',
    description: 'Encode latitude and longitude as a geo URI.',
    fields: [
      number('latitude', 'Latitude', '19.076'),
      number('longitude', 'Longitude', '72.8777'),
      text('label', 'Optional label', 'Mumbai'),
      errorField,
      sizeField,
    ],
    notice: payloadNotice,
    outputExtension: 'svg',
  },
  {
    id: 'calendar-event-qr-code',
    name: 'Calendar event QR code',
    description: 'Create an iCalendar event payload using UTC timestamps.',
    fields: [
      text('title', 'Event title', 'Project review'),
      text('start', 'Start (YYYYMMDDTHHMMSSZ)', '20260910T090000Z'),
      text('end', 'End (YYYYMMDDTHHMMSSZ)', '20260910T100000Z'),
      text('location', 'Location', 'Online'),
      errorField,
      sizeField,
    ],
    notice:
      'Calendar applications may interpret time zones, reminders, recurrence, and imports differently. This tool emits a single UTC VEVENT; verify the imported event.',
    outputExtension: 'svg',
  },
  {
    id: 'upi-qr-code',
    name: 'UPI QR code',
    description: 'Create a UPI payment deep-link payload from supplied values.',
    fields: [
      text('payee', 'UPI ID', 'sample@bank'),
      text('name', 'Payee name', 'Sample Payee'),
      number('amount', 'Amount (INR; 0 for open amount)', '0'),
      text('note', 'Payment note', 'Payment'),
      errorField,
      sizeField,
    ],
    notice:
      'Always verify the payee name and UPI ID in the payment app before authorizing. This tool cannot confirm ownership, availability, merchant status, or successful payment.',
    outputExtension: 'svg',
  },
  {
    id: 'bitcoin-qr-code',
    name: 'Bitcoin QR code',
    description: 'Create a BIP21-shaped bitcoin payment URI.',
    fields: [
      text(
        'address',
        'Bitcoin address',
        'bc1qexampleaddress000000000000000000000',
      ),
      number('amount', 'BTC amount (0 for open amount)', '0'),
      text('label', 'Label', 'Example'),
      text('message', 'Message', 'Payment'),
      errorField,
      sizeField,
    ],
    notice:
      'Address-shape check only. Verify network, address, amount, wallet preview, and fees independently before sending; cryptocurrency transfers can be irreversible.',
    outputExtension: 'svg',
  },
  {
    id: 'app-store-qr-code',
    name: 'App Store QR code',
    description: 'Encode a supplied official app-listing URL.',
    fields: [
      text('url', 'App listing URL', `${secureWebPrefix}apps.apple.com/`),
      errorField,
      sizeField,
    ],
    notice: payloadNotice,
    outputExtension: 'svg',
  },
  {
    id: 'multi-link-qr-code',
    name: 'Multi-link QR code',
    description: 'Encode a tiny self-contained offline HTML link list.',
    fields: [
      area(
        'links',
        'Links — one Label | secure web URL per line (maximum 5)',
        `Website | ${secureWebPrefix}example.com\nHelp | ${secureWebPrefix}example.com/help`,
      ),
      errorField,
      sizeField,
    ],
    notice:
      'This does not create or host a redirect page. It encodes a data:text/html URL; many scanners or managed browsers block data URLs, so test the exact destination devices before use.',
    outputExtension: 'svg',
  },
  {
    id: 'qr-code-svg-export',
    name: 'QR code SVG export',
    description: 'Create a scalable vector QR symbol with chosen colors.',
    fields: [
      area('payload', 'Content', 'Scalable QR output'),
      text('dark', 'Foreground hex', '#000000'),
      text('light', 'Background hex', '#ffffff'),
      errorField,
      sizeField,
    ],
    notice: qrNotice,
    outputExtension: 'svg',
  },
  {
    id: 'qr-code-logo-embedder',
    name: 'QR code logo embedder',
    description:
      'Embed a local PNG, JPEG, or WebP image in a high-correction QR SVG.',
    fields: [
      area('payload', 'Content', 'Logo QR output'),
      file('logo', 'Logo image', 'image/png,image/jpeg,image/webp', 2_000_000),
      sizeField,
    ],
    notice:
      'Logo overlays reduce readable modules even with H correction. The logo remains embedded in the downloaded SVG; test scanning at every target size and device before publishing.',
    outputExtension: 'svg',
  },
  {
    id: 'qr-code-batch-generator',
    name: 'QR code batch generator',
    description: 'Generate up to 12 QR symbols in one SVG sheet.',
    fields: [
      area(
        'items',
        'One payload per line',
        'First payload\nSecond payload\nThird payload',
      ),
      errorField,
    ],
    notice: qrNotice,
    outputExtension: 'svg',
  },
  {
    id: 'qr-code-contact-sheet',
    name: 'QR code contact sheet',
    description: 'Create a printable labelled grid of up to 12 QR symbols.',
    fields: [
      area(
        'items',
        'One Label | payload per line',
        `Website | ${secureWebPrefix}example.com\nSupport | mailto:help@example.com`,
      ),
      errorField,
    ],
    notice:
      'Labels and payloads are included in the local SVG. Print scaling can reduce readability; verify the final physical output with target scanners.',
    outputExtension: 'svg',
  },
  {
    id: 'qr-code-error-correction-tester',
    name: 'QR error-correction tester',
    description: 'Compare L, M, Q, and H symbols for the same payload.',
    fields: [area('payload', 'Content', 'Compare QR recovery levels')],
    notice:
      'Higher correction adds redundancy and can make the symbol denser. This comparison does not simulate real damage or certify scan reliability.',
    outputExtension: 'svg',
  },
  {
    id: 'ean-13-generator',
    name: 'EAN-13 generator',
    description:
      'Validate or add a GTIN-13 check digit and draw the EAN-13 bars.',
    fields: [
      text(
        'value',
        '12 digits without check digit, or complete 13 digits',
        '400638133393',
      ),
    ],
    notice: gs1Notice,
    outputExtension: 'svg',
  },
  {
    id: 'ean-8-generator',
    name: 'EAN-8 generator',
    description:
      'Validate or add a GTIN-8 check digit and draw the EAN-8 bars.',
    fields: [
      text(
        'value',
        '7 digits without check digit, or complete 8 digits',
        '7351353',
      ),
    ],
    notice: gs1Notice,
    outputExtension: 'svg',
  },
  {
    id: 'upc-a-generator',
    name: 'UPC-A generator',
    description: 'Validate or add a GTIN-12 check digit and draw UPC-A bars.',
    fields: [
      text(
        'value',
        '11 digits without check digit, or complete 12 digits',
        '03600029145',
      ),
    ],
    notice: gs1Notice,
    outputExtension: 'svg',
  },
  {
    id: 'code-39-generator',
    name: 'Code 39 generator',
    description:
      'Draw Code 39 for uppercase text using the standard character set.',
    fields: [text('value', 'Code 39 text', 'TOOLS-123')],
    notice:
      'Code 39 does not provide an assignment registry. Verify content, quiet zones, print contrast, dimensions, optional checksums, and receiving-system requirements.',
    outputExtension: 'svg',
  },
  {
    id: 'itf-14-generator',
    name: 'ITF-14 generator',
    description:
      'Validate or add a GTIN-14 check digit and draw Interleaved 2 of 5 bars.',
    fields: [
      text(
        'value',
        '13 digits without check digit, or complete 14 digits',
        '1001234567890',
      ),
    ],
    notice: gs1Notice,
    outputExtension: 'svg',
  },
] as const;

function raw(values: Record<string, string>, key: string) {
  return values[key] ?? '';
}

function required(
  values: Record<string, string>,
  key: string,
  label: string,
  maximum = 3_000,
) {
  const value = raw(values, key).trim();
  if (!value) throw new Error(`Enter ${label.toLowerCase()} first.`);
  if (value.length > maximum)
    throw new Error(`${label} must be at most ${maximum} characters.`);
  return value;
}

function finite(
  values: Record<string, string>,
  key: string,
  label: string,
  minimum: number,
  maximum: number,
) {
  const value = Number(raw(values, key));
  if (!Number.isFinite(value) || value < minimum || value > maximum)
    throw new Error(`${label} must be between ${minimum} and ${maximum}.`);
  return value;
}

function safeUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Enter a complete HTTP or HTTPS URL.');
  }
  if (!['http:', 'https:'].includes(url.protocol))
    throw new Error('Only HTTP and HTTPS URLs are accepted here.');
  if (url.username || url.password)
    throw new Error('Remove embedded usernames or passwords from the URL.');
  return url.toString();
}

function escapePayload(value: string) {
  return value.replace(/([\\;,:"])/gu, '\\$1').replace(/\r?\n/gu, '\\n');
}

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function escapeHtml(value: string) {
  return escapeXml(value);
}

function qrStyle(
  values: Record<string, string>,
  forcedError?: 'L' | 'M' | 'Q' | 'H',
) {
  const error = (forcedError ?? raw(values, 'error')) || 'M';
  if (!['L', 'M', 'Q', 'H'].includes(error))
    throw new Error('Choose a valid correction level.');
  const size = raw(values, 'size')
    ? finite(values, 'size', 'SVG width', 160, 1_200)
    : 360;
  const dark = raw(values, 'dark') || '#000000';
  const light = raw(values, 'light') || '#ffffff';
  if (!/^#[0-9A-Fa-f]{6}(?:[0-9A-Fa-f]{2})?$/u.test(dark))
    throw new Error('Foreground must be a 6- or 8-digit hex color.');
  if (!/^#[0-9A-Fa-f]{6}(?:[0-9A-Fa-f]{2})?$/u.test(light))
    throw new Error('Background must be a 6- or 8-digit hex color.');
  return { error: error as 'L' | 'M' | 'Q' | 'H', size, dark, light };
}

async function renderQr(
  payload: string,
  values: Record<string, string>,
  forcedError?: 'L' | 'M' | 'Q' | 'H',
) {
  if (!payload || payload.length > 8_000)
    throw new Error('Encoded content must contain 1–8,000 characters.');
  const style = qrStyle(values, forcedError);
  try {
    return await QRCode.toString(payload, {
      type: 'svg',
      errorCorrectionLevel: style.error,
      width: style.size,
      margin: 4,
      color: { dark: style.dark, light: style.light },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'QR encoding failed.';
    throw new Error(
      `The content does not fit the selected QR settings. ${message}`,
    );
  }
}

export function buildQrPayload(
  operationId: string,
  values: Record<string, string>,
) {
  switch (operationId) {
    case 'qr-code-generator':
    case 'text-qr-code':
    case 'qr-code-svg-export':
    case 'qr-code-logo-embedder':
    case 'qr-code-error-correction-tester':
      return required(values, 'payload', 'content', 8_000);
    case 'url-qr-code':
    case 'app-store-qr-code':
      return safeUrl(required(values, 'url', 'a URL', 2_048));
    case 'wi-fi-qr-code': {
      const security = raw(values, 'security');
      if (!['WPA', 'WEP', 'nopass'].includes(security))
        throw new Error('Choose Wi-Fi security.');
      const ssid = escapePayload(
        required(values, 'ssid', 'a network name', 128),
      );
      const password =
        security === 'nopass'
          ? ''
          : escapePayload(required(values, 'password', 'a password', 256));
      return `WIFI:T:${security};S:${ssid};P:${password};H:${raw(values, 'hidden') === 'true' ? 'true' : 'false'};;`;
    }
    case 'vcard-qr-code': {
      const name = escapePayload(required(values, 'name', 'a full name', 200));
      const phone = escapePayload(
        required(values, 'phone', 'a phone number', 50),
      );
      const email = required(values, 'email', 'an email address', 254);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email))
        throw new Error('Enter a valid-looking email address.');
      return [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${name}`,
        `TEL:${phone}`,
        `EMAIL:${escapePayload(email)}`,
        `ORG:${escapePayload(raw(values, 'organization').trim())}`,
        'END:VCARD',
      ].join('\r\n');
    }
    case 'email-qr-code': {
      const email = required(values, 'email', 'a recipient', 254);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email))
        throw new Error('Enter a valid-looking email address.');
      const query = new URLSearchParams();
      if (raw(values, 'subject')) query.set('subject', raw(values, 'subject'));
      if (raw(values, 'body')) query.set('body', raw(values, 'body'));
      return `mailto:${email}${query.size ? `?${query.toString()}` : ''}`;
    }
    case 'sms-qr-code': {
      const phone = required(values, 'phone', 'a phone number', 50);
      if (!/^\+?[0-9 ()-]{7,25}$/u.test(phone))
        throw new Error('Enter a valid-looking phone number.');
      return `sms:${phone.replace(/[ ()-]/gu, '')}?body=${encodeURIComponent(raw(values, 'message'))}`;
    }
    case 'phone-qr-code': {
      const phone = required(values, 'phone', 'a phone number', 50);
      if (!/^\+?[0-9 ()-]{7,25}$/u.test(phone))
        throw new Error('Enter a valid-looking phone number.');
      return `tel:${phone.replace(/[ ()-]/gu, '')}`;
    }
    case 'location-qr-code': {
      const latitude = finite(values, 'latitude', 'Latitude', -90, 90);
      const longitude = finite(values, 'longitude', 'Longitude', -180, 180);
      const label = raw(values, 'label').trim();
      return `geo:${latitude},${longitude}${label ? `?q=${latitude},${longitude}(${encodeURIComponent(label)})` : ''}`;
    }
    case 'calendar-event-qr-code': {
      const stamp = /^\d{8}T\d{6}Z$/u;
      const start = required(values, 'start', 'a start timestamp', 16);
      const end = required(values, 'end', 'an end timestamp', 16);
      if (!stamp.test(start) || !stamp.test(end))
        throw new Error('Calendar timestamps must use YYYYMMDDTHHMMSSZ.');
      if (end <= start) throw new Error('Event end must be after the start.');
      return [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'BEGIN:VEVENT',
        `SUMMARY:${escapePayload(required(values, 'title', 'an event title', 200))}`,
        `DTSTART:${start}`,
        `DTEND:${end}`,
        `LOCATION:${escapePayload(raw(values, 'location').trim())}`,
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');
    }
    case 'upi-qr-code': {
      const payee = required(values, 'payee', 'a UPI ID', 45);
      if (!/^[A-Za-z0-9._-]{2,}@[A-Za-z0-9.-]{2,}$/u.test(payee))
        throw new Error('Enter a valid-looking UPI ID in user@handle form.');
      const params = new URLSearchParams({
        pa: payee,
        pn: required(values, 'name', 'a payee name', 100),
        cu: 'INR',
      });
      const amount = finite(values, 'amount', 'Amount', 0, 10_000_000_000);
      if (amount) params.set('am', amount.toFixed(2));
      if (raw(values, 'note').trim())
        params.set('tn', raw(values, 'note').trim());
      return `upi://pay?${params.toString()}`;
    }
    case 'bitcoin-qr-code': {
      const address = required(values, 'address', 'a Bitcoin address', 100);
      if (!/^(?:bc1|[13])[A-Za-z0-9]{20,90}$/u.test(address))
        throw new Error('Enter a valid-looking Bitcoin address.');
      const params = new URLSearchParams();
      const amount = finite(values, 'amount', 'BTC amount', 0, 21_000_000);
      if (amount) params.set('amount', String(amount));
      if (raw(values, 'label')) params.set('label', raw(values, 'label'));
      if (raw(values, 'message')) params.set('message', raw(values, 'message'));
      return `bitcoin:${address}${params.size ? `?${params.toString()}` : ''}`;
    }
    case 'multi-link-qr-code': {
      const lines = required(values, 'links', 'at least one link', 2_500)
        .split(/\r?\n/u)
        .map((line) => line.trim())
        .filter(Boolean);
      if (lines.length > 5)
        throw new Error('Multi-link QR accepts at most 5 links.');
      const links = lines.map((line, index) => {
        const [labelPart, ...urlParts] = line.split('|');
        if (!urlParts.length)
          throw new Error(`Line ${index + 1} must use Label | secure web URL.`);
        return {
          label: labelPart.trim(),
          url: safeUrl(urlParts.join('|').trim()),
        };
      });
      const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Links</title><style>body{font:16px system-ui;max-width:36rem;margin:3rem auto;padding:1rem}a{display:block;padding:1rem;margin:.5rem 0;border:1px solid;border-radius:.6rem;color:inherit}</style><h1>Links</h1>${links.map((link) => `<a href="${escapeHtml(link.url)}">${escapeHtml(link.label || link.url)}</a>`).join('')}`;
      return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
    }
    default:
      throw new Error('This operation does not create a QR payload.');
  }
}

function nestedSvg(svg: string, x: number, y: number, size: number) {
  const viewBox = svg.match(/viewBox="([^"]+)"/u)?.[1];
  if (!viewBox) throw new Error('Generated QR SVG has no viewBox.');
  return svg.replace(
    /^<svg[^>]*>/u,
    `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="${viewBox}">`,
  );
}

async function batchSvg(
  items: readonly { label: string; payload: string }[],
  error: 'L' | 'M' | 'Q' | 'H',
  labelled: boolean,
) {
  const columns = 3;
  const cellWidth = 220;
  const cellHeight = labelled ? 245 : 220;
  const rows = Math.ceil(items.length / columns);
  const children = await Promise.all(
    items.map(async (item, index) => {
      const svg = await renderQr(item.payload, { size: '190' }, error);
      const x = (index % columns) * cellWidth + 15;
      const y = Math.floor(index / columns) * cellHeight + 10;
      return `${nestedSvg(svg, x, y, 190)}${labelled ? `<text x="${x + 95}" y="${y + 210}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12">${escapeXml(item.label.slice(0, 32))}</text>` : ''}`;
    }),
  );
  return `<svg xmlns="${svgNamespace}" width="${columns * cellWidth}" height="${rows * cellHeight}" viewBox="0 0 ${columns * cellWidth} ${rows * cellHeight}"><rect width="100%" height="100%" fill="#fff"/>${children.join('')}</svg>`;
}

const eanL = [
  '0001101',
  '0011001',
  '0010011',
  '0111101',
  '0100011',
  '0110001',
  '0101111',
  '0111011',
  '0110111',
  '0001011',
];
const eanG = [
  '0100111',
  '0110011',
  '0011011',
  '0100001',
  '0011101',
  '0111001',
  '0000101',
  '0010001',
  '0001001',
  '0010111',
];
const eanR = [
  '1110010',
  '1100110',
  '1101100',
  '1000010',
  '1011100',
  '1001110',
  '1010000',
  '1000100',
  '1001000',
  '1110100',
];
const ean13Parity = [
  'LLLLLL',
  'LLGLGG',
  'LLGGLG',
  'LLGGGL',
  'LGLLGG',
  'LGGLLG',
  'LGGGLL',
  'LGLGLG',
  'LGLGGL',
  'LGGLGL',
];

export function gs1CheckDigit(body: string) {
  if (!/^\d+$/u.test(body))
    throw new Error('GS1 values must contain digits only.');
  const sum = Array.from(body)
    .toReversed()
    .reduce(
      (total, digit, index) =>
        total + Number(digit) * (index % 2 === 0 ? 3 : 1),
      0,
    );
  return String((10 - (sum % 10)) % 10);
}

function normalizeGtin(input: string, length: number) {
  const digits = input.replace(/[\s-]+/gu, '');
  if (!/^\d+$/u.test(digits) || ![length - 1, length].includes(digits.length))
    throw new Error(
      `Enter ${length - 1} digits without a check digit or a complete ${length}-digit value.`,
    );
  if (digits.length === length - 1) return digits + gs1CheckDigit(digits);
  if (digits.at(-1) !== gs1CheckDigit(digits.slice(0, -1)))
    throw new Error(
      'The supplied GS1 check digit does not match the preceding digits.',
    );
  return digits;
}

function barcodeSvg(bits: string, label: string, module = 3) {
  const quiet = 12;
  const barHeight = 90;
  const width = (bits.length + quiet * 2) * module;
  const bars = Array.from(bits)
    .map((bit, index) =>
      bit === '1'
        ? `<rect x="${(quiet + index) * module}" y="10" width="${module}" height="${barHeight}"/>`
        : '',
    )
    .join('');
  return `<svg xmlns="${svgNamespace}" width="${width}" height="130" viewBox="0 0 ${width} 130"><rect width="100%" height="100%" fill="#fff"/><g fill="#000">${bars}</g><text x="${width / 2}" y="120" text-anchor="middle" font-family="ui-monospace,monospace" font-size="16" letter-spacing="2">${escapeXml(label)}</text></svg>`;
}

function ean13Svg(input: string) {
  const value = normalizeGtin(input, 13);
  const parity = ean13Parity[Number(value[0])];
  let bits = '101';
  for (let index = 1; index <= 6; index += 1) {
    const digit = Number(value[index]);
    bits += parity[index - 1] === 'L' ? eanL[digit] : eanG[digit];
  }
  bits += '01010';
  for (let index = 7; index <= 12; index += 1)
    bits += eanR[Number(value[index])];
  return barcodeSvg(`${bits}101`, value);
}

function ean8Svg(input: string) {
  const value = normalizeGtin(input, 8);
  let bits = '101';
  for (let index = 0; index < 4; index += 1) bits += eanL[Number(value[index])];
  bits += '01010';
  for (let index = 4; index < 8; index += 1) bits += eanR[Number(value[index])];
  return barcodeSvg(`${bits}101`, value);
}

const itfPatterns = [
  '00110',
  '10001',
  '01001',
  '11000',
  '00101',
  '10100',
  '01100',
  '00011',
  '10010',
  '01010',
];

function itf14Svg(input: string) {
  const value = normalizeGtin(input, 14);
  const widths: number[] = [1, 1, 1, 1];
  for (let index = 0; index < value.length; index += 2) {
    const bars = itfPatterns[Number(value[index])];
    const spaces = itfPatterns[Number(value[index + 1])];
    for (let position = 0; position < 5; position += 1) {
      widths.push(
        bars[position] === '1' ? 3 : 1,
        spaces[position] === '1' ? 3 : 1,
      );
    }
  }
  widths.push(3, 1, 1);
  let cursor = 20;
  const rects: string[] = [];
  widths.forEach((width, index) => {
    if (index % 2 === 0)
      rects.push(
        `<rect x="${cursor}" y="10" width="${width * 3}" height="90"/>`,
      );
    cursor += width * 3;
  });
  return `<svg xmlns="${svgNamespace}" width="${cursor + 20}" height="130" viewBox="0 0 ${cursor + 20} 130"><rect width="100%" height="100%" fill="#fff"/><g fill="#000">${rects.join('')}</g><text x="${(cursor + 20) / 2}" y="120" text-anchor="middle" font-family="ui-monospace,monospace" font-size="16" letter-spacing="2">${value}</text></svg>`;
}

const code39Patterns: Record<string, string> = {
  '0': '000110100',
  '1': '100100001',
  '2': '001100001',
  '3': '101100000',
  '4': '000110001',
  '5': '100110000',
  '6': '001110000',
  '7': '000100101',
  '8': '100100100',
  '9': '001100100',
  A: '100001001',
  B: '001001001',
  C: '101001000',
  D: '000011001',
  E: '100011000',
  F: '001011000',
  G: '000001101',
  H: '100001100',
  I: '001001100',
  J: '000011100',
  K: '100000011',
  L: '001000011',
  M: '101000010',
  N: '000010011',
  O: '100010010',
  P: '001010010',
  Q: '000000111',
  R: '100000110',
  S: '001000110',
  T: '000010110',
  U: '110000001',
  V: '011000001',
  W: '111000000',
  X: '010010001',
  Y: '110010000',
  Z: '011010000',
  '-': '010000101',
  '.': '110000100',
  ' ': '011000100',
  $: '010101000',
  '/': '010100010',
  '+': '010001010',
  '%': '000101010',
  '*': '010010100',
};

function code39Svg(input: string) {
  const value = input.trim().toUpperCase();
  if (!value || value.length > 80 || !/^[0-9A-Z .$/+%-]+$/u.test(value))
    throw new Error(
      'Code 39 accepts 1–80 uppercase letters, digits, spaces, and . $ / + % - characters.',
    );
  const encoded = `*${value}*`;
  const widths: number[] = [];
  for (const character of encoded) {
    const pattern = code39Patterns[character];
    Array.from(pattern).forEach((wide) => widths.push(wide === '1' ? 3 : 1));
    widths.push(1);
  }
  let cursor = 20;
  const rects: string[] = [];
  widths.forEach((width, index) => {
    if (index % 2 === 0)
      rects.push(
        `<rect x="${cursor}" y="10" width="${width * 3}" height="90"/>`,
      );
    cursor += width * 3;
  });
  return `<svg xmlns="${svgNamespace}" width="${cursor + 20}" height="130" viewBox="0 0 ${cursor + 20} 130"><rect width="100%" height="100%" fill="#fff"/><g fill="#000">${rects.join('')}</g><text x="${(cursor + 20) / 2}" y="120" text-anchor="middle" font-family="ui-monospace,monospace" font-size="16" letter-spacing="2">${escapeXml(value)}</text></svg>`;
}

function logoSvg(svg: string, dataUrl: string) {
  if (!/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/u.test(dataUrl))
    throw new Error('Choose a PNG, JPEG, or WebP logo image.');
  const viewBox = svg.match(/viewBox="0 0 (\d+) (\d+)"/u);
  if (!viewBox) throw new Error('Generated QR SVG has no square viewBox.');
  const size = Number(viewBox[1]);
  const logoSize = size * 0.2;
  const start = (size - logoSize) / 2;
  return svg.replace(
    '</svg>',
    `<rect x="${start - 1}" y="${start - 1}" width="${logoSize + 2}" height="${logoSize + 2}" rx="1" fill="#fff"/><image href="${escapeXml(dataUrl)}" x="${start}" y="${start}" width="${logoSize}" height="${logoSize}" preserveAspectRatio="xMidYMid meet"/></svg>`,
  );
}

export async function runQrBarcodeOperation(
  operationId: string,
  values: Record<string, string>,
): Promise<string> {
  if (operationId === 'qr-code-batch-generator') {
    const items = required(values, 'items', 'at least one payload', 6_000)
      .split(/\r?\n/u)
      .map((payload) => payload.trim())
      .filter(Boolean);
    if (items.length > 12)
      throw new Error('Batch generation accepts at most 12 payloads.');
    return batchSvg(
      items.map((payload, index) => ({ label: `QR ${index + 1}`, payload })),
      qrStyle(values).error,
      false,
    );
  }
  if (operationId === 'qr-code-contact-sheet') {
    const lines = required(
      values,
      'items',
      'at least one labelled payload',
      6_000,
    )
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length > 12)
      throw new Error('Contact sheets accept at most 12 items.');
    const items = lines.map((line, index) => {
      const [label, ...payload] = line.split('|');
      if (!payload.length)
        throw new Error(`Line ${index + 1} must use Label | payload.`);
      return { label: label.trim(), payload: payload.join('|').trim() };
    });
    if (items.some((item) => !item.payload))
      throw new Error('Every contact-sheet item needs a payload.');
    return batchSvg(items, qrStyle(values).error, true);
  }
  if (operationId === 'qr-code-error-correction-tester') {
    const payload = buildQrPayload(operationId, values);
    return batchSvg(
      (['L', 'M', 'Q', 'H'] as const).map((level) => ({
        label: `Level ${level}`,
        payload,
      })),
      'M',
      true,
    ).then(async (sheet) => {
      const rendered = await Promise.all(
        (['L', 'M', 'Q', 'H'] as const).map((level) =>
          renderQr(payload, { size: '190' }, level),
        ),
      );
      let index = 0;
      return sheet.replace(
        /<svg x="[^"]+" y="[^"]+" width="190" height="190" viewBox="[^"]+">[\s\S]*?<\/svg>/gu,
        () => {
          const x = (index % 3) * 220 + 15;
          const y = Math.floor(index / 3) * 245 + 10;
          const nested = nestedSvg(rendered[index], x, y, 190);
          index += 1;
          return nested;
        },
      );
    });
  }
  if (operationId === 'ean-13-generator')
    return ean13Svg(required(values, 'value', 'a value', 32));
  if (operationId === 'ean-8-generator')
    return ean8Svg(required(values, 'value', 'a value', 32));
  if (operationId === 'upc-a-generator') {
    const value = normalizeGtin(required(values, 'value', 'a value', 32), 12);
    return ean13Svg(`0${value}`);
  }
  if (operationId === 'itf-14-generator')
    return itf14Svg(required(values, 'value', 'a value', 32));
  if (operationId === 'code-39-generator')
    return code39Svg(required(values, 'value', 'a value', 80));

  const payload = buildQrPayload(operationId, values);
  const svg = await renderQr(
    payload,
    values,
    operationId === 'qr-code-logo-embedder' ? 'H' : undefined,
  );
  return operationId === 'qr-code-logo-embedder'
    ? logoSvg(svg, required(values, 'logo', 'a logo image', 3_000_000))
    : svg;
}
