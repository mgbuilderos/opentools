/**
 * PDF Standard security-handler support for revisions 2, 3, 4 and 6.
 *
 * Cryptographic steps follow ISO 32000-2 section 7.6.4. The PDF rewrite is an
 * incremental update: every directly stored object is emitted again in its
 * decrypted or encrypted form, and a new cross-reference section points at
 * those copies. Object streams remain valid because their container stream is
 * transformed as one object and the preceding xref section still describes
 * the compressed members.
 */

export type PdfEncryptionAlgorithm =
  | 'RC4-40'
  | 'RC4-128'
  | 'AES-128-CBC'
  | 'AES-256-CBC'
  | 'unknown';

export type PdfPasswordKind =
  | 'none'
  | 'owner-only'
  | 'user-password'
  | 'unknown';

export type PdfCryptErrorCode =
  | 'INVALID_PDF'
  | 'MALFORMED_PDF'
  | 'NOT_ENCRYPTED'
  | 'ALREADY_ENCRYPTED'
  | 'UNSUPPORTED_ENCRYPTION'
  | 'WRONG_PASSWORD';

export class PdfCryptError extends Error {
  readonly code: PdfCryptErrorCode;

  constructor(code: PdfCryptErrorCode, message: string) {
    super(message);
    this.name = 'PdfCryptError';
    this.code = code;
  }
}

export interface PdfInspection {
  encrypted: boolean;
  revision: number | null;
  algorithm: PdfEncryptionAlgorithm | null;
  passwordKind: PdfPasswordKind;
}

export interface PdfDecryptResult {
  bytes: Uint8Array;
  revision: number;
  usedOwnerPassword: boolean;
}

export interface PdfEncryptOptions {
  userPassword: string;
  ownerPassword: string;
  /** Signed PDF permission mask. `-4` permits every operation. */
  permissions?: number;
  encryptMetadata?: boolean;
}

type CryptMethod = 'identity' | 'rc4' | 'aes128' | 'aes256';

interface IndirectObject {
  objectNumber: number;
  generation: number;
  body: Uint8Array;
}

interface ObjectReference {
  objectNumber: number;
  generation: number;
}

interface TrailerInfo {
  bytes: Uint8Array;
  startXref: number;
  size: number;
  root: ObjectReference;
  info?: ObjectReference;
  encrypt?: ObjectReference;
  directEncrypt?: Uint8Array;
  ids: Uint8Array[];
}

interface EncryptionInfo {
  revision: number;
  version: number;
  lengthBits: number;
  permissions: number;
  encryptMetadata: boolean;
  owner: Uint8Array;
  user: Uint8Array;
  ownerEncryptedKey?: Uint8Array;
  userEncryptedKey?: Uint8Array;
  perms?: Uint8Array;
  firstId: Uint8Array;
  stringMethod: CryptMethod;
  streamMethod: CryptMethod;
  encryptReference?: ObjectReference;
}

const PASSWORD_PADDING = new Uint8Array([
  0x28, 0xbf, 0x4e, 0x5e, 0x4e, 0x75, 0x8a, 0x41, 0x64, 0x00, 0x4e, 0x56, 0xff,
  0xfa, 0x01, 0x08, 0x2e, 0x2e, 0x00, 0xb6, 0xd0, 0x68, 0x3e, 0x80, 0x2f, 0x0c,
  0xa9, 0xfe, 0x64, 0x53, 0x69, 0x7a,
]);
const ZERO_IV = new Uint8Array(16);

function concatBytes(...parts: readonly Uint8Array[]): Uint8Array {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function ascii(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function binaryString(bytes: Uint8Array): string {
  let output = '';
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    output += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  }
  return output;
}

function binaryBytes(value: string): Uint8Array {
  return Uint8Array.from(value, (character) => character.charCodeAt(0) & 0xff);
}

function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index]! ^ right[index]!;
  }
  return difference === 0;
}

function toHex(bytes: Uint8Array): string {
  let output = '';
  for (const byte of bytes) output += byte.toString(16).padStart(2, '0');
  return output.toUpperCase();
}

function fromHex(value: string): Uint8Array {
  const compact = value.replaceAll(/\s/gu, '');
  if (!/^[0-9a-f]*$/iu.test(compact)) {
    throw new PdfCryptError(
      'MALFORMED_PDF',
      'A PDF hexadecimal string is malformed.',
    );
  }
  const even = compact.length % 2 === 0 ? compact : `${compact}0`;
  const output = new Uint8Array(even.length / 2);
  for (let index = 0; index < output.length; index += 1) {
    output[index] = Number.parseInt(even.slice(index * 2, index * 2 + 2), 16);
  }
  return output;
}

function randomBytes(length: number): Uint8Array {
  const output = new Uint8Array(length);
  crypto.getRandomValues(output);
  return output;
}

const MD5_SHIFTS = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5,
  9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11,
  16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15,
  21,
];
const MD5_CONSTANTS = Array.from(
  { length: 64 },
  (_, index) => Math.floor(Math.abs(Math.sin(index + 1)) * 2 ** 32) >>> 0,
);

/** Small RFC 1321 implementation because Web Crypto deliberately omits MD5. */
export function md5(message: Uint8Array): Uint8Array {
  const bitLength = message.length * 8;
  const paddedLength = (((message.length + 8) >> 6) + 1) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(message);
  padded[message.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 8, bitLength >>> 0, true);
  view.setUint32(paddedLength - 4, Math.floor(bitLength / 2 ** 32), true);

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;
  for (let chunk = 0; chunk < paddedLength; chunk += 64) {
    let a = a0;
    let b = b0;
    let c = c0;
    let d = d0;
    for (let index = 0; index < 64; index += 1) {
      let f: number;
      let g: number;
      if (index < 16) {
        f = (b & c) | (~b & d);
        g = index;
      } else if (index < 32) {
        f = (d & b) | (~d & c);
        g = (5 * index + 1) % 16;
      } else if (index < 48) {
        f = b ^ c ^ d;
        g = (3 * index + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * index) % 16;
      }
      const value =
        (a +
          f +
          MD5_CONSTANTS[index]! +
          view.getUint32(chunk + g * 4, true)) >>>
        0;
      const shift = MD5_SHIFTS[index]!;
      const rotated = (value << shift) | (value >>> (32 - shift));
      a = d;
      d = c;
      c = b;
      b = (b + rotated) >>> 0;
    }
    a0 = (a0 + a) >>> 0;
    b0 = (b0 + b) >>> 0;
    c0 = (c0 + c) >>> 0;
    d0 = (d0 + d) >>> 0;
  }

  const digest = new Uint8Array(16);
  const output = new DataView(digest.buffer);
  output.setUint32(0, a0, true);
  output.setUint32(4, b0, true);
  output.setUint32(8, c0, true);
  output.setUint32(12, d0, true);
  return digest;
}

