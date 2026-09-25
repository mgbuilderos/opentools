import { describe, expect, it, vi } from 'vitest';
import type {
  KernelOperation,
  OperationInputKind,
  OperationOutput,
  OperationResult,
} from '@/lib/kernel/types';
import type { Pipeline, PipelineArtifact } from './types';
import {
  artifactFromBlob,
  executePipeline,
  PipelineValidationError,
} from './execute';

function operation(options: {
  id: string;
  input: OperationInputKind;
  output: OperationOutput['kind'];
  run: KernelOperation['run'];
  upload?: 'none' | 'possible';
  assets?: 'none' | 'reported';
  streamable?: boolean;
}): KernelOperation {
  return {
    id: options.id,
    source: 'test',
    name: options.id,
    description: options.id,
    input: options.input,
    params: [],
    output: { kind: options.output },
    runtime: 'pure',
    deterministic: true,
    streamable: options.streamable ?? false,
    transfer: {
      userContentUpload: options.upload ?? 'none',
      engineAssets: options.assets ?? 'none',
    },
    run: options.run,
  };
}

function pipeline(...operations: readonly KernelOperation[]): Pipeline {
  return {
    version: 1,
    name: 'Reference chain',
    steps: operations.map((item) => ({
      op: item.id,
      source: item.source,
      params: {},
    })),
  };
}

function resolver(operations: readonly KernelOperation[]) {
  return (id: string, source: string) =>
    operations.find((item) => item.id === id && item.source === source);
}

function fileArtifact(bytes: Uint8Array): PipelineArtifact {
  return {
    kind: 'file',
    file: {
      name: 'input.bin',
      type: 'application/octet-stream',
      size: bytes.byteLength,
      lastModified: 0,
      bytes,
    },
  };
}

