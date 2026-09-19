'use client';

import { HeartHandshake, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  CELEBRATED_KEY,
  USAGE_COUNT_KEY,
  milestoneToOffer,
  milestonesReached,
  parseCelebrated,
  parseUsageCount,
} from '@/lib/milestone';
import {
  BUYMEACOFFEE_UNIT_USD,
  SUPPORT_QUICK_INR,
  canAcceptSupport,
  getBuyMeACoffeeUrl,
  getUpiPaymentUrl,
  isLikelyIndiaVisitor,
} from '@/lib/support-config';
import {
  SUPPORT_PREFERENCE_KEY,
  mayOfferSupport,
  supportPreference,
} from '@/lib/support-preference';

/**
 * A once-ever acknowledgement that someone has used this a lot, and an ask.
 *
 * Three things were wrong with the version this replaces, and all three are
 * the same mistake — a second ask surface that did not know the first one
 * existed.
 *
 * It opened a full-screen modal from inside a `tool-executed` handler, which
 * fires in the same `announceCompletion` call that dispatches the receipt's
 * event. On the fiftieth run it therefore covered the page *before* the person
 * could click Save, taking the moment of relief the receipt is built for and
 * spending it on a worse ask. It is now decided once per page load from
 * storage, so a run that crosses a milestone is acknowledged next visit and
 * never over the top of the work in progress.
 *
 * It ignored `mayOfferSupport`, so someone who had already said "don't ask
 * again" on the receipt was asked anyway, by a modal they could not work
 * around. It now reads that preference and writes it, which means the two
 * surfaces share one budget and cannot both ask inside the cooldown.
 *
 * And it offered a bare `/support` link while the receipt offered real rails.
 * It now offers the one rail the visitor can actually use, chosen by the same
 * local check, with `/support` as the way to everything else.
 *
 * The card is deliberately `aria-modal="false"` and anchored in a corner:
 * nothing here may block the page, and the person is not asked to deal with
 * this before they can carry on. Left, because the receipt sits bottom right.
 */
/**
 * How long after a page settles before the card appears. Long enough that it
 * reads as an aside rather than part of the page load, short enough that it is
 * still on screen while the person is looking at it.
 */
const SETTLE_MS = 1200;

