import { describe, expect, it } from 'vitest';

import {
  displayedRectToUserSpace,
  normalizeRotation,
  pageGeometry,
  rectFitsPage,
  visibleBox,
} from './signature-placement';

/**
 * Where a user-space point appears on the displayed page, measured from the
 * top-left. Written from the /Rotate definition (clockwise display rotation),
 * independently of the inverse the module implements.
 */
function toDisplayed(
  page: ReturnType<typeof pageGeometry>,
  pointX: number,
  pointY: number,
) {
  const u = pointX - page.box.x;
  const v = pointY - page.box.y;
  const { width: bw, height: bh } = page.box;
  if (page.rotation === 90) return { x: v, y: u };
  if (page.rotation === 180) return { x: bw - u, y: v };
  if (page.rotation === 270) return { x: bh - v, y: bw - u };
  return { x: u, y: bh - v };
}

describe('signature placement geometry', () => {
  it('clips the CropBox to the MediaBox and keeps its origin', () => {
    expect(
      visibleBox(
        { x: 0, y: 100, width: 612, height: 792 },
        { x: 36, y: 50, width: 700, height: 500 },
      ),
    ).toEqual({ x: 36, y: 100, width: 576, height: 450 });
  });

  it('normalizes boxes given with swapped corners', () => {
    expect(visibleBox({ x: 612, y: 792, width: -612, height: -792 })).toEqual({
      x: 0,
      y: 0,
      width: 612,
      height: 792,
    });
  });

  it('falls back to the MediaBox when the CropBox misses it entirely', () => {
    expect(
      visibleBox(
        { x: 0, y: 0, width: 100, height: 100 },
        { x: 200, y: 200, width: 50, height: 50 },
      ),
    ).toEqual({ x: 0, y: 0, width: 100, height: 100 });
  });

  it('reduces /Rotate to the four angles viewers honour', () => {
    expect(normalizeRotation(-90)).toBe(270);
    expect(normalizeRotation(450)).toBe(90);
    expect(normalizeRotation(45)).toBe(0);
    expect(normalizeRotation(Number.NaN)).toBe(0);
  });

  it('swaps the displayed size for quarter turns', () => {
    const page = pageGeometry(
      { x: 0, y: 0, width: 612, height: 792 },
      undefined,
      90,
    );
    expect(page).toMatchObject({ rotation: 90, width: 792, height: 612 });
  });

  for (const rotation of [0, 90, 180, 270]) {
    it(`maps a displayed rectangle back upright at /Rotate ${rotation} with an offset box`, () => {
      const page = pageGeometry(
        { x: 10, y: 100, width: 612, height: 792 },
        { x: 40, y: 130, width: 500, height: 700 },
        rotation,
      );
      const rect = { x: 72, y: 60, width: 150, height: 50 };
      const placed = displayedRectToUserSpace(page, rect);
      expect(placed.rotate).toBe(rotation);

      // The image's own axes, rotated counter-clockwise by `rotate`.
      const radians = (placed.rotate * Math.PI) / 180;
      const corner = (s: number, t: number) => {
        const x = s * placed.width;
        const y = t * placed.height;
        return toDisplayed(
          page,
          placed.x + x * Math.cos(radians) - y * Math.sin(radians),
          placed.y + x * Math.sin(radians) + y * Math.cos(radians),
        );
      };
      const close = (
        actual: { x: number; y: number },
        x: number,
        y: number,
      ) => {
        expect(actual.x).toBeCloseTo(x, 6);
        expect(actual.y).toBeCloseTo(y, 6);
      };
      // Image bottom-left, bottom-right and top-left, as displayed.
      close(corner(0, 0), rect.x, rect.y + rect.height);
      close(corner(1, 0), rect.x + rect.width, rect.y + rect.height);
      close(corner(0, 1), rect.x, rect.y);
    });
  }

  it('accepts only rectangles fully inside the displayed page', () => {
    const page = pageGeometry(
      { x: 0, y: 0, width: 612, height: 792 },
      undefined,
      90,
    );
    expect(rectFitsPage(page, { x: 0, y: 0, width: 792, height: 612 })).toBe(
      true,
    );
    expect(rectFitsPage(page, { x: 700, y: 0, width: 100, height: 50 })).toBe(
      false,
    );
    expect(rectFitsPage(page, { x: 0, y: 580, width: 100, height: 50 })).toBe(
      false,
    );
    expect(rectFitsPage(page, { x: -5, y: 0, width: 100, height: 50 })).toBe(
      false,
    );
    expect(
      rectFitsPage(page, { x: Number.NaN, y: 0, width: 1, height: 1 }),
    ).toBe(false);
    expect(rectFitsPage(page, { x: 0, y: 0, width: 0, height: 0 })).toBe(false);
    // Rounding in the UI must not turn a flush placement into a refusal.
    expect(rectFitsPage(page, { x: 692.3, y: 0, width: 100, height: 50 })).toBe(
      true,
    );
  });

  it('pulls a placement within tolerance fully onto the page', () => {
    const page = pageGeometry(
      { x: 0, y: 0, width: 200, height: 100 },
      undefined,
      0,
    );
    const placed = displayedRectToUserSpace(page, {
      x: 100.3,
      y: -0.2,
      width: 100,
      height: 20,
    });
    expect(placed.x).toBeCloseTo(100, 6);
    expect(placed.y).toBeCloseTo(80, 6);
  });
});
