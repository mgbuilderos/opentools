/**
 * File X-ray: drop any file, see what it says about you.
 *
 * **What this is.** One entry point over the four metadata parsers this repo
 * already has. It sniffs the container, calls the parser that fits, and returns
 * one ranked report -- so a person who does not know that a photo carries EXIF
 * and a Word file carries RSIDs can find out without having to know which of
 * six tool pages to open first.
 *
 * **Why the parsers are loaded on demand.** A tool that accepts any file would
 * otherwise ship every parser to every visitor: pdf-lib, the MP4 demuxer and the
 * ZIP reader all in the bundle of someone who dropped a JPEG. Each format's
 * module is behind `await import()`, the pattern already used for pdfjs and
 * tesseract elsewhere in the repo, so only the parser a file needs is fetched.
 *
 * **What this tool does not do.** It reads and it removes. It does not resolve
 * coordinates to an address, because that is a network request and tool code
 * here does not make them; see `./types.ts` for the full reasoning and the tests
 * that enforce it. Every byte stays in the tab.
 */

import { detectFormat } from './detect';
import {
  FORMAT_LABELS,
  rankFindings,
  type XrayFinding,
  type XrayFormat,
  type XrayReport,
} from './types';

export * from './types';
export { detectFormat } from './detect';

/**
 * Containers a one-click strip exists for.
 *
 * Excel and PowerPoint are read but not cleaned: this repo has no OOXML writer
 * for them, and shipping a button that quietly returned the file unchanged would
 * be worse than not shipping one. The report says so in as many words rather
 * than hiding the gap.
 */
const STRIPPABLE: readonly XrayFormat[] = [
  'jpeg',
  'png',
  'webp',
  'pdf',
  'docx',
  'mp4',
];

export function canStripFormat(format: XrayFormat): boolean {
  return STRIPPABLE.includes(format);
}

/** MIME type for the cleaned download, so the file opens in the right app. */
export function mimeTypeFor(format: XrayFormat): string {
  switch (format) {
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'pdf':
      return 'application/pdf';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'pptx':
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    case 'mp4':
      return 'video/mp4';
    case 'zip':
      return 'application/zip';
    default:
      return 'application/octet-stream';
  }
}

/** `holiday.jpg` becomes `holiday_clean.jpg`. */
export function cleanFileName(originalName: string): string {
  const dot = originalName.lastIndexOf('.');
  if (dot <= 0) return `${originalName}_clean`;
  return `${originalName.slice(0, dot)}_clean${originalName.slice(dot)}`;
}

/**
 * Reads one file and returns everything it says about whoever made it.
 *
 * Never throws for a file it cannot read. A parser that fails on a truncated or
 * malformed file produces a report with the reason in `warnings`, because the
 * person who dropped it needs to be told what happened, and an exception
 * reaching a dropzone handler tells them nothing.
 */
export async function xrayFile(
  bytes: Uint8Array,
  fileName?: string,
): Promise<XrayReport> {
  const format = detectFormat(bytes);
  const warnings: string[] = [];
  let findings: readonly XrayFinding[] = [];

  try {
    switch (format) {
      case 'jpeg':
      case 'png':
      case 'webp': {
        const [{ readMetadata }, { imageFindings }] = await Promise.all([
          import('../metadata'),
          import('./adapters/image'),
        ]);
        const metadata = readMetadata(bytes);
        findings = imageFindings(metadata);
        warnings.push(...metadata.warnings);
        break;
      }
      case 'pdf': {
        const [{ readPdfMetadata }, { pdfFindings }] = await Promise.all([
          import('../pdf/metadata'),
          import('./adapters/pdf'),
        ]);
        const report = await readPdfMetadata(bytes);
        findings = pdfFindings(report.findings);
        if (report.hasXmp && report.xmpByteLength === 0) {
          warnings.push(
            'This PDF carries an XMP metadata packet that could not be decoded. It is removed when you strip the file, but its contents are not listed above.',
          );
        }
        break;
      }
      case 'docx': {
        const [{ readDocxMetadata }, { docxFindings }] = await Promise.all([
          import('../docx/metadata'),
          import('./adapters/ooxml'),
        ]);
        findings = docxFindings(await readDocxMetadata(bytes, fileName));
        break;
      }
      case 'xlsx':
      case 'pptx':
      case 'zip': {
        const { ooxmlPackageFindings } = await import('./adapters/ooxml');
        const result = await ooxmlPackageFindings(bytes, format);
        findings = result.findings;
        warnings.push(...result.warnings);
        break;
      }
      case 'mp4': {
        const [
          { readMp4 },
          { sourceFromBytes },
          { inspectVideoMetadata },
          { videoFindings },
        ] = await Promise.all([
          import('../video/mp4'),
          import('../video/source'),
          import('../video/metadata'),
          import('./adapters/video'),
        ]);
        const movie = readMp4(bytes);
        const metadata = await inspectVideoMetadata(
          sourceFromBytes(bytes),
          movie,
        );
        findings = videoFindings(metadata);
        break;
      }
      case 'unsupported':
      default:
        warnings.push(
          'This file is not a format the X-ray can open. It reads JPEG, PNG and WebP images, PDFs, Word, Excel and PowerPoint files, MP4 video and ZIP archives.',
        );
        break;
    }
  } catch (error) {
    warnings.push(
      error instanceof Error
        ? error.message
        : 'This file could not be read. It may be truncated or malformed.',
    );
  }

  const ranked = rankFindings(findings);
  return {
    format,
    formatLabel: FORMAT_LABELS[format],
    fileName,
    fileSizeBytes: bytes.length,
    findings: ranked,
    hasSensitiveFindings: ranked.some(
      (finding) => finding.category !== 'technical',
    ),
    // A file with nothing in it needs no button, whatever its container.
    canStrip: canStripFormat(format) && ranked.length > 0,
    warnings,
  };
}

