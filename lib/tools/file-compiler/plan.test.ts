import { describe, expect, it } from 'vitest';
import {
  aspectWouldChange,
  findClarifications,
  planCompile,
  planLines,
  type InspectedImage,
} from './plan';
import type { ImageRequirement } from './requirement';

/** A 4000 × 3000 JPEG photograph with camera metadata and no transparency. */
const PHOTO: InspectedImage = {
  format: 'image/jpeg',
  width: 4000,
  height: 3000,
  byteLength: 5_000_000,
  hasAlpha: false,
  hasMetadata: true,
};

/** A 512 × 512 PNG logo with a transparent background. */
const LOGO: InspectedImage = {
  format: 'image/png',
  width: 512,
  height: 512,
  byteLength: 80_000,
  hasAlpha: true,
  hasMetadata: false,
};

/** A 800 x 400 PNG banner with transparency: neither square nor opaque. */
const WIDE_LOGO: InspectedImage = {
  format: 'image/png',
  width: 800,
  height: 400,
  byteLength: 120_000,
  hasAlpha: true,
  hasMetadata: false,
};

const ready = (requirement: ImageRequirement, input: InspectedImage) => {
  const outcome = planCompile(requirement, input);
  if (outcome.status !== 'ready') {
    throw new Error(`expected a plan, got ${outcome.status}`);
  }
  return outcome.plan;
};

const stepIds = (requirement: ImageRequirement, input: InspectedImage) =>
  ready(requirement, input).steps.map((step) => step.id);

describe('a file that cannot be worked on is refused, not planned', () => {
  it('refuses a file that is not a supported image', () => {
    const outcome = planCompile(
      { format: 'image/png' },
      { ...PHOTO, format: null },
    );
    expect(outcome.status).toBe('unsupported');
  });

  it('refuses an image whose size could not be read', () => {
    const outcome = planCompile({}, { ...PHOTO, width: 0, height: 0 });
    expect(outcome.status).toBe('unsupported');
  });
});

describe('clarifications exist only when this file makes them necessary', () => {
  it('asks where transparency should go when the container cannot keep it', () => {
    const clarifications = findClarifications({ format: 'image/jpeg' }, LOGO);
    expect(clarifications.map((c) => c.id)).toEqual(['transparency-to-opaque']);
    expect(clarifications[0]!.choices.map((c) => c.id)).toEqual([
      'white',
      'black',
      'use-png',
    ]);
  });

  it('does not ask about transparency for an image that has none', () => {
    expect(findClarifications({ format: 'image/jpeg' }, PHOTO)).toEqual([]);
  });

  it('does not ask once a background has already been chosen', () => {
    expect(
      findClarifications({ format: 'image/jpeg', background: '#ffffff' }, LOGO),
    ).toEqual([]);
  });

  it('asks how an exact size should reshape the image, when it would', () => {
    const clarifications = findClarifications(
      { exactWidth: 600, exactHeight: 600 },
      PHOTO,
    );
    expect(clarifications.map((c) => c.id)).toEqual(['exact-size-shape']);
    expect(clarifications[0]!.choices.map((c) => c.id)).toEqual([
      'crop',
      'pad',
      'stretch',
    ]);
    expect(clarifications[0]!.question).toContain('600 × 600');
  });

  it('does not ask when the exact size keeps the shape', () => {
    // 512 × 512 asked of a square logo changes nothing about its shape.
    expect(
      findClarifications({ exactWidth: 300, exactHeight: 300 }, LOGO),
    ).toEqual([]);
    // Nor when the visitor already said how to fit it.
    expect(
      findClarifications(
        { exactWidth: 600, exactHeight: 600, fit: 'crop' },
        PHOTO,
      ),
    ).toEqual([]);
  });

  it('compares aspect without floating-point ratios', () => {
    expect(
      aspectWouldChange(
        { width: 4000, height: 3000 },
        { width: 800, height: 600 },
      ),
    ).toBe(false);
    expect(
      aspectWouldChange(
        { width: 4000, height: 3000 },
        { width: 600, height: 600 },
      ),
    ).toBe(true);
    expect(
      aspectWouldChange({ width: 1, height: 3 }, { width: 2, height: 6 }),
    ).toBe(false);
  });

  it('does not ask about shape when the exact size matches the shape', () => {
    // The logo is 512 x 512, so 600 x 600 keeps it square. Only transparency
    // needs deciding — asking about a reshape that will not happen would be
    // interrogating someone about a problem they do not have.
    const outcome = planCompile(
      { format: 'image/jpeg', exactWidth: 600, exactHeight: 600 },
      LOGO,
    );
    expect(outcome.status).toBe('needs-decision');
    if (outcome.status !== 'needs-decision') return;
    expect(outcome.clarifications.map((c) => c.id)).toEqual([
      'transparency-to-opaque',
    ]);
  });

  it('withholds the plan until every decision is made', () => {
    const outcome = planCompile(
      { format: 'image/jpeg', exactWidth: 600, exactHeight: 600 },
      WIDE_LOGO,
    );
    expect(outcome.status).toBe('needs-decision');
    if (outcome.status !== 'needs-decision') return;
    // Transparency first: it changes the pixels, not just the framing.
    expect(outcome.clarifications.map((c) => c.id)).toEqual([
      'transparency-to-opaque',
      'exact-size-shape',
    ]);
  });

  it('every choice offered actually resolves what it was asked about', () => {
    for (const requirement of [
      { format: 'image/jpeg' as const },
      { exactWidth: 600, exactHeight: 600 },
    ]) {
      for (const input of [LOGO, PHOTO]) {
        for (const clarification of findClarifications(requirement, input)) {
          for (const choice of clarification.choices) {
            const next = { ...requirement, ...choice.patch };
            expect(
              findClarifications(next, input).map((c) => c.id),
            ).not.toContain(clarification.id);
          }
        }
      }
    }
  });
});

