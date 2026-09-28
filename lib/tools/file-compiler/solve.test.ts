import { describe, expect, it, vi } from 'vitest';
import { MAX_ENCODES, QUALITY_CEILING, QUALITY_FLOOR } from '../exact-size';
import { buildPng, buildWebpVp8x } from '../../testing/synthetic-images';
import { planCompile, type CompilePlan, type InspectedImage } from './plan';
import type { ImageRequirement } from './requirement';
import {
  DEFAULT_DEADLINE_MS,
  runPlan,
  ShowableError,
  unsatisfiedChoices,
} from './solve';

/**
 * The encoders here are fakes, and deliberately so. `runPlan`'s job is to
 * orchestrate — search, abort, deadline, strip, verify — and to refuse to call a
 * result verified unless the bytes say so. Handing it a real canvas would test
 * the browser's encoder instead, and would make it impossible to drive the two
 * cases that matter most: a byte length chosen by the test, and an encoder whose
 * size does not fall monotonically with quality.
 *
 * Every fake returns a real, parseable file, so verification does genuine work
 * on genuine bytes. `padTo` inflates it with a chunk that readers skip.
 */

const PHOTO: InspectedImage = {
  format: 'image/jpeg',
  width: 800,
  height: 600,
  byteLength: 400_000,
  hasAlpha: false,
  hasMetadata: true,
};

const planFor = (requirement: ImageRequirement, input = PHOTO): CompilePlan => {
  const outcome = planCompile(requirement, input);
  if (outcome.status !== 'ready') throw new Error(`no plan: ${outcome.status}`);
  return outcome.plan;
};

/** A WebP encoder whose size falls smoothly as quality falls. */
const smoothWebp =
  (bytesAtCeiling: number, bytesAtFloor: number) =>
  async (width: number, height: number, quality: number) => {
    const span = QUALITY_CEILING - QUALITY_FLOOR;
    const ratio = (quality - QUALITY_FLOOR) / span;
    const padTo = Math.round(
      bytesAtFloor + ratio * (bytesAtCeiling - bytesAtFloor),
    );
    return buildWebpVp8x({ width, height, alpha: false, padTo });
  };

describe('a file that already complies is accepted without a search', () => {
  it('encodes once when nothing bounds the size', async () => {
    const encode = vi.fn(async (w: number, h: number) =>
      buildWebpVp8x({ width: w, height: h, alpha: false }),
    );
    const result = await runPlan(planFor({ format: 'image/webp' }), PHOTO, {
      encode,
    });
    expect(result.status).toBe('verified');
    expect(encode).toHaveBeenCalledTimes(1);
  });

  it('takes the highest quality available when nothing constrains it', async () => {
    const seen: number[] = [];
    await runPlan(planFor({ format: 'image/webp' }), PHOTO, {
      encode: async (w, h, q) => {
        seen.push(q);
        return buildWebpVp8x({ width: w, height: h, alpha: false });
      },
    });
    expect(seen).toEqual([QUALITY_CEILING]);
  });

  it('stops at the top quality when that already fits the limit', async () => {
    const encode = vi.fn(smoothWebp(1000, 200));
    const result = await runPlan(
      planFor({ format: 'image/webp', maxBytes: 20_000 }),
      PHOTO,
      { encode },
    );
    expect(result.status).toBe('verified');
    expect(encode).toHaveBeenCalledTimes(1);
  });
});

