export interface LocalFileInput {
  name: string;
  path?: string;
  type: string;
  size: number;
  lastModified: number;
  bytes: Uint8Array;
}

export interface GeneratedFile {
  name: string;
  type: string;
  bytes: Uint8Array;
}

export interface FileWorkbenchResult {
  summary: string;
  output: string;
  downloads: GeneratedFile[];
}

export interface FileWorkbenchField {
  id: string;
  label: string;
  type: 'number' | 'text' | 'textarea' | 'select';
  defaultValue: string;
  options?: readonly { value: string; label: string }[];
}

export interface FileWorkbenchOperation {
  id: string;
  name: string;
  description: string;
  fields: readonly FileWorkbenchField[];
  requiresFiles: boolean;
  multiple?: boolean;
  directory?: boolean;
  notice?: string;
}

const text = (
  id: string,
  label: string,
  defaultValue: string,
): FileWorkbenchField => ({ id, label, type: 'text', defaultValue });
const area = (
  id: string,
  label: string,
  defaultValue: string,
): FileWorkbenchField => ({ id, label, type: 'textarea', defaultValue });
const number = (
  id: string,
  label: string,
  defaultValue: string,
): FileWorkbenchField => ({ id, label, type: 'number', defaultValue });
const select = (
  id: string,
  label: string,
  options: readonly { value: string; label: string }[],
): FileWorkbenchField => ({
  id,
  label,
  type: 'select',
  defaultValue: options[0]?.value ?? '',
  options,
});
const fileApiNotice =
  'Runs on the selected bytes in this tab. Browser file pickers do not grant permission to overwrite originals; transformed files are offered as new downloads.';
const renameNotice =
  'This changes only the downloaded copy’s name, not its bytes or true format. Renaming an extension does not convert a file.';
const hashOptions = [
  { value: 'SHA-256', label: 'SHA-256' },
  { value: 'SHA-384', label: 'SHA-384' },
  { value: 'SHA-512', label: 'SHA-512' },
] as const;

