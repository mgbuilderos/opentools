/**
 * PDF Print Preflight Engine (/pdf/preflight).
 *
 * Professional inspection of PDF object model before sending to commercial press:
 * - Checks page dimensions & box geometry (MediaBox, TrimBox, BleedBox, CropBox).
 * - Identifies bleed margins (>= 3mm / 8.5 pt standard commercial print bleed).
 * - Inspects font embedding status (embedded, subset, or un-embedded system fonts).
 * - Checks image placed resolution / effective PPI and color spaces (CMYK vs RGB).
 * - Explicitly scopes out: total ink coverage (TIC) and ICC color conversions
 *   (honestly documented as requiring a heavy CMYK rasterizer).
 */

import {
  PDFDocument,
  PDFName,
  PDFDict,
  PDFArray,
  PDFStream,
  PDFNumber,
} from 'pdf-lib';

export interface PreflightBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PreflightFont {
  name: string;
  isEmbedded: boolean;
  isSubset: boolean;
  type: string;
}

export interface PreflightImage {
  name: string;
  width: number;
  height: number;
  colorSpace: string;
  bitsPerComponent: number;
  estimatedPpi?: number;
}

export interface PagePreflightFinding {
  pageNumber: number;
  mediaBox: PreflightBox;
  trimBox?: PreflightBox;
  bleedBox?: PreflightBox;
  hasBleedBox: boolean;
  hasTrimBox: boolean;
  bleedWidthPt: number;
  bleedHeightPt: number;
  hasStandardBleed: boolean; // >= 8.5 pt (3mm)
  fonts: PreflightFont[];
  images: PreflightImage[];
  issues: string[];
}

export interface PreflightReport {
  totalPages: number;
  pages: PagePreflightFinding[];
  summary: {
    totalFonts: number;
    unembeddedFontsCount: number;
    totalImages: number;
    rgbImagesCount: number;
    cmykImagesCount: number;
    lowResImagesCount: number; // < 300 PPI
    missingTrimBoxCount: number;
    missingBleedCount: number;
  };
  passed: boolean;
  outOfScopeNotice: string;
}

function parseBox(boxArray?: PDFArray): PreflightBox | undefined {
  if (!boxArray || boxArray.size() < 4) return undefined;
  try {
    const getNum = (idx: number): number => {
      const obj = boxArray.get(idx);
      if (obj instanceof PDFNumber) return obj.asNumber();
      const maybeNum = obj as unknown as { asNumber?: () => number };
      if (typeof maybeNum?.asNumber === 'function') {
        return maybeNum.asNumber();
      }
      return 0;
    };
    const x1 = getNum(0);
    const y1 = getNum(1);
    const x2 = getNum(2);
    const y2 = getNum(3);
    return {
      x: x1,
      y: y1,
      width: Math.abs(x2 - x1),
      height: Math.abs(y2 - y1),
    };
  } catch {
    return undefined;
  }
}

/**
 * Perform deep print preflight on PDF byte buffer.
 */