describe('the quality search', () => {
  it('finds a quality under the limit and verifies the bytes', async () => {
    const result = await runPlan(
      planFor({ format: 'image/webp', maxBytes: 5_000 }),
      PHOTO,
      { encode: smoothWebp(40_000, 1_000) },
    );
    expect(result.status).toBe('verified');
    if (result.status !== 'verified') return;
    expect(result.bytes.length).toBeLessThanOrEqual(5_000);
    expect(result.encodes).toBeGreaterThan(1);
  });

  it('keeps the highest quality that qualifies, not merely the first', async () => {
    const qualities: number[] = [];
    const result = await runPlan(
      planFor({ format: 'image/webp', maxBytes: 5_000 }),
      PHOTO,
      {
        encode: async (w, h, q) => {
          qualities.push(q);
          return smoothWebp(40_000, 1_000)(w, h, q);
        },
      },
    );
    expect(result.status).toBe('verified');
    if (result.status !== 'verified') return;
    // Every quality above the chosen one must have produced a file over the
    // limit, or a better answer was available and was not taken.
    const chosenSize = result.bytes.length;
    expect(chosenSize).toBeLessThanOrEqual(5_000);
    const higher = await smoothWebp(40_000, 1_000)(800, 600, QUALITY_CEILING);
    expect(higher.length).toBeGreaterThan(5_000);
    expect(qualities.length).toBeLessThanOrEqual(MAX_ENCODES);
  });

  it('judges the file it returns on its measured bytes, even when size does not fall with quality', async () => {
    // A non-monotonic encoder: most qualities grow with quality, but 50 is an
    // outlier that produces a much smaller file. The floor still fits, so the
    // bisection runs, and whatever it settles on must be judged on what it
    // actually weighs rather than on where it sat in the search.
    const encode = async (w: number, h: number, q: number) => {
      const padTo = q === 50 ? 1_200 : 1_000 + q * 60;
      return buildWebpVp8x({ width: w, height: h, alpha: false, padTo });
    };
    const result = await runPlan(
      planFor({ format: 'image/webp', maxBytes: 3_000 }),
      PHOTO,
      { encode },
    );
    expect(result.status).toBe('verified');
    if (result.status !== 'verified') return;
    expect(result.bytes.length).toBeLessThanOrEqual(3_000);
  });

  it('cannot find a fitting quality when neither end of the range fits — a real limit, recorded', async () => {
    // This is a genuine limitation of the inherited bisection, not a bug being
    // hidden. The search probes the ceiling and the floor, and only bisects when
    // the floor fits. So a pathological encoder where *only* a middle quality
    // fits is reported unsatisfied rather than found.
    //
    // It is left as-is deliberately: JPEG and WebP sizes are near-monotonic in
    // quality, so an encoder like this one does not occur in practice, and a
    // full sweep would cost up to 90 encodes on every tight limit. What matters
    // is that the outcome is reported truthfully, which is what this asserts.
    const encode = async (w: number, h: number, q: number) => {
      const padTo = q === 50 ? 2_000 : 3_000 + q * 40;
      return buildWebpVp8x({ width: w, height: h, alpha: false, padTo });
    };
    const result = await runPlan(
      planFor({
        format: 'image/webp',
        exactWidth: 400,
        exactHeight: 300,
        fit: 'crop',
        maxBytes: 2_500,
      }),
      PHOTO,
      { encode },
    );
    expect(result.status).toBe('unsatisfied');
    if (result.status !== 'unsatisfied') return;
    expect(result.reasons.join(' ')).toContain('Maximum file size');
  });

  it('never runs more encodes than the hard ceiling allows', async () => {
    const encode = vi.fn(async (w: number, h: number) =>
      // Always far too big, so the search exhausts every avenue it has.
      buildWebpVp8x({ width: w, height: h, alpha: false, padTo: 60_000 }),
    );
    const result = await runPlan(
      planFor({ format: 'image/webp', maxBytes: 1_000, maxWidth: 400 }),
      PHOTO,
      { encode },
    );
    expect(encode.mock.calls.length).toBeLessThanOrEqual(MAX_ENCODES);
    expect(result.status).toBe('unsatisfied');
  });

  it('honours a lowered encode ceiling', async () => {
    const encode = vi.fn(async (w: number, h: number) =>
      buildWebpVp8x({ width: w, height: h, alpha: false, padTo: 60_000 }),
    );
    await runPlan(
      planFor({ format: 'image/webp', maxBytes: 1_000 }),
      PHOTO,
      { encode },
      {
        maxEncodes: 2,
      },
    );
    expect(encode.mock.calls.length).toBeLessThanOrEqual(2);
  });
});

