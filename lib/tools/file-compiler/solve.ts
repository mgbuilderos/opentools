/**
 * Run a plan and judge what came out of it.
 *
 * Every pixel operation is injected as a callback, so this module holds no
 * canvas, no DOM and no file reading. That is not only for testing: it means the
 * decision about whether a result is acceptable is made by code that never saw
 * the encoder succeed, and therefore cannot be fooled by the encoder succeeding.
 * A `toBlob()` that resolves tells us bytes exist. It tells us nothing about
 * whether those bytes satisfy anything.
 *
 * The size search is `fitToSize` from `../exact-size`, which is the engine
 * `/image/exact-size` already ships: quality bisection between `QUALITY_FLOOR`
 * and `QUALITY_CEILING`, every attempt judged on its own measured bytes because
 * JPEG size is not strictly monotonic in quality, and a single encode with no
 * search for PNG, whose quality argument is not that knob. This module adds the
 * abort signal, the deadline and the verification pass around it.
 *
 * **The objective, stated explicitly**, in the order the brief sets and in the
 * order this code applies it:
 *
 * 1. Satisfy every hard constraint.
 * 2. Keep exact dimensions when they were asked for — `allowSmallerPixels` is
 *    false for an exact size, so the search may never shrink its way to a byte
 *    limit it cannot otherwise reach. It reports failure instead.
 * 3. Otherwise keep the largest dimensions the requirement permits.
 * 4. Among files that qualify, take the highest quality.
 * 5. Change nothing that was not required.
 */

import {
  FitAbortError,
  fitToSize,
  MAX_ENCODES,
  QUALITY_CEILING,
  type FitResult,
} from '../exact-size';
import type {
  DecodedSize,
  VerifiableFormat,
  Verification,
} from '../image-verify';
import { unmetReasons, verifyImageBytes } from '../image-verify';
import { stripMetadata } from '../metadata';
import type { CompilePlan, InspectedImage } from './plan';

/** Default wall-clock budget for one compile. */
export const DEFAULT_DEADLINE_MS = 20_000;

/** An error message safe to show: never a filename, never file contents. */
export interface SafeError {
  message: string;
}

/**
 * An error whose message this project wrote and is willing to show.
 *
 * Anything thrown that is *not* one of these is reported as a fixed sentence,
 * because a browser, codec or filesystem error can embed a path or a data URL.
 * Throw this from a callback when the visitor needs to be told what happened.
 */
export class ShowableError extends Error {
  override readonly name = 'ShowableError';
}

export type CompileResult =
  | {
      status: 'verified';
      bytes: Uint8Array;
      verification: Verification;
      encodes: number;
    }
  | {
      status: 'unsatisfied';
      /** The best real file produced, kept so it can still be offered. */
      bytes?: Uint8Array;
      verification: Verification;
      reasons: readonly string[];
      encodes: number;
      /** True when the search stopped on its budget rather than finishing. */
      truncated: boolean;
    }
  | { status: 'unsupported'; reasons: readonly string[] }
  | { status: 'cancelled' }
  | { status: 'failed'; error: SafeError };

/**
 * The pixel work, supplied by the caller.
 *
 * `encode` draws the image per the plan at the given size and encodes it. It is
 * the only thing here that touches image data. `measure` decodes finished bytes
 * independently — in a browser by loading them into an `<img>` — so the pixel
 * size can be checked against something other than the file's own header.
 */
export interface CompileIo {
  encode: (
    width: number,
    height: number,
    quality: number,
  ) => Promise<Uint8Array>;
  measure?: (
    bytes: Uint8Array,
    format: VerifiableFormat,
  ) => Promise<DecodedSize | null>;
}

export interface CompileOptions {
  signal?: AbortSignal;
  /** Wall-clock budget. Defaults to `DEFAULT_DEADLINE_MS`. */
  deadlineMs?: number;
  /** Lower the encode ceiling below `MAX_ENCODES`. */
  maxEncodes?: number;
}

/**
 * Execute a plan, then verify the bytes it produced.
 *
 * Verification runs on every path that produces a file, including the paths
 * where the search already knows it fell short — a file that misses its byte
 * limit may still have the right dimensions and no metadata, and saying which
 * promises were kept is more useful than a bare failure.
 */
