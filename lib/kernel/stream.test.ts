import { describe, expect, it, vi } from 'vitest';
import type { KernelOperation } from './types';
import {
  createStreamingFileInput,
  DEFAULT_STREAM_CHUNK_BYTES,
  type BlobSliceSource,
} from './stream';

const MIB = 1024 * 1024;

function syntheticSource(size: number, chunkSize: number) {
  const reusable = new ArrayBuffer(chunkSize);
  let largestRead = 0;
  let reads = 0;
  const source: BlobSliceSource = {
    size,
    slice(start, end) {
      const length = end - start;
      largestRead = Math.max(largestRead, length);
      reads += 1;
      return {
        size: length,
        async arrayBuffer() {
          return length === reusable.byteLength
            ? reusable
            : reusable.slice(0, length);
        },
      };
    },
  };
  return {
    source,
    measurements: () => ({ largestRead, reads }),
  };
}

async function byteCount(stream: ReadableStream<Uint8Array>): Promise<number> {
  const reader = stream.getReader();
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) return total;
    total += value.byteLength;
  }
}

describe('streaming kernel input', () => {
  it.each([
    ['300 MiB', 300 * MIB],
    ['1 GiB', 1024 * MIB],
  ])(
    'processes a synthetic %s operation input without a whole-file allocation',
    async (_label, size) => {
      const chunkSize = 8 * MIB;
      const { source, measurements } = syntheticSource(size, chunkSize);
      const input = createStreamingFileInput(
        source,
        {
          name: 'large.bin',
          type: 'application/octet-stream',
          lastModified: 0,
        },
        chunkSize,
      );
      const operation: KernelOperation = {
        id: 'stream-byte-count',
        source: 'test',
        name: 'Streaming byte count',
        description: 'Counts bytes without buffering the source.',
        input: 'file',
        params: [],
        output: { kind: 'text' },
        runtime: 'web',
        deterministic: true,
        streamable: true,
        chunkSizeBytes: chunkSize,
        transfer: { userContentUpload: 'none', engineAssets: 'none' },
        async run(context) {
          const stream = context.streams?.[0];
          if (!stream) throw new Error('Streaming input is required.');
          return {
            kind: 'text',
            text: String(await byteCount(stream.stream(context.signal))),
          };
        },
      };

      const result = await operation.run({
        text: '',
        files: [],
        streams: [input],
        params: {},
        signal: new AbortController().signal,
      });

      expect(result).toEqual({ kind: 'text', text: String(size) });
      expect(measurements().largestRead).toBe(chunkSize);
      expect(measurements().reads).toBe(Math.ceil(size / chunkSize));
    },
  );

  it('uses Blob.slice ranges and honours cancellation', async () => {
    const blob = new Blob([new Uint8Array(DEFAULT_STREAM_CHUNK_BYTES + 7)]);
    const slice = vi.spyOn(blob, 'slice');
    const controller = new AbortController();
    const input = createStreamingFileInput(blob, {
      name: 'sample.bin',
      type: blob.type,
      lastModified: 0,
    });
    const reader = input.stream(controller.signal).getReader();

    expect((await reader.read()).value?.byteLength).toBe(
      DEFAULT_STREAM_CHUNK_BYTES,
    );
    controller.abort();
    await expect(reader.read()).rejects.toMatchObject({ name: 'AbortError' });
    expect(slice).toHaveBeenCalledWith(0, DEFAULT_STREAM_CHUNK_BYTES);
    expect(slice).not.toHaveBeenCalledWith(0, blob.size);
  });
});
