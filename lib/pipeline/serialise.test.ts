import { describe, expect, it } from 'vitest';
import type { Pipeline } from './types';
import {
  deserialisePipeline,
  serialisePipeline,
  sanitisePipeline,
} from './serialise';

describe('pipeline serialization', () => {
  it('writes only declared serialisable settings and records every drop', () => {
    const pipeline: Pipeline = {
      version: 1,
      name: 'Sort safely',
      steps: [
        {
          op: 'line-sorter',
          source: 'text',
          params: {
            sortDirection: 'descending',
            filename: 'client-merger.pdf',
            apiKey: 'sk_private_value',
            userText: 'confidential customer text',
          },
        },
      ],
    };

    const json = serialisePipeline(pipeline);
    const value = JSON.parse(json) as Pipeline;
    expect(value.steps[0]?.params).toEqual({ sortDirection: 'descending' });
    expect(value.droppedParams).toEqual(['filename', 'apiKey', 'userText']);
    expect(json).not.toContain('client-merger.pdf');
    expect(json).not.toContain('sk_private_value');
    expect(json).not.toContain('confidential customer text');
  });

  it('round-trips the stable file format without restoring dropped values', () => {
    const pipeline: Pipeline = {
      version: 1,
      name: 'Clean and reverse',
      steps: [
        { op: 'whitespace-remover', source: 'text', params: {} },
        { op: 'text-reverser', source: 'text', params: {} },
      ],
      droppedParams: ['filename'],
    };

    expect(deserialisePipeline(serialisePipeline(pipeline))).toEqual(
      sanitisePipeline(pipeline),
    );
  });

  it('refuses an imported step with no source', () => {
    expect(() =>
      deserialisePipeline(
        JSON.stringify({
          version: 1,
          name: 'Unsafe import',
          steps: [{ op: 'word-counter', params: {} }],
        }),
      ),
    ).toThrow('Step 1 (word-counter) requires a source.');
  });
});