export const FILE_WORKBENCH_OPERATIONS: readonly FileWorkbenchOperation[] = [
  {
    id: 'file-compressor',
    name: 'Gzip file compressor',
    description:
      'Compress one file into the standard gzip format with the browser Compression Streams API.',
    fields: [],
    requiresFiles: true,
    notice: `${fileApiNotice} This creates .gz output; it is not ZIP or a media-specific optimizer.`,
  },
  {
    id: 'file-chunk-splitter',
    name: 'File chunk splitter',
    description: 'Split one file into numbered byte-exact chunks.',
    fields: [number('chunkSize', 'Chunk size (bytes)', '1048576')],
    requiresFiles: true,
    notice: fileApiNotice,
  },
  {
    id: 'file-chunk-joiner',
    name: 'File chunk joiner',
    description: 'Join selected chunks byte-for-byte in picker order.',
    fields: [text('outputName', 'Output filename', 'joined.bin')],
    requiresFiles: true,
    multiple: true,
    notice:
      'Select chunks in the intended order. The tool does not infer or reorder part numbers.',
  },
  {
    id: 'file-checksum-verifier',
    name: 'File checksum verifier',
    description:
      'Calculate a cryptographic digest and compare it with an expected hexadecimal value.',
    fields: [
      select('algorithm', 'Algorithm', hashOptions),
      text(
        'expected',
        'Expected hexadecimal checksum',
        '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
      ),
    ],
    requiresFiles: true,
  },
  {
    id: 'duplicate-file-finder',
    name: 'Duplicate-file finder',
    description:
      'Group selected files by exact byte length and SHA-256 digest.',
    fields: [],
    requiresFiles: true,
    multiple: true,
    notice:
      'Exact-byte duplicates only; filenames and modification dates are ignored.',
  },
  {
    id: 'file-signature-inspector',
    name: 'File-signature inspector',
    description:
      'Inspect leading bytes against a disclosed set of common signatures.',
    fields: [],
    requiresFiles: true,
    multiple: true,
    notice:
      'A signature match is a hint, not proof that the entire file is valid or safe.',
  },
  {
    id: 'mime-type-detector',
    name: 'MIME-type detector',
    description:
      'Compare browser-reported MIME type, filename extension, and common leading-byte signatures.',
    fields: [],
    requiresFiles: true,
    multiple: true,
    notice:
      'Best-effort local detection only. Treat untrusted files as untrusted even when a type appears recognized.',
  },
  {
    id: 'magic-byte-inspector',
    name: 'Magic-byte inspector',
    description: 'Show the first 32 bytes and a common-signature match.',
    fields: [],
    requiresFiles: true,
    multiple: true,
  },
  {
    id: 'file-metadata-viewer',
    name: 'File metadata viewer',
    description:
      'List File API name, relative path, byte size, MIME hint, and modification time.',
    fields: [],
    requiresFiles: true,
    multiple: true,
    notice:
      'Displays picker/File API metadata only; it does not parse embedded EXIF, document, archive, audio, or video metadata.',
  },
  {
    id: 'filename-cleaner',
    name: 'Filename cleaner',
    description:
      'Create safe, compact download names while preserving extensions.',
    fields: [text('replacement', 'Word separator', '-')],
    requiresFiles: true,
    multiple: true,
    notice: renameNotice,
  },
  {
    id: 'bulk-file-renamer',
    name: 'Bulk file renamer',
    description:
      'Replace literal text in selected filenames and download copied bytes.',
    fields: [
      text('find', 'Text to find', 'draft'),
      text('replace', 'Replacement', 'final'),
    ],
    requiresFiles: true,
    multiple: true,
    notice: renameNotice,
  },
  {
    id: 'sequential-file-renamer',
    name: 'Sequential file renamer',
    description: 'Create numbered download names while preserving extensions.',
    fields: [
      text('prefix', 'Prefix', 'file'),
      number('start', 'Start number', '1'),
      number('padding', 'Number padding (1–12)', '3'),
    ],
    requiresFiles: true,
    multiple: true,
    notice: renameNotice,
  },
  {
    id: 'filename-case-converter',
    name: 'Filename case converter',
    description:
      'Convert filename stems to lower, upper, kebab, snake, or title case.',
    fields: [
      select('mode', 'Case', [
        { value: 'kebab', label: 'kebab-case' },
        { value: 'snake', label: 'snake_case' },
        { value: 'lower', label: 'lowercase' },
        { value: 'upper', label: 'UPPERCASE' },
        { value: 'title', label: 'Title Case' },
      ]),
    ],
    requiresFiles: true,
    multiple: true,
    notice: renameNotice,
  },
  {
    id: 'file-extension-changer',
    name: 'File extension changer',
    description: 'Change only the extension on downloaded copies.',
    fields: [text('extension', 'New extension', 'txt')],
    requiresFiles: true,
    multiple: true,
    notice: renameNotice,
  },
  {
    id: 'directory-tree-generator',
    name: 'Directory-tree generator',
    description: 'Build a sorted text tree from folder-picker relative paths.',
    fields: [],
    requiresFiles: true,
    multiple: true,
    directory: true,
    notice:
      'Folder selection support varies by browser. File contents are not read for this operation.',
  },
  {
    id: 'folder-manifest-generator',
    name: 'Folder-manifest generator',
    description:
      'Create a JSON manifest with relative paths, metadata, and SHA-256 digests.',
    fields: [],
    requiresFiles: true,
    multiple: true,
    directory: true,
    notice: fileApiNotice,
  },
  {
    id: 'file-list-to-csv',
    name: 'File list to CSV',
    description:
      'Export selected file paths and File API metadata as strict CSV.',
    fields: [],
    requiresFiles: true,
    multiple: true,
    directory: true,
  },
  {
    id: 'file-size-analyzer',
    name: 'File-size analyzer',
    description: 'Rank selected files by byte size and calculate totals.',
    fields: [],
    requiresFiles: true,
    multiple: true,
  },
  {
    id: 'empty-file-finder',
    name: 'Empty-file finder',
    description: 'List selected files whose byte length is exactly zero.',
    fields: [],
    requiresFiles: true,
    multiple: true,
  },
  {
    id: 'large-file-finder',
    name: 'Large-file finder',
    description: 'List selected files at or above an explicit byte threshold.',
    fields: [number('threshold', 'Minimum size (bytes)', '1048576')],
    requiresFiles: true,
    multiple: true,
  },
  {
    id: 'binary-file-viewer',
    name: 'Binary-file viewer',
    description: 'Display a bounded byte window as eight-bit binary groups.',
    fields: [
      number('offset', 'Start offset', '0'),
      number('length', 'Bytes to show (1–4096)', '64'),
    ],
    requiresFiles: true,
  },
  {
    id: 'hex-viewer',
    name: 'Hex viewer',
    description:
      'Display a bounded file window with offsets, hexadecimal bytes, and ASCII.',
    fields: [
      number('offset', 'Start offset', '0'),
      number('length', 'Bytes to show (1–65536)', '256'),
    ],
    requiresFiles: true,
  },
  {
    id: 'hex-patch-generator',
    name: 'Hex-patch generator',
    description:
      'Compare two equal-length files and list byte replacement instructions.',
    fields: [],
    requiresFiles: true,
    multiple: true,
    notice:
      'Generates a reviewable patch listing only; it does not modify either source file. Select exactly two files in before/after order.',
  },
  {
    id: 'base64-file-encoder',
    name: 'Base64 file encoder',
    description: 'Encode one selected file as standard padded Base64.',
    fields: [],
    requiresFiles: true,
    notice:
      'Text output is limited to files up to 32 MiB to avoid excessive in-memory expansion.',
  },
  {
    id: 'base64-file-decoder',
    name: 'Base64 file decoder',
    description: 'Decode strict standard Base64 into a downloadable file.',
    fields: [
      area('input', 'Standard Base64', 'aGVsbG8='),
      text('outputName', 'Output filename', 'decoded.bin'),
      text('mime', 'MIME type', 'application/octet-stream'),
    ],
    requiresFiles: false,
  },
  {
    id: 'data-uri-file-maker',
    name: 'Data-URI file maker',
    description: 'Encode one selected file as a Base64 data URI.',
    fields: [],
    requiresFiles: true,
    notice:
      'Output is limited to files up to 16 MiB. Data URIs can become very large and should not be used for sensitive content in shareable documents.',
  },
  {
    id: 'data-uri-file-extractor',
    name: 'Data-URI file extractor',
    description: 'Decode a strict Base64 data URI into a downloadable file.',
    fields: [
      area('input', 'Base64 data URI', 'data:text/plain;base64,aGVsbG8='),
      text('outputName', 'Output filename', 'extracted.txt'),
    ],
    requiresFiles: false,
  },
  {
    id: 'file-encrypt',
    name: 'AES-GCM file encryptor',
    description:
      'Encrypt any file locally with authenticated 256-bit AES-GCM and PBKDF2 password derivation.',
    fields: [text('password', 'Encryption password', 'vault-password')],
    requiresFiles: true,
    notice:
      'Encryption runs 100% in your browser using the native Web Crypto API. No password or file data is ever transmitted.',
  },
  {
    id: 'file-decrypt',
    name: 'AES-GCM file decryptor',
    description:
      'Decrypt an .enc file back to its original bytes using your password.',
    fields: [text('password', 'Decryption password', 'vault-password')],
    requiresFiles: true,
    notice:
      'Decryption runs 100% in your browser using authenticated AES-GCM tag verification.',
  },
  {
    id: 'exif-metadata-inspector',
    name: 'Image EXIF & GPS metadata inspector',
    description:
      'Inspect camera model, exposure settings, software tags, and GPS coordinates embedded inside image files.',
    fields: [],
    requiresFiles: true,
    notice:
      'Inspects JPEG and TIFF EXIF metadata chunks client-side without sending files to any server.',
  },
  {
    id: 'exif-metadata-stripper',
    name: 'Image EXIF & metadata scrubber',
    description:
      'Strip all EXIF tags, GPS locations, camera serials, and thumbnail chunks from JPEG and PNG files before sharing.',
    fields: [text('outputSuffix', 'Filename suffix for clean file', '_clean')],
    requiresFiles: true,
    notice:
      'Produces a 100% metadata-free image file, removing all GPS coordinates and device identifiers.',
  },
] as const;

