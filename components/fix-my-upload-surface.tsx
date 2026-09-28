'use client';

import {
  CheckCircle2,
  LockKeyhole,
  SendHorizontal,
  TriangleAlert,
  Upload,
} from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

import { Button, buttonVariants } from '@/components/ui/button';
import { useToolUi } from '@/components/locale-edition-provider';
import { loadImage, optimizeImage } from '@/lib/tools/image-optimize';
import { extensionForRasterType, type RasterFormat } from '@/lib/tools/image';
import {
  unmetReasons,
  verifyImageBytes,
  type VerifiableFormat,
  type Verification,
  type VerifyTargets,
} from '@/lib/tools/image-verify';
import { inputAccepts } from '@/lib/file-handoff';
import {
  askSettingLines,
  describeAskRequest,
  readAskLink,
  type AskRequest,
} from '@/lib/tools/ask-link';
import {
  cancelledMessage,
  describeReturnTarget,
  readIntegratorHello,
  readyMessage,
  resultMessage,
  type IntegratorHello,
} from '@/lib/tools/fix-my-upload';
import type { RecipeValues } from '@/lib/tools/recipe-link';

/**
 * The one surface all three Fix My Upload modes converge on.
 *
 * A site's upload rejected somebody's file. Instead of leaving them to search
 * and hand the document to an ad-funded converter, the site sends them here
 * with the requirement attached. They fix it on their own machine and either
 * take the file away themselves or send it straight back to the form that
 * asked for it.
 *
 * ── THE THREE MODES ARE ONE PAGE, DELIBERATELY ────────────────────────────
 *
 * **A — a plain link.** No integration, no JavaScript on the other site: they
 * link here with a requirement in the URL, exactly as an ask link does, and the
 * person downloads the corrected file. `readAskLink` reads it.
 *
 * **B — the return channel.** The site opens this page with `window.open` and
 * posts the requirement in. The corrected file goes back to it through browser
 * memory. This is the only genuinely new capability in the feature.
 *
 * **C — standalone.** Somebody opens the page directly. Same surface, no
 * opener, requirement chosen from the link.
 *
 * Building these as three pages would have produced three copies of the same
 * flow, which is the duplication both this brief and the File Compiler's
 * forbid. The only difference between them is where the requirement came from
 * and whether there is anywhere to send the result.
 *
 * ── WHY THE INTEGRATOR SPEAKS FIRST ───────────────────────────────────────
 *
 * This window cannot safely announce itself. `postMessage` needs a
 * `targetOrigin`, and until a message has arrived this page does not know who
 * opened it — the only way to "announce" would be `'*'`, which broadcasts to
 * whatever is listening. So the integrating page speaks first (it knows our
 * origin; we do not know theirs), and `ready` is a reply to the origin the
 * browser attached to that message. See `lib/tools/fix-my-upload.ts`.
 *
 * ── WHAT THIS PAGE DOES NOT CLAIM ─────────────────────────────────────────
 *
 * It does not say "verified". The optimiser re-decodes its own output and
 * checks the pixel size, which is a real check and is why the dimensions shown
 * are ones that were measured — but nothing here reads the finished bytes back
 * against every promise. `lib/tools/image-verify.ts` on the File Compiler lane
 * is that function and it is not on `main` yet; until it is, this page states
 * what it did and shows the numbers, and leaves the word alone.
 */

/** Only the image request runs in this page. See `runnableRequest`. */
const RUNNABLE = 'image';

type Result = {
  readonly file: File;
  readonly width: number;
  readonly height: number;
  readonly format: RasterFormat;
  readonly url: string;
  /**
   * What the finished bytes actually are, judged against what was promised.
   *
   * Read from the file after it was written, by `lib/tools/image-verify.ts` —
   * not restated from what the encoder was asked to do. A property it cannot
   * inspect lands in `unprovable` and makes `pass` false, so "verified" here
   * never means "we did not check".
   */
  readonly verification: Verification;
};

/**
 * The promises this request made, as the verifier's vocabulary.
 *
 * Only what was actually asked for. A requirement that never mentioned
 * metadata produces no metadata check rather than a vacuous pass — that is the
 * verifier's own rule and this must not undermine it by defaulting fields in.
 *
 * `format` is what was REQUESTED, deliberately, not what came out. WebKit
 * answers a WebP request with a PNG, and a target built from the actual output
 * would mark that a success. Built from the promise, it fails — which is the
 * truth, and the page says so.
 */
