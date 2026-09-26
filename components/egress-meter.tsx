'use client';

import { Activity } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  EMPTY_READING,
  formatEgressBytes,
  observeEgress,
  type EgressReading,
} from '@/lib/egress-meter';
import { SUPPORT_CONFIG, canAcceptSupport } from '@/lib/support-config';

/**
 * A live instrument, not a badge.
 *
 * Every file site has a padlock graphic and a sentence about privacy, and
 * nobody believes any of them — correctly, because a badge is something a site
 * says about itself. This shows a number the *browser* measured, updating while
 * the person works. See `lib/egress-meter.ts` for what is counted and why it is
 * requests rather than body bytes (no browser API reports request body size,
 * so a literal byte meter would be a number we invented).
 *
 * The wording is careful on purpose. It reports a reading, and stops there — it
 * does not settle the question in the person's favour. The stronger claim needs
 * the release egress proof, which has not been run — see `lib/tools/local-source-policy.test.ts`, which fails
 * the build if this file starts asserting it.
 */
export function EgressMeter() {
  const [reading, setReading] = useState<EgressReading>(EMPTY_READING);

  useEffect(() => observeEgress(setReading), []);

  if (!reading.measurable) return null;

  return (
    <aside
      aria-label="Network activity measured on this page"
      className="mx-auto mt-8 max-w-6xl px-4 pb-8 sm:px-8"
    >
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Activity
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
          />
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Measured on this page
            </p>
            <p className="mt-1 font-semibold">
              <span aria-live="polite">
                {reading.requests.toLocaleString()} request
                {reading.requests === 1 ? '' : 's'} that could carry a file ·{' '}
                {formatEgressBytes(reading.bytes)}
              </span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Counted by your own browser&rsquo;s performance timers, not by us.
              Don&rsquo;t believe it? Turn your wifi off and use this page — it
              keeps working.
            </p>
          </div>
        </div>
        {canAcceptSupport() ? (
          <a
            href={SUPPORT_CONFIG.buyMeACoffeeUrl}
            rel="noopener noreferrer"
            target="_blank"
            className="focus-ring shrink-0 self-start rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-muted sm:self-center"
          >
            Support this work
          </a>
        ) : null}
      </div>
    </aside>
  );
}
