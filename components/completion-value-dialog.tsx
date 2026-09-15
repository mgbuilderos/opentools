'use client';

import {
  Check,
  Clock3,
  HeartHandshake,
  LockKeyhole,
  Sparkles,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  COMPLETION_EVENT,
  formatCompletionDuration,
  type CompletionDetail,
} from '@/lib/completion';
import {
  isLikelyIndiaVisitor,
  getUpiPaymentUrl,
  SUPPORT_CONFIG,
} from '@/lib/support-config';
import {
  mayOfferSupport,
  supportPreference,
  SUPPORT_PREFERENCE_KEY,
} from '@/lib/support-preference';

/** A non-modal receipt after download/copy intent; the original action is never blocked or delayed. */
export function CompletionValueDialog() {
  const latest = useRef<CompletionDetail | null>(null);
  const offeredThisPage = useRef(false);
  const trigger = useRef<HTMLElement | null>(null);
  const panel = useRef<HTMLDialogElement>(null);
  const [receipt, setReceipt] = useState<CompletionDetail | null>(null);
  const [isIndia] = useState(() => isLikelyIndiaVisitor());

  const remember = (never = false) => {
    offeredThisPage.current = true;
    try {
      localStorage.setItem(
        SUPPORT_PREFERENCE_KEY,
        supportPreference(Date.now(), never),
      );
    } catch {
      /* The in-memory cap still works when storage is blocked. */
    }
  };
  const dismiss = (never = false) => {
    remember(never);
    const shouldRestoreFocus = panel.current?.contains(document.activeElement);
    setReceipt(null);
    if (shouldRestoreFocus) trigger.current?.focus();
  };

  useEffect(() => {
    let frame = 0;
    const receive = (event: Event) => {
      latest.current = (event as CustomEvent<CompletionDetail>).detail;
      setReceipt(null);
    };
    const observeDownload = (event: MouseEvent) => {
      if (
        offeredThisPage.current ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const result = latest.current;
      if (!result?.metrics?.length || !(event.target instanceof Element))
        return;
      const target = event.target.closest('[data-receipt-download]');
      if (
        !(target instanceof HTMLElement) ||
        target.matches(':disabled, [aria-disabled="true"]')
      )
        return;
      try {
        if (
          !mayOfferSupport(
            localStorage.getItem(SUPPORT_PREFERENCE_KEY),
            Date.now(),
          )
        )
          return;
      } catch {
        /* Storage is optional. */
      }
      trigger.current = target;
      remember();
      // The existing anchor/button action runs first, without interception or replay.
      frame = requestAnimationFrame(() => setReceipt(result));
    };
    window.addEventListener(COMPLETION_EVENT, receive);
    document.addEventListener('click', observeDownload);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener(COMPLETION_EVENT, receive);
      document.removeEventListener('click', observeDownload);
    };
  }, []);

  useEffect(() => {
    if (!receipt) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [receipt]);

  if (!receipt) return null;

  return (
    <dialog
      open
      ref={panel}
      aria-modal="false"
      aria-labelledby="completion-title"
      aria-describedby="completion-description"
      className="fixed bottom-4 left-auto right-4 top-auto z-[80] m-0 max-h-[calc(100dvh-6rem)] w-[calc(100%-2rem)] max-w-sm overflow-y-auto rounded-xl border bg-card p-0 text-foreground shadow-[0_12px_48px_rgb(0_0_0/14%)]"
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <span className="grid size-10 place-items-center rounded-full border bg-muted/40">
            <Check aria-hidden="true" className="size-5 text-foreground" />
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

        <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Sparkles aria-hidden="true" className="size-3.5" />
          <span>Instant Private Result</span>
        </div>

        <h2
          id="completion-title"
          className="mt-1 text-lg font-semibold leading-snug tracking-[-0.02em]"
        >
          Saved you $20/mo and kept your data 100% on your device.
        </h2>
        <p
          id="completion-description"
          className="mt-1.5 text-sm leading-relaxed text-muted-foreground"
        >
          {receipt.summary ?? `${receipt.operation} is complete.`}
        </p>

        <dl className="my-4 grid grid-cols-2 gap-3 border-y py-3">
          <div>
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock3 aria-hidden="true" className="size-3.5" />
              Processing time
            </dt>
            <dd className="tabular mt-1 text-base font-semibold">
              {formatCompletionDuration(receipt.durationMs)}
            </dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <LockKeyhole aria-hidden="true" className="size-3.5" />
              Processed in
            </dt>
            <dd className="mt-1 text-base font-semibold">This browser</dd>
          </div>
        </dl>

        <p className="text-xs leading-5 text-muted-foreground">
          Your download is free and private forever. Consider fueling this
          independent project:
        </p>

        {/* Dynamic Context-Aware Preset Chips */}
        <div className="mt-3.5 flex flex-wrap gap-2">
          {isIndia ? (
            <>
              <a
                href={getUpiPaymentUrl(50, 'Chai Support - OpenTools')}
                className="focus-ring inline-flex h-9 items-center justify-center rounded-lg border bg-muted/50 px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                aria-label="Buy a Chai for ₹50 via UPI"
              >
                ☕ Chai ₹50
              </a>
              <a
                href={getUpiPaymentUrl(150, 'Lunch Support - OpenTools')}
                className="focus-ring inline-flex h-9 items-center justify-center rounded-lg border bg-muted/50 px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                aria-label="Support with ₹150 lunch via UPI"
              >
                🍕 Lunch ₹150
              </a>
              <a
                href={getUpiPaymentUrl(500, 'Super Supporter - OpenTools')}
                className="focus-ring inline-flex h-9 items-center justify-center rounded-lg border bg-foreground px-3 text-xs font-medium text-background transition-opacity hover:opacity-90"
                aria-label="Super Supporter ₹500 via UPI"
              >
                🚀 ₹500
              </a>
            </>
          ) : (
            <>
              <a
                href={SUPPORT_CONFIG.githubRepoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring inline-flex h-9 items-center justify-center rounded-lg border bg-foreground px-3 text-xs font-medium text-background transition-opacity hover:opacity-90"
                aria-label="Star on GitHub"
              >
                ⭐ Star on GitHub
              </a>
              <span className="inline-flex h-9 items-center justify-center rounded-lg border bg-muted/40 px-3 text-xs font-medium text-muted-foreground">
                Sponsors Coming Soon
              </span>
            </>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            onClick={() => dismiss()}
            variant="outline"
            className="min-h-10 text-xs"
          >
            Not now
          </Button>
          <Button
            nativeButton={false}
            render={
              <a
                href="/support"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="All support options (opens in a new tab)"
              />
            }
            className="min-h-10 text-xs"
          >
            <HeartHandshake aria-hidden="true" className="mr-1.5 size-4" />
            Support options
          </Button>
        </div>

        <button
          type="button"
          onClick={() => dismiss(true)}
          className="focus-ring mt-2 min-h-9 w-full rounded-lg text-xs text-muted-foreground hover:text-foreground"
        >
          Don’t ask again
        </button>
      </div>
    </dialog>
  );
}
