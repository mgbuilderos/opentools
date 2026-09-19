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

/**
 * A PDF with a text field, a checkbox and a dropdown to fill in on page 1,
 * followed by `extraPages` blank pages to sign on.
 */
export async function testFormPdf(extraPages = 0) {
  const { PDFDocument } = await import('pdf-lib');
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([400, 500]);
  const form = pdf.getForm();

  const name = form.createTextField('applicant.name');
  name.setText('');
  name.addToPage(page, { x: 40, y: 420, width: 300, height: 24 });

  const agree = form.createCheckBox('agree.terms');
  agree.addToPage(page, { x: 40, y: 380, width: 16, height: 16 });

  const country = form.createDropdown('address.country');
  country.addOptions(['India', 'Singapore', 'United Kingdom']);
  country.addToPage(page, { x: 40, y: 330, width: 200, height: 24 });
  for (let index = 0; index < extraPages; index += 1) pdf.addPage([400, 500]);

  return Buffer.from(await pdf.save());
}

/**
 * A form that already holds values nobody should rewrite: a multi-select list
 * with two picks, same-name check boxes with different on-values, auto-sized
 * text (DA 0 Tf) and a prefilled Devanagari value. Only `applicant.name` is
 * meant to be changed. Saved without regenerating appearances, as a form made
 * elsewhere would arrive.
 */
export async function testUntouchedFormPdf() {
  const { PDFDocument, PDFHexString, PDFName, PDFNumber } =
    await import('pdf-lib');
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([400, 600]);
  const form = pdf.getForm();

  const name = form.createTextField('applicant.name');
  name.addToPage(page, { x: 40, y: 540, width: 300, height: 24 });

  const languages = form.createOptionList('languages');
  languages.addOptions(['English', 'Hindi', 'Kannada']);
  languages.enableMultiselect();
  languages.select(['English', 'Kannada']);
  languages.addToPage(page, { x: 40, y: 420, width: 200, height: 90 });

  // Built as a radio group, then turned into plain check boxes: on-states /0
  // and /1 with the export values in /Opt, the way Acrobat stores them.
  const size = form.createRadioGroup('size');
  size.addOptionToPage('Small', page, { x: 40, y: 380, width: 16, height: 16 });
  size.addOptionToPage('Large', page, {
    x: 100,
    y: 380,
    width: 16,
    height: 16,
  });
  size.select('Large');
  size.acroField.dict.set(PDFName.of('Ff'), PDFNumber.of(0));

  const remarks = form.createTextField('remarks');
  remarks.setText('Auto sized remark');
  remarks.addToPage(page, { x: 40, y: 320, width: 300, height: 24 });
  remarks.acroField.setDefaultAppearance('/Helv 0 Tf 0 g');

  const city = form.createTextField('applicant.city');
  city.addToPage(page, { x: 40, y: 280, width: 300, height: 24 });
  city.acroField.dict.set(PDFName.of('V'), PDFHexString.fromText('मुंबई'));

  return Buffer.from(await pdf.save({ updateFieldAppearances: false }));
}

/**
 * Two pages whose visible area does not start at 0,0. Page 1 is turned a
 * quarter clockwise with an offset MediaBox and CropBox (displayed 500 x 450);
 * page 2 is upright with an offset CropBox (displayed 300 x 400). Both leave a
 * scale behind without q/Q, as careless producers do.
 */
export async function testGeometryPdf() {
  const { PDFDocument, concatTransformationMatrix, degrees } =
    await import('pdf-lib');
  const pdf = await PDFDocument.create();
  const turned = pdf.addPage([612, 792]);
  turned.setMediaBox(0, 100, 612, 792);
  turned.setCropBox(50, 150, 450, 500);
  turned.setRotation(degrees(90));
  turned.pushOperators(concatTransformationMatrix(2, 0, 0, 2, 0, 0));

  const offset = pdf.addPage([612, 792]);
  offset.setCropBox(120, 200, 300, 400);
  offset.pushOperators(concatTransformationMatrix(2, 0, 0, 2, 0, 0));
  return Buffer.from(await pdf.save());
}

/**
 * A form with an existing digital signature: a /Sig field whose /V is a
 * signature dictionary. Any byte changed would invalidate it.
 */
export async function testDigitallySignedPdf() {
  const { PDFDocument, PDFHexString, PDFName } = await import('pdf-lib');
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([400, 500]);
  const form = pdf.getForm();
  const name = form.createTextField('applicant.name');
  name.addToPage(page, { x: 40, y: 420, width: 300, height: 24 });

  const signature = pdf.context.obj({
    Type: 'Annot',
    Subtype: 'Widget',
    FT: 'Sig',
    T: PDFHexString.fromText('Signature1'),
    Rect: [40, 60, 240, 100],
    F: 4,
    P: page.ref,
  });
  signature.set(
    PDFName.of('V'),
    pdf.context.register(
      pdf.context.obj({
        Type: 'Sig',
        Filter: 'Adobe.PPKLite',
        SubFilter: 'adbe.pkcs7.detached',
        ByteRange: [0, 100, 200, 300],
        Contents: PDFHexString.of('00'.repeat(32)),
      }),
    ),
  );
  const signatureRef = pdf.context.register(signature);
  page.node.addAnnot(signatureRef);
  form.acroForm.addField(signatureRef);
  return Buffer.from(await pdf.save());
}