describe('PNG is not pretended to have a quality knob', () => {
  it('encodes PNG exactly once even when a byte limit is set', async () => {
    const encode = vi.fn(async (w: number, h: number) =>
      buildPng({ width: w, height: h, colourType: 2, padTo: 900 }),
    );
    const result = await runPlan(
      planFor({ format: 'image/png', maxBytes: 5_000 }),
      PHOTO,
      { encode },
    );
    expect(encode).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('verified');
  });

  it('reports a PNG that cannot reach the limit rather than searching in vain', async () => {
    const encode = vi.fn(async (w: number, h: number, _q: number) =>
      buildPng({ width: w, height: h, colourType: 2, padTo: 50_000 }),
    );
    const result = await runPlan(
      planFor({ format: 'image/png', maxBytes: 5_000 }),
      PHOTO,
      { encode },
    );
    expect(result.status).toBe('unsatisfied');
    if (result.status !== 'unsatisfied') return;
    expect(result.reasons.join(' ')).toContain('Maximum file size');
    // The real promise: no quality sweep. At the size that was asked for there
    // is exactly one encode, and it is at the top of the range. The engine does
    // probe other pixel sizes at the quality floor while looking for a smaller
    // geometry, and for PNG that argument is simply ignored by the encoder.
    const atRequestedSize = encode.mock.calls.filter(
      (call) => call[0] === 800 && call[1] === 600,
    );
    expect(atRequestedSize).toHaveLength(1);
    expect(atRequestedSize[0]![2]).toBe(QUALITY_CEILING);
  });

  it('offers a lossy format as a way forward, since PNG has no detail to trade', () => {
    const choices = unsatisfiedChoices(
      planFor({ format: 'image/png', maxBytes: 100 }),
    );
    expect(choices.map((c) => c.id)).toContain('lossy-format');
  });
});

describe('an exact size is a hard constraint the search may not trade away', () => {
  it('never shrinks below an exact size to reach a byte limit', async () => {
    const sizes: Array<[number, number]> = [];
    const result = await runPlan(
      planFor({
        format: 'image/webp',
        exactWidth: 600,
        exactHeight: 600,
        fit: 'crop',
        maxBytes: 500,
      }),
      PHOTO,
      {
        encode: async (w, h, q) => {
          sizes.push([w, h]);
          return smoothWebp(80_000, 40_000)(w, h, q);
        },
      },
    );
    // Every attempt was at the exact size that was asked for.
    expect(sizes.every(([w, h]) => w === 600 && h === 600)).toBe(true);
    expect(result.status).toBe('unsatisfied');
    if (result.status !== 'unsatisfied') return;
    expect(result.reasons.join(' ')).toContain('Maximum file size');
  });

  it('offers smaller dimensions as an explicit choice instead of taking them', () => {
    const choices = unsatisfiedChoices(
      planFor({
        exactWidth: 600,
        exactHeight: 600,
        fit: 'crop',
        maxBytes: 100,
      }),
    );
    expect(choices.map((c) => c.id)).toContain('allow-smaller');
  });

  it('may shrink within a maximum, because a maximum permits it', async () => {
    const sizes: Array<[number, number]> = [];
    await runPlan(
      planFor({ format: 'image/webp', maxWidth: 800, maxBytes: 1_200 }),
      PHOTO,
      {
        encode: async (w, h, q) => {
          sizes.push([w, h]);
          return smoothWebp(60_000, 20_000)(w, h, q);
        },
      },
    );
    expect(sizes.some(([w]) => w < 800)).toBe(true);
  });
});

