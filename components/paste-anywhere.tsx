'use client';

import { X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  detectInput,
  type DetectedAction,
  type DetectionResult,
} from '@/components/smart-dropzone';
import { Button } from '@/components/ui/button';
import { offerFile } from '@/lib/file-handoff';

/**
 * Paste, anywhere on the site, and land on the tool for what you pasted.
 *
 * WHY THIS IS NOT JUST THE DROPZONE. The same detection already existed, but
 * only inside `components/smart-dropzone.tsx` — so it worked on the home page,
 * in one box, if you found the box. Everywhere else ⌘V did nothing at all.
 * That is a navigation problem disguised as a feature: the person already
 * knows what they have, and making them find a page, then a control, then a
 * file picker is three steps for information they carried in with them.
 *
 * WHAT IT WILL NOT DO. It does not touch a paste that belongs to something
 * else. If focus is in a text box, a textarea or anything editable, the paste
 * is that control's — hijacking it would break every tool on the site that
 * takes pasted input, which is most of them. It also ignores a paste that
 * detects as nothing, rather than guessing.
 *
 * The file travels the same way a dropped one does (`lib/file-handoff.ts`);
 * nothing about a paste reaches the network, and the clipboard is read only
 * for the event that carried it.
 */

/** True when the paste belongs to a control the person is typing in. */
function pasteBelongsToField(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

function primaryOf(actions: readonly DetectedAction[]) {
  return actions.find((action) => action.isPrimary) ?? actions[0];
}

export function PasteAnywhere() {
  const [result, setResult] = useState<DetectionResult | null>(null);
  const pasted = useRef<File | null>(null);

  const dismiss = useCallback(() => {
    setResult(null);
    pasted.current = null;
  }, []);

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (pasteBelongsToField(event.target)) return;
      const data = event.clipboardData;
      if (!data) return;

      const file = Array.from(data.files)[0] ?? null;
      const text = file ? '' : data.getData('text');
      if (!file && !text.trim()) return;

      const detection = detectInput(text, file ?? undefined);
      if (!detection || detection.actions.length === 0) return;

      pasted.current = file;
      setResult(detection);
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, []);

  const go = useCallback(async (href: string) => {
    // The file has to be somewhere the next page can reach, because every
    // link here is a full document load. If that fails we still navigate and
    // the tool opens empty, which is no worse than before.
    if (pasted.current) await offerFile(pasted.current);
    window.location.href = href;
  }, []);

  useEffect(() => {
    if (!result) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [result, dismiss]);

  if (!result) return null;
  const primary = primaryOf(result.actions);
  if (!primary) return null;

  return (
    // Not a <dialog>: this interrupts nothing and takes no focus. The page
    // underneath stays usable, which is the point of routing a paste rather
    // than blocking on one.
    <section
      aria-label="Pasted content detected"
      className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-2xl p-4"
    >
      <div className="rounded-xl border bg-card p-4 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Pasted · {result.typeLabel}
            </p>
            <p className="mt-1 truncate text-sm font-semibold">
              {result.summary}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={dismiss}
            aria-label="Dismiss pasted content"
          >
            <X aria-hidden="true" />
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={() => void go(primary.href)}>{primary.label}</Button>
          {result.actions
            .filter((action) => action !== primary)
            .slice(0, 3)
            .map((action) => (
              <Button
                key={action.href}
                variant="outline"
                onClick={() => void go(action.href)}
              >
                {action.label}
              </Button>
            ))}
        </div>
      </div>
    </section>
  );
}
