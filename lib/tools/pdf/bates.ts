import {
  degrees,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFNumber,
  rgb,
  StandardFonts,
  type PDFFont,
  type PDFPage,
} from 'pdf-lib';
import {
  displayedRectToUserSpace,
  pageGeometry,
  type DisplayedRect,
  type PageGeometry,
} from './signature-placement';

export type BatesPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export interface BatesOptions {
  prefix?: string;
  startingNumber?: number;
  paddingWidth?: number;
  suffix?: string;
  position?: BatesPosition;
  fontSize?: number;
  marginPt?: number;
  writePageLabels?: boolean;
}

export interface BatesDocumentInput {
  name: string;
  bytes: Uint8Array;
}

export interface BatesDocumentOutput {
  name: string;
  bytes: Uint8Array;
  pageCount: number;
  startNumber: number;
  endNumber: number;
  batesRange: string;
}

export interface BatesBundleResult {
  documents: BatesDocumentOutput[];
  combined?: {
    name: string;
    bytes: Uint8Array;
    pageCount: number;
    batesRange: string;
  };
  totalPageCount: number;
  nextNumber: number;
}

export function formatBatesNumber(
  num: number,
  prefix = '',
  paddingWidth = 6,
  suffix = '',
): string {
  const safeNum = Math.max(0, Math.floor(num));
  const padded =
    paddingWidth > 0
      ? String(safeNum).padStart(paddingWidth, '0')
      : String(safeNum);
  return `${prefix}${padded}${suffix}`;
}

export function formatBatesRange(
  startNum: number,
  endNum: number,
  prefix = '',
  paddingWidth = 6,
  suffix = '',
): string {
  const startStr = formatBatesNumber(startNum, prefix, paddingWidth, suffix);
  if (startNum === endNum) return startStr;
  const endStr = formatBatesNumber(endNum, prefix, paddingWidth, suffix);
  return `${startStr} – ${endStr}`;
}

function geometryOfPage(page: PDFPage): PageGeometry {
  return pageGeometry(
    page.getMediaBox(),
    page.node.CropBox() ? page.getCropBox() : undefined,
    page.getRotation().angle,
  );
}

function computeBatesRect(
  pageGeom: PageGeometry,
  textWidth: number,
  textHeight: number,
  position: BatesPosition,
  marginPt: number,
): DisplayedRect {
  const margin = Math.max(0, marginPt);
  switch (position) {
    case 'top-left':
      return {
        x: margin,
        y: margin,
        width: textWidth,
        height: textHeight,
      };
    case 'top-center':
      return {
        x: Math.max(0, (pageGeom.width - textWidth) / 2),
        y: margin,
        width: textWidth,
        height: textHeight,
      };
    case 'top-right':
      return {
        x: Math.max(0, pageGeom.width - margin - textWidth),
        y: margin,
        width: textWidth,
        height: textHeight,
      };
    case 'bottom-left':
      return {
        x: margin,
        y: Math.max(0, pageGeom.height - margin - textHeight),
        width: textWidth,
        height: textHeight,
      };
    case 'bottom-center':
      return {
        x: Math.max(0, (pageGeom.width - textWidth) / 2),
        y: Math.max(0, pageGeom.height - margin - textHeight),
        width: textWidth,
        height: textHeight,
      };
    case 'bottom-right':
    default:
      return {
        x: Math.max(0, pageGeom.width - margin - textWidth),
        y: Math.max(0, pageGeom.height - margin - textHeight),
        width: textWidth,
        height: textHeight,
      };
  }
}

export function validateBatesEncoding(font: PDFFont, text: string): void {
  try {
    font.encodeText(text);
  } catch {
    for (const char of text) {
      try {
        font.encodeText(char);
      } catch {
        throw new Error(
          `The character "${char}" is not supported by standard PDF fonts. Use standard letters, numbers, or punctuation.`,
        );
      }
    }
    throw new Error(
      'Text contains characters not supported by standard PDF fonts.',
    );
  }
}

function applyPageLabels(
  pdfDoc: PDFDocument,
  pageCount: number,
  startNumber: number,
  prefix: string,
  paddingWidth: number,
  suffix: string,
): void {
  const { context } = pdfDoc;
  const numsArray = context.obj([]);
  for (let i = 0; i < pageCount; i++) {
    const label = formatBatesNumber(
      startNumber + i,
      prefix,
      paddingWidth,
      suffix,
    );
    const labelDict = context.obj({
      Type: 'PageLabel',
      P: PDFHexString.fromText(label),
    });
    numsArray.push(PDFNumber.of(i));
    numsArray.push(labelDict);
  }
  const pageLabelsDict = context.obj({
    Nums: numsArray,
  });
  pdfDoc.catalog.set(PDFName.of('PageLabels'), pageLabelsDict);
}

