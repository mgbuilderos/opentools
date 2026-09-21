'use client';

import { useEffect, useState } from 'react';
import { offerFile } from '@/lib/file-handoff';
import { shareDestinationFor, withHandoffFlag } from '@/lib/share-routing';

/**
 * Not in lib.dom. Chromium-only, and only present in an installed app that the
 * operating system opened with a file already chosen.
 */
interface LaunchParams {
  files?: readonly FileSystemFileHandle[];
}
type LaunchQueue = {
  setConsumer: (consumer: (params: LaunchParams) => void) => void;
};

/**
 * The landing for a file that arrived from outside the browser.
 *
 * Two different mechanisms end up here and they behave differently.
 *
 * **The Android share sheet** POSTs the file to this path, and never reaches
 * this component at all: `public/sw.js` answers that POST inside the browser,
 * stores the file where the tool pages already look for handed-over files, and
 * redirects straight to the tool. Someone sharing a bank statement out of a
 * chat app sees the tool open with their document in it and nothing else.
 *
 * **A file handler** — the installed app opened by the operating system
 * because someone chose "open with" — is a plain navigation, so it does land
 * here, and the file is delivered afterwards through `launchQueue`. That is
 * what this component is for.
 *
 * What is rendered is therefore the third case: somebody reached this URL with
 * no file attached to it. It explains what the page is instead of showing an
 * error, because in an installed window there is no address bar to escape from.
 */
export function ShareTargetLanding() {
  const [state, setState] = useState<'idle' | 'opening'>('idle');

  useEffect(() => {
    const queue = (window as unknown as { launchQueue?: LaunchQueue })
      .launchQueue;
    if (!queue) return;

    queue.setConsumer((params) => {
      const handle = params.files?.[0];
      if (!handle) return;
      setState('opening');
      void (async () => {
        try {
          const file = await handle.getFile();
          const stored = await offerFile(file);
          // Sending someone to an empty tool while saying a file is waiting is
          // worse than sending them to the front page.
          window.location.replace(
            stored
              ? withHandoffFlag(
                  shareDestinationFor(file.name, file.type),
                  window.location.origin,
                )
              : '/',
          );
        } catch {
          setState('idle');
        }
      })();
    });
  }, []);

  if (state === 'opening') {
    return (
      <output className="block text-sm leading-6 text-muted-foreground">
        Opening your file in the right tool…
      </output>
    );
  }

  return (
    <>
      <p className="text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
        This page receives a file you send to OpenTools from somewhere else —
        your phone&apos;s share sheet, or &ldquo;open with&rdquo; on a desktop.
        It then opens the tool that handles that kind of file, with the file
        already loaded, so you never have to find it again in a file picker.
      </p>
      <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
        There is no file attached to this visit, so there is nothing to open.
        Install OpenTools to your home screen and it will appear in the share
        sheet alongside everything else.
      </p>
      <a
        href="/"
        className="focus-ring mt-5 inline-flex h-[var(--control-height)] items-center rounded-lg bg-foreground px-4 text-sm font-semibold text-background"
      >
        Go to all tools
      </a>
    </>
  );
}
