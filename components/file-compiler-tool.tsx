'use client';

/**
 * `/do` — say what the finished file must satisfy, and the browser does it.
 *
 * The screen is one column of stages that only ever move forward: the file, what
 * it must satisfy, any decision that cannot be made without asking, the plan,
 * and the verified result. There are no modals. A decision appears in place,
 * where the thing it is about is, because a dialog over a plan hides the plan
 * you are being asked about.
 *
 * WHAT KEEPS THE TWO INPUTS IN STEP. The typed command and the controls are not
 * two sources of truth. The command is parsed into a requirement; the controls
 * write into a small set of overrides; the requirement the compiler acts on is
 * the parse merged under those overrides. So typing updates the controls, a
 * control updates the summary, and — this is the part that is easy to get wrong —
 * **the text the visitor typed is never rewritten.** Rewriting someone's own
 * words while they are still typing them is how an input starts fighting back.
 *
 * WHAT IS NOT CLAIMED. Progress is the step being worked on and the number of
 * attempts made, never a percentage: the number of encodes a size search needs
 * is not known before it runs, and inventing a bar would be inventing a fact.
 * Nothing on this page implies a model, reasoning, or intelligence, because none
 * is involved — it is a parser, an encoder and a byte check.
 */

import {
  ArrowRight,
  Check,
  Download,
  ImageIcon,
  Link2,
  RotateCcw,
  Share2,
  ShieldCheck,
  TriangleAlert,
  X,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { announceCompletion } from '@/lib/completion';
import { planDraw, QUALITY_CEILING } from '@/lib/tools/exact-size';
import {
  describeBytes,
  formatLabel,
  type DecodedSize,
  type VerifiableFormat,
} from '@/lib/tools/image-verify';
import {
  MAX_COMMAND_LENGTH,
  parseCommand,
  type ParseResult,
} from '@/lib/tools/file-compiler/parse';
import {
  findClarifications,
  planCompile,
  type Clarification,
  type CompilePlan,
  type InspectedImage,
} from '@/lib/tools/file-compiler/plan';
import {
  filePromptPath,
  readFragment,
} from '@/lib/tools/file-compiler/prompt-link';
import {
  applyResolution,
  describeRequirement,
  FIT_BEHAVIOURS,
  MAX_INPUT_BYTES,
  OUTPUT_FORMATS,
  type ConflictResolution,
  type ImageRequirement,
} from '@/lib/tools/file-compiler/requirement';
import {
  runPlan,
  ShowableError,
  unsatisfiedChoices,
  type CompileResult,
} from '@/lib/tools/file-compiler/solve';
import { detectImageFormat, readMetadata } from '@/lib/tools/metadata';
import { readAlphaChannel } from '@/lib/tools/image-verify';
import { getImageDimensions } from '@/lib/tools/html/image-dimensions';

const ACCEPT = 'image/jpeg,image/png,image/webp';

/** Subscribe to the address bar's fragment. */
function subscribeToHash(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

function readHash(): string {
  return window.location.hash;
}

/** Prerendering has no address bar, and a fragment never reaches a server. */
function readHashOnServer(): string {
  return '';
}

type Phase = 'empty' | 'inspecting' | 'inspected' | 'processing' | 'done';

interface LoadedFile {
  name: string;
  input: InspectedImage;
  bytes: Uint8Array;
}

/** Decode bytes in an `<img>`, which is the widest-supported decoder there is. */
function decodeSize(
  bytes: Uint8Array,
  type: string,
): Promise<DecodedSize | null> {
  return new Promise((resolve) => {
    const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type });
    const url = URL.createObjectURL(blob);
    const image = new Image();
    const finish = (size: DecodedSize | null) => {
      URL.revokeObjectURL(url);
      resolve(size);
    };
    image.onload = () =>
      finish({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => finish(null);
    image.src = url;
  });
}

function loadBitmap(bytes: Uint8Array, type: string) {
  return new Promise<{ image: HTMLImageElement; release: () => void }>(
    (resolve, reject) => {
      const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type });
      const url = URL.createObjectURL(blob);
      const image = new Image();
      image.onload = () =>
        resolve({ image, release: () => URL.revokeObjectURL(url) });
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new ShowableError('The browser could not decode this image.'));
      };
      image.src = url;
    },
  );
}

/**
 * Whether any pixel is actually see-through, as opposed to whether the file has
 * somewhere to put transparency.
 *
 * These are different questions and conflating them produces a bad interview.
 * `readAlphaChannel` reads the container, which is all bytes can tell you, and
 * that is the right check for *verifying* an output. But every PNG a canvas
 * writes is RGBA, so an ordinary opaque photograph exported from any web tool
 * has an alpha channel and nothing transparent in it. Asking such a visitor to
 * choose a background colour is asking them about a problem they do not have.
 *
 * So when the channel exists, the pixels are scanned. The scan is bounded: the
 * image is drawn into at most `SCAN_PIXEL_BUDGET` pixels first, and it stops at
 * the first transparent pixel it finds. Downscaling cannot hide transparency
 * that is there — averaging a transparent pixel with opaque neighbours still
 * lands below 255 — so the bound costs recall only in the extreme, and the
 * alternative is reading 12 million pixels of every holiday photo.
 */
