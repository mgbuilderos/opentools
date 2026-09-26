import { getOperation } from '@/lib/kernel';
import type { KernelOperation, OperationParam } from '@/lib/kernel/types';
import { sanitisePipeline } from './serialise';
import type { Pipeline, PipelineStep } from './types';
import type { PipelineOperationResolver } from './validate';

/**
 * Pipeline recipe links — a URL that carries the STEPS and never the file.
 *
 * WHY THIS EXISTS, AND WHY IT IS NOT `lib/tools/recipe-link.ts`. That module
 * shares one tool's settings, and its privacy guarantee comes from a fixed list
 * of declared fields per tool. A pipeline has no fixed field list: it is N
 * steps chosen from the whole kernel, each with its own settings. The bench
 * previously borrowed that module by inventing a one-field definition whose
 * single permitted "choice" was the pipeline JSON itself — which type-checks,
 * and defeats the entire mechanism, because the value being vetted was the
 * value supplying the vetting list. It also put a pretty-printed JSON document
 * through `encodeURIComponent`: a six-step pipeline ran past 1,800 characters
 * of URL, most of it escaped braces and indentation.
 *
 * So the guarantee is rebuilt here for the shape a pipeline actually has.
 *
 * WHAT MAY REACH A URL. Operation ids, operation sources, and the values of
 * parameters whose descriptor declares `serialisable: true`. That is the task.
 *
 * WHAT MAY NOT, AND HOW IT IS STOPPED.
 *  - File names and file content: never in a pipeline in the first place.
 *  - Any parameter a descriptor marks non-serialisable: `sanitisePipeline`
 *    strips it before encoding, and the encoder then iterates the *descriptor's*
 *    declared params rather than the step's own keys — the same asymmetry
 *    `lib/tools/recipe-link.ts` relies on. Two independent locks, so a
 *    refactor of either one alone cannot open the door.
 *  - THE PIPELINE NAME. This is the addition. A name is free text the sender
 *    typed, and people name pipelines after the thing they are working on:
 *    "Novak contract redaction", "mum's passport scans". The old JSON link
 *    carried it verbatim. Nothing here writes it, and the recipient gets a name
 *    derived from the steps instead.
 *
 * WHAT IS LEFT OUT, DELIBERATELY. A setting still on its default is not
 * written, and is restored from the descriptor on arrival. That keeps a link
 * to the settings someone actually chose, which is what makes it readable at a
 * glance. The cost is real and accepted: if a default ever changes, an older
 * link adopts the new one rather than preserving the old. Changing a default
 * already changes what the tool does for everyone who never touched it, so a
 * recipe following it is the consistent behaviour rather than a surprise.
 *
 * WHY IT IS SPELLED OUT RATHER THAN PACKED. `?s1=document.pdf-split&s1.pages=1-3`
 * rather than a base64 blob. A recipient is meant to read a link before
 * trusting it, which is also why this ships no compression: `pako` is a new
 * dependency, ADR-004 wants a licence review first, and Pillar 3 of the
 * corrected playbook rules it out by name. Every id and source in the kernel
 * matches `[A-Za-z0-9-]+`, so nothing here needs escaping to stay readable.
 */

/** Steps beyond this are refused on read: a link, not a program. */
export const MAX_RECIPE_STEPS = 24;

/**
 * Past roughly this many characters a URL stops surviving the places people
 * paste links. The builder reports it; the editor offers JSON export instead.
 */
export const RECIPE_SEARCH_BUDGET = 1_800;

const STEP_KEY = /^s([1-9][0-9]*)(?:\.(.+))?$/u;
const PARAM_NAME = /^[A-Za-z][A-Za-z0-9_.-]*$/u;
const LEGACY_PARAM = 'pipeline';

function stepKey(index: number): string {
  return `s${index + 1}`;
}

/** A setting this operation holds that a link is not allowed to carry. */
export interface UnshareableParam {
  readonly step: number;
  readonly operation: string;
  readonly param: string;
  readonly label: string;
}

/**
 * The settings the recipient must set by hand, read from the descriptors both
 * sides share. Deliberately NOT carried in the URL: the recipient resolves the
 * same operations and can compute this themselves, so sending it would be
 * bytes spent on something already known.
 */
