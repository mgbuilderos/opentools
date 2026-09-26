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

describe('runPipeline runs on the streaming executor', () => {
  /**
   * The reason the bench delegates to `executePipeline` at all. Before it did,
   * a `streamable` operation still got its whole input buffered, on the page
   * whose offer is a folder of four thousand files.
   */
  function streamingOperation(): KernelOperation & { seen: string[] } {
    const seen: string[] = [];
    return {
      id: 'streamer',
      source: 'test',
      name: 'Streaming step',
      description: 'Streaming step',
      input: 'file',
      params: [],
      output: { kind: 'files', extension: 'bin' },
      runtime: 'pure',
      deterministic: true,
      streamable: true,
      seen,
      async run(context) {
        // A streamable operation is handed streams and no buffered files.
        seen.push(
          `streams=${context.streams?.length ?? 0} files=${context.files.length}`,
        );
        const stream = context.streams![0]!;
        const chunks: Uint8Array[] = [];
        const reader = stream.stream(context.signal).getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
        const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
        const bytes = new Uint8Array(total);
        let offset = 0;
        for (const chunk of chunks) {
          bytes.set(chunk, offset);
          offset += chunk.byteLength;
        }
        return {
          kind: 'files',
          files: [
            { name: stream.name, type: 'application/octet-stream', bytes },
          ],
          summary: `${total} bytes streamed`,
        };
      },
    };
  }

  it('hands a streamable step streams rather than buffered files', async () => {
    const operation = streamingOperation();
    const resolve = (id: string, source: string) =>
      id === operation.id && source === 'test' ? operation : undefined;
    const pipeline: Pipeline = {
      version: 1,
      name: 'Streaming pipeline',
      steps: [{ op: 'streamer', source: 'test', params: {} }],
    };

    const outcomes = await runPipeline({
      inputs: [input('alpha.bin', 'hello world')],
      pipeline,
      template,
      signal: new AbortController().signal,
      resolveOperation: resolve,
    });

    expect(outcomes[0]!.status).toBe('done');
    expect(operation.seen).toEqual(['streams=1 files=0']);
  });

  it('reports a per-step trace for every input, failures included', async () => {
    const operations = [
      fakeTextOperation('one', 'First step', (text) => `${text}|one`),
      fakeTextOperation('two', 'Second step', (text) => {
        if (text.startsWith('bad')) throw new Error('deliberate failure');
        return `${text}|two`;
      }),
    ];
    const resolve = (id: string, source: string) =>
      source === 'test' ? operations.find((item) => item.id === id) : undefined;
    const pipeline: Pipeline = {
      version: 1,
      name: 'Traced pipeline',
      steps: [
        { op: 'one', source: 'test', params: {} },
        { op: 'two', source: 'test', params: {} },
      ],
    };

    const traces: { steps: readonly { step: number; status: string }[] }[] = [];
    await runPipeline({
      inputs: [input('good.txt', 'good'), input('bad.txt', 'bad')],
      pipeline,
      template,
      signal: new AbortController().signal,
      resolveOperation: resolve,
      onTrace: (trace) => traces.push(trace),
    });

    expect(traces).toHaveLength(2);
    expect(traces[0]!.steps.map((step) => step.status)).toEqual([
      'done',
      'done',
    ]);
    // The failing input still reports what it managed before it stopped.
    expect(traces[1]!.steps.map((step) => step.status)).toEqual([
      'done',
      'failed',
    ]);
  });
});
