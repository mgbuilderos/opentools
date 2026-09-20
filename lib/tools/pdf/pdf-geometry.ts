/**
 * One pass over a PDF that returns both what it says and what it draws.
 *
 * `pdf-text.ts` already reads the text layer, and `/pdf/to-word` depends on it,
 * so it is left alone. This reads the same text *and* the vector paths, because
 * the table extractor needs them together: the rules say where the columns are
 * and the text says what is in them, and opening the document twice to get them
 * separately doubles the parse of a 200-page statement for no gain.
 *
 * ## The trap that shaped this file
 *
 * pdf.js hands the raw path over as a plain numeric array, and then **replaces
 * it with a `Path2D` the first time the page is rendered** — `constructPath`
 * does `data[0] = makePathFromDrawOPS(path)` on the operator list it cached for
 * that page. So a reader that shares a page object with the on-screen preview
 * gets numbers the first time and an opaque `Path2D` afterwards, which reads as
 * "this PDF has no table" rather than as an error.
 *
 * Two defences, because this fails silently: geometry is read through its own
 * `getDocument` task that nothing renders, and `readPathData` returns `null`
 * for anything that is not a numeric array rather than trusting the shape.
 */

import type { PdfTextItem } from './pdf-text';
import {
  IDENTITY_MATRIX,
  multiplyMatrix,
  pathDataToSegments,
  rectangleToSegment,
  type Matrix,
  type RuleSegment,
} from './rulings';

export interface PdfPageGeometry {
  items: PdfTextItem[];
  segments: RuleSegment[];
  /** Page box in PDF user space, `[x0, y0, x1, y1]`. */
  viewBox: readonly [number, number, number, number];
  /** Page rotation in degrees, as declared by the page. */
  rotate: number;
}

interface PdfJsTextItem {
  str?: string;
  transform?: number[];
  width?: number;
  fontName?: string;
  height?: number;
}

/**
 * Mirrors `pdf-text.ts`. A bundler with `?url` support resolves the worker;
 * Node has no `?url` form and the library finds its own, so the failed import
 * is the expected path there rather than an error worth reporting.
 */
async function ensurePdfWorker(pdfjs: {
  GlobalWorkerOptions: { workerSrc: string };
}): Promise<void> {
  if (pdfjs.GlobalWorkerOptions.workerSrc) return;
  if (typeof Worker === 'undefined') return;
  try {
    const workerModule = await import('pdfjs-dist/legacy/build/pdf.worker.mjs?url');
    if (workerModule.default) {
      pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default;
    }
  } catch {
    /* Node, or a bundler without `?url`. */
  }
}

/**
 * Return the raw `DrawOPS` numbers, or `null` when pdf.js has already turned
 * them into a `Path2D`. See the note at the top of the file.
 */
function readPathData(value: unknown): ArrayLike<number> | null {
  if (value instanceof Float32Array || value instanceof Float64Array) {
    return value;
  }
  if (Array.isArray(value) && value.every((n) => typeof n === 'number')) {
    return value as number[];
  }
  return null;
}

/**
 * How many operators to walk on one page before giving up on its vectors.
 *
 * A map, a chart or a scanned-then-vectorised page can carry hundreds of
 * thousands of path operators, none of which is a table border. Reading them
 * all would freeze the tab. Stopping means the page falls back to whitespace
 * columns, which is the same outcome as a page that simply has no rules.
 */
const MAX_PATH_OPERATORS = 60_000;

