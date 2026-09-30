/**
 * Holds the one `beforeinstallprompt` event the browser will ever hand over.
 *
 * WHY THIS IS NOT INSIDE A COMPONENT. Chrome fires the event once, early, and
 * it is the only way to open the real install dialog — it cannot be triggered
 * on demand, and a second one is not issued. A listener registered inside a
 * `useEffect` can therefore miss it outright if it fires before React hydrates.
 * Registering at module scope means we are already listening before any
 * component mounts.
 *
 * It also has to be shared. Two places offer installation — the banner, and the
 * menu entry for people who dismissed the banner — and they must both act on
 * the same captured event rather than racing for it.
 */

import { recordProductSignal } from './product-telemetry';

/**
 * Not in lib.dom; Chromium-only, so the shape is declared here.
 *
 * `userChoice` resolves after the person answers the browser's own dialog, and
 * it is the only truthful source for whether an install was accepted. Tapping
 * our button is not acceptance — it opens a dialog that can still be
 * cancelled — and `appinstalled` is the only thing that says an app exists.
 */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice?: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let captured: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    // Chrome shows its own mini-infobar unless this is prevented. The dialog
    // should open from a deliberate tap, not ambush someone mid-task.
    event.preventDefault();
    captured = event as BeforeInstallPromptEvent;
    notify();
  });

  // Installed by any route — our dialog, or Chrome's own omnibox button. There
  // is nothing left to offer either way.
  window.addEventListener('appinstalled', () => {
    captured = null;
    notify();
    /*
     * The only event that means an installation happened. Counted here rather
     * than beside the button because Chrome's own omnibox install fires it too
     * and that is just as real an installation.
     *
     * It is a LOWER BOUND and must never be reported as a total: it fires only
     * while a page of ours is open, only on engines that implement it, and iOS
     * Safari's Add to Home Screen fires nothing at all. See ADR-020.
     */
    recordProductSignal('pwa-installed');
  });
}

/** Subscribe to changes in whether installation is currently offerable. */
export function subscribeInstall(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function canInstall(): boolean {
  return captured !== null;
}

/** Server snapshot: nothing is installable before hydration. */
export function canInstallOnServer(): boolean {
  return false;
}

/**
 * Opens the browser's real install dialog. Returns false when there was
 * nothing to open, so callers can stay silent rather than claim otherwise.
 */
export async function showInstallDialog(): Promise<boolean> {
  if (!captured) return false;

  const event = captured;
  // Chrome permits a captured event to be used once. Clearing first means a
  // double-tap cannot fire it twice.
  captured = null;
  notify();

  await event.prompt();

  /*
   * What the person actually answered, from the browser rather than from the
   * fact that they opened the dialog. Chromium resolves `userChoice`; anything
   * that does not expose it contributes no funnel row rather than a guessed
   * one, which is why this is a `?.` and not an assumption.
   */
  try {
    const choice = await event.userChoice;
    if (choice?.outcome === 'accepted')
      recordProductSignal('install-prompt-accepted');
    else if (choice?.outcome === 'dismissed')
      recordProductSignal('install-prompt-dismissed');
  } catch {
    /* No answer available. Count nothing; a guess here would be a false funnel. */
  }

  return true;
}
