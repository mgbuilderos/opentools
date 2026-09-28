import { describe, expect, it } from 'vitest';
import { executePipeline, artifactFromBlob } from '@/lib/pipeline/execute';
import type { LocalFileInput } from '@/lib/tools/file-workbench';
import { createStreamingFileInput } from '../stream';
import type { BlobSliceSource, StreamingFileInput } from '../stream';
import type { KernelOperation, OperationResult } from '../types';
import { fileOperations } from './file';
import { FILE_STREAM_PREFIX_BYTES } from './file-stream-prefixes';

const MIB = 1024 * 1024;

/**
 * A file large enough that a prefix read is unmistakably cheaper than a
 * buffered one, carrying a real signature so the inspectors have something to
 * recognise. The tail is patterned rather than zeroed so an operation reading
 * past its declared prefix would produce different output, not the same.
 */
function sample(name: string, type: string, header: readonly number[]) {
  const bytes = new Uint8Array(2 * MIB);
  bytes.set(header, 0);
  for (let index = header.length; index < bytes.length; index += 1)
    bytes[index] = (index * 31) % 251;
  return { name, type, bytes };
}

const CORPUS = [
  sample(
    'clip.mp4',
    'video/mp4',
    [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32],
  ),
  sample(
    'photo.png',
    'image/png',
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  ),
  sample('archive.zip', 'application/zip', [0x50, 0x4b, 0x03, 0x04]),
  // A file shorter than every declared prefix, and one with no bytes at all:
  // the prefix path must behave exactly like the buffered path at both edges.
  { name: 'tiny.txt', type: 'text/plain', bytes: new Uint8Array([0x68, 0x69]) },
  { name: 'nothing.bin', type: '', bytes: new Uint8Array(0) },
] as const;

function bufferedInputs(): readonly LocalFileInput[] {
  return CORPUS.map((file) => ({
    name: file.name,
    type: file.type,
    size: file.bytes.length,
    lastModified: 1_700_000_000_000,
    bytes: file.bytes,
  }));
}

/** Wraps a byte array as a Blob source that records every range it is asked for. */
function countingSource(bytes: Uint8Array) {
  const ranges: [number, number][] = [];
  const source: BlobSliceSource = {
    size: bytes.length,
    slice(start, end) {
      ranges.push([start, end]);
      const chunk = bytes.slice(start, end);
      return {
        size: chunk.byteLength,
        async arrayBuffer() {
          return chunk.buffer as ArrayBuffer;
        },
      };
    },
  };
  return { source, ranges };
}

function streamingInputs(): readonly StreamingFileInput[] {
  return CORPUS.map((file) =>
    createStreamingFileInput(countingSource(file.bytes).source, {
      name: file.name,
      type: file.type,
      lastModified: 1_700_000_000_000,
    }),
  );
}

function operationFor(id: string): KernelOperation {
  const operation = fileOperations.find((item) => item.id === id);
  if (!operation) throw new Error(`No file-workbench operation "${id}".`);
  return operation;
}

function defaultParams(operation: KernelOperation) {
  return Object.fromEntries(
    operation.params.map((param) => [param.id, param.defaultValue]),
  );
}

async function runBuffered(operation: KernelOperation) {
  return operation.run({
    text: '',
    files: bufferedInputs(),
    params: defaultParams(operation),
    signal: new AbortController().signal,
  });
}

async function runStreamed(operation: KernelOperation) {
  return operation.run({
    text: '',
    files: [],
    streams: streamingInputs(),
    params: defaultParams(operation),
    signal: new AbortController().signal,
  });
}

const STREAMABLE_IDS = Object.keys(FILE_STREAM_PREFIX_BYTES);