function targetsFor(values: RecipeValues): VerifyTargets {
  const targets: VerifyTargets = {};
  if (typeof values.format === 'string') {
    targets.format = `image/${values.format}` as VerifiableFormat;
  }
  if (typeof values.width === 'number') targets.maxWidth = values.width;
  if (typeof values.height === 'number') targets.maxHeight = values.height;
  return targets;
}

type Stage =
  | { kind: 'waiting' }
  | { kind: 'ready' }
  | { kind: 'working' }
  | { kind: 'done'; result: Result }
  | { kind: 'sent' }
  | { kind: 'failed'; message: string };

export function FixMyUploadSurface({ request }: { request: AskRequest }) {
  const t = useToolUi();
  const [values, setValues] = useState<RecipeValues>({});
  const [integrator, setIntegrator] = useState<IntegratorHello | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<Stage>({ kind: 'waiting' });
  const [problem, setProblem] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<Result | null>(null);
  const inputId = useId();

  /*
   * Read the requirement from the link, once, on mount. This is mode A and C,
   * and it is also the fallback for mode B: if the integrator's message never
   * arrives, whatever was in the URL still describes the job.
   */
  /* oxlint-disable react/react-compiler -- reads the address bar, an external
     system, once on mount. */
  useEffect(() => {
    const arrival = readAskLink(request.id, window.location.search);
    if (arrival) setValues(arrival.values);
    setStage({ kind: 'ready' });
  }, [request.id]);
  /* oxlint-enable react/react-compiler */

  /*
   * Listen for the integrating page. Every message is treated as hostile: it
   * arrives from a site we do not control, and `readIntegratorHello` takes the
   * origin from the event rather than the payload for that reason.
   *
   * The first valid hello wins and later ones are ignored, so a second page
   * cannot redirect a result that is already destined somewhere.
   */
  useEffect(() => {
    if (typeof window === 'undefined' || !window.opener) return;
    const onMessage = (event: MessageEvent) => {
      const hello = readIntegratorHello(event.data, event.origin);
      if (!hello) return;
      setIntegrator((current) => {
        if (current) return current;
        setValues(hello.values);
        try {
          (event.source as Window | null)?.postMessage(
            readyMessage(),
            hello.origin,
          );
        } catch {
          /* The opener went away. The page still works as a plain link. */
        }
        return hello;
      });
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  /* Tell the opener if the person leaves without sending anything. */
  useEffect(() => {
    if (!integrator) return;
    const onUnload = () => {
      if (resultRef.current === null || stage.kind !== 'sent') {
        try {
          window.opener?.postMessage(
            cancelledMessage('dismissed'),
            integrator.origin,
          );
        } catch {
          /* Nothing to tell. */
        }
      }
    };
    window.addEventListener('pagehide', onUnload);
    return () => window.removeEventListener('pagehide', onUnload);
  }, [integrator, stage.kind]);

  useEffect(
    () => () => {
      if (resultRef.current) URL.revokeObjectURL(resultRef.current.url);
    },
    [],
  );

  const requirement = describeAskRequest(request, values);
  const settingLines = askSettingLines(request, values);
  const runnable = request.id === RUNNABLE;

  const accept = (chosen: File | null | undefined) => {
    if (!chosen) return;
    if (!inputAccepts(request.accept, chosen)) {
      setProblem(`That is not an ${request.subjectNoun}. Choose another file.`);
      return;
    }
    setProblem('');
    setFile(chosen);
    setStage({ kind: 'ready' });
  };

  const run = async () => {
    if (!file || !runnable) return;
    setStage({ kind: 'working' });
    const sourceUrl = URL.createObjectURL(file);
    try {
      const format = `image/${values.format ?? 'jpeg'}` as RasterFormat;
      const probe = new Image();
      const size = await new Promise<{ width: number; height: number }>(
        (resolve, reject) => {
          probe.onload = () =>
            resolve({ width: probe.naturalWidth, height: probe.naturalHeight });
          probe.onerror = () => reject(new Error(t.optimizeDecodeFailed));
          probe.src = sourceUrl;
        },
      );
      const optimized = await optimizeImage({
        t,
        url: sourceUrl,
        width: size.width,
        height: size.height,
        maxWidth: typeof values.width === 'number' ? values.width : size.width,
        maxHeight:
          typeof values.height === 'number' ? values.height : size.height,
        format,
        quality: typeof values.quality === 'number' ? values.quality : 82,
      });
      const named = `corrected.${extensionForRasterType(optimized.format)}`;
      const file = new File([optimized.blob], named, {
        type: optimized.format,
      });

      /*
       * Read the finished bytes back and judge them against what was promised.
       *
       * The decoded size is taken from a SEPARATE `<img>` decode rather than
       * from the encoder's own report, because the verifier treats a header
       * that disagrees with an independent decode as a failure rather than a
       * tie-break — and `createImageBitmap` is not usable here: it refuses
       * ordinary PNGs in the test browser.
       */
      const verifyUrl = URL.createObjectURL(file);
      let decoded: { width: number; height: number } | null = null;
      try {
        const image = await loadImage(verifyUrl, t);
        decoded = { width: image.naturalWidth, height: image.naturalHeight };
      } catch {
        // A decode that does not answer leaves `decodedSize` null, which the
        // verifier treats as unprovable — never as a pass.
      } finally {
        URL.revokeObjectURL(verifyUrl);
      }
      const verification = verifyImageBytes(
        new Uint8Array(await file.arrayBuffer()),
        targetsFor(values),
        decoded,
      );

      const result: Result = {
        file,
        width: optimized.width,
        height: optimized.height,
        format: optimized.format,
        url: URL.createObjectURL(optimized.blob),
        verification,
      };
      resultRef.current = result;
      setStage({ kind: 'done', result });
    } catch (caught) {
      setStage({
        kind: 'failed',
        message:
          caught instanceof Error ? caught.message : t.optimizeEncodeFailed,
      });
    } finally {
      URL.revokeObjectURL(sourceUrl);
    }
  };

  const sendBack = (result: Result) => {
    if (!integrator) return;
    try {
      window.opener?.postMessage(
        resultMessage(result.file),
        // The exact origin the browser reported, never a wildcard and never
        // anything the page was told.
        integrator.origin,
      );
      setStage({ kind: 'sent' });
    } catch {
      setStage({
        kind: 'failed',
        message: 'That window is no longer open. Download the file instead.',
      });
    }
  };

  return (
    <div className="grid gap-4">
      <section className="rounded-2xl border bg-card p-4 sm:p-5">
        <p className="text-base leading-7 sm:text-lg">{requirement}</p>

        {integrator ? (
          <output className="mt-3 flex items-start gap-3 rounded-xl border bg-muted/50 p-3 text-xs leading-5">
            <SendHorizontal
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            />
            <span>
              <span className="font-semibold">
                {describeReturnTarget(integrator.origin)}
              </span>{' '}
              asked for this file and is waiting for it. You choose whether to
              send it — nothing goes back until you press the button.
            </span>
          </output>
        ) : null}

        <div className="mt-3 flex items-start gap-3 rounded-xl border bg-muted/50 p-3 text-xs leading-5">
          <LockKeyhole
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
          />
          <span>
            <span className="font-semibold">
              Your file stays on this device.
            </span>{' '}
            It is read, changed and handed back inside this browser.
            {integrator
              ? ' Sending it back passes it straight between two windows on this machine.'
              : ''}
          </span>
        </div>

        {settingLines.length ? (
          <dl className="mt-4 grid gap-1 text-xs">
            {settingLines.map((line) => (
              <div key={line.label} className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{line.label}</dt>
                <dd className="tabular text-right font-semibold">
                  {line.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
      </section>

      {runnable ? (
        <section className="rounded-2xl border bg-card p-4 sm:p-5">
          <h2 className="text-sm font-semibold">
            Choose your {request.subjectNoun}
          </h2>
          <input
            ref={fileRef}
            id={inputId}
            type="file"
            accept={request.accept}
            aria-label={`Choose the ${request.subjectNoun} to correct`}
            className="sr-only"
            onChange={(event) => accept(event.target.files?.[0])}
          />
          <button
            type="button"
            aria-describedby={`${inputId}-hint`}
            onClick={() => fileRef.current?.click()}
            className="focus-ring mt-3 flex min-h-32 w-full cursor-pointer flex-col items-center justify-center gap-2 break-all rounded-xl border border-dashed bg-background p-5 text-center text-sm font-semibold"
          >
            <Upload
              aria-hidden="true"
              className="size-5 text-muted-foreground"
            />
            {file ? file.name : `Choose your ${request.subjectNoun}`}
          </button>
          <p
            id={`${inputId}-hint`}
            className="mt-2 text-center text-xs text-muted-foreground"
          >
            It is not sent anywhere.
          </p>

          {problem ? (
            <p
              role="alert"
              className="mt-3 rounded-xl border border-destructive/35 bg-destructive/5 p-3 text-xs font-semibold"
            >
              {problem}
            </p>
          ) : null}

          {stage.kind !== 'done' && stage.kind !== 'sent' ? (
            <Button
              type="button"
              className="mt-4 h-11 w-full"
              disabled={!file || stage.kind === 'working'}
              onClick={() => void run()}
            >
              {stage.kind === 'working' ? 'Working…' : 'Correct the file'}
            </Button>
          ) : null}

          {stage.kind === 'failed' ? (
            <p
              role="alert"
              className="mt-3 rounded-xl border border-destructive/35 bg-destructive/5 p-3 text-xs"
            >
              {stage.message}
            </p>
          ) : null}
        </section>
      ) : (
        <section className="rounded-2xl border bg-card p-4 sm:p-5">
          <h2 className="text-sm font-semibold">
            This kind of request opens in its own tool
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sending a corrected file back to another site currently works for
            images. For this one, prepare the file in the tool and send it on
            yourself.
          </p>
          <a
            href={request.recipe.path}
            className={buttonVariants({ className: 'mt-4 h-11 w-full' })}
          >
            Open the tool
          </a>
        </section>
      )}

      {stage.kind === 'done' ? (
        <section className="rounded-2xl border bg-card p-4 sm:p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            {stage.result.verification.pass ? (
              <CheckCircle2 aria-hidden="true" className="size-4" />
            ) : (
              <TriangleAlert aria-hidden="true" className="size-4" />
            )}
            {stage.result.verification.pass
              ? `Your corrected ${request.subjectNoun}, checked`
              : `Your ${request.subjectNoun} — but it does not meet the request`}
          </h2>

          {/*
            The verdict comes from reading the finished bytes, not from what the
            encoder was asked to do. When something could not be inspected at
            all it lands in `unprovable` and the result is NOT a pass — so this
            never says "checked" about a property nobody looked at.
          */}
          {stage.result.verification.pass ? (
            <ul className="mt-2 grid gap-1 text-xs text-muted-foreground">
              {stage.result.verification.checks.map((check) => (
                <li key={check.id}>
                  {check.label}: {check.actual}
                </li>
              ))}
            </ul>
          ) : (
            <output className="mt-2 block rounded-xl border border-destructive/35 bg-destructive/5 p-3 text-xs leading-5">
              <p className="font-semibold">Read back from the finished file:</p>
              <ul className="mt-1 grid gap-1">
                {unmetReasons(stage.result.verification).map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
              <p className="mt-2 text-muted-foreground">
                You can still take the file — it is yours either way. It may not
                be what the other site asked for.
              </p>
            </output>
          )}
          <dl className="mt-3 grid gap-1 text-xs">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Format</dt>
              <dd className="font-semibold">
                {stage.result.format.replace('image/', '').toUpperCase()}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Pixels</dt>
              <dd className="tabular font-semibold">
                {stage.result.width} × {stage.result.height}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Size</dt>
              <dd className="tabular font-semibold">
                {(stage.result.file.size / 1024).toFixed(1)} KB
              </dd>
            </div>
          </dl>
          <div className="mt-4 grid gap-2">
            {integrator ? (
              <Button
                type="button"
                className="h-11 w-full"
                onClick={() => sendBack(stage.result)}
              >
                <SendHorizontal aria-hidden="true" />
                Send it back to {describeReturnTarget(integrator.origin)}
              </Button>
            ) : null}
            <a
              href={stage.result.url}
              download={stage.result.file.name}
              data-receipt-download
              className={buttonVariants({
                variant: integrator ? 'outline' : 'default',
                className: 'h-11 w-full',
              })}
            >
              Download it
            </a>
          </div>
        </section>
      ) : null}

      {stage.kind === 'sent' && integrator ? (
        <output className="rounded-2xl border bg-card p-4 text-sm sm:p-5">
          <span className="font-semibold">
            Sent to {describeReturnTarget(integrator.origin)}.
          </span>{' '}
          You can close this window. The file passed straight between two
          windows on this device; it did not travel over the network to get
          there.
        </output>
      ) : null}
    </div>
  );
}
