export type DicomFormatErrorCode =
  | 'TRUNCATED_DICOM'
  | 'UNSUPPORTED_FORMAT'
  | 'MALFORMED_DICOM'
  | 'DECLARED_LENGTH_EXCEEDS_BUFFER'
  | 'UNSUPPORTED_TRANSFER_SYNTAX'
  | 'UNSUPPORTED_COMPRESSION'
  | 'UNSUPPORTED_PIXEL_DATA'
  | 'INVALID_PROFILE';

export class DicomFormatError extends Error {
  readonly code: DicomFormatErrorCode;

  constructor(code: DicomFormatErrorCode, message: string) {
    super(message);
    this.name = 'DicomFormatError';
    this.code = code;
  }
}

export type DicomValue =
  | string
  | number
  | readonly number[]
  | { readonly byteLength: number };

export interface DicomTagReference {
  tag: string;
  name: string;
  vr: string;
}

export interface DicomTag extends DicomTagReference {
  group: number;
  element: number;
  length: number;
  value: DicomValue;
  offset: number;
  valueOffset: number;
}

export interface DicomReadResult {
  transferSyntax: string;
  explicitVr: boolean;
  littleEndian: boolean;
  tags: readonly DicomTag[];
  unparsed: readonly DicomTagReference[];
}

export interface AnonymisationProfile {
  name: 'basic-application-level-confidentiality';
}

export interface AnonymisationResult {
  bytes: Uint8Array;
  removed: readonly DicomTagReference[];
  unparsed: readonly DicomTagReference[];
}

export interface ExtractedPixels {
  width: number;
  height: number;
  bitDepth: number;
  data: Uint8Array;
}

export const BASIC_APPLICATION_LEVEL_CONFIDENTIALITY_PROFILE = {
  name: 'basic-application-level-confidentiality',
} as const satisfies AnonymisationProfile;

export const PIXEL_BURN_IN_WARNING =
  'Tag anonymisation does not remove identifying information burned into pixel data. Review pixels separately.';

const IMPLICIT_VR_LITTLE_ENDIAN = '1.2.840.10008.1.2';
const EXPLICIT_VR_LITTLE_ENDIAN = '1.2.840.10008.1.2.1';
const EXPLICIT_VR_BIG_ENDIAN = '1.2.840.10008.1.2.2';
const RLE_LOSSLESS = '1.2.840.10008.1.2.5';
const JPEG_PREFIX = '1.2.840.10008.1.2.4.';