/** RC4 is symmetric. It is retained only for legacy PDF revisions 2 and 3. */
export function rc4(key: Uint8Array, input: Uint8Array): Uint8Array {
  if (key.length === 0) {
    throw new PdfCryptError(
      'MALFORMED_PDF',
      'The PDF contains an empty RC4 key.',
    );
  }
  const state = Uint8Array.from({ length: 256 }, (_, index) => index);
  let j = 0;
  for (let i = 0; i < 256; i += 1) {
    j = (j + state[i]! + key[i % key.length]!) & 0xff;
    [state[i], state[j]] = [state[j]!, state[i]!];
  }
  const output = new Uint8Array(input.length);
  let i = 0;
  j = 0;
  for (let offset = 0; offset < input.length; offset += 1) {
    i = (i + 1) & 0xff;
    j = (j + state[i]!) & 0xff;
    [state[i], state[j]] = [state[j]!, state[i]!];
    output[offset] = input[offset]! ^ state[(state[i]! + state[j]!) & 0xff]!;
  }
  return output;
}

async function digest(
  algorithm: 'SHA-256' | 'SHA-384' | 'SHA-512',
  input: Uint8Array,
): Promise<Uint8Array> {
  return new Uint8Array(
    await crypto.subtle.digest(algorithm, input as Uint8Array<ArrayBuffer>),
  );
}

async function importAesKey(key: Uint8Array, usage: KeyUsage[]) {
  return crypto.subtle.importKey(
    'raw',
    key as Uint8Array<ArrayBuffer>,
    { name: 'AES-CBC' },
    false,
    usage,
  );
}

async function aesEncrypt(
  key: Uint8Array,
  iv: Uint8Array,
  input: Uint8Array,
): Promise<Uint8Array> {
  const imported = await importAesKey(key, ['encrypt']);
  return new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-CBC', iv: iv as Uint8Array<ArrayBuffer> },
      imported,
      input as Uint8Array<ArrayBuffer>,
    ),
  );
}

async function aesDecrypt(
  key: Uint8Array,
  iv: Uint8Array,
  input: Uint8Array,
): Promise<Uint8Array> {
  const imported = await importAesKey(key, ['decrypt']);
  return new Uint8Array(
    await crypto.subtle.decrypt(
      { name: 'AES-CBC', iv: iv as Uint8Array<ArrayBuffer> },
      imported,
      input as Uint8Array<ArrayBuffer>,
    ),
  );
}

async function aesEncryptNoPadding(
  key: Uint8Array,
  iv: Uint8Array,
  input: Uint8Array,
): Promise<Uint8Array> {
  if (input.length % 16 !== 0) {
    throw new PdfCryptError('MALFORMED_PDF', 'AES input is not block aligned.');
  }
  return (await aesEncrypt(key, iv, input)).slice(0, input.length);
}

async function aesDecryptNoPadding(
  key: Uint8Array,
  iv: Uint8Array,
  input: Uint8Array,
): Promise<Uint8Array> {
  if (input.length === 0 || input.length % 16 !== 0) {
    throw new PdfCryptError('MALFORMED_PDF', 'AES input is not block aligned.');
  }
  // Web Crypto always adds/removes PKCS#7 padding. Append an encrypted padding
  // block so it can safely decrypt the preceding unpadded PDF blocks.
  const padding = new Uint8Array(16).fill(16);
  const paddingIv = input.slice(-16);
  const paddingCipher = (await aesEncrypt(key, paddingIv, padding)).slice(
    0,
    16,
  );
  return aesDecrypt(key, iv, concatBytes(input, paddingCipher));
}

function legacyPasswordBytes(password: string): Uint8Array {
  return Uint8Array.from(
    password,
    (character) => character.charCodeAt(0) & 0xff,
  );
}

function padLegacyPassword(password: string): Uint8Array {
  const bytes = legacyPasswordBytes(password);
  if (bytes.length >= 32) return bytes.slice(0, 32);
  return concatBytes(bytes, PASSWORD_PADDING.slice(0, 32 - bytes.length));
}

function modernPasswordBytes(password: string): Uint8Array {
  return new TextEncoder().encode(password.normalize('NFKC')).slice(0, 127);
}

function permissionsBytes(permissions: number): Uint8Array {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setInt32(0, permissions, true);
  return bytes;
}

function deriveLegacyFileKey(
  encryption: EncryptionInfo,
  paddedUserPassword: Uint8Array,
): Uint8Array {
  const length = encryption.revision === 2 ? 5 : encryption.lengthBits / 8;
  const additions = encryption.encryptMetadata
    ? []
    : [new Uint8Array([0xff, 0xff, 0xff, 0xff])];
  let key = md5(
    concatBytes(
      paddedUserPassword,
      encryption.owner.slice(0, 32),
      permissionsBytes(encryption.permissions),
      encryption.firstId,
      ...additions,
    ),
  );
  if (encryption.revision >= 3) {
    for (let round = 0; round < 50; round += 1) {
      key = md5(key.slice(0, length));
    }
  }
  return key.slice(0, length);
}

function legacyUserEntryMatches(
  encryption: EncryptionInfo,
  fileKey: Uint8Array,
): boolean {
  if (encryption.revision === 2) {
    return bytesEqual(
      rc4(fileKey, PASSWORD_PADDING),
      encryption.user.slice(0, 32),
    );
  }
  let value = rc4(
    fileKey,
    md5(concatBytes(PASSWORD_PADDING, encryption.firstId)),
  );
  for (let round = 1; round <= 19; round += 1) {
    value = rc4(
      fileKey.map((byte) => byte ^ round),
      value,
    );
  }
  return bytesEqual(value.slice(0, 16), encryption.user.slice(0, 16));
}

