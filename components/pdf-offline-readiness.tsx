'use client';

import { CheckCircle2, RefreshCw, WifiOff } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  offlineCacheName,
  summariseOfflineHolding,
  type OfflineReadiness,
} from '@/lib/offline-readiness';

/**
 * Whether this browser can compress a PDF with the network switched off —
 * read out of the cache, not asserted.
 *
 * WHY A PANEL AND NOT A SENTENCE. "Works offline" is a claim about a build.
 * Whether it is true for the person reading it depends on their browser: a
 * first visit has nothing cached yet, a private window may keep nothing, and
 * storage can be evicted between visits. Every one of those is a browser where
 * a printed promise would be wrong and unfalsifiable. This reports what is
 * actually held, so the reader can check the claim rather than take it.
 *
 * WHAT IT REFUSES TO CALL READY. Holding the page means the address opens.
 * Running the compressor needs its engine bundle too, and until 2026-09-24 that
 * bundle was in no payload at all — `/pdf/compress` opened with the network off
 * and then failed on the first file. See `lib/offline-readiness.ts` for both
 * gates and `scripts/build-service-worker-precache.mjs` for the repair.
 *
 * It reads `caches` directly rather than asking the service worker. Cache
 * Storage is same-origin storage, so this needs no message channel and no
 * network — which is the point, on a page about not needing one.
 */

type State =
  | { kind: 'checking' }
  /** No Cache Storage at all: a browser this feature cannot exist in. */
  | { kind: 'unsupported' }
  /** Cache Storage works and this site has never installed its worker here. */
  | { kind: 'never-installed' }
  /** Reading the cache threw. Reported, not swallowed into "not ready". */
  | { kind: 'unreadable' }
  | { kind: 'read'; readiness: OfflineReadiness };

async function readHolding(route: string): Promise<State> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return { kind: 'unsupported' };
  }
  try {
    const name = offlineCacheName(await caches.keys());
    if (!name) return { kind: 'never-installed' };
    const cache = await caches.open(name);
    const requests = await cache.keys();
    const paths = requests.map((request) => new URL(request.url).pathname);
    return {
      kind: 'read',
      readiness: summariseOfflineHolding({ paths, route }),
    };
  } catch {
    /*
      Cache Storage throws rather than returning empty in a private window on
      some engines, and "this browser will not tell us" is a different answer
      from "this browser holds nothing". Collapsing the two would put a reader
      on the wrong instruction — reload to fill a cache that cannot be filled.
    */
    return { kind: 'unreadable' };
  }
}

export function PdfOfflineReadiness({ route }: { route: string }) {
  const [state, setState] = useState<State>({ kind: 'checking' });

  const check = useCallback(() => {
    setState({ kind: 'checking' });
    void readHolding(route).then(setState);
  }, [route]);

  /* oxlint-disable react/react-compiler -- reads Cache Storage, an external
     system, once on mount: what an effect is for. */
  useEffect(() => {
    check();
  }, [check]);
  /* oxlint-enable react/react-compiler */

  const ready = state.kind === 'read' && state.readiness.ready;

  return (
    <section
      aria-labelledby="offline-readiness-heading"
      className="mt-6 rounded-2xl border bg-muted/55 p-4 sm:p-5"
    >
      <h2
        id="offline-readiness-heading"
        className="flex items-center gap-2 text-sm font-semibold"
      >
        {ready ? (
          <CheckCircle2 aria-hidden="true" className="size-4" />
        ) : (
          <WifiOff aria-hidden="true" className="size-4" />
        )}
        Can this device compress a PDF with the network off?
      </h2>

      {/* An `output` element, not a `p` with `role="status"`: same implicit
          role, and the one the lint rule insists on. */}
      <output className="mt-3 block text-sm leading-6 text-muted-foreground">
        {state.kind === 'checking' && 'Reading what this browser has stored…'}
        {state.kind === 'unsupported' &&
          'This browser has no Cache Storage, so nothing can be held for later. The compressor still runs here with a connection — the work is done by this tab, under a policy served with the page that forbids it from opening any connection at all.'}
        {state.kind === 'never-installed' &&
          'Not yet. This site has stored nothing on this device, which is normal on a first visit: the copy is made in the background shortly after a page loads. Come back to this page once with a connection, then check again.'}
        {state.kind === 'unreadable' &&
          'This browser will not say what it has stored — usually a private window, or site data switched off. Treat offline use as unavailable here rather than assume it.'}
        {state.kind === 'read' &&
          (state.readiness.ready
            ? `Yes. This page and the compression engine are both stored on this device — ${state.readiness.held} files in total. You can turn the network off, reload this address, and compress a PDF with no connection at all.`
            : `Not yet — ${state.readiness.missing.join(' and ')} ${state.readiness.missing.length > 1 ? 'are' : 'is'} not stored here, out of ${state.readiness.held} files that are. Reload this page once with a connection and check again; if it stays this way, this browser is clearing site data.`)}
      </output>

      {state.kind === 'read' && (
        <ul className="mt-3 space-y-1 text-sm leading-6 text-muted-foreground">
          <li>
            This page, stored for offline use:{' '}
            <strong>{state.readiness.page ? 'yes' : 'no'}</strong>
          </li>
          <li>
            The compression engine, stored for offline use:{' '}
            <strong>{state.readiness.engine ? 'yes' : 'no'}</strong>
          </li>
        </ul>
      )}

      <Button
        className="mt-4"
        onClick={check}
        size="sm"
        type="button"
        variant="outline"
      >
        <RefreshCw aria-hidden="true" className="size-4" />
        Check again
      </Button>
    </section>
  );
}