export interface XrayStripResult {
  format: XrayFormat;
  bytes: Uint8Array;
  originalSize: number;
  cleanedSize: number;
  /** What came out, for the receipt shown after cleaning. */
  removed: readonly string[];
  /** True when the file had nothing to remove and comes back untouched. */
  alreadyClean: boolean;
  /**
   * Set when cleaning changed the document's *content*, not only what describes
   * it.
   *
   * Only Word files can reach this. Removing metadata from a photo or a PDF
   * leaves what you see alone, but the deleted text in an unaccepted tracked
   * change can only be removed by resolving the change -- so a `.docx` is
   * cleaned by accepting its revisions, and the result reads as the document
   * does with markup accepted. That is a real edit and the UI must say so
   * rather than let someone find out later.
   */
  contentChanged?: string;
  warnings: readonly string[];
}

/**
 * Removes what the report found, using each format's existing stripper.
 *
 * Throws for a format with no stripper. Callers gate on `report.canStrip`, and a
 * silent no-op that returned the original bytes as though they were cleaned is
 * the one outcome this must not have.
 */
export async function stripFile(
  bytes: Uint8Array,
  format: XrayFormat,
): Promise<XrayStripResult> {
  const originalSize = bytes.length;

  switch (format) {
    case 'jpeg':
    case 'png':
    case 'webp': {
      const { stripMetadata } = await import('../metadata');
      const result = stripMetadata(bytes);
      return {
        format,
        bytes: result.cleanedBytes,
        originalSize,
        cleanedSize: result.cleanedSize,
        removed: result.removed,
        alreadyClean: result.removed.length === 0,
        warnings: result.warnings,
      };
    }
    case 'pdf': {
      const { stripPdfMetadata } = await import('../pdf/metadata');
      const result = await stripPdfMetadata(bytes);
      return {
        format,
        bytes: result.bytes,
        originalSize,
        cleanedSize: result.bytes.length,
        removed: result.removed.map((finding) => finding.label),
        alreadyClean: result.alreadyClean,
        warnings: [],
      };
    }
    case 'docx': {
      const { readDocxMetadata, stripDocxMetadata } =
        await import('../docx/metadata');
      const before = await readDocxMetadata(bytes);
      const cleaned = await stripDocxMetadata(bytes, {
        /*
          `accept` rather than `keep`, because `keep` would leave the deleted
          text this tool just told the reader about sitting in the file. See
          `contentChanged` above for why that is worth a warning.
        */
        trackedChanges: 'accept',
        stripComments: true,
        stripRsids: true,
        stripProperties: true,
      });
      const removed: string[] = [];
      if (before.core.creator || before.core.lastModifiedBy)
        removed.push('Author and last-saved-by names');
      if (before.app.company || before.app.manager)
        removed.push('Company and manager');
      if (before.custom.length > 0) removed.push('Custom properties');
      if (before.comments.length > 0)
        removed.push(`${before.comments.length} reviewer comments`);
      if (before.trackedChanges.deletionsCount > 0)
        removed.push(
          `${before.trackedChanges.deletionsCount} unaccepted deletions`,
        );
      if (before.rsids.count > 0)
        removed.push(`${before.rsids.count} revision save identifiers`);
      if (removed.length === 0) removed.push('Document properties and dates');

      const deletions = before.trackedChanges.deletionsCount;
      const insertions = before.trackedChanges.insertionsCount;
      return {
        format,
        bytes: cleaned,
        originalSize,
        cleanedSize: cleaned.length,
        removed,
        alreadyClean: false,
        contentChanged:
          deletions + insertions > 0
            ? `Tracked changes were accepted to remove the hidden text: ${deletions} deletion${deletions === 1 ? '' : 's'} taken out for good and ${insertions} insertion${insertions === 1 ? '' : 's'} made permanent. The cleaned file reads as the document does with all markup accepted.`
            : undefined,
        warnings: [],
      };
    }
    case 'mp4': {
      const [{ readMp4 }, { sourceFromBytes }, { stripVideoMetadata }] =
        await Promise.all([
          import('../video/mp4'),
          import('../video/source'),
          import('../video/metadata'),
        ]);
      const movie = readMp4(bytes);
      const result = await stripVideoMetadata(sourceFromBytes(bytes), movie);
      return {
        format,
        bytes: new Uint8Array(await result.blob.arrayBuffer()),
        originalSize,
        cleanedSize: result.size,
        removed: result.removedFields,
        alreadyClean: false,
        warnings: [],
      };
    }
    default:
      throw new Error(
        `There is no metadata stripper for ${FORMAT_LABELS[format]} files yet, so this file cannot be cleaned here.`,
      );
  }
}
