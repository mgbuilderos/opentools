'use client';

import { FileUp, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

import { Button, buttonVariants } from '@/components/ui/button';
import { inputAccepts, offerFile } from '@/lib/file-handoff';
import { withHandoffFlag } from '@/lib/share-routing';
import {
  askDestination,
  askSettingLines,
  describeAskRequest,
  readAskLink,
  type AskRequest,
} from '@/lib/tools/ask-link';
import type { RecipeValues } from '@/lib/tools/recipe-link';

/**
 * The recipient's side of an ask link.
 *
 * Somebody was sent this by a recruiter, a college office or a CA. They have
 * never heard of this site, they are probably on a phone, and they want to be
 * finished. So this page has one job: say what is needed in a sentence, take the
 * file from their own machine, and get out of the way.
 *
 * WHAT IT DOES NOT DO, AND WHY THAT IS THE DESIGN. It does not transform
 * anything. The work happens on the real tool page — the same one someone who
 * arrived from a search engine would use — and this page's entire mechanism is
 * two steps that already existed:
 *
 * 1. `offerFile` from `lib/file-handoff.ts` puts the chosen file in this
 *    browser's own IndexedDB, which is where the smart dropzone and the Android
 *    share sheet already put files that are on their way to a tool.
 * 2. A plain navigation to the tool with the request's settings in the query
 *    string — the same arrival the tool already handles for a shared setup
 *    link, applied by the tool's own code.
 *
 * `components/handed-over-file.tsx`, mounted once for the whole site, collects
 * the file on the other side and puts it into the tool's file input as though
 * the person had chosen it there. So the recipient chooses their file exactly
 * once, and there is one transformation path in this product rather than two.
 *
 * WHEN THE HANDOFF CANNOT WORK — a private window, a browser with storage
 * switched off — nothing is lost and nothing is hidden: the page says so and
 * offers the tool with its own file picker. Silently navigating to an empty
 * tool while implying the file came along would be the worse failure.
 *
 * THE FILE NEVER LEAVES THE DEVICE, AND NO SCRIPT HERE COULD SEND IT. It goes
 * into this browser's own storage on the same machine it came from, and the
 * page's `connect-src 'none'` is what makes the second half structural rather
 * than a promise. The wording stays this side of the line on purpose: business
 * rule 23 reserves the settled zero-bytes claim for a build that has passed the
 * egress proof protocol, and `lib/tools/local-source-policy.test.ts` greps for
 * anyone who forgets.
 */

/**
 * How the link was read.
 *
 * `reading` is the first render, on the server and again on the client before
 * the address bar has been looked at. It shows the requirement with no settings
 * in it — `Please provide an image.` — which is true of every version of this
 * page, so nothing on screen has to be corrected a moment later.
 */
type LinkState =
  | { kind: 'reading' }
  | { kind: 'ok'; values: RecipeValues }
  | { kind: 'unrecognised' };

export function AskLinkRequest({ request }: { request: AskRequest }) {
  const [link, setLink] = useState<LinkState>({ kind: 'reading' });
  const [file, setFile] = useState<File | null>(null);
  const [problem, setProblem] = useState('');
  const [handoffFailed, setHandoffFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const noticeRef = useRef<HTMLParagraphElement>(null);
  const inputId = useId();

  /*
   * Read the link once, on mount, because the address bar is an external system
   * and this page is prerendered to a static file — there is no request on the
   * server to read a query string from. Every value is filtered by the
   * request's own definition on the way in, so an out-of-range number or an
   * option the tool does not offer is simply not present.
   */
  /* oxlint-disable react/react-compiler -- reads the address bar, an external
     system, once on mount. The same exemption the arrival effect in
     components/image-optimize-tool.tsx carries, for the same reason. */
  useEffect(() => {
    const arrival = readAskLink(request.id, window.location.search);
    setLink(
      arrival
        ? { kind: 'ok', values: arrival.values }
        : { kind: 'unrecognised' },
    );
  }, [request.id]);
  /* oxlint-enable react/react-compiler */

  useEffect(() => {
    if (problem) noticeRef.current?.focus();
  }, [problem]);

  const values = link.kind === 'ok' ? link.values : {};
  const requirement = describeAskRequest(request, values);
  const settingLines = askSettingLines(request, values);
  const destination = askDestination(request, values);

  const accept = (chosen: File | null | undefined) => {
    if (!chosen) return;
    if (!inputAccepts(request.accept, chosen)) {
      setFile(null);
      setProblem(
        `That does not look like ${request.subjectNoun === 'PDF' ? 'a PDF' : `an ${request.subjectNoun}`}. Choose a different file.`,
      );
      return;
    }
    setProblem('');
    setHandoffFailed(false);
    setFile(chosen);
  };

  /**
   * Hand the file to the tool and go there.
   *
   * The navigation is a plain assignment rather than a router push, because the
   * collector on the other side runs on mount and the whole product treats every
   * link as a full page load — see `lib/file-handoff.ts`.
   */
  const prepare = async () => {
    if (!file || busy) return;
    setBusy(true);
    const stored = await offerFile(file);
    if (!stored) {
      // Storage refused. Say so rather than opening an empty tool.
      setBusy(false);
      setHandoffFailed(true);
      return;
    }
    window.location.assign(
      withHandoffFlag(destination, window.location.origin),
    );
  };

  if (link.kind === 'unrecognised') {
    return (
      <div className="rounded-2xl border bg-card p-4 sm:p-5">
        <h2 className="text-sm font-semibold">
          This link is missing its settings
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Whoever sent it may have shortened it, or a chat app may have cut the
          end off. Ask them to send it again — or open the tool and choose the
          settings yourself.
        </p>
        <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
          <a
            href={request.recipe.path}
            className={buttonVariants({ className: 'h-11' })}
          >
            Open the tool
          </a>
          <a
            href="/ask"
            className={buttonVariants({
              variant: 'outline',
              className: 'h-11',
            })}
          >
            Create a request of your own
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border bg-card p-4 sm:p-5">
        <p className="text-base leading-7 sm:text-lg">{requirement}</p>

        <div className="mt-4 flex items-start gap-3 rounded-xl border bg-muted/50 p-3 text-xs leading-5">
          <LockKeyhole
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
          />
          <span>
            <span className="font-semibold">
              Your file stays on this device.
            </span>{' '}
            The link contains only the requested settings. The work runs in this
            browser tab, and you send the finished file yourself — it does not
            come back to whoever sent you this link through us.
          </span>
        </div>

        {settingLines.length ? (
          <>
            <h2 className="mt-5 text-xs font-semibold">
              You have been asked for
            </h2>
            <dl className="mt-2 grid gap-1 text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">File type</dt>
                <dd className="text-right font-semibold">
                  {request.accept === 'image/*'
                    ? 'Any image this browser can open'
                    : 'A PDF'}
                </dd>
              </div>
              {settingLines.map((line) => (
                <div key={line.label} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{line.label}</dt>
                  <dd className="tabular text-right font-semibold">
                    {line.value}
                  </dd>
                </div>
              ))}
            </dl>
          </>
        ) : null}
      </div>

      <div className="rounded-2xl border bg-card p-4 sm:p-5">
        <h2 className="text-sm font-semibold">
          Choose your {request.subjectNoun}
        </h2>
        {/*
          The input is the mechanism; the button below is the control. They are
          given DIFFERENT accessible names on purpose — a screen reader
          announcing "Choose your image" twice is a worse page, and a test
          locator that matches both is how that goes unnoticed. The same
          separation the exact-size tool already makes.
        */}
        <input
          ref={fileRef}
          id={inputId}
          type="file"
          accept={request.accept}
          aria-label={`Choose the ${request.subjectNoun} to prepare`}
          className="sr-only"
          onChange={(event) => accept(event.target.files?.[0])}
        />
        {/*
          A button, not a styled div: it is the thing you press to choose a file,
          so it should be focusable, announced and operable from the keyboard
          without anything being added to make it so. The file input stays
          `sr-only` with its own label, which is the pattern the exact-size tool
          already uses.

          Drag and drop is the three native handlers below and nothing more. The
          site's smart dropzone exists to *guess* which tool a file belongs in,
          and here the tool is already decided by the link — running that
          machinery would be a second dropzone for no gain.
        */}
        <button
          type="button"
          aria-describedby={`${inputId}-hint`}
          onClick={() => fileRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            accept(event.dataTransfer.files?.[0]);
          }}
          className={`focus-ring mt-3 flex min-h-32 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-5 text-center text-sm font-semibold break-all ${dragging ? 'bg-muted' : 'bg-background'}`}
        >
          <FileUp aria-hidden="true" className="size-5 text-muted-foreground" />
          {file ? file.name : `Choose your ${request.subjectNoun}`}
        </button>
        <p
          id={`${inputId}-hint`}
          className="mt-2 text-center text-xs text-muted-foreground"
        >
          {file
            ? 'Press it again to choose a different one.'
            : 'Or drag it here. It is not sent anywhere.'}
        </p>

        {problem ? (
          <p
            ref={noticeRef}
            role="alert"
            tabIndex={-1}
            className="focus-ring mt-3 rounded-xl border border-destructive/35 bg-destructive/5 p-3 text-xs font-semibold"
          >
            {problem}
          </p>
        ) : null}

        {handoffFailed ? (
          <div
            role="alert"
            className="mt-3 rounded-xl border p-3 text-xs leading-5"
          >
            <p className="font-semibold">
              This browser would not hold the file between pages.
            </p>
            <p className="mt-1 text-muted-foreground">
              Nothing was sent anywhere. Open the tool with the same settings
              and choose the file once more there.
            </p>
            <a
              href={destination}
              className={buttonVariants({
                variant: 'outline',
                className: 'mt-3 h-11 w-full',
              })}
            >
              Open the tool with these settings
            </a>
          </div>
        ) : null}

        <Button
          type="button"
          className="mt-4 h-11 w-full"
          disabled={!file || busy}
          onClick={() => void prepare()}
        >
          <ShieldCheck aria-hidden="true" />
          {busy ? 'Opening the tool…' : `Prepare ${request.subjectNoun}`}
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">
          The next screen does the work in this tab and gives you the file to
          save.
        </p>
      </div>
    </div>
  );
}
