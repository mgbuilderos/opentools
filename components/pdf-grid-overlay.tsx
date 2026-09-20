'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  addColumnEdge,
  moveColumnEdge,
  removeColumnEdge,
} from '@/lib/tools/pdf/grid-editing';

/**
 * The page, with the grid drawn on it, and the dividers movable.
 *
 * This is the part that makes the tool trustworthy rather than merely clever.
 * Every converter — ours included, until now — hands back a table and asks you
 * to believe it. When a column lands in the wrong place the table looks
 * plausible and is wrong, and you find out weeks later in the reconciliation.
 *
 * Showing the page with the dividers on it collapses that: a divider through
 * the middle of a description is visible in one glance, and dragging it is the
 * whole repair. It is what Tabula does, and it is the reason people trust
 * Tabula's output over a cleverer black box.
 *
 * ## The dividers are DOM, not canvas
 *
 * Only the page image is painted into the canvas. Each divider is a real
 * `<button>` positioned over it, for three reasons: it can be focused and
 * moved with the arrow keys, so the feature is not mouse-only; it carries an
 * accessible name, so a screen reader can say which divider is which; and a
 * browser test can address it by role and name instead of clicking at a
 * pixel that shifts when the layout does.
 */

export interface PdfGridOverlayProps {
  /** The PDF bytes. Held by the caller; this component never keeps a copy. */
  bytes: Uint8Array;
  pageNumber: number;
  pageCount: number;
  onPageChange: (pageNumber: number) => void;
  /** Column divider positions in PDF user space, ascending. */
  columnEdges: readonly number[];
  /** Row divider positions in PDF user space, descending. */
  rowEdges: readonly number[];
  onColumnEdgesChange: (edges: number[]) => void;
  /** Whether those edges were read from drawn rules or inferred from spacing. */
  source: 'rules' | 'spacing';
}

/** Render width in CSS pixels. The canvas is drawn at device resolution. */
const RENDER_WIDTH = 720;

/** Arrow-key nudge, in PDF points. Shift multiplies it. */
const NUDGE = 1;
const NUDGE_FAST = 10;

interface Rendered {
  width: number;
  height: number;
  /** PDF user-space box, `[x0, y0, x1, y1]`. */
  viewBox: readonly [number, number, number, number];
}

