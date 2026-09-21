import { describe, expect, it } from 'vitest';
import type { KernelOperation } from '@/lib/kernel/types';
import { outputName, runBench } from './run';

describe('Bench output names', () => {
  it('expands every supported token', () => {
    expect(
      outputName('{index}-{name}-{operation}-{date}.{ext}', {
        name: 'report',
        ext: 'txt',
        index: 3,
        operation: 'word-counter',
        date: '2026-09-21',
      }),
    ).toBe('3-report-word-counter-2026-09-21.txt');
  });

  it('removes path separators from generated names', () => {
    expect(
      outputName('../{name}.{ext}', {
        name: 'safe',
        ext: 'txt',
        index: 1,
        operation: 'test',
        date: '2026-09-21',
      }),
    ).toBe('__safe.txt');
  });
});

describe('Bench batches', () => {
  const operation: KernelOperation = {
    id: 'fixture-uppercase',
    source: 'test',
    name: 'Fixture uppercase',
    description: 'Uppercase fixture text.',
    input: 'text',
    params: [],
    output: { kind: 'text', extension: 'txt' },
    runtime: 'pure',
    deterministic: true,
    async run(context) {
      if (context.text === 'corrupt') throw new Error('Unreadable fixture.');
      return { kind: 'text', text: context.text.toUpperCase() };
    },
  };

  it('finishes 300 files while one corrupt file fails independently', async () => {
    const inputs = Array.from({ length: 300 }, (_, index) => {
      const text = index === 149 ? 'corrupt' : `file ${index}`;
      const file = new File([text], `input-${index}.txt`, {
        type: 'text/plain',
      });
      return { file, name: file.name, path: file.name };
    });
    const startHeap = process.memoryUsage().heapUsed;
    let peakHeap = startHeap;
    const outcomes = await runBench({
      inputs,
      operation,
      params: {},
      template: '{name}.{ext}',
      signal: new AbortController().signal,
      onProgress() {
        peakHeap = Math.max(peakHeap, process.memoryUsage().heapUsed);
      },
    });
    const heapGrowthMiB = (peakHeap - startHeap) / 1024 ** 2;
    console.info(
      `Bench 300-file peak heap growth: ${heapGrowthMiB.toFixed(2)} MiB`,
    );
    expect(outcomes.filter((item) => item.status === 'done')).toHaveLength(299);
    expect(outcomes.filter((item) => item.status === 'failed')).toHaveLength(1);
    expect(heapGrowthMiB).toBeLessThan(64);
  });
});
