/* oxlint-disable */
'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { Download, Share, X } from 'lucide-react';
import {
  canInstall,
  canInstallOnServer,
  showInstallDialog,
  subscribeInstall,
} from '@/lib/pwa-install';
import { COMPLETION_EVENT } from '@/lib/completion';

const DISMISSED_KEY = 'opentools-install-dismissed-v1';

/**
 * Offers to install the site as an app, and registers the service worker that
 * makes that possible.
 *
 * **Why every visitor cannot be shown the same thing.** Chrome and Android fire
 * `beforeinstallprompt` only when their own criteria are met, and that event is
 * the only way to open the real install dialog — it cannot be triggered on
 * demand. Safari on iOS fires nothing at all and forbids programmatic
 * installation outright; there, the only route is Share → Add to Home Screen,
 * which the person must do themselves. And anyone who already installed should
 * see nothing.
 *
 * So this shows the strongest thing available per platform rather than
 * pretending one path works everywhere:
 *
 * - Chrome/Android/desktop → a button that opens the real install dialog.
 * - iOS Safari → a short instruction naming the actual menu item.
 * - Already installed → nothing.
 *
 * **Why it waits for a finished job.** It used to render on arrival, which is
 * the worst moment there is: a first-time visitor has had nothing from this
 * site yet and is being asked to put it on their home screen. Asking is cheap
 * only once — the dismissal is remembered forever — so it is spent at the one
 * moment the answer is obvious, immediately after a tool has finished
 * someone's work. Nothing is shown until `COMPLETION_EVENT` fires.
 *
 * It is dismissible and the dismissal is remembered. The product's whole
 * argument is that it does not nag or gate; an install banner that cannot be
 * closed would contradict that for a feature nobody is obliged to want.
 */
export function InstallPrompt() {
  // Captured at module scope in `@/lib/pwa-install`, not here: Chrome fires
  // `beforeinstallprompt` once and can fire it before React hydrates, so a
  // listener added in an effect below could miss it outright.
  const deferred = useSyncExternalStore(
    subscribeInstall,
    canInstall,
    canInstallOnServer,
  );
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [finishedSomething, setFinishedSomething] = useState(false);
  /**
   * The receipt and the milestone card both open at the bottom of the screen,
   * and on a phone each is near enough full width that a third thing there
   * covers one of them. They are the surfaces that pay for the site, so this
   * one yields: it waits for the last `<dialog>` to close before appearing.
   * `close` does not bubble, so the listener is a capturing one on `document`.
   */
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    // Registered here rather than in a layout so the worker and the prompt that
    // depends on it cannot drift apart. It is deliberately not waiting for the
    // completion event below: the worker is what serves the app with no
    // network and what answers the share sheet, and both have to be in place
    // long before anyone finishes a job. Failure is silent and harmless.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }

    try {
      if (localStorage.getItem(DISMISSED_KEY) === '1') {
        setDismissed(true);
        return;
      }
    } catch {
      /* Private mode and blocked storage both mean "not dismissed". */
    }

    // Already running as an installed app — there is nothing to offer.
    const installed =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      // Safari's own flag, which predates the standard media query.
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (installed) {
      setDismissed(true);
      return;
    }

    // iOS never fires that event. Detect it directly, and exclude installed
    // and in-app browsers where Add to Home Screen is unavailable anyway.
    const ua = navigator.userAgent;
    const iOS = /iPad|iPhone|iPod/u.test(ua) && !/CriOS|FxiOS|EdgiOS/u.test(ua);
    if (iOS) setShowIosHint(true);

    const onCompletion = () => setFinishedSomething(true);
    const readDialogs = () =>
      setDialogOpen(document.querySelector('dialog[open]') !== null);

    window.addEventListener(COMPLETION_EVENT, onCompletion);
    // `<dialog>` announces neither its open nor, bubbling, its close, so the
    // `open` attribute itself is what is watched.
    const dialogs = new MutationObserver(readDialogs);
    dialogs.observe(document.body, {
      subtree: true,
      childList: true,
      attributeFilter: ['open'],
    });
    readDialogs();

    return () => {
      window.removeEventListener(COMPLETION_EVENT, onCompletion);
      dialogs.disconnect();
    };
  }, []);

  const close = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      /* Nothing to remember it with; it will reappear next visit. */
    }
  };

  const install = async () => {
    if (await showInstallDialog()) close();
  };

  if (dismissed || !finishedSomething || dialogOpen) return null;
  if (!deferred && !showIosHint) return null;

  return (
    <div
      data-install-prompt
      className="fixed inset-x-3 bottom-3 z-[55] mx-auto flex max-w-md items-center gap-3 rounded-xl border border-success/30 bg-card px-3 py-2.5 shadow-[0_12px_48px_rgb(0_0_0/14%)] sm:px-4"
    >
      <Download
        aria-hidden="true"
        className="size-4 shrink-0 text-success sm:size-5"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight">
          Keep these tools one tap away 📲
        </p>
        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
          {showIosHint ? (
            <>
              Tap <Share aria-hidden="true" className="inline size-3" /> Share,
              then <strong className="font-semibold">Add to Home Screen</strong>
              .
            </>
          ) : (
            'Install it and your files open straight from the share sheet.'
          )}
        </p>
      </div>
      {deferred && (
        <button
          type="button"
          onClick={install}
          className="focus-ring shrink-0 rounded-lg bg-success px-3 py-1.5 text-xs font-semibold text-white transition-transform active:scale-[0.98]"
        >
          Install
        </button>
      )}
      <button
        type="button"
        onClick={close}
        aria-label="Dismiss"
        className="focus-ring shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}
