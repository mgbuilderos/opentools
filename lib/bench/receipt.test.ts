import { describe, expect, it } from 'vitest';
import type { BatchOutcome } from '@/lib/batch/run';
import type { KernelOperation } from '@/lib/kernel/types';
import type { BenchInput, BenchOutput } from './run';
import {
  buildReceipt,
  receiptToJson,
  receiptToText,
  type BuildReceiptArgs,
} from './receipt';

const operation = {
  id: 'word-counter',
  source: 'text',
  name: 'Word counter',
  params: [
    {
      id: 'mode',
      label: 'Mode',
      type: 'select',
      defaultValue: 'strict',
      options: [{ value: 'strict', label: 'Strict' }],
      serialisable: true,
    },
    {
      id: 'filename',
      label: 'Filename',
      type: 'text',
      defaultValue: '',
      serialisable: false,
    },
    {
      id: 'secret',
      label: 'Secret',
      type: 'textarea',
      defaultValue: '',
      serialisable: false,
    },
  ],
} satisfies Pick<KernelOperation, 'id' | 'source' | 'name' | 'params'>;

function input(name: string, contents: string): BenchInput {
  return {
    file: new File([contents], name, { type: 'text/plain' }),
    name,
    path: name,
  };
}

function output(fileName: string, contents: string): BenchOutput {
  return {
    blob: new Blob([contents], { type: 'text/plain' }),
    fileName,
    summary: `${contents.length} characters`,
  };
}

function args(
  inputs: readonly BenchInput[],
  outcomes: readonly BatchOutcome<BenchInput, BenchOutput[]>[],
  params: Readonly<Record<string, string>> = { mode: 'strict' },
): BuildReceiptArgs {
  return {
    generatedAt: '2026-09-23T08:15:30.000Z',
    operation,
    params,
    inputs,
    outcomes,
    environment: 'TestBrowser/1.0',
  };
}

describe('Bench run receipts', () => {
  it('sums measured counts, bytes, and outcome durations', () => {
    const first = input('first.txt', 'abc');
    const second = input('second.txt', '12345');
    const receipt = buildReceipt(
      args(
        [first, second],
        [
          {
            input: first,
            index: 0,
            status: 'done',
            output: [output('first-result.txt', 'ok')],
            durationMs: 2.5,
          },
          {
            input: second,
            index: 1,
            status: 'failed',
            reason: 'The contents are corrupt.',
            durationMs: 4.25,
          },
        ],
      ),
    );

    expect(receipt.counts).toEqual({
      inputs: 2,
      succeeded: 1,
      failed: 1,
      skipped: 0,
    });
    expect(receipt.bytes).toEqual({ in: 8, out: 2 });
    expect(receipt.durationMs).toBe(6.75);
  });

  it('includes only params declared serialisable by the operation', () => {
    const privateFilename = 'client-merger.pdf';
    const privateSecret = 'sk_live_private_value';
    const receipt = buildReceipt(
      args([], [], {
        mode: 'strict',
        filename: privateFilename,
        secret: privateSecret,
        undeclared: 'another-private-value',
      }),
    );

    expect(receipt.params).toEqual({ mode: 'strict' });
    for (const serialised of [receiptToText(receipt), receiptToJson(receipt)]) {
      expect(serialised).not.toContain(privateFilename);
      expect(serialised).not.toContain(privateSecret);
      expect(serialised).not.toContain('another-private-value');
    }
  });

  it('lists every failed and skipped file by name with its reason', () => {
    const failed = input('broken.txt', 'bad');
    const skipped = input('later.txt', 'later');
    const receipt = buildReceipt(
      args(
        [failed, skipped],
        [
          {
            input: failed,
            index: 0,
            status: 'failed',
            reason: 'The header is corrupt.',
            durationMs: 3,
          },
          {
            input: skipped,
            index: 1,
            status: 'skipped',
            reason: 'Skipped because you cancelled the batch.',
            durationMs: 0,
          },
        ],
      ),
    );

    expect(receipt.failures).toEqual([
      { name: 'broken.txt', reason: 'The header is corrupt.' },
      {
        name: 'later.txt',
        reason: 'Skipped because you cancelled the batch.',
      },
    ]);
  });

  it('renders stable text for fixed measured input', () => {
    const source = input('broken.txt', 'abc');
    const receipt = buildReceipt(
      args(
        [source],
        [
          {
            input: source,
            index: 0,
            status: 'failed',
            reason: 'The header is corrupt.',
            durationMs: 3.5,
          },
        ],
      ),
    );

    expect(receiptToText(receipt)).toMatchInlineSnapshot(`
      "OpenTools Bench run receipt
      Generated: 2026-09-23T08:15:30.000Z
      Operation: Word counter (word-counter @ text)
      Inputs: 1
      Succeeded: 0
      Failed: 1
      Skipped: 0
      Bytes in: 3
      Bytes out: 0
      Duration: 3.5 ms
      Environment: TestBrowser/1.0
      Parameters:
      - mode: strict
      Failures:
      - broken.txt: The header is corrupt.
      Bytes uploaded: 0 - this page cannot make a network request."
    `);
  });

  it('serialises zero-failure and all-failure runs as valid receipts', () => {
    const successful = input('ok.txt', 'ok');
    const broken = input('broken.txt', 'bad');
    const zeroFailure = buildReceipt(
      args(
        [successful],
        [
          {
            input: successful,
            index: 0,
            status: 'done',
            output: [output('ok-result.txt', 'done')],
            durationMs: 1,
          },
        ],
      ),
    );
    const allFailure = buildReceipt(
      args(
        [broken],
        [
          {
            input: broken,
            index: 0,
            status: 'failed',
            reason: 'Unreadable input.',
            durationMs: 2,
          },
        ],
      ),
    );

    expect(JSON.parse(receiptToJson(zeroFailure))).toEqual(zeroFailure);
    expect(JSON.parse(receiptToJson(allFailure))).toEqual(allFailure);
    expect(zeroFailure.failures).toEqual([]);
    expect(allFailure.counts).toMatchObject({ succeeded: 0, failed: 1 });
  });
});
