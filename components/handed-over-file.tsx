'use client';

import { useEffect } from 'react';

import {
  fillFileInput,
  inputAccepts,
  noteFileWaiting,
  takeOfferedFile,
} from '@/lib/file-handoff';
import { HANDOFF_FLAG } from '@/lib/share-routing';

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
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        if (
          new URLSearchParams(window.location.search).get(HANDOFF_FLAG) === '1'
        ) {
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

  return null;
}
