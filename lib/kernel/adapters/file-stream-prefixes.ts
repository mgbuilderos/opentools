import type { StreamWindowParams } from './file-adapter';

/**
 * How many leading bytes each streamable file-workbench operation reads.
 *
 * These are the operations whose answer never depended on the whole file: a
 * signature check looks at twelve bytes, a metadata listing looks at none, and
 * both of them were reading a two-gigabyte video into memory to do it. Nothing
 * about the operations themselves changes — what changes is that the pipeline
 * slices the Blob down to this much before handing it over.
 *
 * Sixty-four is the shared ceiling for the content readers: `signature()` goes
 * as far as byte twelve, the magic-byte dump as far as byte thirty-two, and
 * the headroom costs nothing at this size. Declaring too few bytes would be a
 * silent wrong answer, so `file-adapter.test.ts` runs every operation here
 * both ways and fails unless the prefix and the complete file agree.
 *
 * It lives apart from `file.ts` because the adapter registry requires every
 * export of an adapter module to be a list of operations.
 */
export const FILE_STREAM_PREFIX_BYTES: Readonly<Record<string, number>> = {
  // Metadata only: name, relative path, size, MIME hint, modification time.
  'file-metadata-viewer': 0,
  'file-size-analyzer': 0,
  'empty-file-finder': 0,
  'large-file-finder': 0,
  // Leading-byte signatures, plus a thirty-two byte hex dump.
  'file-signature-inspector': 64,
  'mime-type-detector': 64,
  'magic-byte-inspector': 64,
};

/**
 * The byte window each streamable viewer reads, named by its own settings.
 *
 * These two do not read the start of a file, they read the part the visitor
 * asked for — two hundred and fifty-six bytes at offset ten million, say. The
 * buffered path sliced that window out of a fully materialised file; the
 * streamed path reads the window and nothing else, so the ceiling on what is
 * held is the operation's own length limit rather than the file size.
 *
 * `maxLength` mirrors the bound the operation already validates against, so a
 * setting the operation would reject can never widen the read.
 */
export const FILE_STREAM_WINDOWS: Readonly<Record<string, StreamWindowParams>> =
  {
    'hex-viewer': { offset: 'offset', length: 'length', maxLength: 65_536 },
    'binary-file-viewer': {
      offset: 'offset',
      length: 'length',
      maxLength: 4096,
    },
  };
