import { describe, expect, it } from 'vitest';

import { isLiveToolUrl } from '@/lib/seo/live-tools';
import { textCaseOptions } from '@/lib/tools/text-case';

import {
  ALL_RECIPES,
  IMAGE_OPTIMIZE_RECIPE,
  PDF_COMPRESS_RECIPE,
  TEXT_CASE_RECIPE,
  buildRecipeSearch,
  buildRecipeUrl,
  describeRecipe,
  readRecipeValues,
  recipeParamNames,
  type RecipeDefinition,
} from './recipe-link';

/** A full, valid set of settings for one definition, built from its own rules. */
function validValuesFor(definition: RecipeDefinition) {
  const values: Record<string, string | number | boolean> = {};
  for (const field of definition.fields) {
    if (field.kind === 'choice') values[field.param] = field.choices[0].value;
    else if (field.kind === 'flag') values[field.param] = true;
    else values[field.param] = field.min;
  }
  return values;
}

describe('recipe links carry settings and nothing else', () => {
  // THE GATE. Everything else in this file is correctness; this is the reason
  // the module is shaped the way it is. If a future field, or a careless call
  // site passing a whole component state object, ever puts a filename or the
  // user's text into a shareable URL, this fails.
  it('refuses to encode any value the definition does not declare', () => {
    const smuggled = {
      filename: 'passport-scan.pdf',
      content: 'Dear Sir, my account number is 40012345',
      text: 'confidential board minutes',
      token: 'sk-live-9f1c',
      hash: 'e3b0c44298fc1c149afbf4c8996fb924',
      email: 'someone@example.com',
      __proto__: 'polluted',
    };

    for (const definition of ALL_RECIPES) {
      const search = buildRecipeSearch(definition, {
        ...validValuesFor(definition),
        ...smuggled,
      });
      const params = new URLSearchParams(search);
      const allowed = new Set(recipeParamNames(definition));

      for (const key of params.keys()) {
        expect(allowed.has(key), `${definition.id} leaked param ${key}`).toBe(
          true,
        );
      }
      for (const secret of Object.values(smuggled)) {
        expect(search, `${definition.id} leaked a value`).not.toContain(
          secret.slice(0, 12),
        );
      }
    }
  });

  it('round-trips every declared recipe without drift', () => {
    for (const definition of ALL_RECIPES) {
      const values = validValuesFor(definition);
      const search = buildRecipeSearch(definition, values);
      expect(readRecipeValues(definition, search), definition.id).toEqual(
        values,
      );
    }
  });

  it('gives every declared recipe a unique, URL-safe param name', () => {
    for (const definition of ALL_RECIPES) {
      const names = recipeParamNames(definition);
      expect(new Set(names).size, `${definition.id} has a duplicate`).toBe(
        names.length,
      );
      for (const name of names) {
        expect(name, `${definition.id}: ${name}`).toMatch(/^[a-z][a-z0-9]*$/);
        // `tool` is the existing deep-link param. A recipe claiming it would
        // silently reopen a different operation.
        expect(name).not.toBe('tool');
      }
    }
  });

  it('points every recipe at a route that really runs a tool', () => {
    for (const definition of ALL_RECIPES) {
      expect(isLiveToolUrl(definition.path), definition.path).toBe(true);
    }
  });
});

