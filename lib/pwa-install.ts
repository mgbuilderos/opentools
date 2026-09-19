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

/** Not in lib.dom; Chromium-only, so the shape is declared here. */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
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
  return true;
}
