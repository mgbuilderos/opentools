import { describe, expect, it } from 'vitest';
import { MAX_EDGE, QUALITY_CEILING, QUALITY_FLOOR } from '../exact-size';
import {
  applyResolution,
  describeLimit,
  describeRequirement,
  findConflicts,
  isEmptyRequirement,
  MAX_INPUT_BYTES,
  MIN_TARGET_BYTES,
  sanitiseRequirement,
  type ImageRequirement,
} from './requirement';

const clean = (input: unknown) => sanitiseRequirement(input).requirement;

describe('sanitiseRequirement accepts only declared fields', () => {
  it('keeps every valid field', () => {
    const input: ImageRequirement = {
      format: 'image/webp',
      maxBytes: 500 * 1024,
      maxWidth: 1200,
      maxHeight: 900,
      exactWidth: 600,
      exactHeight: 600,
      quality: 80,
      removeMetadata: true,
      keepTransparency: true,
      background: '#ffffff',
      fit: 'crop',
    };
    expect(clean(input)).toEqual(input);
  });

  it('drops a field this type does not declare', () => {
    const result = sanitiseRequirement({
      format: 'image/png',
      sharpen: 5,
      upscale: true,
      model: 'esrgan',
    });
    expect(Object.keys(result.requirement)).toEqual(['format']);
  });

  it('refuses a format the project cannot encode and verify', () => {
    for (const format of [
      'image/gif',
      'image/avif',
      'image/tiff',
      'image/heic',
      'jpeg',
      '',
    ]) {
      expect(clean({ format }).format).toBeUndefined();
    }
    expect(sanitiseRequirement({ format: 'image/avif' }).dropped).toContain(
      'Unsupported file type.',
    );
  });

  it('survives input that is not an object at all', () => {
    for (const input of [null, 42, 'jpeg', true, [], [1, 2, 3]]) {
      expect(() => sanitiseRequirement(input)).not.toThrow();
      expect(clean(input)).toEqual({});
    }
    expect(clean(undefined)).toEqual({});
  });
});

describe('bounds are enforced by refusal, never by clamping', () => {
  it('holds dimensions inside the engine’s own edge limit', () => {
    expect(clean({ maxWidth: 1 }).maxWidth).toBe(1);
    expect(clean({ maxWidth: MAX_EDGE }).maxWidth).toBe(MAX_EDGE);
    expect(clean({ maxWidth: MAX_EDGE + 1 }).maxWidth).toBeUndefined();
    expect(clean({ maxWidth: 0 }).maxWidth).toBeUndefined();
    expect(clean({ maxWidth: -5 }).maxWidth).toBeUndefined();
    expect(clean({ maxWidth: 12.5 }).maxWidth).toBeUndefined();
  });

  it('holds quality inside the range the encoder actually searches', () => {
    expect(clean({ quality: QUALITY_FLOOR }).quality).toBe(QUALITY_FLOOR);
    expect(clean({ quality: QUALITY_CEILING }).quality).toBe(QUALITY_CEILING);
    expect(clean({ quality: QUALITY_FLOOR - 1 }).quality).toBeUndefined();
    expect(clean({ quality: QUALITY_CEILING + 1 }).quality).toBeUndefined();
  });

  it('refuses a byte limit no file could ever be, and one larger than the input cap', () => {
    expect(clean({ maxBytes: MIN_TARGET_BYTES }).maxBytes).toBe(
      MIN_TARGET_BYTES,
    );
    expect(clean({ maxBytes: MIN_TARGET_BYTES - 1 }).maxBytes).toBeUndefined();
    expect(clean({ maxBytes: MAX_INPUT_BYTES }).maxBytes).toBe(MAX_INPUT_BYTES);
    expect(clean({ maxBytes: MAX_INPUT_BYTES + 1 }).maxBytes).toBeUndefined();
  });

  it('refuses NaN, Infinity and numeric strings', () => {
    for (const value of [Number.NaN, Infinity, -Infinity, '1200', null, {}]) {
      expect(clean({ maxWidth: value }).maxWidth).toBeUndefined();
      expect(clean({ maxBytes: value }).maxBytes).toBeUndefined();
      expect(clean({ quality: value }).quality).toBeUndefined();
    }
  });

  it('accepts only a real six-digit hex background', () => {
    expect(clean({ background: '#FFFFFF' }).background).toBe('#ffffff');
    expect(clean({ background: '#abc123' }).background).toBe('#abc123');
    for (const value of [
      '#fff',
      'white',
      'rgb(1,2,3)',
      '#12345g',
      'javascript:alert(1)',
      '',
    ]) {
      expect(clean({ background: value }).background).toBeUndefined();
    }
  });

  it('accepts only the three fit behaviours', () => {
    expect(clean({ fit: 'pad' }).fit).toBe('pad');
    for (const value of ['cover', 'contain', 'CROP', 'fill', 1]) {
      expect(clean({ fit: value }).fit).toBeUndefined();
    }
  });

  it('accepts only real booleans for the flags', () => {
    expect(clean({ removeMetadata: true }).removeMetadata).toBe(true);
    expect(clean({ removeMetadata: false }).removeMetadata).toBe(false);
    for (const value of ['true', 1, 'yes', {}]) {
      expect(clean({ removeMetadata: value }).removeMetadata).toBeUndefined();
    }
  });

  it('names what it dropped rather than silently discarding it', () => {
    const result = sanitiseRequirement({
      quality: 900,
      background: 'chartreuse',
      fit: 'cover',
    });
    expect(result.requirement).toEqual({});
    expect(result.dropped).toHaveLength(3);
  });
});

