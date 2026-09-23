import { describe, expect, it } from 'vitest';
import type {
  KernelOperation,
  OperationInputKind,
  OperationOutput,
} from '@/lib/kernel/types';
import type { Pipeline } from './types';
import { validate } from './validate';

function operation(
  id: string,
  name: string,
  input: OperationInputKind,
  output: OperationOutput['kind'],
): KernelOperation {
  return {
    id,
    source: 'test',
    name,
    description: name,
    input,
    params: [],
    output: { kind: output },
    runtime: 'pure',
    deterministic: true,
    async run() {
      return output === 'text'
        ? { kind: 'text', text: 'ok' }
        : { kind: 'files', files: [], summary: 'ok' };
    },
  };
}

const operations = [
  operation('text-out', 'Text producer', 'text', 'text'),
  operation('file-out', 'File producer', 'file', 'files'),
  operation('text-in', 'Text consumer', 'text', 'text'),
  operation('file-in', 'File consumer', 'file', 'files'),
  operation('files-in', 'Files consumer', 'files', 'files'),
  operation('none-in', 'No-input generator', 'none', 'text'),
];
const resolve = (id: string, source: string) =>
  operations.find((item) => item.id === id && item.source === source);

function pipeline(...ids: string[]): Pipeline {
  return {
    version: 1,
    name: 'Test pipeline',
    steps: ids.map((op) => ({ op, source: 'test', params: {} })),
  };
}

describe('validate pipeline', () => {
  it('requires source on every step and names the operation', () => {
    const value = pipeline('text-out');
    const withoutSource = {
      ...value,
      steps: [{ op: 'text-out', params: {} }],
    } as unknown as Pipeline;

    expect(validate(withoutSource, resolve)).toEqual([
      'step 1 "text-out" is invalid: source is required for text-out.',
    ]);
  });

  it('names an unknown operation, source, and step index', () => {
    expect(validate(pipeline('missing'), resolve)[0]).toContain(
      'step 1 "missing @ test" is unknown',
    );
  });

  it('rejects text output feeding a file input and names both operations', () => {
    const [error] = validate(pipeline('text-out', 'file-in'), resolve);
    expect(error).toContain('step 1 "Text producer"');
    expect(error).toContain('step 2 "File consumer"');
    expect(error).toContain('outputs text');
  });

  it('rejects files output feeding a text input and names both operations', () => {
    const [error] = validate(pipeline('file-out', 'text-in'), resolve);
    expect(error).toContain('step 1 "File producer"');
    expect(error).toContain('step 2 "Text consumer"');
    expect(error).toContain('outputs files');
  });

  it('rejects a no-input operation after the first step and names both', () => {
    const [error] = validate(pipeline('text-out', 'none-in'), resolve);
    expect(error).toContain('step 1 "Text producer"');
    expect(error).toContain('step 2 "No-input generator"');
    expect(error).toContain('may only be first');
  });

  it('accepts text-to-text and files-to-file/files chains', () => {
    expect(validate(pipeline('text-out', 'text-in'), resolve)).toEqual([]);
    expect(validate(pipeline('file-out', 'file-in'), resolve)).toEqual([]);
    expect(validate(pipeline('file-out', 'files-in'), resolve)).toEqual([]);
  });
});
