'use client';

import { useSyncExternalStore } from 'react';

import {
  productSignalsEnabled,
  setProductSignalsEnabled,
  signalsSuppressed,
} from '@/lib/product-telemetry';

/**
 * The switch that stops the nine counters for this browser.
 *
 * **Why it is here and not beside a finished job.** A per-job notice saying
 * "a signal was sent" would be read as an alarm, and it would be an alarm
 * about a request that carries nothing — no identifier, no query string, no
 * body. The proportionate thing is one permanent, findable disclosure with a
 * switch next to it, on the page somebody already opens to ask this question.
 *
 * **It reports the real state, including when something else already decided.**
 * Global Privacy Control and Do Not Track both suppress the counters, and a
 * browser sending either would otherwise see a switch reading "on" while
 * nothing was being counted — a small lie, on the privacy page, which is the
 * worst possible place for one. Blocked storage is reported too, because a
 * switch that silently fails to remember is worse than one that says so.
 *
 * **`useSyncExternalStore`, not `useState` in an effect.** The preference
 * lives in `localStorage`, which is an external system React does not own, and
 * this page is prerendered at build time so the server has nothing truthful to
 * draw. The server snapshot is `loading`, which renders nothing; React swaps in
 * the real value after hydration with no cascading render and no mismatch.
 */
type ControlState = 'loading' | 'unavailable' | 'on' | 'off' | 'suppressed';

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Returns a plain string rather than an object, deliberately: React calls this
 * on every render and compares the result with `Object.is`, so anything freshly
 * allocated would loop forever.
 */
function readState(): ControlState {
  try {
    localStorage.getItem('opentools-product-signals');
  } catch {
    return 'unavailable';
  }
  if (!productSignalsEnabled()) return 'off';
  // `signalsSuppressed` is also true when the local switch is off, so by this
  // point the only reason left is a browser-level one.
  return signalsSuppressed() ? 'suppressed' : 'on';
}

const readServerState = (): ControlState => 'loading';

export function ProductSignalControl() {
  const state = useSyncExternalStore(subscribe, readState, readServerState);

  if (state === 'loading') return null;

  if (state === 'unavailable') {
    return (
      <p className="mt-4 rounded-xl border bg-muted/50 p-3.5 text-sm leading-6 sm:p-4">
        This browser will not let the page remember a preference, so the switch
        is not shown. Nothing is stored either way; a browser-level Do Not Track
        or Global Privacy Control setting still stops the counters.
      </p>
    );
  }

  const enabled = state === 'on';
  const toggle = () => {
    setProductSignalsEnabled(!(state === 'on' || state === 'suppressed'));
    for (const listener of listeners) listener();
  };

  return (
    <div className="mt-4 rounded-xl border bg-muted/50 p-3.5 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Anonymous product counters</p>
          <p className="mt-0.5 text-sm leading-6 text-muted-foreground">
            {state === 'suppressed'
              ? 'Already off: your browser sends Do Not Track or Global Privacy Control, and both are honoured.'
              : enabled
                ? 'On. Nine fixed counters, no identifier, nothing about your files.'
                : 'Off. Nothing is requested from this browser.'}
          </p>
        </div>
        <button
          type="button"
          onClick={toggle}
          aria-pressed={enabled}
          className="focus-ring h-[var(--control-height)] shrink-0 rounded-lg border bg-card px-4 text-sm font-semibold transition-colors hover:bg-muted"
        >
          {state === 'off' ? 'Turn them on' : 'Turn them off'}
        </button>
      </div>
    </div>
  );
}
