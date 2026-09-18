/* oxlint-disable */
'use client';

import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';

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
 * It is dismissible and the dismissal is remembered. The product's whole
 * argument is that it does not nag or gate; an install banner that cannot be
 * closed would contradict that for a feature nobody is obliged to want.
 *
 * **Do not put an offline claim back into this banner.** It said "Works
 * offline afterwards" and "every tool keeps working — even with no internet"
 * until 2026-09-19. Those were removed deliberately, not for brevity.
 *
 * The service worker used to serve navigations from its cache, which is what
 * made the site usable with the network off. That same code path was the P0:
 * `/sw.js` is served `connect-src 'none'`, a worker inherits the CSP of its
 * own script, so the worker's `fetch()` always threw and every navigation
 * after the first showed "You are offline" to people whose internet was fine.
 * The fix (Route 1, approved by the owner 2026-09-19) has the worker step
 * aside for navigations. That ends the bug and it also ends offline support —
 * a trade the owner accepted knowingly.
 *
 * So installing is still worth offering: it opens in its own window, one tap
 * away, no browser chrome. It just does not work without a network, and
 * saying otherwise would be a false claim in the product's most prominent
 * banner. See `docs/REVENUE_OPERATIONS.md` §A0.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<Event | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // Registered here rather than in a layout so the worker and the prompt that
    // depends on it cannot drift apart. Failure is silent and harmless: without
    // a worker the site still works, it just cannot be installed on Chrome.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }

    try {
      if (localStorage.getItem(DISMISSED_KEY) === '1') return;
    } catch {
      /* Private mode and blocked storage both mean "not dismissed". */
    }

    // Already running as an installed app — there is nothing to offer.
    const installed =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      // Safari's own flag, which predates the standard media query.
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (installed) return;

    setDismissed(false);

    const onPrompt = (event: Event) => {
      // Chrome shows its own mini-infobar unless this is prevented; we want the
      // dialog to open from a deliberate tap instead.
      event.preventDefault();
      setDeferred(event);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);

    // iOS never fires that event. Detect it directly, and exclude installed
    // and in-app browsers where Add to Home Screen is unavailable anyway.
    const ua = navigator.userAgent;
    const iOS = /iPad|iPhone|iPod/u.test(ua) && !/CriOS|FxiOS|EdgiOS/u.test(ua);
    if (iOS) setShowIosHint(true);

    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
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
    const event = deferred as (Event & { prompt?: () => Promise<void> }) | null;
    if (!event?.prompt) return;
    await event.prompt();
    setDeferred(null);
    close();
  };

  if (dismissed) return null;
  if (!deferred && !showIosHint) return null;

  return (
    <div className="mx-auto mb-3 flex max-w-4xl items-center gap-3 rounded-xl border border-success/30 bg-success/5 px-3 py-2.5 sm:px-4">
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
              . Opens in its own window, without browser chrome.
            </>
          ) : (
            'Opens in its own window, one tap from your home screen.'
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
