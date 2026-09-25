export type EmailFormatErrorCode =
  | 'INVALID_ENCODING'
  | 'UNSUPPORTED_FORMAT'
  | 'MALFORMED_EML'
  | 'MALFORMED_MIME'
  | 'MALFORMED_MBOX'
  | 'MALFORMED_MSG'
  | 'DECLARED_LENGTH_EXCEEDS_BUFFER';

export class EmailFormatError extends Error {
  readonly code: EmailFormatErrorCode;

  constructor(code: EmailFormatErrorCode, message: string) {
    super(message);
    this.name = 'EmailFormatError';
    this.code = code;
  }
}

export interface EmailAttachment {
  filename: string;
  contentType: string;
  bytes: Uint8Array;
  contentId?: string;
}

export interface Message {
  headers: Readonly<Record<string, string>>;
  textBody: string;
  /** Raw message HTML. Consumers must sanitise it before rendering. */
  htmlBody: string;
  attachments: readonly EmailAttachment[];
}

const CFB_SIGNATURE = Uint8Array.from([
  0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1,
]);
const FREE_SECTOR = 0xffffffff;
const END_OF_CHAIN = 0xfffffffe;
const MAX_SECTORS = 1_000_000;

function binaryString(bytes: Uint8Array): string {
  let result = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    result += String.fromCharCode(
      ...bytes.subarray(offset, offset + chunkSize),
    );
  }
  return result;
}

function binaryBytes(value: string): Uint8Array {
  const bytes = new Uint8Array(value.length);
  for (let index = 0; index < value.length; index += 1) {
    bytes[index] = value.charCodeAt(index) & 0xff;
  }
  return bytes;
}

function trimNulls(value: string): string {
  let end = value.length;
  while (end > 0 && value.charCodeAt(end - 1) === 0) end -= 1;
  return value.slice(0, end);
}

function decodeText(bytes: Uint8Array, charset = 'utf-8'): string {
  const normalized = charset
    .trim()
    .replace(/^['"]|['"]$/gu, '')
    .toLowerCase();
  const label =
    normalized === 'us-ascii' || normalized === 'ascii'
      ? 'windows-1252'
      : normalized === 'latin1' || normalized === 'iso-8859-1'
        ? 'windows-1252'
        : normalized;
  try {
    return new TextDecoder(label, { fatal: true }).decode(bytes);
  } catch {
    if (label !== 'utf-8') {
      try {
        return new TextDecoder('windows-1252', { fatal: true }).decode(bytes);
      } catch {
        // Fall through to a typed error.
      }
    }
    throw new EmailFormatError(
      'INVALID_ENCODING',
      'The message contains invalid or unsupported text encoding.',
    );
  }
}

function decodeQuotedPrintable(value: string, headerMode = false): Uint8Array {
  const source = headerMode ? value.replace(/_/gu, ' ') : value;
  const output: number[] = [];
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === '=') {
      if (!headerMode && source[index + 1] === '\n') {
        index += 1;
        continue;
      }
      if (
        !headerMode &&
        source[index + 1] === '\r' &&
        source[index + 2] === '\n'
      ) {
        index += 2;
        continue;
      }
      const hexadecimal = source.slice(index + 1, index + 3);
      if (/^[\da-f]{2}$/iu.test(hexadecimal)) {
        output.push(Number.parseInt(hexadecimal, 16));
        index += 2;
        continue;
      }
    }
    output.push(source.charCodeAt(index) & 0xff);
  }
  return Uint8Array.from(output);
}

function decodeBase64(value: string): Uint8Array {
  const compact = value.replace(/\s/gu, '');
  if (
    !compact ||
    !/^[a-z\d+/]*={0,2}$/iu.test(compact) ||
    compact.length % 4 === 1
  ) {
    throw new EmailFormatError(
      'MALFORMED_MIME',
      'A MIME base64 body is invalid.',
    );
  }
  try {
    const decoded = atob(compact);
    return binaryBytes(decoded);
  } catch {
    throw new EmailFormatError(
      'MALFORMED_MIME',
      'A MIME base64 body is invalid.',
    );
  }
}

