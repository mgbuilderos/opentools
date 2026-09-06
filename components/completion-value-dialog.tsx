'use client';

import { Check, Clock3, HeartHandshake, LockKeyhole, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  COMPLETION_EVENT,
  formatCompletionDuration,
  type CompletionDetail,
} from '@/lib/completion';

const DOWNLOAD_SELECTOR = '[data-receipt-download]';

export function CompletionValueDialog() {
  const [latestReceipt, setLatestReceipt] = useState<CompletionDetail | null>(
    null,
  );
  const [receipt, setReceipt] = useState<CompletionDetail | null>(null);
  const pendingTargetRef = useRef<HTMLElement | null>(null);
  const bypassRef = useRef(new WeakSet<HTMLElement>());
  const continueRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const receive = (event: Event) => {
      setLatestReceipt((event as CustomEvent<CompletionDetail>).detail);
    };
    window.addEventListener(COMPLETION_EVENT, receive);
    return () => window.removeEventListener(COMPLETION_EVENT, receive);
  }, []);

  useEffect(() => {
    const interceptDownload = (event: MouseEvent) => {
      if (!latestReceipt || !(event.target instanceof Element)) return;
      const candidate = event.target.closest(DOWNLOAD_SELECTOR);
      if (!(candidate instanceof HTMLElement)) return;
      if (bypassRef.current.has(candidate)) {
        bypassRef.current.delete(candidate);
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      pendingTargetRef.current = candidate;
      setReceipt(latestReceipt);
    };
    document.addEventListener('click', interceptDownload, true);
    return () => document.removeEventListener('click', interceptDownload, true);
  }, [latestReceipt]);

  useEffect(() => {
    if (!receipt) return;
    const dialog = dialogRef.current;
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    if (dialog && !dialog.open) dialog.showModal();
    const frame = requestAnimationFrame(() => continueRef.current?.focus());
    return () => {
      cancelAnimationFrame(frame);
      if (dialog?.open) dialog.close();
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    };
  }, [receipt]);

  const close = () => {
    pendingTargetRef.current = null;
    setReceipt(null);
  };

  const continueDownload = () => {
    const target = pendingTargetRef.current;
    pendingTargetRef.current = null;
    setReceipt(null);
    if (!target) return;
    bypassRef.current.add(target);
    requestAnimationFrame(() => target.click());
  };

  if (!receipt) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby="completion-title"
      aria-describedby="completion-description"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md overflow-hidden rounded-2xl border bg-card shadow-[0_28px_90px_rgb(0_0_0/35%)] backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-start justify-between gap-4 border-b p-5 sm:p-6">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-success/10 text-success">
            <Check aria-hidden="true" className="size-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-success">
              Ready to download
            </p>
            <h2
              id="completion-title"
              className="mt-1 text-xl font-semibold tracking-[-0.03em]"
            >
              {receipt.operation} complete
            </h2>
            <p
              id="completion-description"
              className="mt-1 text-sm leading-6 text-muted-foreground"
            >
              {receipt.summary ?? 'Your result is ready.'}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="-mr-2 -mt-2 shrink-0"
          onClick={close}
          aria-label="Close download summary"
        >
          <X aria-hidden="true" />
        </Button>
      </div>

      <div className="grid grid-cols-2 border-b">
        <div className="border-r p-4 sm:p-5">
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock3 aria-hidden="true" className="size-3.5" />
            Processing time
          </p>
          <p className="tabular mt-2 text-lg font-semibold">
            {formatCompletionDuration(receipt.durationMs)}
          </p>
        </div>
        <div className="p-4 sm:p-5">
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <LockKeyhole aria-hidden="true" className="size-3.5" />
            Processing location
          </p>
          <p className="mt-2 text-lg font-semibold">This browser tab</p>
        </div>
      </div>

      {receipt.metrics?.length ? (
        <dl className="grid grid-cols-3 border-b bg-muted/35">
          {receipt.metrics.map((metric) => (
            <div
              key={`${metric.label}-${metric.value}`}
              className="p-3 text-center"
            >
              <dt className="text-[11px] text-muted-foreground">
                {metric.label}
              </dt>
              <dd className="tabular mt-1 truncate text-sm font-semibold">
                {metric.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      <div className="p-5 sm:p-6">
        <div className="rounded-xl border bg-muted/45 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <LockKeyhole aria-hidden="true" className="size-4 text-success" />
            Built for local processing
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            This operation ran in this browser tab and required no account.
            Formal runtime egress certification is still pending, so this
            preview does not claim more than the verified source policy.
          </p>
        </div>

        <div className="mt-5">
          <p className="text-sm font-semibold">Keep the tools useful</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Download is free. Optional support helps fund compatibility,
            accessibility, and security work. An open-source release is planned;
            licensing and checkout are not yet approved.
          </p>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Button ref={continueRef} className="h-11" onClick={continueDownload}>
            Download free
          </Button>
          <Button
            nativeButton={false}
            render={
              <a
                href="/support"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View support options in a new tab"
              />
            }
            variant="outline"
            className="h-11"
          >
            <HeartHandshake aria-hidden="true" />
            Support the project
          </Button>
        </div>
      </div>
    </dialog>
  );
}