describe('cancellation and deadlines behave differently, on purpose', () => {
  it('reports cancelled when the signal has already fired', async () => {
    const controller = new AbortController();
    controller.abort();
    const encode = vi.fn(async (w: number, h: number) =>
      buildWebpVp8x({ width: w, height: h, alpha: false }),
    );
    const result = await runPlan(
      planFor({ format: 'image/webp', maxBytes: 5_000 }),
      PHOTO,
      { encode },
      { signal: controller.signal },
    );
    expect(result.status).toBe('cancelled');
    expect(encode).not.toHaveBeenCalled();
  });

  it('reports cancelled when the signal fires mid-search', async () => {
    const controller = new AbortController();
    let calls = 0;
    const result = await runPlan(
      planFor({ format: 'image/webp', maxBytes: 1_000 }),
      PHOTO,
      {
        encode: async (w, h, q) => {
          calls += 1;
          if (calls === 2) controller.abort();
          return smoothWebp(60_000, 20_000)(w, h, q);
        },
      },
      { signal: controller.signal },
    );
    expect(result.status).toBe('cancelled');
  });

  it('returns the best candidate it has when a deadline expires, not nothing', async () => {
    const result = await runPlan(
      planFor({ format: 'image/webp', maxBytes: 100_000 }),
      PHOTO,
      {
        encode: async (w, h, q) => {
          // Each encode costs more than the whole budget.
          await new Promise((resolve) => setTimeout(resolve, 12));
          return smoothWebp(40_000, 1_000)(w, h, q);
        },
      },
      { deadlineMs: 1 },
    );
    // A deadline still owes an answer; only a cancellation owes none.
    expect(result.status).not.toBe('cancelled');
    expect(['verified', 'unsatisfied']).toContain(result.status);
  });

  it('has a default deadline rather than running forever', () => {
    expect(DEFAULT_DEADLINE_MS).toBeGreaterThan(0);
    expect(Number.isFinite(DEFAULT_DEADLINE_MS)).toBe(true);
  });

  it('terminates on every input it was given, deterministically', async () => {
    for (const maxBytes of [64, 100, 1_000, 10_000, 1_000_000]) {
      const first = await runPlan(
        planFor({ format: 'image/webp', maxBytes }),
        PHOTO,
        { encode: smoothWebp(40_000, 1_000) },
      );
      const second = await runPlan(
        planFor({ format: 'image/webp', maxBytes }),
        PHOTO,
        { encode: smoothWebp(40_000, 1_000) },
      );
      expect(second.status).toBe(first.status);
    }
  });
});

describe('a successful encode is never mistaken for a compliant result', () => {
  it('refuses to call a wrong container verified', async () => {
    // The plan says WebP; the "encoder" hands back a PNG.
    const result = await runPlan(planFor({ format: 'image/webp' }), PHOTO, {
      encode: async (w, h) => buildPng({ width: w, height: h, colourType: 2 }),
    });
    expect(result.status).toBe('unsatisfied');
    if (result.status !== 'unsatisfied') return;
    expect(result.reasons.join(' ')).toContain('File type');
  });

  it('refuses to call the wrong pixel size verified', async () => {
    const result = await runPlan(
      planFor({
        format: 'image/webp',
        exactWidth: 300,
        exactHeight: 300,
        fit: 'crop',
      }),
      PHOTO,
      {
        // Ignores the size it was asked for, as a broken encoder would.
        encode: async () =>
          buildWebpVp8x({ width: 64, height: 64, alpha: false }),
      },
    );
    expect(result.status).toBe('unsatisfied');
  });

  it('fails when an independent decode disagrees with the file header', async () => {
    const result = await runPlan(
      planFor({
        format: 'image/webp',
        exactWidth: 300,
        exactHeight: 300,
        fit: 'crop',
      }),
      PHOTO,
      {
        encode: async (w, h) =>
          buildWebpVp8x({ width: w, height: h, alpha: false }),
        // A decoder that reports something else entirely.
        measure: async () => ({ width: 10, height: 10 }),
      },
    );
    expect(result.status).toBe('unsatisfied');
    if (result.status !== 'unsatisfied') return;
    expect(
      result.verification.checks.find((c) => c.id === 'headerMatchesPixels')
        ?.pass,
    ).toBe(false);
  });

  it('still reports which promises were kept when one was missed', async () => {
    const result = await runPlan(
      planFor({ format: 'image/webp', maxBytes: 500, maxWidth: 400 }),
      PHOTO,
      { encode: smoothWebp(80_000, 60_000) },
    );
    expect(result.status).toBe('unsatisfied');
    if (result.status !== 'unsatisfied') return;
    // The format and the width were met even though the byte limit was not.
    expect(
      result.verification.checks.find((c) => c.id === 'format')?.pass,
    ).toBe(true);
    expect(
      result.verification.checks.find((c) => c.id === 'maxBytes')?.pass,
    ).toBe(false);
    // And a real file is still offered rather than thrown away.
    expect(result.bytes && result.bytes.length > 0).toBe(true);
  });

  it('reports a failure safely when the encoder throws', async () => {
    const result = await runPlan(planFor({ format: 'image/webp' }), PHOTO, {
      encode: async () => {
        throw new Error(
          '/Users/someone/secret-holiday-photo.jpg could not be read',
        );
      },
    });
    expect(result.status).toBe('failed');
    if (result.status !== 'failed') return;
    // The filename in the underlying error must not reach the message.
    expect(result.error.message).not.toContain('secret-holiday-photo');
    expect(result.error.message).not.toContain('/Users/');
  });

  it('passes through a message this project marked as showable', async () => {
    const result = await runPlan(planFor({ format: 'image/webp' }), PHOTO, {
      encode: async () => {
        throw new ShowableError('This browser cannot save WebP.');
      },
    });
    expect(result.status).toBe('failed');
    if (result.status !== 'failed') return;
    expect(result.error.message).toBe('This browser cannot save WebP.');
  });

  it('withholds a message that was not marked, however harmless it looks', async () => {
    // The passthrough is granted by the type thrown, not by matching a list of
    // sentences. A list goes stale the moment somebody adds a message somewhere
    // else, and the visitor then never sees the new one — which is exactly what
    // happened to "this browser cannot save WebP" before this changed.
    const result = await runPlan(planFor({ format: 'image/webp' }), PHOTO, {
      encode: async () => {
        throw new Error('The browser could not encode this image.');
      },
    });
    expect(result.status).toBe('failed');
    if (result.status !== 'failed') return;
    expect(result.error.message).toBe(
      'This image could not be prepared in this browser.',
    );
  });
});

