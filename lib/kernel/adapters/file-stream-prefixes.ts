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
