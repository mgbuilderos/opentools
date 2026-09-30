/* oxlint-disable */
import { currentEgressReading, formatEgressBytes } from './egress-meter';
import { USAGE_COUNT_KEY, parseUsageCount } from './milestone';
import {
  findRecipe,
  sanitiseRecipeValues,
  type RecipeValues,
} from './tools/recipe-link';

export const COMPLETION_EVENT = 'tools:completion';

export interface CompletionMetric {
  label: string;
  value: string;
}

/**
 * The settings the finished job ran with, so the receipt can offer to share
 * them the moment the result appears.
 *
 * This is an id and values rather than a definition object because the event
 * crosses a boundary: the tool dispatches, and a single dialog mounted once in
 * the shell receives. Sending an id keeps the definition the one declared in
 * `lib/tools/recipe-link.ts` — the receiver looks it up rather than trusting
 * a shape handed to it, so a tool cannot widen what its own recipe may carry.
 */
export interface CompletionRecipe {
  /** The `id` of a recipe declared in `lib/tools/recipe-link.ts`. */
  id: string;
  values: RecipeValues;
}

export interface CompletionDetail {
  operation: string;
  durationMs: number;
  summary?: string;
  metrics?: CompletionMetric[];
  recipe?: CompletionRecipe;
}

function boundedDisplayText(value: string, maximum: number) {
  return Array.from(value, (character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint < 32 || codePoint === 127 ? ' ' : character;
  })
    .join('')
    .replace(/\s+/gu, ' ')
    .trim()
    .slice(0, maximum);
}

export function formatCompletionDuration(durationMs: number) {
  const safe = Number.isFinite(durationMs) ? Math.max(0, durationMs) : 0;
  return safe < 1000
    ? `${safe.toFixed(safe < 10 ? 1 : 0)} ms`
    : `${(safe / 1000).toFixed(2)} s`;
}

/**
 * Reduce an announced recipe to what its own definition allows.
 *
 * Every other field on this event is display text, bounded and stripped above
 * because it is shown to one person. A recipe is different in kind: it becomes
 * a URL that gets pasted into a group chat. So it is not bounded, it is
 * *filtered by the definition* — see `sanitiseRecipeValues`. An unknown id and
 * a recipe left with no valid values both resolve to `undefined`, which the
 * dialog renders as no share button at all rather than a link to nowhere.
 */
function normaliseRecipe(
  recipe: CompletionRecipe | undefined,
): CompletionRecipe | undefined {
  if (!recipe) return undefined;
  const definition = findRecipe(recipe.id);
  if (!definition) return undefined;
  const values = sanitiseRecipeValues(definition, recipe.values);
  return Object.keys(values).length ? { id: definition.id, values } : undefined;
}

/**
 * The second of the two numbers every finished job carries.
 *
 * A person feels speed, and this product's speed is a free consequence of not
 * uploading: a 50 MB file on a slow connection is a minute of waiting before a
 * hosted tool even begins, and nothing here waits at all. The duration was
 * already on the receipt. What was missing beside it was the reason, and the
 * two numbers together need no adjectives.
 *
 * It is *measured*, not written — see `lib/egress-meter.ts`. The label and the
 * value stay separate strings so that this file never spells out the settled
 * claim that `lib/tools/local-source-policy.test.ts` forbids while the release
 * egress proof is outstanding.
 */
function measuredEgressMetric(): CompletionMetric | null {
  const reading = currentEgressReading();
  if (!reading.measurable) return null;
  return {
    label: 'Sent from this page',
    value: formatEgressBytes(reading.bytes),
  };
}

export function announceCompletion(detail: CompletionDetail) {
  if (typeof window === 'undefined') return;
  const measured = measuredEgressMetric();
  const metrics = [...(detail.metrics ?? []), ...(measured ? [measured] : [])]
    ?.slice(0, 3)
    .map((metric) => ({
      label: boundedDisplayText(metric.label, 32),
      value: boundedDisplayText(metric.value, 64),
    }))
    .filter((metric) => metric.label && metric.value);
  /*
    The counter behind the 10/50/100 milestone card.

    It is written here, at the one moment that is unambiguously "a task
    finished", and read once per page load by `MilestoneModal`. It is *not*
    read by `mayOfferSupport`, which is the support gate — so from the gate's
    side it looks like a counter implementing a rule nobody applies, and it was
    nearly deleted as one. The reader is `components/milestone-modal.tsx`,
    mounted by `components/app-shell.tsx`, and `app/privacy/page.tsx` discloses
    this key to visitors by name. Deleting it would silently retire the
    milestone and leave the privacy page describing storage the site no longer
    writes.

    The key is imported rather than spelled again here. Two copies of one
    storage key is exactly how the read path became invisible from the write
    site; `completion.test.ts` now holds the two ends together.

    `parseUsageCount` is the reader's own parser, used here so that a value the
    reader would treat as 0 cannot be incremented by the writer into `NaN` and
    stored — which the previous `parseInt` did, permanently freezing the count
    for that visitor.

    What was removed with it: a second window event dispatched beside this
    write, named for a tool having run. Nothing has listened to it since
    2026-09-19, when the milestone was deliberately moved off the completion
    event because deciding there put a full-screen modal over the page in the
    same tick the receipt needed — see the header of `lib/milestone.ts`. The
    listener went; the dispatch stayed. A public event with no subscriber is an
    invitation to reintroduce exactly that bug, so it is gone, and
    `completion.test.ts` keeps it gone. That test reads this file as raw text,
    comments included, which is why the event is described here rather than
    named.
  */
  try {
    const count = parseUsageCount(localStorage.getItem(USAGE_COUNT_KEY)) + 1;
    localStorage.setItem(USAGE_COUNT_KEY, count.toString());
  } catch {
    /* Storage can be blocked entirely. The receipt does not depend on the
       count, and a milestone missed is not worth failing a finished job. */
  }

  window.dispatchEvent(
    new CustomEvent<CompletionDetail>(COMPLETION_EVENT, {
      detail: {
        operation: boundedDisplayText(detail.operation, 80) || 'Tool',
        durationMs: Number.isFinite(detail.durationMs)
          ? Math.max(0, detail.durationMs)
          : 0,
        summary: detail.summary
          ? boundedDisplayText(detail.summary, 180) || undefined
          : undefined,
        metrics: metrics?.length ? metrics : undefined,
        recipe: normaliseRecipe(detail.recipe),
      },
    }),
  );
}
