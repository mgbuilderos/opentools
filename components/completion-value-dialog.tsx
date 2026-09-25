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
import { RecipeShareButton } from '@/components/recipe-link-bar';
import { Button } from '@/components/ui/button';
import {
  COMPLETION_EVENT,
  formatCompletionDuration,
  type CompletionDetail,
} from '@/lib/completion';
import { loadsLocalModel } from '@/lib/security/content-security-policy';
import { findRecipe } from '@/lib/tools/recipe-link';
import {
  isLikelyIndiaVisitor,
  getBuyMeACoffeeUrl,
  getUpiPaymentUrl,
  BUYMEACOFFEE_UNIT_USD,
  SUPPORT_CONFIG,
} from '@/lib/support-config';
import { drawProofCard } from '@/lib/proof-card';
import {
  mayOfferSupport,
  supportPreference,
  SUPPORT_PREFERENCE_KEY,
} from '@/lib/support-preference';

/**
 * What the tool just did, in words a sceptic can check.
 *
 * These lines used to promise things no build can prove. "Zero data leaks" is
 * a security guarantee, not an egress measurement — nobody can promise the
 * absence of every vulnerability. "Saved you paid software subscriptions" is a
 * claim about someone else's finances. Business rule 23 permits a measured
 * egress claim only for a build that passed the egress proof protocol, and
 * `ai/KNOWN_ISSUES.md` recorded that protocol as not empirically complete,
 * while these shipped anyway.
 *
 * `e2e/egress-proof.spec.ts` is now that protocol, and it runs on every
 * release in both engines. What it establishes is narrower and far stronger
 * than what was here before: the page is served `connect-src 'none'`, five
 * deliberate exfiltration attempts are refused by policy, and a real file
 * through a real tool produces no off-origin response and zero off-origin
 * bytes. These lines say that and nothing beyond it.
 */
function getReliefHeadline(operation?: string): string {
  if (!operation) return 'Handled in this tab, on your device.';
  const op = operation.toLowerCase();
  if (
    op.includes('secret') ||
    op.includes('scrub') ||
    op.includes('har') ||
    op.includes('pii') ||
    op.includes('sanitize') ||
    op.includes('mask')
  ) {
    return 'Scrubbed in this tab — nothing was sent anywhere to do it.';
  }
  if (
    op.includes('compress') ||
    op.includes('size') ||
    op.includes('optimize')
  ) {
    return 'Compressed in this tab, ready for that upload portal.';
  }
  if (
    op.includes('pdf') ||
    op.includes('extract') ||
    op.includes('merge') ||
    op.includes('split')
  ) {
    return 'Handled in this tab. Your document never left the browser.';
  }
  if (op.includes('ocr') || op.includes('audio') || op.includes('speech')) {
    return 'The model ran here on your device, not in a cloud.';
  }
  return 'Handled in this tab, on your device.';
}

