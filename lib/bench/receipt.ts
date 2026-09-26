import type { BatchOutcome } from '@/lib/batch/run';
import type { KernelOperation } from '@/lib/kernel/types';
import type { PipelineTrace } from '@/lib/pipeline/types';
import type { BenchInput, BenchOutput } from './run';

/**
 * What a step actually did, totalled over every input that reached it.
 *
 * The rest of a receipt's step list is the run's *intent* — which operations
 * were asked for, with which settings. This is the only part measured while
 * they ran, and it is where a chain stops being a claim: `inputs` falling off
 * between one step and the next is exactly how many files the step before it
 * lost, and bytes in against bytes out is whether a compress step compressed.
 */
export interface ReceiptStepMeasurement {
  inputs: number;
  failed: number;
  bytesIn: number;
  bytesOut: number;
  ms: number;
}

export interface BenchReceipt {
  generatedAt: string;
  operation: { id: string; source: string; name: string };
  params: Readonly<Record<string, string>>;
  steps?: readonly {
    op: string;
    source: string;
    name: string;
    params: Readonly<Record<string, string>>;
    /** Absent when the run recorded no trace, e.g. a single-operation run. */
    measured?: ReceiptStepMeasurement;
  }[];
  counts: {
    inputs: number;
    succeeded: number;
    failed: number;
    skipped: number;
  };
  bytes: { in: number; out: number };
  durationMs: number;
  failures: readonly { name: string; reason: string }[];
  environment: string;
}

export interface BuildReceiptArgs {
  generatedAt: string;
  operation: Pick<KernelOperation, 'id' | 'source' | 'name' | 'params'>;
  params: Readonly<Record<string, string>>;
  inputs: readonly BenchInput[];
  outcomes: readonly BatchOutcome<BenchInput, BenchOutput[]>[];
  environment: string;
  steps?: readonly {
    operation: Pick<KernelOperation, 'id' | 'source' | 'name' | 'params'>;
    params: Readonly<Record<string, string>>;
  }[];
  /** One per input the pipeline ran, failures included. */
  traces?: readonly PipelineTrace[];
}

type UnsuccessfulOutcome = Extract<
  BuildReceiptArgs['outcomes'][number],
  { status: 'failed' | 'skipped' }
>;

/** Totals for one step, over the traces of every input that reached it. */
function measure(
  traces: readonly PipelineTrace[],
  stepNumber: number,
): ReceiptStepMeasurement | undefined {
  const entries = traces.flatMap((trace) =>
    trace.steps.filter((step) => step.step === stepNumber),
  );
  if (!entries.length) return undefined;
  return {
    inputs: entries.length,
    failed: entries.filter((entry) => entry.status === 'failed').length,
    bytesIn: entries.reduce((total, entry) => total + entry.inputBytes, 0),
    bytesOut: entries.reduce(
      (total, entry) => total + (entry.outputBytes ?? 0),
      0,
    ),
    ms: Math.round(entries.reduce((total, entry) => total + entry.ms, 0)),
  };
}

function serialisableParams(
  operation: BuildReceiptArgs['operation'],
  params: BuildReceiptArgs['params'],
): Readonly<Record<string, string>> {
  const included: Record<string, string> = {};
  for (const descriptor of operation.params) {
    if (!descriptor.serialisable) continue;
    const value = params[descriptor.id];
    if (value !== undefined) included[descriptor.id] = value;
  }
  return included;
}

export function buildReceipt(args: BuildReceiptArgs): BenchReceipt {
  const succeeded = args.outcomes.filter(
    (outcome) => outcome.status === 'done',
  );
  const failed = args.outcomes.filter((outcome) => outcome.status === 'failed');
  const skipped = args.outcomes.filter(
    (outcome) => outcome.status === 'skipped',
  );
  const unsuccessful = args.outcomes.filter(
    (outcome): outcome is UnsuccessfulOutcome => outcome.status !== 'done',
  );

  return {
    generatedAt: args.generatedAt,
    operation: {
      id: args.operation.id,
      source: args.operation.source,
      name: args.operation.name,
    },
    params: serialisableParams(args.operation, args.params),
    ...(args.steps
      ? {
          steps: args.steps.map((step, index) => {
            const measured = measure(args.traces ?? [], index + 1);
            return {
              op: step.operation.id,
              source: step.operation.source,
              name: step.operation.name,
              params: serialisableParams(step.operation, step.params),
              ...(measured ? { measured } : {}),
            };
          }),
        }
      : {}),
    counts: {
      inputs: args.inputs.length,
      succeeded: succeeded.length,
      failed: failed.length,
      skipped: skipped.length,
    },
    bytes: {
      in: args.inputs.reduce((total, input) => total + input.file.size, 0),
      out: succeeded.reduce(
        (total, outcome) =>
          total +
          outcome.output.reduce(
            (outputTotal, output) => outputTotal + output.blob.size,
            0,
          ),
        0,
      ),
    },
    durationMs: args.outcomes.reduce(
      (total, outcome) => total + outcome.durationMs,
      0,
    ),
    failures: unsuccessful
      .sort((left, right) => left.index - right.index)
      .map((outcome) => ({
        name: outcome.input.name,
        reason: outcome.reason,
      })),
    environment: args.environment,
  };
}

export function receiptToText(receipt: BenchReceipt): string {
  const lines = [
    'OpenTools Bench run receipt',
    `Generated: ${receipt.generatedAt}`,
    `Operation: ${receipt.operation.name} (${receipt.operation.id} @ ${receipt.operation.source})`,
    `Inputs: ${receipt.counts.inputs}`,
    `Succeeded: ${receipt.counts.succeeded}`,
    `Failed: ${receipt.counts.failed}`,
    `Skipped: ${receipt.counts.skipped}`,
    `Bytes in: ${receipt.bytes.in}`,
    `Bytes out: ${receipt.bytes.out}`,
    `Duration: ${receipt.durationMs} ms`,
    `Environment: ${receipt.environment}`,
  ];

  const params = Object.entries(receipt.params);
  if (params.length) {
    lines.push('Parameters:');
    for (const [id, value] of params) lines.push(`- ${id}: ${value}`);
  }

  if (receipt.steps) {
    lines.push('Steps:');
    for (const [index, step] of receipt.steps.entries()) {
      lines.push(`${index + 1}. ${step.name} (${step.op} @ ${step.source})`);
      for (const [id, value] of Object.entries(step.params))
        lines.push(`   - ${id}: ${value}`);
      if (step.measured) {
        const { inputs, failed, bytesIn, bytesOut, ms } = step.measured;
        lines.push(
          `   - measured: ${inputs} reached, ${failed} failed, ${bytesIn} bytes in, ${bytesOut} bytes out, ${ms} ms`,
        );
      }
    }
  }

  if (receipt.failures.length) {
    lines.push('Failures:');
    for (const failure of receipt.failures)
      lines.push(`- ${failure.name}: ${failure.reason}`);
  }

  lines.push('Bytes uploaded: 0 - this page cannot make a network request.');
  return lines.join('\n');
}

export function receiptToJson(receipt: BenchReceipt): string {
  return JSON.stringify(receipt, null, 2);
}