describe('a value that could not have been chosen is dropped, not honoured', () => {
  it('drops an out-of-range integer instead of clamping it', () => {
    // Clamping would silently run a job at a setting nobody picked. Dropping
    // leaves the tool on its own default, which is what the page already shows.
    expect(readRecipeValues(IMAGE_OPTIMIZE_RECIPE, 'quality=5000')).toEqual({});
    expect(readRecipeValues(IMAGE_OPTIMIZE_RECIPE, 'quality=0')).toEqual({});
    expect(readRecipeValues(IMAGE_OPTIMIZE_RECIPE, 'width=0')).toEqual({});
    expect(readRecipeValues(IMAGE_OPTIMIZE_RECIPE, 'width=12001')).toEqual({});
  });

  it('rejects the numeric spellings Number() would have accepted', () => {
    for (const raw of ['', ' ', '0x10', '1e3', '1.5', '+50', 'Infinity']) {
      expect(
        readRecipeValues(IMAGE_OPTIMIZE_RECIPE, `quality=${raw}`),
        raw,
      ).toEqual({});
    }
  });

  it('drops a choice that is not on the list', () => {
    expect(readRecipeValues(IMAGE_OPTIMIZE_RECIPE, 'format=gif')).toEqual({});
    expect(readRecipeValues(IMAGE_OPTIMIZE_RECIPE, 'format=')).toEqual({});
    expect(readRecipeValues(IMAGE_OPTIMIZE_RECIPE, 'format=webp')).toEqual({
      format: 'webp',
    });
  });

  it('reads a flag only as the two words it writes', () => {
    expect(readRecipeValues(PDF_COMPRESS_RECIPE, 'metadata=on')).toEqual({
      metadata: true,
    });
    expect(readRecipeValues(PDF_COMPRESS_RECIPE, 'metadata=off')).toEqual({
      metadata: false,
    });
    for (const raw of ['true', '1', 'yes', 'ON', '']) {
      expect(readRecipeValues(PDF_COMPRESS_RECIPE, `metadata=${raw}`)).toEqual(
        {},
      );
    }
  });

  it('keeps the good half of a partly broken link', () => {
    expect(
      readRecipeValues(IMAGE_OPTIMIZE_RECIPE, 'format=webp&quality=9999'),
    ).toEqual({ format: 'webp' });
  });

  it('ignores params belonging to another tool', () => {
    expect(
      readRecipeValues(TEXT_CASE_RECIPE, 'mode=upper&quality=82&tool=other'),
    ).toEqual({ mode: 'upper' });
  });
});

describe('the recipient can read what will happen before it happens', () => {
  it('describes a full image recipe in plain words', () => {
    expect(
      describeRecipe(IMAGE_OPTIMIZE_RECIPE, {
        format: 'webp',
        quality: 82,
        width: 1600,
        height: 1600,
      }),
    ).toBe('WebP · quality 82 · max width 1600 px · max height 1600 px');
  });

  it('describes both sides of a flag rather than only the on state', () => {
    expect(
      describeRecipe(PDF_COMPRESS_RECIPE, {
        recompress: false,
        metadata: true,
      }),
    ).toBe('images left untouched · metadata removed');
  });

  it('describes only the settings the link actually carries', () => {
    expect(describeRecipe(IMAGE_OPTIMIZE_RECIPE, { format: 'png' })).toBe(
      'PNG',
    );
    expect(describeRecipe(IMAGE_OPTIMIZE_RECIPE, {})).toBe('');
  });
});

describe('the link that gets copied', () => {
  it('is absolute and lands on the tool page', () => {
    expect(
      buildRecipeUrl(
        IMAGE_OPTIMIZE_RECIPE,
        { format: 'webp', quality: 82 },
        'https://getopentools.com',
      ),
    ).toBe('https://getopentools.com/image/optimize?format=webp&quality=82');
  });

  it('does not double the slash when the origin carries one', () => {
    expect(
      buildRecipeUrl(TEXT_CASE_RECIPE, {}, 'https://getopentools.com/'),
    ).toBe('https://getopentools.com/text/case-converter');
  });
});

describe('the declarations stay honest about the tools they describe', () => {
  // A recipe is a promise that the setting it names exists on the page. These
  // two tie the promise to the page's own source, so a control renamed or
  // removed there breaks the build instead of shipping a dead share link.
  it('offers exactly the case modes the text tool offers', () => {
    const declared = TEXT_CASE_RECIPE.fields[0];
    expect(declared.kind).toBe('choice');
    if (declared.kind !== 'choice') return;
    expect(declared.choices.map((choice) => choice.value)).toEqual(
      textCaseOptions.map((option) => option.id),
    );
    expect(declared.choices.map((choice) => choice.label)).toEqual(
      textCaseOptions.map((option) => option.label),
    );
  });

  it('offers exactly the photo sizes the compressor offers', () => {
    const declared = PDF_COMPRESS_RECIPE.fields.find(
      (field) => field.param === 'maxedge',
    );
    expect(declared?.kind).toBe('choice');
    if (declared?.kind !== 'choice') return;
    expect(declared.choices.map((choice) => choice.value)).toEqual([
      '4000',
      '2400',
      '1600',
      '1000',
    ]);
  });
});
