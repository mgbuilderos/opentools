'use client';

import {
  ArrowDownToLine,
  CheckCircle2,
  FilePlus2,
  LockKeyhole,
  PenLine,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { announceCompletion } from '@/lib/completion';
import { publicTools } from '@/lib/tools/catalog';
import type {
  PdfFillOptions,
  PdfFormField,
  PdfWorkerInput,
  PdfWorkerRequest,
  PdfWorkerResponse,
} from '@/lib/tools/pdf/protocol';

type PageSize = { width: number; height: number };
type SourcePdf = {
  id: string;
  file: File;
  pages: number;
  pageSizes: PageSize[];
  fields: PdfFormField[];
};
type Receipt = {
  url: string;
  bytes: number;
  pages: number;
  fieldsFilled: number;
  signaturePlaced: boolean;
  flattened: boolean;
  durationMs: number;
};

const MAX_BYTES = 150 * 1024 * 1024;
const SIGNATURE_CANVAS = { width: 640, height: 200 };

function createWorker() {
  return new Worker(
    new URL('../workers/pdf-merge.worker.ts', import.meta.url),
    {
      type: 'module',
      name: 'pdf-fill-engine',
    },
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(durationMs: number) {
  return durationMs < 1000
    ? `${durationMs.toFixed(0)} ms`
    : `${(durationMs / 1000).toFixed(2)} s`;
}

async function toWorkerInput(source: { id: string; file: File }) {
  return {
    id: source.id,
    name: source.file.name,
    bytes: await source.file.arrayBuffer(),
  } satisfies PdfWorkerInput;
}

/**
 * Exports the signature pad as PNG bytes.
 *
 * Null means the browser did not produce a PNG, which the caller must report
 * rather than silently stamping nothing onto the page.
 */
async function signaturePngBytes(canvas: HTMLCanvasElement | null) {
  if (!canvas) return null;
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png'),
  );
  if (!blob || blob.type !== 'image/png') return null;
  return blob.arrayBuffer();
}

export function PdfSignTool() {
  const fileRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const outputUrlRef = useRef<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const padRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);

  const [source, setSource] = useState<SourcePdf | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<'draw' | 'type'>('draw');
  const [typedName, setTypedName] = useState('');
  const [hasSignature, setHasSignature] = useState(false);
  const [signaturePage, setSignaturePage] = useState(1);
  const [signatureX, setSignatureX] = useState(72);
  const [signatureY, setSignatureY] = useState(72);
  const [signatureWidth, setSignatureWidth] = useState(180);
  const [flatten, setFlatten] = useState(true);
  const [status, setStatus] = useState<
    'idle' | 'inspecting' | 'ready' | 'processing' | 'success' | 'error'
  >('idle');
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState('');
  const manifest = publicTools.find((tool) => tool.id === 'pdf-sign')!;

  useEffect(
    () => () => {
      workerRef.current?.terminate();
      if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current);
    },
    [],
  );
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const renderTypedSignatureToCanvas = (name: string) => {
    const canvas = padRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    const trimmed = name.trim();
    if (!trimmed) {
      setHasSignature(false);
      return;
    }

    let fontSize = 54;
    const maxTextWidth = canvas.width - 64;
    context.font = `italic ${fontSize}px Georgia, "Times New Roman", serif`;
    let measured = context.measureText(trimmed).width;

    if (measured > maxTextWidth) {
      fontSize = Math.max(18, Math.floor(fontSize * (maxTextWidth / measured)));
      context.font = `italic ${fontSize}px Georgia, "Times New Roman", serif`;
      measured = context.measureText(trimmed).width;
    }

    context.fillStyle = '#111111';
    context.textBaseline = 'middle';
    context.fillText(
      trimmed,
      Math.max(32, (canvas.width - measured) / 2),
      canvas.height / 2,
    );
    setHasSignature(true);
  };

  const handleTypedNameChange = (newName: string) => {
    setTypedName(newName);
    renderTypedSignatureToCanvas(newName);
    clearResult();
  };

  const handleModeChange = (newMode: 'draw' | 'type') => {
    setMode(newMode);
    clearResult();
    const canvas = padRef.current;
    const context = canvas?.getContext('2d');
    if (canvas && context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
    if (newMode === 'type') {
      renderTypedSignatureToCanvas(typedName);
    } else {
      setHasSignature(false);
    }
  };

  const clearResult = () => {
    if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current);
    outputUrlRef.current = null;
    setReceipt(null);
  };

  const padContext = () => {
    const canvas = padRef.current;
    if (!canvas) return null;
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.lineWidth = 3;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = '#111111';
    return context;
  };

  const padPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = padRef.current!;
    const box = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - box.left) / box.width) * canvas.width,
      y: ((event.clientY - box.top) / box.height) * canvas.height,
    };
  };

  const startStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (mode !== 'draw') return;
    const context = padContext();
    if (!context) return;
    // Capture keeps a stroke going if the pointer leaves the pad mid-signature.
    // Not every pointer can be captured, and failing to is no reason to refuse
    // the stroke.
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Draw without capture.
    }
    drawingRef.current = true;
    const { x, y } = padPoint(event);
    context.beginPath();
    context.moveTo(x, y);
    // A tap with no drag should still leave a mark.
    context.lineTo(x + 0.01, y);
    context.stroke();
    setHasSignature(true);
    clearResult();
  };

  const continueStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (mode !== 'draw') return;
    if (!drawingRef.current) return;
    const context = padContext();
    if (!context) return;
    const { x, y } = padPoint(event);
    context.lineTo(x, y);
    context.stroke();
  };

  const endStroke = () => {
    drawingRef.current = false;
  };

  const clearSignature = () => {
    const canvas = padRef.current;
    const context = canvas?.getContext('2d');
    if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
    setTypedName('');
    setHasSignature(false);
    clearResult();
  };

  const choosePdf = async (file?: File) => {
    if (!file || status === 'processing' || status === 'inspecting') return;
    clearResult();
    setError('');
    if (file.size > MAX_BYTES) {
      setError('This candidate limits a source PDF to 150 MB.');
      return;
    }
    const candidate = { id: crypto.randomUUID(), file };
    setStatus('inspecting');
    try {
      const worker = createWorker();
      workerRef.current = worker;
      const input = await toWorkerInput(candidate);
      worker.onmessage = (event: MessageEvent<PdfWorkerResponse>) => {
        const message = event.data;
        if (message.type === 'form') {
          setSource({
            ...candidate,
            pages: message.pages,
            pageSizes: message.pageSizes,
            fields: message.fields,
          });
          setValues(
            Object.fromEntries(
              message.fields.map((field) => [field.name, field.value]),
            ),
          );
          setSignaturePage(message.pages);
          setStatus('ready');
        } else if (message.type === 'error') {
          setStatus('error');
          setError(message.message);
        }
        worker.terminate();
        workerRef.current = null;
      };
      worker.onerror = () => {
        setStatus('error');
        setError('The PDF inspector stopped unexpectedly.');
        worker.terminate();
        workerRef.current = null;
      };
      const request: PdfWorkerRequest = { type: 'inspect-form', input };
      worker.postMessage(request, [input.bytes]);
    } catch {
      workerRef.current?.terminate();
      workerRef.current = null;
      setStatus('error');
      setError('The browser could not read that file.');
    }
  };

  const run = async () => {
    if (!source || status === 'processing') return;
    clearResult();
    setError('');
    setStatus('processing');
    try {
      const image = hasSignature
        ? await signaturePngBytes(padRef.current)
        : null;
      if (hasSignature && !image) {
        setStatus('error');
        setError('This browser could not turn the signature into an image.');
        return;
      }

      const worker = createWorker();
      workerRef.current = worker;
      const input = await toWorkerInput(source);
      const editable = new Set(
        source.fields.filter((f) => !f.readOnly).map((f) => f.name),
      );
      const options: PdfFillOptions = {
        values: Object.fromEntries(
          Object.entries(values).filter(([name]) => editable.has(name)),
        ),
        signature: image
          ? {
              image,
              pageIndex: signaturePage - 1,
              x: signatureX,
              y: signatureY,
              width: signatureWidth,
            }
          : null,
        flatten,
      };
      worker.onmessage = (event: MessageEvent<PdfWorkerResponse>) => {
        const message = event.data;
        if (message.type === 'result') {
          const blob = new Blob([message.bytes], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          outputUrlRef.current = url;
          // The worker measures the work itself, which is what the receipt
          // should report: wall-clock here would also count React's re-render.
          const durationMs =
            message.computeDurationMs + message.validationDurationMs;
          setReceipt({
            url,
            bytes: blob.size,
            pages: message.pageCount,
            fieldsFilled: message.fieldsFilled ?? 0,
            signaturePlaced: message.signaturePlaced ?? false,
            flattened: message.flattened ?? false,
            durationMs,
          });
          setStatus('success');
          announceCompletion({
            operation: 'PDF sign and fill',
            durationMs,
            summary: `${message.pageCount} ${message.pageCount === 1 ? 'page' : 'pages'} completed and checked in this browser.`,
            metrics: [
              { label: 'Fields', value: String(message.fieldsFilled ?? 0) },
              {
                label: 'Signature',
                value: message.signaturePlaced ? 'Placed' : 'None',
              },
              { label: 'Output', value: formatBytes(blob.size) },
            ],
          });
        } else if (message.type === 'error') {
          setStatus('error');
          setError(message.message);
        }
        if (message.type === 'result' || message.type === 'error') {
          worker.terminate();
          workerRef.current = null;
        }
      };
      worker.onerror = () => {
        setStatus('error');
        setError('Signing stopped unexpectedly. Your original is unchanged.');
        worker.terminate();
        workerRef.current = null;
      };
      const request: PdfWorkerRequest = { type: 'fill', input, options };
      worker.postMessage(request, [input.bytes]);
    } catch {
      workerRef.current?.terminate();
      workerRef.current = null;
      setStatus('error');
      setError('Signing could not start. Your original is unchanged.');
    }
  };

  const clear = () => {
    workerRef.current?.terminate();
    workerRef.current = null;
    clearResult();
    clearSignature();
    setSource(null);
    setValues({});
    setError('');
    setStatus('idle');
    if (fileRef.current) fileRef.current.value = '';
  };

  const page = source?.pageSizes[signaturePage - 1];
  const editableFields =
    source?.fields.filter((field) => !field.readOnly) ?? [];
  const lockedFields = source?.fields.filter((field) => field.readOnly) ?? [];

  const setValue = (name: string, value: string) => {
    setValues((current) => ({ ...current, [name]: value }));
    clearResult();
  };

  return (
    <AppShell currentToolId="pdf-sign">
      <section
        id="tool"
        tabIndex={-1}
        className="min-w-0 px-4 py-8 sm:px-8 lg:px-12 lg:py-12"
      >
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col justify-between gap-5 border-b pb-8 sm:flex-row sm:items-start">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <span>PDF</span>
                <span aria-hidden="true">/</span>
                <span>Sign and fill</span>
              </div>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Sign and fill a PDF
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                Complete a form and draw or type your signature onto it. The
                document is read by this page and never sent to a server.
              </p>
            </div>
            <span className="flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold">
              <LockKeyhole aria-hidden="true" className="size-3.5" /> On-device
              prototype
            </span>
          </div>

          <p className="mt-6 rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
            <strong className="font-semibold text-foreground">
              This draws or types a signature, it does not certify one.
            </strong>{' '}
            The result is an image on the page, the same as signing a printout
            and scanning it. It carries no certificate and no audit trail, so it
            proves nothing about who signed or when. Where a document demands a
            qualified or digital signature, this is not that.
          </p>

          {error ? (
            <div
              ref={errorRef}
              role="alert"
              tabIndex={-1}
              className="focus-ring mt-6 flex items-start justify-between gap-4 rounded-xl border border-destructive/35 bg-destructive/5 p-4 text-sm"
            >
              <div>
                <p className="font-semibold">Couldn’t complete this PDF</p>
                <p className="mt-1 text-muted-foreground">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => setError('')}
                aria-label="Dismiss error"
                className="focus-ring rounded-lg border p-1.5"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
          ) : null}

          <section className="mt-8 overflow-hidden rounded-2xl border bg-card p-5 sm:p-6">
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,.pdf"
              aria-label="Choose source PDF"
              className="sr-only"
              onChange={(event) => void choosePdf(event.target.files?.[0])}
            />

            {source ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {source.file.name}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {source.pages} {source.pages === 1 ? 'page' : 'pages'} ·{' '}
                    {source.fields.length === 0
                      ? 'no form fields'
                      : `${editableFields.length} fillable ${
                          editableFields.length === 1 ? 'field' : 'fields'
                        }`}
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="h-10"
                  onClick={() => fileRef.current?.click()}
                >
                  Choose another
                </Button>
              </div>
            ) : (
              <button
                type="button"
                aria-label="Choose a PDF to sign"
                onClick={() => fileRef.current?.click()}
                className="focus-ring grid min-h-52 w-full place-items-center rounded-xl border border-dashed bg-muted/45 p-6 text-center"
              >
                <span>
                  <span className="mx-auto grid size-11 place-items-center rounded-xl border bg-background">
                    <FilePlus2 aria-hidden="true" className="size-5" />
                  </span>
                  <span className="mt-4 block font-semibold">
                    {status === 'inspecting'
                      ? 'Reading the form locally…'
                      : 'Choose a PDF'}
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    Up to 150 MB
                  </span>
                </span>
              </button>
            )}

            {source ? (
              <div className="mt-5 space-y-6">
                {editableFields.length > 0 ? (
                  <div>
                    <h2 className="text-sm font-semibold">Form fields</h2>
                    <div className="mt-3 grid gap-4 sm:grid-cols-2">
                      {editableFields.map((field) => (
                        <label key={field.name} className="block text-sm">
                          <span className="font-medium">{field.name}</span>
                          {field.kind === 'text' && field.multiline ? (
                            <textarea
                              rows={3}
                              value={values[field.name] ?? ''}
                              aria-label={field.name}
                              onChange={(event) =>
                                setValue(field.name, event.target.value)
                              }
                              className="focus-ring mt-2 w-full rounded-xl border bg-background p-3 text-sm"
                            />
                          ) : null}
                          {field.kind === 'text' && !field.multiline ? (
                            <input
                              type="text"
                              value={values[field.name] ?? ''}
                              aria-label={field.name}
                              onChange={(event) =>
                                setValue(field.name, event.target.value)
                              }
                              className="focus-ring mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm"
                            />
                          ) : null}
                          {field.kind === 'checkbox' ? (
                            <span className="mt-2 flex h-11 items-center gap-2">
                              <input
                                type="checkbox"
                                checked={values[field.name] === 'on'}
                                aria-label={field.name}
                                onChange={(event) =>
                                  setValue(
                                    field.name,
                                    event.target.checked ? 'on' : 'off',
                                  )
                                }
                                className="accent-foreground"
                              />
                              <span className="text-muted-foreground">
                                Ticked
                              </span>
                            </span>
                          ) : null}
                          {field.kind === 'radio' ||
                          field.kind === 'dropdown' ||
                          field.kind === 'optionList' ? (
                            <select
                              value={values[field.name] ?? ''}
                              aria-label={field.name}
                              onChange={(event) =>
                                setValue(field.name, event.target.value)
                              }
                              className="focus-ring mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm"
                            >
                              <option value="">Leave blank</option>
                              {field.options.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          ) : null}
                        </label>
                      ))}
                    </div>
                    {lockedFields.length > 0 ? (
                      <p className="mt-3 text-xs text-muted-foreground">
                        {lockedFields.length}{' '}
                        {lockedFields.length === 1 ? 'field is' : 'fields are'}{' '}
                        locked by the document and left untouched:{' '}
                        {lockedFields.map((field) => field.name).join(', ')}.
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    This PDF has no fillable form fields. You can still sign it.
                  </p>
                )}

                <div>
                  <h2 className="text-sm font-semibold">Signature</h2>
                  <p
                    id="signature-pad-help"
                    className="mt-1 text-sm text-muted-foreground"
                  >
                    Draw with a mouse, trackpad or finger, or type your name
                    with the keyboard.
                  </p>

                  <fieldset className="mt-3">
                    <legend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Signature mode
                    </legend>
                    <div className="mt-2 flex gap-5">
                      <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium">
                        <input
                          type="radio"
                          name="signature-mode"
                          value="draw"
                          checked={mode === 'draw'}
                          onChange={() => handleModeChange('draw')}
                          className="accent-foreground"
                        />
                        Draw
                      </label>
                      <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium">
                        <input
                          type="radio"
                          name="signature-mode"
                          value="type"
                          checked={mode === 'type'}
                          onChange={() => handleModeChange('type')}
                          className="accent-foreground"
                        />
                        Type your name
                      </label>
                    </div>
                  </fieldset>

                  {mode === 'type' ? (
                    <div className="mt-3">
                      <label
                        htmlFor="typed-name-input"
                        className="block text-sm font-medium"
                      >
                        Type your name
                      </label>
                      <input
                        id="typed-name-input"
                        type="text"
                        value={typedName}
                        onChange={(e) => handleTypedNameChange(e.target.value)}
                        placeholder="e.g. Jane Doe"
                        className="focus-ring mt-1 h-11 w-full rounded-xl border bg-background px-3 text-sm"
                      />
                    </div>
                  ) : null}

                  {/*
                    A bare <canvas> has no implicit role, so a label on it alone
                    is not reliably announced. The group carries the name and
                    the instructions; the canvas keeps its label as well so it
                    can be addressed directly.
                  */}
                  <fieldset
                    aria-describedby="signature-pad-help"
                    className="mt-3"
                  >
                    <legend className="sr-only">Signature pad</legend>
                    <canvas
                      ref={padRef}
                      width={SIGNATURE_CANVAS.width}
                      height={SIGNATURE_CANVAS.height}
                      aria-label="Signature pad"
                      onPointerDown={startStroke}
                      onPointerMove={continueStroke}
                      onPointerUp={endStroke}
                      onPointerLeave={endStroke}
                      className={`aspect-[16/5] w-full rounded-xl border border-dashed bg-background ${
                        mode === 'draw' ? 'touch-none' : 'pointer-events-none'
                      }`}
                    />
                  </fieldset>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-xs text-muted-foreground">
                      {hasSignature
                        ? 'Signature ready'
                        : mode === 'type'
                          ? 'Enter your name above to create a signature'
                          : 'Nothing drawn yet — the PDF will just be filled in'}
                    </span>
                    <Button
                      variant="ghost"
                      className="h-9"
                      onClick={clearSignature}
                    >
                      Clear signature
                    </Button>
                  </div>
                </div>

                {hasSignature && page ? (
                  <div>
                    <h2 className="text-sm font-semibold">Where it goes</h2>
                    <div className="mt-3 grid gap-4 sm:grid-cols-[1fr_220px]">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block text-sm">
                          <span className="font-medium">Page</span>
                          <input
                            type="number"
                            min={1}
                            max={source.pages}
                            value={signaturePage}
                            aria-label="Signature page"
                            onChange={(event) => {
                              setSignaturePage(
                                Math.min(
                                  source.pages,
                                  Math.max(1, Number(event.target.value) || 1),
                                ),
                              );
                              clearResult();
                            }}
                            className="focus-ring mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm"
                          />
                        </label>
                        <label className="block text-sm">
                          <span className="font-medium">Width (pt)</span>
                          <input
                            type="number"
                            min={20}
                            max={Math.round(page.width)}
                            value={signatureWidth}
                            aria-label="Signature width"
                            onChange={(event) => {
                              setSignatureWidth(
                                Math.max(20, Number(event.target.value) || 20),
                              );
                              clearResult();
                            }}
                            className="focus-ring mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm"
                          />
                        </label>
                        <label className="block text-sm">
                          <span className="font-medium">From left (pt)</span>
                          <input
                            type="number"
                            min={0}
                            max={Math.round(page.width)}
                            value={signatureX}
                            aria-label="Signature from left"
                            onChange={(event) => {
                              setSignatureX(
                                Math.max(0, Number(event.target.value) || 0),
                              );
                              clearResult();
                            }}
                            className="focus-ring mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm"
                          />
                        </label>
                        <label className="block text-sm">
                          <span className="font-medium">From top (pt)</span>
                          <input
                            type="number"
                            min={0}
                            max={Math.round(page.height)}
                            value={signatureY}
                            aria-label="Signature from top"
                            onChange={(event) => {
                              setSignatureY(
                                Math.max(0, Number(event.target.value) || 0),
                              );
                              clearResult();
                            }}
                            className="focus-ring mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm"
                          />
                        </label>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Page {signaturePage} is {Math.round(page.width)} ×{' '}
                          {Math.round(page.height)} pt. Click the outline to
                          place the signature.
                        </p>
                        <button
                          type="button"
                          aria-label="Place the signature on the page outline"
                          onClick={(event) => {
                            const box =
                              event.currentTarget.getBoundingClientRect();
                            setSignatureX(
                              Math.round(
                                ((event.clientX - box.left) / box.width) *
                                  page.width,
                              ),
                            );
                            setSignatureY(
                              Math.round(
                                ((event.clientY - box.top) / box.height) *
                                  page.height,
                              ),
                            );
                            clearResult();
                          }}
                          style={{
                            aspectRatio: `${page.width} / ${page.height}`,
                          }}
                          className="focus-ring relative mt-2 w-full rounded-lg border bg-background"
                        >
                          <span
                            aria-hidden="true"
                            className="absolute rounded-sm border border-foreground bg-foreground/15"
                            style={{
                              left: `${(signatureX / page.width) * 100}%`,
                              top: `${(signatureY / page.height) * 100}%`,
                              width: `${(signatureWidth / page.width) * 100}%`,
                              height: `${((signatureWidth * (SIGNATURE_CANVAS.height / SIGNATURE_CANVAS.width)) / page.height) * 100}%`,
                            }}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}

                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    aria-label="Make the document final"
                    checked={flatten}
                    onChange={(event) => {
                      setFlatten(event.target.checked);
                      clearResult();
                    }}
                    className="mt-0.5 accent-foreground"
                  />
                  <span>
                    <span className="font-semibold">Make it final</span>
                    <span className="mt-1 block text-muted-foreground">
                      Bakes the values into the page and removes the form, so
                      the next person cannot edit what you entered. Leave this
                      off while the document is still going round.
                    </span>
                  </span>
                </label>

                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button
                    variant="ghost"
                    className="h-11"
                    disabled={status === 'processing'}
                    onClick={clear}
                  >
                    <Trash2 aria-hidden="true" /> Clear
                  </Button>
                  <Button
                    className="h-11 min-w-44"
                    disabled={status === 'processing'}
                    onClick={() => void run()}
                  >
                    <PenLine aria-hidden="true" />
                    {status === 'processing'
                      ? 'Working locally…'
                      : 'Finish PDF'}
                  </Button>
                </div>
              </div>
            ) : null}
          </section>

          {receipt ? (
            <section className="mt-5 overflow-hidden rounded-2xl border bg-card">
              <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full border">
                    <CheckCircle2 aria-hidden="true" className="size-5" />
                  </span>
                  <div>
                    <h2 className="text-lg font-semibold">
                      Done — {receipt.pages}{' '}
                      {receipt.pages === 1 ? 'page' : 'pages'} ready
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatBytes(receipt.bytes)} · completed in{' '}
                      {formatDuration(receipt.durationMs)}
                    </p>
                  </div>
                </div>
                <Button
                  nativeButton={false}
                  className="h-11 px-5"
                  render={
                    <a
                      data-receipt-download
                      href={receipt.url}
                      download="completed.pdf"
                      aria-label="Save completed PDF"
                    />
                  }
                >
                  <ArrowDownToLine aria-hidden="true" /> Save PDF
                </Button>
              </div>
              <div className="grid border-t sm:grid-cols-3">
                <div className="border-b p-4 sm:border-b-0 sm:border-r">
                  <p className="text-xs text-muted-foreground">Fields</p>
                  <p className="mt-1 text-sm font-semibold">
                    {receipt.fieldsFilled} filled
                    {receipt.flattened ? ', now final' : ', still editable'}
                  </p>
                </div>
                <div className="border-b p-4 sm:border-b-0 sm:border-r">
                  <p className="text-xs text-muted-foreground">Signature</p>
                  <p className="mt-1 text-sm font-semibold">
                    {receipt.signaturePlaced
                      ? mode === 'type'
                        ? 'Typed onto the page'
                        : 'Drawn onto the page'
                      : 'Not added'}
                  </p>
                </div>
                <div className="p-4">
                  <p className="text-xs text-muted-foreground">Where it ran</p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold">
                    <ShieldCheck aria-hidden="true" className="size-4" /> In
                    this browser tab
                  </p>
                </div>
              </div>
            </section>
          ) : null}

          <footer className="mt-10 border-t py-6 text-xs text-muted-foreground">
            Candidate {manifest.version} · pdf-lib · Browser worker
          </footer>
        </div>
      </section>
    </AppShell>
  );
}