const LONG_VR = new Set([
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

const VALID_VR = new Set([
  'AE',
  'AS',
  'AT',
  'CS',
  'DA',
  'DS',
  'DT',
  'FD',
  'FL',
  'IS',
  'LO',
  'LT',
  'OB',
  'OD',
  'OF',
  'OL',
  'OV',
  'OW',
  'PN',
  'SH',
  'SL',
  'SQ',
  'SS',
  'ST',
  'SV',
  'TM',
  'UC',
  'UI',
  'UL',
  'UN',
  'UR',
  'US',
  'UT',
  'UV',
]);

const TEXT_VR = new Set([
  'AE',
  'AS',
  'CS',
  'DA',
  'DS',
  'DT',
  'IS',
  'LO',
  'LT',
  'PN',
  'SH',
  'ST',
  'TM',
  'UC',
  'UI',
  'UR',
  'UT',
]);

interface DictionaryEntry {
  vr: string;
  name: string;
}

const DICTIONARY: Readonly<Record<string, DictionaryEntry>> = {
  '0002,0000': { vr: 'UL', name: 'File Meta Information Group Length' },
  '0002,0001': { vr: 'OB', name: 'File Meta Information Version' },
  '0002,0002': { vr: 'UI', name: 'Media Storage SOP Class UID' },
  '0002,0003': { vr: 'UI', name: 'Media Storage SOP Instance UID' },
  '0002,0010': { vr: 'UI', name: 'Transfer Syntax UID' },
  '0002,0012': { vr: 'UI', name: 'Implementation Class UID' },
  '0002,0013': { vr: 'SH', name: 'Implementation Version Name' },
  '0008,0016': { vr: 'UI', name: 'SOP Class UID' },
  '0008,0018': { vr: 'UI', name: 'SOP Instance UID' },
  '0008,0020': { vr: 'DA', name: 'Study Date' },
  '0008,0021': { vr: 'DA', name: 'Series Date' },
  '0008,0022': { vr: 'DA', name: 'Acquisition Date' },
  '0008,0023': { vr: 'DA', name: 'Content Date' },
  '0008,002A': { vr: 'DT', name: 'Acquisition DateTime' },
  '0008,0030': { vr: 'TM', name: 'Study Time' },
  '0008,0031': { vr: 'TM', name: 'Series Time' },
  '0008,0032': { vr: 'TM', name: 'Acquisition Time' },
  '0008,0033': { vr: 'TM', name: 'Content Time' },
  '0008,0050': { vr: 'SH', name: 'Accession Number' },
  '0008,0080': { vr: 'LO', name: 'Institution Name' },
  '0008,0081': { vr: 'ST', name: 'Institution Address' },
  '0008,0090': { vr: 'PN', name: 'Referring Physician Name' },
  '0008,0092': { vr: 'ST', name: 'Referring Physician Address' },
  '0008,0094': { vr: 'SH', name: 'Referring Physician Telephone Numbers' },
  '0008,1010': { vr: 'SH', name: 'Station Name' },
  '0008,1030': { vr: 'LO', name: 'Study Description' },
  '0008,103E': { vr: 'LO', name: 'Series Description' },
  '0008,1040': { vr: 'LO', name: 'Institutional Department Name' },
  '0008,1048': { vr: 'PN', name: 'Physicians of Record' },
  '0008,1050': { vr: 'PN', name: 'Performing Physician Name' },
  '0008,1060': { vr: 'PN', name: 'Name of Physician Reading Study' },
  '0008,1070': { vr: 'PN', name: 'Operators Name' },
  '0010,0010': { vr: 'PN', name: 'Patient Name' },
  '0010,0020': { vr: 'LO', name: 'Patient ID' },
  '0010,0021': { vr: 'LO', name: 'Issuer of Patient ID' },
  '0010,0030': { vr: 'DA', name: 'Patient Birth Date' },
  '0010,0032': { vr: 'TM', name: 'Patient Birth Time' },
  '0010,0040': { vr: 'CS', name: 'Patient Sex' },
  '0010,1000': { vr: 'LO', name: 'Other Patient IDs' },
  '0010,1001': { vr: 'PN', name: 'Other Patient Names' },
  '0010,1010': { vr: 'AS', name: 'Patient Age' },
  '0010,1020': { vr: 'DS', name: 'Patient Size' },
  '0010,1030': { vr: 'DS', name: 'Patient Weight' },
  '0010,1040': { vr: 'LO', name: 'Patient Address' },
  '0010,1060': { vr: 'PN', name: 'Patient Mother Birth Name' },
  '0010,1090': { vr: 'LO', name: 'Medical Record Locator' },
  '0010,2150': { vr: 'LO', name: 'Country of Residence' },
  '0010,2152': { vr: 'LO', name: 'Region of Residence' },
  '0010,2154': { vr: 'SH', name: 'Patient Telephone Numbers' },
  '0010,2160': { vr: 'SH', name: 'Ethnic Group' },
  '0010,2180': { vr: 'SH', name: 'Occupation' },
  '0018,1000': { vr: 'LO', name: 'Device Serial Number' },
  '0018,1030': { vr: 'LO', name: 'Protocol Name' },
  '0020,000D': { vr: 'UI', name: 'Study Instance UID' },
  '0020,000E': { vr: 'UI', name: 'Series Instance UID' },
  '0020,0010': { vr: 'SH', name: 'Study ID' },
  '0020,0052': { vr: 'UI', name: 'Frame of Reference UID' },
  '0028,0002': { vr: 'US', name: 'Samples per Pixel' },
  '0028,0004': { vr: 'CS', name: 'Photometric Interpretation' },
  '0028,0008': { vr: 'IS', name: 'Number of Frames' },
  '0028,0010': { vr: 'US', name: 'Rows' },
  '0028,0011': { vr: 'US', name: 'Columns' },
  '0028,0100': { vr: 'US', name: 'Bits Allocated' },
  '0028,0101': { vr: 'US', name: 'Bits Stored' },
  '0028,0102': { vr: 'US', name: 'High Bit' },
  '0028,0103': { vr: 'US', name: 'Pixel Representation' },
  '0028,0303': { vr: 'CS', name: 'Longitudinal Temporal Information Modified' },
  '0040,0275': { vr: 'SQ', name: 'Request Attributes Sequence' },
  '7FE0,0008': { vr: 'OF', name: 'Float Pixel Data' },
  '7FE0,0009': { vr: 'OD', name: 'Double Float Pixel Data' },
  '7FE0,0010': { vr: 'OW', name: 'Pixel Data' },
};

const SENSITIVE_TAGS = new Set([
  '0002,0003',
  '0008,0018',
  '0008,0050',
  '0008,0080',
  '0008,0081',
  '0008,0090',
  '0008,0092',
  '0008,0094',
  '0008,1010',
  '0008,1030',
  '0008,103E',
  '0008,1040',
  '0008,1048',
  '0008,1050',
  '0008,1060',
  '0008,1070',
  '0010,0010',
  '0010,0020',
  '0010,0021',
  '0010,0040',
  '0010,1000',
  '0010,1001',
  '0010,1010',
  '0010,1020',
  '0010,1030',
  '0010,1040',
  '0010,1060',
  '0010,1090',
  '0010,2150',
  '0010,2152',
  '0010,2154',
  '0010,2160',
  '0010,2180',
  '0018,1000',
  '0018,1030',
  '0020,000D',
  '0020,000E',
  '0020,0010',
  '0020,0052',
]);

interface Syntax {
  explicitVr: boolean;
  littleEndian: boolean;
}

interface InternalTag extends DicomTag {
  valueEnd: number;
  undefinedLength: boolean;
  fragments?: readonly Uint8Array[];
}

interface InternalReadResult extends DicomReadResult {
  internalTags: readonly InternalTag[];
  datasetOffset: number;
  syntax: Syntax;
}

function hex(value: number): string {
  return value.toString(16).toUpperCase().padStart(4, '0');
}

function tagId(group: number, element: number): string {
  return `${hex(group)},${hex(element)}`;
}

function reference(tag: DicomTag): DicomTagReference {
  return { tag: tag.tag, name: tag.name, vr: tag.vr };
}

function uniqueReferences(
  values: readonly DicomTagReference[],
): DicomTagReference[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = `${value.tag}:${value.vr}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function viewOf(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function requireBytes(
  offset: number,
  length: number,
  end: number,
  code: 'TRUNCATED_DICOM' | 'DECLARED_LENGTH_EXCEEDS_BUFFER',
): void {
  if (offset < 0 || length < 0 || offset + length > end) {
    throw new DicomFormatError(
      code,
      code === 'TRUNCATED_DICOM'
        ? 'The DICOM file is truncated.'
        : 'A DICOM element declares data beyond the input buffer.',
    );
  }
}

function readAscii(bytes: Uint8Array, offset: number, length: number): string {
  requireBytes(offset, length, bytes.length, 'TRUNCATED_DICOM');
  let value = '';
  for (let index = offset; index < offset + length; index += 1) {
    value += String.fromCharCode(bytes[index]!);
  }
  return value;
}

function dictionaryEntry(group: number, element: number): DictionaryEntry {
  const tag = tagId(group, element);
  const known = DICTIONARY[tag];
  if (known) return known;
  return {
    vr: 'UN',
    name: group % 2 === 1 ? 'Private Attribute' : 'Unknown Tag',
  };
}

function decodeText(bytes: Uint8Array, start: number, length: number): string {
  const value = readAscii(bytes, start, length);
  let end = value.length;
  while (end > 0) {
    const code = value.charCodeAt(end - 1);
    if (code !== 0 && code !== 0x20) break;
    end -= 1;
  }
  return value.slice(0, end);
}

function numericValues(
  bytes: Uint8Array,
  start: number,
  length: number,
  unit: number,
  read: (view: DataView, offset: number) => number,
): number | number[] | { byteLength: number } {
  if (length === 0) return [];
  if (length % unit !== 0) return { byteLength: length };
  const view = viewOf(bytes);
  const values: number[] = [];
  for (let offset = start; offset < start + length; offset += unit) {
    values.push(read(view, offset));
  }
  return values.length === 1 ? values[0]! : values;
}

function decodeValue(
  bytes: Uint8Array,
  start: number,
  length: number,
  vr: string,
  littleEndian: boolean,
): DicomValue {
  if (TEXT_VR.has(vr)) return decodeText(bytes, start, length);
  if (vr === 'US')
    return numericValues(bytes, start, length, 2, (view, offset) =>
      view.getUint16(offset, littleEndian),
    );
  if (vr === 'SS')
    return numericValues(bytes, start, length, 2, (view, offset) =>
      view.getInt16(offset, littleEndian),
    );
  if (vr === 'UL')
    return numericValues(bytes, start, length, 4, (view, offset) =>
      view.getUint32(offset, littleEndian),
    );
  if (vr === 'SL')
    return numericValues(bytes, start, length, 4, (view, offset) =>
      view.getInt32(offset, littleEndian),
    );
  if (vr === 'FL')
    return numericValues(bytes, start, length, 4, (view, offset) =>
      view.getFloat32(offset, littleEndian),
    );
  if (vr === 'FD')
    return numericValues(bytes, start, length, 8, (view, offset) =>
      view.getFloat64(offset, littleEndian),
    );
  return { byteLength: length };
}

interface Header {
  group: number;
  element: number;
  tag: string;
  vr: string;
  name: string;
  headerLength: number;
  length: number;
  valueOffset: number;
  valueEnd: number;
  undefinedLength: boolean;
  known: boolean;
}

function readHeader(
  bytes: Uint8Array,
  offset: number,
  end: number,
  syntax: Syntax,
): Header {
  requireBytes(offset, 8, end, 'TRUNCATED_DICOM');
  const view = viewOf(bytes);
  const group = view.getUint16(offset, syntax.littleEndian);
  const element = view.getUint16(offset + 2, syntax.littleEndian);
  const tag = tagId(group, element);
  const knownEntry = DICTIONARY[tag];
  let vr: string;
  let headerLength: number;
  let length: number;

  if (syntax.explicitVr) {
    vr = readAscii(bytes, offset + 4, 2);
    if (!VALID_VR.has(vr)) {
      throw new DicomFormatError(
        'MALFORMED_DICOM',
        `The DICOM element ${tag} has an invalid value representation.`,
      );
    }
    if (LONG_VR.has(vr)) {
      requireBytes(offset, 12, end, 'TRUNCATED_DICOM');
      headerLength = 12;
      length = view.getUint32(offset + 8, syntax.littleEndian);
    } else {
      headerLength = 8;
      length = view.getUint16(offset + 6, syntax.littleEndian);
    }
  } else {
    vr = knownEntry?.vr ?? 'UN';
    headerLength = 8;
    length = view.getUint32(offset + 4, syntax.littleEndian);
  }

  const valueOffset = offset + headerLength;
  const undefinedLength = length === 0xffffffff;
  const valueEnd = undefinedLength ? valueOffset : valueOffset + length;
  if (!undefinedLength) {
    requireBytes(valueOffset, length, end, 'DECLARED_LENGTH_EXCEEDS_BUFFER');
  }
  const entry = knownEntry ?? dictionaryEntry(group, element);
  return {
    group,
    element,
    tag,
    vr,
    name: entry.name,
    headerLength,
    length,
    valueOffset,
    valueEnd,
    undefinedLength,
    known: Boolean(knownEntry),
  };
}

interface ParseState {
  tags: InternalTag[];
  unparsed: DicomTagReference[];
}

function itemTagAt(
  bytes: Uint8Array,
  offset: number,
  end: number,
  littleEndian: boolean,
): { group: number; element: number; length: number } {
  requireBytes(offset, 8, end, 'TRUNCATED_DICOM');
  const view = viewOf(bytes);
  return {
    group: view.getUint16(offset, littleEndian),
    element: view.getUint16(offset + 2, littleEndian),
    length: view.getUint32(offset + 4, littleEndian),
  };
}

function parseEncapsulated(
  bytes: Uint8Array,
  start: number,
  end: number,
  littleEndian: boolean,
): { fragments: Uint8Array[]; nextOffset: number } {
  const fragments: Uint8Array[] = [];
  let offset = start;
  let itemIndex = 0;
  while (offset < end) {
    const item = itemTagAt(bytes, offset, end, littleEndian);
    if (item.group !== 0xfffe) {
      throw new DicomFormatError(
        'MALFORMED_DICOM',
        'Encapsulated pixel data contains an invalid item.',
      );
    }
    if (item.element === 0xe0dd) {
      if (item.length !== 0) {
        throw new DicomFormatError(
          'MALFORMED_DICOM',
          'The pixel-data sequence delimiter has a non-zero length.',
        );
      }
      return { fragments, nextOffset: offset + 8 };
    }
    if (item.element !== 0xe000 || item.length === 0xffffffff) {
      throw new DicomFormatError(
        'MALFORMED_DICOM',
        'Encapsulated pixel data contains an invalid fragment.',
      );
    }
    requireBytes(
      offset + 8,
      item.length,
      end,
      'DECLARED_LENGTH_EXCEEDS_BUFFER',
    );
    if (itemIndex > 0) {
      fragments.push(bytes.slice(offset + 8, offset + 8 + item.length));
    }
    itemIndex += 1;
    offset += 8 + item.length;
  }
  throw new DicomFormatError(
    'TRUNCATED_DICOM',
    'Encapsulated pixel data has no sequence delimiter.',
  );
}

function parseRange(
  bytes: Uint8Array,
  start: number,
  end: number,
  syntax: Syntax,
  state: ParseState,
  stopAtDelimiter: boolean,
  depth = 0,
): number {
  if (depth > 64) {
    throw new DicomFormatError(
      'MALFORMED_DICOM',
      'The DICOM sequence nesting is too deep.',
    );
  }
  let offset = start;
  while (offset < end) {
    requireBytes(offset, 8, end, 'TRUNCATED_DICOM');
    const marker = itemTagAt(bytes, offset, end, syntax.littleEndian);
    if (marker.group === 0xfffe) {
      if (marker.element === 0xe00d || marker.element === 0xe0dd) {
        if (!stopAtDelimiter || marker.length !== 0) {
          throw new DicomFormatError(
            'MALFORMED_DICOM',
            'The DICOM dataset contains an unexpected delimiter.',
          );
        }
        return offset + 8;
      }
      if (marker.element !== 0xe000) {
        throw new DicomFormatError(
          'MALFORMED_DICOM',
          'The DICOM sequence contains an invalid item marker.',
        );
      }
      const itemStart = offset + 8;
      if (marker.length === 0xffffffff) {
        offset = parseRange(
          bytes,
          itemStart,
          end,
          syntax,
          state,
          true,
          depth + 1,
        );
      } else {
        requireBytes(
          itemStart,
          marker.length,
          end,
          'DECLARED_LENGTH_EXCEEDS_BUFFER',
        );
        parseRange(
          bytes,
          itemStart,
          itemStart + marker.length,
          syntax,
          state,
          false,
          depth + 1,
        );
        offset = itemStart + marker.length;
      }
      continue;
    }

    const header = readHeader(bytes, offset, end, syntax);
    const value: DicomValue = header.undefinedLength
      ? { byteLength: 0xffffffff }
      : decodeValue(
          bytes,
          header.valueOffset,
          header.length,
          header.vr,
          syntax.littleEndian,
        );
    const tag: InternalTag = {
      tag: header.tag,
      name: header.name,
      vr: header.vr,
      group: header.group,
      element: header.element,
      length: header.length,
      value,
      offset,
      valueOffset: header.valueOffset,
      valueEnd: header.valueEnd,
      undefinedLength: header.undefinedLength,
    };
    state.tags.push(tag);
    if (!header.known) {
      state.unparsed.push(reference(tag));
    }

    if (header.tag === '7FE0,0010' && header.undefinedLength) {
      const encapsulated = parseEncapsulated(
        bytes,
        header.valueOffset,
        end,
        syntax.littleEndian,
      );
      tag.fragments = encapsulated.fragments;
      tag.valueEnd = encapsulated.nextOffset;
      offset = encapsulated.nextOffset;
    } else if (header.vr === 'SQ') {
      if (header.undefinedLength) {
        offset = parseRange(
          bytes,
          header.valueOffset,
          end,
          syntax,
          state,
          true,
          depth + 1,
        );
      } else {
        parseRange(
          bytes,
          header.valueOffset,
          header.valueEnd,
          syntax,
          state,
          false,
          depth + 1,
        );
        offset = header.valueEnd;
      }
    } else if (header.undefinedLength) {
      state.unparsed.push(reference(tag));
      throw new DicomFormatError(
        'MALFORMED_DICOM',
        `The undefined-length element ${header.tag} cannot be framed safely.`,
      );
    } else {
      offset = header.valueEnd;
    }
  }
  if (stopAtDelimiter) {
    throw new DicomFormatError(
      'TRUNCATED_DICOM',
      'The DICOM sequence or item has no delimiter.',
    );
  }
  return offset;
}

function syntaxFor(transferSyntax: string): Syntax {
  if (transferSyntax === IMPLICIT_VR_LITTLE_ENDIAN) {
    return { explicitVr: false, littleEndian: true };
  }
  if (transferSyntax === EXPLICIT_VR_BIG_ENDIAN) {
    return { explicitVr: true, littleEndian: false };
  }
  if (
    transferSyntax === EXPLICIT_VR_LITTLE_ENDIAN ||
    transferSyntax === RLE_LOSSLESS ||
    transferSyntax.startsWith(JPEG_PREFIX)
  ) {
    return { explicitVr: true, littleEndian: true };
  }
  throw new DicomFormatError(
    'UNSUPPORTED_TRANSFER_SYNTAX',
    `The DICOM transfer syntax ${transferSyntax || '(missing)'} is not supported.`,
  );
}

function assertPreamble(bytes: Uint8Array): void {
  if (bytes.length < 132) {
    throw new DicomFormatError(
      'TRUNCATED_DICOM',
      'The DICOM preamble is truncated.',
    );
  }
  if (readAscii(bytes, 128, 4) !== 'DICM') {
    throw new DicomFormatError(
      'UNSUPPORTED_FORMAT',
      'The file does not contain the DICOM preamble and DICM marker.',
    );
  }
}

function parseInternal(bytes: Uint8Array): InternalReadResult {
  assertPreamble(bytes);
  const metaSyntax = { explicitVr: true, littleEndian: true };
  const state: ParseState = { tags: [], unparsed: [] };
  let offset = 132;
  while (offset < bytes.length) {
    requireBytes(offset, 8, bytes.length, 'TRUNCATED_DICOM');
    if (viewOf(bytes).getUint16(offset, true) !== 0x0002) break;
    const header = readHeader(bytes, offset, bytes.length, metaSyntax);
    if (header.undefinedLength) {
      throw new DicomFormatError(
        'MALFORMED_DICOM',
        'File Meta Information cannot use undefined-length elements.',
      );
    }
    const entry = dictionaryEntry(header.group, header.element);
    const tag: InternalTag = {
      tag: header.tag,
      name: entry.name,
      vr: header.vr,
      group: header.group,
      element: header.element,
      length: header.length,
      value: decodeValue(
        bytes,
        header.valueOffset,
        header.length,
        header.vr,
        true,
      ),
      offset,
      valueOffset: header.valueOffset,
      valueEnd: header.valueEnd,
      undefinedLength: false,
    };
    state.tags.push(tag);
    offset = header.valueEnd;
  }
  const transferSyntaxTag = state.tags.find((tag) => tag.tag === '0002,0010');
  const transferSyntax =
    typeof transferSyntaxTag?.value === 'string' ? transferSyntaxTag.value : '';
  const syntax = syntaxFor(transferSyntax);
  const datasetOffset = offset;
  parseRange(bytes, datasetOffset, bytes.length, syntax, state, false);
  return {
    transferSyntax,
    explicitVr: syntax.explicitVr,
    littleEndian: syntax.littleEndian,
    tags: state.tags,
    unparsed: uniqueReferences(state.unparsed),
    internalTags: state.tags,
    datasetOffset,
    syntax,
  };
}

export async function readTags(bytes: Uint8Array): Promise<DicomReadResult> {
  const result = parseInternal(bytes);
  return {
    transferSyntax: result.transferSyntax,
    explicitVr: result.explicitVr,
    littleEndian: result.littleEndian,
    tags: result.internalTags.map(
      ({
        tag,
        name,
        vr,
        group,
        element,
        length,
        value,
        offset,
        valueOffset,
      }) => ({
        tag,
        name,
        vr,
        group,
        element,
        length,
        value,
        offset,
        valueOffset,
      }),
    ),
    unparsed: result.unparsed,
  };
}

function isIdentifying(tag: DicomTag): boolean {
  if (tag.group % 2 === 1) return true;
  if (SENSITIVE_TAGS.has(tag.tag)) return true;
  if (
    tag.vr === 'PN' ||
    tag.vr === 'DA' ||
    tag.vr === 'DT' ||
    tag.vr === 'TM'
  ) {
    return true;
  }
  return (
    tag.vr === 'UI' &&
    tag.tag !== '0002,0010' &&
    tag.tag !== '0002,0002' &&
    tag.tag !== '0008,0016'
  );
}

export function identifyingTags(
  tags: readonly DicomTag[],
): DicomTagReference[] {
  return uniqueReferences(tags.filter(isIdentifying).map(reference));
}

function scrubValue(output: Uint8Array, tag: InternalTag): void {
  if (tag.undefinedLength || tag.length === 0 || tag.vr === 'SQ') return;
  const fill = TEXT_VR.has(tag.vr) ? 0x20 : 0;
  output.fill(fill, tag.valueOffset, tag.valueEnd);
  if (tag.vr === 'UI') {
    output[tag.valueOffset] = 0x30;
    output.fill(0, tag.valueOffset + 1, tag.valueEnd);
  }
}

function encodeUint16(value: number, littleEndian: boolean): Uint8Array {
  const output = new Uint8Array(2);
  new DataView(output.buffer).setUint16(0, value, littleEndian);
  return output;
}

function encodeUint32(value: number, littleEndian: boolean): Uint8Array {
  const output = new Uint8Array(4);
  new DataView(output.buffer).setUint32(0, value, littleEndian);
  return output;
}

function concatenate(...parts: readonly Uint8Array[]): Uint8Array {
  const output = new Uint8Array(
    parts.reduce((total, part) => total + part.length, 0),
  );
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function temporalModificationElement(syntax: Syntax): Uint8Array {
  const value = new TextEncoder().encode('REMOVED ');
  const tag = concatenate(
    encodeUint16(0x0028, syntax.littleEndian),
    encodeUint16(0x0303, syntax.littleEndian),
  );
  if (syntax.explicitVr) {
    return concatenate(
      tag,
      new TextEncoder().encode('CS'),
      encodeUint16(8, syntax.littleEndian),
      value,
    );
  }
  return concatenate(tag, encodeUint32(8, syntax.littleEndian), value);
}

/**
 * Applies a conservative implementation of the DICOM PS3.15 2026d Basic
 * Application Level Confidentiality Profile. It removes known identity fields,
 * all person-name/date/time values, dataset UIDs, and every private attribute.
 * Unknown dictionary entries are returned in `unparsed`; callers must treat that
 * list as a privacy review failure, never as proof that the tag is safe.
 *
 * Standard: https://dicom.nema.org/medical/dicom/current/output/chtml/part15/sect_E.2.html
 */
export async function anonymise(
  bytes: Uint8Array,
  profile: AnonymisationProfile,
): Promise<AnonymisationResult> {
  if (profile.name !== BASIC_APPLICATION_LEVEL_CONFIDENTIALITY_PROFILE.name) {
    throw new DicomFormatError(
      'INVALID_PROFILE',
      'Only the Basic Application Level Confidentiality Profile is supported.',
    );
  }
  const parsed = parseInternal(bytes);
  let output: Uint8Array = bytes.slice();
  const removed: DicomTagReference[] = [];
  const unparsedTags = new Set(parsed.unparsed.map(({ tag }) => tag));
  for (const tag of parsed.internalTags) {
    if (!isIdentifying(tag) && !unparsedTags.has(tag.tag)) continue;
    removed.push(reference(tag));
    scrubValue(output, tag);
  }

  const temporal = parsed.internalTags.find((tag) => tag.tag === '0028,0303');
  if (temporal && !temporal.undefinedLength && temporal.length >= 7) {
    output.fill(0x20, temporal.valueOffset, temporal.valueEnd);
    output.set(new TextEncoder().encode('REMOVED'), temporal.valueOffset);
  } else if (!temporal) {
    const element = temporalModificationElement(parsed.syntax);
    const insertion =
      parsed.internalTags.find(
        (tag) => tag.offset >= parsed.datasetOffset && tag.group > 0x0028,
      )?.offset ?? output.length;
    output = concatenate(
      output.subarray(0, insertion),
      element,
      output.subarray(insertion),
    );
  }

  return {
    bytes: output,
    removed: uniqueReferences(removed),
    unparsed: parsed.unparsed,
  };
}

function numberTag(
  result: InternalReadResult,
  id: string,
  fallback?: number,
): number {
  const value = result.tags.find((tag) => tag.tag === id)?.value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (fallback !== undefined) return fallback;
  throw new DicomFormatError(
    'UNSUPPORTED_PIXEL_DATA',
    `The DICOM pixel data is missing required tag ${id}.`,
  );
}

function joinFragments(fragments: readonly Uint8Array[]): Uint8Array {
  return concatenate(...fragments);
}

function decodePackBits(
  bytes: Uint8Array,
  start: number,
  end: number,
  expected: number,
): Uint8Array {
  const output = new Uint8Array(expected);
  let inputOffset = start;
  let outputOffset = 0;
  while (inputOffset < end && outputOffset < expected) {
    const control = (bytes[inputOffset++]! << 24) >> 24;
    if (control >= 0) {
      const count = control + 1;
      if (inputOffset + count > end || outputOffset + count > expected) {
        throw new DicomFormatError(
          'MALFORMED_DICOM',
          'An RLE literal run exceeds its segment bounds.',
        );
      }
      output.set(
        bytes.subarray(inputOffset, inputOffset + count),
        outputOffset,
      );
      inputOffset += count;
      outputOffset += count;
    } else if (control >= -127) {
      if (inputOffset >= end) {
        throw new DicomFormatError(
          'TRUNCATED_DICOM',
          'An RLE repeat run is truncated.',
        );
      }
      const count = 1 - control;
      if (outputOffset + count > expected) {
        throw new DicomFormatError(
          'MALFORMED_DICOM',
          'An RLE repeat run exceeds the decoded segment.',
        );
      }
      output.fill(bytes[inputOffset++]!, outputOffset, outputOffset + count);
      outputOffset += count;
    }
  }
  if (outputOffset !== expected) {
    throw new DicomFormatError(
      'TRUNCATED_DICOM',
      'An RLE segment ended before all pixels were decoded.',
    );
  }
  return output;
}

function decodeRle(
  pixelTag: InternalTag,
  width: number,
  height: number,
  bitDepth: number,
  samples: number,
  frames: number,
): Uint8Array {
  if (frames !== 1) {
    throw new DicomFormatError(
      'UNSUPPORTED_PIXEL_DATA',
      'Multi-frame RLE pixel data is not supported.',
    );
  }
  if ((bitDepth !== 8 && bitDepth !== 16) || samples < 1) {
    throw new DicomFormatError(
      'UNSUPPORTED_PIXEL_DATA',
      'RLE extraction supports 8-bit or 16-bit integer samples.',
    );
  }
  const frame = joinFragments(pixelTag.fragments ?? []);
  if (frame.length < 64) {
    throw new DicomFormatError(
      'TRUNCATED_DICOM',
      'The DICOM RLE header is truncated.',
    );
  }
  const view = viewOf(frame);
  const segmentCount = view.getUint32(0, true);
  const expectedSegments = samples * (bitDepth / 8);
  if (segmentCount !== expectedSegments || segmentCount > 15) {
    throw new DicomFormatError(
      'UNSUPPORTED_PIXEL_DATA',
      'The DICOM RLE segment layout does not match the pixel metadata.',
    );
  }
  const pixels = width * height;
  const planes: Uint8Array[] = [];
  for (let index = 0; index < segmentCount; index += 1) {
    const start = view.getUint32(4 + index * 4, true);
    const next =
      index + 1 < segmentCount
        ? view.getUint32(4 + (index + 1) * 4, true)
        : frame.length;
    if (start < 64 || next < start || next > frame.length) {
      throw new DicomFormatError(
        'MALFORMED_DICOM',
        'The DICOM RLE segment offsets are invalid.',
      );
    }
    planes.push(decodePackBits(frame, start, next, pixels));
  }
  const bytesPerSample = bitDepth / 8;
  const output = new Uint8Array(pixels * samples * bytesPerSample);
  for (let pixel = 0; pixel < pixels; pixel += 1) {
    for (let sample = 0; sample < samples; sample += 1) {
      const outputOffset = (pixel * samples + sample) * bytesPerSample;
      if (bytesPerSample === 1) {
        output[outputOffset] = planes[sample]![pixel]!;
      } else {
        output[outputOffset] = planes[sample * 2 + 1]![pixel]!;
        output[outputOffset + 1] = planes[sample * 2]![pixel]!;
      }
    }
  }
  return output;
}

export async function extractPixels(
  bytes: Uint8Array,
): Promise<ExtractedPixels> {
  const parsed = parseInternal(bytes);
  if (parsed.transferSyntax.startsWith(JPEG_PREFIX)) {
    throw new DicomFormatError(
      'UNSUPPORTED_COMPRESSION',
      'JPEG-compressed DICOM pixel data is not supported.',
    );
  }
  const height = numberTag(parsed, '0028,0010');
  const width = numberTag(parsed, '0028,0011');
  const bitDepth = numberTag(parsed, '0028,0100');
  const samples = numberTag(parsed, '0028,0002', 1);
  const frames = numberTag(parsed, '0028,0008', 1);
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    !Number.isInteger(bitDepth) ||
    !Number.isInteger(samples) ||
    !Number.isInteger(frames) ||
    width <= 0 ||
    height <= 0 ||
    bitDepth <= 0 ||
    samples <= 0 ||
    frames <= 0
  ) {
    throw new DicomFormatError(
      'UNSUPPORTED_PIXEL_DATA',
      'The DICOM pixel dimensions are invalid.',
    );
  }
  const pixelTag = parsed.internalTags.find(
    (tag) =>
      tag.tag === '7FE0,0010' ||
      tag.tag === '7FE0,0008' ||
      tag.tag === '7FE0,0009',
  );
  if (!pixelTag) {
    throw new DicomFormatError(
      'UNSUPPORTED_PIXEL_DATA',
      'The DICOM dataset has no pixel data element.',
    );
  }
  if (parsed.transferSyntax === RLE_LOSSLESS) {
    return {
      width,
      height,
      bitDepth,
      data: decodeRle(pixelTag, width, height, bitDepth, samples, frames),
    };
  }
  if (pixelTag.undefinedLength) {
    throw new DicomFormatError(
      'UNSUPPORTED_COMPRESSION',
      'Encapsulated DICOM pixel data uses an unsupported compression.',
    );
  }
  const expected = Math.ceil(
    (width * height * samples * frames * bitDepth) / 8,
  );
  if (pixelTag.length < expected) {
    throw new DicomFormatError(
      'TRUNCATED_DICOM',
      'The DICOM pixel data is shorter than its dimensions declare.',
    );
  }
  return {
    width,
    height,
    bitDepth,
    data: bytes.slice(pixelTag.valueOffset, pixelTag.valueOffset + expected),
  };
}
