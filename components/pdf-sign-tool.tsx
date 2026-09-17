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
  PdfFormDocumentInfo,
  PdfFormField,
  PdfFormFieldReadOnlyReason,
  PdfFormFieldValue,
  PdfPageGeometry,
  PdfWorkerInput,
  PdfWorkerRequest,
  PdfWorkerResponse,
} from '@/lib/tools/pdf/protocol';
import {
  changedFieldValues,
  clampSignaturePlacement,
  displayFieldValue,
  MIN_SIGNATURE_WIDTH,
  isEditableField,
  missingRequiredFields,
  placeSignatureAt,
  type SignaturePlacement,
} from '@/lib/tools/pdf/sign-form-state';
import {
  PAPER_INK,
  cssRgb,
  parseCssColor,
  tintPixels,
  type Rgb,
} from '@/lib/tools/pdf/signature-ink';
import { rectFitsPage } from '@/lib/tools/pdf/signature-placement';

type SignatureMode = 'draw' | 'type';
type SourcePdf = {
  id: string;
  file: File;
  pages: number;
  pageSizes: PdfPageGeometry[];
  fields: PdfFormField[];
  info: PdfFormDocumentInfo;
};
type Receipt = {
  url: string;
  /** The source had a form at all, so "still editable" means something. */
  hadForm: boolean;
  bytes: number;
  pages: number;
  fieldsChanged: number;
  signaturePlaced: boolean;
  signatureMode: SignatureMode;
  flattened: boolean;
  durationMs: number;
};

const MAX_BYTES = 150 * 1024 * 1024;
const SIGNATURE_CANVAS = { width: 640, height: 200 };
/** The stamp's height over its width: the whole pad is exported. */
const SIGNATURE_ASPECT = SIGNATURE_CANVAS.height / SIGNATURE_CANVAS.width;
const DEFAULT_PLACEMENT: SignaturePlacement = { x: 72, y: 72, width: 180 };

type ErrorState = {
  /** `open` when a chosen file could not be read, `finish` otherwise. */
  kind: 'open' | 'finish';
  message: string;
  /** Changes on every report, so the same message is announced again. */
  serial: number;
};

const READ_ONLY_REASONS: Record<PdfFormFieldReadOnlyReason, string> = {
  locked: 'locked by the document',
  richText: 'rich text, kept as it is so its formatting survives',
  duplicateName:
    'shares its name with another field, so neither can be told apart',
  unreadable: 'could not be read',
};

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

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

async function toWorkerInput(source: { id: string; file: File }) {
  return {
    id: source.id,
    name: source.file.name,
    bytes: await source.file.arrayBuffer(),
  } satisfies PdfWorkerInput;
}

/**
 * Exports the signature pad as PNG bytes in dark ink.
 *
 * The pad draws in the theme's foreground so it is visible in dark mode; the
 * copy stamped onto the PDF is recoloured to dark ink, as on paper. Null means
 * the browser did not produce a PNG, which the caller must report rather than
 * silently stamping nothing onto the page.
 */
async function signaturePngBytes(canvas: HTMLCanvasElement | null) {
  if (!canvas) return null;
  const copy = document.createElement('canvas');
  copy.width = canvas.width;
  copy.height = canvas.height;
  const from = canvas.getContext('2d');
  const to = copy.getContext('2d');
  if (!from || !to) return null;
  const pixels = from.getImageData(0, 0, canvas.width, canvas.height);
  tintPixels(pixels.data, PAPER_INK);
  to.putImageData(pixels, 0, 0);
  const blob = await new Promise<Blob | null>((resolve) =>
    copy.toBlob(resolve, 'image/png'),
  );
  if (!blob || blob.type !== 'image/png') return null;
  return blob.arrayBuffer();
}

/** The theme foreground the pad draws with, or dark ink if it is unknown. */
function screenInk(canvas: HTMLCanvasElement | null) {
  const color = canvas ? parseCssColor(getComputedStyle(canvas).color) : null;
  return color ?? PAPER_INK;
}

/** Recolours what is on the pad when the theme's foreground changes. */
function syncPadInk(
  canvas: HTMLCanvasElement | null,
  inkRef: { current: Rgb },
) {
  const ink = screenInk(canvas);
  if (ink.join() === inkRef.current.join()) return;
  inkRef.current = ink;
  const context = canvas?.getContext('2d');
  if (!canvas || !context) return;
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  tintPixels(pixels.data, ink);
  context.putImageData(pixels, 0, 0);
}

function initialValues(fields: PdfFormField[]) {
  return Object.fromEntries(
    fields
      .filter(isEditableField)
      .map((field) => [field.id, field.value] as const),
  );
}