export async function applyBatesNumbering(
  inputs: BatesDocumentInput[],
  options: BatesOptions = {},
): Promise<BatesBundleResult> {
  if (!inputs || inputs.length === 0) {
    throw new Error('No PDF documents provided for Bates numbering.');
  }

  const prefix = options.prefix ?? '';
  const suffix = options.suffix ?? '';
  const startingNumber = Math.max(0, Math.floor(options.startingNumber ?? 1));
  const paddingWidth = Math.max(0, Math.floor(options.paddingWidth ?? 6));
  const position = options.position ?? 'bottom-right';
  const fontSize =
    options.fontSize && options.fontSize > 0 ? options.fontSize : 10;
  const marginPt =
    options.marginPt !== undefined && options.marginPt >= 0
      ? options.marginPt
      : 36;
  const writePageLabels = options.writePageLabels !== false;

  let currentNumber = startingNumber;
  const outputDocs: BatesDocumentOutput[] = [];
  let totalPageCount = 0;

  for (const input of inputs) {
    let doc: PDFDocument;
    try {
      doc = await PDFDocument.load(input.bytes);
    } catch (err) {
      const msg = String(err).toLowerCase();
      if (msg.includes('password') || msg.includes('encrypt')) {
        throw new Error(
          `Document "${input.name}" is password-protected or encrypted and cannot be stamped.`,
        );
      }
      throw new Error(
        `Failed to parse PDF "${input.name}": ${(err as Error).message}`,
      );
    }

    const pageCount = doc.getPageCount();
    if (pageCount === 0) {
      throw new Error(`Document "${input.name}" has no pages.`);
    }

    const font = await doc.embedFont(StandardFonts.Helvetica);
    validateBatesEncoding(font, prefix);
    validateBatesEncoding(font, suffix);

    const docStartNumber = currentNumber;

    for (let p = 0; p < pageCount; p++) {
      const page = doc.getPage(p);
      const geom = geometryOfPage(page);
      const batesText = formatBatesNumber(
        currentNumber,
        prefix,
        paddingWidth,
        suffix,
      );
      const textWidth = font.widthOfTextAtSize(batesText, fontSize);
      const textHeight = font.heightAtSize(fontSize);
      const rect = computeBatesRect(
        geom,
        textWidth,
        textHeight,
        position,
        marginPt,
      );
      const placement = displayedRectToUserSpace(geom, rect);

      page.drawText(batesText, {
        x: placement.x,
        y: placement.y,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
        rotate: degrees(placement.rotate),
      });

      currentNumber++;
    }

    const docEndNumber = currentNumber - 1;

    if (writePageLabels) {
      applyPageLabels(
        doc,
        pageCount,
        docStartNumber,
        prefix,
        paddingWidth,
        suffix,
      );
    }

    const stampedBytes = await doc.save();
    totalPageCount += pageCount;

    outputDocs.push({
      name: input.name,
      bytes: stampedBytes,
      pageCount,
      startNumber: docStartNumber,
      endNumber: docEndNumber,
      batesRange: formatBatesRange(
        docStartNumber,
        docEndNumber,
        prefix,
        paddingWidth,
        suffix,
      ),
    });
  }

  let combined: BatesBundleResult['combined'] = undefined;
  if (outputDocs.length > 1) {
    const mergedDoc = await PDFDocument.create();
    let mergedPageIdx = 0;
    const mergedNums = mergedDoc.context.obj([]);

    for (const outDoc of outputDocs) {
      const loaded = await PDFDocument.load(outDoc.bytes);
      const copied = await mergedDoc.copyPages(loaded, loaded.getPageIndices());
      copied.forEach((p) => {
        mergedDoc.addPage(p);
        if (writePageLabels) {
          const label = formatBatesNumber(
            startingNumber + mergedPageIdx,
            prefix,
            paddingWidth,
            suffix,
          );
          const labelDict = mergedDoc.context.obj({
            Type: 'PageLabel',
            P: PDFHexString.fromText(label),
          });
          mergedNums.push(PDFNumber.of(mergedPageIdx));
          mergedNums.push(labelDict);
        }
        mergedPageIdx++;
      });
    }

    if (writePageLabels) {
      mergedDoc.catalog.set(
        PDFName.of('PageLabels'),
        mergedDoc.context.obj({ Nums: mergedNums }),
      );
    }

    const combinedBytes = await mergedDoc.save();
    combined = {
      name: 'exhibit-bundle-bates.pdf',
      bytes: combinedBytes,
      pageCount: mergedPageIdx,
      batesRange: formatBatesRange(
        startingNumber,
        currentNumber - 1,
        prefix,
        paddingWidth,
        suffix,
      ),
    };
  }

  return {
    documents: outputDocs,
    combined,
    totalPageCount,
    nextNumber: currentNumber,
  };
}

export async function stampBatesPdf(
  bytes: Uint8Array,
  options: BatesOptions = {},
): Promise<{ bytes: Uint8Array; pageCount: number; batesRange: string }> {
  const result = await applyBatesNumbering(
    [{ name: 'document.pdf', bytes }],
    options,
  );
  const doc = result.documents[0];
  return {
    bytes: doc.bytes,
    pageCount: doc.pageCount,
    batesRange: doc.batesRange,
  };
}
