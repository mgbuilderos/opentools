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

  /**
   * The case the test above cannot reach. Its three secrets are keys the
   * operation never declared, so they are dropped by the leftover-key sweep
   * and the `serialisable` check is never exercised: deleting that check
   * outright left all 13 pipeline tests green.
   *
   * A declared field marked `serialisable: false` is where the user's own
   * content actually lives -- 177 of the 631 registered operations have one,
   * and `youtube-description-template` has two textareas. That value must not
   * reach a saved or shared pipeline, and now a test says so.
   */
  it('drops a DECLARED field that is marked non-serialisable', () => {
    const pipeline: Pipeline = {
      version: 1,
      name: 'Describe the video',
      steps: [
        {
          op: 'youtube-description-template',
          source: 'creator',
          params: {
            links: 'https://drive.example.com/private-client-folder',
            chapters: '00:00 confidential internal review',
          },
        },
      ],
    };

    const json = serialisePipeline(pipeline);
    const value = JSON.parse(json) as Pipeline;

    expect(value.steps[0]?.params).toEqual({});
    expect(value.droppedParams).toEqual(['links', 'chapters']);
    expect(json).not.toContain('private-client-folder');
    expect(json).not.toContain('confidential internal review');
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