/**
 * A form for "Make it final": a required field, a hidden and a NoView field
 * holding text that must never be printed, a reviewer's note annotation that
 * must survive, and an /Annots entry pointing at an object the file never had.
 */
export async function testFinalFormPdf() {
  const { PDFDocument, PDFHexString, PDFName, PDFNumber, PDFRef } =
    await import('pdf-lib');
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([400, 500]);
  const form = pdf.getForm();

  const name = form.createTextField('applicant.name');
  name.enableRequired();
  name.addToPage(page, { x: 40, y: 420, width: 300, height: 24 });

  const notes = form.createTextField('applicant.notes');
  notes.addToPage(page, { x: 40, y: 380, width: 300, height: 24 });

  const hidden = form.createTextField('internal.score');
  hidden.setText('RISK-SCORE-87');
  hidden.addToPage(page, { x: 40, y: 300, width: 200, height: 24 });
  hidden.acroField.getWidgets()[0]!.dict.set(PDFName.of('F'), PDFNumber.of(2));

  const noView = form.createTextField('noview.note');
  noView.setText('NOVIEW-SECRET');
  noView.addToPage(page, { x: 40, y: 260, width: 200, height: 24 });
  noView.acroField.getWidgets()[0]!.dict.set(PDFName.of('F'), PDFNumber.of(32));

  const note = pdf.context.register(
    pdf.context.obj({
      Type: 'Annot',
      Subtype: 'Text',
      Rect: [300, 20, 320, 40],
      Contents: PDFHexString.fromText('Reviewer note'),
    }),
  );
  page.node.addAnnot(note);
  page.node.addAnnot(PDFRef.of(9000));
  return Buffer.from(await pdf.save());
}

/**
 * A multi-select list whose stored value includes "Purple", which its options
 * no longer offer, the way a form looks after someone trimmed its options.
 */
export async function testStoredChoicePdf() {
  const { PDFDocument, PDFHexString, PDFName } = await import('pdf-lib');
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([400, 500]);
  const list = pdf.getForm().createOptionList('colours');
  list.addOptions(['Red', 'Green', 'Blue']);
  list.enableMultiselect();
  list.addToPage(page, { x: 40, y: 300, width: 200, height: 80 });
  list.acroField.dict.set(
    PDFName.of('V'),
    pdf.context.obj([
      PDFHexString.fromText('Purple'),
      PDFHexString.fromText('Red'),
    ]),
  );
  return Buffer.from(await pdf.save());
}

/** A static XFA form: an XFA part next to an ordinary text field. */
export async function testStaticXfaPdf() {
  const { PDFDocument, PDFName } = await import('pdf-lib');
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([400, 500]);
  const form = pdf.getForm();
  form
    .createTextField('form1[0].name[0]')
    .addToPage(page, { x: 40, y: 400, width: 200, height: 24 });
  form.acroForm.dict.set(
    PDFName.of('XFA'),
    pdf.context.register(
      pdf.context.flateStream(
        '<xdp:xdp xmlns:xdp="http://ns.adobe.com/xdp/"><template/></xdp:xdp>',
      ),
    ),
  );
  // pdf-lib's own appearance pass would strip the XFA from the fixture.
  return Buffer.from(await pdf.save({ updateFieldAppearances: false }));
}

/**
 * A detailed PNG the browser encodes for us: smooth gradients with noise on
 * top. A flat image would fit any KB limit at full quality and prove nothing
 * about the quality search; this one needs real compression to fit.
 */
export async function testDetailedPng(
  page: import('@playwright/test').Page,
  width = 1200,
  height = 900,
) {
  const base64Png = await page.evaluate(
    ([w, h]) => {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const context = canvas.getContext('2d')!;
      const image = context.createImageData(w, h);
      let seed = 20260917;
      for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
          seed = (seed * 1103515245 + 12345) % 2147483648;
          const noise = (seed % 64) - 32;
          const i = (y * w + x) * 4;
          image.data[i] = (x * 255) / w + noise;
          image.data[i + 1] = (y * 255) / h + noise;
          image.data[i + 2] = ((x + y) * 127) / (w + h) + noise;
          image.data[i + 3] = 255;
        }
      }
      context.putImageData(image, 0, 0);
      return canvas.toDataURL('image/png').split(',')[1]!;
    },
    [width, height] as const,
  );
  return Buffer.from(base64Png, 'base64');
}
