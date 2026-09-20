'use client';

import {
  AlertTriangle,
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  CheckCircle2,
  Copy,
  FileArchive,
  FileCode,
  FilePlus2,
  Globe,
  Mail,
  RotateCcw,
  ShieldCheck,
  Trash2,
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
import { Button } from '@/components/ui/button';
import { announceCompletion } from '@/lib/completion';
import {
  convertFilesToHtml,
  type RawFileInput,
} from '@/lib/tools/html/converter';
import { getImageDimensions } from '@/lib/tools/html/image-dimensions';
import { isPdfBytes, renderPdfToSlices } from '@/lib/tools/html/pdf-slices';
import type { HtmlConversionResult } from '@/lib/tools/html/types';

interface LoadedSlice {
  id: string;
  name: string;
  bytes: Uint8Array;
  previewUrl: string;
  width: number;
  height: number;
  format: string;
  altText: string;
  linkUrl: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export function FileToHtmlTool() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const maxWidthId = useId();
  const bgColorId = useId();
  const contentBgColorId = useId();
  const preheaderId = useId();
  const imagePrefixId = useId();

  const [slices, setSlices] = useState<LoadedSlice[]>([]);
  const [title, setTitle] = useState('Email Campaign');
  const [maxWidth, setMaxWidth] = useState(600);
  const [backgroundColor, setBackgroundColor] = useState('#f4f4f5');
  const [contentBackgroundColor, setContentBackgroundColor] =
    useState('#ffffff');
  const [preheader, setPreheader] = useState('');
  const [imagePrefix, setImagePrefix] = useState('images/');

  const [activeTab, setActiveTab] = useState<'email' | 'web'>('email');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSlicingPdf, setIsSlicingPdf] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [conversionResult, setConversionResult] =
    useState<HtmlConversionResult | null>(null);

  const [zipUrl, setZipUrl] = useState<string | null>(null);
  const [emailHtmlUrl, setEmailHtmlUrl] = useState<string | null>(null);
  const [webHtmlUrl, setWebHtmlUrl] = useState<string | null>(null);
  const [copiedMode, setCopiedMode] = useState<'email' | 'web' | null>(null);
  const [durationMs, setDurationMs] = useState(0);

  // Revoke object URLs on unmount or reset
  useEffect(() => {
    return () => {
      slices.forEach((s) => URL.revokeObjectURL(s.previewUrl));
      if (zipUrl) URL.revokeObjectURL(zipUrl);
      if (emailHtmlUrl) URL.revokeObjectURL(emailHtmlUrl);
      if (webHtmlUrl) URL.revokeObjectURL(webHtmlUrl);
    };
  }, [slices, zipUrl, emailHtmlUrl, webHtmlUrl]);

  const resetAll = useCallback(() => {
    slices.forEach((s) => URL.revokeObjectURL(s.previewUrl));
    if (zipUrl) URL.revokeObjectURL(zipUrl);
    if (emailHtmlUrl) URL.revokeObjectURL(emailHtmlUrl);
    if (webHtmlUrl) URL.revokeObjectURL(webHtmlUrl);
    setSlices([]);
    setConversionResult(null);
    setZipUrl(null);
    setEmailHtmlUrl(null);
    setWebHtmlUrl(null);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [slices, zipUrl, emailHtmlUrl, webHtmlUrl]);

  const handleFiles = useCallback(async (fileList: FileList | File[]) => {
    setErrorMessage(null);
    const incoming = Array.from(fileList);
    if (incoming.length === 0) return;

    setIsProcessing(true);
    const newSlices: LoadedSlice[] = [];

    try {
      for (const file of incoming) {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);

        if (isPdfBytes(bytes) || file.name.toLowerCase().endsWith('.pdf')) {
          setIsSlicingPdf(true);
          try {
            const pdfSlices = await renderPdfToSlices(bytes, file.name);
            for (const ps of pdfSlices) {
              const dim = getImageDimensions(ps.bytes);
              if (!dim) continue;
              const blob = new Blob([new Uint8Array(ps.bytes)], {
                type: 'image/png',
              });
              newSlices.push({
                id: `slice-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                name: ps.name,
                bytes: ps.bytes,
                previewUrl: URL.createObjectURL(blob),
                width: dim.width,
                height: dim.height,
                format: dim.format,
                altText: ps.altText ?? '',
                linkUrl: '',
              });
            }
          } finally {
            setIsSlicingPdf(false);
          }
        } else {
          const dim = getImageDimensions(bytes);
          if (!dim) {
            throw new Error(
              `File "${file.name}" is not a supported format (JPEG, PNG, WebP, SVG, or PDF).`,
            );
          }
          const mimeType =
            dim.format === 'svg'
              ? 'image/svg+xml'
              : dim.format === 'jpeg'
                ? 'image/jpeg'
                : `image/${dim.format}`;
          const blob = new Blob([new Uint8Array(bytes)], { type: mimeType });
          const cleanName = file.name.replace(/[^\w.-]/g, '_');

          newSlices.push({
            id: `slice-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: cleanName,
            bytes,
            previewUrl: URL.createObjectURL(blob),
            width: dim.width,
            height: dim.height,
            format: dim.format,
            altText: '',
            linkUrl: '',
          });
        }
      }

      setSlices((prev) => [...prev, ...newSlices]);
      // Reset previous conversion if files change
      setConversionResult(null);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'An error occurred while loading files.',
      );
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const moveSlice = useCallback((index: number, direction: 'up' | 'down') => {
    setSlices((prev) => {
      const nextIndex = direction === 'up' ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index]!;
      copy[index] = copy[nextIndex]!;
      copy[nextIndex] = temp;
      return copy;
    });
    setConversionResult(null);
  }, []);

  const removeSlice = useCallback((index: number) => {
    setSlices((prev) => {
      const item = prev[index];
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
    setConversionResult(null);
  }, []);

  const updateSlice = useCallback(
    (index: number, updates: Partial<LoadedSlice>) => {
      setSlices((prev) => {
        const copy = [...prev];
        copy[index] = { ...copy[index]!, ...updates };
        return copy;
      });
      setConversionResult(null);
    },
    [],
  );

  const handleConvert = useCallback(async () => {
    if (slices.length === 0) {
      setErrorMessage('Please add at least one image or PDF file.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    const startTime = performance.now();

    try {
      const inputs: RawFileInput[] = slices.map((s) => ({
        name: s.name,
        bytes: s.bytes,
        altText: s.altText || undefined,
        linkUrl: s.linkUrl || undefined,
      }));

      const result = await convertFilesToHtml(inputs, {
        title,
        maxWidth,
        backgroundColor,
        contentBackgroundColor,
        preheader: preheader || undefined,
        imagePrefix: imagePrefix || 'images/',
      });

      // Cleanup prior URLs
      if (zipUrl) URL.revokeObjectURL(zipUrl);
      if (emailHtmlUrl) URL.revokeObjectURL(emailHtmlUrl);
      if (webHtmlUrl) URL.revokeObjectURL(webHtmlUrl);

      const zipBlob = new Blob([new Uint8Array(result.emailPackageZip)], {
        type: 'application/zip',
      });
      const emailBlob = new Blob([result.emailHtml], {
        type: 'text/html;charset=utf-8',
      });
      const webBlob = new Blob([result.webHtml], {
        type: 'text/html;charset=utf-8',
      });

      const zUrl = URL.createObjectURL(zipBlob);
      const eUrl = URL.createObjectURL(emailBlob);
      const wUrl = URL.createObjectURL(webBlob);

      setZipUrl(zUrl);
      setEmailHtmlUrl(eUrl);
      setWebHtmlUrl(wUrl);
      setConversionResult(result);

      const elapsed = performance.now() - startTime;
      setDurationMs(elapsed);

      announceCompletion({
        operation: 'File to HTML Conversion',
        durationMs: elapsed,
        summary: `Generated email marketing ZIP package and standalone web HTML from ${slices.length} slices.`,
        metrics: [
          { label: 'Slices', value: String(slices.length) },
          { label: 'ZIP Size', value: formatBytes(result.totalBytes) },
          { label: 'Duration', value: formatDuration(elapsed) },
        ],
      });
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to convert files to HTML.',
      );
    } finally {
      setIsProcessing(false);
    }
  }, [
    slices,
    title,
    maxWidth,
    backgroundColor,
    contentBackgroundColor,
    preheader,
    imagePrefix,
    zipUrl,
    emailHtmlUrl,
    webHtmlUrl,
  ]);

  const copyToClipboard = useCallback(
    async (mode: 'email' | 'web') => {
      if (!conversionResult) return;
      const text =
        mode === 'email'
          ? conversionResult.emailHtml
          : conversionResult.webHtml;
      try {
        await navigator.clipboard.writeText(text);
        setCopiedMode(mode);
        setTimeout(() => setCopiedMode(null), 2500);
      } catch {
        setErrorMessage('Failed to copy to clipboard.');
      }
    },
    [conversionResult],
  );

  // For email iframe preview: substitute slice preview URLs for local "images/..." paths
  const emailPreviewHtml = useMemo(() => {
    if (!conversionResult) return '';
    let preview = conversionResult.emailHtml;
    for (const slice of slices) {
      const cleanName = slice.name.replace(/[^\w.-]/g, '_');
      const targetSrc = `${imagePrefix}${cleanName}`;
      preview = preview.replaceAll(targetSrc, slice.previewUrl);
    }
    return preview;
  }, [conversionResult, slices, imagePrefix]);

  const totalInputBytes = useMemo(
    () => slices.reduce((sum, s) => sum + s.bytes.byteLength, 0),
    [slices],
  );

  return (
    <AppShell currentToolId="file-to-html" currentGroupId="web-seo">
      <section id="tool" tabIndex={-1} className="space-y-8">
        {/* Page Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            File to HTML Converter
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Convert JPEG, PNG, WebP, SVG images and multi-page PDFs into
            production-ready email marketing templates and standalone web HTML.
            Processed 100% locally in your browser.
          </p>
        </div>

        {/* Educational Architecture Callout */}
        <div className="rounded-xl border border-border bg-card p-5 text-sm sm:p-6">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
              <Mail className="h-4 w-4" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-sm font-semibold text-foreground">
                Email Marketing vs Web HTML: Why Hosted Assets Matter
              </h2>
              <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                Major email providers (Gmail, Outlook, Yahoo) strictly block or
                strip inline base64{' '}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">
                  data:
                </code>{' '}
                image URIs for security and deliverability. Therefore, this
                converter outputs two specialized formats:
              </p>
              <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-background p-3">
                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                    <FileArchive className="h-4 w-4" />
                    <span>Email Marketing Package (.zip)</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Table-based HTML with Outlook VML conditionals, MSO cell
                    reset, and zero flexbox/grid. Paired with your slice images
                    in an{' '}
                    <code className="font-mono text-foreground">images/</code>{' '}
                    folder, ready to upload to any ESP (Mailchimp, Klaviyo,
                    SendGrid) or CDN.
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                    <Globe className="h-4 w-4" />
                    <span>Standalone Web Page (.html)</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Self-contained HTML5 file with embedded high-fidelity base64
                    data URIs. Zero external dependencies — open immediately in
                    any browser, attach to tickets, or embed directly into web
                    pages.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          id="file-to-html-input"
          aria-label="Upload images or PDF files to convert to HTML"
          accept=".jpg,.jpeg,.png,.webp,.svg,.pdf,image/jpeg,image/png,image/webp,image/svg+xml,application/pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void handleFiles(e.target.files);
          }}
        />

        {/* Dropzone */}
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
            Drop images or PDF files here, or browse
          </h2>
          <p className="mt-1.5 max-w-md text-xs text-muted-foreground sm:text-sm">
            Supports JPEG, PNG, WebP, SVG slices, and multi-page PDFs. Slices
            are ordered vertically in table layout.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-5"
            disabled={isProcessing}
            onClick={() => fileInputRef.current?.click()}
          >
            <FilePlus2 className="mr-2 h-4 w-4" />
            {isSlicingPdf ? 'Slicing PDF Pages...' : 'Choose Images or PDF'}
          </Button>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <span>
              Files never leave your device. Conversion runs 100% client-side.
            </span>
          </div>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}

        {/* Slices Sequence */}
        {slices.length > 0 && (
          <div className="space-y-4 rounded-xl border border-border bg-card p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Content Slices ({slices.length}{' '}
                  {slices.length === 1 ? 'slice' : 'slices'})
                </h3>
                <p className="text-xs text-muted-foreground">
                  Total raw size: {formatBytes(totalInputBytes)} • Slices are
                  stacked top-to-bottom without email gaps
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FilePlus2 className="mr-1.5 h-3.5 w-3.5" />
                  Add More
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetAll}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  Clear All
                </Button>
              </div>
            </div>

            <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-background">
              {slices.map((slice, index) => (
                <div
                  key={slice.id}
                  className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  {/* Slice Info & Thumbnail */}
                  <div className="flex items-center gap-4">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-muted text-xs font-bold text-foreground">
                      {index + 1}
                    </div>
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded border border-border bg-muted/30">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={slice.previewUrl}
                        alt={slice.altText || slice.name}
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="font-medium text-foreground">
                        {slice.name}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="rounded bg-muted px-1.5 py-0.5 uppercase">
                          {slice.format}
                        </span>
                        <span>
                          {slice.width} × {slice.height} px
                        </span>
                        <span>•</span>
                        <span>{formatBytes(slice.bytes.byteLength)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Slice Link & Alt Metadata */}
                  <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2 lg:max-w-md">
                    <div>
                      <label
                        htmlFor={`link-${slice.id}`}
                        className="block text-xs text-muted-foreground"
                      >
                        Destination URL (optional)
                      </label>
                      <input
                        id={`link-${slice.id}`}
                        type="url"
                        placeholder="//mysite.com/offer"
                        value={slice.linkUrl}
                        onChange={(e) =>
                          updateSlice(index, { linkUrl: e.target.value })
                        }
                        className="mt-1 w-full rounded border border-border bg-card px-2.5 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`alt-${slice.id}`}
                        className="block text-xs text-muted-foreground"
                      >
                        Alt Text (recommended)
                      </label>
                      <input
                        id={`alt-${slice.id}`}
                        type="text"
                        placeholder="Banner description"
                        value={slice.altText}
                        onChange={(e) =>
                          updateSlice(index, { altText: e.target.value })
                        }
                        className="mt-1 w-full rounded border border-border bg-card px-2.5 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Move / Delete Controls */}
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={index === 0}
                      onClick={() => moveSlice(index, 'up')}
                      aria-label={`Move slice ${index + 1} up`}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={index === slices.length - 1}
                      onClick={() => moveSlice(index, 'down')}
                      aria-label={`Move slice ${index + 1} down`}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSlice(index)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Remove slice ${index + 1}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Configuration Options */}
        {slices.length > 0 && (
          <div className="space-y-4 rounded-xl border border-border bg-card p-5 sm:p-6">
            <h3 className="text-base font-semibold text-foreground">
              HTML Template Settings
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label
                  htmlFor={titleId}
                  className="block text-xs font-medium text-foreground"
                >
                  Document / Email Title
                </label>
                <input
                  id={titleId}
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setConversionResult(null);
                  }}
                  className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor={maxWidthId}
                  className="block text-xs font-medium text-foreground"
                >
                  Max Width (pixels, 600px standard for email)
                </label>
                <input
                  id={maxWidthId}
                  type="number"
                  min="320"
                  max="1400"
                  step="10"
                  value={maxWidth}
                  onChange={(e) => {
                    setMaxWidth(
                      Math.max(320, parseInt(e.target.value, 10) || 600),
                    );
                    setConversionResult(null);
                  }}
                  className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor={imagePrefixId}
                  className="block text-xs font-medium text-foreground"
                >
                  Image Path Prefix (ZIP uses &apos;images/&apos;)
                </label>
                <input
                  id={imagePrefixId}
                  type="text"
                  value={imagePrefix}
                  onChange={(e) => {
                    setImagePrefix(e.target.value);
                    setConversionResult(null);
                  }}
                  placeholder="images/ or //cdn.site.com/"
                  className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor={bgColorId}
                  className="block text-xs font-medium text-foreground"
                >
                  Outer Background Color
                </label>
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => {
                      setBackgroundColor(e.target.value);
                      setConversionResult(null);
                    }}
                    className="h-9 w-9 cursor-pointer rounded border border-border bg-background p-0.5"
                  />
                  <input
                    id={bgColorId}
                    type="text"
                    value={backgroundColor}
                    onChange={(e) => {
                      setBackgroundColor(e.target.value);
                      setConversionResult(null);
                    }}
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor={contentBgColorId}
                  className="block text-xs font-medium text-foreground"
                >
                  Content Container Background
                </label>
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    type="color"
                    value={contentBackgroundColor}
                    onChange={(e) => {
                      setContentBackgroundColor(e.target.value);
                      setConversionResult(null);
                    }}
                    className="h-9 w-9 cursor-pointer rounded border border-border bg-background p-0.5"
                  />
                  <input
                    id={contentBgColorId}
                    type="text"
                    value={contentBackgroundColor}
                    onChange={(e) => {
                      setContentBackgroundColor(e.target.value);
                      setConversionResult(null);
                    }}
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor={preheaderId}
                  className="block text-xs font-medium text-foreground"
                >
                  Preheader Text (Inbox preview snippet)
                </label>
                <input
                  id={preheaderId}
                  type="text"
                  placeholder="Special offer inside..."
                  value={preheader}
                  onChange={(e) => {
                    setPreheader(e.target.value);
                    setConversionResult(null);
                  }}
                  className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="button"
                className="w-full sm:w-auto"
                disabled={isProcessing}
                onClick={handleConvert}
              >
                <FileCode className="mr-2 h-4 w-4" />
                {isProcessing
                  ? 'Converting to HTML...'
                  : 'Generate HTML & Package'}
              </Button>
            </div>
          </div>
        )}

        {/* Results & Previews */}
        {conversionResult && zipUrl && emailHtmlUrl && webHtmlUrl && (
          <div className="space-y-6 rounded-xl border border-border bg-card p-5 sm:p-6">
            {/* Success Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-5 w-5 text-foreground" />
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    Conversion Complete
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Generated in {formatDuration(durationMs)} • Ready for ESP
                    deployment or website embedding
                  </p>
                </div>
              </div>

              {/* Mode Tabs */}
              <div className="flex items-center rounded-lg border border-border bg-muted/40 p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('email')}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeTab === 'email'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Mail className="h-3.5 w-3.5" />
                  Email Template (.zip)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('web')}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeTab === 'web'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Globe className="h-3.5 w-3.5" />
                  Standalone Web Page (.html)
                </button>
              </div>
            </div>

            {/* Tab 1: Email Marketing */}
            {activeTab === 'email' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-muted-foreground">
                    Email package includes:{' '}
                    <code className="font-mono text-foreground">
                      index.html
                    </code>{' '}
                    (Outlook-ready tables) +{' '}
                    <code className="font-mono text-foreground">images/</code>{' '}
                    folder +{' '}
                    <code className="font-mono text-foreground">
                      README.txt
                    </code>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={zipUrl}
                      download={`${title.replace(/[^\w.-]/g, '_')}_email_package.zip`}
                      data-receipt-download
                      className="inline-flex items-center justify-center rounded-lg border border-border bg-foreground px-3.5 py-1.5 text-xs font-medium text-background hover:opacity-90"
                    >
                      <FileArchive className="mr-1.5 h-3.5 w-3.5" />
                      Download Email Package (.zip)
                    </a>
                    <a
                      href={emailHtmlUrl}
                      download="index.html"
                      data-receipt-download
                      className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-3.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                    >
                      <ArrowDownToLine className="mr-1.5 h-3.5 w-3.5" />
                      Download index.html
                    </a>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard('email')}
                    >
                      <Copy className="mr-1.5 h-3.5 w-3.5" />
                      {copiedMode === 'email'
                        ? 'Copied HTML!'
                        : 'Copy Email HTML'}
                    </Button>
                  </div>
                </div>

                {/* Email Preview Frame */}
                <div className="overflow-hidden rounded-lg border border-border bg-background">
                  <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-2 text-xs text-muted-foreground">
                    <span>Live Table Layout Preview (Assets mapped)</span>
                    <span>Max Width: {maxWidth}px</span>
                  </div>
                  <iframe
                    title="Email Template Live Preview"
                    srcDoc={emailPreviewHtml}
                    className="h-[500px] w-full border-0"
                    sandbox="allow-same-origin"
                  />
                </div>
              </div>
            )}

            {/* Tab 2: Standalone Web */}
            {activeTab === 'web' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-muted-foreground">
                    Standalone HTML file with base64 embedded assets.
                    Self-contained and portable.
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={webHtmlUrl}
                      download={`${title.replace(/[^\w.-]/g, '_')}_standalone.html`}
                      data-receipt-download
                      className="inline-flex items-center justify-center rounded-lg border border-border bg-foreground px-3.5 py-1.5 text-xs font-medium text-background hover:opacity-90"
                    >
                      <Globe className="mr-1.5 h-3.5 w-3.5" />
                      Download Standalone Web HTML (.html)
                    </a>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard('web')}
                    >
                      <Copy className="mr-1.5 h-3.5 w-3.5" />
                      {copiedMode === 'web' ? 'Copied HTML!' : 'Copy Web HTML'}
                    </Button>
                  </div>
                </div>

                {/* Web Preview Frame */}
                <div className="overflow-hidden rounded-lg border border-border bg-background">
                  <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-2 text-xs text-muted-foreground">
                    <span>Standalone Web Page Preview (Embedded base64)</span>
                    <span>Max Width: {maxWidth}px</span>
                  </div>
                  <iframe
                    title="Standalone Web Live Preview"
                    srcDoc={conversionResult.webHtml}
                    className="h-[500px] w-full border-0"
                    sandbox="allow-same-origin"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </AppShell>
  );
}