describe('prototype pollution cannot pass through the sanitiser', () => {
  const polluting = [
    '__proto__',
    'constructor',
    'prototype',
    '__defineGetter__',
    '__lookupGetter__',
  ];

  it('ignores polluting keys entirely', () => {
    for (const key of polluting) {
      const result = sanitiseRequirement({
        [key]: { polluted: true },
        format: 'image/png',
      });
      expect(Object.keys(result.requirement)).toEqual(['format']);
    }
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.prototype).not.toHaveProperty('polluted');
  });

  it('returns an object with an ordinary prototype', () => {
    const parsed = JSON.parse(
      '{"__proto__":{"polluted":true},"format":"image/png"}',
    );
    const result = sanitiseRequirement(parsed);
    expect(Object.getPrototypeOf(result.requirement)).toBe(Object.prototype);
    expect(
      (result.requirement as Record<string, unknown>).polluted,
    ).toBeUndefined();
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('never copies a field whose name merely looks plausible', () => {
    const result = sanitiseRequirement({
      formats: 'image/png',
      max_bytes: 100,
      Quality: 80,
      'exact-width': 600,
    });
    expect(result.requirement).toEqual({});
  });
});

describe('conflicts inside a stated requirement', () => {
  it('finds none in a requirement that holds together', () => {
    expect(
      findConflicts({
        format: 'image/jpeg',
        maxBytes: 200 * 1024,
        maxWidth: 1200,
      }),
    ).toEqual([]);
  });

  it('catches transparency asked of a container that has none', () => {
    const [conflict] = findConflicts({
      format: 'image/jpeg',
      keepTransparency: true,
    });
    expect(conflict?.id).toBe('transparency-vs-format');
    expect(conflict?.message).toContain('JPEG');
    expect(conflict?.resolutions.length).toBeGreaterThanOrEqual(2);
  });

  it('allows transparency in containers that can hold it', () => {
    expect(
      findConflicts({ format: 'image/png', keepTransparency: true }),
    ).toEqual([]);
    expect(
      findConflicts({ format: 'image/webp', keepTransparency: true }),
    ).toEqual([]);
  });

  it('catches an exact size a maximum forbids, on either axis', () => {
    expect(
      findConflicts({ exactWidth: 800, exactHeight: 800, maxWidth: 400 }).map(
        (c) => c.id,
      ),
    ).toContain('exact-width-over-max');
    expect(
      findConflicts({ exactWidth: 800, exactHeight: 800, maxHeight: 400 }).map(
        (c) => c.id,
      ),
    ).toContain('exact-height-over-max');
    // A maximum the exact size already satisfies is not a conflict.
    expect(
      findConflicts({
        exactWidth: 300,
        exactHeight: 300,
        maxWidth: 400,
        maxHeight: 400,
      }),
    ).toEqual([]);
  });

  it('catches an exact size missing one of its two edges', () => {
    expect(findConflicts({ exactWidth: 600 }).map((c) => c.id)).toContain(
      'incomplete-exact-size',
    );
    expect(findConflicts({ exactHeight: 600 }).map((c) => c.id)).toContain(
      'incomplete-exact-size',
    );
    expect(findConflicts({ exactWidth: 600, exactHeight: 600 })).toEqual([]);
  });

  it('catches a fit behaviour with nothing to fit to', () => {
    expect(findConflicts({ fit: 'crop' }).map((c) => c.id)).toContain(
      'fit-without-exact-size',
    );
    expect(
      findConflicts({ fit: 'crop', exactWidth: 10, exactHeight: 10 }),
    ).toEqual([]);
  });

  it('catches a quality number asked of PNG, which has no such knob', () => {
    expect(
      findConflicts({ format: 'image/png', quality: 80 }).map((c) => c.id),
    ).toContain('quality-vs-png');
    expect(findConflicts({ format: 'image/jpeg', quality: 80 })).toEqual([]);
    expect(findConflicts({ format: 'image/webp', quality: 80 })).toEqual([]);
  });

  it('catches keeping transparency and painting over it at once', () => {
    expect(
      findConflicts({ keepTransparency: true, background: '#ffffff' }).map(
        (c) => c.id,
      ),
    ).toContain('transparency-vs-background');
  });

  it('gives every conflict at least one bounded way out', () => {
    const everyConflict = [
      { format: 'image/jpeg' as const, keepTransparency: true },
      { keepTransparency: true, background: '#ffffff' },
      { exactWidth: 800, exactHeight: 800, maxWidth: 400 },
      { exactWidth: 600 },
      { fit: 'crop' as const },
      { format: 'image/png' as const, quality: 80 },
    ];
    for (const requirement of everyConflict) {
      for (const conflict of findConflicts(requirement)) {
        expect(conflict.resolutions.length).toBeGreaterThan(0);
        for (const resolution of conflict.resolutions) {
          expect(resolution.label.length).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe('applying a resolution actually resolves the conflict', () => {
  it('clears the conflict it was offered for, in every case', () => {
    const cases: ImageRequirement[] = [
      { format: 'image/jpeg', keepTransparency: true },
      { keepTransparency: true, background: '#ffffff' },
      { exactWidth: 800, exactHeight: 800, maxWidth: 400 },
      { exactHeight: 800, exactWidth: 800, maxHeight: 400 },
      { exactWidth: 600 },
      { fit: 'crop' },
      { format: 'image/png', quality: 80 },
    ];
    for (const requirement of cases) {
      const conflicts = findConflicts(requirement);
      expect(conflicts.length).toBeGreaterThan(0);
      for (const conflict of conflicts) {
        for (const resolution of conflict.resolutions) {
          const next = applyResolution(requirement, resolution);
          const remaining = findConflicts(next).map((c) => c.id);
          expect(remaining).not.toContain(conflict.id);
        }
      }
    }
  });

  it('does not mutate the requirement it was given', () => {
    const requirement: ImageRequirement = {
      format: 'image/jpeg',
      keepTransparency: true,
    };
    const [conflict] = findConflicts(requirement);
    applyResolution(requirement, conflict!.resolutions[0]!);
    expect(requirement).toEqual({
      format: 'image/jpeg',
      keepTransparency: true,
    });
  });
});

describe('the requirement read back in plain language', () => {
  it('states a maximum as a maximum, never as a resize', () => {
    expect(describeRequirement({ maxWidth: 1200 })).toEqual([
      'No wider than 1200 px',
    ]);
    expect(describeRequirement({ maxHeight: 800 })).toEqual([
      'No taller than 800 px',
    ]);
  });

  it('collapses an equal pair of maxima into one honest sentence', () => {
    expect(describeRequirement({ maxWidth: 1200, maxHeight: 1200 })).toEqual([
      'No side longer than 1200 px',
    ]);
  });

  it('reads a full requirement in a fixed order', () => {
    expect(
      describeRequirement({
        removeMetadata: true,
        maxWidth: 1200,
        format: 'image/jpeg',
        maxBytes: 2 * 1024 * 1024,
      }),
    ).toEqual([
      'JPEG',
      'Under 2 MB',
      'No wider than 1200 px',
      'Metadata removed',
    ]);
  });

  it('says nothing about fields the requirement never set', () => {
    expect(describeRequirement({})).toEqual([]);
    expect(describeRequirement({ format: 'image/png' })).toEqual(['PNG']);
  });

  it('never claims transparency was kept unless it was asked for', () => {
    expect(describeRequirement({ format: 'image/png' })).not.toContain(
      'Transparency kept',
    );
    expect(
      describeRequirement({ format: 'image/png', keepTransparency: true }),
    ).toContain('Transparency kept');
  });

  it('writes a limit the way it was most likely asked for', () => {
    expect(describeLimit(2 * 1024 * 1024)).toBe('2 MB');
    expect(describeLimit(500 * 1024)).toBe('500 KB');
    expect(describeLimit(40_000)).toBe('40,000 bytes');
  });

  it('knows when a requirement asks for nothing', () => {
    expect(isEmptyRequirement({})).toBe(true);
    expect(isEmptyRequirement({ format: 'image/png' })).toBe(false);
  });
});