/** Read text and drawn rules from every page. */
export async function readPdfGeometry(
  bytes: Uint8Array,
  onPage?: (pageNumber: number, pageCount: number) => void,
): Promise<PdfPageGeometry[]> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  await ensurePdfWorker(pdfjs as unknown as Parameters<typeof ensurePdfWorker>[0]);
  const OPS = pdfjs.OPS;

  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  const task = pdfjs.getDocument({ data: copy, useSystemFonts: false });

  try {
    const document = await task.promise;
    const pages: PdfPageGeometry[] = [];

    for (let number = 1; number <= document.numPages; number += 1) {
      const page = await document.getPage(number);
      const viewport = page.getViewport({ scale: 1 });
      const box = viewport.viewBox as number[];

      const content = await page.getTextContent();
      const items: PdfTextItem[] = [];
      for (const raw of content.items as PdfJsTextItem[]) {
        const text = raw.str ?? '';
        if (text.length === 0) continue;
        const transform = raw.transform ?? [1, 0, 0, 1, 0, 0];
        const fontSize = Math.abs(transform[3] ?? 0) || raw.height || 12;
        items.push({
          text,
          x: transform[4] ?? 0,
          y: transform[5] ?? 0,
          width: raw.width ?? 0,
          fontSize,
          bold: /bold|black|heavy|semib/iu.test(raw.fontName ?? ''),
        });
      }

      const segments: RuleSegment[] = [];
      const operators = await page.getOperatorList();
      let ctm: Matrix = IDENTITY_MATRIX;
      let lineWidth = 1;
      const stack: { ctm: Matrix; lineWidth: number }[] = [];
      const limit = Math.min(operators.fnArray.length, MAX_PATH_OPERATORS);

      for (let i = 0; i < limit; i += 1) {
        const fn = operators.fnArray[i];
        const args = operators.argsArray[i] as unknown[];

        if (fn === OPS.save) {
          stack.push({ ctm, lineWidth });
          continue;
        }
        if (fn === OPS.restore) {
          const previous = stack.pop();
          if (previous) {
            ctm = previous.ctm;
            lineWidth = previous.lineWidth;
          }
          continue;
        }
        if (fn === OPS.transform) {
          const m = args as unknown as number[];
          if (m.length >= 6) {
            ctm = multiplyMatrix(ctm, [
              m[0] ?? 1,
              m[1] ?? 0,
              m[2] ?? 0,
              m[3] ?? 1,
              m[4] ?? 0,
              m[5] ?? 0,
            ]);
          }
          continue;
        }
        if (fn === OPS.setLineWidth) {
          const width = args[0];
          if (typeof width === 'number') lineWidth = width;
          continue;
        }
        if (fn === OPS.constructPath) {
          // `[op, [pathData], minMax]` — confirmed against the installed build.
          const holder = args[1];
          const data = Array.isArray(holder) ? readPathData(holder[0]) : null;
          if (!data) continue;
          // A filled rectangle is a border too, and it arrives as a closed
          // four-point path rather than as a rectangle operator.
          const asRectangle = closedRectangle(data);
          if (asRectangle) {
            const rule = rectangleToSegment(
              asRectangle.x,
              asRectangle.y,
              asRectangle.width,
              asRectangle.height,
              ctm,
            );
            if (rule) segments.push(rule);
            continue;
          }
          for (const segment of pathDataToSegments(data, ctm, lineWidth)) {
            segments.push(segment);
          }
        }
      }

      pages.push({
        items,
        segments,
        viewBox: [box[0] ?? 0, box[1] ?? 0, box[2] ?? 612, box[3] ?? 792],
        rotate: page.rotate ?? 0,
      });
      page.cleanup();
      onPage?.(number, document.numPages);
    }

    return pages;
  } finally {
    await task.destroy();
  }
}

/**
 * Recognise an axis-aligned rectangle written as `moveTo` plus three `lineTo`s
 * plus `closePath`, which is how a filled cell border reaches us.
 *
 * Returning the rectangle rather than four separate segments matters: as four
 * segments, a 0.8pt-tall border contributes two horizontal rules 0.8pt apart
 * *and* two verticals 340pt apart, and the verticals are nonsense that the
 * grid builder would have to reject. As a rectangle it is one clean rule.
 */
export function closedRectangle(
  data: ArrayLike<number>,
): { x: number; y: number; width: number; height: number } | null {
  // Walk the opcodes rather than assume a length: the same rectangle reaches
  // us as `moveTo + 3×lineTo + closePath` (13 numbers), as a fourth `lineTo`
  // back to the start instead of the close (16), or as both (17).
  const xs: number[] = [];
  const ys: number[] = [];
  let index = 0;
  while (index < data.length) {
    const op = data[index++];
    if (op === 0 || op === 1) {
      if (index + 1 >= data.length) return null;
      xs.push(data[index++] as number);
      ys.push(data[index++] as number);
      continue;
    }
    if (op === 4) continue; // closePath carries no coordinates
    return null; // a curve, so not a rectangle
  }

  // A repeated final point is the explicit return to the start.
  if (
    xs.length === 5 &&
    xs[4] === xs[0] &&
    ys[4] === ys[0]
  ) {
    xs.pop();
    ys.pop();
  }
  if (xs.length !== 4) return null;

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  // Every corner must sit on a corner of the bounding box, or this is a
  // quadrilateral that merely contains one.
  for (let i = 0; i < 4; i += 1) {
    const onVertical = xs[i] === minX || xs[i] === maxX;
    const onHorizontal = ys[i] === minY || ys[i] === maxY;
    if (!onVertical || !onHorizontal) return null;
  }
  // Four distinct corners, not a degenerate line drawn as a path.
  if (maxX === minX || maxY === minY) return null;

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
