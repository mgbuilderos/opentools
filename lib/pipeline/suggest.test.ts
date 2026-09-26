import { describe, expect, it } from 'vitest';
import type { KernelOperation, OperationInputKind } from '@/lib/kernel/types';
import { canFollow, chainVerdict } from './chain';
import {
  candidateCount,
  candidateOperations,
  lastOperation,
  pipelineShape,
} from './suggest';
import type { Pipeline } from './types';
import { validate } from './validate';

function operation(
  id: string,
  name: string,
  input: OperationInputKind,
  output: 'text' | 'files',
  description = name,
): KernelOperation {
  return {
    id,
    source: 'document',
    name,
    description,
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
  operation('pdf-split', 'Split PDF', 'file', 'files', 'Burst a PDF by page'),
  operation('compress', 'Compress image', 'files', 'files'),
  operation('zip', 'Zip files', 'files', 'files'),
  operation('word-count', 'Count words', 'text', 'text'),
  operation('to-text', 'Extract text', 'file', 'text'),
  operation('qr', 'Make a QR code', 'none', 'files'),
];
const resolve = (id: string, source: string) =>
  operations.find((item) => item.id === id && item.source === source);

function pipeline(...ids: string[]): Pipeline {
  return {
    version: 1,
    name: 'Test pipeline',
    steps: ids.map((op) => ({ op, source: 'document', params: {} })),
  };
}

describe('the chaining rule', () => {
  it('lets files flow into a file or files input', () => {
    expect(canFollow(operations[0]!, operations[1]!)).toBe(true);
    expect(canFollow(operations[1]!, operations[2]!)).toBe(true);
  });

  it('refuses files into a text input, and says which shapes clashed', () => {
    const verdict = chainVerdict(operations[0]!, operations[3]!);
    expect(verdict.ok).toBe(false);
    if (verdict.ok) return;
    expect(verdict.code).toBe('kind-mismatch');
    if (verdict.code !== 'kind-mismatch') return;
    expect(verdict.produced).toBe('files');
    expect(verdict.accepts).toBe('text');
  });

  it('refuses a no-input operation anywhere but first', () => {
    const verdict = chainVerdict(operations[0]!, operations[5]!);
    expect(verdict.ok).toBe(false);
    if (verdict.ok) return;
    expect(verdict.code).toBe('input-none');
  });
});

describe('what the picker offers', () => {
  // THE POINT OF THE MODULE. The editor must never offer a step the validator
  // then rejects: that combination makes a chain unbuildable by the only route
  // a person has to build it.
  it('offers only steps the validator will accept after them', () => {
    for (const previous of operations) {
      for (const candidate of candidateOperations(operations, previous, {
        limit: operations.length,
      })) {
        const errors = validate(pipeline(previous.id, candidate.id), resolve);
        expect(errors, `${previous.id} → ${candidate.id}`).toEqual([]);
      }
    }
  });

  it('offers everything for the first step, including no-input operations', () => {
    const first = candidateOperations(operations, undefined, {
      limit: operations.length,
    });
    expect(first).toHaveLength(operations.length);
    expect(first.map((item) => item.id)).toContain('qr');
  });

  it('drops the no-input operation once a step exists', () => {
    const next = candidateOperations(operations, operations[0]!, {
      limit: operations.length,
    });
    expect(next.map((item) => item.id)).not.toContain('qr');
    expect(next.map((item) => item.id)).toEqual([
      'pdf-split',
      'compress',
      'zip',
      'to-text',
    ]);
  });

  it('searches name, description, id and source', () => {
    const byName = candidateOperations(operations, undefined, {
      query: 'split pdf',
    });
    expect(byName.map((item) => item.id)).toEqual(['pdf-split']);

    const byDescription = candidateOperations(operations, undefined, {
      query: 'burst',
    });
    expect(byDescription.map((item) => item.id)).toEqual(['pdf-split']);
  });

  it('admits a boosted id the query text would have missed', () => {
    const boosted = candidateOperations(operations, undefined, {
      query: 'nothing matches this',
      boostIds: new Set(['zip']),
    });
    expect(boosted.map((item) => item.id)).toEqual(['zip']);
  });

  it('never admits a boosted id that cannot follow the previous step', () => {
    const boosted = candidateOperations(operations, operations[0]!, {
      query: 'nothing matches this',
      boostIds: new Set(['word-count', 'qr']),
    });
    expect(boosted).toEqual([]);
  });

  it('honours the row cap', () => {
    expect(
      candidateOperations(operations, undefined, { limit: 2 }),
    ).toHaveLength(2);
  });

  it('counts what could follow, ignoring the search box', () => {
    expect(candidateCount(operations, undefined)).toBe(operations.length);
    expect(candidateCount(operations, operations[0]!)).toBe(4);
    expect(candidateCount(operations, operations[4]!)).toBe(1);
  });
});

describe('the shape of a built chain', () => {
  it('reports what each step takes and hands on', () => {
    expect(pipelineShape(pipeline('pdf-split', 'zip'), resolve)).toEqual([
      {
        step: 1,
        name: 'Split PDF',
        id: 'pdf-split',
        source: 'document',
        known: true,
        accepts: 'file',
        produces: 'files',
      },
      {
        step: 2,
        name: 'Zip files',
        id: 'zip',
        source: 'document',
        known: true,
        accepts: 'files',
        produces: 'files',
      },
    ]);
  });

  it('keeps an unresolved step in place so positions stay meaningful', () => {
    const shape = pipelineShape(pipeline('pdf-split', 'gone'), resolve);
    expect(shape).toHaveLength(2);
    expect(shape[1]!.known).toBe(false);
    expect(shape[1]!.step).toBe(2);
  });

  it('finds the step a new one would have to follow', () => {
    expect(lastOperation(pipeline('pdf-split', 'zip'), resolve)?.id).toBe(
      'zip',
    );
    expect(lastOperation(pipeline(), resolve)).toBeUndefined();
  });
});
