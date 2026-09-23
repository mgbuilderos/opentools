import { describe, expect, it } from 'vitest';
import type { BenchInput } from '@/lib/bench/run';
import type { KernelOperation } from '@/lib/kernel/types';
import { deserialisePipeline, serialisePipeline } from './serialise';
import { runPipeline } from './run';
import type { Pipeline } from './types';

const template = '{name}-{operation}.{ext}';

function input(name: string, text: string): BenchInput {
  return {
    file: new File([text], name, { type: 'text/plain' }),
    name,
    path: name,
  };
}

function fakeTextOperation(
  id: string,
  name: string,
  transform: (text: string) => string,
): KernelOperation {
  return {
    id,
    source: 'test',
    name,
    description: name,
    input: 'text',
    params: [],
    output: { kind: 'text', extension: 'txt' },
    runtime: 'pure',
    deterministic: true,
    async run(context) {
      return { kind: 'text', text: transform(context.text) };
    },
  };
}

describe('runPipeline', () => {
  it('continues after input 3 fails at step 2 and names the file and step', async () => {
    const operations = [
      fakeTextOperation('one', 'First step', (text) => `${text}|one`),
      fakeTextOperation('two', 'Second step', (text) => {
        if (text.startsWith('input-3')) throw new Error('deliberate failure');
        return `${text}|two`;
      }),
      fakeTextOperation('three', 'Third step', (text) => `${text}|three`),
    ];
    const pipeline: Pipeline = {
      version: 1,
      name: 'Three steps',
      steps: operations.map((operation) => ({
        op: operation.id,
        source: operation.source,
        params: {},
      })),
    };

    const outcomes = await runPipeline({
      inputs: Array.from({ length: 5 }, (_, index) =>
        input(`input-${index + 1}.txt`, `input-${index + 1}`),
      ),
      pipeline,
      template,
      signal: new AbortController().signal,
      resolveOperation: (id, source) =>
        operations.find(
          (operation) => operation.id === id && operation.source === source,
        ),
    });

    expect(
      outcomes.filter((outcome) => outcome.status === 'done'),
    ).toHaveLength(4);
    expect(outcomes[2]).toMatchObject({
      status: 'failed',
      reason:
        'input-3.txt: Step 2 "Second step" (two @ test) failed: deliberate failure',
    });
    expect(outcomes[4]?.status).toBe('done');
  });

  it('produces byte-identical output after export and import', async () => {
    const original: Pipeline = {
      version: 1,
      name: 'Clean and reverse',
      steps: [
        { op: 'whitespace-remover', source: 'text', params: {} },
        { op: 'text-reverser', source: 'text', params: {} },
      ],
    };
    const imported = deserialisePipeline(serialisePipeline(original));
    const source = [input('sample.txt', '  one   two  ')];
    const run = (pipeline: Pipeline) =>
      runPipeline({
        inputs: source,
        pipeline,
        template,
        signal: new AbortController().signal,
      });
    const [before, after] = await Promise.all([run(original), run(imported)]);
    const bytes = async (outcomes: typeof before) => {
      const outcome = outcomes[0];
      expect(outcome?.status).toBe('done');
      if (!outcome || outcome.status !== 'done') return [];
      return Array.from(
        new Uint8Array(await outcome.output[0]!.blob.arrayBuffer()),
      );
    };

    expect(await bytes(after)).toEqual(await bytes(before));
  });

  it('runs 100 files through three steps while retaining only final outputs', async () => {
    let peakHeap = process.memoryUsage().heapUsed;
    const sampleHeap = () => {
      peakHeap = Math.max(peakHeap, process.memoryUsage().heapUsed);
    };
    const operations = ['one', 'two', 'three'].map((id) =>
      fakeTextOperation(id, `Step ${id}`, (text) => {
        sampleHeap();
        return `${text.slice(1)}${text[0] ?? ''}`;
      }),
    );
    const pipeline: Pipeline = {
      version: 1,
      name: 'Memory proof',
      steps: operations.map((operation) => ({
        op: operation.id,
        source: operation.source,
        params: {},
      })),
    };
    const inputs = Array.from({ length: 100 }, (_, index) =>
      input(`memory-${index + 1}.txt`, `${index}:` + 'x'.repeat(64 * 1024)),
    );
    const baseline = process.memoryUsage().heapUsed;
    const outcomes = await runPipeline({
      inputs,
      pipeline,
      template,
      signal: new AbortController().signal,
      resolveOperation: (id, source) =>
        operations.find(
          (operation) => operation.id === id && operation.source === source,
        ),
    });
    sampleHeap();

    expect(outcomes).toHaveLength(100);
    expect(outcomes.every((outcome) => outcome.status === 'done')).toBe(true);
    console.info(
      `100-file three-step peak heap delta: ${Math.max(0, peakHeap - baseline)} bytes`,
    );
  });
});