type FieldControlProps = {
  field: PdfFormField;
  domId: string;
  value: PdfFormFieldValue;
  invalid: boolean;
  onChange: (value: PdfFormFieldValue) => void;
};

function CalculatedNote({ field }: { field: PdfFormField }) {
  return field.calculated ? (
    <span className="mt-1 block text-xs text-muted-foreground">
      The form calculates this field itself. It is not recalculated here.
    </span>
  ) : null;
}

function RequiredMark({ field }: { field: PdfFormField }) {
  return field.required ? (
    <span className="ml-2 text-xs font-semibold text-muted-foreground">
      Required
    </span>
  ) : null;
}

/** One editable field, drawn with the control its kind needs. */
function FieldControl({
  field,
  domId,
  value,
  invalid,
  onChange,
}: FieldControlProps) {
  const controlClass =
    'focus-ring mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm aria-[invalid=true]:border-destructive';
  const common = {
    id: domId,
    'aria-label': field.name,
    'aria-required': field.required || undefined,
    'aria-invalid': invalid || undefined,
  };

  if (field.kind === 'optionList' && field.multiSelect) {
    const selected = Array.isArray(value) ? value : [];
    // A value the file holds that the options no longer list still gets its
    // own row, so it can be seen and kept or cleared.
    const stored = Array.isArray(field.value) ? field.value : [];
    const rows = [
      ...field.options,
      ...stored
        .filter(
          (item) => !field.options.some((option) => option.value === item),
        )
        .map((item) => ({ value: item, display: `${item} (not in the list)` })),
    ];
    return (
      <fieldset className="block min-w-0 text-sm">
        <legend className="font-medium">
          {field.name}
          <RequiredMark field={field} />
        </legend>
        <span className="mt-1 block text-xs text-muted-foreground">
          Choose any number.
        </span>
        <span className="mt-2 grid gap-2">
          {rows.map((option) => (
            <label key={option.value} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selected.includes(option.value)}
                aria-required={field.required || undefined}
                aria-invalid={invalid || undefined}
                onChange={(event) =>
                  onChange(
                    event.target.checked
                      ? [...selected, option.value]
                      : selected.filter((item) => item !== option.value),
                  )
                }
                className="accent-foreground"
              />
              {option.display}
            </label>
          ))}
        </span>
        <CalculatedNote field={field} />
      </fieldset>
    );
  }

  let control: React.ReactNode;
  if (field.kind === 'text') {
    const text = typeof value === 'string' ? value : '';
    control = field.multiline ? (
      <textarea
        {...common}
        rows={3}
        value={text}
        maxLength={field.maxLength ?? undefined}
        onChange={(event) => onChange(event.target.value)}
        className="focus-ring mt-2 w-full rounded-xl border bg-background p-3 text-sm aria-[invalid=true]:border-destructive"
      />
    ) : (
      <input
        {...common}
        type="text"
        value={text}
        maxLength={field.maxLength ?? undefined}
        onChange={(event) => onChange(event.target.value)}
        className={controlClass}
      />
    );
  } else if (field.kind === 'checkbox') {
    control = (
      <span className="mt-2 flex h-11 items-center gap-2">
        <input
          {...common}
          type="checkbox"
          checked={value === true}
          onChange={(event) => onChange(event.target.checked)}
          className="accent-foreground"
        />
        <span className="text-muted-foreground">
          {value === true ? 'Ticked' : 'Not ticked'}
        </span>
      </span>
    );
  } else if (field.kind === 'dropdown' && field.editable) {
    control = (
      <>
        <input
          {...common}
          type="text"
          list={`${domId}-options`}
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(event.target.value)}
          className={controlClass}
        />
        <datalist id={`${domId}-options`}>
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.display}
            </option>
          ))}
        </datalist>
      </>
    );
  } else {
    // Radio groups, check-box groups, dropdowns and single-choice lists: the
    // export value is sent, the display text is shown.
    const isList = field.kind === 'optionList';
    const current = isList
      ? ((Array.isArray(value) ? value[0] : '') ?? '')
      : typeof value === 'string'
        ? value
        : '';
    const known = field.options.some((option) => option.value === current);
    control = (
      <select
        {...common}
        value={current}
        onChange={(event) => {
          const next = event.target.value;
          onChange(isList ? (next ? [next] : []) : next);
        }}
        className={controlClass}
      >
        <option value="">Leave blank</option>
        {current && !known ? (
          <option value={current}>{current} (not in the list)</option>
        ) : null}
        {field.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.display}
          </option>
        ))}
      </select>
    );
  }

  return (
    <label className="block text-sm">
      <span className="font-medium">
        {field.name}
        <RequiredMark field={field} />
      </span>
      {control}
      <CalculatedNote field={field} />
    </label>
  );
}

