import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const encoder = new TextEncoder();
const longVr = new Set([
  'OB',
  'OD',
  'OF',
  'OL',
  'OV',
  'OW',
  'SQ',
  'SV',
  'UC',
  'UR',
  'UT',
  'UN',
  'UV',
]);

function concat(...parts) {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function u16(value, little = true) {
  const bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setUint16(0, value, little);
  return bytes;
}

function u32(value, little = true) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, little);
  return bytes;
}

function even(value, pad = 0x20) {
  return value.length % 2 === 0 ? value : concat(value, Uint8Array.of(pad));
}

function text(value, vr) {
  return even(encoder.encode(value), vr === 'UI' ? 0 : 0x20);
}

function explicit(group, element, vr, value, little = true) {
  const bytes = value instanceof Uint8Array ? even(value, 0) : text(value, vr);
  const tag = concat(
    u16(group, little),
    u16(element, little),
    encoder.encode(vr),
  );
  return longVr.has(vr)
    ? concat(tag, Uint8Array.of(0, 0), u32(bytes.length, little), bytes)
    : concat(tag, u16(bytes.length, little), bytes);
}

function implicit(group, element, value) {
  const bytes =
    value instanceof Uint8Array ? even(value, 0) : even(encoder.encode(value));
  return concat(u16(group), u16(element), u32(bytes.length), bytes);
}

function us(value, little = true) {
  return u16(value, little);
}

function fileMeta(transferSyntax) {
  const body = concat(
    explicit(0x0002, 0x0001, 'OB', Uint8Array.of(0, 1)),
    explicit(0x0002, 0x0010, 'UI', transferSyntax),
    explicit(0x0002, 0x0012, 'UI', '1.2.826.0.1.3680043.10.999'),
  );
  return concat(explicit(0x0002, 0x0000, 'UL', u32(body.length)), body);
}

function dicom(transferSyntax, dataset) {
  return concat(
    new Uint8Array(128),
    encoder.encode('DICM'),
    fileMeta(transferSyntax),
    dataset,
  );
}

function explicitDataset(
  little = true,
  pixelBytes = Uint8Array.of(0, 50, 100, 150, 200, 255),
  bits = 8,
) {
  return concat(
    explicit(0x0008, 0x0016, 'UI', '1.2.840.10008.5.1.4.1.1.7', little),
    explicit(0x0008, 0x0018, 'UI', '1.2.826.0.1.3680043.10.999.1', little),
    explicit(0x0008, 0x0020, 'DA', '20260926', little),
    explicit(0x0008, 0x0080, 'LO', 'SYNTHETIC HOSPITAL', little),
    explicit(0x0010, 0x0010, 'PN', 'SYNTHETIC^PERSON', little),
    explicit(0x0010, 0x0020, 'LO', 'SYNTHETIC-123', little),
    explicit(0x0010, 0x1000, 'LO', 'OLDER-ID-456', little),
    explicit(0x0011, 0x0010, 'LO', 'SYNTHETIC_PRIVATE', little),
    explicit(0x0028, 0x0002, 'US', us(1, little), little),
    explicit(0x0028, 0x0004, 'CS', 'MONOCHROME2', little),
    explicit(0x0028, 0x0010, 'US', us(bits === 8 ? 2 : 1, little), little),
    explicit(0x0028, 0x0011, 'US', us(bits === 8 ? 3 : 2, little), little),
    explicit(0x0028, 0x0100, 'US', us(bits, little), little),
    explicit(0x0028, 0x0101, 'US', us(bits, little), little),
    explicit(0x0028, 0x0102, 'US', us(bits - 1, little), little),
    explicit(0x0028, 0x0103, 'US', us(0, little), little),
    explicit(0x7fe0, 0x0010, bits === 8 ? 'OB' : 'OW', pixelBytes, little),
  );
}

function implicitDataset() {
  return concat(
    implicit(0x0008, 0x0018, '1.2.826.0.1.3680043.10.999.2'),
    implicit(0x0010, 0x0010, 'IMPLICIT^PERSON'),
    implicit(0x0010, 0x0020, 'IMPLICIT-123'),
    implicit(0x0028, 0x0002, us(1)),
    implicit(0x0028, 0x0004, 'MONOCHROME2'),
    implicit(0x0028, 0x0010, us(2)),
    implicit(0x0028, 0x0011, us(3)),
    implicit(0x0028, 0x0100, us(8)),
    implicit(0x7778, 0x0010, 'opaque-even-tag'),
    implicit(0x7fe0, 0x0010, Uint8Array.of(1, 2, 3, 4, 5, 6)),
  );
}

function rlePixelData() {
  const header = new Uint8Array(64);
  const view = new DataView(header.buffer);
  view.setUint32(0, 1, true);
  view.setUint32(4, 64, true);
  const encoded = Uint8Array.of(5, 0, 50, 100, 150, 200, 255, 0x80);
  const frame = concat(header, encoded);
  const pixelHeader = concat(
    u16(0x7fe0),
    u16(0x0010),
    encoder.encode('OB'),
    Uint8Array.of(0, 0),
    u32(0xffffffff),
  );
  const item = (bytes) =>
    concat(u16(0xfffe), u16(0xe000), u32(bytes.length), bytes);
  return concat(
    pixelHeader,
    item(new Uint8Array()),
    item(frame),
    u16(0xfffe),
    u16(0xe0dd),
    u32(0),
  );
}

function rleDataset() {
  const withoutPixels = explicitDataset().subarray(
    0,
    explicitDataset().length -
      explicit(0x7fe0, 0x0010, 'OB', Uint8Array.of(0, 50, 100, 150, 200, 255))
        .length,
  );
  return concat(withoutPixels, rlePixelData());
}

const explicitLittle = dicom('1.2.840.10008.1.2.1', explicitDataset());
const implicitLittle = dicom('1.2.840.10008.1.2', implicitDataset());
const explicitBig = dicom(
  '1.2.840.10008.1.2.2',
  explicitDataset(false, Uint8Array.of(1, 2, 3, 4), 16),
);
const rle = dicom('1.2.840.10008.1.2.5', rleDataset());
const jpeg = dicom('1.2.840.10008.1.2.4.50', explicitDataset());
const wrongMagic = new Uint8Array(160);
const declaredLength = concat(
  new Uint8Array(128),
  encoder.encode('DICM'),
  u16(0x0002),
  u16(0x0010),
  encoder.encode('UI'),
  u16(100),
  encoder.encode('short'),
);

await Promise.all([
  writeFile(resolve(here, 'explicit-le.dcm'), explicitLittle),
  writeFile(resolve(here, 'implicit-le.dcm'), implicitLittle),
  writeFile(resolve(here, 'explicit-be.dcm'), explicitBig),
  writeFile(resolve(here, 'rle.dcm'), rle),
  writeFile(resolve(here, 'jpeg.dcm'), jpeg),
  writeFile(resolve(here, 'truncated.dcm'), explicitLittle.subarray(0, 130)),
  writeFile(resolve(here, 'wrong-magic.dcm'), wrongMagic),
  writeFile(resolve(here, 'declared-length.dcm'), declaredLength),
]);