const MAX_FILE = 256 * 1024 * 1024;
const MAX_TOTAL = 512 * 1024 * 1024;
function result(
  summary: string,
  output: string,
  downloads: GeneratedFile[] = [],
): FileWorkbenchResult {
  return { summary, output, downloads };
}
function validateFiles(
  files: readonly LocalFileInput[],
  minimum = 1,
  maximum = 1_000,
) {
  if (files.length < minimum || files.length > maximum)
    throw new Error(
      `Select from ${minimum} to ${maximum.toLocaleString()} files.`,
    );
  let total = 0;
  for (const file of files) {
    if (file.size !== file.bytes.length)
      throw new Error(
        `${file.name} byte length does not match its declared size.`,
      );
    if (file.size > MAX_FILE)
      throw new Error(`${file.name} exceeds the 256 MiB per-file limit.`);
    total += file.size;
  }
  if (total > MAX_TOTAL)
    throw new Error('Selected files exceed the 512 MiB combined limit.');
  return total;
}
function integer(
  values: Record<string, string>,
  key: string,
  minimum: number,
  maximum: number,
) {
  const output = Number(values[key]);
  if (!Number.isSafeInteger(output) || output < minimum || output > maximum)
    throw new Error(
      `${key} must be a whole number from ${minimum} to ${maximum}.`,
    );
  return output;
}
function pathOf(file: LocalFileInput) {
  return file.path?.trim() || file.name;
}
function extensionParts(name: string) {
  const index = name.lastIndexOf('.');
  return index > 0
    ? { stem: name.slice(0, index), extension: name.slice(index) }
    : { stem: name, extension: '' };
}
function safeName(name: string) {
  return (
    Array.from(name, (character) => {
      const code = character.codePointAt(0) ?? 0;
      return code < 32 || code === 127 || '/\\:*?"<>|'.includes(character)
        ? '-'
        : character;
    })
      .join('')
      .replace(/\s+/gu, ' ')
      .trim()
      .replace(/[. ]+$/u, '')
      .slice(0, 240) || 'file'
  );
}
function downloadCopies(
  files: readonly LocalFileInput[],
  names: readonly string[],
) {
  if (files.length !== names.length)
    throw new Error('Internal rename count mismatch.');
  return files.map((file, index) => ({
    name: safeName(names[index]),
    type: file.type || 'application/octet-stream',
    bytes: file.bytes,
  }));
}
function hex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  );
}
async function hash(bytes: Uint8Array, algorithm = 'SHA-256') {
  if (!globalThis.crypto?.subtle)
    throw new Error('Web Crypto is unavailable in this browser.');
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  return hex(new Uint8Array(await crypto.subtle.digest(algorithm, copy)));
}
function signature(bytes: Uint8Array) {
  const starts = (...values: number[]) =>
    values.every((value, index) => bytes[index] === value);
  if (starts(0x25, 0x50, 0x44, 0x46))
    return { type: 'PDF', mime: 'application/pdf' };
  if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))
    return { type: 'PNG', mime: 'image/png' };
  if (starts(0xff, 0xd8, 0xff)) return { type: 'JPEG', mime: 'image/jpeg' };
  if (starts(0x47, 0x49, 0x46, 0x38)) return { type: 'GIF', mime: 'image/gif' };
  if (
    starts(0x50, 0x4b, 0x03, 0x04) ||
    starts(0x50, 0x4b, 0x05, 0x06) ||
    starts(0x50, 0x4b, 0x07, 0x08)
  )
    return { type: 'ZIP-family container', mime: 'application/zip' };
  if (starts(0x1f, 0x8b)) return { type: 'GZIP', mime: 'application/gzip' };
  if (starts(0x49, 0x44, 0x33) || starts(0xff, 0xfb))
    return { type: 'MP3', mime: 'audio/mpeg' };
  if (starts(0x4f, 0x67, 0x67, 0x53))
    return { type: 'Ogg', mime: 'application/ogg' };
  if (
    starts(0x52, 0x49, 0x46, 0x46) &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WAVE'
  )
    return { type: 'WAV', mime: 'audio/wav' };
  if (
    starts(0x52, 0x49, 0x46, 0x46) &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  )
    return { type: 'WebP', mime: 'image/webp' };
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(4, 8)) === 'ftyp'
  )
    return { type: 'ISO Base Media / MP4-family', mime: 'video/mp4' };
  return { type: 'Unknown signature', mime: 'application/octet-stream' };
}
function csvCell(value: unknown) {
  const raw =
    typeof value === 'string'
      ? value
      : typeof value === 'number' || typeof value === 'boolean'
        ? String(value)
        : value == null
          ? ''
          : (JSON.stringify(value) ?? '');
  return /[",\r\n]/u.test(raw) ? `"${raw.replaceAll('"', '""')}"` : raw;
}
function bytesToBase64(bytes: Uint8Array) {
  let output = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000)
    output += String.fromCharCode(
      ...bytes.subarray(offset, Math.min(offset + 0x8000, bytes.length)),
    );
  return btoa(output);
}
function base64ToBytes(value: string) {
  const normalized = value.replace(/\s+/gu, '');
  if (
    normalized.length % 4 !== 0 ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(
      normalized,
    )
  )
    throw new Error('Enter valid standard Base64 with correct padding.');
  try {
    return Uint8Array.from(atob(normalized), (character) =>
      character.charCodeAt(0),
    );
  } catch {
    throw new Error('Base64 could not be decoded.');
  }
}
function renamedStem(name: string, mode: string) {
  const { stem, extension } = extensionParts(name);
  const words = stem
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(/\s+/gu)
    .filter(Boolean);
  const value =
    mode === 'upper'
      ? words.join(' ').toLocaleUpperCase()
      : mode === 'lower'
        ? words.join(' ').toLocaleLowerCase()
        : mode === 'snake'
          ? words.join('_').toLocaleLowerCase()
          : mode === 'title'
            ? words
                .map(
                  (word) =>
                    word[0].toLocaleUpperCase() +
                    word.slice(1).toLocaleLowerCase(),
                )
                .join(' ')
            : words.join('-').toLocaleLowerCase();
  return `${value || 'file'}${extension}`;
}
function hexView(bytes: Uint8Array, offset: number) {
  const rows: string[] = [];
  for (let index = 0; index < bytes.length; index += 16) {
    const chunk = bytes.slice(index, index + 16);
    const codes = Array.from(chunk, (byte) =>
      byte.toString(16).padStart(2, '0'),
    )
      .join(' ')
      .padEnd(47);
    const ascii = Array.from(chunk, (byte) =>
      byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.',
    ).join('');
    rows.push(
      `${(offset + index).toString(16).padStart(8, '0')}  ${codes}  |${ascii}|`,
    );
  }
  return rows.join('\n');
}
function directoryTree(files: readonly LocalFileInput[]) {
  const root: Record<string, unknown> = {};
  for (const file of files) {
    const parts = pathOf(file).split('/').filter(Boolean);
    let current = root;
    for (const [index, part] of parts.entries()) {
      if (index === parts.length - 1) current[part] = null;
      else {
        current[part] ??= {};
        if (!current[part] || typeof current[part] !== 'object')
          throw new Error(`Path collision at ${part}.`);
        current = current[part] as Record<string, unknown>;
      }
    }
  }
  const render = (node: Record<string, unknown>, prefix = ''): string[] => {
    const entries = Object.entries(node).toSorted(([a], [b]) =>
      a.localeCompare(b),
    );
    return entries.flatMap(([name, child], index) => {
      const last = index === entries.length - 1;
      return [
        `${prefix}${last ? '└──' : '├──'} ${name}`,
        ...(child && typeof child === 'object'
          ? render(
              child as Record<string, unknown>,
              `${prefix}${last ? '    ' : '│   '}`,
            )
          : []),
      ];
    });
  };
  return render(root).join('\n');
}