export function MilestoneModal() {
  const panel = useRef<HTMLDialogElement>(null);
  const [milestone, setMilestone] = useState<number | null>(null);
  const [isIndia, setIsIndia] = useState(false);

  useEffect(() => {
    // Read once, on mount, never on the completion event: see above.
    let offer: number | null = null;
    let celebrated: number[] = [];
    let count = 0;
    try {
      if (
        !mayOfferSupport(
          localStorage.getItem(SUPPORT_PREFERENCE_KEY),
          Date.now(),
        )
      ) {
        return;
      }
      count = parseUsageCount(localStorage.getItem(USAGE_COUNT_KEY));
      celebrated = parseCelebrated(localStorage.getItem(CELEBRATED_KEY));
      offer = milestoneToOffer(count, celebrated);
    } catch {
      // Storage can be blocked entirely. Saying nothing is the right failure:
      // without it there is no way to know this was already shown, and an
      // acknowledgement repeated every page load is a nuisance, not a thank you.
      return;
    }
    if (offer === null) return;
    const reached = milestonesReached(count, celebrated);
    const shown = offer;
    // Settle first. The state is set from a timer rather than the effect body
    // for two reasons: a synchronous setState here cascades renders, which the
    // React compiler lint refuses, and a card that paints in the same frame as
    // the page reads as an interruption rather than an aside. Recording that
    // the ask happened waits for the same tick, so someone who leaves before
    // it appears has not spent a milestone they never saw.
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          CELEBRATED_KEY,
          JSON.stringify([...celebrated, ...reached]),
        );
        // This is an ask, so it spends from the same budget the receipt does.
        localStorage.setItem(
          SUPPORT_PREFERENCE_KEY,
          supportPreference(Date.now()),
        );
      } catch {
        /* Shown once this session either way; storage is best effort. */
      }
      setIsIndia(isLikelyIndiaVisitor());
      setMilestone(shown);
    }, SETTLE_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (milestone === null) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMilestone(null);
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [milestone]);

  const dismiss = (never = false) => {
    if (never) {
      try {
        localStorage.setItem(
          SUPPORT_PREFERENCE_KEY,
          supportPreference(Date.now(), true),
        );
      } catch {
        /* The card closing is what matters; the preference is best effort. */
      }
    }
    setMilestone(null);
  };

  if (milestone === null) return null;

  return (
    <dialog
      open
      ref={panel}
      aria-modal="false"
      aria-labelledby="milestone-title"
      aria-describedby="milestone-description"
      className="fixed bottom-4 left-4 right-auto top-auto z-[80] m-0 max-h-[calc(100dvh-6rem)] w-[calc(100%-2rem)] max-w-sm overflow-y-auto rounded-xl border bg-card p-0 text-foreground shadow-[0_12px_48px_rgb(0_0_0/14%)]"
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <span className="grid size-10 place-items-center rounded-full border border-success/30 bg-success/15 text-success">
            <HeartHandshake
              aria-hidden="true"
              className="size-5 text-success"
            />
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => dismiss()}
            aria-label="Dismiss support prompt"
          >
            <X aria-hidden="true" />
          </Button>
        </div>

        <h2
          id="milestone-title"
          className="mt-4 text-lg font-semibold leading-snug tracking-[-0.02em]"
        >
          That&apos;s {milestone} tools you&apos;ve run here.
        </h2>
        {/*
          A counted fact and the cost behind it. No "unlocked", no exclamation,
          no claim about time or money saved — those are claims about the
          person's life that nothing here measures. The count is the only
          number in this card, and the browser wrote it.
        */}
        <p
          id="milestone-description"
          className="mt-1.5 text-sm leading-relaxed text-muted-foreground"
        >
          Every one of them ran in your browser — no account, no upload, no ads.
          It stays that way because a few people chip in for the domain and the
          hosting.
        </p>

        {canAcceptSupport() && (
          <div className="mt-4 flex flex-wrap gap-2">
            {isIndia ? (
              <a
                href={getUpiPaymentUrl(
                  SUPPORT_QUICK_INR,
                  'OpenTools — keep it private and ad-free',
                )}
                className="focus-ring inline-flex h-9 items-center justify-center rounded-lg border border-success/40 bg-success/15 px-3 text-xs font-semibold text-success transition-all duration-[var(--motion-standard)] ease-[var(--motion-ease)] hover:-translate-y-0.5 hover:border-success/60 hover:bg-success/25 active:translate-y-0 active:scale-[0.98]"
                aria-label={`Send ₹${SUPPORT_QUICK_INR} via UPI`}
              >
                ☕ ₹{SUPPORT_QUICK_INR} via UPI
              </a>
            ) : (
              <a
                href={getBuyMeACoffeeUrl(1)}
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring inline-flex h-9 items-center justify-center rounded-lg border border-success/40 bg-success/15 px-3 text-xs font-semibold text-success transition-all duration-[var(--motion-standard)] ease-[var(--motion-ease)] hover:-translate-y-0.5 hover:border-success/60 hover:bg-success/25 active:translate-y-0 active:scale-[0.98]"
                aria-label={`Buy one coffee, $${BUYMEACOFFEE_UNIT_USD}, on Buy Me a Coffee`}
              >
                ☕ ${BUYMEACOFFEE_UNIT_USD} coffee
              </a>
            )}
            <a
              href="/support"
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring inline-flex h-9 items-center justify-center rounded-lg border bg-muted/60 px-3 text-xs font-medium text-foreground transition-all duration-[var(--motion-standard)] ease-[var(--motion-ease)] hover:-translate-y-0.5 hover:border-foreground/25 hover:bg-muted active:translate-y-0 active:scale-[0.98]"
              aria-label="See every way to support this"
            >
              Other ways
            </a>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            onClick={() => dismiss()}
            variant="outline"
            className="min-h-10 text-xs"
          >
            Not now
          </Button>
          <Button
            onClick={() => dismiss(true)}
            variant="ghost"
            className="min-h-10 text-xs"
          >
            Don&apos;t ask again
          </Button>
        </div>
      </div>
    </dialog>
  );
}