export function decodeEncodedWords(value: string): string {
  const joined = value.replace(/(\?=)\s+(=\?[^?\s]+\?[bq]\?)/giu, '$1$2');
  return joined.replace(
    /=\?([^?\s]+)\?([bq])\?([^?]*)\?=/giu,
    (_match, charset: string, encoding: string, contents: string) => {
      const bytes =
        encoding.toLowerCase() === 'b'
          ? decodeBase64(contents)
          : decodeQuotedPrintable(contents, true);
      return decodeText(bytes, charset);
    },
  );
}

interface ParsedEntity {
  headers: Record<string, string>;
  body: string;
}

function splitEntity(
  source: string,
  errorCode: 'MALFORMED_EML' | 'MALFORMED_MIME',
): ParsedEntity {
  const normalized = source.replace(/\r\n?/gu, '\n');
  const separator = normalized.indexOf('\n\n');
  if (separator < 0) {
    throw new EmailFormatError(
      errorCode,
      'The message header block is incomplete.',
    );
  }
  const headerLines = normalized.slice(0, separator).split('\n');
  const unfolded: string[] = [];
  for (const line of headerLines) {
    if (/^[ \t]/u.test(line)) {
      if (unfolded.length === 0) {
        throw new EmailFormatError(
          errorCode,
          'A folded header has no preceding field.',
        );
      }
      unfolded[unfolded.length - 1] += ` ${line.trim()}`;
    } else {
      unfolded.push(line);
    }
  }
  const headers: Record<string, string> = {};
  for (const line of unfolded) {
    const colon = line.indexOf(':');
    if (colon <= 0) {
      throw new EmailFormatError(
        errorCode,
        'A message header field is malformed.',
      );
    }
    const name = line.slice(0, colon).trim().toLowerCase();
    const value = decodeEncodedWords(line.slice(colon + 1).trim());
    headers[name] = headers[name] ? `${headers[name]}, ${value}` : value;
  }
  return { headers, body: normalized.slice(separator + 2) };
}

interface StructuredHeader {
  value: string;
  params: Record<string, string>;
}