export async function runFileWorkbenchOperation(
  operationId: string,
  values: Record<string, string>,
  files: readonly LocalFileInput[],
): Promise<FileWorkbenchResult> {
  if (
    FILE_WORKBENCH_OPERATIONS.find((item) => item.id === operationId)
      ?.requiresFiles
  )
    validateFiles(files);
  switch (operationId) {
    case 'file-compressor': {
      validateFiles(files, 1, 1);
      if (typeof CompressionStream === 'undefined')
        throw new Error(
          'Gzip Compression Streams are unavailable in this browser.',
        );
      const source = new Uint8Array(files[0].bytes.length);
      source.set(files[0].bytes);
      const compressed = new Uint8Array(
        await new Response(
          new Blob([source])
            .stream()
            .pipeThrough(new CompressionStream('gzip')),
        ).arrayBuffer(),
      );
      return result(
        `Compressed ${files[0].name}`,
        `${files[0].size.toLocaleString()} → ${compressed.length.toLocaleString()} bytes (${compressed.length < files[0].size ? `${Math.round((1 - compressed.length / files[0].size) * 100)}% smaller` : 'gzip overhead exceeded savings'})`,
        [
          {
            name: `${files[0].name}.gz`,
            type: 'application/gzip',
            bytes: compressed,
          },
        ],
      );
    }
    case 'file-chunk-splitter': {
      validateFiles(files, 1, 1);
      const size = integer(values, 'chunkSize', 1, MAX_FILE);
      const count = Math.ceil(files[0].size / size);
      if (count > 1_000)
        throw new Error('Chunk count would exceed 1,000. Increase chunk size.');
      const width = String(count).length;
      const downloads = Array.from({ length: count }, (_, index) => ({
        name: `${files[0].name}.part${String(index + 1).padStart(width, '0')}`,
        type: 'application/octet-stream',
        bytes: files[0].bytes.slice(
          index * size,
          Math.min((index + 1) * size, files[0].size),
        ),
      }));
      return result(
        `Created ${count} byte-exact chunks`,
        downloads
          .map((item) => `${item.name}\t${item.bytes.length} bytes`)
          .join('\n'),
        downloads,
      );
    }
    case 'file-chunk-joiner': {
      validateFiles(files, 2);
      const total = files.reduce((sum, file) => sum + file.size, 0);
      const bytes = new Uint8Array(total);
      let offset = 0;
      for (const file of files) {
        bytes.set(file.bytes, offset);
        offset += file.size;
      }
      const name = safeName(values.outputName);
      return result(
        `Joined ${files.length} chunks`,
        files
          .map(
            (file, index) => `${index + 1}. ${file.name} — ${file.size} bytes`,
          )
          .join('\n'),
        [{ name, type: 'application/octet-stream', bytes }],
      );
    }
    case 'file-checksum-verifier': {
      validateFiles(files, 1, 1);
      const actual = await hash(files[0].bytes, values.algorithm);
      const expected = values.expected.trim().toLocaleLowerCase();
      if (!/^[0-9a-f]+$/u.test(expected))
        throw new Error('Expected checksum must be hexadecimal.');
      return result(
        actual === expected ? 'Checksum matches' : 'Checksum does not match',
        `Algorithm: ${values.algorithm}\nExpected: ${expected}\nActual:   ${actual}\nMatch: ${actual === expected ? 'YES' : 'NO'}`,
      );
    }
    case 'duplicate-file-finder': {
      const groups = new Map<string, LocalFileInput[]>();
      for (const file of files) {
        const key = `${file.size}:${await hash(file.bytes)}`;
        groups.set(key, [...(groups.get(key) ?? []), file]);
      }
      const duplicates = [...groups.values()].filter(
        (group) => group.length > 1,
      );
      return result(
        `${duplicates.length} duplicate groups`,
        duplicates.length
          ? duplicates
              .map(
                (group, index) =>
                  `Group ${index + 1} — ${group[0].size} bytes\n${group.map((file) => `- ${pathOf(file)}`).join('\n')}`,
              )
              .join('\n\n')
          : 'No exact-byte duplicates found.',
      );
    }
    case 'file-signature-inspector':
      return result(
        `Inspected ${files.length} files`,
        files
          .map((file) => `${pathOf(file)}\t${signature(file.bytes).type}`)
          .join('\n'),
      );
    case 'mime-type-detector':
      return result(
        `Compared ${files.length} file types`,
        files
          .map((file) => {
            const detected = signature(file.bytes);
            return `${pathOf(file)}\n  browser: ${file.type || 'not supplied'}\n  signature: ${detected.mime} (${detected.type})\n  extension: ${extensionParts(file.name).extension || 'none'}`;
          })
          .join('\n\n'),
      );
    case 'magic-byte-inspector':
      return result(
        `Inspected ${files.length} byte signatures`,
        files
          .map(
            (file) =>
              `${pathOf(file)}\n  ${signature(file.bytes).type}\n  ${hex(file.bytes.slice(0, 32)).replace(/(..)/gu, '$1 ').trim()}`,
          )
          .join('\n\n'),
      );
    case 'file-metadata-viewer':
      return result(
        `Read File API metadata for ${files.length} files`,
        JSON.stringify(
          files.map((file) => ({
            name: file.name,
            relativePath: file.path || null,
            size: file.size,
            type: file.type || null,
            lastModified:
              Number.isFinite(file.lastModified) && file.lastModified > 0
                ? new Date(file.lastModified).toISOString()
                : null,
          })),
          null,
          2,
        ),
      );
    case 'filename-cleaner': {
      const replacement = values.replacement || '-';
      if (
        replacement.length > 10 ||
        Array.from(replacement).some(
          (character) =>
            character === '/' ||
            character === '\\' ||
            character.codePointAt(0) === 0,
        )
      )
        throw new Error('Separator must be at most 10 safe characters.');
      const names = files.map((file) => {
        const parts = extensionParts(file.name);
        return `${
          parts.stem
            .normalize('NFKD')
            .replace(/\p{M}/gu, '')
            .replace(/[^\p{L}\p{N}]+/gu, replacement)
            .replace(
              new RegExp(
                `${replacement.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}+`,
                'gu',
              ),
              replacement,
            )
            .replace(
              new RegExp(
                `^${replacement.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}|${replacement.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}$`,
                'gu',
              ),
              '',
            ) || 'file'
        }${parts.extension.toLocaleLowerCase()}`;
      });
      return result(
        `Prepared ${files.length} cleaned names`,
        files.map((file, index) => `${file.name} → ${names[index]}`).join('\n'),
        downloadCopies(files, names),
      );
    }
    case 'bulk-file-renamer': {
      const find = values.find;
      if (!find) throw new Error('Text to find is required.');
      const names = files.map((file) =>
        file.name.replaceAll(find, values.replace),
      );
      if (new Set(names).size !== names.length)
        throw new Error('Rename rules create duplicate output names.');
      return result(
        `Prepared ${files.length} renamed files`,
        files.map((file, index) => `${file.name} → ${names[index]}`).join('\n'),
        downloadCopies(files, names),
      );
    }
    case 'sequential-file-renamer': {
      const start = integer(values, 'start', 0, 1_000_000_000);
      const padding = integer(values, 'padding', 1, 12);
      const prefix = safeName(values.prefix);
      const names = files.map(
        (file, index) =>
          `${prefix}-${String(start + index).padStart(padding, '0')}${extensionParts(file.name).extension}`,
      );
      return result(
        `Prepared ${files.length} sequential names`,
        files.map((file, index) => `${file.name} → ${names[index]}`).join('\n'),
        downloadCopies(files, names),
      );
    }
    case 'filename-case-converter': {
      const names = files.map((file) => renamedStem(file.name, values.mode));
      if (new Set(names).size !== names.length)
        throw new Error('Case conversion creates duplicate output names.');
      return result(
        `Converted ${files.length} filename stems`,
        files.map((file, index) => `${file.name} → ${names[index]}`).join('\n'),
        downloadCopies(files, names),
      );
    }
    case 'file-extension-changer': {
      const extension = values.extension.trim().replace(/^\./u, '');
      if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,31}$/u.test(extension))
        throw new Error('Extension must be 1–32 safe characters.');
      const names = files.map(
        (file) => `${extensionParts(file.name).stem}.${extension}`,
      );
      return result(
        `Changed ${files.length} download extensions`,
        files.map((file, index) => `${file.name} → ${names[index]}`).join('\n'),
        downloadCopies(files, names),
      );
    }
    case 'directory-tree-generator':
      return result(
        `Built a tree for ${files.length} paths`,
        directoryTree(files),
      );
    case 'folder-manifest-generator': {
      const manifest = [];
      for (const file of files)
        manifest.push({
          path: pathOf(file),
          size: file.size,
          type: file.type || null,
          lastModified: file.lastModified || null,
          sha256: await hash(file.bytes),
        });
      const output = JSON.stringify(
        {
          version: 1,
          fileCount: files.length,
          totalBytes: files.reduce((sum, file) => sum + file.size, 0),
          files: manifest.toSorted((a, b) => a.path.localeCompare(b.path)),
        },
        null,
        2,
      );
      return result(`Created a ${files.length}-file manifest`, output, [
        {
          name: 'folder-manifest.json',
          type: 'application/json',
          bytes: new TextEncoder().encode(output),
        },
      ]);
    }
    case 'file-list-to-csv': {
      const output = [
        'path,name,size_bytes,type,last_modified',
        ...files
          .toSorted((a, b) => pathOf(a).localeCompare(pathOf(b)))
          .map((file) =>
            [
              pathOf(file),
              file.name,
              file.size,
              file.type,
              file.lastModified
                ? new Date(file.lastModified).toISOString()
                : '',
            ]
              .map(csvCell)
              .join(','),
          ),
      ].join('\n');
      return result(`Listed ${files.length} files`, output, [
        {
          name: 'file-list.csv',
          type: 'text/csv',
          bytes: new TextEncoder().encode(output),
        },
      ]);
    }
    case 'file-size-analyzer': {
      const sorted = files.toSorted((a, b) => b.size - a.size);
      const total = sorted.reduce((sum, file) => sum + file.size, 0);
      return result(
        `Analyzed ${files.length} files totaling ${total.toLocaleString()} bytes`,
        sorted
          .map(
            (file, index) =>
              `${index + 1}. ${pathOf(file)} — ${file.size.toLocaleString()} bytes — ${total ? ((file.size / total) * 100).toFixed(2) : '0.00'}%`,
          )
          .join('\n'),
      );
    }
    case 'empty-file-finder': {
      const empty = files.filter((file) => file.size === 0);
      return result(
        `${empty.length} empty files`,
        empty.map(pathOf).join('\n') || 'No empty files found.',
      );
    }
    case 'large-file-finder': {
      const threshold = integer(values, 'threshold', 0, MAX_FILE);
      const large = files
        .filter((file) => file.size >= threshold)
        .toSorted((a, b) => b.size - a.size);
      return result(
        `${large.length} files at or above ${threshold.toLocaleString()} bytes`,
        large
          .map((file) => `${pathOf(file)}\t${file.size.toLocaleString()} bytes`)
          .join('\n') || 'No files meet the threshold.',
      );
    }
    case 'binary-file-viewer': {
      validateFiles(files, 1, 1);
      const offset = integer(values, 'offset', 0, files[0].size);
      const length = integer(values, 'length', 1, 4096);
      const bytes = files[0].bytes.slice(
        offset,
        Math.min(offset + length, files[0].size),
      );
      return result(
        `Showing ${bytes.length} bytes from offset ${offset}`,
        Array.from(
          bytes,
          (byte, index) =>
            `${String(offset + index).padStart(8)}  ${byte.toString(2).padStart(8, '0')}`,
        ).join('\n') || 'Offset is at end of file.',
      );
    }
    case 'hex-viewer': {
      validateFiles(files, 1, 1);
      const offset = integer(values, 'offset', 0, files[0].size);
      const length = integer(values, 'length', 1, 65_536);
      const bytes = files[0].bytes.slice(
        offset,
        Math.min(offset + length, files[0].size),
      );
      return result(
        `Showing ${bytes.length} bytes from offset ${offset}`,
        hexView(bytes, offset) || 'Offset is at end of file.',
      );
    }
    case 'hex-patch-generator': {
      validateFiles(files, 2, 2);
      if (files[0].size !== files[1].size)
        throw new Error('Hex patch inputs must have equal byte length.');
      const changes: string[] = [];
      for (let index = 0; index < files[0].size; index += 1)
        if (files[0].bytes[index] !== files[1].bytes[index]) {
          changes.push(
            `${index.toString(16).padStart(8, '0')}: ${files[0].bytes[index].toString(16).padStart(2, '0')} -> ${files[1].bytes[index].toString(16).padStart(2, '0')}`,
          );
          if (changes.length > 10_000)
            throw new Error('Patch exceeds the 10,000-change display limit.');
        }
      return result(
        `${changes.length} byte replacements`,
        changes.join('\n') || 'Files are byte-identical.',
      );
    }
    case 'base64-file-encoder': {
      validateFiles(files, 1, 1);
      if (files[0].size > 32 * 1024 * 1024)
        throw new Error('Base64 text output is limited to 32 MiB.');
      return result(
        `Encoded ${files[0].size.toLocaleString()} bytes`,
        bytesToBase64(files[0].bytes),
      );
    }
    case 'base64-file-decoder': {
      const bytes = base64ToBytes(values.input);
      if (bytes.length > MAX_FILE)
        throw new Error('Decoded output exceeds 256 MiB.');
      const name = safeName(values.outputName);
      return result(
        `Decoded ${bytes.length.toLocaleString()} bytes`,
        `${name}\t${bytes.length.toLocaleString()} bytes`,
        [
          {
            name,
            type: values.mime.trim() || 'application/octet-stream',
            bytes,
          },
        ],
      );
    }
    case 'data-uri-file-maker': {
      validateFiles(files, 1, 1);
      if (files[0].size > 16 * 1024 * 1024)
        throw new Error('Data URI output is limited to 16 MiB.');
      return result(
        `Created a data URI for ${files[0].size.toLocaleString()} bytes`,
        `data:${files[0].type || 'application/octet-stream'};base64,${bytesToBase64(files[0].bytes)}`,
      );
    }
    case 'data-uri-file-extractor': {
      const match = /^data:([^;,\s]+)?;base64,([A-Za-z0-9+/=\s]+)$/u.exec(
        values.input.trim(),
      );
      if (!match) throw new Error('Enter a strict Base64 data URI.');
      const bytes = base64ToBytes(match[2]);
      if (bytes.length > MAX_FILE)
        throw new Error('Decoded output exceeds 256 MiB.');
      const name = safeName(values.outputName);
      return result(
        `Extracted ${bytes.length.toLocaleString()} bytes`,
        `${name}\t${match[1] || 'application/octet-stream'}`,
        [{ name, type: match[1] || 'application/octet-stream', bytes }],
      );
    }
    case 'file-encrypt': {
      validateFiles(files, 1, 1);
      const password = (values.password || '').trim();
      if (!password || password.length < 4)
        throw new Error('Enter a password with at least 4 characters.');
      const file = files[0];
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const enc = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveKey'],
      );
      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt as unknown as BufferSource,
          iterations: 100_000,
          hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt'],
      );
      const encryptedBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv as unknown as BufferSource },
        key,
        file.bytes as unknown as BufferSource,
      );
      const encryptedBytes = new Uint8Array(encryptedBuffer);
      const output = new Uint8Array(4 + 16 + 12 + encryptedBytes.length);
      output.set([0x45, 0x4e, 0x43, 0x31], 0); // 'ENC1'
      output.set(salt, 4);
      output.set(iv, 20);
      output.set(encryptedBytes, 32);

      return result(
        `Encrypted ${file.name}`,
        `Protected ${file.name} (${file.size.toLocaleString()} bytes) with authenticated 256-bit AES-GCM encryption.\nOutput: ${output.length.toLocaleString()} bytes with 16-byte salt and 12-byte IV.`,
        [
          {
            name: `${file.name}.enc`,
            type: 'application/octet-stream',
            bytes: output,
          },
        ],
      );
    }
    case 'file-decrypt': {
      validateFiles(files, 1, 1);
      const password = (values.password || '').trim();
      if (!password) throw new Error('Enter the decryption password.');
      const file = files[0];
      if (file.bytes.length < 48)
        throw new Error(
          'File is too small to be a valid encrypted archive (minimum 48 bytes required).',
        );
      if (
        file.bytes[0] !== 0x45 ||
        file.bytes[1] !== 0x4e ||
        file.bytes[2] !== 0x43 ||
        file.bytes[3] !== 0x31
      ) {
        throw new Error(
          'File header does not match ENC1. Make sure this file was encrypted with the AES-GCM file encryptor.',
        );
      }
      const salt = file.bytes.subarray(4, 20);
      const iv = file.bytes.subarray(20, 32);
      const ciphertext = file.bytes.subarray(32);
      const enc = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveKey'],
      );
      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt as unknown as BufferSource,
          iterations: 100_000,
          hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt'],
      );
      let decryptedBuffer: ArrayBuffer;
      try {
        decryptedBuffer = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: iv as unknown as BufferSource },
          key,
          ciphertext as unknown as BufferSource,
        );
      } catch {
        throw new Error(
          'Decryption failed: Incorrect password or corrupted encrypted file.',
        );
      }
      const decryptedBytes = new Uint8Array(decryptedBuffer);
      const outputName = file.name.endsWith('.enc')
        ? file.name.slice(0, -4)
        : `decrypted-${file.name}`;

      return result(
        `Decrypted ${file.name}`,
        `Successfully decrypted ${decryptedBytes.length.toLocaleString()} bytes with verified AES-GCM authentication tag.`,
        [
          {
            name: outputName,
            type: 'application/octet-stream',
            bytes: decryptedBytes,
          },
        ],
      );
    }
    case 'exif-metadata-inspector': {
      validateFiles(files, 1, 100);
      const reports: string[] = [];
      let gpsCount = 0;
      for (const file of files) {
        const exif = parseExif(file.bytes);
        if (!exif.hasExif) {
          reports.push(
            `--- ${file.name} (${file.size.toLocaleString()} bytes) ---`,
          );
          reports.push(
            'No standard JPEG APP1 EXIF metadata chunks found in this file.',
          );
          reports.push('');
          continue;
        }

        reports.push(
          `--- ${file.name} (${file.size.toLocaleString()} bytes) ---`,
        );
        if (exif.make || exif.model) {
          reports.push(
            `• Camera / Device:  ${[exif.make, exif.model].filter(Boolean).join(' ')}`,
          );
        }
        if (exif.lensModel) {
          reports.push(`• Lens:             ${exif.lensModel}`);
        }
        if (exif.software) {
          reports.push(`• Software:         ${exif.software}`);
        }
        if (exif.dateTime) {
          reports.push(`• Date Taken:       ${exif.dateTime}`);
        }
        if (exif.exposureTime || exif.fNumber || exif.iso) {
          reports.push(
            `• Exposure Specs:   ${[
              exif.exposureTime ? `Shutter: ${exif.exposureTime}` : '',
              exif.fNumber ? `Aperture: ${exif.fNumber}` : '',
              exif.iso ? `ISO: ${exif.iso}` : '',
            ]
              .filter(Boolean)
              .join(' | ')}`,
          );
        }
        if (exif.orientation) {
          reports.push(`• Orientation:      Tag ${exif.orientation}`);
        }
        if (
          exif.gps &&
          (exif.gps.latitude !== undefined || exif.gps.longitude !== undefined)
        ) {
          gpsCount += 1;
          const lat =
            `${exif.gps.formattedLat ?? exif.gps.latitude?.toFixed(5) ?? ''} ${exif.gps.latitudeRef ?? ''}`.trim();
          const lon =
            `${exif.gps.formattedLon ?? exif.gps.longitude?.toFixed(5) ?? ''} ${exif.gps.longitudeRef ?? ''}`.trim();
          reports.push(
            `• ⚠️ GPS LOCATION:   Latitude: ${lat} | Longitude: ${lon}`,
          );
          if (exif.gps.altitude) {
            reports.push(
              `• GPS Altitude:     ${exif.gps.altitude.toFixed(1)} meters above sea level`,
            );
          }
          reports.push(
            '  🚨 SENSITIVE PRIVACY WARNING: Exact geolocation coordinates are embedded in this file.',
          );
        } else {
          reports.push('• GPS Geolocation:  None embedded.');
        }
        reports.push('');
      }

      const summary =
        gpsCount > 0
          ? `⚠️ Found GPS location metadata in ${gpsCount} file(s)`
          : `Inspected metadata across ${files.length} file(s)`;

      return result(summary, reports.join('\n').trim());
    }
    case 'exif-metadata-stripper': {
      validateFiles(files, 1, 100);
      const suffix = (values.outputSuffix || '_clean').trim();
      const downloads: GeneratedFile[] = [];
      let totalOriginal = 0;
      let totalClean = 0;

      for (const file of files) {
        totalOriginal += file.size;
        const isJpeg =
          file.bytes.length > 3 &&
          file.bytes[0] === 0xff &&
          file.bytes[1] === 0xd8;
        const isPng =
          file.bytes.length > 7 &&
          file.bytes[0] === 0x89 &&
          file.bytes[1] === 0x50;

        let cleanBytes = file.bytes;
        if (isJpeg) {
          cleanBytes = stripExifJpeg(file.bytes);
        } else if (isPng) {
          cleanBytes = stripMetadataPng(file.bytes);
        }

        totalClean += cleanBytes.length;
        const parts = extensionParts(file.name);
        const cleanName = `${parts.stem}${suffix}${parts.extension || '.jpg'}`;
        downloads.push({
          name: cleanName,
          type:
            file.type ||
            (isJpeg
              ? 'image/jpeg'
              : isPng
                ? 'image/png'
                : 'application/octet-stream'),
          bytes: cleanBytes,
        });
      }

      const saved = Math.max(0, totalOriginal - totalClean);
      const pct =
        totalOriginal > 0 ? ((saved / totalOriginal) * 100).toFixed(2) : '0.00';

      return result(
        `Scrubbed metadata from ${files.length} image(s)`,
        `Sanitized ${files.length} file(s).\nOriginal Total: ${totalOriginal.toLocaleString()} bytes\nClean Total: ${totalClean.toLocaleString()} bytes\nMetadata Removed: ${saved.toLocaleString()} bytes (${pct}% reduction)\n\nAll EXIF, GPS locations, camera serials, and thumbnail metadata have been completely stripped. Ready for safe private download.`,
        downloads,
      );
    }
    default:
      throw new Error('Choose a supported file operation.');
  }
}