const SCAN_PIXEL_BUDGET = 1_000_000;

/**
 * Decode once, and answer both questions the decode was needed for: the real
 * pixel size, and whether any pixel is actually see-through.
 *
 * WHY TRANSPARENCY IS A PIXEL QUESTION AND NOT A BYTE QUESTION.
 * `readAlphaChannel` reads the container, which is all bytes can tell you, and
 * that is the right check for *verifying* an output. But every PNG a canvas
 * writes is RGBA, so an ordinary opaque photograph exported by any web tool has
 * an alpha channel and nothing transparent in it. Asking that visitor to choose
 * a background colour is asking them about a problem they do not have.
 *
 * The scan is bounded: the image is drawn into at most `SCAN_PIXEL_BUDGET`
 * pixels and it stops at the first transparent pixel. Downscaling cannot hide
 * transparency that is there — averaging a transparent pixel with opaque
 * neighbours still lands below 255 — so the bound costs recall only in the
 * extreme, and the alternative is reading twelve million pixels of every photo.
 */
async function inspectDecoded(
  bytes: Uint8Array,
  type: string,
): Promise<{ size: DecodedSize; transparency: boolean | null } | null> {
  let release: (() => void) | null = null;
  try {
    const source = await loadBitmap(bytes, type);
    release = source.release;
    const width = source.image.naturalWidth;
    const height = source.image.naturalHeight;
    if (width <= 0 || height <= 0) return null;
    const size = { width, height };

    // No alpha channel at all, or a container we cannot read: nothing to scan.
    const channel = readAlphaChannel(bytes);
    if (channel !== true) return { size, transparency: channel };

    const scale = Math.min(1, Math.sqrt(SCAN_PIXEL_BUDGET / (width * height)));
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return { size, transparency: null };
    context.clearRect(0, 0, w, h);
    context.drawImage(source.image, 0, 0, w, h);
    const { data } = context.getImageData(0, 0, w, h);
    for (let index = 3; index < data.length; index += 4) {
      if (data[index]! < 255) return { size, transparency: true };
    }
    return { size, transparency: false };
  } catch {
    return null;
  } finally {
    release?.();
  }
}

function outputName(name: string, format: VerifiableFormat) {
  const dot = name.lastIndexOf('.');
  const stem = (dot > 0 ? name.slice(0, dot) : name)
    .replace(/[^\w.-]+/gu, '-')
    .slice(0, 60);
  const extension =
    format === 'image/jpeg' ? 'jpg' : format === 'image/png' ? 'png' : 'webp';
  return `${stem || 'image'}.${extension}`;
}

