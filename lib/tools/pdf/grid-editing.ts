/**
 * The rules for editing a grid by hand.
 *
 * Kept out of the overlay component so they can be tested against exact
 * numbers rather than through a browser at a pixel. Each one exists because
 * the obvious implementation does something quietly wrong:
 *
 * - Dragging a divider past its neighbour would **reorder the columns** under
 *   the user. The table would rearrange itself and nothing would say why.
 * - Removing an outer divider does not merge two columns, it **discards the
 *   data outside it**, which looks like the tool losing rows.
 * - Adding a divider "in the middle" is useless; the missing one is almost
 *   always in the widest gap, which is where a column was run together.
 */

/** Two dividers closer than this are the same divider. */
export const MIN_COLUMN_GAP = 4;

/**
 * Move divider `index` to `nextX`, clamped between its neighbours.
 *
 * Returns a new array; the input is not modified.
 */
export function moveColumnEdge(
  edges: readonly number[],
  index: number,
  nextX: number,
): number[] {
  if (index < 0 || index >= edges.length) return [...edges];
  const next = [...edges];
  const lower =
    index > 0 ? next[index - 1]! + MIN_COLUMN_GAP : Number.NEGATIVE_INFINITY;
  const upper =
    index < next.length - 1
      ? next[index + 1]! - MIN_COLUMN_GAP
      : Number.POSITIVE_INFINITY;
  next[index] = Math.min(Math.max(nextX, lower), upper);
  return next;
}

/**
 * Add a divider in the widest gap, or return the edges unchanged when there is
 * no gap wide enough to split.
 */
export function addColumnEdge(edges: readonly number[]): number[] {
  if (edges.length < 2) return [...edges];
  let widest = 0;
  let at = 0;
  for (let i = 0; i < edges.length - 1; i += 1) {
    const gap = edges[i + 1]! - edges[i]!;
    if (gap > widest) {
      widest = gap;
      at = edges[i]! + gap / 2;
    }
  }
  if (widest < MIN_COLUMN_GAP * 2) return [...edges];
  return [...edges, at].sort((a, b) => a - b);
}

/**
 * Remove divider `index`, refusing the two outer ones.
 *
 * Refusing rather than throwing: this is driven by a keypress, and the right
 * response to Delete on the table's own edge is for nothing to happen.
 */
export function removeColumnEdge(
  edges: readonly number[],
  index: number,
): number[] {
  if (index <= 0 || index >= edges.length - 1) return [...edges];
  return edges.filter((_, i) => i !== index);
}
