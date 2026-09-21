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
  findRecipe,
  recipeArrivalShape,
  sanitiseRecipeValues,
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

/**
 * The share now leaves from the completion receipt, which is a single dialog
 * mounted once in the shell — not from inside the tool that did the work. So
 * the settings travel as an id plus values across a component boundary, and
 * the privacy rule has to survive that trip. These cover the two functions
 * that carry it.
 */
describe('settings that cross the completion boundary', () => {
  it('resolves only ids that are actually declared', () => {
    for (const definition of ALL_RECIPES) {
      expect(findRecipe(definition.id)).toBe(definition);
    }
    expect(findRecipe('not-a-recipe')).toBeNull();
    expect(findRecipe('')).toBeNull();
    expect(findRecipe('__proto__')).toBeNull();
  });

  // The same gate as the encoder's, applied at the new boundary: a tool that
  // hands the receipt its whole state object must not be able to widen what
  // its own recipe carries.
  it('strips anything the definition does not declare', () => {
    const smuggled = {
      format: 'png',
      filename: 'salary-slip-march.pdf',
      text: 'confidential board minutes',
      quality: 5000,
      email: 'someone@example.com',
    };
    expect(sanitiseRecipeValues(IMAGE_OPTIMIZE_RECIPE, smuggled)).toEqual({
      format: 'png',
    });
  });

  it('keeps a full valid set of settings intact', () => {
    for (const definition of ALL_RECIPES) {
      const values = validValuesFor(definition);
      expect(sanitiseRecipeValues(definition, values), definition.id).toEqual(
        values,
      );
    }
  });
});

/**
 * Whether the loop is closing, read from the request alone.
 *
 * The site has no client-side analytics and must not gain any, so this is the
 * only signal that separates "a colleague opened the link I sent" from "someone
 * found us on a search engine". It has to be conservative in one direction:
 * a link whose settings the tool would ignore must not be counted as a share
 * that worked, or the number flatters itself.
 */
describe('a recipe arrival is distinguishable from a plain one', () => {
  it('counts a real shared link as a recipe arrival', () => {
    expect(
      recipeArrivalShape('/image/optimize', '?format=png&quality=70'),
    ).toBe('recipe');
    expect(recipeArrivalShape('/text/case-converter', '?mode=upper')).toBe(
      'recipe',
    );
    expect(recipeArrivalShape('/pdf/compress', '?metadata=on')).toBe('recipe');
  });

  it('counts someone who simply opened the tool as direct', () => {
    expect(recipeArrivalShape('/image/optimize', '')).toBe('direct');
    expect(recipeArrivalShape('/image/optimize', '?')).toBe('direct');
  });

  it('does not credit a link whose settings the tool would ignore', () => {
    // Every one of these is dropped by the definition, so the recipient lands
    // on plain defaults. Counting it as a working share would overstate the
    // loop in exactly the direction that flatters it.
    expect(recipeArrivalShape('/image/optimize', '?format=gif')).toBe('direct');
    expect(recipeArrivalShape('/image/optimize', '?quality=5000')).toBe(
      'direct',
    );
    expect(
      recipeArrivalShape('/image/optimize', '?filename=passport.pdf'),
    ).toBe('direct');
  });

  it('says direct for any path that declares no recipe', () => {
    expect(recipeArrivalShape('/', '?format=png')).toBe('direct');
    expect(recipeArrivalShape('/support', '?mode=upper')).toBe('direct');
  });

  // Every declared recipe must be observable, or a tool could be shared all
  // day and never show up in the counts.
  it('can see an arrival for every declared recipe', () => {
    for (const definition of ALL_RECIPES) {
      const search = buildRecipeSearch(definition, validValuesFor(definition));
      expect(
        recipeArrivalShape(definition.path, `?${search}`),
        definition.id,
      ).toBe('recipe');
    }
  });
});