function recoverLegacyUserPassword(
  encryption: EncryptionInfo,
  ownerPassword: string,
): Uint8Array {
  const length = encryption.revision === 2 ? 5 : encryption.lengthBits / 8;
  let key = md5(padLegacyPassword(ownerPassword));
  if (encryption.revision >= 3) {
    for (let round = 0; round < 50; round += 1) key = md5(key);
  }
  key = key.slice(0, length);
  let value: Uint8Array = encryption.owner.slice(0, 32);
  if (encryption.revision === 2) return rc4(key, value);
  for (let round = 19; round >= 0; round -= 1) {
    value = rc4(
      key.map((byte) => byte ^ round),
      value,
    );
  }
  return value;
}

async function revision6Hash(
  password: Uint8Array,
  salt: Uint8Array,
  userEntry?: Uint8Array,
): Promise<Uint8Array> {
  const user = userEntry ?? new Uint8Array(0);
  let key = await digest('SHA-256', concatBytes(password, salt, user));
  let encrypted: Uint8Array = new Uint8Array([0]);
  let round = 0;
  while (round < 64 || encrypted[encrypted.length - 1]! > round - 32) {
    const block = concatBytes(password, key, user);
    const repeated = new Uint8Array(block.length * 64);
    for (let copy = 0; copy < 64; copy += 1)
      repeated.set(block, copy * block.length);
    encrypted = await aesEncryptNoPadding(
      key.slice(0, 16),
      key.slice(16, 32),
      repeated,
    );
    const selector =
      encrypted.slice(0, 16).reduce((sum, byte) => sum + byte, 0) % 3;
    key = await digest(
      selector === 0 ? 'SHA-256' : selector === 1 ? 'SHA-384' : 'SHA-512',
      encrypted,
    );
    round += 1;
  }
  return key.slice(0, 32);
}

async function revision5Hash(
  password: Uint8Array,
  salt: Uint8Array,
  userEntry?: Uint8Array,
): Promise<Uint8Array> {
  return digest(
    'SHA-256',
    concatBytes(password, salt, userEntry ?? new Uint8Array(0)),
  );
}

async function modernHash(
  revision: number,
  password: Uint8Array,
  salt: Uint8Array,
  userEntry?: Uint8Array,
): Promise<Uint8Array> {
  return revision === 5
    ? revision5Hash(password, salt, userEntry)
    : revision6Hash(password, salt, userEntry);
}

async function validatePerms(
  encryption: EncryptionInfo,
  fileKey: Uint8Array,
): Promise<boolean> {
  if (!encryption.perms || encryption.perms.length !== 16) return true;
  try {
    const plain = await aesDecryptNoPadding(fileKey, ZERO_IV, encryption.perms);
    return (
      plain[9] === 0x61 &&
      plain[10] === 0x64 &&
      plain[11] === 0x62 &&
      (plain[8] === 0x54) === encryption.encryptMetadata
    );
  } catch {
    return false;
  }
}

async function authenticatePassword(
  encryption: EncryptionInfo,
  password: string,
): Promise<{ fileKey: Uint8Array; usedOwnerPassword: boolean } | undefined> {
  if (encryption.revision >= 2 && encryption.revision <= 4) {
    const userKey = deriveLegacyFileKey(
      encryption,
      padLegacyPassword(password),
    );
    if (legacyUserEntryMatches(encryption, userKey)) {
      return { fileKey: userKey, usedOwnerPassword: false };
    }
    const recovered = recoverLegacyUserPassword(encryption, password);
    const ownerKey = deriveLegacyFileKey(encryption, recovered);
    if (legacyUserEntryMatches(encryption, ownerKey)) {
      return { fileKey: ownerKey, usedOwnerPassword: true };
    }
    return undefined;
  }

  if (encryption.revision !== 5 && encryption.revision !== 6) return undefined;
  if (
    encryption.user.length < 48 ||
    encryption.owner.length < 48 ||
    encryption.userEncryptedKey?.length !== 32 ||
    encryption.ownerEncryptedKey?.length !== 32
  ) {
    throw new PdfCryptError(
      'MALFORMED_PDF',
      'The AES-256 encryption dictionary is incomplete.',
    );
  }
  const supplied = modernPasswordBytes(password);
  const userValidation = await modernHash(
    encryption.revision,
    supplied,
    encryption.user.slice(32, 40),
  );
  if (bytesEqual(userValidation, encryption.user.slice(0, 32))) {
    const key = await modernHash(
      encryption.revision,
      supplied,
      encryption.user.slice(40, 48),
    );
    const fileKey = await aesDecryptNoPadding(
      key,
      ZERO_IV,
      encryption.userEncryptedKey,
    );
    if (await validatePerms(encryption, fileKey)) {
      return { fileKey, usedOwnerPassword: false };
    }
  }

  const ownerValidation = await modernHash(
    encryption.revision,
    supplied,
    encryption.owner.slice(32, 40),
    encryption.user.slice(0, 48),
  );
  if (bytesEqual(ownerValidation, encryption.owner.slice(0, 32))) {
    const key = await modernHash(
      encryption.revision,
      supplied,
      encryption.owner.slice(40, 48),
      encryption.user.slice(0, 48),
    );
    const fileKey = await aesDecryptNoPadding(
      key,
      ZERO_IV,
      encryption.ownerEncryptedKey,
    );
    if (await validatePerms(encryption, fileKey)) {
      return { fileKey, usedOwnerPassword: true };
    }
  }
  return undefined;
}

