'use client';

import {
  AlertCircle,
  ArrowDownToLine,
  CheckCircle2,
  FileText,
  HelpCircle,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { announceCompletion } from '@/lib/completion';
import {
  applyRedaction,
  type RedactionResult,
} from '@/lib/tools/pdf/apply-redaction';
import {
  createManualTarget,
  findDetectionTargets,
  findSearchTargets,
  loadPdfTextModels,
  type PageTextModel,
  type RedactionRect,
  type RedactionTarget,
} from '@/lib/tools/pdf/redaction-targets';
import type { DetectionCategory } from '@/lib/tools/redaction/detectors';

const RENDER_WIDTH = 720;

interface ViewportMeta {
  width: number;
  height: number;
  viewBox: readonly [number, number, number, number];
  scale: number;
}

export function PdfRedactTool(): React.ReactElement {
  const [file, setFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pageModels, setPageModels] = useState<PageTextModel[]>([]);
  const [pageCount, setPageCount] = useState<number>(0);
  const [hasTextLayer, setHasTextLayer] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Redaction targets
  const [targets, setTargets] = useState<RedactionTarget[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);

  // Tool Modes
  const [activeTab, setActiveTab] = useState<'search' | 'detect' | 'manual'>(
    'search',
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [caseSensitive, setCaseSensitive] = useState<boolean>(false);
  const [wholeWord, setWholeWord] = useState<boolean>(false);

  // Detection categories
  const [selectedCategories, setSelectedCategories] = useState<
    Set<DetectionCategory>
  >(new Set(['email', 'card', 'ip', 'key', 'private-key']));

  // DPI Setting
  const [dpi, setDpi] = useState<150 | 200 | 300>(200);

  // Export State
  const [processing, setProcessing] = useState<boolean>(false);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [result, setResult] = useState<RedactionResult | null>(null);
  const [executionTimeMs, setExecutionTimeMs] = useState<number>(0);

  // Canvas & Viewport
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [viewportMeta, setViewportMeta] = useState<ViewportMeta | null>(null);
  const [drawingBox, setDrawingBox] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  // Reset when file changes
  const handleFile = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setTargets([]);
    setSelectedTargetId(null);
    setResult(null);
    setErrorMessage(null);
    setLoading(true);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      setPdfBytes(bytes);

      const loaded = await loadPdfTextModels(bytes);
      setPageModels(loaded.models);
      setPageCount(loaded.pageCount);
      setHasTextLayer(loaded.hasTextLayer);
      setCurrentPage(1);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to parse PDF document.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Render current page to canvas
  useEffect(() => {
    if (!pdfBytes || pageCount === 0) return;
    let cancelled = false;

    async function renderPage() {
      const canvas = canvasRef.current;
      if (!canvas || !pdfBytes) return;

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
            /* worker fallback */
          }
        }

        const copy = new Uint8Array(pdfBytes.length);
        copy.set(pdfBytes);
        const task = pdfjs.getDocument({ data: copy, useSystemFonts: false });
        const doc = await task.promise;
        if (cancelled) return;

        const page = await doc.getPage(currentPage);
        const unscaled = page.getViewport({ scale: 1 });
        const scale = RENDER_WIDTH / unscaled.width;
        const viewport = page.getViewport({ scale });
        const ratio = Math.min(globalThis.devicePixelRatio || 1, 2);

        canvas.width = Math.floor(viewport.width * ratio);
        canvas.height = Math.floor(viewport.height * ratio);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        ctx.clearRect(0, 0, viewport.width, viewport.height);

        await page.render({ canvas, canvasContext: ctx, viewport }).promise;
        if (cancelled) return;

        setViewportMeta({
          width: viewport.width,
          height: viewport.height,
          viewBox: unscaled.viewBox as [number, number, number, number],
          scale,
        });
      } catch (err) {
        if (!cancelled) {
          setErrorMessage(
            err instanceof Error
              ? `Render error: ${err.message}`
              : 'Failed to render page preview.',
          );
        }
      }
    }

    void renderPage();

    return () => {
      cancelled = true;
    };
  }, [pdfBytes, currentPage, pageCount]);

  // Convert PDF User Coordinates to Viewport CSS Pixels
  const pdfToViewportRect = useCallback(
    (rect: RedactionRect) => {
      if (!viewportMeta) return { left: 0, top: 0, width: 0, height: 0 };
      const [, y0, , y1] = viewportMeta.viewBox;
      const pageHeightPt = y1 - y0 || 792;

      // In PDF user space: y is distance from bottom.
      // Top in CSS: (pageHeight - (y + height)) * scale
      const left = rect.x * viewportMeta.scale;
      const top = (pageHeightPt - (rect.y + rect.height)) * viewportMeta.scale;
      const width = rect.width * viewportMeta.scale;
      const height = rect.height * viewportMeta.scale;

      return { left, top, width, height };
    },
    [viewportMeta],
  );

  // Convert Viewport CSS Pixels to PDF User Points
  const viewportToPdfRect = useCallback(
    (cssRect: {
      left: number;
      top: number;
      width: number;
      height: number;
    }): RedactionRect => {
      if (!viewportMeta) return { x: 0, y: 0, width: 0, height: 0 };
      const [, y0, , y1] = viewportMeta.viewBox;
      const pageHeightPt = y1 - y0 || 792;

      const x = cssRect.left / viewportMeta.scale;
      const width = cssRect.width / viewportMeta.scale;
      const height = cssRect.height / viewportMeta.scale;
      const y =
        pageHeightPt - (cssRect.top + cssRect.height) / viewportMeta.scale;

      return {
        x: Math.round(x * 100) / 100,
        y: Math.round(y * 100) / 100,
        width: Math.round(width * 100) / 100,
        height: Math.round(height * 100) / 100,
      };
    },
    [viewportMeta],
  );

  // Search Action
  const handleSearchRedact = useCallback(() => {
    if (!searchQuery.trim()) return;
    const found = findSearchTargets(pageModels, searchQuery, {
      caseSensitive,
      wholeWord,
    });
    if (found.length === 0) {
      setErrorMessage(`No occurrences of "${searchQuery}" found in document.`);
      return;
    }
    setErrorMessage(null);
    setTargets((prev) => [...prev, ...found]);
  }, [pageModels, searchQuery, caseSensitive, wholeWord]);

  // Detection Action
  const handleDetectSecrets = useCallback(() => {
    const found = findDetectionTargets(pageModels, {
      categories: selectedCategories,
    });
    if (found.length === 0) {
      setErrorMessage(
        'No secrets matching selected categories found in document.',
      );
      return;
    }
    setErrorMessage(null);
    setTargets((prev) => [...prev, ...found]);
  }, [pageModels, selectedCategories]);

  // Add Manual Box via button
  const handleAddDefaultBox = useCallback(() => {
    if (!viewportMeta) return;
    const newTarget = createManualTarget(currentPage, {
      x: 100,
      y: 400,
      width: 150,
      height: 30,
    });
    setTargets((prev) => [...prev, newTarget]);
    setSelectedTargetId(newTarget.id);
  }, [currentPage, viewportMeta]);

  // Mouse Drag to Draw Box
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (activeTab !== 'manual') return;
      const rect = overlayRef.current?.getBoundingClientRect();
      if (!rect) return;
      const startX = e.clientX - rect.left;
      const startY = e.clientY - rect.top;
      setDrawingBox({ startX, startY, currentX: startX, currentY: startY });
    },
    [activeTab],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!drawingBox) return;
      const rect = overlayRef.current?.getBoundingClientRect();
      if (!rect) return;
      const currentX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const currentY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
      setDrawingBox((prev) => (prev ? { ...prev, currentX, currentY } : null));
    },
    [drawingBox],
  );

  const handleMouseUp = useCallback(() => {
    if (!drawingBox) return;
    const left = Math.min(drawingBox.startX, drawingBox.currentX);
    const top = Math.min(drawingBox.startY, drawingBox.currentY);
    const width = Math.abs(drawingBox.currentX - drawingBox.startX);
    const height = Math.abs(drawingBox.currentY - drawingBox.startY);
    setDrawingBox(null);

    // Ignore tiny accidental clicks
    if (width < 8 || height < 8) return;

    const pdfRect = viewportToPdfRect({ left, top, width, height });
    const target = createManualTarget(currentPage, pdfRect);
    setTargets((prev) => [...prev, target]);
    setSelectedTargetId(target.id);
  }, [drawingBox, viewportToPdfRect, currentPage]);

  // Remove target
  const handleRemoveTarget = useCallback((id: string) => {
    setTargets((prev) => prev.filter((t) => t.id !== id));
    setSelectedTargetId((prev) => (prev === id ? null : prev));
  }, []);

  // Keyboard navigation for selected box
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, targetId: string) => {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        handleRemoveTarget(targetId);
        return;
      }
      const delta = e.shiftKey ? 10 : 1;
      setTargets((prev) =>
        prev.map((t) => {
          if (t.id !== targetId) return t;
          let { x, y } = t.rect;
          if (e.key === 'ArrowLeft') x -= delta;
          if (e.key === 'ArrowRight') x += delta;
          if (e.key === 'ArrowUp') y += delta;
          if (e.key === 'ArrowDown') y -= delta;
          return {
            ...t,
            rect: {
              ...t.rect,
              x: Math.round(x * 100) / 100,
              y: Math.round(y * 100) / 100,
            },
          };
        }),
      );
    },
    [handleRemoveTarget],
  );

  // Apply Redaction
  const handleApplyRedaction = useCallback(async () => {
    if (!pdfBytes) return;
    if (targets.length === 0) {
      setErrorMessage(
        'No redactions defined. Please mark text, detect secrets, or draw boxes to redact.',
      );
      return;
    }

    setProcessing(true);
    setErrorMessage(null);
    const startTime = performance.now();

    try {
      const redactionResult = await applyRedaction(pdfBytes, targets, {
        dpi,
        onProgress: (current, total, phase) => {
          setProgressStatus(`[${current}/${total}] ${phase}`);
        },
      });

      const elapsed = Math.round(performance.now() - startTime);
      setExecutionTimeMs(elapsed);
      setResult(redactionResult);

      announceCompletion({
        operation: 'PDF Redacted',
        summary: `Burned ${targets.length} redactions across ${redactionResult.redactedPagesCount} pages with metadata purged.`,
        durationMs: elapsed,
        metrics: [
          {
            label: 'Redacted Pages',
            value: String(redactionResult.redactedPagesCount),
          },
          { label: 'Total Redactions', value: String(targets.length) },
          {
            label: 'Untouched Pages',
            value: String(redactionResult.unredactedPagesCount),
          },
          { label: 'Resolution DPI', value: String(dpi) },
        ],
      });
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to apply redaction.',
      );
    } finally {
      setProcessing(false);
      setProgressStatus('');
    }
  }, [pdfBytes, targets, dpi]);

  // Download Redacted Document
  const handleDownload = useCallback(() => {
    if (!result || !file) return;
    const blob = new Blob([new Uint8Array(result.bytes)], {
      type: 'application/pdf',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const base = file.name.replace(/\.pdf$/i, '');
    a.href = url;
    a.download = `${base}-redacted.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }, [result, file]);

  // Page specific targets
  const currentPageTargets = useMemo(
    () => targets.filter((t) => t.pageNumber === currentPage),
    [targets, currentPage],
  );

  return (
    <AppShell currentToolId="pdf-redact" currentGroupId="pdf">
      <section id="tool" tabIndex={-1} className="mx-auto max-w-6xl space-y-6">
        {/* Title and Purpose */}
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Black Out PDF & True Redaction
          </h1>
          <p className="text-muted-foreground">
            True client-side redaction that physically rasterises blacked-out
            pages so words, names, and sensitive data cannot be recovered by
            copying, searching, or decompiling. Zero cloud uploads.
          </p>
        </div>

        {/* Empty State: File Upload */}
        {!file && (
          <div className="rounded-lg border-2 border-dashed border-border bg-muted/20 p-12 text-center">
            <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
            <h2 className="mt-4 text-lg font-medium text-foreground">
              Select or Drop a PDF to Redact
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Supports legal contracts, bank statements, medical records, and
              scanned forms.
            </p>
            <div className="mt-6 flex justify-center">
              <label
                htmlFor="pdf-file-upload"
                className="cursor-pointer rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90 focus-within:ring-2 focus-within:ring-ring"
              >
                <span>Choose PDF file</span>
                <input
                  id="pdf-file-upload"
                  type="file"
                  accept=".pdf,application/pdf"
                  className="sr-only"
                  onChange={(e) => {
                    const picked = e.target.files?.[0];
                    if (picked) void handleFile(picked);
                  }}
                />
              </label>
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="flex items-center justify-center space-y-2 rounded-lg border border-border p-8 text-center">
            <RefreshCw className="h-6 w-6 animate-spin text-foreground" />
            <span className="ml-3 text-sm text-muted-foreground">
              Reading PDF geometry and text layer...
            </span>
          </div>
        )}

        {/* Error Notification */}
        {errorMessage && (
          <div
            role="alert"
            className="flex items-start space-x-3 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive"
          >
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div className="flex-1 font-medium">{errorMessage}</div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-destructive/70 hover:text-destructive"
              aria-label="Dismiss error"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Active Redaction Workspace */}
        {file && !loading && (
          <div className="space-y-6">
            {/* Scanned Document Notice if no text layer */}
            {!hasTextLayer && (
              <section
                aria-label="Scanned Document Notice"
                className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground"
              >
                <div className="flex items-start space-x-2">
                  <HelpCircle className="h-5 w-5 shrink-0 text-foreground" />
                  <div>
                    <span className="font-semibold text-foreground">
                      Scanned PDF / No Text Layer:{' '}
                    </span>
                    This document does not carry an embedded text layer. Search
                    and automated PII detection require digital text, but you
                    can draw manual black boxes directly on the page.
                  </div>
                </div>
              </section>
            )}

            {/* Top Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card p-4">
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-foreground" />
                <div>
                  <div className="text-sm font-medium text-foreground">
                    {file.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {pageCount} page{pageCount === 1 ? '' : 's'} ·{' '}
                    {(file.size / 1024).toFixed(1)} KB
                  </div>
                </div>
              </div>

              {/* Page Navigator */}
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous Page"
                >
                  Previous
                </Button>
                <span className="text-sm font-medium text-foreground">
                  Page {currentPage} of {pageCount}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= pageCount}
                  onClick={() =>
                    setCurrentPage((p) => Math.min(pageCount, p + 1))
                  }
                  aria-label="Next Page"
                >
                  Next
                </Button>
              </div>

              {/* Quality DPI Selection */}
              <div className="flex items-center space-x-2">
                <span className="text-xs text-muted-foreground">
                  Raster DPI:
                </span>
                {([150, 200, 300] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setDpi(level)}
                    className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                      dpi === level
                        ? 'bg-foreground text-background'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Mode Controls & Target Builder */}
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex space-x-4 border-b border-border pb-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('search')}
                  className={`flex items-center space-x-2 pb-1 text-sm font-medium transition-colors ${
                    activeTab === 'search'
                      ? 'border-b-2 border-foreground text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Search className="h-4 w-4" />
                  <span>Search Text</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('detect')}
                  className={`flex items-center space-x-2 pb-1 text-sm font-medium transition-colors ${
                    activeTab === 'detect'
                      ? 'border-b-2 border-foreground text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <ShieldAlert className="h-4 w-4" />
                  <span>Detect Secrets</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('manual')}
                  className={`flex items-center space-x-2 pb-1 text-sm font-medium transition-colors ${
                    activeTab === 'manual'
                      ? 'border-b-2 border-foreground text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Plus className="h-4 w-4" />
                  <span>Draw / Manual Box</span>
                </button>
              </div>

              {/* Tab 1: Search Text */}
              {activeTab === 'search' && (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-[240px]">
                    <label htmlFor="search-redact-input" className="sr-only">
                      Search Text to Redact
                    </label>
                    <input
                      id="search-redact-input"
                      type="text"
                      placeholder="e.g. John Doe, Confidential, $500,000"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSearchRedact();
                      }}
                      className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <label className="flex items-center space-x-1.5 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={caseSensitive}
                      onChange={(e) => setCaseSensitive(e.target.checked)}
                      className="rounded border-border"
                    />
                    <span>Case Sensitive</span>
                  </label>

                  <label className="flex items-center space-x-1.5 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={wholeWord}
                      onChange={(e) => setWholeWord(e.target.checked)}
                      className="rounded border-border"
                    />
                    <span>Whole Word</span>
                  </label>

                  <Button
                    size="sm"
                    onClick={handleSearchRedact}
                    disabled={!searchQuery.trim()}
                  >
                    Mark Occurrences
                  </Button>
                </div>
              )}

              {/* Tab 2: Detect Secrets */}
              {activeTab === 'detect' && (
                <div className="mt-4 flex flex-wrap items-center gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    {(
                      [
                        { id: 'email', label: 'Email Addresses' },
                        { id: 'card', label: 'Credit Cards (Luhn)' },
                        { id: 'ip', label: 'IP Addresses' },
                        { id: 'key', label: 'API Keys' },
                        { id: 'private-key', label: 'Private Keys' },
                      ] as const
                    ).map((cat) => (
                      <label
                        key={cat.id}
                        className="flex items-center space-x-1.5 text-xs text-foreground"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCategories.has(cat.id)}
                          onChange={(e) => {
                            setSelectedCategories((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(cat.id);
                              else next.delete(cat.id);
                              return next;
                            });
                          }}
                          className="rounded border-border"
                        />
                        <span>{cat.label}</span>
                      </label>
                    ))}
                  </div>

                  <Button
                    size="sm"
                    onClick={handleDetectSecrets}
                    disabled={selectedCategories.size === 0}
                  >
                    Scan & Mark PII
                  </Button>
                </div>
              )}

              {/* Tab 3: Manual Drawing */}
              {activeTab === 'manual' && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Click and drag across the page preview below to draw a
                    black-out rectangle, or add a box directly.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAddDefaultBox}
                  >
                    Add Box to Page
                  </Button>
                </div>
              )}
            </div>

            {/* Interactive Preview & Redaction Overlay */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
              {/* Left 3 cols: Canvas and Overlaid Redaction Boxes */}
              <div className="lg:col-span-3">
                <div className="relative overflow-auto rounded-lg border border-border bg-muted/10 p-4 text-center">
                  <div
                    ref={overlayRef}
                    role="presentation"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    className={`relative mx-auto inline-block select-none shadow-sm ${
                      activeTab === 'manual'
                        ? 'cursor-crosshair'
                        : 'cursor-default'
                    }`}
                  >
                    <canvas
                      ref={canvasRef}
                      className="block rounded bg-white"
                    />

                    {/* Overlaid DOM Redaction Rectangles */}
                    {viewportMeta &&
                      currentPageTargets.map((target) => {
                        const css = pdfToViewportRect(target.rect);
                        const isSelected = selectedTargetId === target.id;

                        return (
                          <div
                            key={target.id}
                            style={{
                              position: 'absolute',
                              left: `${css.left}px`,
                              top: `${css.top}px`,
                              width: `${css.width}px`,
                              height: `${css.height}px`,
                            }}
                            className="group"
                          >
                            <button
                              type="button"
                              aria-label={`Redaction box: ${target.label}. Use arrow keys to nudge, backspace to delete.`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTargetId(target.id);
                              }}
                              onKeyDown={(e) => handleKeyDown(e, target.id)}
                              className={`h-full w-full bg-black transition-all ${
                                isSelected
                                  ? 'ring-2 ring-foreground ring-offset-2'
                                  : 'hover:ring-1 hover:ring-foreground/50'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveTarget(target.id);
                              }}
                              className="absolute -right-2 -top-2 hidden h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-90 hover:opacity-100 group-hover:flex"
                              aria-label="Delete redaction box"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}

                    {/* Temporary Dragging Box Preview */}
                    {drawingBox && (
                      <div
                        style={{
                          position: 'absolute',
                          left: `${Math.min(drawingBox.startX, drawingBox.currentX)}px`,
                          top: `${Math.min(drawingBox.startY, drawingBox.currentY)}px`,
                          width: `${Math.abs(drawingBox.currentX - drawingBox.startX)}px`,
                          height: `${Math.abs(drawingBox.currentY - drawingBox.startY)}px`,
                        }}
                        className="pointer-events-none border border-foreground bg-black/80"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Right 1 col: Redaction List & Actions */}
              <div className="space-y-4 lg:col-span-1">
                <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">
                      Staged Redactions ({targets.length})
                    </span>
                    {targets.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setTargets([])}
                        className="text-xs text-destructive hover:underline"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {targets.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No redactions staged yet. Use text search, detect PII, or
                      draw boxes.
                    </p>
                  ) : (
                    <ul className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                      {targets.map((t) => (
                        <li
                          key={t.id}
                          className={`flex items-start justify-between rounded p-1 text-xs transition-colors ${
                            selectedTargetId === t.id
                              ? 'bg-muted text-foreground font-medium'
                              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentPage(t.pageNumber);
                              setSelectedTargetId(t.id);
                            }}
                            className="flex-1 pr-2 truncate text-left"
                          >
                            <span className="font-semibold text-foreground">
                              P{t.pageNumber}:{' '}
                            </span>
                            <span>{t.label}</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveTarget(t.id);
                            }}
                            className="p-1 text-muted-foreground hover:text-destructive"
                            aria-label="Remove redaction"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="pt-2 border-t border-border">
                    <Button
                      onClick={handleApplyRedaction}
                      disabled={processing || targets.length === 0}
                      className="w-full"
                    >
                      {processing
                        ? 'Rasterising...'
                        : 'Apply Redactions & Export'}
                    </Button>
                    {progressStatus && (
                      <p className="mt-2 text-center text-xs text-muted-foreground animate-pulse">
                        {progressStatus}
                      </p>
                    )}
                  </div>
                </div>

                {/* Honest Architectural Guarantee Notice */}
                <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground space-y-1.5">
                  <span className="font-semibold text-foreground block">
                    True Redaction Contract:
                  </span>
                  <p>
                    Redacted pages are rasterised into pixel images without a
                    text layer. Words cannot be recovered by text extractors or
                    stream analyzers.
                  </p>
                  <p>
                    Untouched pages remain native searchable text. Document
                    metadata, bookmarks, annotations, and attachments are
                    purged.
                  </p>
                </div>
              </div>
            </div>

            {/* Results & Verification Panel */}
            {result && (
              <section
                aria-label="Redaction Results"
                className="rounded-lg border border-border bg-card p-6 space-y-4"
              >
                <div className="flex items-center space-x-2 text-foreground">
                  <CheckCircle2 className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">
                    Redaction Complete & Verified
                  </h3>
                </div>

                {/* Facts Grid */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="rounded border border-border p-3">
                    <div className="text-xs text-muted-foreground">
                      Pages Redacted (Rasterised)
                    </div>
                    <div className="text-xl font-semibold text-foreground">
                      {result.redactedPagesCount}
                    </div>
                  </div>
                  <div className="rounded border border-border p-3">
                    <div className="text-xs text-muted-foreground">
                      Pages Preserved (Vector Text)
                    </div>
                    <div className="text-xl font-semibold text-foreground">
                      {result.unredactedPagesCount}
                    </div>
                  </div>
                  <div className="rounded border border-border p-3">
                    <div className="text-xs text-muted-foreground">
                      Total Redactions Burned
                    </div>
                    <div className="text-xl font-semibold text-foreground">
                      {result.totalRedactionsCount}
                    </div>
                  </div>
                  <div className="rounded border border-border p-3">
                    <div className="text-xs text-muted-foreground">
                      Processing Time
                    </div>
                    <div className="text-xl font-semibold text-foreground">
                      {executionTimeMs} ms
                    </div>
                  </div>
                </div>

                {/* Cleaned Leaks Summary */}
                <div className="rounded border border-border bg-muted/10 p-3 text-xs text-muted-foreground space-y-1">
                  <span className="font-medium text-foreground">
                    Document Sanitation Audit:
                  </span>
                  <ul className="list-inside list-disc space-y-0.5">
                    <li>
                      Document Information (/Info) Dictionary cleared (Author,
                      Title, Producer removed).
                    </li>
                    <li>XMP Metadata XML packets purged.</li>
                    <li>Document Outlines and Bookmarks removed.</li>
                    <li>
                      Names tree, embedded files, and JavaScript triggers
                      removed.
                    </li>
                    <li>
                      Annotations and comment layers stripped from all pages.
                    </li>
                  </ul>
                </div>

                {/* Download Button */}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-muted-foreground">
                    Output size: {(result.bytes.byteLength / 1024).toFixed(1)}{' '}
                    KB ({dpi} DPI)
                  </span>
                  <Button
                    onClick={handleDownload}
                    data-receipt-download="true"
                    className="flex items-center space-x-2"
                  >
                    <ArrowDownToLine className="h-4 w-4" />
                    <span>Download Redacted PDF</span>
                  </Button>
                </div>
              </section>
            )}
          </div>
        )}
      </section>
    </AppShell>
  );
}