describe('streamable file-workbench operations', () => {
  it('declares every operation in the prefix table, and only those', () => {
    const declared = fileOperations
      .filter((operation) => operation.streamable === true)
      .map((operation) => operation.id)
      .toSorted();
    expect(declared).toEqual(STREAMABLE_IDS.toSorted());
  });

  it('publishes the declared prefix as the retained chunk size', () => {
    for (const [id, prefix] of Object.entries(FILE_STREAM_PREFIX_BYTES))
      expect(operationFor(id).chunkSizeBytes).toBe(prefix);
  });

  /**
   * The whole safety net. A prefix that is one byte short of what the
   * operation reads is a silently wrong answer in production; here it is a
   * failing assertion, because the tail of every corpus file is patterned
   * rather than blank.
   */
  it.each(STREAMABLE_IDS)(
    '%s produces identical output streamed and buffered',
    async (id) => {
      const operation = operationFor(id);
      const streamed: OperationResult = await runStreamed(operation);
      const buffered: OperationResult = await runBuffered(operation);
      expect(streamed).toEqual(buffered);
    },
  );

  it.each(STREAMABLE_IDS)('%s reads no more than its prefix', async (id) => {
    const operation = operationFor(id);
    const prefix = FILE_STREAM_PREFIX_BYTES[id]!;
    const seen: [number, number][] = [];
    const streams = CORPUS.map((file) => {
      const counted = countingSource(file.bytes);
      const input = createStreamingFileInput(counted.source, {
        name: file.name,
        type: file.type,
        lastModified: 1_700_000_000_000,
      });
      return { input, ranges: counted.ranges };
    });

    await operation.run({
      text: '',
      files: [],
      streams: streams.map((entry) => entry.input),
      params: defaultParams(operation),
      signal: new AbortController().signal,
    });

    for (const entry of streams) seen.push(...entry.ranges);
    for (const [start, end] of seen) {
      expect(start).toBe(0);
      expect(end).toBeLessThanOrEqual(prefix);
    }
    // Zero-byte operations touch the Blob not at all.
    if (prefix === 0) expect(seen).toEqual([]);
  });

  it('reports the real file size to a metadata operation reading no bytes', async () => {
    const result = await runStreamed(operationFor('file-metadata-viewer'));
    expect(result.kind).toBe('text');
    const entries = JSON.parse(result.kind === 'text' ? result.text : '[]') as {
      name: string;
      size: number;
    }[];
    expect(entries.map((entry) => entry.size)).toEqual(
      CORPUS.map((file) => file.bytes.length),
    );
  });

  it('slices a pipeline input instead of buffering it', async () => {
    const bytes = sample(
      'big.mp4',
      'video/mp4',
      [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32],
    ).bytes;
    const blob = new Blob([bytes], { type: 'video/mp4' });
    const slices: [number, number | undefined][] = [];
    const nativeSlice = blob.slice.bind(blob);
    blob.slice = ((start?: number, end?: number) => {
      slices.push([start ?? 0, end]);
      return nativeSlice(start, end);
    }) as Blob['slice'];

    const result = await executePipeline({
      pipeline: {
        version: 1,
        name: 'Identify',
        steps: [
          {
            op: 'file-signature-inspector',
            source: 'file-workbench',
            params: {},
          },
        ],
      },
      input: artifactFromBlob(blob, {
        name: 'big.mp4',
        type: 'video/mp4',
        lastModified: 0,
      }),
      signal: new AbortController().signal,
    });

    expect(result.ok).toBe(true);
    expect(result.ok && result.artifact.kind).toBe('text');
    expect(
      result.ok && result.artifact.kind === 'text' && result.artifact.text,
    ).toContain('ISO Base Media');
    // One bounded slice, never the whole two megabytes.
    expect(slices).toEqual([[0, 64]]);
  });

  it('leaves every other file operation buffered', () => {
    const buffered = fileOperations.filter(
      (operation) => operation.streamable !== true,
    );
    expect(buffered.length).toBeGreaterThan(0);
    for (const operation of buffered)
      expect(operation.chunkSizeBytes).toBeUndefined();
  });
});