describe('the order of operations is structural, not cosmetic', () => {
  it('flattens transparency before it encodes', () => {
    const ids = stepIds({ format: 'image/jpeg', background: '#ffffff' }, LOGO);
    expect(ids.indexOf('flatten-background')).toBeLessThan(
      ids.indexOf('encode'),
    );
  });

  it('settles geometry before it searches for bytes', () => {
    const ids = stepIds(
      { format: 'image/jpeg', maxWidth: 1200, maxBytes: 200 * 1024 },
      PHOTO,
    );
    expect(ids.indexOf('resize-within')).toBeLessThan(
      ids.indexOf('search-quality'),
    );
    expect(ids.indexOf('encode')).toBeLessThan(ids.indexOf('search-quality'));
  });

  it('always verifies, and always last', () => {
    for (const requirement of [
      {},
      { format: 'image/webp' as const },
      { maxBytes: 100 * 1024 },
      { exactWidth: 100, exactHeight: 100, fit: 'pad' as const },
      { removeMetadata: true },
    ]) {
      const ids = stepIds(requirement, PHOTO);
      expect(ids).toContain('verify');
      expect(ids[ids.length - 1]).toBe('verify');
    }
  });

  it('contains only operations from the allowed set', () => {
    const allowed = new Set([
      'flatten-background',
      'resize-within',
      'resize-exact',
      'encode',
      'search-quality',
      'strip-metadata',
      'verify',
    ]);
    for (const id of stepIds(
      {
        format: 'image/jpeg',
        background: '#000000',
        exactWidth: 300,
        exactHeight: 300,
        fit: 'crop',
        maxBytes: 50 * 1024,
        removeMetadata: true,
      },
      LOGO,
    )) {
      expect(allowed.has(id)).toBe(true);
    }
  });

  it('plans the minimum: nothing asked for means encode and verify only', () => {
    expect(stepIds({}, PHOTO)).toEqual(['encode', 'verify']);
  });
});

describe('geometry', () => {
  it('leaves the size alone when nothing bounds it', () => {
    expect(ready({}, PHOTO).geometry).toEqual({ mode: 'keep' });
  });

  it('leaves the size alone when the image is already inside the bound', () => {
    expect(ready({ maxWidth: 5000 }, PHOTO).geometry).toEqual({ mode: 'keep' });
  });

  it('fits inside a maximum, keeping the shape, and never enlarges', () => {
    const geometry = ready({ maxWidth: 1200 }, PHOTO).geometry;
    expect(geometry.mode).toBe('within');
    expect(geometry.width).toBe(1200);
    expect(geometry.height).toBe(900);
  });

  it('honours the tighter of two maxima', () => {
    const geometry = ready({ maxWidth: 2000, maxHeight: 600 }, PHOTO).geometry;
    expect(geometry).toMatchObject({ mode: 'within', width: 800, height: 600 });
  });

  it('defaults an exact size to cropping rather than distorting', () => {
    const geometry = ready(
      { exactWidth: 300, exactHeight: 300 },
      LOGO,
    ).geometry;
    expect(geometry).toEqual({
      mode: 'exact',
      width: 300,
      height: 300,
      fit: 'crop',
    });
  });
});

