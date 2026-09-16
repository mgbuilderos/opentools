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

function getReliefHeadline(operation?: string): string {
  if (!operation)
    return 'Kept your files 100% on your device with zero cloud uploads.';
  const op = operation.toLowerCase();
  if (
    op.includes('secret') ||
    op.includes('scrub') ||
    op.includes('har') ||
    op.includes('pii') ||
    op.includes('sanitize') ||
    op.includes('mask')
  ) {
    return 'Prevented accidental data leaks and protected sensitive credentials.';
  }
  if (
    op.includes('compress') ||
    op.includes('size') ||
    op.includes('exact-kb') ||
    op.includes('optimize')
  ) {
    return 'Target size achieved. Ready for upload portals with zero data leaks.';
  }
  if (
    op.includes('pdf') ||
    op.includes('extract') ||
    op.includes('merge') ||
    op.includes('split')
  ) {
    return 'Saved you paid software subscriptions and kept documents 100% private.';
  }
  if (
    op.includes('ocr') ||
    op.includes('transcribe') ||
    op.includes('audio') ||
    op.includes('speech')
  ) {
    return 'Fast offline AI processing with zero third-party cloud uploads.';
  }
  return 'Saved you paid software subscriptions and kept data 100% on your device.';
}

/** A non-modal receipt after download/copy intent; the original action is never blocked or delayed. */
export function CompletionValueDialog() {
  const latest = useRef<CompletionDetail | null>(null);
  const offeredThisPage = useRef(false);
  const trigger = useRef<HTMLElement | null>(null);
  const panel = useRef<HTMLDialogElement>(null);
  const delayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    if (delayTimer.current) clearTimeout(delayTimer.current);
    const shouldRestoreFocus = panel.current?.contains(document.activeElement);
    setReceipt(null);
    if (shouldRestoreFocus) trigger.current?.focus();
  };

  useEffect(() => {
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
      // 400ms relief delay: allows user to confirm their download started before presenting the value card
      if (delayTimer.current) clearTimeout(delayTimer.current);
      delayTimer.current = setTimeout(() => {
        setReceipt(result);
      }, 400);
    };
    window.addEventListener(COMPLETION_EVENT, receive);
    document.addEventListener('click', observeDownload);
    return () => {
      if (delayTimer.current) clearTimeout(delayTimer.current);
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
          <span className="grid size-10 place-items-center rounded-full border border-success/30 bg-success/15 text-success">
            <Check aria-hidden="true" className="size-5 text-success" />
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

        <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-success">
          <Sparkles aria-hidden="true" className="size-3.5" />
          <span>Instant Private Result</span>
        </div>

        <h2
          id="completion-title"
          className="mt-1 text-lg font-semibold leading-snug tracking-[-0.02em]"
        >
          {getReliefHeadline(receipt.operation)}
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
          Built by an independent developer. 100% ad-free &amp; private forever.
          Fuel a quick coffee or chai to keep this running:
        </p>

        {/* Dynamic Context-Aware Preset Chips */}
        <div className="mt-3.5 flex flex-wrap gap-2">
          {isIndia ? (
            <>
              <a
                href={getUpiPaymentUrl(
                  29,
                  'OpenTools Chai ☕ - Keep It Private & Ad-Free',
                )}
                className="focus-ring inline-flex h-9 items-center justify-center rounded-lg border bg-muted/60 px-3 text-xs font-medium text-foreground transition-all duration-[var(--motion-standard)] ease-[var(--motion-ease)] hover:-translate-y-0.5 hover:bg-muted hover:border-foreground/25 active:translate-y-0 active:scale-[0.98]"
                aria-label="Buy a Chai for ₹29 via UPI"
              >
                ☕ Chai ₹29
              </a>
              <a
                href={getUpiPaymentUrl(
                  149,
                  'OpenTools Lunch 🍕 - Keep It Private & Ad-Free',
                )}
                className="focus-ring inline-flex h-9 items-center justify-center rounded-lg border border-success/40 bg-success/15 px-3 text-xs font-semibold text-success transition-all duration-[var(--motion-standard)] ease-[var(--motion-ease)] hover:-translate-y-0.5 hover:bg-success/25 hover:border-success/60 active:translate-y-0 active:scale-[0.98]"
                aria-label="Support with ₹149 lunch via UPI"
              >
                🍕 Lunch ₹149
              </a>
              <a
                href={getUpiPaymentUrl(
                  499,
                  'OpenTools Patron 🚀 - Keep It Private & Ad-Free',
                )}
                className="focus-ring inline-flex h-9 items-center justify-center rounded-lg border bg-foreground px-3 text-xs font-medium text-background transition-all duration-[var(--motion-standard)] ease-[var(--motion-ease)] hover:-translate-y-0.5 hover:opacity-90 active:translate-y-0 active:scale-[0.98]"
                aria-label="Super Supporter ₹499 via UPI"
              >
                🚀 ₹499
              </a>
            </>
          ) : (
            <>
              <a
                href={SUPPORT_CONFIG.githubSponsorsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring inline-flex h-9 items-center justify-center rounded-lg border bg-muted/60 px-3 text-xs font-medium text-foreground transition-all duration-[var(--motion-standard)] ease-[var(--motion-ease)] hover:-translate-y-0.5 hover:bg-muted hover:border-foreground/25 active:translate-y-0 active:scale-[0.98]"
                aria-label="Buy a $3 Coffee on GitHub Sponsors"
              >
                ☕ $3 Coffee
              </a>
              <a
                href={SUPPORT_CONFIG.githubRepoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring inline-flex h-9 items-center justify-center rounded-lg border border-success/40 bg-success/15 px-3 text-xs font-semibold text-success transition-all duration-[var(--motion-standard)] ease-[var(--motion-ease)] hover:-translate-y-0.5 hover:bg-success/25 hover:border-success/60 active:translate-y-0 active:scale-[0.98]"
                aria-label="Star on GitHub"
              >
                ⭐ Star on GitHub
              </a>
              <a
                href="/support"
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring inline-flex h-9 items-center justify-center rounded-lg border bg-foreground px-3 text-xs font-medium text-background transition-all duration-[var(--motion-standard)] ease-[var(--motion-ease)] hover:-translate-y-0.5 hover:opacity-90 active:translate-y-0 active:scale-[0.98]"
                aria-label="View all Backer Tiers"
              >
                🚀 Backer Tiers
              </a>
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
            className="min-h-10 text-xs bg-success hover:bg-success text-white font-semibold"
          >
            <HeartHandshake aria-hidden="true" className="mr-1.5 size-4" />
            Support options
          </Button>
        </div>
      </div>
    </dialog>
  );
}
