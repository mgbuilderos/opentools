import { describe, expect, it } from 'vitest';
import type {
  KernelOperation,
  OperationInputKind,
  OperationParam,
} from '@/lib/kernel/types';
import {
  MAX_RECIPE_STEPS,
  buildRecipeSearch,
  buildRecipeUrl,
  deriveRecipeName,
  readRecipe,
  recipeParamNames,
  unshareableParams,
} from './recipe';
import type { Pipeline } from './types';

function param(
  id: string,
  serialisable: boolean,
  defaultValue = '',
): OperationParam {
  return {
    id,
    label: `${id} setting`,
    type: 'text',
    defaultValue,
    serialisable,
  };
}

function operation(
  id: string,
  input: OperationInputKind,
  output: 'text' | 'files',
  params: readonly OperationParam[] = [],
): KernelOperation {
  return {
    id,
    source: 'document',
    name: `Op ${id}`,
    description: `Op ${id}`,
    input,
    params,
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
  operation('pdf-split', 'file', 'files', [
    param('pages', true, '1-'),
    param('mask', false),
  ]),
  operation('compress', 'files', 'files', [param('quality', true, '82')]),
  operation('strip-metadata', 'files', 'files'),
  operation('zip', 'files', 'files'),
  operation('word-count', 'text', 'text'),
];
const resolve = (id: string, source: string) =>
  operations.find((item) => item.id === id && item.source === source);

function pipeline(
  steps: readonly { op: string; params?: Record<string, string> }[],
  name = 'Untitled pipeline',
): Pipeline {
  return {
    version: 1,
    name,
    steps: steps.map((step) => ({
      op: step.op,
      source: 'document',
      params: step.params ?? {},
    })),
  };
}

describe('a recipe link carries the steps and nothing the sender supplied', () => {
  // THE GATE. Everything below this is correctness; this is why the module is
  // shaped the way it is. A pipeline is chosen from the whole kernel, so it has
  // no fixed field list to vet against — the vetting is done by the operation
  // descriptors instead, and it has to hold against a caller passing anything.
  it('refuses to encode a value no descriptor declares as serialisable', () => {
    const smuggled = {
      pages: '1-3',
      mask: 'redact the Novak account number',
      filename: 'passport-scan.pdf',
      content: 'Dear Sir, my account number is 40012345',
      token: 'sk-live-9f1c',
      __proto__: 'polluted',
    };

    const { search } = buildRecipeSearch(
      pipeline([{ op: 'pdf-split', params: smuggled }]),
      resolve,
    );
    const keys = [...new URLSearchParams(search).keys()];

    expect(keys).toEqual(['s1', 's1.pages']);
    expect(search).toContain('1-3');
    for (const leak of [
      'mask',
      'Novak',
      'passport',
      'account',
      'sk-live',
      'polluted',
    ]) {
      expect(search, `leaked ${leak}`).not.toContain(leak);
    }
  });

  // People name pipelines after the thing they are working on. The JSON links
  // this module replaces carried that name verbatim.
  it('never writes the pipeline name into the link', () => {
    const named = pipeline(
      [{ op: 'pdf-split', params: { pages: '1-3' } }],
      "mum's passport scans for the Novak lease",
    );
    const { search } = buildRecipeSearch(named, resolve);

    expect(search).not.toContain('passport');
    expect(search).not.toContain('Novak');
    expect(search.toLowerCase()).not.toContain('mum');
  });

  it('gives an arriving recipe a name built from its own steps', () => {
    const { search } = buildRecipeSearch(
      pipeline([{ op: 'pdf-split' }, { op: 'compress' }], 'Novak lease'),
      resolve,
    );
    const result = readRecipe(search, resolve);

    expect(result.kind).toBe('recipe');
    if (result.kind !== 'recipe') return;
    expect(result.pipeline.name).toBe('Op pdf-split → Op compress');
  });

  it('names the settings a link cannot carry, so the recipient sets them', () => {
    const value = pipeline([{ op: 'pdf-split' }]);
    expect(unshareableParams(value, resolve)).toEqual([
      {
        step: 1,
        operation: 'Op pdf-split',
        param: 'mask',
        label: 'mask setting',
      },
    ]);
  });
});

describe('round trip', () => {
  it('restores the steps, in order, with their settings', () => {
    const original = pipeline([
      { op: 'pdf-split', params: { pages: '2-7' } },
      { op: 'compress', params: { quality: '60' } },
      { op: 'strip-metadata' },
      { op: 'zip' },
    ]);
    const { search } = buildRecipeSearch(original, resolve);
    const result = readRecipe(search, resolve);

    expect(result.kind).toBe('recipe');
    if (result.kind !== 'recipe') return;
    expect(result.pipeline.steps.map((step) => step.op)).toEqual([
      'pdf-split',
      'compress',
      'strip-metadata',
      'zip',
    ]);
    expect(result.pipeline.steps[0]!.params.pages).toBe('2-7');
    expect(result.pipeline.steps[1]!.params.quality).toBe('60');
  });

  it('leaves an unchanged setting out of the link but restores its default', () => {
    const { search } = buildRecipeSearch(
      pipeline([{ op: 'compress', params: { quality: '82' } }]),
      resolve,
    );
    expect(search).not.toContain('quality');

    const result = readRecipe(search, resolve);
    expect(result.kind).toBe('recipe');
    if (result.kind !== 'recipe') return;
    expect(result.pipeline.steps[0]!.params.quality).toBe('82');
  });

  it('stays short and readable rather than packed', () => {
    const { search, oversize } = buildRecipeSearch(
      pipeline([
        { op: 'pdf-split', params: { pages: '1-3' } },
        { op: 'compress', params: { quality: '60' } },
        { op: 'strip-metadata' },
        { op: 'zip' },
      ]),
      resolve,
    );

    expect(oversize).toBe(false);
    expect(search.length).toBeLessThan(200);
    // Readable: no escaping in the parts a recipient scans for.
    expect(search).toContain('s1=document.pdf-split');
    expect(search).toContain('s4=document.zip');
  });

  it('builds a full URL against an origin and path', () => {
    expect(
      buildRecipeUrl(
        'https://example.com',
        '/batch',
        pipeline([{ op: 'zip' }]),
        resolve,
      ),
    ).toBe('https://example.com/batch?s1=document.zip');
  });
});

describe('a link that cannot be trusted is refused whole', () => {
  it('reports an operation this version does not have', () => {
    const result = readRecipe(
      's1=document.pdf-split&s2=document.nope',
      resolve,
    );
    expect(result.kind).toBe('invalid');
    if (result.kind !== 'invalid') return;
    expect(result.reason).toContain('nope');
  });

  it('refuses a gap in the step numbering rather than silently closing it', () => {
    const result = readRecipe('s1=document.pdf-split&s3=document.zip', resolve);
    expect(result.kind).toBe('invalid');
    if (result.kind !== 'invalid') return;
    expect(result.reason).toContain('step 2');
  });

  it('refuses a step that does not name a source', () => {
    expect(readRecipe('s1=pdf-split', resolve).kind).toBe('invalid');
  });

  it('refuses a chain the validator would reject', () => {
    const result = readRecipe(
      's1=document.pdf-split&s2=document.word-count',
      resolve,
    );
    expect(result.kind).toBe('invalid');
  });

  it('refuses more steps than a link is allowed to carry', () => {
    const search = Array.from(
      { length: MAX_RECIPE_STEPS + 1 },
      (_unused, index) => `s${index + 1}=document.zip`,
    ).join('&');
    const result = readRecipe(search, resolve);
    expect(result.kind).toBe('invalid');
    if (result.kind !== 'invalid') return;
    expect(result.reason).toContain(String(MAX_RECIPE_STEPS));
  });

  it('refuses to build a link from more steps than it can carry', () => {
    expect(() =>
      buildRecipeSearch(
        pipeline(
          Array.from({ length: MAX_RECIPE_STEPS + 1 }, () => ({ op: 'zip' })),
        ),
        resolve,
      ),
    ).toThrow(/at most/u);
  });

  it('says so when a URL holds no recipe at all', () => {
    expect(readRecipe('tool=zip', resolve).kind).toBe('none');
    expect(readRecipe('', resolve).kind).toBe('none');
  });
});

describe('links shared before this format still open', () => {
  const legacy = JSON.stringify({
    version: 1,
    name: "mum's passport scans",
    steps: [
      { op: 'pdf-split', source: 'document', params: { pages: '4-9' } },
      { op: 'zip', source: 'document', params: {} },
    ],
  });

  it('reads the older whole-JSON parameter', () => {
    const result = readRecipe(
      `pipeline=${encodeURIComponent(legacy)}`,
      resolve,
    );
    expect(result.kind).toBe('recipe');
    if (result.kind !== 'recipe') return;
    expect(result.pipeline.steps.map((step) => step.op)).toEqual([
      'pdf-split',
      'zip',
    ]);
    expect(result.pipeline.steps[0]!.params.pages).toBe('4-9');
  });

  it('discards the name such a link carried', () => {
    const result = readRecipe(
      `pipeline=${encodeURIComponent(legacy)}`,
      resolve,
    );
    if (result.kind !== 'recipe') throw new Error('expected a recipe');
    expect(result.pipeline.name).not.toContain('passport');
    expect(result.pipeline.name).toBe('Op pdf-split → Op zip');
  });

  it('reports a malformed older link instead of throwing', () => {
    expect(readRecipe('pipeline=%7Bnot-json', resolve).kind).toBe('invalid');
  });
});

describe('housekeeping', () => {
  it('lists the query keys a recipe owns so the editor can clear them', () => {
    expect(recipeParamNames('s1=document.zip&s1.pages=1-3&tool=other')).toEqual(
      ['s1', 's1.pages'],
    );
  });

  it('shortens a long chain when naming it', () => {
    const name = deriveRecipeName(
      pipeline([
        { op: 'pdf-split' },
        { op: 'compress' },
        { op: 'strip-metadata' },
        { op: 'zip' },
      ]),
      resolve,
    );
    expect(name).toBe('Op pdf-split → Op compress → Op strip-metadata +1');
  });
});