type NumberFieldProps = {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  /** Receives a finite number; the caller clamps it. */
  onCommit: (value: number) => void;
};

/**
 * A number input that lets a value be typed digit by digit. A value below
 * the minimum is kept as typed until the field is left or Enter is pressed,
 * so typing 150 does not jump to the minimum after the 1. A value above the
 * maximum is pulled in at once.
 */
function NumberField({
  id,
  label,
  value,
  min,
  max,
  onCommit,
}: NumberFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);

  const commitDraft = () => {
    if (draft === null) return;
    const parsed = Number(draft);
    setDraft(null);
    if (draft.trim() !== '' && Number.isFinite(parsed)) onCommit(parsed);
  };

  return (
    <input
      id={id}
      type="number"
      min={min}
      max={max}
      value={draft ?? value}
      aria-label={label}
      onChange={(event) => {
        const text = event.target.value;
        const parsed = Number(text);
        if (text.trim() === '' || !Number.isFinite(parsed) || parsed < min) {
          setDraft(text);
          return;
        }
        setDraft(null);
        onCommit(parsed);
      }}
      onBlur={commitDraft}
      onKeyDown={(event) => {
        if (event.key === 'Enter') commitDraft();
      }}
      className="focus-ring mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm"
    />
  );
}

export function PdfSignTool() {
  const fileRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const outputUrlRef = useRef<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLHeadingElement>(null);
  const receiptRef = useRef<HTMLHeadingElement>(null);
  const padRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const inkRef = useRef<Rgb>(PAPER_INK);
  // Each inspection or fill gets a number. A worker reply is used only while
  // its number is still the latest, so a slow old job cannot overwrite a newer
  // file or result.
  const taskRef = useRef(0);
  const errorSerialRef = useRef(0);

  const [source, setSource] = useState<SourcePdf | null>(null);
  const [pendingName, setPendingName] = useState('');
  const [values, setValues] = useState<Record<string, PdfFormFieldValue>>({});
  const [invalidIds, setInvalidIds] = useState<string[]>([]);
  const [mode, setMode] = useState<SignatureMode>('draw');
  const [typedName, setTypedName] = useState('');
  const [hasSignature, setHasSignature] = useState(false);
  const [signaturePage, setSignaturePage] = useState(1);
  const [placement, setPlacement] =
    useState<SignaturePlacement>(DEFAULT_PLACEMENT);
  const [flatten, setFlatten] = useState(true);
  const [status, setStatus] = useState<
    'idle' | 'inspecting' | 'ready' | 'processing' | 'success' | 'error'
  >('idle');
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [errorState, setErrorState] = useState<ErrorState | null>(null);
  const error = errorState?.message ?? '';
  const manifest = publicTools.find((tool) => tool.id === 'pdf-sign')!;

  const busy = status === 'inspecting' || status === 'processing';
  const blocked =
    !!source &&
    (source.info.hasDigitalSignature || source.info.xfa === 'dynamic');

  useEffect(
    () => () => {
      taskRef.current += 1;
      workerRef.current?.terminate();
      if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current);
    },
    [],
  );
  useEffect(() => {
    if (errorState) errorRef.current?.focus();
  }, [errorState]);
  // Finish disables itself while it works; the receipt takes focus after.
  useEffect(() => {
    if (receipt) receiptRef.current?.focus();
  }, [receipt]);
  // A newly read file replaces the drop zone or the old form, which would
  // otherwise leave keyboard focus on nothing.
  useEffect(() => {
    if (source) summaryRef.current?.focus();
  }, [source]);

  const syncInk = () => syncPadInk(padRef.current, inkRef);

  useEffect(() => {
    const sync = () => syncPadInk(padRef.current, inkRef);
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style', 'data-theme'],
    });
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    media?.addEventListener?.('change', sync);
    return () => {
      observer.disconnect();
      media?.removeEventListener?.('change', sync);
    };
  }, []);

  const setError = (message: string, kind: ErrorState['kind'] = 'finish') => {
    errorSerialRef.current += 1;
    setErrorState(
      message ? { kind, message, serial: errorSerialRef.current } : null,
    );
  };

  /**
   * A chosen file could not be opened. Whatever was loaded before stays
   * loaded, and the message says so rather than implying it was replaced.
   */
  const setOpenError = (fileName: string, message: string) => {
    setError(
      `“${fileName}” could not be opened. ${message}${
        source ? ` “${source.file.name}” is still loaded.` : ''
      }`,
      'open',
    );
  };

  /** Starts a new task: stops whatever worker was running and outdates it. */
  const beginTask = () => {
    workerRef.current?.terminate();
    workerRef.current = null;
    taskRef.current += 1;
    return taskRef.current;
  };

  const endTask = (worker: Worker) => {
    worker.terminate();
    if (workerRef.current === worker) workerRef.current = null;
  };

  const clearResult = () => {
    if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current);
    outputUrlRef.current = null;
    setReceipt(null);
  };

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

    inkRef.current = screenInk(canvas);
    context.fillStyle = cssRgb(inkRef.current);
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

  const handleModeChange = (newMode: SignatureMode) => {
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

  const padContext = () => {
    const canvas = padRef.current;
    if (!canvas) return null;
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.lineWidth = 3;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = cssRgb(inkRef.current);
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
    if (mode !== 'draw' || busy || blocked) return;
    syncInk();
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
    if (mode !== 'draw' || busy) return;
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
    if (!file || busy) return;
    clearResult();
    setError('');
    setInvalidIds([]);
    if (file.size > MAX_BYTES) {
      setOpenError(file.name, 'This candidate limits a source PDF to 150 MB.');
      return;
    }
    const candidate = { id: crypto.randomUUID(), file };
    const task = beginTask();
    setPendingName(file.name);
    setStatus('inspecting');
    try {
      const input = await toWorkerInput(candidate);
      if (task !== taskRef.current) return;
      const worker = createWorker();
      workerRef.current = worker;
      worker.onmessage = (event: MessageEvent<PdfWorkerResponse>) => {
        const message = event.data;
        if (message.type !== 'form' && message.type !== 'error') return;
        endTask(worker);
        if (task !== taskRef.current) return;
        if (message.type === 'form') {
          const lastPage = Math.max(1, message.pages);
          const geometry = message.pageSizes[lastPage - 1];
          setSource({
            ...candidate,
            pages: message.pages,
            pageSizes: message.pageSizes,
            fields: message.fields,
            info: message.document,
          });
          setValues(initialValues(message.fields));
          setSignaturePage(lastPage);
          if (geometry) {
            setPlacement((current) =>
              clampSignaturePlacement(geometry, current, SIGNATURE_ASPECT),
            );
          }
          setStatus('ready');
        } else {
          setStatus('error');
          setOpenError(file.name, message.message);
        }
      };
      worker.onerror = () => {
        endTask(worker);
        if (task !== taskRef.current) return;
        setStatus('error');
        setOpenError(file.name, 'The PDF inspector stopped unexpectedly.');
      };
      const request: PdfWorkerRequest = { type: 'inspect-form', input };
      worker.postMessage(request, [input.bytes]);
    } catch {
      if (task !== taskRef.current) return;
      beginTask();
      setStatus('error');
      setOpenError(file.name, 'The browser could not read that file.');
    }
  };

  const page = source?.pageSizes[signaturePage - 1];
  const visibleFields = source?.fields.filter((field) => !field.hidden) ?? [];
  const editableFields = visibleFields.filter(isEditableField);
  const readOnlyFields = visibleFields.filter((field) => field.readOnly);
  const hiddenCount = (source?.fields.length ?? 0) - visibleFields.length;
  const missingRequired = source
    ? missingRequiredFields(source.fields, values)
    : [];
  const calculatedFields = visibleFields.filter((field) => field.calculated);
  const hasChanges =
    !!source &&
    Object.keys(changedFieldValues(source.fields, values)).length > 0;
  const fieldCountText = !source
    ? ''
    : source.fields.length === 0
      ? 'no form fields'
      : blocked
        ? `${plural(visibleFields.length, 'form field', 'form fields')}, none can be changed`
        : `${editableFields.length} fillable ${
            editableFields.length === 1 ? 'field' : 'fields'
          }`;
  const domIds = new Map(
    source?.fields.map((field, index) => [field.id, `pdf-field-${index}`]),
  );

  const run = async () => {
    if (!source || busy || blocked) return;
    clearResult();
    setError('');
    setInvalidIds([]);

    if (flatten && missingRequired.length > 0) {
      setInvalidIds(missingRequired.map((field) => field.id));
      setError(
        `Fill in the required ${
          missingRequired.length === 1 ? 'field' : 'fields'
        } before making it final: ${missingRequired
          .map((field) => `“${field.name}”`)
          .join(
            ', ',
          )}. You can also turn off “Make it final” and save it as it is.`,
      );
      return;
    }
    const placementPage = source.pageSizes[signaturePage - 1];
    if (
      hasSignature &&
      (!placementPage ||
        !rectFitsPage(placementPage, {
          ...placement,
          height: placement.width * SIGNATURE_ASPECT,
        }))
    ) {
      setError(
        `The signature must sit fully inside page ${signaturePage}. Move it or make it narrower, then try again.`,
      );
      return;
    }

    const task = beginTask();
    const signatureMode = mode;
    setStatus('processing');
    try {
      const image = hasSignature
        ? await signaturePngBytes(padRef.current)
        : null;
      if (task !== taskRef.current) return;
      if (hasSignature && !image) {
        setStatus('error');
        setError('This browser could not turn the signature into an image.');
        return;
      }

      const input = await toWorkerInput(source);
      if (task !== taskRef.current) return;
      const options: PdfFillOptions = {
        values: changedFieldValues(source.fields, values),
        signature: image
          ? {
              image,
              pageIndex: signaturePage - 1,
              x: placement.x,
              y: placement.y,
              width: placement.width,
            }
          : null,
        flatten,
      };
      const worker = createWorker();
      workerRef.current = worker;
      worker.onmessage = (event: MessageEvent<PdfWorkerResponse>) => {
        const message = event.data;
        if (message.type !== 'result' && message.type !== 'error') return;
        endTask(worker);
        if (task !== taskRef.current) return;
        if (message.type === 'result') {
          const blob = new Blob([message.bytes], { type: 'application/pdf' });
          if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current);
          const url = URL.createObjectURL(blob);
          outputUrlRef.current = url;
          // The worker measures the work itself, which is what the receipt
          // should report: wall-clock here would also count React's re-render.
          const durationMs =
            message.computeDurationMs + message.validationDurationMs;
          const fieldsChanged = message.fieldsChanged ?? 0;
          const signaturePlaced = message.signaturePlaced ?? false;
          setReceipt({
            url,
            hadForm: source.fields.length > 0 || source.info.formUnreadable,
            bytes: blob.size,
            pages: message.pageCount,
            fieldsChanged,
            signaturePlaced,
            signatureMode,
            flattened: message.flattened ?? false,
            durationMs,
          });
          setStatus('success');
          announceCompletion({
            operation: 'PDF sign and fill',
            durationMs,
            summary: `${plural(message.pageCount, 'page', 'pages')} completed and checked in this browser.`,
            metrics: [
              { label: 'Fields', value: `${fieldsChanged} changed` },
              {
                label: 'Signature',
                value: signaturePlaced ? 'Placed' : 'None',
              },
              { label: 'Output', value: formatBytes(blob.size) },
            ],
          });
        } else {
          setStatus('error');
          setInvalidIds(message.fieldIds ?? []);
          setError(message.message);
        }
      };
      worker.onerror = () => {
        endTask(worker);
        if (task !== taskRef.current) return;
        setStatus('error');
        setError('Signing stopped unexpectedly. Your original is unchanged.');
      };
      const request: PdfWorkerRequest = { type: 'fill', input, options };
      worker.postMessage(request, [input.bytes]);
    } catch {
      if (task !== taskRef.current) return;
      beginTask();
      setStatus('error');
      setError('Signing could not start. Your original is unchanged.');
    }
  };

  const clear = () => {
    beginTask();
    clearResult();
    clearSignature();
    setSource(null);
    setValues({});
    setInvalidIds([]);
    setPendingName('');
    setError('');
    setStatus('idle');
    if (fileRef.current) fileRef.current.value = '';
  };

  const setValue = (id: string, value: PdfFormFieldValue) => {
    if (busy || blocked) return;
    setValues((current) => ({ ...current, [id]: value }));
    setInvalidIds((current) => current.filter((item) => item !== id));
    clearResult();
  };

  const updatePlacement = (
    next: SignaturePlacement,
    pageNumber = signaturePage,
  ) => {
    const geometry = source?.pageSizes[pageNumber - 1];
    if (!geometry) return;
    setPlacement(clampSignaturePlacement(geometry, next, SIGNATURE_ASPECT));
    clearResult();
  };

  const liveMessage =
    status === 'inspecting'
      ? `Reading ${pendingName} in this browser…`
      : status === 'processing'
        ? 'Finishing the PDF in this browser…'
        : status === 'success' && receipt
          ? // Worded unlike the receipt so a text search finds the receipt once.
            `The completed PDF is ready to save: ${plural(receipt.pages, 'page', 'pages')}, ${plural(receipt.fieldsChanged, 'field', 'fields')} changed, ${
              receipt.flattened
                ? 'form made final'
                : receipt.hadForm
                  ? 'form left editable'
                  : 'no form in the file'
            }, ${receipt.signaturePlaced ? 'signature added' : 'no signature'}.`
          : status === 'ready' && source
            ? source.info.hasDigitalSignature
              ? `${source.file.name} is ready: ${plural(source.pages, 'page', 'pages')}. It already carries a digital signature and cannot be changed here.`
              : source.info.xfa === 'dynamic'
                ? `${source.file.name} is ready: ${plural(source.pages, 'page', 'pages')}. It is a dynamic XFA form and cannot be filled here.`
                : `${source.file.name} is ready: ${plural(source.pages, 'page', 'pages')}, ${plural(editableFields.length, 'field', 'fields')} to fill.`
            : '';

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

          <div className="mt-6 space-y-3 rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
            <p>
              <strong className="font-semibold text-foreground">
                This draws or types a signature, it does not certify one.
              </strong>{' '}
              The result is an image on the page, the same as signing a printout
              and scanning it. It carries no certificate and no audit trail, so
              it proves nothing about who signed or when. Where a document
              demands a qualified or digital signature, this is not that.
            </p>
            <p>
              <strong className="font-semibold text-foreground">
                Form fields accept only basic Latin text for now.
              </strong>{' '}
              English and most Western European letters work; characters such as
              ₹, Ł, Vietnamese, Devanagari or Chinese cannot be written into a
              field yet, and the page tells you which one stopped it. A typed or
              drawn signature is an image, so any script works there. Sign by
              drawing with a mouse, trackpad or finger, or by typing your name
              with the keyboard.
            </p>
          </div>

          <output aria-live="polite" className="sr-only">
            {liveMessage}
          </output>

          {error ? (
            <div
              key={errorState?.serial}
              ref={errorRef}
              role="alert"
              tabIndex={-1}
              className="focus-ring mt-6 flex items-start justify-between gap-4 rounded-xl border border-destructive/35 bg-destructive/5 p-4 text-sm"
            >
              <div>
                <p className="font-semibold">
                  {errorState?.kind === 'open'
                    ? 'Couldn’t open this PDF'
                    : 'Couldn’t complete this PDF'}
                </p>
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

          <section
            aria-busy={busy}
            className="mt-8 overflow-hidden rounded-2xl border bg-card p-5 sm:p-6"
          >
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,.pdf"
              aria-label="Choose source PDF"
              className="sr-only"
              disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0];
                // Reset so choosing the same file again still fires a change.
                event.target.value = '';
                void choosePdf(file);
              }}
            />

            {source ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
                <div className="min-w-0">
                  <h2
                    ref={summaryRef}
                    tabIndex={-1}
                    className="focus-ring truncate text-sm font-semibold"
                  >
                    {source.file.name}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {status === 'inspecting'
                      ? `Reading ${pendingName} locally…`
                      : `${plural(source.pages, 'page', 'pages')} · ${fieldCountText}`}
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="h-10"
                  disabled={busy}
                  onClick={() => fileRef.current?.click()}
                >
                  Choose another
                </Button>
              </div>
            ) : (
              <button
                type="button"
                aria-label="Choose a PDF to sign"
                disabled={busy}
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
                {source.info.hasDigitalSignature ? (
                  <p className="rounded-xl border border-destructive/35 bg-destructive/5 p-4 text-sm">
                    <strong className="font-semibold">
                      This PDF already carries a digital signature.
                    </strong>{' '}
                    Any change here, even adding a drawn signature or making it
                    final, would break that signature, so this page will not
                    modify it. Ask the sender for an unsigned copy, or use the
                    signing software the document was prepared with.
                  </p>
                ) : source.info.xfa === 'dynamic' ? (
                  <p className="rounded-xl border border-destructive/35 bg-destructive/5 p-4 text-sm">
                    <strong className="font-semibold">
                      This is a dynamic XFA form.
                    </strong>{' '}
                    It draws its own pages from form data, so it cannot be
                    filled, signed or made final here. Open it in a viewer that
                    supports XFA forms.
                  </p>
                ) : source.info.xfa === 'static' ? (
                  <p className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
                    <strong className="font-semibold text-foreground">
                      This form also has an XFA version.
                    </strong>{' '}
                    Every save removes the XFA part, even when you only sign, so
                    viewers show the ordinary form below from then on. Those
                    fields stay editable unless you make it final, which bakes
                    them into the page and removes the form.
                  </p>
                ) : source.info.formUnreadable ? (
                  <p className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
                    <strong className="font-semibold text-foreground">
                      This PDF’s form could not be read.
                    </strong>{' '}
                    Its fields cannot be filled or made final here. Turn off
                    “Make it final” to add a signature and leave the form as it
                    is.
                  </p>
                ) : null}

                <fieldset
                  disabled={busy || blocked}
                  className="min-w-0 space-y-6"
                >
                  <legend className="sr-only">Fill and sign</legend>
                  {editableFields.length > 0 ? (
                    <div>
                      <h2 className="text-sm font-semibold">Form fields</h2>
                      {editableFields.some((field) => field.required) ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Fields marked Required must be filled before the
                          document can be made final.
                        </p>
                      ) : null}
                      {calculatedFields.length > 0 ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          This form calculates{' '}
                          {calculatedFields
                            .map((field) => `“${field.name}”`)
                            .join(', ')}{' '}
                          itself. Form scripts do not run here, so those values
                          are not recalculated when you change other fields.
                        </p>
                      ) : null}
                      <div className="mt-3 grid gap-4 sm:grid-cols-2">
                        {editableFields.map((field) => (
                          <FieldControl
                            key={field.id}
                            field={field}
                            domId={domIds.get(field.id)!}
                            value={values[field.id] ?? field.value}
                            invalid={invalidIds.includes(field.id)}
                            onChange={(value) => setValue(field.id, value)}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {readOnlyFields.length > 0
                        ? 'None of this PDF’s form fields can be filled here. You can still sign it.'
                        : 'This PDF has no fillable form fields. You can still sign it.'}
                    </p>
                  )}

                  {readOnlyFields.length > 0 ? (
                    <div>
                      <h2 className="text-sm font-semibold">
                        Left as they are
                      </h2>
                      <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                        {readOnlyFields.map((field) => (
                          <li key={field.id}>
                            <span className="font-medium text-foreground">
                              {field.name}
                            </span>{' '}
                            ({displayFieldValue(field)}):{' '}
                            {field.calculated &&
                            (field.readOnlyReason ?? 'locked') === 'locked'
                              ? 'calculated by the form, and not recalculated here'
                              : READ_ONLY_REASONS[
                                  field.readOnlyReason ?? 'locked'
                                ]}
                            .
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {hiddenCount > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {hiddenCount === 1
                        ? '1 hidden field is'
                        : `${hiddenCount} hidden fields are`}{' '}
                      left as they are and not printed when the document is made
                      final.
                    </p>
                  ) : null}

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
                          onChange={(e) =>
                            handleTypedNameChange(e.target.value)
                          }
                          placeholder="e.g. Jane Doe"
                          className="focus-ring mt-1 h-11 w-full rounded-xl border bg-background px-3 text-sm"
                        />
                      </div>
                    ) : null}

                    {/*
                      A bare <canvas> has no implicit role, so a label on it
                      alone is not reliably announced. The group carries the
                      name and the instructions; the canvas keeps its label as
                      well so it can be addressed directly. Strokes use the
                      theme foreground on screen and are exported in dark ink.
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
                        className={`aspect-[16/5] w-full rounded-xl border border-dashed bg-background text-foreground ${
                          mode === 'draw' && !busy && !blocked
                            ? 'touch-none'
                            : 'pointer-events-none'
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
                        disabled={busy || blocked}
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
                          <label
                            htmlFor="signature-page"
                            className="block text-sm"
                          >
                            <span className="font-medium">Page</span>
                            <NumberField
                              id="signature-page"
                              label="Signature page"
                              min={1}
                              max={source.pages}
                              value={signaturePage}
                              onCommit={(value) => {
                                const next = Math.min(
                                  source.pages,
                                  Math.max(1, Math.round(value) || 1),
                                );
                                setSignaturePage(next);
                                updatePlacement(placement, next);
                              }}
                            />
                          </label>
                          <label
                            htmlFor="signature-width"
                            className="block text-sm"
                          >
                            <span className="font-medium">Width (pt)</span>
                            <NumberField
                              id="signature-width"
                              label="Signature width"
                              min={MIN_SIGNATURE_WIDTH}
                              max={Math.floor(page.width)}
                              value={placement.width}
                              onCommit={(width) =>
                                updatePlacement({ ...placement, width })
                              }
                            />
                          </label>
                          <label
                            htmlFor="signature-left"
                            className="block text-sm"
                          >
                            <span className="font-medium">From left (pt)</span>
                            <NumberField
                              id="signature-left"
                              label="Signature from left"
                              min={0}
                              max={Math.max(
                                0,
                                Math.floor(page.width - placement.width),
                              )}
                              value={placement.x}
                              onCommit={(x) =>
                                updatePlacement({ ...placement, x })
                              }
                            />
                          </label>
                          <label
                            htmlFor="signature-top"
                            className="block text-sm"
                          >
                            <span className="font-medium">From top (pt)</span>
                            <NumberField
                              id="signature-top"
                              label="Signature from top"
                              min={0}
                              max={Math.max(
                                0,
                                Math.floor(
                                  page.height -
                                    placement.width * SIGNATURE_ASPECT,
                                ),
                              )}
                              value={placement.y}
                              onCommit={(y) =>
                                updatePlacement({ ...placement, y })
                              }
                            />
                          </label>
                        </div>
                        <div>
                          <p
                            id="signature-outline-help"
                            className="text-xs text-muted-foreground"
                          >
                            Page {signaturePage} is {Math.round(page.width)} ×{' '}
                            {Math.round(page.height)} pt as displayed. Click the
                            outline to centre the signature there; pressing
                            Enter centres it on the page. It always stays inside
                            the page.
                          </p>
                          <button
                            type="button"
                            aria-label="Place the signature on the page outline"
                            aria-describedby="signature-outline-help"
                            onClick={(event) => {
                              // A keyboard activation has no pointer position
                              // (detail 0), so it centres the signature rather
                              // than reading a meaningless 0,0.
                              const box =
                                event.currentTarget.getBoundingClientRect();
                              const point =
                                event.detail === 0 ||
                                box.width === 0 ||
                                box.height === 0
                                  ? null
                                  : {
                                      x: (event.clientX - box.left) / box.width,
                                      y: (event.clientY - box.top) / box.height,
                                    };
                              setPlacement(
                                placeSignatureAt(
                                  page,
                                  placement,
                                  point,
                                  SIGNATURE_ASPECT,
                                ),
                              );
                              clearResult();
                            }}
                            style={{
                              aspectRatio: `${page.width} / ${page.height}`,
                            }}
                            className="focus-ring relative mt-2 w-full overflow-hidden rounded-lg border bg-background"
                          >
                            <span
                              aria-hidden="true"
                              className="absolute rounded-sm border border-foreground bg-foreground/15"
                              style={{
                                left: `${(placement.x / page.width) * 100}%`,
                                top: `${(placement.y / page.height) * 100}%`,
                                width: `${(placement.width / page.width) * 100}%`,
                                height: `${((placement.width * SIGNATURE_ASPECT) / page.height) * 100}%`,
                              }}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex items-start gap-3 text-sm">
                    <input
                      id="make-final"
                      type="checkbox"
                      aria-labelledby="make-final-label"
                      aria-describedby={
                        flatten && missingRequired.length > 0
                          ? 'make-final-help make-final-required'
                          : 'make-final-help'
                      }
                      checked={flatten}
                      onChange={(event) => {
                        setFlatten(event.target.checked);
                        clearResult();
                      }}
                      className="mt-0.5 accent-foreground"
                    />
                    <span>
                      <label
                        id="make-final-label"
                        htmlFor="make-final"
                        className="font-semibold"
                      >
                        Make it final
                      </label>
                      <span
                        id="make-final-help"
                        className="mt-1 block text-muted-foreground"
                      >
                        Bakes the values into the page and removes the form, so
                        the next person cannot edit what you entered. Leave this
                        off while the document is still going round.
                      </span>
                      {flatten && missingRequired.length > 0 ? (
                        <span
                          id="make-final-required"
                          className="mt-1 block font-medium"
                        >
                          Still required before it can be made final:{' '}
                          {missingRequired
                            .map((field) => `“${field.name}”`)
                            .join(', ')}
                          . Turn this off to save without making it final.
                        </span>
                      ) : null}
                      {flatten && hasChanges && calculatedFields.length > 0 ? (
                        <span className="mt-1 block font-medium">
                          Check{' '}
                          {calculatedFields
                            .map((field) => `“${field.name}”`)
                            .join(', ')}{' '}
                          before making it final: the form’s own calculation
                          does not run here, so it may not match what you
                          changed.
                        </span>
                      ) : null}
                    </span>
                  </div>
                </fieldset>

                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button
                    variant="ghost"
                    className="h-11"
                    disabled={busy}
                    onClick={clear}
                  >
                    <Trash2 aria-hidden="true" /> Clear
                  </Button>
                  <Button
                    className="h-11 min-w-44"
                    disabled={busy || blocked}
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
                    <h2
                      ref={receiptRef}
                      tabIndex={-1}
                      className="focus-ring text-lg font-semibold"
                    >
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
                    {receipt.flattened
                      ? `${receipt.fieldsChanged} changed, now final`
                      : receipt.hadForm
                        ? `${receipt.fieldsChanged} changed, still editable`
                        : 'No form in this PDF'}
                  </p>
                </div>
                <div className="border-b p-4 sm:border-b-0 sm:border-r">
                  <p className="text-xs text-muted-foreground">Signature</p>
                  <p className="mt-1 text-sm font-semibold">
                    {receipt.signaturePlaced
                      ? receipt.signatureMode === 'type'
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
