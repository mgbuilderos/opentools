import { describe, expect, it } from 'vitest';
import { readZip } from '@/lib/tools/archive/zip-reader';
import { createBatchZip, runBatch, type BatchFileOutput } from './run';

describe('runBatch', () => {
  it('processes sequentially and keeps going after a named failure', async () => {
    let active = 0;
    let peakActive = 0;
    const visited: string[] = [];

    const outcomes = await runBatch({
      inputs: [
        { name: 'one.txt' },
        { name: 'broken.txt' },
        { name: 'three.txt' },
      ],
      process: async (input) => {
        active += 1;
        peakActive = Math.max(peakActive, active);
        visited.push(input.name);
        await Promise.resolve();
        active -= 1;
        if (input.name === 'broken.txt') {
          throw new Error('The contents are corrupt.');
        }
        return { status: 'done' as const, output: input.name.toUpperCase() };
      },
    });

    expect(peakActive).toBe(1);
    expect(visited).toEqual(['one.txt', 'broken.txt', 'three.txt']);
    expect(outcomes.map((outcome) => outcome.status)).toEqual([
      'done',
      'failed',
      'done',
    ]);
    expect(outcomes[1]).toMatchObject({
      status: 'failed',
      reason: 'broken.txt: The contents are corrupt.',
    });
  });

  it('keeps completed results and names every untouched file after cancel', async () => {
    const controller = new AbortController();
    const outcomes = await runBatch({
      inputs: [{ name: 'one.txt' }, { name: 'two.txt' }, { name: 'three.txt' }],
      signal: controller.signal,
      process: async (input) => ({
        status: 'done' as const,
        output: input.name,
      }),
      onProgress: ({ completed }) => {
        if (completed === 1) controller.abort();
      },
    });

    expect(outcomes.map((outcome) => outcome.status)).toEqual([
      'done',
      'skipped',
      'skipped',
    ]);
    expect(outcomes[1]).toMatchObject({
      reason: 'two.txt: Skipped because you cancelled the batch.',
    });
    expect(outcomes[2]).toMatchObject({
      reason: 'three.txt: Skipped because you cancelled the batch.',
    });
  });

  it('records an intentional skip by file name', async () => {
    const [outcome] = await runBatch({
      inputs: [{ name: 'notes.txt' }],
      process: async () => ({
        status: 'skipped' as const,
        reason: 'This format is not supported.',
      }),
    });

    expect(outcome).toMatchObject({
      status: 'skipped',
      reason: 'notes.txt: This format is not supported.',
    });
  });
});

describe('createBatchZip', () => {
  it('keeps duplicate output names as separate deterministic entries', async () => {
    const outputs: BatchFileOutput[] = [
      { fileName: 'result.txt', blob: new Blob(['first']) },
      { fileName: 'result.txt', blob: new Blob(['second']) },
      { fileName: '../unsafe.txt', blob: new Blob(['third']) },
    ];

    const zip = await createBatchZip(outputs);
    const { entries } = readZip(zip);

    expect(entries.map((entry) => entry.path)).toEqual([
      'result.txt',
      'result-2.txt',
      '.._unsafe.txt',
    ]);
  });
});
