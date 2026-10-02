'use client';

import { useEffect, useState } from 'react';

import {
  fileWaitingMarkerPresent,
  fillFileInput,
  inputAccepts,
  noteFileWaiting,
  takeOfferedFile,
} from '@/lib/file-handoff';
import { recordProductSignal } from '@/lib/product-telemetry';
import {
  HANDOFF_FLAG,
  HANDOFF_UNAVAILABLE_FLAG,
  HANDOFF_UNAVAILABLE_VALUE,
} from '@/lib/share-routing';

/**
 * Picks up a file handed over by the smart dropzone and drops it into this
 * page's file input, as though the person had chosen it here.
 *
 * Mounted once for the whole site rather than per tool, so a file carries over
 * to every tool the dropzone can send you to — including tools added later —
 * and never to only some of them.
 *
 * It is also what makes the Android share target land somewhere useful. A file
 * shared out of another app is written into the same store by `public/sw.js`,
 * which then redirects here; a service worker has no `sessionStorage`, so it
 * cannot raise the marker the collector normally waits for and passes a query
 * flag instead. Raising the marker from the flag is the whole of the
 * difference — from that point a shared file and a dropped one are the same
 * file taking the same path into the same tool.
 *
 * Renders nothing, and fails silently: if there is no file waiting, or storage
 * is unavailable, or no input on this page wants this kind of file, the page is
 * exactly as it was.
 */
export function HandedOverFile() {
  /**
   * Whether this page was opened by a receipt whose file could not be carried.
   *
   * Read once, in the initialiser, so the notice is on screen in the first
   * render rather than appearing a frame later beside a file input the person is
   * already reaching for. The flag is set by `withHandoffUnavailable()` — see
   * `lib/share-routing.ts` for why it is named for the effect and not a cause.
   */
  const [couldNotCarry, setCouldNotCarry] = useState(() => {
    try {
      return (
        typeof window !== 'undefined' &&
        new URLSearchParams(window.location.search).get(
          HANDOFF_UNAVAILABLE_FLAG,
        ) === HANDOFF_UNAVAILABLE_VALUE
      );
    } catch {
      // An unparseable query is not a reason to render an alarm.
      return false;
    }
  });

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        if (
          new URLSearchParams(window.location.search).get(HANDOFF_FLAG) === '1'
        ) {
          /*
           * A SHARE FROM THE OPERATING SYSTEM'S SHARE SHEET, and not the two
           * other things that put this flag on a URL.
           *
           * Three places set `?shared=1`: `public/sw.js` after answering the
           * Android share POST, `components/share-target-landing.tsx` after a
           * file-handler launch, and `components/ask-link-request.tsx` after
           * someone prepares a file for a request. The two in-page ones call
           * `offerFile` first, which raises the `sessionStorage` marker before
           * navigating. The service worker has none to raise — that is the
           * documented reason the query flag exists at all — so the marker is
           * absent for exactly one of the three.
           *
           * Read before `noteFileWaiting` below, which would otherwise raise
           * the marker we are testing for. Ordinary navigation to
           * `/share-target` carries no flag and is never counted; the two
           * in-page arrivals are counted by their own events or not at all.
           *
           * Nothing about the shared file is recorded, and this says nothing
           * about whether the person then completed anything — that is a
           * separate signal with a separate meaning.
           */
          if (!fileWaitingMarkerPresent())
            recordProductSignal('share-target-opened');
          noteFileWaiting();
        }
      } catch {
        /* An unparseable query is not a reason to stop collecting. */
      }

      const file = await takeOfferedFile();
      if (!file || cancelled) return;

      // The tool's own file input may not exist yet: each tool renders its
      // controls after its own hydration, and how long that takes differs
      // between engines. Keep looking for a short while rather than giving up
      // on the first frame and losing the file in silence.
      const deadline = Date.now() + 5000;
      // Prefer an input that says it wants this kind of file; a tool with one
      // unrestricted input still gets it.
      const find = () =>
        [
          ...document.querySelectorAll<HTMLInputElement>('input[type="file"]'),
        ].find((input) => inputAccepts(input.accept ?? '', file));

      let target = find();
      while (!target && !cancelled && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        target = find();
      }
      if (target && !cancelled) fillFileInput(target, file);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
    THE FILE DID NOT MAKE THE TRIP, SAID WHERE IT MATTERS.

    Taken from `antigravity/depth-next-operation` (`9c348c0`), which had the
    better half of this design: the person is told at the page they land on,
    not on the receipt they are leaving. Two things are deliberately different.

    THE COPY NAMES NO CAUSE. The original read "This file is too large to carry
    over automatically in Safari." Neither half is knowable here. The refusal
    can be size, WebKit declining IndexedDB, or a private window refusing both,
    and the writer only learns that it failed — so a sentence naming size, or
    naming Safari to someone in a private Chrome window, would be a claim the
    site cannot support. It says what happened and what to do instead.

    IT IS NOT KEYED ON SIZE. The marker is set whenever the handoff refused, for
    any reason. Pairing it with a size test — as `!stored && size > cap` does —
    leaves a storage refusal on a small file with no marker at all, which is the
    silent empty page this notice exists to prevent.

    Bottom-LEFT, while the completion card is bottom-right at `z-[80]`: they are
    never on the same page, but a visitor who goes back would otherwise find one
    under the other. `e2e/next-operation.spec.ts` holds that this notice leaves
    the tool's own file input clickable at phone width, which is the failure
    `e2e/completion-card.spec.ts` exists for.
  */
  if (!couldNotCarry) return null;

  return (
    <output
      aria-live="polite"
      data-testid="handoff-not-carried"
      className="fixed bottom-4 left-4 z-[70] block max-w-sm rounded-lg border bg-card p-3 text-xs text-foreground shadow-[0_12px_48px_rgb(0_0_0/14%)]"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="leading-relaxed">
          This browser could not carry your file over to this tool. Choose the
          file you just saved to carry on — it never left your device.
        </span>
        <button
          type="button"
          onClick={() => setCouldNotCarry(false)}
          aria-label="Dismiss notice"
          className="text-muted-foreground hover:text-foreground"
        >
          ×
        </button>
      </div>
    </output>
  );
}