interface ExifParseResult {
  hasExif: boolean;
  make?: string;
  model?: string;
  software?: string;
  dateTime?: string;
  orientation?: number;
  exposureTime?: string;
  fNumber?: string;
  iso?: number;
  lensModel?: string;
  gps?: {
    latitude?: number;
    latitudeRef?: string;
    longitude?: number;
    longitudeRef?: string;
    altitude?: number;
    formattedLat?: string;
    formattedLon?: string;
  };
}

function parseExif(bytes: Uint8Array): ExifParseResult {
  const result: ExifParseResult = {
    hasExif: false,
  };

  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return result;
  }

  let offset = 2;
  while (offset < bytes.length - 4) {
    if (bytes[offset] !== 0xff) {
      break;
    }
    const marker = bytes[offset + 1];
    if (marker === 0xda || marker === 0xd9) {
      break;
    }
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (length < 2 || offset + 2 + length > bytes.length) {
      break;
    }

    if (marker === 0xe1) {
      const app1Payload = bytes.subarray(offset + 4, offset + 2 + length);
      if (
        app1Payload.length > 6 &&
        app1Payload[0] === 0x45 &&
        app1Payload[1] === 0x78 &&
        app1Payload[2] === 0x69 &&
        app1Payload[3] === 0x66 &&
        app1Payload[4] === 0x00 &&
        app1Payload[5] === 0x00
      ) {
        result.hasExif = true;
        const tiffBytes = app1Payload.subarray(6);
        parseTiffData(tiffBytes, result);
      }
    }
    offset += 2 + length;
  }

  return result;
}

