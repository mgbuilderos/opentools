import { deflateSync } from 'node:zlib';

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Buffer) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}

/**
 * A real PNG: a dark square centred on a plain white field.
 *
 * The 1×1 fixtures the Node QC uses would pass crop, rotate and grayscale
 * trivially. This one has area for the cropper, colour for the filters, and a
 * uniform background with a distinct subject so the solid-colour background
 * remover has something real to remove.
 */
export function testPng(size = 64) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  const inset = Math.floor(size / 4);
  let offset = 0;
  for (let y = 0; y < size; y += 1) {
    raw[offset] = 0; // filter: none
    offset += 1;
    for (let x = 0; x < size; x += 1) {
      const subject =
        x >= inset && x < size - inset && y >= inset && y < size - inset;
      raw[offset] = subject ? 0x20 : 0xff;
      raw[offset + 1] = subject ? 0x40 : 0xff;
      raw[offset + 2] = subject ? 0x90 : 0xff;
      offset += 3;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** A multi-page PDF, so reorder and delete have more than one page to move. */
export async function testPdf(pages = 3) {
  const { PDFDocument, StandardFonts } = await import('pdf-lib');
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (let index = 0; index < pages; index += 1) {
    const page = pdf.addPage([300, 400]);
    page.drawText(`Page ${index + 1}`, { x: 40, y: 340, size: 24, font });
  }
  return Buffer.from(await pdf.save());
}

/**
 * Builds a photo-heavy PDF using a JPEG the browser encodes for us.
 *
 * Node has no JPEG encoder, and a PDF of flat colour would compress to nothing
 * in any codec, proving nothing. The noise pattern here resists compression, so
 * the source JPEG is genuinely large and a saving afterwards is a real saving.
 */
export async function testPhotoPdf(
  page: import('@playwright/test').Page,
  pages = 3,
) {
  const base64Jpeg = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1400;
    canvas.height = 1000;
    const context = canvas.getContext('2d')!;
    const image = context.createImageData(canvas.width, canvas.height);
    // A fixed generator, so the fixture is the same on every run.
    let seed = 20260917;
    for (let i = 0; i < image.data.length; i += 4) {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      image.data[i] = seed % 256;
      image.data[i + 1] = (seed >> 8) % 256;
      image.data[i + 2] = (seed >> 16) % 256;
      image.data[i + 3] = 255;
    }
    context.putImageData(image, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.95).split(',')[1]!;
  });

  const { PDFDocument } = await import('pdf-lib');
  const pdf = await PDFDocument.create();
  const jpeg = await pdf.embedJpg(Buffer.from(base64Jpeg, 'base64'));
  for (let index = 0; index < pages; index += 1) {
    const page_ = pdf.addPage([600, 430]);
    page_.drawImage(jpeg, { x: 0, y: 0, width: 600, height: 430 });
  }
  return Buffer.from(await pdf.save());
}