export function FileCompilerTool() {
  const [phase, setPhase] = useState<Phase>('empty');
  const [loaded, setLoaded] = useState<LoadedFile | null>(null);
  const [command, setCommand] = useState('');
  const [overrides, setOverrides] = useState<ImageRequirement>({});
  const [result, setResult] = useState<CompileResult | null>(null);
  const [status, setStatus] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState<string | null>(null);

  const fileInput = useRef<HTMLInputElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const abort = useRef<AbortController | null>(null);
  const objectUrl = useRef<string | null>(null);

  // ---- the requirement: a link, then the text, then the controls ----------
  // Read through `useSyncExternalStore` rather than in an effect. The address
  // bar is an external source, a hash fragment is never sent to the server so
  // the prerendered markup cannot contain it, and this hook is the one API that
  // handles that difference without a render-then-correct. It also means a
  // File Prompt opened by changing the hash is picked up straight away.
  const hash = useSyncExternalStore(
    subscribeToHash,
    readHash,
    readHashOnServer,
  );
  const arrival = useMemo(() => readFragment(hash), [hash]);

  const parsed: ParseResult = useMemo(() => parseCommand(command), [command]);
  // Precedence, weakest first: what a shared link asked for, then what the
  // visitor typed, then a control they moved by hand. Each one is a more
  // deliberate statement of intent than the last.
  const requirement: ImageRequirement = useMemo(
    () => ({ ...arrival.requirement, ...parsed.requirement, ...overrides }),
    [arrival.requirement, parsed.requirement, overrides],
  );

  const linkProblem = arrival.wrongVersion
    ? 'That link was made by a newer version of this page, so its requirement could not be read. Set what you need below.'
    : arrival.dropped.length > 0
      ? `Part of that link could not be used: ${arrival.dropped.join(' ')}`
      : null;

  const clarifications: Clarification[] = useMemo(
    () => (loaded ? findClarifications(requirement, loaded.input) : []),
    [loaded, requirement],
  );
  const decisions: Decision[] = useMemo(
    () => [
      // A contradiction in what was asked comes first: it is wrong on its own
      // terms, so answering a file-specific question before it would be asking
      // about a plan that cannot exist yet.
      ...parsed.conflicts.map(
        (conflict): Decision => ({
          id: conflict.id,
          question: conflict.message,
          choices: conflict.resolutions,
        }),
      ),
      ...clarifications.map(
        (clarification): Decision => ({
          id: clarification.id,
          question: clarification.question,
          choices: clarification.choices,
        }),
      ),
    ],
    [parsed.conflicts, clarifications],
  );

  const plan: CompilePlan | null = useMemo(() => {
    if (!loaded || decisions.length > 0) return null;
    const outcome = planCompile(requirement, loaded.input);
    return outcome.status === 'ready' ? outcome.plan : null;
  }, [loaded, requirement, decisions.length]);

  const unsupportedReasons = useMemo(() => {
    if (!loaded || decisions.length > 0) return [];
    const outcome = planCompile(requirement, loaded.input);
    return outcome.status === 'unsupported' ? outcome.reasons : [];
  }, [loaded, requirement, decisions.length]);

  useEffect(
    () => () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      abort.current?.abort();
    },
    [],
  );

  // ---- taking a file -----------------------------------------------------
  const take = useCallback(async (file: File) => {
    setProblem(null);
    setResult(null);
    setShared(null);
    if (file.size > MAX_INPUT_BYTES) {
      setProblem(
        `That file is ${describeBytes(file.size)}. This page works with images up to ${describeBytes(MAX_INPUT_BYTES)}.`,
      );
      return;
    }
    setPhase('inspecting');
    setStatus('Looking at your file…');
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const detected = detectImageFormat(bytes);
      if (detected === 'unsupported') {
        setPhase('empty');
        setProblem(
          'That file is not a JPEG, PNG or WebP image. Those are the three this page can work with.',
        );
        return;
      }
      const header = getImageDimensions(bytes);
      // One decode, not two. The pixel size and the transparency scan both need
      // the image decoded, and decoding a twelve-megapixel photograph twice to
      // answer two questions about it is work nobody asked for.
      const inspected = await inspectDecoded(bytes, `image/${detected}`);
      const size =
        inspected?.size ??
        (header ? { width: header.width, height: header.height } : null);
      if (!size) {
        setPhase('empty');
        setProblem('That image could not be opened in this browser.');
        return;
      }
      const metadata = readMetadata(bytes);
      const transparency = inspected?.transparency ?? readAlphaChannel(bytes);
      setLoaded({
        name: file.name,
        bytes,
        input: {
          format: `image/${detected}` as VerifiableFormat,
          width: size.width,
          height: size.height,
          byteLength: bytes.length,
          hasAlpha: transparency,
          hasMetadata:
            metadata.format === 'unsupported' ? null : metadata.hasMetadata,
        },
      });
      setPhase('inspected');
      setStatus(
        `${formatLabel(`image/${detected}` as VerifiableFormat)}, ${size.width} by ${size.height} pixels, ${describeBytes(bytes.length)}.`,
      );
    } catch {
      setPhase('empty');
      setProblem('That file could not be read in this browser.');
    }
  }, []);

  // Drag and drop on the surface.
  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) void take(file);
  };

  // Paste, but only the images this page is for. Attached in the capture phase
  // so the site-wide paste helper never also reacts to the same image and puts a
  // second suggestion on screen; anything that is not an image falls through to
  // it untouched, and a paste inside the command box stays the box's own.
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA')
      ) {
        return;
      }
      const file = Array.from(event.clipboardData?.files ?? []).find((item) =>
        item.type.startsWith('image/'),
      );
      if (!file) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      void take(file);
    };
    document.addEventListener('paste', onPaste, { capture: true });
    return () =>
      document.removeEventListener('paste', onPaste, { capture: true });
  }, [take]);

  // ---- running -----------------------------------------------------------
  const run = useCallback(async () => {
    if (!loaded || !plan) return;
    const controller = new AbortController();
    abort.current = controller;
    setPhase('processing');
    setResult(null);
    setStatus('Preparing your file locally…');

    let release: (() => void) | null = null;
    try {
      const source = await loadBitmap(
        loaded.bytes,
        loaded.input.format ?? 'image/png',
      );
      release = source.release;
      const canvas = document.createElement('canvas');

      const encode = async (width: number, height: number, quality: number) => {
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        if (!context)
          throw new ShowableError('The browser could not encode this image.');
        context.clearRect(0, 0, width, height);
        if (plan.background) {
          context.fillStyle = plan.background;
          context.fillRect(0, 0, width, height);
        }
        const draw = planDraw(
          source.image.naturalWidth,
          source.image.naturalHeight,
          width,
          height,
          plan.geometry.fit ?? 'stretch',
        );
        context.drawImage(
          source.image,
          draw.sx,
          draw.sy,
          draw.sw,
          draw.sh,
          draw.dx,
          draw.dy,
          draw.dw,
          draw.dh,
        );
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, plan.outputFormat, quality / 100),
        );
        if (!blob)
          throw new ShowableError('The browser could not encode this image.');
        // WebKit's canvas answers a WebP request with a PNG rather than
        // refusing, so without this check the visitor would be handed a PNG
        // named `.webp` and told it was verified. `toBlob`'s own reported type
        // is the only thing that catches it before any bytes are trusted.
        if (blob.type !== plan.outputFormat) {
          throw new ShowableError(
            `This browser cannot save ${formatLabel(plan.outputFormat)}.`,
          );
        }
        return new Uint8Array(await blob.arrayBuffer());
      };

      setStatus('Checking the finished file…');
      const outcome = await runPlan(
        plan,
        loaded.input,
        {
          encode,
          measure: (bytes) => decodeSize(bytes, plan.outputFormat),
        },
        { signal: controller.signal },
      );

      setResult(outcome);
      setPhase('done');

      if (outcome.status === 'verified') {
        setStatus('Verified result.');
        announceCompletion({
          operation: 'File Compiler',
          durationMs: 0,
          summary: `${formatLabel(plan.outputFormat)}, ${describeBytes(outcome.bytes.length)}`,
          metrics: [
            { label: 'Before', value: describeBytes(loaded.input.byteLength) },
            { label: 'After', value: describeBytes(outcome.bytes.length) },
          ],
        });
      } else if (outcome.status === 'unsatisfied') {
        setStatus('This result does not satisfy every requirement.');
      } else if (outcome.status === 'cancelled') {
        setStatus('Cancelled. Nothing was changed.');
      } else {
        setStatus('That did not work.');
      }
    } catch {
      setResult({
        status: 'failed',
        error: { message: 'This image could not be prepared in this browser.' },
      });
      setPhase('done');
    } finally {
      release?.();
      abort.current = null;
    }
  }, [loaded, plan]);

  const verifiedBytes =
    result?.status === 'verified'
      ? result.bytes
      : result?.status === 'unsatisfied'
        ? result.bytes
        : undefined;

  const download = () => {
    if (!verifiedBytes || !loaded || !plan) return;
    const blob = new Blob([verifiedBytes as Uint8Array<ArrayBuffer>], {
      type: plan.outputFormat,
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = outputName(loaded.name, plan.outputFormat);
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const share = async () => {
    if (!verifiedBytes || !loaded || !plan) return;
    const file = new File(
      [verifiedBytes as Uint8Array<ArrayBuffer>],
      outputName(loaded.name, plan.outputFormat),
      { type: plan.outputFormat },
    );
    // Ask first. A browser that cannot share a file must fall back to the
    // download that always works, not to a button that does nothing.
    if (!navigator.canShare?.({ files: [file] })) {
      setShared('This browser cannot share a file, so downloading is the way.');
      return;
    }
    try {
      await navigator.share({ files: [file] });
      // Resolving means the browser completed a share. Nothing here claims
      // *where* it went, because the browser does not say.
      setShared('Handed to your browser to share.');
    } catch {
      // A cancelled share is ordinary behaviour, not an error.
      setShared(null);
    }
  };

  const copyPrompt = async () => {
    const path = filePromptPath(requirement);
    const absolute =
      typeof window === 'undefined'
        ? path
        : new URL(path, window.location.href).href;
    try {
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setShared(
        'Copying is blocked in this browser. The link is in the box below.',
      );
    }
  };

  const reset = () => {
    abort.current?.abort();
    setPhase('empty');
    setLoaded(null);
    setResult(null);
    setOverrides({});
    setCommand('');
    setProblem(null);
    setShared(null);
    setStatus('');
  };

  // Read back the same way wherever it is shown. Before a file exists this can
  // only describe what a shared link asked for, because the command box and the
  // controls do not appear until there is a file to apply them to.
  const summary = describeRequirement(requirement);

  return (
    <AppShell currentToolId="file-compiler">
      {/*
        `id="tool"` with `tabIndex={-1}` is the shell's skip-link target, and
        `scripts/design-system-qc.mjs` blocks the build without it: a skip link
        that focuses nothing leaves a keyboard visitor stranded in the nav.
      */}
      <div
        id="tool"
        tabIndex={-1}
        className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12"
      >
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            What must the final file satisfy?
          </h1>
          <p className="mt-2 max-w-prose text-sm text-muted-foreground">
            Drop an image and say what the finished file has to be. Your browser
            does the work and then checks the result against what you asked for.
            The file never leaves this device.
          </p>
        </header>

        {/* Announcements for screen readers: one region, polite, always present. */}
        <p aria-live="polite" className="sr-only">
          {status}
        </p>

        {(problem ?? linkProblem) && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-foreground"
          >
            <TriangleAlert className="mt-0.5 h-4 w-4 flex-none" aria-hidden />
            <span className="min-w-0 break-words">
              {problem ?? linkProblem}
            </span>
          </div>
        )}

        {/*
          ---- 0. what a shared link is asking for -------------------------
          Shown before the picker, not after it. Somebody arriving on a File
          Prompt is answering a request they did not write: telling them what is
          wanted only after they have handed over a file is the wrong order, and
          the brief sets this sequence explicitly — load, sanitise, summarise,
          then ask for the file.
        */}
        {!loaded && summary.length > 0 && (
          <section
            className="mb-6 rounded-xl border border-border p-4"
            aria-labelledby="asked-for"
          >
            <h2 id="asked-for" className="text-sm font-semibold">
              You have been asked for a file that satisfies:
            </h2>
            <ul
              className="mt-2 flex flex-wrap gap-2"
              aria-label="Requirement summary"
            >
              {summary.map((line) => (
                <li
                  key={line}
                  className="rounded-full bg-muted px-3 py-1 text-xs font-medium"
                >
                  {line}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              Choose your own image below. It stays on this device, and nothing
              about it is sent back to whoever shared this link.
            </p>
          </section>
        )}

        {/* ---- 1. the file ------------------------------------------------ */}
        {!loaded ? (
          <div
            ref={surface}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
              dragging ? 'border-foreground bg-muted' : 'border-border'
            }`}
          >
            <ImageIcon
              className="mx-auto h-8 w-8 text-muted-foreground"
              aria-hidden
            />
            <p className="mt-4 text-sm font-medium">
              Drop an image here, paste one, or
            </p>
            <div className="mt-3">
              <Button onClick={() => fileInput.current?.click()}>
                Choose an image
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              JPEG, PNG or WebP, up to {describeBytes(MAX_INPUT_BYTES)}.
            </p>
            <label className="sr-only" htmlFor="file-compiler-input">
              Choose an image
            </label>
            <input
              ref={fileInput}
              id="file-compiler-input"
              type="file"
              accept={ACCEPT}
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void take(file);
                event.target.value = '';
              }}
            />
          </div>
        ) : (
          <section
            aria-labelledby="your-file"
            className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2
                  id="your-file"
                  className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Your file
                </h2>
                <p className="mt-1 truncate text-sm font-medium">
                  {loaded.name}
                </p>
              </div>
              <Button variant="ghost" onClick={reset}>
                <X className="mr-1.5 h-4 w-4" aria-hidden />
                Start again
              </Button>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
              <Fact label="Type" value={formatLabel(loaded.input.format!)} />
              <Fact
                label="Size on screen"
                value={`${loaded.input.width} × ${loaded.input.height} px`}
              />
              <Fact
                label="On disk"
                value={describeBytes(loaded.input.byteLength)}
              />
              <Fact
                label="Transparency"
                value={
                  loaded.input.hasAlpha === null
                    ? 'could not tell'
                    : loaded.input.hasAlpha
                      ? 'present'
                      : 'none'
                }
              />
              {loaded.input.hasMetadata !== null && (
                <Fact
                  label="Camera & location info"
                  value={loaded.input.hasMetadata ? 'present' : 'none found'}
                />
              )}
            </dl>
          </section>
        )}

        {/* ---- 2. the requirement ---------------------------------------- */}
        {loaded && (
          <section className="mt-6" aria-labelledby="requirement-heading">
            <h2
              id="requirement-heading"
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              What the finished file must satisfy
            </h2>

            <label className="sr-only" htmlFor="command">
              Describe what the finished file must satisfy
            </label>
            <textarea
              id="command"
              value={command}
              maxLength={MAX_COMMAND_LENGTH}
              rows={2}
              spellCheck={false}
              onChange={(event) => setCommand(event.target.value)}
              placeholder="JPEG, under 2 MB, maximum 1200 px"
              className="mt-2 w-full resize-none rounded-lg border border-border bg-background p-3 text-sm focus:border-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {command.length}/{MAX_COMMAND_LENGTH} characters. Or use the
              controls below — they stay in step with what you type.
            </p>

            {parsed.tooLong && (
              <p role="alert" className="mt-2 text-sm text-destructive">
                That is longer than {MAX_COMMAND_LENGTH} characters, so none of
                it was read. Shorten it and nothing will be guessed at.
              </p>
            )}

            {parsed.recognised.length > 0 && (
              <p className="mt-3 text-sm">
                <span className="font-medium">OpenTools understood: </span>
                <span className="text-foreground">
                  {parsed.recognised.map((item) => item.summary).join(' · ')}
                </span>
              </p>
            )}

            {parsed.unresolvedText.length > 0 && (
              <p className="mt-2 text-sm text-destructive">
                <span className="font-medium">
                  Not understood, and not acted on:{' '}
                </span>
                {parsed.unresolvedText.map((text) => `“${text}”`).join(', ')}
              </p>
            )}

            <Controls
              requirement={requirement}
              onChange={(patch, clear) =>
                setOverrides((current) => {
                  const next = { ...current, ...patch };
                  for (const key of clear ?? []) delete next[key];
                  return next;
                })
              }
            />

            {summary.length > 0 && (
              <ul
                className="mt-4 flex flex-wrap gap-2"
                aria-label="Requirement summary"
              >
                {summary.map((line) => (
                  <li
                    key={line}
                    className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium dark:bg-neutral-800"
                  >
                    {line}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* ---- 3. decisions ---------------------------------------------- */}
        {loaded && decisions.length > 0 && phase !== 'processing' && (
          <section
            className="mt-6 rounded-xl border border-foreground p-4"
            aria-labelledby="decision-heading"
          >
            <h2 id="decision-heading" className="text-sm font-semibold">
              OpenTools needs one decision:
            </h2>
            <p className="mt-2 text-sm text-foreground">
              {decisions[0]!.question}
            </p>
            <fieldset className="mt-3 flex flex-wrap gap-2">
              <legend className="sr-only">
                Choose how to resolve: {decisions[0]!.question}
              </legend>
              {decisions[0]!.choices.map((choice) => (
                <Button
                  key={choice.id}
                  variant="outline"
                  onClick={() =>
                    setOverrides((current) =>
                      applyResolution({ ...requirement, ...current }, choice),
                    )
                  }
                >
                  {choice.label}
                </Button>
              ))}
            </fieldset>
            {decisions.length > 1 && (
              <p className="mt-3 text-xs text-muted-foreground">
                {decisions.length - 1} more after this one.
              </p>
            )}
          </section>
        )}

        {unsupportedReasons.length > 0 && (
          <section
            role="alert"
            className="mt-6 rounded-xl border border-destructive/40 p-4"
          >
            <h2 className="text-sm font-semibold">This cannot be done here</h2>
            <ul className="mt-2 space-y-1 text-sm">
              {unsupportedReasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </section>
        )}

        {/* ---- 4. the plan ----------------------------------------------- */}
        {plan && phase === 'inspected' && summary.length > 0 && (
          <section className="mt-6" aria-labelledby="plan-heading">
            <h2 id="plan-heading" className="text-sm font-semibold">
              Here is the plan:
            </h2>
            <ol className="mt-2 space-y-1.5 text-sm text-foreground">
              {plan.steps.map((step, index) => (
                <li key={step.id} className="flex gap-2">
                  <span className="flex-none text-muted-foreground">
                    {index + 1}.
                  </span>
                  <span className="min-w-0">{step.text}</span>
                </li>
              ))}
            </ol>
            <div className="mt-4">
              <Button onClick={() => void run()}>
                Prepare my file
                <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
              </Button>
            </div>
          </section>
        )}

        {plan && phase === 'inspected' && summary.length === 0 && (
          <p className="mt-6 text-sm text-muted-foreground">
            Say what the finished file must satisfy, and the plan will appear
            here before anything runs.
          </p>
        )}

        {/* ---- 5. working ------------------------------------------------ */}
        {phase === 'processing' && (
          <section className="mt-6 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
            <p className="text-sm font-medium">{status}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Everything is happening in this browser.
            </p>
            <div className="mt-3">
              <Button variant="ghost" onClick={() => abort.current?.abort()}>
                Cancel
              </Button>
            </div>
          </section>
        )}

        {/* ---- 6. the result -------------------------------------------- */}
        {phase === 'done' && result && (
          <Result
            result={result}
            plan={plan}
            onDownload={download}
            onShare={() => void share()}
            onCopyPrompt={() => void copyPrompt()}
            onAgain={() => setPhase('inspected')}
            copied={copied}
            shared={shared}
            promptPath={filePromptPath(requirement)}
          />
        )}
      </div>
    </AppShell>
  );
}

/**
 * One thing to ask, whatever produced it.
 *
 * A contradiction inside the requirement and a decision this file forces are
 * different problems, but they are the same interaction: a sentence and a closed
 * set of buttons. Rendering them through one shape is what keeps the screen from
 * growing two competing question surfaces.
 */
interface Decision {
  id: string;
  question: string;
  choices: readonly ConflictResolution[];
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium">{value}</dd>
    </div>
  );
}

function Controls({
  requirement,
  onChange,
}: {
  requirement: ImageRequirement;
  onChange: (
    patch: Partial<ImageRequirement>,
    clear?: readonly (keyof ImageRequirement)[],
  ) => void;
}) {
  const exact =
    requirement.exactWidth !== undefined ||
    requirement.exactHeight !== undefined;
  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <fieldset>
        <legend className="text-xs font-medium text-muted-foreground">
          File type
        </legend>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {OUTPUT_FORMATS.map((format) => (
            <button
              key={format}
              type="button"
              aria-pressed={requirement.format === format}
              onClick={() =>
                requirement.format === format
                  ? onChange({}, ['format'])
                  : onChange({ format })
              }
              className={`rounded-md border px-2.5 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring ${
                requirement.format === format
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border'
              }`}
            >
              {formatLabel(format)}
            </button>
          ))}
        </div>
      </fieldset>

      <NumberField
        label="Maximum file size (KB)"
        value={
          requirement.maxBytes === undefined
            ? ''
            : String(Math.round(requirement.maxBytes / 1024))
        }
        onChange={(raw) =>
          raw === ''
            ? onChange({}, ['maxBytes'])
            : onChange({ maxBytes: Math.round(Number(raw) * 1024) })
        }
      />

      <NumberField
        label={exact ? 'Exact width (px)' : 'Maximum width (px)'}
        value={String(
          (exact ? requirement.exactWidth : requirement.maxWidth) ?? '',
        )}
        onChange={(raw) =>
          raw === ''
            ? onChange({}, [exact ? 'exactWidth' : 'maxWidth'])
            : onChange(
                exact ? { exactWidth: Number(raw) } : { maxWidth: Number(raw) },
              )
        }
      />
      <NumberField
        label={exact ? 'Exact height (px)' : 'Maximum height (px)'}
        value={String(
          (exact ? requirement.exactHeight : requirement.maxHeight) ?? '',
        )}
        onChange={(raw) =>
          raw === ''
            ? onChange({}, [exact ? 'exactHeight' : 'maxHeight'])
            : onChange(
                exact
                  ? { exactHeight: Number(raw) }
                  : { maxHeight: Number(raw) },
              )
        }
      />

      {exact && (
        <fieldset>
          <legend className="text-xs font-medium text-muted-foreground">
            When the shape does not match
          </legend>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {FIT_BEHAVIOURS.map((fit) => (
              <ToggleChip
                key={fit}
                pressed={requirement.fit === fit}
                onClick={() =>
                  requirement.fit === fit
                    ? onChange({}, ['fit'])
                    : onChange({ fit })
                }
              >
                {fit === 'crop' ? 'Crop' : fit === 'pad' ? 'Pad' : 'Stretch'}
              </ToggleChip>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset>
        <legend className="text-xs font-medium text-muted-foreground">
          Also
        </legend>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <ToggleChip
            pressed={requirement.removeMetadata === true}
            onClick={() =>
              requirement.removeMetadata === true
                ? onChange({}, ['removeMetadata'])
                : onChange({ removeMetadata: true })
            }
          >
            Remove camera & location info
          </ToggleChip>
          <ToggleChip
            pressed={requirement.keepTransparency === true}
            onClick={() =>
              requirement.keepTransparency === true
                ? onChange({}, ['keepTransparency'])
                : onChange({ keepTransparency: true }, ['background'])
            }
          >
            Keep transparency
          </ToggleChip>
        </div>
      </fieldset>
    </div>
  );
}

function ToggleChip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`rounded-md border px-2.5 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring ${
        pressed
          ? 'border-foreground bg-foreground text-background'
          : 'border-border'
      }`}
    >
      {children}
    </button>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (raw: string) => void;
}) {
  const id = `field-${label.replace(/[^a-z]+/giu, '-').toLowerCase()}`;
  return (
    <div>
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={1}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm focus:border-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}

function Result({
  result,
  plan,
  onDownload,
  onShare,
  onCopyPrompt,
  onAgain,
  copied,
  shared,
  promptPath,
}: {
  result: CompileResult;
  plan: CompilePlan | null;
  onDownload: () => void;
  onShare: () => void;
  onCopyPrompt: () => void;
  onAgain: () => void;
  copied: boolean;
  shared: string | null;
  promptPath: string;
}) {
  if (result.status === 'cancelled') {
    return (
      <section className="mt-6 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="text-sm font-semibold">Cancelled</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Nothing was changed and nothing was saved.
        </p>
        <div className="mt-3">
          <Button variant="outline" onClick={onAgain}>
            Back to the plan
          </Button>
        </div>
      </section>
    );
  }

  if (result.status === 'failed' || result.status === 'unsupported') {
    const reasons =
      result.status === 'failed'
        ? [result.error.message]
        : result.status === 'unsupported'
          ? result.reasons
          : [];
    return (
      <section
        role="alert"
        className="mt-6 rounded-xl border border-destructive/40 p-4"
      >
        <h2 className="text-sm font-semibold">
          {result.status === 'failed'
            ? 'That did not work'
            : 'This cannot be done here'}
        </h2>
        <ul className="mt-2 space-y-1 text-sm">
          {reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
        <div className="mt-3">
          <Button variant="outline" onClick={onAgain}>
            Back to the plan
          </Button>
        </div>
      </section>
    );
  }

  const verified = result.status === 'verified';
  const checks = result.verification.checks;

  return (
    <section
      className={`mt-6 rounded-xl border p-4 ${
        verified ? 'border-success/50' : 'border-destructive/40'
      }`}
      aria-labelledby="result-heading"
    >
      <div className="flex items-start gap-2">
        {verified ? (
          <ShieldCheck
            className="mt-0.5 h-5 w-5 flex-none text-success"
            aria-hidden
          />
        ) : (
          <TriangleAlert
            className="mt-0.5 h-5 w-5 flex-none text-destructive"
            aria-hidden
          />
        )}
        <div className="min-w-0">
          <h2 id="result-heading" className="text-sm font-semibold">
            {verified
              ? 'Verified result'
              : 'This result does not satisfy every requirement'}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {verified
              ? 'Every requirement below was checked against the finished file’s own bytes.'
              : 'The file below is real and was measured. These are the requirements it did not meet.'}
          </p>
        </div>
      </div>

      <ul className="mt-3 space-y-1.5 text-sm">
        {checks.map((check) => (
          <li key={check.id} className="flex items-start gap-2">
            {check.pass ? (
              <Check
                className="mt-0.5 h-4 w-4 flex-none text-success"
                aria-hidden
              />
            ) : (
              <X
                className="mt-0.5 h-4 w-4 flex-none text-destructive"
                aria-hidden
              />
            )}
            <span className="min-w-0">
              <span className="font-medium">{check.label}: </span>
              <span className="text-muted-foreground">
                needed {check.required}, got {check.actual}
              </span>
            </span>
          </li>
        ))}
        {result.verification.unprovable.map((item) => (
          <li key={item.id} className="flex items-start gap-2">
            <TriangleAlert
              className="mt-0.5 h-4 w-4 flex-none text-destructive"
              aria-hidden
            />
            <span className="min-w-0">
              <span className="font-medium">{item.label}: </span>
              <span className="text-muted-foreground">{item.why}</span>
            </span>
          </li>
        ))}
      </ul>

      {!verified && plan && (
        <div className="mt-4 rounded-lg bg-muted p-3">
          <p className="text-xs font-medium">What you can do instead</p>
          <ul className="mt-1.5 space-y-1 text-xs text-muted-foreground">
            {unsatisfiedChoices(plan).map((choice) => (
              <li key={choice.id}>{choice.label}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Download stays the primary action, verified or not. */}
      <div className="mt-4 flex flex-wrap gap-2">
        {/*
          `data-receipt-download` is what the completion dialog looks for when it
          offers to re-trigger the download. `lib/completion.test.ts` fails any
          component that announces a completion without it, because a receipt
          whose button does nothing is worse than no receipt.
        */}
        <Button data-receipt-download onClick={onDownload}>
          <Download className="mr-1.5 h-4 w-4" aria-hidden />
          Download
        </Button>
        <Button variant="outline" onClick={onShare}>
          <Share2 className="mr-1.5 h-4 w-4" aria-hidden />
          Share the file
        </Button>
        <Button variant="outline" onClick={onCopyPrompt}>
          <Link2 className="mr-1.5 h-4 w-4" aria-hidden />
          {copied ? 'Link copied' : 'Save as a reusable File Prompt'}
        </Button>
        <Button variant="ghost" onClick={onAgain}>
          <RotateCcw className="mr-1.5 h-4 w-4" aria-hidden />
          Change the requirement
        </Button>
      </div>

      {shared && <p className="mt-2 text-xs text-muted-foreground">{shared}</p>}

      <details className="mt-4">
        <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
          Ask someone for a file like this
        </summary>
        <p className="mt-2 text-xs text-muted-foreground">
          This link carries the requirement and nothing else — no file, no
          filename, nothing about you. Whoever opens it supplies their own
          image, and their browser does the work on their own machine.
        </p>
        <code className="mt-2 block overflow-x-auto rounded bg-muted p-2 text-xs">
          {promptPath}
        </code>
      </details>
    </section>
  );
}

export default FileCompilerTool;

/** Re-exported so the page can state the ceiling without importing the engine. */
export { QUALITY_CEILING };
