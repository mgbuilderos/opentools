/**
 * Where the completion card may sit without stealing a download control.
 *
 * WHY, MEASURED. `components/completion-value-dialog.tsx` opens a non-modal
 * `<dialog>` 400 ms after a click on any `[data-receipt-download]`, fixed at
 * `bottom-4 right-4`. Its doc comment promises "the original action is never
 * blocked or delayed". It was blocked. Measured on the built app at
 * `/pdf/sign`, after one save, with the card open:
 *
 *   desktop 1280x720 — card 384 x 548 px at (880,156)-(1264,704);
 *                      "Save completed PDF" at (1029.6,455.7)-(1156,499.7);
 *                      entirely inside the card. elementFromPoint at the
 *                      control's own centre returns the card.
 *   phone   390x844  — card 358 x 560 px, 92% of the viewport width;
 *                      the control again entirely inside it.
 *
 * In both, a second `save.click()` failed with Playwright's "subtree intercepts
 * pointer events" after the full timeout — the same failure as CI run
 * 36568633398. Nothing auto-dismisses the card, so this is not a 400 ms
 * flicker: the control stays unreachable for the rest of the page load unless
 * the visitor finds the X. Fourteen components render more than one download
 * control, and any tool can be re-run with different settings for a second
 * save, which is what `/pdf/sign` does with its single control.
 *
 * THE RULE. The card keeps its corner — `components/milestone-modal.tsx` holds
 * `bottom-4 left-4` precisely because this one holds bottom right, and moving
 * it would collide with that. Instead it is lifted straight up, just far enough
 * to clear the highest download control it would otherwise cover, and its
 * height is capped so it cannot leave the viewport. When it covers nothing —
 * the common case — it does not move at all.
 *
 * Pure geometry, no DOM, so `completion-card-placement.test.ts` can hold the
 * rule at every viewport without a browser. `e2e/completion-card.spec.ts` holds
 * the real thing in Chromium and WebKit.
 */

/** The parts of a `DOMRect` this needs. Any `DOMRect` satisfies it. */
export type Box = {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
};

export type Placement = {
  /** Distance from the bottom of the viewport to the card's bottom edge, px. */
  readonly bottom: number;
  /** Cap for the card's height, px. It scrolls internally past this. */
  readonly maxHeight: number;
  /** True when a control forced the card off its resting position. */
  readonly lifted: boolean;
};

/** Matches `bottom-4` / `right-4` and the 6rem in the card's own max-height. */
const GAP = 16;

/**
 * Never shrink the card below this. Reached only if a control sits so high
 * that there is no room above it, which also means the card was never over it.
 */
const MIN_HEIGHT = 120;

/** Lifting can expose a control that was above the card. Three passes settle it. */
const PASSES = 3;

function overlaps(control: Box, card: Box): boolean {
  return (
    control.right > card.left &&
    control.left < card.right &&
    control.bottom > card.top &&
    control.top < card.bottom
  );
}

/**
 * @param card       the card's current rect — only `left`/`right` are read, as
 *                   lifting never moves it sideways.
 * @param height     the height the card wants when nothing constrains it.
 * @param controls   rects of the enabled, visible download controls.
 * @param viewport   the visual viewport's height, px.
 */
export function placeCompletionCard(
  card: Pick<Box, 'left' | 'right'>,
  height: number,
  controls: readonly Box[],
  viewportHeight: number,
): Placement {
  /**
   * The highest the card may be lifted. Past this its own top edge would leave
   * the viewport, which trades a covered button for an unreachable card. A
   * control tall enough to need more than this cannot be cleared at all — see
   * the last test in `completion-card-placement.test.ts`.
   */
  const ceiling = Math.max(GAP, viewportHeight - MIN_HEIGHT - GAP);

  const shape = (bottom: number) => {
    const bottomEdge = viewportHeight - bottom;
    const maxHeight = Math.max(MIN_HEIGHT, bottomEdge - GAP);
    return {
      maxHeight,
      rect: {
        left: card.left,
        right: card.right,
        top: bottomEdge - Math.min(height, maxHeight),
        bottom: bottomEdge,
      },
    };
  };

  let bottom = GAP;
  for (let pass = 0; pass < PASSES; pass += 1) {
    const blocked = controls.filter((control) =>
      overlaps(control, shape(bottom).rect),
    );
    if (blocked.length === 0) break;

    const highest = Math.min(...blocked.map((control) => control.top));
    const lifted = Math.min(viewportHeight - highest + GAP, ceiling);
    // No progress means the control is taller than the room above it. Stop at
    // the ceiling rather than loop.
    if (lifted <= bottom) break;
    bottom = lifted;
  }

  return { bottom, maxHeight: shape(bottom).maxHeight, lifted: bottom !== GAP };
}
