import {
  PDFDocument,
  PDFName,
  PDFRawStream,
  PDFRef,
  decodePDFRawStream,
} from 'pdf-lib';

/**
 * Reading and removing everything a PDF remembers about where it came from.
 *
 * **Why this is its own module.** `compressPdf` already had a `removeMetadata`
 * option, and it cleared the six Document Information fields — title, author,
 * subject, keywords, producer, creator. That is the metadata people know
 * about, and it is not where most of the risk lives. Measured on a file
 * carrying an XMP packet, the way anything saved by Word, InDesign or Acrobat
 * does:
 *
 *     after the old strip, the output bytes still contained
 *       "xmpmeta"                  YES
 *       "Jane Partner"             YES
 *       "Confidential Merger Memo" YES
 *
 * So a person who ticked "remove metadata" still sent their name and their
 * document's real title to the other side. This module exists so that the
 * claim and the behaviour match.
 *
 * **The four places a PDF keeps identity, and why each needs its own removal:**
 *
 * 1. **The Info dictionary.** The familiar fields. Clearing them is what the
 *    old option did.
 * 2. **The XMP packet** (`/Metadata` on the catalog). An XML stream that
 *    usually *duplicates* title and author and adds the authoring tool, a
 *    document lineage id, and often every application that ever touched the
 *    file. Clearing the Info dictionary does not touch it.
 * 3. **The dates.** `CreationDate` says when the document was really written,
 *    which can contradict whatever the covering email claims. Worse, a naive
 *    save *writes a fresh* `ModDate`, stamping the moment the file was
 *    processed onto a document that had no such date before.
 * 4. **The file identifier** (`/ID` in the trailer). Two hashes that let two
 *    copies of a document be recognised as versions of one another.
 *
 * **On `updateMetadata: false`.** pdf-lib re-stamps `Producer` with its own
 * name and URL and sets `ModDate` to now unless the document was *loaded* with
 * this option off — it is a load option, not a save one, which is easy to get
 * wrong. Measured: after `setProducer('')` and a default load-and-save, the
 * producer read back as pdf-lib's own name followed by its project URL. Every
 * load here passes it, so a document this tool cleaned does not carry a
 * third-party identifier the user never chose — the same principle that keeps
 * a watermark off the page. `metadata.test.ts` asserts it rather than trusting
 * it.
 *
 * Nothing here parses the page content. Text, images and layout are untouched;
 * this removes only what describes the file.
 */

/** A single thing found in the file, ready to show the user. */
export interface MetadataFinding {
  /** Where it lives, so the page can group findings by source. */
  source: 'info' | 'xmp' | 'dates' | 'id';
  label: string;
  value: string;
}

export interface PdfMetadataReport {
  findings: MetadataFinding[];
  hasXmp: boolean;
  /** Bytes of the XMP packet, so the page can say how much is in there. */
  xmpByteLength: number;
  hasDocumentId: boolean;
}

/** What `stripPdfMetadata` actually removed, for an honest summary line. */
export interface StripResult {
  bytes: Uint8Array;
  removed: MetadataFinding[];
  /** True when the file had nothing to remove; the bytes come back unchanged. */
  alreadyClean: boolean;
}

const INFO_FIELDS = [
  ['Title', (d: PDFDocument) => d.getTitle()],
  ['Author', (d: PDFDocument) => d.getAuthor()],
  ['Subject', (d: PDFDocument) => d.getSubject()],
  ['Keywords', (d: PDFDocument) => d.getKeywords()],
  ['Creator', (d: PDFDocument) => d.getCreator()],
  ['Producer', (d: PDFDocument) => d.getProducer()],
] as const;

/**
 * Fields pulled out of the XMP packet for display.
 *
 * This is deliberately a small, named set rather than a full RDF parse. The
 * page's job is to show the user *that* their name is in there and what it
 * says; the strip removes the whole packet regardless of what it contains, so
 * a field this misses is still removed. Reporting less than is removed is the
 * safe direction for the mistake to run.
 */
const XMP_PATTERNS: readonly [string, RegExp][] = [
  ['Title (XMP)', /<dc:title>[\s\S]*?<rdf:li[^>]*>([\s\S]*?)<\/rdf:li>/],
  ['Author (XMP)', /<dc:creator>[\s\S]*?<rdf:li[^>]*>([\s\S]*?)<\/rdf:li>/],
  [
    'Description (XMP)',
    /<dc:description>[\s\S]*?<rdf:li[^>]*>([\s\S]*?)<\/rdf:li>/,
  ],
  ['Authoring tool', /<xmp:CreatorTool>([\s\S]*?)<\/xmp:CreatorTool>/],
  ['Producer (XMP)', /<pdf:Producer>([\s\S]*?)<\/pdf:Producer>/],
  ['Created (XMP)', /<xmp:CreateDate>([\s\S]*?)<\/xmp:CreateDate>/],
  ['Modified (XMP)', /<xmp:ModifyDate>([\s\S]*?)<\/xmp:ModifyDate>/],
  ['Document lineage id', /<xmpMM:DocumentID>([\s\S]*?)<\/xmpMM:DocumentID>/],
];