export function unshareableParams(
  pipeline: Pipeline,
  resolveOperation: PipelineOperationResolver = getOperation,
): readonly UnshareableParam[] {
  return pipeline.steps.flatMap((step, index) => {
    const operation = resolveOperation(step.op, step.source);
    if (!operation) return [];
    return operation.params
      .filter((param) => !param.serialisable)
      .map((param) => ({
        step: index + 1,
        operation: operation.name,
        param: param.id,
        label: param.label,
      }));
  });
}

function serialisableParams(
  operation: KernelOperation,
): readonly OperationParam[] {
  return operation.params.filter((param) => param.serialisable);
}

function encodeStep(
  params: URLSearchParams,
  step: PipelineStep,
  index: number,
  operation: KernelOperation,
): void {
  const key = stepKey(index);
  params.set(key, `${operation.source}.${operation.id}`);
  // Iterating the descriptor, never `step.params`: an undeclared key cannot be
  // read here, so it cannot be written, whatever a caller hands over.
  for (const param of serialisableParams(operation)) {
    const value = step.params[param.id];
    if (typeof value !== 'string') continue;
    if (value === param.defaultValue) continue;
    if (!PARAM_NAME.test(param.id)) continue;
    params.set(`${key}.${param.id}`, value);
  }
}

export interface BuiltRecipe {
  /** Query string with no leading `?`. */
  readonly search: string;
  /** True when the link is long enough to be worth warning about. */
  readonly oversize: boolean;
}

/**
 * Encode a pipeline as a query string. Throws on an invalid pipeline, matching
 * `serialisePipeline`: refusing to share a broken recipe beats sharing one.
 */
export function buildRecipeSearch(
  pipeline: Pipeline,
  resolveOperation: PipelineOperationResolver = getOperation,
): BuiltRecipe {
  const safe = sanitisePipeline(pipeline, resolveOperation);
  if (safe.steps.length > MAX_RECIPE_STEPS)
    throw new Error(
      `A recipe link carries at most ${MAX_RECIPE_STEPS} steps; this pipeline has ${safe.steps.length}. Export it as JSON instead.`,
    );

  const params = new URLSearchParams();
  safe.steps.forEach((step, index) => {
    const operation = resolveOperation(step.op, step.source);
    if (!operation) return;
    encodeStep(params, step, index, operation);
  });

  const search = params.toString();
  return { search, oversize: search.length > RECIPE_SEARCH_BUDGET };
}

export function buildRecipeUrl(
  origin: string,
  path: string,
  pipeline: Pipeline,
  resolveOperation: PipelineOperationResolver = getOperation,
): string {
  const { search } = buildRecipeSearch(pipeline, resolveOperation);
  return `${origin}${path}?${search}`;
}

/** A name for a recipe that arrived without one, built from its own steps. */
export function deriveRecipeName(
  pipeline: Pipeline,
  resolveOperation: PipelineOperationResolver = getOperation,
): string {
  const names = pipeline.steps.map((step) => {
    const operation = resolveOperation(step.op, step.source);
    return operation?.name ?? step.op;
  });
  if (!names.length) return 'Shared pipeline';
  const shown = names.slice(0, 3).join(' → ');
  return names.length > 3 ? `${shown} +${names.length - 3}` : shown;
}

export type RecipeReadResult =
  | { readonly kind: 'none' }
  | {
      readonly kind: 'recipe';
      readonly pipeline: Pipeline;
      readonly unshareable: readonly UnshareableParam[];
    }
  | { readonly kind: 'invalid'; readonly reason: string };

interface RawStep {
  key: string;
  params: Map<string, string>;
}

function collectRawSteps(params: URLSearchParams): Map<number, RawStep> {
  const steps = new Map<number, RawStep>();
  for (const [key, value] of params) {
    const match = STEP_KEY.exec(key);
    if (!match) continue;
    const index = Number(match[1]);
    if (!Number.isSafeInteger(index) || index < 1) continue;
    const existing = steps.get(index) ?? { key: '', params: new Map() };
    const paramName = match[2];
    if (paramName === undefined) existing.key = value;
    else if (PARAM_NAME.test(paramName)) existing.params.set(paramName, value);
    steps.set(index, existing);
  }
  return steps;
}

/**
 * Read a recipe out of a query string.
 *
 * Unlike a single tool's settings, a pipeline step cannot be quietly dropped:
 * silently running four of someone's five steps produces a wrong result that
 * looks right. Anything unreadable therefore refuses the whole link and says
 * why, so the editor can show that instead of a half-built chain.
 */
