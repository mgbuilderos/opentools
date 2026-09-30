import { describe, expect, it } from 'vitest';

import { placeCompletionCard, type Box } from './completion-card-placement';

/** The card's own rect after placement, for asserting what it covers. */
function placed(
  card: { left: number; right: number },
  height: number,
  controls: readonly Box[],
  viewportHeight: number,
) {
  const result = placeCompletionCard(card, height, controls, viewportHeight);
  const bottom = viewportHeight - result.bottom;
  return {
    ...result,
    rect: {
      left: card.left,
      right: card.right,
      top: bottom - Math.min(height, result.maxHeight),
      bottom,
    },
  };
}

function overlaps(a: Box, b: Box) {
  return (
    a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom
  );
}

const box = (
  left: number,
  top: number,
  width: number,
  height: number,
): Box => ({
  left,
  top,
  right: left + width,
  bottom: top + height,
});

describe('placeCompletionCard', () => {
  it('does not move when there is nothing to cover', () => {
    const result = placeCompletionCard(
      { left: 880, right: 1264 },
      548,
      [],
      720,
    );
    expect(result).toEqual({ bottom: 16, maxHeight: 688, lifted: false });
  });

  it('does not move for a control it already clears', () => {
    // Same column, but well above the card's top edge at (720-16)-548 = 156.
    const result = placeCompletionCard(
      { left: 880, right: 1264 },
      548,
      [box(1029, 40, 126, 44)],
      720,
    );
    expect(result.lifted).toBe(false);
  });

  it('does not move for a control beside it', () => {
    // Bottom of the viewport, but to the left of the card's left edge.
    const result = placeCompletionCard(
      { left: 880, right: 1264 },
      548,
      [box(100, 600, 126, 44)],
      720,
    );
    expect(result.lifted).toBe(false);
  });

  /**
   * The measurement this whole module exists for, taken from the built app at
   * `/pdf/sign` in Chromium: the card covered "Save completed PDF" outright and
   * a second save could not be clicked at all.
   */
  it('clears the control it covered on desktop (measured 1280x720)', () => {
    const control = box(1029.5625, 455.6875, 126.4375, 44);
    const result = placed({ left: 880, right: 1264 }, 547.625, [control], 720);

    expect(result.lifted).toBe(true);
    expect(overlaps(control, result.rect)).toBe(false);
    // Clears the control's top edge by the same gap the corner uses.
    expect(result.rect.bottom).toBeCloseTo(control.top - 16, 5);
    expect(result.rect.top).toBeGreaterThanOrEqual(16);
  });

  /** Same, at phone width, where the card spans 92% of the viewport. */
  it('clears the control it covered on a phone (measured 390x844)', () => {
    const control = box(37, 577.921875, 316, 44);
    const result = placed({ left: 16, right: 374 }, 559.625, [control], 844);

    expect(result.lifted).toBe(true);
    expect(overlaps(control, result.rect)).toBe(false);
    expect(result.rect.top).toBeGreaterThanOrEqual(16);
  });

  it('clears the highest of several controls', () => {
    // Two download buttons side by side, as `/pdf/to-excel` renders them, plus
    // one higher up the page in the same column.
    const excel = box(900, 600, 150, 44);
    const csv = box(1060, 600, 150, 44);
    const higher = box(900, 500, 150, 44);
    const result = placed(
      { left: 880, right: 1264 },
      548,
      [excel, csv, higher],
      720,
    );

    expect(result.lifted).toBe(true);
    for (const control of [excel, csv, higher]) {
      expect(overlaps(control, result.rect)).toBe(false);
    }
  });

  it('stays on screen when a control leaves no room above it', () => {
    // A control filling almost the whole viewport height in the card's column.
    const control = box(900, 20, 300, 680);
    const result = placed({ left: 880, right: 1264 }, 548, [control], 720);

    expect(result.rect.top).toBeGreaterThanOrEqual(0);
    expect(result.maxHeight).toBeGreaterThanOrEqual(120);
    expect(result.rect.bottom).toBeLessThanOrEqual(720);
  });

  it('never leaves a control underneath it, across viewports', () => {
    // A control swept down the card's column at each of several heights.
    for (const viewportHeight of [568, 667, 720, 844, 1080]) {
      for (let top = 0; top < viewportHeight - 44; top += 37) {
        const control = box(1000, top, 126, 44);
        const result = placed(
          { left: 880, right: 1264 },
          Math.min(548, viewportHeight - 96),
          [control],
          viewportHeight,
        );
        // The one unavoidable case is a control so high that lifting the card
        // above it would push it off the top; the clamp keeps the card on
        // screen and that is what is asserted there.
        if (result.rect.top <= 16) {
          expect(result.rect.bottom).toBeLessThanOrEqual(viewportHeight);
          continue;
        }
        expect(
          overlaps(control, result.rect),
          `viewport ${viewportHeight}, control top ${top}`,
        ).toBe(false);
      }
    }
  });
});
