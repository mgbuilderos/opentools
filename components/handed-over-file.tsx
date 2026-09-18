'use client';

import { useEffect } from 'react';

import {
  fillFileInput,
  inputAccepts,
  takeOfferedFile,
} from '@/lib/file-handoff';

/**
 * Picks up a file handed over by the smart dropzone and drops it into this
 * page's file input, as though the person had chosen it here.
 *
 * Mounted once for the whole site rather than per tool, so a file carries over
 * to every tool the dropzone can send you to — including tools added later —
 * and never to only some of them.
 *
 * Renders nothing, and fails silently: if there is no file waiting, or storage
 * is unavailable, or no input on this page wants this kind of file, the page is
 * exactly as it was.
 */
export function HandedOverFile() {
  useEffect(() => {
    let cancelled = false;

    void (async () => {
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
