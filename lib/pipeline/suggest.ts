import type { KernelOperation } from '@/lib/kernel/types';
import { canFollow, chainLink, type ChainLink } from './chain';
import type { Pipeline } from './types';
import type { PipelineOperationResolver } from './validate';

/**
 * Turning a catalogue into a chain.
 *
 * WHY THIS EXISTS. The bench carries well over a thousand operations. Asked to
 * pick step 4 of a pipeline from that list unaided, a person picks something
 * that cannot follow step 3 — the shapes are invisible until the validator
 * complains. Offering only the operations that *can* come next turns an
 * unusable list into a short one, and it costs nothing: the rule is already
 * written, in `chain.ts`, and the validator agrees with it by construction.
 *
 * Search stays here rather than importing the tool catalogue so the module is
 * pure and testable. Callers that want the bench's catalogue ranking pass the
 * ids it returned as `boostIds`; they are added, never used to exclude.
 */

export interface SuggestOptions {
  /** Free text matched against name, description, id and source. */
  readonly query?: string;
  /** Extra ids to admit regardless of the query, e.g. catalogue hits. */
  readonly boostIds?: ReadonlySet<string>;
  /** Cap on returned rows. The bench shows 50. */
  readonly limit?: number;
}

const DEFAULT_LIMIT = 50;

function matchesQuery(
  operation: KernelOperation,
  terms: readonly string[],
  boostIds: ReadonlySet<string> | undefined,
): boolean {
  if (!terms.length) return true;
  if (boostIds?.has(operation.id)) return true;
  const text =
    `${operation.name} ${operation.description} ${operation.id} ${operation.source}`.toLocaleLowerCase();
  return terms.every((term) => text.includes(term));
}

function terms(query: string | undefined): readonly string[] {
  return (query ?? '').toLocaleLowerCase().trim().split(/\s+/u).filter(Boolean);
}

/**
 * The operations that may legally follow `previous`.
 *
 * `previous` is undefined for step 1, where every operation is allowed: an
 * operation that takes no input generates its own, and the rest take whatever
 * the bench feeds them.
 */
export function candidateOperations(
  operations: readonly KernelOperation[],
  previous: KernelOperation | undefined,
  options: SuggestOptions = {},
): readonly KernelOperation[] {
  const queryTerms = terms(options.query);
  const limit = options.limit ?? DEFAULT_LIMIT;
  const matched: KernelOperation[] = [];
  for (const operation of operations) {
    if (previous && !canFollow(previous, operation)) continue;
    if (!matchesQuery(operation, queryTerms, options.boostIds)) continue;
    matched.push(operation);
    if (matched.length >= limit) break;
  }
  return matched;
}

/**
 * How many operations could follow, ignoring any search. Drives the "N of these
 * can come next" line, which is the cue that the list is filtered at all.
 */
export function candidateCount(
  operations: readonly KernelOperation[],
  previous: KernelOperation | undefined,
): number {
  if (!previous) return operations.length;
  let total = 0;
  for (const operation of operations)
    if (canFollow(previous, operation)) total += 1;
  return total;
}

export interface PipelineShapeStep extends ChainLink {
  readonly step: number;
  readonly name: string;
  readonly id: string;
  readonly source: string;
  /** Unresolved steps still occupy a position, so indices stay meaningful. */
  readonly known: boolean;
}

/** What each step takes and hands on, for the shape strip over the step list. */
export function pipelineShape(
  pipeline: Pipeline,
  resolveOperation: PipelineOperationResolver,
): readonly PipelineShapeStep[] {
  return pipeline.steps.map((step, index) => {
    const operation = resolveOperation(step.op, step.source);
    if (!operation)
      return {
        step: index + 1,
        name: step.op,
        id: step.op,
        source: step.source,
        known: false,
        accepts: 'file' as const,
        produces: 'files' as const,
      };
    return {
      step: index + 1,
      name: operation.name,
      id: operation.id,
      source: operation.source,
      known: true,
      ...chainLink(operation),
    };
  });
}

/** The operation a new step would have to follow, or undefined at step 1. */
export function lastOperation(
  pipeline: Pipeline,
  resolveOperation: PipelineOperationResolver,
): KernelOperation | undefined {
  const last = pipeline.steps.at(-1);
  return last ? resolveOperation(last.op, last.source) : undefined;
}
