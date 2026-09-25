export const DEFAULT_STREAM_CHUNK_BYTES = 4 * 1024 * 1024;

export interface BlobSlice {
  readonly size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export interface BlobSliceSource {
  readonly size: number;
  slice(start: number, end: number): BlobSlice;
}

export interface StreamingFileMetadata {
  name: string;
  path?: string;
  type: string;
  lastModified: number;
}

export interface StreamingFileInput extends StreamingFileMetadata {
  readonly size: number;
  readonly chunkSizeBytes: number;
  read(start: number, end: number, signal?: AbortSignal): Promise<Uint8Array>;
  stream(signal?: AbortSignal): ReadableStream<Uint8Array>;
}

export interface StreamBlobOptions {
  chunkSizeBytes?: number;
  start?: number;
  end?: number;
  signal?: AbortSignal;
}

function abortError(): DOMException {
  return new DOMException('The operation was cancelled.', 'AbortError');
}

function assertChunkSize(chunkSizeBytes: number): void {
  if (!Number.isSafeInteger(chunkSizeBytes) || chunkSizeBytes <= 0) {
    throw new RangeError('Chunk size must be a positive safe integer.');
  }
}

function assertRange(size: number, start: number, end: number): void {
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 0 ||
    end < start ||
    end > size
  ) {
    throw new RangeError(`Byte range ${start}-${end} is outside 0-${size}.`);
  }
}

async function readSlice(
  source: BlobSliceSource,
  start: number,
  end: number,
  signal?: AbortSignal,
): Promise<Uint8Array> {
  if (signal?.aborted) throw abortError();
  assertRange(source.size, start, end);
  const slice = source.slice(start, end);
  const bytes = new Uint8Array(await slice.arrayBuffer());
  if (signal?.aborted) throw abortError();
  if (bytes.byteLength !== end - start) {
    throw new Error(
      `Blob slice ${start}-${end} returned ${bytes.byteLength} bytes instead of ${end - start}.`,
    );
  }
  return bytes;
}

/**
 * Streams a Blob-compatible source with one bounded slice per pull. The
 * browser never receives a request for the source's complete ArrayBuffer.
 */
export function streamBlobChunks(
  source: BlobSliceSource,
  options: StreamBlobOptions = {},
): ReadableStream<Uint8Array> {
  const chunkSizeBytes = options.chunkSizeBytes ?? DEFAULT_STREAM_CHUNK_BYTES;
  assertChunkSize(chunkSizeBytes);
  const start = options.start ?? 0;
  const end = options.end ?? source.size;
  assertRange(source.size, start, end);
  let offset = start;

  return new ReadableStream<Uint8Array>(
    {
      async pull(controller) {
        if (options.signal?.aborted) {
          controller.error(abortError());
          return;
        }
        if (offset >= end) {
          controller.close();
          return;
        }
        const chunkEnd = Math.min(end, offset + chunkSizeBytes);
        try {
          const chunk = await readSlice(
            source,
            offset,
            chunkEnd,
            options.signal,
          );
          offset = chunkEnd;
          controller.enqueue(chunk);
        } catch (error) {
          controller.error(error);
        }
      },
    },
    { highWaterMark: 1 },
  );
}

export function createStreamingFileInput(
  source: BlobSliceSource,
  metadata: StreamingFileMetadata,
  chunkSizeBytes = DEFAULT_STREAM_CHUNK_BYTES,
): StreamingFileInput {
  assertChunkSize(chunkSizeBytes);
  return {
    ...metadata,
    size: source.size,
    chunkSizeBytes,
    read: (start, end, signal) => readSlice(source, start, end, signal),
    stream: (signal) => streamBlobChunks(source, { chunkSizeBytes, signal }),
  };
}