describe('what the plan promises is exactly what verification will check', () => {
  it('checks the container it is about to write', () => {
    expect(ready({ format: 'image/webp' }, PHOTO).targets.format).toBe(
      'image/webp',
    );
  });

  it('keeps the input’s own container when no conversion was asked for', () => {
    expect(ready({ maxWidth: 100 }, PHOTO).outputFormat).toBe('image/jpeg');
    expect(ready({ maxWidth: 100 }, LOGO).outputFormat).toBe('image/png');
  });

  it('checks exact dimensions, and drops the maxima they supersede', () => {
    const targets = ready(
      { exactWidth: 300, exactHeight: 300, fit: 'crop', maxWidth: 4000 },
      LOGO,
    ).targets;
    expect(targets.exactWidth).toBe(300);
    expect(targets.maxWidth).toBeUndefined();
  });

  it('checks a byte limit whenever one was given', () => {
    expect(ready({ maxBytes: 250 * 1024 }, PHOTO).targets.maxBytes).toBe(
      250 * 1024,
    );
  });

  it('says nothing about transparency for an image that never had any', () => {
    expect(
      ready({ format: 'image/jpeg' }, PHOTO).targets.alphaChannel,
    ).toBeUndefined();
  });

  it('checks transparency was kept when the container can hold it', () => {
    const plan = ready({ format: 'image/png' }, LOGO);
    expect(plan.keepAlpha).toBe(true);
    expect(plan.targets.alphaChannel).toBe(true);
  });

  it('checks transparency is gone when it was flattened', () => {
    const plan = ready({ format: 'image/jpeg', background: '#ffffff' }, LOGO);
    expect(plan.keepAlpha).toBe(false);
    expect(plan.targets.alphaChannel).toBe(false);
    expect(plan.background).toBe('#ffffff');
  });

  it('checks metadata only when its removal was asked for', () => {
    expect(ready({ removeMetadata: true }, PHOTO).targets.metadataRemoved).toBe(
      true,
    );
    expect(ready({}, PHOTO).targets.metadataRemoved).toBeUndefined();
  });

  it('drops a quality number for PNG rather than pretending it applies', () => {
    expect(
      ready({ format: 'image/png', quality: 80 }, LOGO).quality,
    ).toBeUndefined();
    expect(ready({ format: 'image/webp', quality: 80 }, LOGO).quality).toBe(80);
  });
});

describe('the plan as a visitor reads it', () => {
  it('uses no internal vocabulary', () => {
    const lines = planLines(
      ready(
        {
          format: 'image/jpeg',
          background: '#ffffff',
          maxWidth: 1600,
          maxBytes: 1024 * 1024,
          removeMetadata: true,
        },
        LOGO,
      ),
    );
    const forbidden = [
      'pipeline',
      'operation id',
      'kernel',
      'ast',
      'serializer',
      'binary search',
      'constraint graph',
      'recipe',
    ];
    const text = lines.join(' ').toLowerCase();
    for (const word of forbidden) {
      expect(text).not.toContain(word);
    }
  });

  it('says what will happen in sentences', () => {
    const lines = planLines(
      ready(
        { format: 'image/jpeg', maxWidth: 1600, maxBytes: 1024 * 1024 },
        PHOTO,
      ),
    );
    expect(lines[0]).toContain('1600');
    expect(lines.join(' ')).toContain('JPEG');
    expect(lines[lines.length - 1]).toContain('check');
  });

  it('tells the truth about PNG and byte limits', () => {
    const lines = planLines(
      ready({ format: 'image/png', maxBytes: 20 * 1024 }, LOGO),
    );
    expect(lines.join(' ')).toContain('no quality to trade');
  });

  it('contains no file bytes and no filename, so it is safe to serialise', () => {
    const plan = ready({ format: 'image/jpeg', maxBytes: 1024 * 1024 }, PHOTO);
    const serialised = JSON.stringify(plan);
    expect(serialised).not.toContain('data:');
    expect(serialised).not.toContain('blob:');
    expect(serialised.length).toBeLessThan(4000);
  });

  it('is deterministic for the same requirement and file', () => {
    const first = JSON.stringify(
      ready({ format: 'image/jpeg', maxBytes: 1000 }, PHOTO),
    );
    for (let run = 0; run < 3; run += 1) {
      expect(
        JSON.stringify(ready({ format: 'image/jpeg', maxBytes: 1000 }, PHOTO)),
      ).toBe(first);
    }
  });
});