function structuredHeader(
  value: string | undefined,
  fallback: string,
): StructuredHeader {
  if (!value) return { value: fallback, params: {} };
  const parts: string[] = [];
  let current = '';
  let quoted = false;
  let escaped = false;
  for (const character of value) {
    if (escaped) {
      current += character;
      escaped = false;
    } else if (character === '\\' && quoted) {
      escaped = true;
    } else if (character === '"') {
      quoted = !quoted;
      current += character;
    } else if (character === ';' && !quoted) {
      parts.push(current.trim());
      current = '';
    } else {
      current += character;
    }
  }
  parts.push(current.trim());
  const params: Record<string, string> = {};
  for (const part of parts.slice(1)) {
    const equals = part.indexOf('=');
    if (equals <= 0) continue;
    const key = part.slice(0, equals).trim().toLowerCase();
    let parameter = part.slice(equals + 1).trim();
    if (parameter.startsWith('"') && parameter.endsWith('"')) {
      parameter = parameter.slice(1, -1).replace(/\\(["\\])/gu, '$1');
    }
    if (key.endsWith('*')) {
      const encoded = parameter.replace(/^[^']*'[^']*'/u, '');
      try {
        parameter = decodeURIComponent(encoded);
      } catch {
        // Preserve the literal parameter when percent encoding is malformed.
      }
    }
    params[key.replace(/\*$/u, '')] = decodeEncodedWords(parameter);
  }
  return { value: parts[0]!.toLowerCase(), params };
}

function transferBytes(body: string, encoding: string | undefined): Uint8Array {
  switch (encoding?.trim().toLowerCase()) {
    case 'base64':
      return decodeBase64(body);
    case 'quoted-printable':
      return decodeQuotedPrintable(body);
    default:
      return binaryBytes(body.replace(/\n$/u, ''));
  }
}

function multipartParts(body: string, boundary: string): string[] {
  const lines = body.replace(/\r\n?/gu, '\n').split('\n');
  const marker = `--${boundary}`;
  const closing = `${marker}--`;
  const parts: string[] = [];
  let active: string[] | undefined;
  let closed = false;
  for (const line of lines) {
    const trimmed = line.replace(/[ \t]+$/gu, '');
    if (trimmed === marker || trimmed === closing) {
      if (active) parts.push(active.join('\n'));
      active = trimmed === closing ? undefined : [];
      if (trimmed === closing) closed = true;
      continue;
    }
    if (active) active.push(line);
  }
  if (!closed) {
    throw new EmailFormatError(
      'MALFORMED_MIME',
      'A multipart body is missing its closing boundary.',
    );
  }
  return parts;
}

interface MessageAccumulator {
  text: string[];
  html: string[];
  attachments: EmailAttachment[];
}

function collectMimeEntity(
  source: string,
  accumulator: MessageAccumulator,
): void {
  const entity = splitEntity(source, 'MALFORMED_MIME');
  const contentType = structuredHeader(
    entity.headers['content-type'],
    'text/plain',
  );
  const disposition = structuredHeader(
    entity.headers['content-disposition'],
    '',
  );
  if (contentType.value.startsWith('multipart/')) {
    const boundary = contentType.params.boundary;
    if (!boundary) {
      throw new EmailFormatError(
        'MALFORMED_MIME',
        'A multipart body has no boundary.',
      );
    }
    for (const part of multipartParts(entity.body, boundary)) {
      collectMimeEntity(part, accumulator);
    }
    return;
  }

  const bytes = transferBytes(
    entity.body,
    entity.headers['content-transfer-encoding'],
  );
  const filename = disposition.params.filename ?? contentType.params.name;
  const attachment = disposition.value === 'attachment' || Boolean(filename);
  if (attachment) {
    accumulator.attachments.push({
      filename: filename || `attachment-${accumulator.attachments.length + 1}`,
      contentType: contentType.value || 'application/octet-stream',
      bytes,
      ...(entity.headers['content-id']
        ? { contentId: entity.headers['content-id'].replace(/^<|>$/gu, '') }
        : {}),
    });
    return;
  }
  const charset = contentType.params.charset ?? 'utf-8';
  if (contentType.value === 'text/html') {
    accumulator.html.push(decodeText(bytes, charset));
  } else if (contentType.value === 'text/plain') {
    accumulator.text.push(decodeText(bytes, charset));
  }
}

export async function parseEml(bytes: Uint8Array): Promise<Message[]> {
  const source = binaryString(bytes);
  const entity = splitEntity(source, 'MALFORMED_EML');
  const accumulator: MessageAccumulator = {
    text: [],
    html: [],
    attachments: [],
  };
  collectMimeEntity(source, accumulator);
  return [
    {
      headers: entity.headers,
      textBody: accumulator.text.join('\n'),
      htmlBody: accumulator.html.join('\n'),
      attachments: accumulator.attachments,
    },
  ];
}

function unescapeMboxBody(lines: string[]): string[] {
  let inBody = false;
  return lines.map((line) => {
    if (!inBody && line === '') inBody = true;
    return inBody && line.startsWith('>From ') ? line.slice(1) : line;
  });
}

export async function parseMbox(bytes: Uint8Array): Promise<Message[]> {
  const lines = binaryString(bytes).replace(/\r\n?/gu, '\n').split('\n');
  const records: string[][] = [];
  let record: string[] | undefined;
  for (const line of lines) {
    if (line.startsWith('From ')) {
      if (record) records.push(unescapeMboxBody(record));
      record = [];
    } else if (record) {
      record.push(line);
    } else if (line.trim()) {
      throw new EmailFormatError(
        'MALFORMED_MBOX',
        'The mbox does not begin with an envelope separator.',
      );
    }
  }
  if (record) records.push(unescapeMboxBody(record));
  if (records.length === 0) {
    throw new EmailFormatError(
      'MALFORMED_MBOX',
      'The mbox contains no messages.',
    );
  }
  const messages: Message[] = [];
  for (const linesInMessage of records) {
    messages.push(...(await parseEml(binaryBytes(linesInMessage.join('\n')))));
  }
  return messages;
}

interface DirectoryEntry {
  index: number;
  name: string;
  type: number;
  left: number;
  right: number;
  child: number;
  start: number;
  size: number;
  path?: string;
}

function u32(view: DataView, offset: number): number {
  if (offset + 4 > view.byteLength) {
    throw new EmailFormatError(
      'MALFORMED_MSG',
      'The CFB structure is truncated.',
    );
  }
  return view.getUint32(offset, true);
}

function sameSignature(bytes: Uint8Array): boolean {
  return CFB_SIGNATURE.every((byte, index) => bytes[index] === byte);
}

class CompoundFile {
  readonly bytes: Uint8Array;
  readonly view: DataView;
  readonly sectorSize: number;
  readonly miniSectorSize: number;
  readonly miniCutoff: number;
  readonly fat: number[];
  readonly miniFat: number[];
  readonly entries: DirectoryEntry[];
  readonly miniStream: Uint8Array;

  constructor(bytes: Uint8Array) {
    if (bytes.length < 512 || !sameSignature(bytes)) {
      throw new EmailFormatError(
        'MALFORMED_MSG',
        'The MSG CFB header is invalid.',
      );
    }
    this.bytes = bytes;
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const major = this.view.getUint16(26, true);
    if (
      this.view.getUint16(28, true) !== 0xfffe ||
      (major !== 3 && major !== 4)
    ) {
      throw new EmailFormatError(
        'MALFORMED_MSG',
        'The MSG CFB version is unsupported.',
      );
    }
    this.sectorSize = 2 ** this.view.getUint16(30, true);
    this.miniSectorSize = 2 ** this.view.getUint16(32, true);
    this.miniCutoff = u32(this.view, 56);
    if (
      (this.sectorSize !== 512 && this.sectorSize !== 4096) ||
      this.miniSectorSize !== 64 ||
      this.miniCutoff !== 4096
    ) {
      throw new EmailFormatError(
        'MALFORMED_MSG',
        'The MSG CFB sector geometry is invalid.',
      );
    }

    const fatSectorCount = u32(this.view, 44);
    const fatSectors: number[] = [];
    for (let index = 0; index < 109; index += 1) {
      const sector = u32(this.view, 76 + index * 4);
      if (sector !== FREE_SECTOR) fatSectors.push(sector);
    }
    let difatSector = u32(this.view, 68);
    const difatCount = u32(this.view, 72);
    for (let count = 0; count < difatCount; count += 1) {
      const sector = this.sector(difatSector);
      const sectorView = new DataView(
        sector.buffer,
        sector.byteOffset,
        sector.byteLength,
      );
      for (let offset = 0; offset < this.sectorSize - 4; offset += 4) {
        const value = sectorView.getUint32(offset, true);
        if (value !== FREE_SECTOR) fatSectors.push(value);
      }
      difatSector = sectorView.getUint32(this.sectorSize - 4, true);
    }
    if (fatSectors.length < fatSectorCount) {
      throw new EmailFormatError(
        'MALFORMED_MSG',
        'The MSG FAT sector list is incomplete.',
      );
    }
    this.fat = fatSectors.slice(0, fatSectorCount).flatMap((sector) => {
      const data = this.sector(sector);
      const sectorView = new DataView(
        data.buffer,
        data.byteOffset,
        data.byteLength,
      );
      return Array.from({ length: this.sectorSize / 4 }, (_, index) =>
        sectorView.getUint32(index * 4, true),
      );
    });

    const directoryBytes = this.readRegularChain(u32(this.view, 48));
    this.entries = [];
    for (let offset = 0; offset + 128 <= directoryBytes.length; offset += 128) {
      const entryView = new DataView(
        directoryBytes.buffer,
        directoryBytes.byteOffset + offset,
        128,
      );
      const nameLength = entryView.getUint16(64, true);
      const type = entryView.getUint8(66);
      let name = '';
      if (nameLength >= 2 && nameLength <= 64 && nameLength % 2 === 0) {
        name = trimNulls(
          new TextDecoder('utf-16le').decode(
            directoryBytes.subarray(offset, offset + nameLength - 2),
          ),
        );
      }
      const sizeBig = entryView.getBigUint64(120, true);
      if (sizeBig > BigInt(Number.MAX_SAFE_INTEGER)) {
        throw new EmailFormatError(
          'DECLARED_LENGTH_EXCEEDS_BUFFER',
          'A MSG stream declares an unsupported length.',
        );
      }
      this.entries.push({
        index: offset / 128,
        name,
        type,
        left: entryView.getUint32(68, true),
        right: entryView.getUint32(72, true),
        child: entryView.getUint32(76, true),
        start: entryView.getUint32(116, true),
        size: Number(sizeBig),
      });
    }
    const root = this.entries[0];
    if (!root || root.type !== 5) {
      throw new EmailFormatError(
        'MALFORMED_MSG',
        'The MSG root storage is missing.',
      );
    }

    const firstMiniFat = u32(this.view, 60);
    const miniFatSectors = u32(this.view, 64);
    const miniFatBytes =
      miniFatSectors === 0
        ? new Uint8Array()
        : this.readRegularChain(firstMiniFat, miniFatSectors * this.sectorSize);
    const miniView = new DataView(
      miniFatBytes.buffer,
      miniFatBytes.byteOffset,
      miniFatBytes.byteLength,
    );
    this.miniFat = Array.from(
      { length: Math.floor(miniFatBytes.length / 4) },
      (_, index) => miniView.getUint32(index * 4, true),
    );
    this.miniStream = this.readRegularChain(root.start, root.size);
    this.assignPaths(root.child, '');
  }

  private sector(id: number): Uint8Array {
    if (
      id >= MAX_SECTORS ||
      id >= Math.floor(this.bytes.length / this.sectorSize)
    ) {
      throw new EmailFormatError(
        'MALFORMED_MSG',
        'A MSG sector reference is outside the file.',
      );
    }
    const offset = (id + 1) * this.sectorSize;
    const end = offset + this.sectorSize;
    if (end > this.bytes.length) {
      throw new EmailFormatError(
        'DECLARED_LENGTH_EXCEEDS_BUFFER',
        'A MSG sector extends beyond the available bytes.',
      );
    }
    return this.bytes.subarray(offset, end);
  }

  private chain(start: number, table: readonly number[]): number[] {
    if (start === END_OF_CHAIN || start === FREE_SECTOR) return [];
    const result: number[] = [];
    const seen = new Set<number>();
    let current = start;
    while (current !== END_OF_CHAIN) {
      if (
        current >= table.length ||
        seen.has(current) ||
        result.length > MAX_SECTORS
      ) {
        throw new EmailFormatError(
          'MALFORMED_MSG',
          'A MSG sector chain is invalid.',
        );
      }
      seen.add(current);
      result.push(current);
      current = table[current]!;
    }
    return result;
  }

  private readRegularChain(start: number, declaredSize?: number): Uint8Array {
    const sectors = this.chain(start, this.fat);
    const bytes = new Uint8Array(sectors.length * this.sectorSize);
    sectors.forEach((sector, index) =>
      bytes.set(this.sector(sector), index * this.sectorSize),
    );
    if (declaredSize !== undefined && declaredSize > bytes.length) {
      throw new EmailFormatError(
        'DECLARED_LENGTH_EXCEEDS_BUFFER',
        'A MSG stream declares more bytes than its sector chain contains.',
      );
    }
    return declaredSize === undefined ? bytes : bytes.subarray(0, declaredSize);
  }

  private assignPaths(
    index: number,
    parent: string,
    seen = new Set<number>(),
  ): void {
    if (index === FREE_SECTOR || index === END_OF_CHAIN) return;
    if (index >= this.entries.length || seen.has(index)) {
      throw new EmailFormatError(
        'MALFORMED_MSG',
        'The MSG directory tree is invalid.',
      );
    }
    seen.add(index);
    const entry = this.entries[index]!;
    this.assignPaths(entry.left, parent, seen);
    entry.path = parent ? `${parent}/${entry.name}` : entry.name;
    if (entry.type === 1) this.assignPaths(entry.child, entry.path, seen);
    this.assignPaths(entry.right, parent, seen);
  }

  read(entry: DirectoryEntry): Uint8Array {
    if (entry.type !== 2) {
      throw new EmailFormatError(
        'MALFORMED_MSG',
        'A MSG directory item is not a stream.',
      );
    }
    if (entry.size === 0) return new Uint8Array();
    if (entry.size >= this.miniCutoff)
      return this.readRegularChain(entry.start, entry.size);
    const sectors = this.chain(entry.start, this.miniFat);
    const bytes = new Uint8Array(sectors.length * this.miniSectorSize);
    for (const [index, sector] of sectors.entries()) {
      const offset = sector * this.miniSectorSize;
      if (offset + this.miniSectorSize > this.miniStream.length) {
        throw new EmailFormatError(
          'DECLARED_LENGTH_EXCEEDS_BUFFER',
          'A MSG mini stream extends beyond the available bytes.',
        );
      }
      bytes.set(
        this.miniStream.subarray(offset, offset + this.miniSectorSize),
        index * this.miniSectorSize,
      );
    }
    if (entry.size > bytes.length) {
      throw new EmailFormatError(
        'DECLARED_LENGTH_EXCEEDS_BUFFER',
        'A MSG stream declares more bytes than its mini-sector chain contains.',
      );
    }
    return bytes.subarray(0, entry.size);
  }
}

function propertyEntry(
  file: CompoundFile,
  property: string,
  parent?: string,
): DirectoryEntry | undefined {
  const prefix = parent ? `${parent.toLowerCase()}/` : '';
  return file.entries.find((entry) => {
    const path = entry.path?.toLowerCase();
    if (!path || !path.startsWith(prefix)) return false;
    const remainder = path.slice(prefix.length);
    return (
      !remainder.includes('/') &&
      remainder === `__substg1.0_${property.toLowerCase()}`
    );
  });
}

function msgString(
  file: CompoundFile,
  tag: string,
  parent?: string,
): string | undefined {
  const unicode = propertyEntry(file, `${tag}001F`, parent);
  if (unicode) {
    return trimNulls(new TextDecoder('utf-16le').decode(file.read(unicode)));
  }
  const ansi = propertyEntry(file, `${tag}001E`, parent);
  if (ansi) {
    return trimNulls(new TextDecoder('windows-1252').decode(file.read(ansi)));
  }
}

function msgBinary(
  file: CompoundFile,
  tag: string,
  parent?: string,
): Uint8Array | undefined {
  const entry = propertyEntry(file, `${tag}0102`, parent);
  return entry ? file.read(entry) : undefined;
}

export async function parseMsg(bytes: Uint8Array): Promise<Message[]> {
  const file = new CompoundFile(bytes);
  const transport = msgString(file, '007D');
  const headers = transport
    ? splitEntity(
        `${transport.replace(/\r?\n\r?\n[\s\S]*$/u, '')}\n\n`,
        'MALFORMED_EML',
      ).headers
    : {};
  const subject = msgString(file, '0037');
  if (subject) headers.subject = subject;
  const sender = msgString(file, '0C1A');
  const recipients = msgString(file, '0E04');
  if (sender && !headers.from) headers.from = sender;
  if (recipients && !headers.to) headers.to = recipients;

  const textBody = msgString(file, '1000') ?? '';
  const htmlUnicode = msgString(file, '1013');
  const htmlBinary = msgBinary(file, '1013');
  const htmlBody =
    htmlUnicode ?? (htmlBinary ? decodeText(htmlBinary, 'utf-8') : '');
  const attachments: EmailAttachment[] = [];
  for (const storage of file.entries.filter(
    (entry) =>
      entry.type === 1 &&
      entry.path?.toLowerCase().includes('__attach_version1.0_#'),
  )) {
    const data = msgBinary(file, '3701', storage.path);
    if (!data) continue;
    attachments.push({
      filename:
        msgString(file, '3707', storage.path) ??
        msgString(file, '3704', storage.path) ??
        `attachment-${attachments.length + 1}`,
      contentType:
        msgString(file, '370E', storage.path) ?? 'application/octet-stream',
      bytes: data,
    });
  }
  return [{ headers, textBody, htmlBody, attachments }];
}

export async function parseEmail(bytes: Uint8Array): Promise<Message[]> {
  if (bytes.length >= CFB_SIGNATURE.length && sameSignature(bytes)) {
    return parseMsg(bytes);
  }
  const probe = binaryString(
    bytes.subarray(0, Math.min(bytes.length, 4096)),
  ).replace(/\r\n?/gu, '\n');
  if (probe.startsWith('From ')) return parseMbox(bytes);
  if (/^[!#$%&'*+\-.^_`|~\w]+\s*:/u.test(probe)) return parseEml(bytes);
  throw new EmailFormatError(
    'UNSUPPORTED_FORMAT',
    'The input is not a supported EML, mbox, or MSG document.',
  );
}
