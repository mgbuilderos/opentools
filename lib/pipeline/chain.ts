import type { KernelOperation, OperationInputKind } from '@/lib/kernel/types';

/**
 * Whether one operation's output can feed the next operation's input.
 *
 * WHY THIS IS ITS OWN MODULE. Two callers need the same answer for opposite
 * reasons. `validate` asks after the fact, to refuse a pipeline someone has
 * already built. The bench editor asks beforehand, to offer only the steps that
 * can legally come next out of a catalogue of well over a thousand. If those
 * two disagree by so much as one case, the editor offers a step the validator
 * then rejects, and the chain is unbuildable by the only route a person has to
 * build it. The rule therefore lives here once, and both import it.
 *
 * The verdict is a code, not a sentence: the validator needs "step 3 X outputs
 * text, but step 4 Y accepts files", the picker needs "needs text". Formatting
 * belongs to whoever is speaking.
 */

/** The shape a step hands on. `none` inputs are start-only by definition. */
export type ChainRejection =
  | { readonly code: 'input-none' }
  | {
      readonly code: 'kind-mismatch';
      readonly produced: 'text' | 'files';
      readonly accepts: OperationInputKind;
    };

export type ChainVerdict =
  | { readonly ok: true }
  | ({ readonly ok: false } & ChainRejection);

const OK: ChainVerdict = { ok: true };

type Producer = Pick<KernelOperation, 'output'>;
type Consumer = Pick<KernelOperation, 'input'>;

/** Explains whether `next` may directly follow `current`. */
export function chainVerdict(current: Producer, next: Consumer): ChainVerdict {
  if (next.input === 'none') return { ok: false, code: 'input-none' };
  if (current.output.kind === 'text' && next.input !== 'text')
    return {
      ok: false,
      code: 'kind-mismatch',
      produced: 'text',
      accepts: next.input,
    };
  if (
    current.output.kind === 'files' &&
    next.input !== 'file' &&
    next.input !== 'files'
  )
    return {
      ok: false,
      code: 'kind-mismatch',
      produced: 'files',
      accepts: next.input,
    };
  return OK;
}

export function canFollow(current: Producer, next: Consumer): boolean {
  return chainVerdict(current, next).ok;
}

/**
 * Whether an operation can open a pipeline. Everything can: a `none` input
 * generates its own content, and every other kind takes what the bench feeds
 * it. The function exists so the editor asks a named question rather than
 * hard-coding `true`, and so a future start-only restriction lands in one file.
 */
export function canStart(_operation: Consumer): boolean {
  return true;
}

/** What a step takes and hands on, for the shape strip above the step list. */
export interface ChainLink {
  readonly accepts: OperationInputKind;
  readonly produces: 'text' | 'files';
}

export function chainLink(operation: Producer & Consumer): ChainLink {
  return { accepts: operation.input, produces: operation.output.kind };
}
