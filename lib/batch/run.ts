import { createZip } from '@/lib/tools/docx/zip';
import { uniqueFilename } from '@/lib/tools/html/converter';

export interface NamedBatchInput {
  name: string;
}

export interface BatchFileOutput {
  blob: Blob;
  fileName: string;
}

export type BatchProcessResult<TOutput> =
  | { status: 'done'; output: TOutput }
  | { status: 'skipped'; reason: string };

export type BatchOutcome<TInput, TOutput> =
  | {
      input: TInput;
      index: number;
      status: 'done';
      output: TOutput;
      durationMs: number;
    }
  | {
      input: TInput;
      index: number;
      status: 'failed' | 'skipped';
      reason: string;
      durationMs: number;
    };

export interface BatchProgress<TInput, TOutput> {
  completed: number;
  current: TInput | null;
  outcomes: readonly BatchOutcome<TInput, TOutput>[];
  total: number;
}

export interface RunBatchOptions<TInput extends NamedBatchInput, TOutput> {
  inputs: readonly TInput[];
  process: (
    input: TInput,
    index: number,
    signal: AbortSignal,
  ) => Promise<BatchProcessResult<TOutput>>;
  signal?: AbortSignal;
  onProgress?: (progress: BatchProgress<TInput, TOutput>) => void;
}

function messageFor(cause: unknown): string {
  if (cause instanceof Error && cause.message.trim()) return cause.message;
  return 'This file could not be processed.';
}

function namedReason(inputName: string, reason: string): string {
  return `${inputName}: ${reason}`;
}

function cancelledOutcome<TInput extends NamedBatchInput, TOutput>(
  input: TInput,
  index: number,
): BatchOutcome<TInput, TOutput> {
  return {
    input,
    index,
    status: 'skipped',
    reason: namedReason(input.name, 'Skipped because you cancelled the batch.'),
    durationMs: 0,
  };
}

/**
 * Process one input at a time. A failed input is recorded and the next input
 * still runs. Cancellation keeps completed outcomes and marks every untouched
 * input as skipped, so the result list always accounts for every selected file.
 */
export async function runBatch<TInput extends NamedBatchInput, TOutput>(
  options: RunBatchOptions<TInput, TOutput>,
): Promise<readonly BatchOutcome<TInput, TOutput>[]> {
  const outcomes: BatchOutcome<TInput, TOutput>[] = [];
  const { inputs, onProgress, process, signal } = options;

  const report = (current: TInput | null) => {
    onProgress?.({
      completed: outcomes.length,
      current,
      outcomes: [...outcomes],
      total: inputs.length,
    });
  };

  report(inputs[0] ?? null);

  for (let index = 0; index < inputs.length; index += 1) {
    const input = inputs[index]!;
    if (signal?.aborted) {
      for (let remaining = index; remaining < inputs.length; remaining += 1) {
        outcomes.push(cancelledOutcome(inputs[remaining]!, remaining));
      }
      report(null);
      break;
    }

    report(input);
    const startedAt = performance.now();
    try {
      const result = await process(
        input,
        index,
        signal ?? new AbortController().signal,
      );
      const durationMs = performance.now() - startedAt;

      if (signal?.aborted) {
        outcomes.push(cancelledOutcome(input, index));
        for (
          let remaining = index + 1;
          remaining < inputs.length;
          remaining += 1
        ) {
          outcomes.push(cancelledOutcome(inputs[remaining]!, remaining));
        }
        report(null);
        break;
      }

      if (result.status === 'done') {
        outcomes.push({
          input,
          index,
          status: 'done',
          output: result.output,
          durationMs,
        });
      } else {
        outcomes.push({
          input,
          index,
          status: 'skipped',
          reason: namedReason(input.name, result.reason),
          durationMs,
        });
      }
    } catch (cause) {
      const durationMs = performance.now() - startedAt;
      if (signal?.aborted) {
        outcomes.push(cancelledOutcome(input, index));
        for (
          let remaining = index + 1;
          remaining < inputs.length;
          remaining += 1
        ) {
          outcomes.push(cancelledOutcome(inputs[remaining]!, remaining));
        }
        report(null);
        break;
      }
      outcomes.push({
        input,
        index,
        status: 'failed',
        reason: namedReason(input.name, messageFor(cause)),
        durationMs,
      });
    }

    report(inputs[index + 1] ?? null);
  }

  return outcomes;
}

function safeArchiveName(name: string): string {
  const safe = name.replace(/[^\w.-]/gu, '_');
  return safe || 'result';
}

/** Build one deterministic ZIP, numbering duplicate output names. */
export async function createBatchZip(
  outputs: readonly BatchFileOutput[],
): Promise<Uint8Array> {
  const taken = new Set<string>();
  const entries = [];
  for (const output of outputs) {
    entries.push({
      path: uniqueFilename(safeArchiveName(output.fileName), taken),
      data: new Uint8Array(await output.blob.arrayBuffer()),
    });
  }
  return createZip(entries);
}