function parseTiffData(tiff: Uint8Array, result: ExifParseResult) {
  if (tiff.length < 8) return;
  const isLittle = tiff[0] === 0x49 && tiff[1] === 0x49;
  const isBig = tiff[0] === 0x4d && tiff[1] === 0x4d;
  if (!isLittle && !isBig) return;

  const readU16 = (o: number) => {
    if (o + 2 > tiff.length) return 0;
    return isLittle
      ? tiff[o] | (tiff[o + 1] << 8)
      : (tiff[o] << 8) | tiff[o + 1];
  };
  const readU32 = (o: number) => {
    if (o + 4 > tiff.length) return 0;
    return isLittle
      ? (tiff[o] |
          (tiff[o + 1] << 8) |
          (tiff[o + 2] << 16) |
          (tiff[o + 3] << 24)) >>>
          0
      : ((tiff[o] << 24) |
          (tiff[o + 1] << 16) |
          (tiff[o + 2] << 8) |
          tiff[o + 3]) >>>
          0;
  };

  const magic = readU16(2);
  if (magic !== 0x002a) return;

  const ifd0Offset = readU32(4);
  if (ifd0Offset >= tiff.length) return;

  let exifIfdOffset = 0;
  let gpsIfdOffset = 0;

  const parseIfd = (ifdOffset: number, isGps = false) => {
    if (ifdOffset + 2 > tiff.length) return;
    const numEntries = readU16(ifdOffset);
    let entryOffset = ifdOffset + 2;

    for (
      let i = 0;
      i < numEntries && entryOffset + 12 <= tiff.length;
      i++, entryOffset += 12
    ) {
      const tag = readU16(entryOffset);
      const type = readU16(entryOffset + 2);
      const count = readU32(entryOffset + 4);
      const valOffset =
        count <= 4 && (type === 1 || type === 2 || type === 3 || type === 4)
          ? entryOffset + 8
          : readU32(entryOffset + 8);

      const readString = () => {
        if (valOffset >= tiff.length) return '';
        const end = Math.min(tiff.length, valOffset + count);
        let s = '';
        for (let j = valOffset; j < end; j++) {
          if (tiff[j] === 0) break;
          s += String.fromCharCode(tiff[j]);
        }
        return s.trim();
      };

      const readRational = (o: number) => {
        if (o + 8 > tiff.length) return 0;
        const num = readU32(o);
        const den = readU32(o + 4);
        return den === 0 ? 0 : num / den;
      };

      if (!isGps) {
        if (tag === 0x010f) result.make = readString();
        else if (tag === 0x0110) result.model = readString();
        else if (tag === 0x0112) result.orientation = readU16(valOffset);
        else if (tag === 0x0131) result.software = readString();
        else if (tag === 0x0132) result.dateTime = readString();
        else if (tag === 0x8769) exifIfdOffset = valOffset;
        else if (tag === 0x8825) gpsIfdOffset = valOffset;
        else if (tag === 0x829a) {
          const r = readRational(valOffset);
          result.exposureTime =
            r < 1 && r > 0 ? `1/${Math.round(1 / r)}s` : `${r}s`;
        } else if (tag === 0x829d)
          result.fNumber = `f/${readRational(valOffset).toFixed(1)}`;
        else if (tag === 0x8827) result.iso = readU16(valOffset);
        else if (tag === 0xa434) result.lensModel = readString();
      } else {
        if (!result.gps) result.gps = {};
        if (tag === 0x0001) result.gps.latitudeRef = readString();
        else if (tag === 0x0003) result.gps.longitudeRef = readString();
        else if (tag === 0x0002 && count === 3) {
          const d = readRational(valOffset);
          const m = readRational(valOffset + 8);
          const s = readRational(valOffset + 16);
          result.gps.latitude = d + m / 60 + s / 3600;
          result.gps.formattedLat = `${d}° ${m}' ${s.toFixed(2)}"`;
        } else if (tag === 0x0004 && count === 3) {
          const d = readRational(valOffset);
          const m = readRational(valOffset + 8);
          const s = readRational(valOffset + 16);
          result.gps.longitude = d + m / 60 + s / 3600;
          result.gps.formattedLon = `${d}° ${m}' ${s.toFixed(2)}"`;
        } else if (tag === 0x0006) {
          result.gps.altitude = readRational(valOffset);
        }
      }
    }
  };

  parseIfd(ifd0Offset);
  if (exifIfdOffset > 0) parseIfd(exifIfdOffset);
  if (gpsIfdOffset > 0) parseIfd(gpsIfdOffset, true);
}