function findDictionaryEnd(input: string, start: number): number {
  if (input.slice(start, start + 2) !== '<<') return -1;
  let depth = 0;
  let literalDepth = 0;
  let escaped = false;
  for (let index = start; index < input.length - 1; index += 1) {
    const character = input[index]!;
    if (literalDepth > 0) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '(') literalDepth += 1;
      else if (character === ')') literalDepth -= 1;
      continue;
    }
    if (character === '(') {
      literalDepth = 1;
      continue;
    }
    if (input.slice(index, index + 2) === '<<') {
      depth += 1;
      index += 1;
    } else if (input.slice(index, index + 2) === '>>') {
      depth -= 1;
      index += 1;
      if (depth === 0) return index + 1;
    }
  }
  return -1;
}

function readReference(
  dictionary: string,
  key: string,
): ObjectReference | undefined {
  const match = new RegExp(`/${key}\\s+(\\d+)\\s+(\\d+)\\s+R\\b`, 'u').exec(
    dictionary,
  );
  return match
    ? { objectNumber: Number(match[1]), generation: Number(match[2]) }
    : undefined;
}

function readNumber(dictionary: string, key: string): number | undefined {
  const match = new RegExp(`/${key}\\s+(-?\\d+)\\b`, 'u').exec(dictionary);
  return match ? Number(match[1]) : undefined;
}

function readBoolean(dictionary: string, key: string): boolean | undefined {
  const match = new RegExp(`/${key}\\s+(true|false)\\b`, 'u').exec(dictionary);
  return match ? match[1] === 'true' : undefined;
}

function readName(dictionary: string, key: string): string | undefined {
  const match = new RegExp(`/${key}\\s*/([^\\s<>{}\\[\\]()%/]+)`, 'u').exec(
    dictionary,
  );
  return match?.[1];
}

function readHex(dictionary: string, key: string): Uint8Array | undefined {
  const match = new RegExp(`/${key}\\s*<([0-9A-Fa-f\\s]+)>`, 'u').exec(
    dictionary,
  );
  return match ? fromHex(match[1]!) : undefined;
}

function parseObjects(bytes: Uint8Array): IndirectObject[] {
  const input = binaryString(bytes);
  const header = /(?:^|[\r\n])(\d+)\s+(\d+)\s+obj\b/gu;
  const objects: IndirectObject[] = [];
  let match: RegExpExecArray | null;
  while ((match = header.exec(input))) {
    const headerText = match[0]!;
    const bodyStart = match.index + headerText.length;
    let end = input.indexOf('endobj', bodyStart);
    if (end < 0) {
      throw new PdfCryptError(
        'MALFORMED_PDF',
        'An indirect PDF object is truncated.',
      );
    }
    const stream = /\bstream(?:\r\n|\n|\r)/u.exec(input.slice(bodyStart, end));
    if (stream) {
      const streamStart = bodyStart + stream.index + stream[0].length;
      const prefix = input.slice(bodyStart, streamStart);
      const lengthMatches = [...prefix.matchAll(/\/Length\s+(\d+)\b/gu)];
      const declared = lengthMatches.at(-1)?.[1];
      if (declared) {
        const streamEnd = streamStart + Number(declared);
        if (streamEnd > input.length) {
          throw new PdfCryptError(
            'MALFORMED_PDF',
            'A PDF stream length extends beyond the file.',
          );
        }
        const endStream = input.indexOf('endstream', streamEnd);
        if (endStream < streamEnd || endStream - streamEnd > 2) {
          throw new PdfCryptError(
            'MALFORMED_PDF',
            'A PDF stream does not match its declared length.',
          );
        }
        end = input.indexOf('endobj', endStream + 9);
      } else {
        const endStream = input.indexOf('endstream', streamStart);
        if (endStream < 0) {
          throw new PdfCryptError(
            'MALFORMED_PDF',
            'A PDF stream is truncated.',
          );
        }
        end = input.indexOf('endobj', endStream + 9);
      }
      if (end < 0) {
        throw new PdfCryptError(
          'MALFORMED_PDF',
          'A streamed PDF object is truncated.',
        );
      }
    }
    objects.push({
      objectNumber: Number(match[1]),
      generation: Number(match[2]),
      body: bytes.slice(bodyStart, end),
    });
    header.lastIndex = end + 6;
  }
  if (objects.length === 0) {
    throw new PdfCryptError(
      'MALFORMED_PDF',
      'The PDF contains no indirect objects.',
    );
  }
  return objects;
}

