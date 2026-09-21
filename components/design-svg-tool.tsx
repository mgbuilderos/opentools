'use client';

import {
  AlertTriangle,
  ArrowDownToLine,
  Code2,
  Copy,
  FileImage,
  FilePlus2,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UploadCloud,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

import { AppShell } from '@/components/app-shell';
import {
  BatchLocalPromise,
  BatchRunnerPanel,
  useFileBatchRunner,
} from '@/components/batch-runner';
import { Button } from '@/components/ui/button';
import { announceCompletion } from '@/lib/completion';
import {
  getSvgDimensions,
  optimizeSvg,
  renderSvgToRaster,
  type SvgDimensions,
  type SvgOptimizeResult,
} from '@/lib/tools/design/svg';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function DesignSvgTool() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const precisionId = useId();

  const [rawSvg, setRawSvg] = useState<string>('');
  const [filename, setFilename] = useState<string>('vector.svg');
  const [precision, setPrecision] = useState<number>(2);
  const [removeMetadata, setRemoveMetadata] = useState<boolean>(true);
  const [removeComments, setRemoveComments] = useState<boolean>(true);
  const [removeEmptyGroups, setRemoveEmptyGroups] = useState<boolean>(true);

  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [scale, setScale] = useState<number>(2);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const batch = useFileBatchRunner();

  const [pngUrl, setPngUrl] = useState<string | null>(null);
  const [webpUrl, setWebpUrl] = useState<string | null>(null);

  // Compute optimized SVG
  const optimizeResult: SvgOptimizeResult | null = useMemo(() => {
    if (!rawSvg.trim()) return null;
    try {
      return optimizeSvg(rawSvg, {
        precision,
        removeMetadata,
        removeComments,
        removeEmptyGroups,
      });
    } catch {
      return null;
    }
  }, [rawSvg, precision, removeMetadata, removeComments, removeEmptyGroups]);

  const dimensions: SvgDimensions | null = useMemo(() => {
    if (!optimizeResult) return null;
    return getSvgDimensions(optimizeResult.optimizedSvg);
  }, [optimizeResult]);

  // Object URL for preview and download
  const svgUrl: string | null = useMemo(() => {
    if (!optimizeResult) return null;
    const blob = new Blob([optimizeResult.optimizedSvg], {
      type: 'image/svg+xml;charset=utf-8',
    });
    return URL.createObjectURL(blob);
  }, [optimizeResult]);

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (svgUrl) URL.revokeObjectURL(svgUrl);
      if (pngUrl) URL.revokeObjectURL(pngUrl);
      if (webpUrl) URL.revokeObjectURL(webpUrl);
    };
  }, [svgUrl, pngUrl, webpUrl]);

  const resetAll = useCallback(() => {
    batch.reset();
    setBatchFiles([]);
    setRawSvg('');
    setFilename('vector.svg');
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (pngUrl) URL.revokeObjectURL(pngUrl);
    if (webpUrl) URL.revokeObjectURL(webpUrl);
    setPngUrl(null);
    setWebpUrl(null);
  }, [batch, pngUrl, webpUrl]);

  const handleFiles = async (fileList: FileList | File[]) => {
    setErrorMessage(null);
    const selected = Array.from(fileList);
    if (selected.length === 0 || isProcessing || batch.running) return;
    if (selected.length > 1) {
      setRawSvg('');
      setFilename('vector.svg');
      if (pngUrl) URL.revokeObjectURL(pngUrl);
      if (webpUrl) URL.revokeObjectURL(webpUrl);
      setPngUrl(null);
      setWebpUrl(null);
      batch.reset();
      setBatchFiles(selected);
      return;
    }

    const file = selected[0]!;
    batch.reset();
    setBatchFiles([]);

    if (
      !file.name.toLowerCase().endsWith('.svg') &&
      file.type !== 'image/svg+xml'
    ) {
      setErrorMessage(
        'Please select a standard Scalable Vector Graphics (.svg) file.',
      );
      return;
    }

    try {
      const text = await file.text();
      setRawSvg(text);
      setFilename(file.name.replace(/[^\w.-]/g, '_'));
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to read SVG file.',
      );
    }
  };

  const startBatch = () => {
    setErrorMessage(null);
    const options = {
      precision,
      removeMetadata,
      removeComments,
      removeEmptyGroups,
    };
    void batch.start(batchFiles, async (file, _index, signal) => {
      if (
        !file.name.toLowerCase().endsWith('.svg') &&
        file.type !== 'image/svg+xml'
      ) {
        return { status: 'skipped', reason: 'Only SVG files are supported.' };
      }
      if (signal.aborted) {
        return { status: 'skipped', reason: 'Batch cancelled.' };
      }
      const result = optimizeSvg(await file.text(), options);
      const safeName = file.name.replace(/[^\w.-]/g, '_');
      return {
        status: 'done',
        output: {
          blob: new Blob([result.optimizedSvg], {
            type: 'image/svg+xml;charset=utf-8',
          }),
          fileName: `optimized_${safeName}`,
        },
      };
    });
  };

  const handleExportRaster = useCallback(
    async (format: 'image/png' | 'image/webp') => {
      if (!optimizeResult) return;
      setIsProcessing(true);
      setErrorMessage(null);
      const startTime = performance.now();

      try {
        const raster = await renderSvgToRaster(optimizeResult.optimizedSvg, {
          scale,
          format,
        });

        const elapsed = performance.now() - startTime;
        const baseName = filename.replace(/\.[^/.]+$/, '');
        const ext = format === 'image/webp' ? 'webp' : 'png';
        const exportUrl = URL.createObjectURL(raster.blob);

        if (format === 'image/png') {
          if (pngUrl) URL.revokeObjectURL(pngUrl);
          setPngUrl(exportUrl);
        } else {
          if (webpUrl) URL.revokeObjectURL(webpUrl);
          setWebpUrl(exportUrl);
        }

        // Programmatically trigger download with data-receipt-download contract
        const link = document.createElement('a');
        link.href = exportUrl;
        link.download = `${baseName}_${raster.width}x${raster.height}.${ext}`;
        link.setAttribute('data-receipt-download', 'true');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        announceCompletion({
          operation: `SVG to ${ext.toUpperCase()} Export`,
          durationMs: elapsed,
          summary: `Rendered ${raster.width} × ${raster.height} px (${formatBytes(raster.bytes.byteLength)}) raster at ${scale}x scale.`,
          metrics: [
            { label: 'Scale', value: `${scale}x` },
            { label: 'Resolution', value: `${raster.width}×${raster.height}` },
            { label: 'Size', value: formatBytes(raster.bytes.byteLength) },
          ],
        });
      } catch (err) {
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'Failed to render raster from SVG.',
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [optimizeResult, scale, filename, pngUrl, webpUrl],
  );

  const copySvgCode = useCallback(async () => {
    if (!optimizeResult) return;
    try {
      await navigator.clipboard.writeText(optimizeResult.optimizedSvg);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      setErrorMessage('Failed to copy SVG markup to clipboard.');
    }
  }, [optimizeResult]);

  return (
    <AppShell currentToolId="svg-optimizer" currentGroupId="images">
      <section id="tool" tabIndex={-1} className="space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            SVG Optimizer & PNG Converter
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Clean Inkscape/Illustrator metadata, strip comments, round
            precision, and render high-resolution PNG or WebP rasters at custom
            scale. Processed 100% locally in your browser.
          </p>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          id="svg-file-input"
          aria-label="Upload SVG vector file"
          accept=".svg,image/svg+xml"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void handleFiles(e.target.files);
          }}
        />

        {/* Dropzone or Paste Box */}
        {!rawSvg && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (e.dataTransfer.files) void handleFiles(e.dataTransfer.files);
            }}
            className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-card/50 p-8 text-center transition-colors hover:border-foreground/30 sm:p-12"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-foreground">
              <UploadCloud className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-foreground sm:text-lg">
              Drop an SVG file here, or browse
            </h2>
            <p className="mt-1.5 max-w-md text-xs text-muted-foreground sm:text-sm">
              Upload vector icons, illustrations, or graphics. Sanitizes
              embedded scripts and removes bloated editor tags.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <FilePlus2 className="mr-2 h-4 w-4" />
                Choose SVG File(s)
              </Button>
            </div>
            <BatchLocalPromise />
            <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              <span>
                Vector processing and raster rendering happen entirely on your
                machine.
              </span>
            </div>
          </div>
        )}

        {batchFiles.length > 1 ? (
          <section className="rounded-xl border bg-card p-5">
            <h2 className="text-sm font-semibold">Batch optimizer settings</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              These settings apply to every selected SVG.
            </p>
            <div className="mt-4 flex flex-wrap gap-4 text-xs">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={removeMetadata}
                  disabled={batch.running}
                  onChange={(event) => setRemoveMetadata(event.target.checked)}
                />
                Remove editor metadata
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={removeComments}
                  disabled={batch.running}
                  onChange={(event) => setRemoveComments(event.target.checked)}
                />
                Strip XML comments
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={removeEmptyGroups}
                  disabled={batch.running}
                  onChange={(event) =>
                    setRemoveEmptyGroups(event.target.checked)
                  }
                />
                Remove empty groups
              </label>
            </div>
            <label className="mt-4 block max-w-sm text-xs font-semibold">
              Coordinate precision: {precision}
              <input
                type="range"
                min="0"
                max="5"
                value={precision}
                disabled={batch.running}
                onChange={(event) => setPrecision(Number(event.target.value))}
                className="mt-2 w-full accent-foreground"
              />
            </label>
          </section>
        ) : null}

        {batchFiles.length > 1 ? (
          <BatchRunnerPanel
            files={batchFiles}
            runner={batch}
            startLabel="Optimize all SVGs"
            zipName="optimized-svgs.zip"
            onStart={startBatch}
            onClear={resetAll}
          />
        ) : null}

        {/* Error notification */}
        {errorMessage && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}

        {/* Main Work Area */}
        {optimizeResult && (
          <div className="space-y-6">
            {/* Security Notice if scripts were removed */}
            {optimizeResult.scriptsRemoved > 0 && (
              <output className="flex items-start gap-3 rounded-xl border border-border bg-muted p-4 text-sm text-foreground">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-foreground" />
                <div>
                  <div className="font-semibold">
                    Security Sanitization Applied
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Removed {optimizeResult.scriptsRemoved} untrusted script
                    element(s) or event handler(s) from this SVG to prevent
                    malicious code execution.
                  </p>
                </div>
              </output>
            )}

            {/* Optimization Metrics Bar */}
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-4">
              <div>
                <div className="text-xs text-muted-foreground">
                  Original Size
                </div>
                <div className="text-base font-semibold text-foreground">
                  {formatBytes(optimizeResult.originalBytes)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">
                  Optimized Size
                </div>
                <div className="text-base font-semibold text-foreground">
                  {formatBytes(optimizeResult.optimizedBytes)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">
                  Byte Savings
                </div>
                <div className="text-base font-semibold text-foreground">
                  {formatBytes(optimizeResult.savingsBytes)} (
                  {optimizeResult.savingsPercent}%)
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Dimensions</div>
                <div className="text-base font-semibold text-foreground">
                  {dimensions
                    ? `${dimensions.width} × ${dimensions.height} px`
                    : 'Scalable'}
                </div>
              </div>
            </div>

            {/* Optimization Controls & Raster Export Settings */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Optimization Settings */}
              <div className="space-y-4 rounded-xl border border-border bg-card p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-foreground">
                    Optimizer Controls
                  </h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={resetAll}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                    Reset
                  </Button>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-2.5 text-xs text-foreground sm:text-sm">
                    <input
                      type="checkbox"
                      checked={removeMetadata}
                      onChange={(e) => setRemoveMetadata(e.target.checked)}
                      className="h-4 w-4 rounded border-border"
                    />
                    <span>
                      Remove editor metadata (Inkscape, Illustrator, namespaces)
                    </span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-foreground sm:text-sm">
                    <input
                      type="checkbox"
                      checked={removeComments}
                      onChange={(e) => setRemoveComments(e.target.checked)}
                      className="h-4 w-4 rounded border-border"
                    />
                    <span>Strip XML comments (&lt;!-- ... --&gt;)</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-foreground sm:text-sm">
                    <input
                      type="checkbox"
                      checked={removeEmptyGroups}
                      onChange={(e) => setRemoveEmptyGroups(e.target.checked)}
                      className="h-4 w-4 rounded border-border"
                    />
                    <span>
                      Collapse empty container groups (&lt;g&gt;&lt;/g&gt;)
                    </span>
                  </label>

                  <div className="pt-2">
                    <label
                      htmlFor={precisionId}
                      className="block text-xs font-medium text-foreground"
                    >
                      Coordinate Decimal Precision (digits)
                    </label>
                    <div className="mt-1 flex items-center gap-3">
                      <input
                        id={precisionId}
                        type="range"
                        min="0"
                        max="5"
                        value={precision}
                        onChange={(e) =>
                          setPrecision(parseInt(e.target.value, 10))
                        }
                        className="h-2 w-full cursor-pointer accent-foreground"
                      />
                      <span className="w-8 rounded bg-muted px-2 py-0.5 text-center font-mono text-xs text-foreground">
                        {precision}
                      </span>
                    </div>
                  </div>
                </div>

                {/* SVG Download & Copy */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
                  {svgUrl && (
                    <a
                      href={svgUrl}
                      download={`optimized_${filename}`}
                      data-receipt-download
                      className="inline-flex items-center justify-center rounded-lg border border-border bg-foreground px-3.5 py-1.5 text-xs font-medium text-background hover:opacity-90"
                    >
                      <ArrowDownToLine className="mr-1.5 h-3.5 w-3.5" />
                      Download Clean SVG
                    </a>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={copySvgCode}
                  >
                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                    {copiedCode ? 'Copied Markup!' : 'Copy SVG Code'}
                  </Button>
                </div>
              </div>

              {/* Raster Rendering Settings */}
              <div className="space-y-4 rounded-xl border border-border bg-card p-5 sm:p-6">
                <h3 className="text-base font-semibold text-foreground">
                  Raster Export (PNG / WebP)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Render sharp raster graphics from this vector graphic at 1x to
                  4x retina resolution.
                </p>

                <div>
                  <span className="block text-xs font-medium text-foreground">
                    Scale Multiplier
                  </span>
                  <div className="mt-2 grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setScale(s)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                          scale === s
                            ? 'border-foreground bg-muted text-foreground font-semibold'
                            : 'border-border bg-background text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {s}x (
                        {dimensions
                          ? `${dimensions.width * s}×${dimensions.height * s}`
                          : ''}
                        )
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-border">
                  <Button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => void handleExportRaster('image/png')}
                  >
                    <FileImage className="mr-1.5 h-3.5 w-3.5" />
                    Export as PNG ({scale}x)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isProcessing}
                    onClick={() => void handleExportRaster('image/webp')}
                  >
                    <FileImage className="mr-1.5 h-3.5 w-3.5" />
                    Export as WebP ({scale}x)
                  </Button>
                </div>
              </div>
            </div>

            {/* Visual Preview / Code View Tabs */}
            <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center rounded-lg border border-border bg-muted/40 p-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('preview')}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                      activeTab === 'preview'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Vector Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('code')}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                      activeTab === 'code'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Code2 className="h-3.5 w-3.5" />
                    Clean XML Code
                  </button>
                </div>
                <div className="text-xs text-muted-foreground">
                  {dimensions
                    ? `${dimensions.width} × ${dimensions.height} px`
                    : ''}
                </div>
              </div>

              <div className="mt-4">
                {activeTab === 'preview' && svgUrl && (
                  <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-border bg-background/50 p-6">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={svgUrl}
                      alt="Vector preview"
                      className="max-h-[400px] max-w-full object-contain"
                    />
                  </div>
                )}

                {activeTab === 'code' && (
                  <textarea
                    readOnly
                    value={optimizeResult.optimizedSvg}
                    rows={12}
                    className="w-full rounded-lg border border-border bg-background p-3 font-mono text-xs text-foreground focus:outline-none"
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    </AppShell>
  );
}
