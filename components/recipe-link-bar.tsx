'use client';

import { Check, Link2, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  buildRecipeUrl,
  type RecipeDefinition,
  type RecipeValues,
} from '@/lib/tools/recipe-link';

/**
 * The two halves of a recipe link, in the words a visitor reads.
 *
 * "Setup link" and not "recipe" — recipe is what the growth playbook calls the
 * mechanism, not what anyone would call the thing they are copying. Nothing in
 * this file touches the user's file or input; it only reads the settings the
 * page already shows. See `lib/tools/recipe-link.ts` for why that is enforced
 * where it is rather than trusted here.
 */

export function RecipeShareButton({
  definition,
  values,
  label = 'Copy setup link',
  subjectNoun = 'file',
  emphasis = false,
}: {
  definition: RecipeDefinition;
  values: RecipeValues;
  label?: string;
  /** What this tool takes in, so the reassurance names the right thing. */
  subjectNoun?: string;
  /**
   * Render as the primary action rather than a secondary one.
   *
   * Set where the share IS the point — the receipt that appears the instant a
   * job finishes. In a tool's settings column it stays an outline button,
   * because there it sits beside Clear and must not compete with Run.
   */
  emphasis?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [fallbackUrl, setFallbackUrl] = useState('');

  const copy = async () => {
    const url = buildRecipeUrl(definition, values, window.location.origin);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setFallbackUrl('');
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard access is refused in more places than people expect —
      // a non-secure context, a locked-down browser, an embedded webview.
      // Showing the link is strictly better than reporting a failure, because
      // the visitor can still select and send it by hand.
      setFallbackUrl(url);
    }
  };

  return (
    <div className={emphasis ? '' : 'mt-3'}>
      <Button
        type="button"
        variant={emphasis ? 'default' : 'outline'}
        className="h-11 w-full"
        onClick={() => void copy()}
      >
        {copied ? <Check aria-hidden="true" /> : <Link2 aria-hidden="true" />}
        {copied ? 'Setup link copied' : label}
      </Button>
      <p className="mt-2 text-xs text-muted-foreground">
        Sends these settings only. Your {subjectNoun} stays on this device and
        is never part of the link.
      </p>
      {fallbackUrl ? (
        <label className="mt-2 block text-xs font-semibold">
          Copy this link by hand — the browser blocked the clipboard
          <input
            readOnly
            value={fallbackUrl}
            onFocus={(event) => event.currentTarget.select()}
            className="focus-ring mt-2 h-11 w-full rounded-xl border bg-background px-3 text-xs"
          />
        </label>
      ) : null}
    </div>
  );
}

/**
 * Shown when the page was opened from someone else's link. The growth loops
 * document asks that the recipient "can inspect every step before running" —
 * so this states the settings in words and is placed above the controls, not
 * as a toast that disappears before it is read. Nothing runs on arrival.
 */
export function RecipeAppliedNotice({
  summary,
  subjectNoun = 'file',
}: {
  summary: string;
  subjectNoun?: string;
}) {
  if (!summary) return null;
  return (
    <output className="mb-4 flex items-start gap-3 rounded-2xl border bg-muted/55 p-4 text-sm">
      <SlidersHorizontal
        aria-hidden="true"
        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
      />
      <span>
        <span className="font-semibold">Opened with shared settings:</span>{' '}
        <span className="text-muted-foreground">{summary}</span>
        <span className="mt-1 block text-xs text-muted-foreground">
          Change anything below before you run it. Add your own {subjectNoun} —
          nothing was sent with this link.
        </span>
      </span>
    </output>
  );
}