export function PdfGridOverlay({
  bytes,
  pageNumber,
  pageCount,
  onPageChange,
  columnEdges,
  rowEdges,
  onColumnEdgesChange,
  source,
}: PdfGridOverlayProps): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [rendered, setRendered] = useState<Rendered | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    let task: { destroy: () => Promise<void> } | null = null;

    async function draw(): Promise<void> {
      const canvas = canvasRef.current;
      if (!canvas) return;
      try {
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
        if (
          !pdfjs.GlobalWorkerOptions.workerSrc &&
          typeof Worker !== 'undefined'
        ) {
          try {
            const workerModule =
              await import('pdfjs-dist/legacy/build/pdf.worker.mjs?url');
            if (workerModule.default) {
              pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default;
            }
          } catch {
            /* the library resolves its own worker */
          }
        }
        // Its own copy: pdf.js takes ownership of the buffer it is handed, and
        // the caller still needs these bytes for re-extraction.
        const copy = new Uint8Array(bytes.length);
        copy.set(bytes);
        const loading = pdfjs.getDocument({
          data: copy,
          useSystemFonts: false,
        });
        task = loading;
        const document = await loading.promise;
        if (cancelled) return;
        const page = await document.getPage(pageNumber);
        const base = page.getViewport({ scale: 1 });
        const scale = RENDER_WIDTH / base.width;
        const viewport = page.getViewport({ scale });
        const ratio = Math.min(globalThis.devicePixelRatio || 1, 2);

        canvas.width = Math.floor(viewport.width * ratio);
        canvas.height = Math.floor(viewport.height * ratio);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        const context = canvas.getContext('2d');
        if (!context) return;
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.clearRect(0, 0, viewport.width, viewport.height);
        await page.render({ canvas, canvasContext: context, viewport }).promise;
        if (cancelled) return;

        const box = base.viewBox as number[];
        setRendered({
          width: viewport.width,
          height: viewport.height,
          viewBox: [box[0] ?? 0, box[1] ?? 0, box[2] ?? 612, box[3] ?? 792],
        });
        setRenderError(null);
      } catch (error) {
        if (cancelled) return;
        // Refuse by name. A blank frame reads as "the tool is broken".
        setRenderError(
          error instanceof Error
            ? `This page could not be drawn (${error.message}). The table below was still extracted.`
            : 'This page could not be drawn. The table below was still extracted.',
        );
      }
    }

    void draw();
    return () => {
      cancelled = true;
      void task?.destroy();
    };
  }, [bytes, pageNumber]);

  /** PDF user-space x → CSS pixels from the frame's left edge. */
  const toPixels = useCallback(
    (x: number): number => {
      if (!rendered) return 0;
      const [x0, , x1] = rendered.viewBox;
      const span = x1 - x0 || 1;
      return ((x - x0) / span) * rendered.width;
    },
    [rendered],
  );

  const toPdfX = useCallback(
    (pixels: number): number => {
      if (!rendered) return 0;
      const [x0, , x1] = rendered.viewBox;
      const span = x1 - x0 || 1;
      return x0 + (pixels / rendered.width) * span;
    },
    [rendered],
  );

  const toPixelsY = useCallback(
    (y: number): number => {
      if (!rendered) return 0;
      const [, y0, , y1] = rendered.viewBox;
      const span = y1 - y0 || 1;
      // PDF y grows upward; the canvas grows downward.
      return ((y1 - y) / span) * rendered.height;
    },
    [rendered],
  );

  const moveEdge = useCallback(
    (index: number, nextX: number) => {
      onColumnEdgesChange(moveColumnEdge(columnEdges, index, nextX));
    },
    [columnEdges, onColumnEdgesChange],
  );

  useEffect(() => {
    if (dragging === null) return;
    const frame = frameRef.current;
    if (!frame) return;

    const onMove = (event: PointerEvent): void => {
      const rect = frame.getBoundingClientRect();
      moveEdge(dragging, toPdfX(event.clientX - rect.left));
    };
    const onUp = (): void => setDragging(null);

    globalThis.addEventListener('pointermove', onMove);
    globalThis.addEventListener('pointerup', onUp);
    globalThis.addEventListener('pointercancel', onUp);
    return () => {
      globalThis.removeEventListener('pointermove', onMove);
      globalThis.removeEventListener('pointerup', onUp);
      globalThis.removeEventListener('pointercancel', onUp);
    };
  }, [dragging, moveEdge, toPdfX]);

  const addDivider = useCallback(() => {
    onColumnEdgesChange(addColumnEdge(columnEdges));
  }, [columnEdges, onColumnEdgesChange]);

  const removeEdge = useCallback(
    (index: number) => {
      onColumnEdgesChange(removeColumnEdge(columnEdges, index));
    },
    [columnEdges, onColumnEdgesChange],
  );

  const rowLines = useMemo(
    () => (rendered ? rowEdges.map((y) => toPixelsY(y)) : []),
    [rendered, rowEdges, toPixelsY],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {source === 'rules'
            ? 'Columns read from the lines drawn in this PDF.'
            : 'This PDF draws no table lines, so the columns were worked out from the spacing. Check them.'}{' '}
          Drag a divider to move it, or focus one and use the arrow keys.
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pageNumber - 1)}
            disabled={pageNumber <= 1}
          >
            Previous page
          </Button>
          <span className="text-sm tabular-nums text-muted-foreground">
            Page {pageNumber} of {pageCount}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pageNumber + 1)}
            disabled={pageNumber >= pageCount}
          >
            Next page
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addDivider}
          >
            Add divider
          </Button>
        </div>
      </div>

      {renderError ? (
        <output className="block rounded border border-destructive/40 bg-destructive/5 p-3 text-sm text-foreground">
          {renderError}
        </output>
      ) : null}

      <div className="overflow-x-auto">
        <div
          ref={frameRef}
          className="relative mx-auto w-max border border-border bg-card"
          data-testid="pdf-grid-frame"
        >
          <canvas ref={canvasRef} className="block" />

          {rendered
            ? rowLines.map((top, index) => (
                <div
                  key={`row-${index}`}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-foreground/25"
                  style={{ top }}
                />
              ))
            : null}

          {rendered
            ? columnEdges.map((edge, index) => {
                const isOuter = index === 0 || index === columnEdges.length - 1;
                return (
                  <button
                    key={`column-${index}`}
                    type="button"
                    data-testid="column-divider"
                    aria-label={`Column divider ${index + 1} of ${columnEdges.length}${
                      isOuter ? ', edge of the table' : ''
                    }. Arrow keys move it${isOuter ? '' : ', Delete removes it'}.`}
                    className="absolute top-0 bottom-0 w-4 -translate-x-1/2 cursor-col-resize bg-transparent focus:outline-none"
                    style={{ left: toPixels(edge) }}
                    onPointerDown={(event) => {
                      event.preventDefault();
                      setDragging(index);
                    }}
                    onKeyDown={(event) => {
                      const step = event.shiftKey ? NUDGE_FAST : NUDGE;
                      if (event.key === 'ArrowLeft') {
                        event.preventDefault();
                        moveEdge(index, edge - step);
                      } else if (event.key === 'ArrowRight') {
                        event.preventDefault();
                        moveEdge(index, edge + step);
                      } else if (
                        event.key === 'Delete' ||
                        event.key === 'Backspace'
                      ) {
                        event.preventDefault();
                        removeEdge(index);
                      }
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className={[
                        'pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2',
                        isOuter ? 'bg-foreground/45' : 'bg-foreground',
                      ].join(' ')}
                    />
                  </button>
                );
              })
            : null}
        </div>
      </div>
    </div>
  );
}