/** Reads the XMP packet as text, or null when the file has none. */
function readXmp(document: PDFDocument): string | null {
  const entry = document.catalog.get(PDFName.of('Metadata'));
  if (!entry) return null;
  const stream = document.context.lookup(entry);
  if (!(stream instanceof PDFRawStream)) return null;
  try {
    return new TextDecoder().decode(decodePDFRawStream(stream).decode());
  } catch {
    // A packet this code cannot decode is still a packet. The caller learns it
    // exists from `hasXmp`, and the strip removes it without reading it.
    return null;
  }
}

function xmpFindings(xmp: string): MetadataFinding[] {
  const found: MetadataFinding[] = [];
  for (const [label, pattern] of XMP_PATTERNS) {
    const value = pattern.exec(xmp)?.[1]?.trim();
    if (value) found.push({ source: 'xmp', label, value });
  }
  return found;
}

function dateFindings(document: PDFDocument): MetadataFinding[] {
  const found: MetadataFinding[] = [];
  // pdf-lib throws rather than returning undefined for an unparseable date.
  const read = (get: () => Date | undefined) => {
    try {
      return get();
    } catch {
      return undefined;
    }
  };
  const created = read(() => document.getCreationDate());
  const modified = read(() => document.getModificationDate());
  if (created)
    found.push({
      source: 'dates',
      label: 'Created',
      value: created.toISOString(),
    });
  if (modified)
    found.push({
      source: 'dates',
      label: 'Modified',
      value: modified.toISOString(),
    });
  return found;
}

/** Everything the file says about itself. */
export async function readPdfMetadata(
  bytes: Uint8Array,
): Promise<PdfMetadataReport> {
  const document = await PDFDocument.load(bytes, { updateMetadata: false });
  const findings: MetadataFinding[] = [];

  for (const [label, get] of INFO_FIELDS) {
    const raw = get(document);
    const value = Array.isArray(raw) ? raw.join(', ') : raw;
    if (value && value.trim())
      findings.push({ source: 'info', label, value: value.trim() });
  }

  findings.push(...dateFindings(document));

  const xmp = readXmp(document);
  const hasXmp = document.catalog.get(PDFName.of('Metadata')) !== undefined;
  if (xmp) findings.push(...xmpFindings(xmp));

  const id = document.context.trailerInfo?.ID;
  const hasDocumentId = id !== undefined;
  if (hasDocumentId)
    findings.push({
      source: 'id',
      label: 'File identifier',
      value: 'Present — two hashes that link copies of this document together',
    });

  return {
    findings,
    hasXmp,
    xmpByteLength: xmp ? new TextEncoder().encode(xmp).length : 0,
    hasDocumentId,
  };
}

/**
 * Removes all four kinds at once.
 *
 * There is no partial mode on purpose. Someone who asks a privacy tool to
 * remove metadata means all of it, and an interface offering to clear the
 * author while keeping the XMP packet that also holds the author would be
 * offering a choice that does not do what it says.
 */
export async function stripPdfMetadata(
  bytes: Uint8Array,
): Promise<StripResult> {
  const before = await readPdfMetadata(bytes);
  if (before.findings.length === 0) {
    return { bytes, removed: [], alreadyClean: true };
  }

  const document = await PDFDocument.load(bytes, { updateMetadata: false });
  stripMetadataInPlace(document);

  const cleaned = await document.save();
  return { bytes: cleaned, removed: before.findings, alreadyClean: false };
}

/**
 * Removes all four kinds from an already-loaded document.
 *
 * Separate from `stripPdfMetadata` so `compressPdf` can share it. Its
 * `removeMetadata` option used to clear the six Info fields by hand and leave
 * everything else, which is the defect this module documents; calling this
 * instead keeps the two paths from drifting apart again.
 *
 * The document must have been loaded with `updateMetadata: false`, or pdf-lib
 * writes a new Producer and ModDate back on save and undoes part of this.
 */
export function stripMetadataInPlace(document: PDFDocument): void {
  /**
   * Unlinking is not erasing, and this is the part that is easy to get wrong.
   *
   * Clearing `trailerInfo.Info` and deleting `/Metadata` from the catalog only
   * removes the *references*. pdf-lib writes out every object still registered
   * in its context, referenced or not, so the first version of this function
   * produced a file with no visible metadata whose bytes still contained
   * `Jane Partner` — exactly the failure it was written to prevent. The test
   * that greps the output bytes is what caught it.
   *
   * So each object is removed from the context as well as unlinked.
   */
  const infoRef = document.context.trailerInfo.Info;
  document.context.trailerInfo.Info = undefined;
  if (infoRef instanceof PDFRef) document.context.delete(infoRef);

  const xmpRef = document.catalog.get(PDFName.of('Metadata'));
  document.catalog.delete(PDFName.of('Metadata'));
  if (xmpRef instanceof PDFRef) document.context.delete(xmpRef);

  // The file identifier lives in the trailer itself, so unlinking is enough.
  document.context.trailerInfo.ID = undefined;
}