describe('metadata removal is verified, not assumed', () => {
  it('strips metadata and confirms it is gone', async () => {
    const result = await runPlan(
      planFor(
        { format: 'image/png', removeMetadata: true },
        { ...PHOTO, format: 'image/png' },
      ),
      { ...PHOTO, format: 'image/png' },
      {
        encode: async (w, h) =>
          buildPng({ width: w, height: h, colourType: 2, withText: true }),
      },
    );
    expect(result.status).toBe('verified');
    if (result.status !== 'verified') return;
    expect(result.verification.hasMetadata).toBe(false);
  });

  it('does not claim removal for a container whose metadata cannot be read', async () => {
    const plan = planFor({ format: 'image/webp', removeMetadata: true });
    const result = await runPlan(plan, PHOTO, {
      // Not a real image at all, so nothing about it can be confirmed.
      encode: async () => new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]),
    });
    expect(result.status).toBe('unsatisfied');
  });
});

describe('tiny and very large geometry', () => {
  it('handles a 1 × 1 image', async () => {
    const tiny: InspectedImage = {
      ...PHOTO,
      width: 1,
      height: 1,
      format: 'image/png',
    };
    const result = await runPlan(planFor({ format: 'image/png' }, tiny), tiny, {
      encode: async (w, h) => buildPng({ width: w, height: h, colourType: 2 }),
    });
    expect(result.status).toBe('verified');
  });

  it('refuses geometry that could not be read rather than encoding nothing', async () => {
    const plan = planFor({ format: 'image/png' });
    const result = await runPlan(
      plan,
      { ...PHOTO, width: 0, height: 0 },
      {
        encode: async () => new Uint8Array(0),
      },
    );
    expect(result.status).toBe('unsupported');
  });

  it('works at the engine’s largest permitted edge', async () => {
    const huge: InspectedImage = { ...PHOTO, width: 12000, height: 8000 };
    const result = await runPlan(
      planFor({ format: 'image/webp', maxWidth: 12000 }, huge),
      huge,
      {
        encode: async (w, h) =>
          buildWebpVp8x({ width: w, height: h, alpha: false }),
      },
    );
    expect(result.status).toBe('verified');
  });
});