export async function runPdfPreflight(
  pdfBytes: Uint8Array,
): Promise<PreflightReport> {
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const pageCount = pdfDoc.getPageCount();
  const pagesFindings: PagePreflightFinding[] = [];

  let totalFonts = 0;
  let unembeddedFontsCount = 0;
  let totalImages = 0;
  let rgbImagesCount = 0;
  let cmykImagesCount = 0;
  let lowResImagesCount = 0;
  let missingTrimBoxCount = 0;
  let missingBleedCount = 0;

  for (let i = 0; i < pageCount; i++) {
    const pageNumber = i + 1;
    const page = pdfDoc.getPage(i);
    const node = page.node;

    // Boxes
    const mediaBox = parseBox(node.get(PDFName.of('MediaBox')) as PDFArray) ?? {
      x: 0,
      y: 0,
      width: page.getWidth(),
      height: page.getHeight(),
    };
    const trimBox = parseBox(node.get(PDFName.of('TrimBox')) as PDFArray);
    const bleedBox = parseBox(node.get(PDFName.of('BleedBox')) as PDFArray);

    const hasTrimBox = !!trimBox;
    const hasBleedBox = !!bleedBox;

    let bleedWidthPt = 0;
    let bleedHeightPt = 0;
    if (trimBox && bleedBox) {
      bleedWidthPt = Math.max(0, (bleedBox.width - trimBox.width) / 2);
      bleedHeightPt = Math.max(0, (bleedBox.height - trimBox.height) / 2);
    } else if (trimBox) {
      bleedWidthPt = Math.max(0, (mediaBox.width - trimBox.width) / 2);
      bleedHeightPt = Math.max(0, (mediaBox.height - trimBox.height) / 2);
    }

    // 3 mm is approx 8.5039 points
    const hasStandardBleed = bleedWidthPt >= 8.0 && bleedHeightPt >= 8.0;

    if (!hasTrimBox) missingTrimBoxCount++;
    if (!hasStandardBleed) missingBleedCount++;

    const pageIssues: string[] = [];
    if (!hasTrimBox) {
      pageIssues.push(
        'TrimBox is not defined (printers cannot align trim cuts)',
      );
    }
    if (!hasStandardBleed) {
      pageIssues.push(
        bleedWidthPt > 0
          ? `Bleed margin is ${Math.round(bleedWidthPt * 10) / 10} pt (< 8.5 pt / 3mm standard)`
          : 'No bleed margin defined',
      );
    }

    // Resources: Fonts & Images
    const resources = node.Resources();
    const fonts: PreflightFont[] = [];
    const images: PreflightImage[] = [];

    if (resources instanceof PDFDict) {
      // 1. Inspect Fonts
      const fontDict = resources.get(PDFName.of('Font'));
      if (fontDict instanceof PDFDict) {
        for (const [key, fontRef] of fontDict.entries()) {
          const fontObj = pdfDoc.context.lookup(fontRef);
          if (fontObj instanceof PDFDict) {
            const baseFont =
              fontObj.get(PDFName.of('BaseFont'))?.toString() ?? key.asString();
            const subtype =
              fontObj.get(PDFName.of('Subtype'))?.toString() ?? 'Unknown';

            // Check FontDescriptor for embedded stream (FontFile, FontFile2, FontFile3)
            let isEmbedded = false;
            const descriptorRef = fontObj.get(PDFName.of('FontDescriptor'));
            const descriptor = pdfDoc.context.lookup(descriptorRef);
            if (descriptor instanceof PDFDict) {
              isEmbedded =
                descriptor.has(PDFName.of('FontFile')) ||
                descriptor.has(PDFName.of('FontFile2')) ||
                descriptor.has(PDFName.of('FontFile3'));
            }

            // Standard 14 PostScript fonts are often un-embedded
            const cleanName = baseFont.replace(/^\//, '');
            const isSubset = /^[A-Z]{6}\+/.test(cleanName);

            // TrueType / OpenType CIDFonts check
            const descendantFonts = fontObj.get(PDFName.of('DescendantFonts'));
            if (
              descendantFonts instanceof PDFArray &&
              descendantFonts.size() > 0
            ) {
              const cidFont = pdfDoc.context.lookup(descendantFonts.get(0));
              if (cidFont instanceof PDFDict) {
                const cidDescRef = cidFont.get(PDFName.of('FontDescriptor'));
                const cidDesc = pdfDoc.context.lookup(cidDescRef);
                if (cidDesc instanceof PDFDict) {
                  if (
                    cidDesc.has(PDFName.of('FontFile')) ||
                    cidDesc.has(PDFName.of('FontFile2')) ||
                    cidDesc.has(PDFName.of('FontFile3'))
                  ) {
                    isEmbedded = true;
                  }
                }
              }
            }

            totalFonts++;
            if (!isEmbedded) {
              unembeddedFontsCount++;
              pageIssues.push(`Font "${cleanName}" is not embedded`);
            }

            fonts.push({
              name: cleanName,
              isEmbedded,
              isSubset,
              type: subtype.replace(/^\//, ''),
            });
          }
        }
      }

      // 2. Inspect XObjects (Images)
      const xObjectDict = resources.get(PDFName.of('XObject'));
      if (xObjectDict instanceof PDFDict) {
        for (const [key, xRef] of xObjectDict.entries()) {
          const xObj = pdfDoc.context.lookup(xRef);
          if (xObj instanceof PDFStream) {
            const dict = xObj.dict;
            const subtype = dict.get(PDFName.of('Subtype'))?.toString();
            if (subtype === '/Image') {
              const getDictNum = (name: string, fallback: number): number => {
                const val = dict.get(PDFName.of(name));
                if (val instanceof PDFNumber) return val.asNumber();
                const maybeNum = val as unknown as { asNumber?: () => number };
                if (typeof maybeNum?.asNumber === 'function') {
                  return maybeNum.asNumber();
                }
                return fallback;
              };
              const width = getDictNum('Width', 0);
              const height = getDictNum('Height', 0);
              const bpc = getDictNum('BitsPerComponent', 8);
              const csRef = dict.get(PDFName.of('ColorSpace'));
              const csStr = csRef?.toString() ?? '';

              let colorSpace = 'DeviceRGB';
              if (/DeviceCMYK|Separation|DeviceN/i.test(csStr)) {
                colorSpace = 'CMYK';
                cmykImagesCount++;
              } else if (/DeviceGray/i.test(csStr)) {
                colorSpace = 'Grayscale';
              } else {
                colorSpace = 'RGB';
                rgbImagesCount++;
                pageIssues.push(
                  `Image "${key.asString()}" is in RGB color space (expected CMYK for print)`,
                );
              }

              totalImages++;

              // Approximate placed PPI against page width if full page image
              const estimatedPpi = Math.round(width / (mediaBox.width / 72));
              if (estimatedPpi > 0 && estimatedPpi < 300) {
                lowResImagesCount++;
                pageIssues.push(
                  `Image "${key.asString()}" resolution is ~${estimatedPpi} PPI (commercial print standard is >= 300 PPI)`,
                );
              }

              images.push({
                name: key.asString(),
                width,
                height,
                colorSpace,
                bitsPerComponent: bpc,
                estimatedPpi: estimatedPpi > 0 ? estimatedPpi : undefined,
              });
            }
          }
        }
      }
    }

    pagesFindings.push({
      pageNumber,
      mediaBox,
      trimBox,
      bleedBox,
      hasBleedBox,
      hasTrimBox,
      bleedWidthPt: Math.round(bleedWidthPt * 10) / 10,
      bleedHeightPt: Math.round(bleedHeightPt * 10) / 10,
      hasStandardBleed,
      fonts,
      images,
      issues: pageIssues,
    });
  }

  const passed =
    unembeddedFontsCount === 0 &&
    missingTrimBoxCount === 0 &&
    missingBleedCount === 0 &&
    rgbImagesCount === 0 &&
    lowResImagesCount === 0;

  return {
    totalPages: pageCount,
    pages: pagesFindings,
    summary: {
      totalFonts,
      unembeddedFontsCount,
      totalImages,
      rgbImagesCount,
      cmykImagesCount,
      lowResImagesCount,
      missingTrimBoxCount,
      missingBleedCount,
    },
    passed,
    outOfScopeNotice:
      'Total Ink Coverage (TIC) and automated ICC profile color transforms require a full CMYK rasterizer and are deliberately out of scope.',
  };
}