function stripExifJpeg(bytes: Uint8Array): Uint8Array {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return bytes;
  }

  const chunks: Uint8Array[] = [new Uint8Array([0xff, 0xd8])];
  let offset = 2;

  while (offset < bytes.length - 1) {
    if (bytes[offset] !== 0xff) {
      break;
    }
    const marker = bytes[offset + 1];
    if (marker === 0xda) {
      chunks.push(bytes.subarray(offset));
      break;
    }
    if (marker === 0xd9) {
      chunks.push(bytes.subarray(offset));
      break;
    }

    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (length < 2 || offset + 2 + length > bytes.length) {
      chunks.push(bytes.subarray(offset));
      break;
    }

    const isMetadataMarker =
      (marker >= 0xe1 && marker <= 0xef) || marker === 0xfe;
    if (!isMetadataMarker) {
      chunks.push(bytes.subarray(offset, offset + 2 + length));
    }

    offset += 2 + length;
  }

  let totalLen = 0;
  for (const c of chunks) totalLen += c.length;
  const out = new Uint8Array(totalLen);
  let pos = 0;
  for (const c of chunks) {
    out.set(c, pos);
    pos += c.length;
  }
  return out;
}

function stripMetadataPng(bytes: Uint8Array): Uint8Array {
  if (
    bytes.length < 8 ||
    bytes[0] !== 0x89 ||
    bytes[1] !== 0x50 ||
    bytes[2] !== 0x4e ||
    bytes[3] !== 0x47
  ) {
    return bytes;
  }

  const chunks: Uint8Array[] = [bytes.subarray(0, 8)];
  let offset = 8;

  while (offset + 12 <= bytes.length) {
    const length =
      (bytes[offset] << 24) |
      (bytes[offset + 1] << 16) |
      (bytes[offset + 2] << 8) |
      bytes[offset + 3];
    const type = String.fromCharCode(
      bytes[offset + 4],
      bytes[offset + 5],
      bytes[offset + 6],
      bytes[offset + 7],
    );

    const chunkTotalLen = 12 + length;
    if (offset + chunkTotalLen > bytes.length) {
      chunks.push(bytes.subarray(offset));
      break;
    }

    const isDrop =
      type === 'tEXt' ||
      type === 'zTXt' ||
      type === 'iTXt' ||
      type === 'eXIf' ||
      type === 'tIME';

    if (!isDrop) {
      chunks.push(bytes.subarray(offset, offset + chunkTotalLen));
    }

    offset += chunkTotalLen;
  }

  let totalLen = 0;
  for (const c of chunks) totalLen += c.length;
  const out = new Uint8Array(totalLen);
  let pos = 0;
  for (const c of chunks) {
    out.set(c, pos);
    pos += c.length;
  }
  return out;
}