/** A non-modal receipt after download/copy intent; the original action is never blocked or delayed. */
export function CompletionValueDialog() {
  const latest = useRef<CompletionDetail | null>(null);
  const offeredThisPage = useRef(false);
  const trigger = useRef<HTMLElement | null>(null);
  const panel = useRef<HTMLDialogElement>(null);
  const delayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [receipt, setReceipt] = useState<CompletionDetail | null>(null);
  const [proofUrl, setProofUrl] = useState<string>('');
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
    let url = '';
    let cancelled = false;
    drawProofCard({
      operation: receipt.operation,
      durationText: formatCompletionDuration(receipt.durationMs),
      facts: receipt.metrics ?? [],
    })
      .then((blob) => {
        // No blob means the browser could not draw it; the action is simply
        // not offered rather than failing in front of someone.
        if (!blob || cancelled) return;
        url = URL.createObjectURL(blob);
        setProofUrl(url);
      })
      .catch(() => {
        /* Drawing a share card must never disturb the task that just finished. */
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
      // Cleared here rather than at the top of the effect: a synchronous
      // setState in an effect body cascades renders, which the React compiler
      // lint correctly refuses.
      setProofUrl('');
    };
  }, [receipt]);

  useEffect(() => {
    if (!receipt) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [receipt]);

  if (!receipt) return null;

  /*
    The policy THIS page is served, not the one most pages are served.

    Four tool pages -- the image editor, the background remover and the two
    HEIC converters -- are served `connect-src 'self'` so the decoder or the
    U²-Net model can be fetched from this origin; everything else is
    `connect-src 'none'`. This dialog is rendered by `app-shell.tsx` on every
    tool page, so until now it told someone finishing a HEIC conversion that
    their page was `'none'` when the header said `'self'`. A privacy claim that
    names a mechanism has to name the right one, or the next person to check it
    finds the site overstating and stops believing the rest.

    Read from `loadsLocalModel`, which is the same function `proxy.ts` uses to
    decide the header, so the sentence and the header cannot disagree.
    `completion-value-dialog.test.tsx` holds that pairing.
  */
  const sealed = !loadsLocalModel(window.location.pathname);

  // Resolved from the id, never from a definition handed over in the event —
  // see `CompletionRecipe`. An unrecognised id simply renders no share.
  const shareRecipe = receipt.recipe ? findRecipe(receipt.recipe.id) : null;

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

        {/*
          The mechanism, named, because it is checkable in a way an adjective
          is not: the browser itself refuses to let the page open a connection.
          Which policy it is depends on the page -- see `sealed` above.
          Verified per release by `e2e/egress-proof.spec.ts` in Chromium and
          WebKit.
        */}
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {sealed ? (
            <>
              Your browser blocks this page from uploading anything —{' '}
              <code className="font-mono text-[11px]">
                connect-src &apos;none&apos;
              </code>
              .
            </>
          ) : (
            <>
              Your file stays here. This page may only fetch its decoder from
              getopentools.com, and nothing else —{' '}
              <code className="font-mono text-[11px]">
                connect-src &apos;self&apos;
              </code>
              .
            </>
          )}
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

        {/*
          THE SHARE, AND WHY IT IS HERE AND NOWHERE ELSE.

          This is the growth mechanic, so its placement is the whole design.
          The share sits in the receipt because this is the one second in the
          entire session when the person has just felt the relief — the job is
          done, the file is saving, and the thought "X should have this" is
          available. A share button in a footer, on an about page or behind a
          menu is read by nobody in that state, which is the same as not
          shipping one.

          It is placed ABOVE the support ask deliberately. Both are asks, and
          only one of them compounds: money from this person ends with this
          person, while a setup link that lands on a working tool can produce
          the next relief moment, and the one after that. When only one ask
          gets read, it should be the one that can come back.

          WHAT IS SHARED. The settings, resolved from the recipe definition —
          never the file, never its name, never anything typed in. That is held
          by construction in `lib/tools/recipe-link.ts` and filtered again at
          this boundary by `normaliseRecipe`, because the settings crossed a
          component boundary to get here.
        */}
        {shareRecipe ? (
          <div className="mb-4 rounded-xl border border-success/30 bg-success/10 p-3.5">
            <p className="text-xs font-semibold leading-relaxed">
              Someone else has this same job to do.
            </p>
            <p className="mb-3 mt-1 text-xs leading-relaxed text-muted-foreground">
              Send them the tool already set up the way you just ran it — they
              bring their own {shareRecipe.subjectNoun ?? 'file'} and get the
              same result in one tap.
            </p>
            <RecipeShareButton
              definition={shareRecipe}
              values={receipt.recipe?.values ?? {}}
              label="Copy setup link"
              subjectNoun={shareRecipe.subjectNoun}
              emphasis
            />
          </div>
        ) : null}

        {/*
          The one thing this product may brand, and the only growth loop its own
          rules allow. Rule 33 keeps branding off the user's file permanently —
          that is what it beats the incumbents on — while permitting "a public
          proof card … explicit and removable". Learning 35 says what may go in
          one: the task, never the artifact. `lib/proof-card.ts` enforces that
          and drops any fact that looks like a filename rather than drawing it.

          A real anchor the person clicks, never a synthesised one. This card
          sits on top of someone's actual download, so
          `local-source-policy.test.ts` bans synthetic clicks, event
          cancellation and modal promotion in this file — nothing here may take
          an action the user did not. That scan reads raw text, comments
          included, which is why the banned calls are described rather than
          quoted.
        */}
        {proofUrl && (
          <a
            href={proofUrl}
            download="opentools-proof.png"
            className="focus-ring mb-3 inline-flex h-9 items-center justify-center gap-2 rounded-lg border bg-card px-3 text-xs font-semibold transition-all duration-[var(--motion-standard)] ease-[var(--motion-ease)] hover:-translate-y-0.5 hover:bg-muted active:translate-y-0 active:scale-[0.98]"
          >
            🖼️ Save a shareable card
          </a>
        )}

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
                href={getBuyMeACoffeeUrl(1)}
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring inline-flex h-9 items-center justify-center rounded-lg border bg-muted/60 px-3 text-xs font-medium text-foreground transition-all duration-[var(--motion-standard)] ease-[var(--motion-ease)] hover:-translate-y-0.5 hover:bg-muted hover:border-foreground/25 active:translate-y-0 active:scale-[0.98]"
                aria-label={`Buy one coffee, $${BUYMEACOFFEE_UNIT_USD}, on Buy Me a Coffee`}
              >
                ☕ ${BUYMEACOFFEE_UNIT_USD} Coffee
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