function latestTrailer(
  bytes: Uint8Array,
  objects: readonly IndirectObject[],
): TrailerInfo {
  const input = binaryString(bytes);
  if (!input.startsWith('%PDF-')) {
    throw new PdfCryptError('INVALID_PDF', 'The input is not a PDF file.');
  }
  const starts = [...input.matchAll(/startxref\s+(\d+)\s+%%EOF/gu)];
  const latest = starts.at(-1);
  if (!latest) {
    throw new PdfCryptError(
      'MALFORMED_PDF',
      'The PDF has no final cross-reference pointer.',
    );
  }
  const startXref = Number(latest[1]);
  let dictionary = '';
  if (input.slice(startXref, startXref + 4) === 'xref') {
    const trailerPosition = input.indexOf('trailer', startXref);
    if (trailerPosition < 0 || trailerPosition > latest.index!) {
      throw new PdfCryptError('MALFORMED_PDF', 'The PDF trailer is missing.');
    }
    const dictionaryStart = input.indexOf('<<', trailerPosition + 7);
    const dictionaryEnd = findDictionaryEnd(input, dictionaryStart);
    if (dictionaryStart < 0 || dictionaryEnd < 0) {
      throw new PdfCryptError(
        'MALFORMED_PDF',
        'The PDF trailer dictionary is malformed.',
      );
    }
    dictionary = input.slice(dictionaryStart, dictionaryEnd);
  } else {
    const xrefObject = objects.find((object) => {
      const header = `${object.objectNumber} ${object.generation} obj`;
      return input.slice(startXref, startXref + header.length) === header;
    });
    if (!xrefObject) {
      throw new PdfCryptError(
        'MALFORMED_PDF',
        'The PDF xref stream cannot be located.',
      );
    }
    const body = binaryString(xrefObject.body);
    const dictionaryEnd = findDictionaryEnd(body, body.indexOf('<<'));
    if (dictionaryEnd < 0) {
      throw new PdfCryptError(
        'MALFORMED_PDF',
        'The PDF xref dictionary is malformed.',
      );
    }
    dictionary = body.slice(body.indexOf('<<'), dictionaryEnd);
  }

  const root = readReference(dictionary, 'Root');
  const size = readNumber(dictionary, 'Size');
  if (!root || size === undefined) {
    throw new PdfCryptError(
      'MALFORMED_PDF',
      'The PDF trailer lacks Root or Size.',
    );
  }
  const encryptPosition = dictionary.search(/\/Encrypt\b/u);
  let directEncrypt: Uint8Array | undefined;
  const encrypt = readReference(dictionary, 'Encrypt');
  if (encryptPosition >= 0 && !encrypt && /\/Encrypt\s*<</u.test(dictionary)) {
    const dictionaryStart = dictionary.indexOf('<<', encryptPosition);
    const dictionaryEnd = findDictionaryEnd(dictionary, dictionaryStart);
    if (dictionaryStart < 0 || dictionaryEnd < 0) {
      throw new PdfCryptError(
        'MALFORMED_PDF',
        'The encryption dictionary is malformed.',
      );
    }
    directEncrypt = binaryBytes(
      dictionary.slice(dictionaryStart, dictionaryEnd),
    );
  }
  const idMatch = /\/ID\s*\[\s*<([0-9A-Fa-f\s]+)>\s*<([0-9A-Fa-f\s]+)>/u.exec(
    dictionary,
  );
  const ids = idMatch ? [fromHex(idMatch[1]!), fromHex(idMatch[2]!)] : [];
  return {
    bytes: binaryBytes(dictionary),
    startXref,
    size,
    root,
    info: readReference(dictionary, 'Info'),
    encrypt,
    directEncrypt,
    ids,
  };
}

function cryptFilterMethod(
  dictionary: string,
  filterName: string | undefined,
  revision: number,
): CryptMethod {
  if (filterName === 'Identity') return 'identity';
  if (revision <= 3) return 'rc4';
  if (revision >= 5) return 'aes256';
  const selected = filterName ?? 'StdCF';
  const escaped = selected.replaceAll(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const filter = new RegExp(
    `/${escaped}\\s*<<[\\s\\S]*?/CFM\\s*/(V2|AESV2|AESV3|None)\\b`,
    'u',
  ).exec(dictionary)?.[1];
  if (filter === 'AESV2') return 'aes128';
  if (filter === 'AESV3') return 'aes256';
  if (filter === 'None') return 'identity';
  return 'rc4';
}

function encryptionInfo(
  trailer: TrailerInfo,
  objects: readonly IndirectObject[],
): EncryptionInfo | undefined {
  let bytes = trailer.directEncrypt;
  if (!bytes && trailer.encrypt) {
    bytes = objects.find(
      (object) =>
        object.objectNumber === trailer.encrypt!.objectNumber &&
        object.generation === trailer.encrypt!.generation,
    )?.body;
  }
  if (!bytes) return undefined;
  const dictionary = binaryString(bytes);
  if (readName(dictionary, 'Filter') !== 'Standard') {
    throw new PdfCryptError(
      'UNSUPPORTED_ENCRYPTION',
      'Only the PDF Standard security handler is supported.',
    );
  }
  const revision = readNumber(dictionary, 'R');
  const owner = readHex(dictionary, 'O');
  const user = readHex(dictionary, 'U');
  const permissions = readNumber(dictionary, 'P');
  if (revision === undefined || !owner || !user || permissions === undefined) {
    throw new PdfCryptError(
      'MALFORMED_PDF',
      'The encryption dictionary is incomplete.',
    );
  }
  const version = readNumber(dictionary, 'V') ?? 0;
  const lengthBits =
    readNumber(dictionary, 'Length') ??
    (revision === 2 ? 40 : revision >= 5 ? 256 : 128);
  const stringFilter = readName(dictionary, 'StrF');
  const streamFilter = readName(dictionary, 'StmF');
  return {
    revision,
    version,
    lengthBits,
    permissions,
    encryptMetadata: readBoolean(dictionary, 'EncryptMetadata') ?? true,
    owner,
    user,
    ownerEncryptedKey: readHex(dictionary, 'OE'),
    userEncryptedKey: readHex(dictionary, 'UE'),
    perms: readHex(dictionary, 'Perms'),
    firstId: trailer.ids[0] ?? new Uint8Array(0),
    stringMethod: cryptFilterMethod(dictionary, stringFilter, revision),
    streamMethod: cryptFilterMethod(dictionary, streamFilter, revision),
    encryptReference: trailer.encrypt,
  };
}

function algorithmFor(encryption: EncryptionInfo): PdfEncryptionAlgorithm {
  const methods = [encryption.stringMethod, encryption.streamMethod];
  if (methods.includes('aes256')) return 'AES-256-CBC';
  if (methods.includes('aes128')) return 'AES-128-CBC';
  if (methods.includes('rc4')) {
    return encryption.lengthBits <= 40 ? 'RC4-40' : 'RC4-128';
  }
  return 'unknown';
}

function objectKey(
  fileKey: Uint8Array,
  objectNumber: number,
  generation: number,
  method: CryptMethod,
): Uint8Array {
  if (method === 'aes256') return fileKey;
  const suffix = new Uint8Array(method === 'aes128' ? 9 : 5);
  suffix[0] = objectNumber & 0xff;
  suffix[1] = (objectNumber >>> 8) & 0xff;
  suffix[2] = (objectNumber >>> 16) & 0xff;
  suffix[3] = generation & 0xff;
  suffix[4] = (generation >>> 8) & 0xff;
  if (method === 'aes128') suffix.set([0x73, 0x41, 0x6c, 0x54], 5);
  return md5(concatBytes(fileKey, suffix)).slice(
    0,
    Math.min(fileKey.length + 5, 16),
  );
}

async function cryptObjectBytes(
  mode: 'encrypt' | 'decrypt',
  input: Uint8Array,
  fileKey: Uint8Array,
  objectNumber: number,
  generation: number,
  method: CryptMethod,
): Promise<Uint8Array> {
  if (method === 'identity') return input;
  const key = objectKey(fileKey, objectNumber, generation, method);
  if (method === 'rc4') return rc4(key, input);
  if (mode === 'encrypt') {
    const iv = randomBytes(16);
    return concatBytes(iv, await aesEncrypt(key, iv, input));
  }
  if (input.length < 32 || (input.length - 16) % 16 !== 0) {
    throw new PdfCryptError(
      'MALFORMED_PDF',
      'An encrypted AES object is truncated.',
    );
  }
  try {
    return await aesDecrypt(key, input.slice(0, 16), input.slice(16));
  } catch {
    throw new PdfCryptError(
      'MALFORMED_PDF',
      'An encrypted AES object is corrupt.',
    );
  }
}

function parseLiteral(
  input: Uint8Array,
  start: number,
): { bytes: Uint8Array; end: number } {
  const output: number[] = [];
  let depth = 1;
  for (let index = start + 1; index < input.length; index += 1) {
    const byte = input[index]!;
    if (byte === 0x5c) {
      const next = input[index + 1];
      if (next === undefined) break;
      if (next === 0x0d || next === 0x0a) {
        index += next === 0x0d && input[index + 2] === 0x0a ? 2 : 1;
        continue;
      }
      const escapes: Record<number, number> = {
        0x6e: 0x0a,
        0x72: 0x0d,
        0x74: 0x09,
        0x62: 0x08,
        0x66: 0x0c,
      };
      if (escapes[next] !== undefined) {
        output.push(escapes[next]);
        index += 1;
        continue;
      }
      if (next >= 0x30 && next <= 0x37) {
        let octal = String.fromCharCode(next);
        let consumed = 1;
        while (
          consumed < 3 &&
          input[index + 1 + consumed] !== undefined &&
          input[index + 1 + consumed]! >= 0x30 &&
          input[index + 1 + consumed]! <= 0x37
        ) {
          octal += String.fromCharCode(input[index + 1 + consumed]!);
          consumed += 1;
        }
        output.push(Number.parseInt(octal, 8) & 0xff);
        index += consumed;
        continue;
      }
      output.push(next);
      index += 1;
      continue;
    }
    if (byte === 0x28) {
      depth += 1;
      output.push(byte);
    } else if (byte === 0x29) {
      depth -= 1;
      if (depth === 0)
        return { bytes: Uint8Array.from(output), end: index + 1 };
      output.push(byte);
    } else {
      output.push(byte);
    }
  }
  throw new PdfCryptError(
    'MALFORMED_PDF',
    'A PDF literal string is unterminated.',
  );
}

async function transformStrings(
  input: Uint8Array,
  transform: (value: Uint8Array) => Promise<Uint8Array>,
): Promise<Uint8Array> {
  const parts: Uint8Array[] = [];
  let plainStart = 0;
  for (let index = 0; index < input.length; index += 1) {
    const byte = input[index]!;
    if (byte === 0x25) {
      while (index < input.length && ![0x0a, 0x0d].includes(input[index]!))
        index += 1;
      continue;
    }
    if (byte === 0x28) {
      parts.push(input.slice(plainStart, index));
      const literal = parseLiteral(input, index);
      parts.push(ascii(`<${toHex(await transform(literal.bytes))}>`));
      index = literal.end - 1;
      plainStart = literal.end;
      continue;
    }
    if (byte === 0x3c && input[index + 1] === 0x3c) {
      index += 1;
      continue;
    }
    if (byte === 0x3c && input[index + 1] !== 0x3c) {
      let end = index + 1;
      while (end < input.length && input[end] !== 0x3e) end += 1;
      if (end >= input.length) {
        throw new PdfCryptError(
          'MALFORMED_PDF',
          'A PDF hexadecimal string is unterminated.',
        );
      }
      parts.push(input.slice(plainStart, index));
      const value = fromHex(binaryString(input.slice(index + 1, end)));
      parts.push(ascii(`<${toHex(await transform(value))}>`));
      index = end;
      plainStart = end + 1;
    }
  }
  parts.push(input.slice(plainStart));
  return concatBytes(...parts);
}

function streamParts(
  body: Uint8Array,
): { prefix: Uint8Array; stream: Uint8Array; suffix: Uint8Array } | undefined {
  const text = binaryString(body);
  const match = /\bstream(?:\r\n|\n|\r)/u.exec(text);
  if (!match) return undefined;
  const dataStart = match.index + match[0].length;
  const prefixText = text.slice(0, dataStart);
  const lengthMatches = [...prefixText.matchAll(/\/Length\s+(\d+)\b/gu)];
  const directLength = lengthMatches.at(-1)?.[1];
  let dataEnd: number;
  if (directLength) {
    dataEnd = dataStart + Number(directLength);
    if (dataEnd > body.length) {
      throw new PdfCryptError(
        'MALFORMED_PDF',
        'A PDF stream length extends beyond its object.',
      );
    }
    const tail = text.slice(dataEnd, dataEnd + 11);
    if (!/^(?:\r\n|\n|\r)?endstream/u.test(tail)) {
      throw new PdfCryptError(
        'MALFORMED_PDF',
        'A PDF stream length is inconsistent.',
      );
    }
  } else {
    const endStream = text.indexOf('endstream', dataStart);
    if (endStream < 0)
      throw new PdfCryptError('MALFORMED_PDF', 'A PDF stream is truncated.');
    dataEnd = endStream;
    if (text[dataEnd - 1] === '\n')
      dataEnd -= text[dataEnd - 2] === '\r' ? 2 : 1;
    else if (text[dataEnd - 1] === '\r') dataEnd -= 1;
  }
  return {
    prefix: body.slice(0, dataStart),
    stream: body.slice(dataStart, dataEnd),
    suffix: body.slice(dataEnd),
  };
}

function replaceStreamLength(prefix: Uint8Array, length: number): Uint8Array {
  const text = binaryString(prefix);
  const matches = [...text.matchAll(/\/Length\s+(?:\d+\s+\d+\s+R|\d+)/gu)];
  const latest = matches.at(-1);
  if (!latest || latest.index === undefined) {
    throw new PdfCryptError(
      'MALFORMED_PDF',
      'A PDF stream has no Length entry.',
    );
  }
  const start = latest.index;
  const end = start + latest[0].length;
  return binaryBytes(
    `${text.slice(0, start)}/Length ${length}${text.slice(end)}`,
  );
}

async function transformObject(
  object: IndirectObject,
  mode: 'encrypt' | 'decrypt',
  fileKey: Uint8Array,
  stringMethod: CryptMethod,
  streamMethod: CryptMethod,
  encryptMetadata: boolean,
): Promise<Uint8Array> {
  const initialText = binaryString(object.body);
  if (/\/Type\s*\/XRef\b/u.test(initialText)) return object.body;
  const transformString = (value: Uint8Array) =>
    cryptObjectBytes(
      mode,
      value,
      fileKey,
      object.objectNumber,
      object.generation,
      stringMethod,
    );
  const parts = streamParts(object.body);
  if (!parts) return transformStrings(object.body, transformString);

  const metadata = /\/Type\s*\/Metadata\b/u.test(binaryString(parts.prefix));
  const transformedStream =
    metadata && !encryptMetadata
      ? parts.stream
      : await cryptObjectBytes(
          mode,
          parts.stream,
          fileKey,
          object.objectNumber,
          object.generation,
          streamMethod,
        );
  const prefix = await transformStrings(
    replaceStreamLength(parts.prefix, transformedStream.length),
    transformString,
  );
  return concatBytes(prefix, transformedStream, parts.suffix);
}

function groupedEntries(entries: readonly [number, number, number][]): string {
  let output = '0 1\n0000000000 65535 f \n';
  let index = 0;
  while (index < entries.length) {
    const start = entries[index]![0];
    let end = index + 1;
    while (
      end < entries.length &&
      entries[end]![0] === entries[end - 1]![0] + 1
    ) {
      end += 1;
    }
    output += `${start} ${end - index}\n`;
    for (const [, generation, offset] of entries.slice(index, end)) {
      output += `${String(offset).padStart(10, '0')} ${String(generation).padStart(5, '0')} n \n`;
    }
    index = end;
  }
  return output;
}

function appendIncrementalUpdate(
  original: Uint8Array,
  trailer: TrailerInfo,
  objects: readonly IndirectObject[],
  options: {
    encryptObject?: IndirectObject;
    ids?: readonly Uint8Array[];
  } = {},
): Uint8Array {
  const parts: Uint8Array[] = [
    original,
    ascii('\n% OpenTools format rewrite\n'),
  ];
  let offset = parts[0]!.length + parts[1]!.length;
  const entries: [number, number, number][] = [];
  const allObjects = options.encryptObject
    ? [...objects, options.encryptObject]
    : [...objects];
  for (const object of allObjects.sort(
    (left, right) => left.objectNumber - right.objectNumber,
  )) {
    const header = ascii(`${object.objectNumber} ${object.generation} obj\n`);
    const footer = ascii('\nendobj\n');
    entries.push([object.objectNumber, object.generation, offset]);
    parts.push(header, object.body, footer);
    offset += header.length + object.body.length + footer.length;
  }
  const xrefOffset = offset;
  const xref = ascii(`xref\n${groupedEntries(entries)}`);
  parts.push(xref);
  offset += xref.length;
  const maxObject = Math.max(...entries.map(([objectNumber]) => objectNumber));
  const ids = options.ids ?? trailer.ids;
  const idEntry =
    ids.length >= 2 ? ` /ID [<${toHex(ids[0]!)}><${toHex(ids[1]!)}>]` : '';
  const infoEntry = trailer.info
    ? ` /Info ${trailer.info.objectNumber} ${trailer.info.generation} R`
    : '';
  const encryptEntry = options.encryptObject
    ? ` /Encrypt ${options.encryptObject.objectNumber} ${options.encryptObject.generation} R`
    : trailer.encrypt || trailer.directEncrypt
      ? ' /Encrypt null'
      : '';
  const trailerText =
    `trailer\n<< /Size ${Math.max(trailer.size, maxObject + 1)}` +
    ` /Root ${trailer.root.objectNumber} ${trailer.root.generation} R` +
    `${infoEntry}${encryptEntry}${idEntry} /Prev ${trailer.startXref} >>\n` +
    `startxref\n${xrefOffset}\n%%EOF\n`;
  parts.push(ascii(trailerText));
  return concatBytes(...parts);
}

function stripEncryptionFromTrailer(
  bytes: Uint8Array,
  trailer: TrailerInfo,
): Uint8Array {
  if (!trailer.encrypt && !trailer.directEncrypt) return bytes;
  const input = binaryString(bytes);
  const dictionary = binaryString(trailer.bytes);
  const dictionaryOffset = input.lastIndexOf(dictionary);
  if (dictionaryOffset < 0) {
    throw new PdfCryptError(
      'MALFORMED_PDF',
      'The encryption trailer cannot be located.',
    );
  }
  const encryptOffset = dictionary.indexOf('/Encrypt');
  if (encryptOffset < 0) return bytes;
  let end: number;
  const afterKey = encryptOffset + '/Encrypt'.length;
  const directStart = dictionary.indexOf('<<', afterKey);
  if (trailer.directEncrypt && directStart >= 0) {
    end = findDictionaryEnd(dictionary, directStart);
  } else {
    const reference = /\/Encrypt\s+\d+\s+\d+\s+R\b/u.exec(
      dictionary.slice(encryptOffset),
    );
    if (!reference) {
      throw new PdfCryptError(
        'MALFORMED_PDF',
        'The encryption trailer is malformed.',
      );
    }
    end = encryptOffset + reference[0].length;
  }
  if (end < 0) {
    throw new PdfCryptError(
      'MALFORMED_PDF',
      'The encryption trailer is malformed.',
    );
  }
  const output = bytes.slice();
  output.fill(0x20, dictionaryOffset + encryptOffset, dictionaryOffset + end);
  return output;
}

async function parsePdf(bytes: Uint8Array) {
  const parsedObjects = parseObjects(bytes);
  const trailer = latestTrailer(bytes, parsedObjects);
  const latestObjects = new Map<string, IndirectObject>();
  for (const object of parsedObjects) {
    latestObjects.set(`${object.objectNumber}:${object.generation}`, object);
  }
  const objects = [...latestObjects.values()];
  return { objects, trailer, encryption: encryptionInfo(trailer, objects) };
}

export async function inspect(bytes: Uint8Array): Promise<PdfInspection> {
  const { encryption } = await parsePdf(bytes);
  if (!encryption) {
    return {
      encrypted: false,
      revision: null,
      algorithm: null,
      passwordKind: 'none',
    };
  }
  let passwordKind: PdfPasswordKind = 'unknown';
  try {
    const opened = await authenticatePassword(encryption, '');
    passwordKind =
      opened && !opened.usedOwnerPassword ? 'owner-only' : 'user-password';
  } catch {
    passwordKind = 'unknown';
  }
  return {
    encrypted: true,
    revision: encryption.revision,
    algorithm: algorithmFor(encryption),
    passwordKind,
  };
}

export async function decrypt(
  bytes: Uint8Array,
  password: string,
): Promise<PdfDecryptResult> {
  const { objects, trailer, encryption } = await parsePdf(bytes);
  if (!encryption) {
    throw new PdfCryptError('NOT_ENCRYPTED', 'This PDF is not encrypted.');
  }
  if (![2, 3, 4, 5, 6].includes(encryption.revision)) {
    throw new PdfCryptError(
      'UNSUPPORTED_ENCRYPTION',
      `PDF security-handler revision ${encryption.revision} is not supported.`,
    );
  }
  const authentication = await authenticatePassword(encryption, password);
  if (!authentication) {
    throw new PdfCryptError('WRONG_PASSWORD', 'The PDF password is incorrect.');
  }
  const transformed: IndirectObject[] = [];
  for (const object of objects) {
    if (
      encryption.encryptReference &&
      object.objectNumber === encryption.encryptReference.objectNumber &&
      object.generation === encryption.encryptReference.generation
    ) {
      continue;
    }
    if (/\/Type\s*\/XRef\b/u.test(binaryString(object.body))) continue;
    transformed.push({
      ...object,
      body: await transformObject(
        object,
        'decrypt',
        authentication.fileKey,
        encryption.stringMethod,
        encryption.streamMethod,
        encryption.encryptMetadata,
      ),
    });
  }
  return {
    bytes: appendIncrementalUpdate(
      stripEncryptionFromTrailer(bytes, trailer),
      trailer,
      transformed,
    ),
    revision: encryption.revision,
    usedOwnerPassword: authentication.usedOwnerPassword,
  };
}

async function revision6Entries(options: PdfEncryptOptions) {
  const fileKey = randomBytes(32);
  const userPassword = modernPasswordBytes(options.userPassword);
  const ownerPassword = modernPasswordBytes(
    options.ownerPassword || options.userPassword,
  );
  const userValidationSalt = randomBytes(8);
  const userKeySalt = randomBytes(8);
  const user = concatBytes(
    await revision6Hash(userPassword, userValidationSalt),
    userValidationSalt,
    userKeySalt,
  );
  const userKey = await revision6Hash(userPassword, userKeySalt);
  const ue = await aesEncryptNoPadding(userKey, ZERO_IV, fileKey);

  const ownerValidationSalt = randomBytes(8);
  const ownerKeySalt = randomBytes(8);
  const owner = concatBytes(
    await revision6Hash(ownerPassword, ownerValidationSalt, user),
    ownerValidationSalt,
    ownerKeySalt,
  );
  const ownerKey = await revision6Hash(ownerPassword, ownerKeySalt, user);
  const oe = await aesEncryptNoPadding(ownerKey, ZERO_IV, fileKey);
  const permissions = options.permissions ?? -4;
  const permissionBlock = new Uint8Array(16);
  new DataView(permissionBlock.buffer).setInt32(0, permissions, true);
  permissionBlock.set([0xff, 0xff, 0xff, 0xff], 4);
  permissionBlock[8] = options.encryptMetadata === false ? 0x46 : 0x54;
  permissionBlock.set([0x61, 0x64, 0x62], 9);
  permissionBlock.set(randomBytes(4), 12);
  const perms = await aesEncryptNoPadding(fileKey, ZERO_IV, permissionBlock);
  return { fileKey, user, owner, ue, oe, perms, permissions };
}

export async function encrypt(
  bytes: Uint8Array,
  options: PdfEncryptOptions,
): Promise<Uint8Array> {
  const { objects, trailer, encryption } = await parsePdf(bytes);
  if (encryption) {
    throw new PdfCryptError(
      'ALREADY_ENCRYPTED',
      'This PDF is already encrypted.',
    );
  }
  const entries = await revision6Entries(options);
  const transformed: IndirectObject[] = [];
  for (const object of objects) {
    if (/\/Type\s*\/XRef\b/u.test(binaryString(object.body))) continue;
    transformed.push({
      ...object,
      body: await transformObject(
        object,
        'encrypt',
        entries.fileKey,
        'aes256',
        'aes256',
        options.encryptMetadata !== false,
      ),
    });
  }
  const encryptObjectNumber = Math.max(
    trailer.size,
    ...objects.map((object) => object.objectNumber + 1),
  );
  const dictionary =
    `<< /Filter /Standard /V 5 /Length 256 /R 6` +
    ` /O <${toHex(entries.owner)}> /U <${toHex(entries.user)}>` +
    ` /OE <${toHex(entries.oe)}> /UE <${toHex(entries.ue)}>` +
    ` /P ${entries.permissions} /Perms <${toHex(entries.perms)}>` +
    ` /EncryptMetadata ${options.encryptMetadata === false ? 'false' : 'true'}` +
    ` /CF << /StdCF << /AuthEvent /DocOpen /CFM /AESV3 /Length 32 >> >>` +
    ` /StmF /StdCF /StrF /StdCF >>`;
  const ids =
    trailer.ids.length >= 2 ? trailer.ids : [randomBytes(16), randomBytes(16)];
  return appendIncrementalUpdate(bytes, trailer, transformed, {
    encryptObject: {
      objectNumber: encryptObjectNumber,
      generation: 0,
      body: ascii(dictionary),
    },
    ids,
  });
}