describe('executePipeline', () => {
  it('runs decode → transform → validate → package with a truthful trace', async () => {
    const decode = operation({
      id: 'decode',
      input: 'file',
      output: 'text',
      assets: 'reported',
      async run(context) {
        context.reportEngineDownload?.({ name: 'decoder.wasm', bytes: 4096 });
        return {
          kind: 'text',
          text: new TextDecoder().decode(context.files[0]!.bytes),
        };
      },
    });
    const transform = operation({
      id: 'transform',
      input: 'text',
      output: 'text',
      async run(context) {
        return { kind: 'text', text: context.text.toUpperCase() };
      },
    });
    const validate = operation({
      id: 'validate',
      input: 'text',
      output: 'text',
      async run(context) {
        if (!context.text.startsWith('VALID:'))
          throw new Error('Missing VALID prefix.');
        return { kind: 'text', text: context.text };
      },
    });
    const packageOperation = operation({
      id: 'package',
      input: 'text',
      output: 'files',
      async run(context) {
        return {
          kind: 'files',
          files: [
            {
              name: 'result.txt',
              type: 'text/plain',
              bytes: new TextEncoder().encode(context.text),
            },
          ],
          summary: 'Packaged one file.',
        };
      },
    });
    const operations = [decode, transform, validate, packageOperation];
    const input = new TextEncoder().encode('valid: payload');

    const result = await executePipeline({
      pipeline: pipeline(...operations),
      input: fileArtifact(input),
      signal: new AbortController().signal,
      resolveOperation: resolver(operations),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.artifact).toMatchObject({
      kind: 'files',
      files: [{ name: 'result.txt', size: input.byteLength }],
    });
    expect(result.trace.steps).toHaveLength(4);
    expect(
      result.trace.steps.map(({ id, inputBytes, outputBytes, status }) => ({
        id,
        inputBytes,
        outputBytes,
        status,
      })),
    ).toEqual([
      {
        id: 'decode',
        inputBytes: input.byteLength,
        outputBytes: input.byteLength,
        status: 'done',
      },
      {
        id: 'transform',
        inputBytes: input.byteLength,
        outputBytes: input.byteLength,
        status: 'done',
      },
      {
        id: 'validate',
        inputBytes: input.byteLength,
        outputBytes: input.byteLength,
        status: 'done',
      },
      {
        id: 'package',
        inputBytes: input.byteLength,
        outputBytes: input.byteLength,
        status: 'done',
      },
    ]);
    expect(result.trace.steps.every((step) => step.ms >= 0)).toBe(true);
    expect(result.trace.bytesUploaded).toBe(0);
    expect(result.trace.engineDownloads).toEqual([
      {
        name: 'decoder.wasm',
        bytes: 4096,
        step: 1,
        id: 'decode',
        source: 'test',
      },
    ]);
  });

  it('passes one in-memory artifact through three steps without serialising it', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const seen: Uint8Array[] = [];
    const operations = ['one', 'two', 'three'].map((id) =>
      operation({
        id,
        input: 'file',
        output: 'files',
        async run(context): Promise<OperationResult> {
          seen.push(context.files[0]!.bytes);
          return {
            kind: 'files',
            files: [
              {
                name: 'same.bin',
                type: 'application/octet-stream',
                bytes: context.files[0]!.bytes,
              },
            ],
            summary: 'Unchanged.',
          };
        },
      }),
    );

    const result = await executePipeline({
      pipeline: pipeline(...operations),
      input: fileArtifact(bytes),
      signal: new AbortController().signal,
      resolveOperation: resolver(operations),
    });

    expect(result.ok).toBe(true);
    expect(seen).toEqual([bytes, bytes, bytes]);
  });

  it('rejects an incompatible chain before step 1 executes', async () => {
    const firstRun = vi.fn(async () => ({
      kind: 'text' as const,
      text: 'decoded',
    }));
    const operations = [
      operation({
        id: 'decode',
        input: 'file',
        output: 'text',
        run: firstRun,
      }),
      operation({
        id: 'binary-only',
        input: 'file',
        output: 'files',
        async run() {
          return { kind: 'files', files: [], summary: 'unused' };
        },
      }),
    ];

    await expect(
      executePipeline({
        pipeline: pipeline(...operations),
        input: fileArtifact(new Uint8Array([1])),
        signal: new AbortController().signal,
        resolveOperation: resolver(operations),
      }),
    ).rejects.toBeInstanceOf(PipelineValidationError);
    expect(firstRun).not.toHaveBeenCalled();
  });

  it('returns the last good artifact and identifies a failed step', async () => {
    const operations = [
      operation({
        id: 'one',
        input: 'text',
        output: 'text',
        async run(context) {
          return { kind: 'text', text: `${context.text}|one` };
        },
      }),
      operation({
        id: 'two',
        input: 'text',
        output: 'text',
        async run() {
          throw new Error('deliberate failure');
        },
      }),
      operation({
        id: 'three',
        input: 'text',
        output: 'text',
        async run(context) {
          return { kind: 'text', text: `${context.text}|three` };
        },
      }),
    ];

    const result = await executePipeline({
      pipeline: pipeline(...operations),
      input: { kind: 'text', text: 'start' },
      signal: new AbortController().signal,
      resolveOperation: resolver(operations),
    });

    expect(result).toMatchObject({
      ok: false,
      lastGoodArtifact: { kind: 'text', text: 'start|one' },
      failedStep: {
        step: 2,
        id: 'two',
        source: 'test',
        message: 'deliberate failure',
      },
      trace: {
        steps: [
          { id: 'one', status: 'done' },
          {
            id: 'two',
            status: 'failed',
            outputBytes: null,
            error: 'deliberate failure',
          },
        ],
      },
    });
  });

  it('omits the zero-upload claim if any step can upload content', async () => {
    const maybeUpload = operation({
      id: 'maybe-upload',
      input: 'text',
      output: 'text',
      upload: 'possible',
      async run(context) {
        return { kind: 'text', text: context.text };
      },
    });
    const result = await executePipeline({
      pipeline: pipeline(maybeUpload),
      input: { kind: 'text', text: 'value' },
      signal: new AbortController().signal,
      resolveOperation: resolver([maybeUpload]),
    });

    expect(result.trace).not.toHaveProperty('bytesUploaded');
  });

  it('hands Blob input to a streamable step without reading the whole Blob', async () => {
    const blob = new Blob([new Uint8Array(3 * 1024 * 1024)]);
    const wholeRead = vi.spyOn(blob, 'arrayBuffer');
    const streamCount = operation({
      id: 'stream-count',
      input: 'file',
      output: 'text',
      streamable: true,
      async run(context) {
        const reader = context.streams![0]!.stream(context.signal).getReader();
        let size = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
        }
        return { kind: 'text', text: String(size) };
      },
    });

    const result = await executePipeline({
      pipeline: pipeline(streamCount),
      input: artifactFromBlob(blob, { name: 'large.bin' }),
      signal: new AbortController().signal,
      resolveOperation: resolver([streamCount]),
    });

    expect(result).toMatchObject({
      ok: true,
      artifact: { kind: 'text', text: String(blob.size) },
    });
    expect(wholeRead).not.toHaveBeenCalled();
  });
});
