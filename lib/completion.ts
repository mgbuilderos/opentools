/* oxlint-disable */
import { currentEgressReading, formatEgressBytes } from './egress-meter';
import { USAGE_COUNT_KEY, parseUsageCount } from './milestone';
import { recordCompletionSignal } from './product-telemetry';
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

/**
 * The file this job produced, so that the receipt can offer the next operation
 * on it rather than ending in a download and a dead end.
 *
 * It is the bytes themselves and not a URL, because an object URL created by a
 * tool dies with that page and the whole point is to survive the navigation.
 * The bytes go no further than this browser: the receipt hands them to
 * `lib/file-handoff.ts`, which is the same on-device store the dropzone uses,
 * and `app/privacy/page.tsx` already discloses it by name.
 *
 * The shape matches `GeneratedFile` in `lib/tools/file-workbench.ts` on purpose,
 * so a tool passes what it already has rather than building something for this.
 *
 * Optional, and absent for most tools: `announceCompletion` has 66 callers, two
 * of which pass this today. Where it is absent the receipt renders exactly as
 * it did before, with no next-operation section — the one thing that must never
 * happen is an offer a tool cannot honour.
 */
export interface CompletionOutput {
  name: string;
  type: string;
  bytes: Uint8Array;
}

/**
 * Above this, a finished job announces no output and the receipt offers no next
 * operation.
 *
 * This is a policy choice, not a measurement, and the reasoning is copies: the
 * tool already holds the result once for the download, announcing it holds it
 * again for as long as the card is open, and handing it over holds a third
 * while the transaction commits. Three copies of a very large file on a budget
 * Android phone is where the tab is killed, and losing the tab would cost the
 * person the result they had already earned — a far worse outcome than not
 * being offered a follow-up tool. Devices are read by
 * `detectDeviceMemory()` in `lib/kernel/capability.ts`; this ceiling is the
 * blunt guard that applies before any of that is consulted.
 */
export const CHAINABLE_OUTPUT_MAX_BYTES = 64 * 1024 * 1024;

export interface CompletionDetail {
  operation: string;
  durationMs: number;
  summary?: string;
  metrics?: CompletionMetric[];
  recipe?: CompletionRecipe;
  output?: CompletionOutput;
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
 * Reduce an announced output to something that can safely become a `File`.
 *
 * The name is the only field here that leaves this browser's own memory in any
 * sense: it is written into the handoff store and then into a file input, so it
 * is taken down to a basename. A tool that reports `../invoice.pdf` — or a
 * source path picked up from an archive entry — should not get to choose a
 * name with separators in it, and `boundedDisplayText` strips the control
 * characters that would make it unreadable.
 *
 * Zero bytes resolves to `undefined` rather than to an empty offer. A job that
 * produced nothing has no next operation, and the receipt renders no section at
 * all, which is the state every tool that never passes an output is in.
 */
function normaliseOutput(
  output: CompletionOutput | undefined,
): CompletionOutput | undefined {
  if (!output) return undefined;
  if (!(output.bytes instanceof Uint8Array) || output.bytes.byteLength === 0) {
    return undefined;
  }
  if (output.bytes.byteLength > CHAINABLE_OUTPUT_MAX_BYTES) return undefined;
  const name = boundedDisplayText(output.name.split(/[\\/]/u).pop() ?? '', 120);
  if (!name) return undefined;
  return {
    name,
    type: boundedDisplayText(output.type, 120),
    bytes: output.bytes,
  };
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
 *
 * THE LABEL SAYS "FILE BYTES" SINCE 2026-09-28, AND THAT IS A CORRECTION
 * RATHER THAN A FLOURISH. `lib/egress-meter.ts` counts requests whose
 * `initiatorType` is `fetch`, `xmlhttprequest` or `beacon` — the three that can
 * carry a file body — and an image is none of them. So the reading was never a
 * count of *every* byte this page sent, and from the moment a product signal
 * could be requested (ADR-020) an unqualified "Sent from this page: 0 bytes"
 * would have been a true measurement under a false name. What it measures is
 * exactly what the label now says.
 *
 * The signal itself is disclosed permanently on `/privacy`, with a switch, and
 * deliberately not in a per-job banner here: a one-line alarm beside somebody's
 * finished work, about a counter that carries nothing, would be frightening out
 * of all proportion to what it is.
 */
function measuredEgressMetric(): CompletionMetric | null {
  const reading = currentEgressReading();
  if (!reading.measurable) return null;
  return {
    // 30 characters. `boundedDisplayText` truncates at 32.
    label: 'File bytes sent from this page',
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

  /*
   * The one product signal a finished job produces, and the only place on this
   * site that a completion is counted at all.
   *
   * AFTER the dispatch below would be wrong for a different reason and BEFORE
   * it is wrong for this one: the receipt must open whatever happens here. So
   * it is before, inside its own `try`, and `recordCompletionSignal` swallows
   * every failure of its own as well. A counter that could make a finished job
   * look unfinished would be worse than no counter.
   *
   * NOTHING FROM `detail` IS PASSED, and the function takes no argument that
   * could carry it. The operation name, the duration, the summary and the
   * metrics are all facts about somebody's file. What is sent is one of two
   * fixed paths — `completed-web` or `completed-pwa` — chosen locally from the
   * display mode, at most once per document. See `lib/product-telemetry.ts`.
   */
  try {
    recordCompletionSignal();
  } catch {
    /* Unreachable by construction; here so that it stays unreachable. */
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
        output: normaliseOutput(detail.output),
      },
    }),
  );
}