export async function runPlan(
  plan: CompilePlan,
  input: InspectedImage,
  io: CompileIo,
  options: CompileOptions = {},
): Promise<CompileResult> {
  const deadlineMs = options.deadlineMs ?? DEFAULT_DEADLINE_MS;

  if (options.signal?.aborted) {
    return { status: 'cancelled' };
  }

  // Where geometry landed. 'keep' encodes at the image's own size.
  const width = plan.geometry.width ?? input.width;
  const height = plan.geometry.height ?? input.height;
  if (width <= 0 || height <= 0) {
    return {
      status: 'unsupported',
      reasons: [
        'This image’s size could not be read, so it cannot be re-saved.',
      ],
    };
  }

  let bytes: Uint8Array;
  let encodes = 0;
  let truncated = false;

  try {
    if (plan.searchForBytes !== undefined) {
      const fitted: FitResult = await fitToSize({
        format: plan.outputFormat,
        width,
        height,
        maxBytes: plan.searchForBytes,
        // An exact size is a hard constraint, so the search is not allowed to
        // shrink its way under the byte limit. Within a maximum it may.
        allowSmallerPixels: plan.geometry.mode !== 'exact',
        encode: io.encode,
        signal: options.signal,
        deadlineMs,
        maxEncodes: options.maxEncodes,
      });
      bytes = fitted.attempt.bytes;
      encodes = fitted.encodes;
      truncated = fitted.truncated;
    } else {
      // Nothing bounds the size, so take the highest quality available.
      bytes = await io.encode(width, height, plan.quality ?? QUALITY_CEILING);
      encodes = 1;
    }
  } catch (error) {
    if (error instanceof FitAbortError || isAbortError(error)) {
      return { status: 'cancelled' };
    }
    return { status: 'failed', error: { message: safeMessage(error) } };
  }

  if (options.signal?.aborted) {
    return { status: 'cancelled' };
  }

  // Metadata removal happens after the search. Stripping only ever removes
  // bytes, so it cannot push a file back over a limit the search just met.
  if (plan.removeMetadata) {
    const stripped = stripMetadata(bytes);
    if (stripped.success) {
      bytes = stripped.cleanedBytes;
    }
  }

  let decoded: DecodedSize | null = null;
  if (io.measure) {
    try {
      decoded = await io.measure(bytes, plan.outputFormat);
    } catch {
      // Left null: verification then reports the pixel size as unprovable
      // rather than trusting the file's own header on its own.
      decoded = null;
    }
  }

  const verification = verifyImageBytes(bytes, plan.targets, decoded);
  if (verification.pass) {
    return { status: 'verified', bytes, verification, encodes };
  }
  return {
    status: 'unsatisfied',
    bytes,
    verification,
    reasons: unmetReasons(verification),
    encodes,
    truncated,
  };
}

/**
 * The bounded ways forward when a byte limit could not be met, given what the
 * requirement already fixed. Offered only for the constraints that are actually
 * relaxable: an exact size the visitor asked for is not quietly negotiable.
 */
export function unsatisfiedChoices(plan: CompilePlan): readonly {
  id: string;
  label: string;
}[] {
  const choices: { id: string; label: string }[] = [];
  if (plan.geometry.mode === 'exact') {
    choices.push({
      id: 'allow-smaller',
      label: 'Allow smaller dimensions',
    });
  }
  if (plan.outputFormat === 'image/png') {
    choices.push({
      id: 'lossy-format',
      label: 'Save as JPEG or WebP, which can trade detail for size',
    });
  }
  choices.push({ id: 'keep-best', label: 'Keep the closest result anyway' });
  return choices;
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name?: unknown }).name === 'AbortError'
  );
}

/**
 * A message that can be shown, from an error that might contain anything.
 *
 * Only messages this project wrote are passed through; anything else becomes a
 * fixed sentence, because a browser or codec error can embed a filename or a
 * data URL and those must not reach the screen or a log.
 *
 * WHY THIS IS A CLASS AND NOT A LIST OF STRINGS. It was a list, and the list
 * silently swallowed the next message somebody added — the one telling a WebKit
 * visitor their browser cannot save WebP, which they then never saw. A marker
 * class cannot fall out of date: the caller states that a message is safe by
 * choosing the type it throws, in the same place it writes the words.
 */
function safeMessage(error: unknown): string {
  if (error instanceof ShowableError) {
    return error.message;
  }
  return 'This image could not be prepared in this browser.';
}

/** Hard ceiling on encodes, re-exported so callers can state it truthfully. */
export { MAX_ENCODES };
