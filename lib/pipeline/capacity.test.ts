import { describe, expect, it } from 'vitest';
import { getOperation } from '@/lib/kernel/registry';
import type { KernelOperationDescriptor } from '@/lib/kernel/types';
import { describeCapacity, formatBytes, pipelineCapacity } from './capacity';

const MIB = 1024 * 1024;

function descriptor(
  overrides: Partial<KernelOperationDescriptor> = {},
): KernelOperationDescriptor {
  return {
    id: 'sample',
    source: 'test',
    name: 'Sample',
    description: 'Sample operation',
    input: 'file',
    params: [],
    output: { kind: 'files' },
    runtime: 'pure',
    deterministic: true,
    streamable: false,
    ...overrides,
  };
}

const streaming = descriptor({
  id: 'streams',
  name: 'Streaming step',
  streamable: true,
  chunkSizeBytes: 64,
});

describe('pipeline capacity', () => {
  it('reports nothing for an empty chain', () => {
    expect(pipelineCapacity([], {})).toMatchObject({
      steps: [],
      streams: false,
      inputCeilingBytes: null,
      inputLimitingFactor: 'unknown',
    });
    expect(describeCapacity(pipelineCapacity([], {}))).toBe('');
  });

  it('calls a chain streaming only when every step does', () => {
    expect(pipelineCapacity([streaming, streaming], {}).streams).toBe(true);
    const mixed = pipelineCapacity([streaming, descriptor(), streaming], {});
    expect(mixed.streams).toBe(false);
    expect(mixed.buffering).toEqual([2]);
  });

  it('names every buffering step, not just the first', () => {
    const capacity = pipelineCapacity(
      [descriptor(), streaming, descriptor(), descriptor()],
      {},
    );
    expect(capacity.buffering).toEqual([1, 3, 4]);
    expect(describeCapacity(capacity)).toContain('Steps 1, 3 and 4 read');
  });

  /**
   * The whole reason this module exists rather than a `Math.min` in the view.
   * A later step's ceiling is a true statement about that step and a guess
   * about the file the visitor picks, because nothing knows how much the
   * steps before it grew or shrank the data.
   */
  it('takes the input ceiling from the first step alone', () => {
    const capacity = pipelineCapacity(
      [
        descriptor({ inputLimitBytes: 400 * MIB }),
        descriptor({ inputLimitBytes: 1 * MIB }),
      ],
      {},
    );
    expect(capacity.inputCeilingBytes).toBe(400 * MIB);
  });

  it('reports no ceiling when a streaming step is first', () => {
    const capacity = pipelineCapacity(
      [streaming, descriptor({ inputLimitBytes: MIB })],
      {},
    );
    expect(capacity.inputCeilingBytes).toBeNull();
    expect(capacity.buffering).toEqual([2]);
  });

  it('says it cannot say, rather than inventing a limit', () => {
    const capacity = pipelineCapacity([descriptor()], {});
    expect(capacity.inputCeilingBytes).toBeNull();
    expect(describeCapacity(capacity)).toContain(
      'not something this page can honestly put a number on',
    );
    expect(describeCapacity(capacity)).not.toMatch(/\d+\s*(KB|MB|GB)/u);
  });

  it('blames neither side when only one half of the figure is missing', () => {
    const noMultiplier = describeCapacity(
      pipelineCapacity([descriptor()], { heapLimitBytes: 512 * MIB }),
    );
    const noHeap = describeCapacity(
      pipelineCapacity([descriptor({ workingSetMultiplier: 4 })], {}),
    );
    expect(noMultiplier).toBe(noHeap);
    expect(noMultiplier).not.toContain('browser');
  });

  it('derives a device ceiling from the declared working set', () => {
    const capacity = pipelineCapacity(
      [descriptor({ workingSetMultiplier: 4 })],
      { heapLimitBytes: 512 * MIB },
    );
    expect(capacity.inputCeilingBytes).toBe(128 * MIB);
    expect(describeCapacity(capacity)).toContain('about 128 MB');
  });

  it('warns when the picked file is past the ceiling', () => {
    const capacity = pipelineCapacity(
      [descriptor({ inputLimitBytes: 100 * MIB })],
      {},
    );
    expect(describeCapacity(capacity, 250 * MIB)).toContain(
      'this run is expected to fail',
    );
    expect(describeCapacity(capacity, 50 * MIB)).not.toContain('fail');
  });

  it('quotes the largest chunk a streaming chain holds', () => {
    const capacity = pipelineCapacity(
      [streaming, descriptor({ streamable: true, chunkSizeBytes: 65_536 })],
      {},
    );
    expect(describeCapacity(capacity)).toBe(
      'Every step streams, so file size is not the limit here. The most any step holds at once is 64 KB.',
    );
  });

  it('stays quiet when the first step is handed text rather than a file', () => {
    const capacity = pipelineCapacity(
      [descriptor({ input: 'text' }), descriptor()],
      { heapLimitBytes: 512 * MIB },
    );
    expect(capacity.steps).toEqual([]);
    expect(describeCapacity(capacity)).toBe('');
  });

  it('says plainly when no step reads any content', () => {
    const capacity = pipelineCapacity(
      [descriptor({ streamable: true, chunkSizeBytes: 0 })],
      {},
    );
    expect(describeCapacity(capacity)).toContain(
      'No step reads any of the file\u2019s content at all.',
    );
  });

  it('describes the real streaming operations from the manifest', () => {
    const hex = getOperation('hex-viewer', 'file-workbench')!;
    const metadata = getOperation('file-metadata-viewer', 'file-workbench')!;
    const capacity = pipelineCapacity([metadata, hex], {});
    expect(capacity.streams).toBe(true);
    expect(capacity.inputCeilingBytes).toBeNull();
    expect(describeCapacity(capacity)).toContain('Every step streams');
  });
});

describe('byte formatting', () => {
  it.each([
    [0, '0 bytes'],
    [64, '64 bytes'],
    [1023, '1023 bytes'],
    [1024, '1.0 KB'],
    [65_536, '64 KB'],
    [10 * 1024 * 1024, '10 MB'],
    [2.5 * 1024 * 1024 * 1024, '2.5 GB'],
  ])('renders %i as %s', (bytes, expected) => {
    expect(formatBytes(bytes)).toBe(expected);
  });
});
