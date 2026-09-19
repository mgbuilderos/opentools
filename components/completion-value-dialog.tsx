'use client';

import { Check, Clock3, HeartHandshake, LockKeyhole, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  COMPLETION_EVENT,
  formatCompletionDuration,
  type CompletionDetail,
} from '@/lib/completion';

export function CompletionValueDialog() {
  const [receipt, setReceipt] = useState<CompletionDetail | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const isOpen = receipt !== null;

  useEffect(() => {
    const receive = (event: Event) => {
      setReceipt((event as CustomEvent<CompletionDetail>).detail);
    };
    window.addEventListener(COMPLETION_EVENT, receive);
    return () => window.removeEventListener(COMPLETION_EVENT, receive);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    if (dialog && !dialog.open) dialog.showModal();
    const frame = requestAnimationFrame(() => closeRef.current?.focus());
    return () => {
      cancelAnimationFrame(frame);
      if (dialog?.open) dialog.close();
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    };
  }, [isOpen]);

  if (!receipt) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby="completion-title"
      aria-describedby="completion-description"
      onCancel={(event) => {
        event.preventDefault();
        setReceipt(null);
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
              Finished locally
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
              {receipt.summary ?? 'Your result is ready to use.'}
            </p>
          </div>
        </div>
        <Button
          ref={closeRef}
          variant="ghost"
          size="icon"
          className="-mr-2 -mt-2 shrink-0"
          onClick={() => setReceipt(null)}
          aria-label="Close completion summary"
        >
          <X aria-hidden="true" />
        </Button>
      </div>

      <div className="grid grid-cols-2 border-b">
        <div className="border-r p-4 sm:p-5">
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock3 aria-hidden="true" className="size-3.5" />
            Completed in
          </p>
          <p className="tabular mt-2 text-lg font-semibold">
            {formatCompletionDuration(receipt.durationMs)}
          </p>
        </div>
        <div className="p-4 sm:p-5">
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <LockKeyhole aria-hidden="true" className="size-3.5" />
            Processing
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
            Designed for in-tab processing
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            This operation ran in this browser tab. No account is required.
            Formal runtime egress certification is still pending.
          </p>
        </div>

        <div className="mt-5">
          <p className="text-sm font-semibold">Useful enough to keep?</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            These tools are open source and free to use. If this saved you time,
            you can optionally support testing and maintenance.
          </p>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Button
            render={
              <a href="/support" aria-label="Support the open-source project" />
            }
            className="h-11"
          >
            <HeartHandshake aria-hidden="true" />
            Support the project
          </Button>
          <Button
            variant="outline"
            className="h-11"
            onClick={() => setReceipt(null)}
          >
            Keep working
          </Button>
        </div>
      </div>
    </dialog>
  );
}
