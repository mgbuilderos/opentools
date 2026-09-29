import {
  reportOperationCapability,
  type DeviceMemorySnapshot,
  type OperationCapabilityReport,
} from '@/lib/kernel/capability';
import type { KernelOperationDescriptor } from '@/lib/kernel/types';

export interface PipelineStepCapacity {
  /** 1-based, matching the numbering the editor shows. */
  step: number;
  id: string;
  name: string;
  report: OperationCapabilityReport;
}

export interface PipelineCapacity {
  steps: readonly PipelineStepCapacity[];
  /** No step in the chain buffers a whole file. */
  streams: boolean;
  /** The steps that do, in order. Empty when the chain streams throughout. */
  buffering: readonly number[];
  /** The largest buffer any streaming step keeps, or `null` when none does. */
  largestChunkBytes: number | null;
  /**
   * A ceiling on the file the visitor picks, or `null` for no honest number.
   *
   * WHY ONLY THE FIRST STEP. It is tempting to take the smallest ceiling in
   * the chain and call it the chain's, but only step one is handed the file
   * that was picked. Step three is handed whatever step two produced, and
   * nothing here knows whether that is larger or smaller than what went in —
   * a split makes it smaller, a render makes it much larger. A ceiling from a
   * later step is a true statement about that step and a guess about the
   * input, so the guess is not made. What later steps do contribute is
   * `buffering`, which needs no arithmetic to be true.
   */
  inputCeilingBytes: number | null;
  inputLimitingFactor: OperationCapabilityReport['limitingFactor'];
}

const EMPTY: PipelineCapacity = {
  steps: [],
  streams: false,
  buffering: [],
  largestChunkBytes: null,
  inputCeilingBytes: null,
  inputLimitingFactor: 'unknown',
};

/**
 * What a chain can be told about the size of file it will accept.
 *
 * Every number here comes from `reportOperationCapability`, which returns
 * `null` rather than inventing a ceiling the evidence does not support. This
 * function keeps that discipline: an empty chain reports nothing, and an
 * unmeasurable one reports that it is unmeasurable.
 */
export function pipelineCapacity(
  operations: readonly KernelOperationDescriptor[],
  device: DeviceMemorySnapshot,
): PipelineCapacity {
  // Nothing to say about the size of a file that is never handed over as one.
  // A chain starting with a text step has the file decoded first, and how much
  // text a browser will hold is not something any descriptor here knows, so
  // the page stays quiet rather than warning vaguely on every text operation.
  if (!operations.length) return EMPTY;
  const accepts = operations[0]!.input;
  if (accepts !== 'file' && accepts !== 'files') return EMPTY;
  const steps = operations.map((operation, index) => ({
    step: index + 1,
    id: operation.id,
    name: operation.name,
    report: reportOperationCapability(operation, device),
  }));
  const chunks = steps
    .map((entry) => entry.report.chunkSizeBytes)
    .filter((value): value is number => value !== null);
  const first = steps[0]!.report;
  return {
    steps,
    streams: steps.every((entry) => entry.report.streamable),
    buffering: steps
      .filter((entry) => !entry.report.streamable)
      .map((entry) => entry.step),
    largestChunkBytes: chunks.length ? Math.max(...chunks) : null,
    inputCeilingBytes: first.streamable ? null : first.maxInputBytes,
    inputLimitingFactor: first.limitingFactor,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

function listSteps(steps: readonly number[]): string {
  if (steps.length === 1) return `Step ${steps[0]}`;
  const head = steps.slice(0, -1).join(', ');
  return `Steps ${head} and ${steps.at(-1)}`;
}

/**
 * The capacity report as one sentence a visitor can act on.
 *
 * `largestInputBytes` is the biggest file currently picked, when any is: it
 * turns an abstract ceiling into the only question being asked, which is
 * whether this run will survive.
 */
export function describeCapacity(
  capacity: PipelineCapacity,
  largestInputBytes?: number,
): string {
  if (!capacity.steps.length) return '';

  if (capacity.streams) {
    const chunk =
      capacity.largestChunkBytes === null
        ? ''
        : capacity.largestChunkBytes === 0
          ? ' No step reads any of the file’s content at all.'
          : ` The most any step holds at once is ${formatBytes(capacity.largestChunkBytes)}.`;
    return `Every step streams, so file size is not the limit here.${chunk}`;
  }

  const buffers = `${listSteps(capacity.buffering)} ${capacity.buffering.length === 1 ? 'reads' : 'read'} the whole file into memory.`;

  // Two different gaps land here — a browser that reports no heap ceiling, and
  // a step that never declared what it needs per byte of input — and blaming
  // either one specifically would be wrong about the other. What is true in
  // both cases is that there is no number, which is what gets said.
  if (capacity.inputCeilingBytes === null)
    return `${buffers} How much it can take is not something this page can honestly put a number on, so a large file may simply fail.`;

  const ceiling = formatBytes(capacity.inputCeilingBytes);
  const source =
    capacity.inputLimitingFactor === 'operation'
      ? `Step 1 accepts up to ${ceiling}.`
      : capacity.inputLimitingFactor === 'device-heap'
        ? `On this device that works out at about ${ceiling}.`
        : `Step 1 accepts up to ${ceiling}, which is also about all this device has room for.`;

  if (
    largestInputBytes !== undefined &&
    largestInputBytes > capacity.inputCeilingBytes
  )
    return `${buffers} ${source} The largest file picked is ${formatBytes(largestInputBytes)}, so this run is expected to fail.`;

  return `${buffers} ${source}`;
}
