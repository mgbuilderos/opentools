'use client';

import { useEffect } from 'react';

import {
  isStandaloneDocument,
  recordProductSignal,
} from '@/lib/product-telemetry';

/**
 * One counter, recorded once per document, for a page opened as an installed app.
 *
 * **Mounted in `app/layout.tsx`, not in `AppShell`.** The install banner lives
 * in the shell, and the shell is not on every route — `/embed/<tool>` and
 * `/share-target` render their own page. A launch counter that only saw shell
 * routes would under-report by however much of the catalogue does not use it,
 * silently, and nothing would ever show that it had.
 *
 * **It counts documents, not people and not sessions.** A standalone window
 * that opens three tools in turn is three documents and therefore three
 * signals, and there is deliberately nothing here that could tell them apart —
 * any such thing would be the persistent identifier this whole design exists
 * to avoid. So the number is *observed standalone launches*, a count of page
 * loads in an installed app. It is never "unique launches", "installs" or
 * "users", and `analytics/lib/analyse.mjs` refuses to label it as any of them.
 *
 * **iOS is measurable here and nowhere else.** Safari fires no
 * `beforeinstallprompt` and no `appinstalled`, so an iPhone installation is
 * invisible to this product at the moment it happens. `navigator.standalone`
 * is read by `isStandaloneDocument`, so an installed iPhone app does show up
 * from its first launch onward — which is why the launch count is the only
 * evidence of iOS installation that exists, and why it is a lower bound on
 * both. See ADR-020.
 */
export function ProductSignals() {
  useEffect(() => {
    if (!isStandaloneDocument()) return;
    recordProductSignal('pwa-launch');
  }, []);

  return null;
}
