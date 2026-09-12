'use client';

import { Check, Clock3, HeartHandshake, LockKeyhole, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  COMPLETION_EVENT,
  formatCompletionDuration,
  type CompletionDetail,
} from '@/lib/completion';
import {
  mayOfferSupport,
  supportPreference,
  SUPPORT_PREFERENCE_KEY,
} from '@/lib/support-preference';

/** A non-modal receipt after download intent; the original click is never cancelled. */
export function CompletionValueDialog() {
  const latest = useRef<CompletionDetail | null>(null);
  const offeredThisPage = useRef(false);
  const trigger = useRef<HTMLElement | null>(null);
  const panel = useRef<HTMLDialogElement>(null);
  const [receipt, setReceipt] = useState<CompletionDetail | null>(null);

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
      // The existing anchor/button download runs first, without interception or replay.
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
          <span className="grid size-10 place-items-center rounded-full border">
            <Check aria-hidden="true" className="size-5" />
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
          id="completion-title"
          className="mt-4 text-xl font-semibold tracking-[-0.03em]"
        >
          A little work, already done.
        </h2>
        <p
          id="completion-description"
          className="mt-2 text-sm leading-6 text-muted-foreground"
        >
          {receipt.summary ?? `${receipt.operation} is complete.`}
        </p>
        <dl className="my-5 grid grid-cols-2 gap-4 border-y py-4">
          <div>
            <dt className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock3 aria-hidden="true" className="size-4" />
              Processing time
            </dt>
            <dd className="tabular mt-2 text-lg font-semibold">
              {formatCompletionDuration(receipt.durationMs)}
            </dd>
          </div>
          <div>
            <dt className="flex items-center gap-2 text-sm text-muted-foreground">
              <LockKeyhole aria-hidden="true" className="size-4" />
              Processed in
            </dt>
            <dd className="mt-2 text-lg font-semibold">This browser</dd>
          </div>
        </dl>
        <p className="text-sm leading-6 text-muted-foreground">
          Your download is free. Optional support helps maintain these tools and
          fund testing and accessibility improvements.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button onClick={() => dismiss()} className="min-h-11">
            Not now
          </Button>
          <Button
            nativeButton={false}
            render={
              <a
                href="/support"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Support options (opens in a new tab)"
              />
            }
            variant="outline"
            className="min-h-11"
          >
            <HeartHandshake aria-hidden="true" />
            Support options
          </Button>
        </div>
        <button
          type="button"
          onClick={() => dismiss(true)}
          className="focus-ring mt-2 min-h-11 w-full rounded-lg text-sm text-muted-foreground hover:text-foreground"
        >
          Don’t ask again
        </button>
      </div>
    </dialog>
  );
}