export function readRecipe(
  search: string,
  resolveOperation: PipelineOperationResolver = getOperation,
): RecipeReadResult {
  const params = new URLSearchParams(search);
  const raw = collectRawSteps(params);
  if (!raw.size) return legacyRead(params, resolveOperation);

  if (raw.size > MAX_RECIPE_STEPS)
    return {
      kind: 'invalid',
      reason: `This link has ${raw.size} steps; a recipe link carries at most ${MAX_RECIPE_STEPS}.`,
    };

  const steps: PipelineStep[] = [];
  for (let index = 1; index <= raw.size; index += 1) {
    const entry = raw.get(index);
    if (!entry)
      return {
        kind: 'invalid',
        reason: `This link is missing step ${index}, so its steps cannot be put in order.`,
      };
    const separator = entry.key.indexOf('.');
    if (separator < 1)
      return {
        kind: 'invalid',
        reason: `Step ${index} does not name an operation and its source.`,
      };
    const source = entry.key.slice(0, separator);
    const op = entry.key.slice(separator + 1);
    const operation = resolveOperation(op, source);
    if (!operation)
      return {
        kind: 'invalid',
        reason: `Step ${index} asks for ${op} from ${source}, which this version does not have.`,
      };

    // Defaults first, so a recipe that omits an unchanged setting still yields
    // a complete, runnable step rather than one missing half its params.
    const values: Record<string, string> = Object.fromEntries(
      operation.params.map((param) => [param.id, param.defaultValue]),
    );
    for (const param of serialisableParams(operation)) {
      const supplied = entry.params.get(param.id);
      if (supplied !== undefined) values[param.id] = supplied;
    }
    steps.push({ op: operation.id, source: operation.source, params: values });
  }

  const draft: Pipeline = { version: 1, name: 'Shared pipeline', steps };
  try {
    const pipeline = sanitisePipeline(
      { ...draft, name: deriveRecipeName(draft, resolveOperation) },
      resolveOperation,
    );
    return {
      kind: 'recipe',
      pipeline,
      unshareable: unshareableParams(pipeline, resolveOperation),
    };
  } catch (cause) {
    return {
      kind: 'invalid',
      reason:
        cause instanceof Error ? cause.message : 'This link is not a recipe.',
    };
  }
}

/**
 * The shape this module replaces: the whole pipeline JSON in one param. Links
 * already shared stay openable; nothing writes this form any more, and the
 * name such a link carries is discarded rather than trusted.
 */
function legacyRead(
  params: URLSearchParams,
  resolveOperation: PipelineOperationResolver,
): RecipeReadResult {
  const raw = params.get(LEGACY_PARAM);
  if (!raw) return { kind: 'none' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { kind: 'invalid', reason: 'This pipeline link is not readable.' };
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
    return { kind: 'invalid', reason: 'This pipeline link is not readable.' };
  const steps = (parsed as { steps?: unknown }).steps;
  if (!Array.isArray(steps) || !steps.length)
    return { kind: 'invalid', reason: 'This pipeline link has no steps.' };

  const rebuilt = new URLSearchParams();
  steps.forEach((step, index) => {
    if (typeof step !== 'object' || step === null) return;
    const { op, source, params: stepParams } = step as Record<string, unknown>;
    if (typeof op !== 'string' || typeof source !== 'string') return;
    rebuilt.set(stepKey(index), `${source}.${op}`);
    if (typeof stepParams !== 'object' || stepParams === null) return;
    for (const [name, value] of Object.entries(stepParams)) {
      if (typeof value === 'string' && PARAM_NAME.test(name))
        rebuilt.set(`${stepKey(index)}.${name}`, value);
    }
  });
  if (!rebuilt.has('s1'))
    return { kind: 'invalid', reason: 'This pipeline link has no steps.' };
  return readRecipe(rebuilt.toString(), resolveOperation);
}

/** Every query key a recipe owns, so the editor can clear just those. */
export function recipeParamNames(search: string): readonly string[] {
  const params = new URLSearchParams(search);
  const names = [...params.keys()].filter((key) => STEP_KEY.test(key));
  return params.has(LEGACY_PARAM) ? [...names, LEGACY_PARAM] : names;
}
