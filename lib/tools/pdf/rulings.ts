/**
 * Reading a table's own borders.
 *
 * The column engine in `tables.ts` infers where the columns are from where the
 * text is not — it clusters whitespace. That is the only thing you can do for a
 * statement laid out with spaces, and it is what every "stream mode" extractor
 * does. It also guesses, and on a dense statement it guesses wrong.
 *
 * Most statements and very nearly every invoice do something better: they
 * **draw the table**. Those rules are in the PDF's content stream as ordinary
 * vector paths, and when they are there the column boundaries are not a guess
 * at all — they are stated. Reading them is what Camelot calls lattice mode and
 * it is the single largest accuracy difference between a free extractor and a
 * paid one.
 *
 * This module is the geometry half and it is deliberately pure: it takes line
 * segments in page coordinates and returns rulings and a grid. Everything that
 * touches pdf.js lives in `pdf-geometry.ts`, so every rule below is tested
 * against exact numbers rather than against a fixture PDF.
 *
 * ## Two ways a border gets drawn
 *
 * A border is usually a **stroked** path — `moveTo`, `lineTo`, stroke. But a
 * great many PDFs draw the same line as a **filled rectangle 0.8pt tall**,
 * because that is what a word processor emits for a table cell border. A reader
 * that only understands strokes silently finds no table on those files. Both
 * forms are handled here; `rectangleToSegment` is the second one.
 */

/** A PDF transformation matrix, `[a, b, c, d, e, f]`. */
export type Matrix = readonly [number, number, number, number, number, number];

export const IDENTITY_MATRIX: Matrix = [1, 0, 0, 1, 0, 0];

/** A straight piece of drawn line, already in page coordinates. */
export interface RuleSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Stroke width, or the thin dimension of a filled rectangle. */
  thickness: number;
}

/**
 * A merged run of collinear segments — one border of the table.
 *
 * `position` is the fixed coordinate (y for a horizontal rule, x for a
 * vertical one) and `from`/`to` are the extent along the other axis.
 */
export interface Ruling {
  position: number;
  from: number;
  to: number;
  thickness: number;
}

export interface PageRulings {
  horizontal: Ruling[];
  vertical: Ruling[];
}

/**
 * A rectangular grid recovered from rulings.
 *
 * `columnEdges` and `rowEdges` are the cut lines, so a grid with four column
 * edges has three columns. Rows run top to bottom, which is why `rowEdges`
 * descends: PDF y grows upward.
 */
export interface RuledGrid {
  columnEdges: number[];
  rowEdges: number[];
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * A segment is treated as axis-aligned when its off-axis drift is under this
 * many points. Not zero: a rule drawn at 0.02° off horizontal is still a rule,
 * and rounding through a transformation matrix leaves dust in the low decimals.
 */
const AXIS_TOLERANCE = 0.6;

/**
 * Two rules closer than this are the same border drawn twice — which happens
 * constantly, because adjacent cells each draw their own shared edge.
 */
const MERGE_TOLERANCE = 1.6;

/** A rule shorter than this is a tick, an underline or a glyph, not a border. */
const MIN_RULE_LENGTH = 8;

/**
 * A line thicker than this is a filled band — a shaded header row, a logo
 * block — rather than a border, and treating it as one puts a column edge
 * through the middle of a heading.
 */
const MAX_RULE_THICKNESS = 4;

/** Curves are flattened to this many chords before the axis test. */
const CURVE_CHORDS = 8;

/** Compose two matrices, pdf.js's `Util.transform` convention. */
export function multiplyMatrix(m1: Matrix, m2: Matrix): Matrix {
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ];
}

/** Apply a matrix to a point, pdf.js's `Util.applyTransform` convention. */
export function applyMatrix(
  x: number,
  y: number,
  m: Matrix,
): { x: number; y: number } {
  return { x: x * m[0] + y * m[2] + m[4], y: x * m[1] + y * m[3] + m[5] };
}

/**
 * Scale a stroke width through a matrix.
 *
 * A line width is in user space, so a scaled matrix scales it too. The average
 * of the two axis scales is close enough — an anisotropically scaled border is
 * rare and the number is only used to reject fat bands.
 */
export function scaleThickness(width: number, m: Matrix): number {
  const sx = Math.hypot(m[0], m[1]);
  const sy = Math.hypot(m[2], m[3]);
  return width * ((sx + sy) / 2 || 1);
}

/**
 * pdf.js path opcodes, read off `DrawOPS` in the installed build rather than
 * assumed. The arities matter: a wrong one desynchronises the whole stream and
 * turns a table into noise.
 */
const DRAW_MOVE_TO = 0;
const DRAW_LINE_TO = 1;
const DRAW_CURVE_TO = 2;
const DRAW_QUADRATIC_CURVE_TO = 3;
const DRAW_CLOSE_PATH = 4;

function bezierPoint(
  p0: number,
  p1: number,
  p2: number,
  p3: number,
  t: number,
): number {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

function quadraticPoint(p0: number, p1: number, p2: number, t: number): number {
  const u = 1 - t;
  return u * u * p0 + 2 * u * t * p1 + t * t * p2;
}

/**
 * Flatten one `constructPath` payload into segments in page coordinates.
 *
 * Curves are flattened rather than skipped. They are almost never borders, but
 * a rounded-corner table box is drawn as four lines and four tiny arcs, and
 * dropping the arcs is fine while dropping the lines is not — so the whole path
 * is walked and the axis test does the rejecting.
 */
export function pathDataToSegments(
  data: ArrayLike<number>,
  ctm: Matrix,
  lineWidth: number,
): RuleSegment[] {
  const segments: RuleSegment[] = [];
  const thickness = scaleThickness(lineWidth, ctm);
  let currentX = 0;
  let currentY = 0;
  let startX = 0;
  let startY = 0;
  let started = false;

  const push = (x1: number, y1: number, x2: number, y2: number): void => {
    const a = applyMatrix(x1, y1, ctm);
    const b = applyMatrix(x2, y2, ctm);
    segments.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, thickness });
  };

  for (let i = 0; i < data.length; ) {
    const op = data[i++];
    if (op === DRAW_MOVE_TO) {
      currentX = data[i++] ?? 0;
      currentY = data[i++] ?? 0;
      startX = currentX;
      startY = currentY;
      started = true;
      continue;
    }
    if (op === DRAW_LINE_TO) {
      const x = data[i++] ?? 0;
      const y = data[i++] ?? 0;
      if (started) push(currentX, currentY, x, y);
      currentX = x;
      currentY = y;
      continue;
    }
    if (op === DRAW_CURVE_TO) {
      const c1x = data[i++] ?? 0;
      const c1y = data[i++] ?? 0;
      const c2x = data[i++] ?? 0;
      const c2y = data[i++] ?? 0;
      const x = data[i++] ?? 0;
      const y = data[i++] ?? 0;
      let px = currentX;
      let py = currentY;
      for (let step = 1; step <= CURVE_CHORDS; step += 1) {
        const t = step / CURVE_CHORDS;
        const nx = bezierPoint(currentX, c1x, c2x, x, t);
        const ny = bezierPoint(currentY, c1y, c2y, y, t);
        push(px, py, nx, ny);
        px = nx;
        py = ny;
      }
      currentX = x;
      currentY = y;
      continue;
    }
    if (op === DRAW_QUADRATIC_CURVE_TO) {
      const cx = data[i++] ?? 0;
      const cy = data[i++] ?? 0;
      const x = data[i++] ?? 0;
      const y = data[i++] ?? 0;
      let px = currentX;
      let py = currentY;
      for (let step = 1; step <= CURVE_CHORDS; step += 1) {
        const t = step / CURVE_CHORDS;
        const nx = quadraticPoint(currentX, cx, x, t);
        const ny = quadraticPoint(currentY, cy, y, t);
        push(px, py, nx, ny);
        px = nx;
        py = ny;
      }
      currentX = x;
      currentY = y;
      continue;
    }
    if (op === DRAW_CLOSE_PATH) {
      if (started) push(currentX, currentY, startX, startY);
      currentX = startX;
      currentY = startY;
      continue;
    }
    // An opcode this build does not define. Stopping is the only safe move:
    // the arity is unknown, so every byte after it would be misread.
    break;
  }

  return segments;
}

/**
 * Turn a filled rectangle into the border it represents, or `null`.
 *
 * Only degenerate rectangles qualify — thin in exactly one axis. A square block
 * is a shaded box and a page-wide band is a header fill; neither is a rule.
 */
export function rectangleToSegment(
  x: number,
  y: number,
  width: number,
  height: number,
  ctm: Matrix,
): RuleSegment | null {
  const a = applyMatrix(x, y, ctm);
  const b = applyMatrix(x + width, y + height, ctm);
  const left = Math.min(a.x, b.x);
  const right = Math.max(a.x, b.x);
  const bottom = Math.min(a.y, b.y);
  const top = Math.max(a.y, b.y);
  const w = right - left;
  const h = top - bottom;

  if (h <= MAX_RULE_THICKNESS && w > h && w >= MIN_RULE_LENGTH) {
    const mid = (top + bottom) / 2;
    return { x1: left, y1: mid, x2: right, y2: mid, thickness: Math.max(h, 0.1) };
  }
  if (w <= MAX_RULE_THICKNESS && h > w && h >= MIN_RULE_LENGTH) {
    const mid = (left + right) / 2;
    return { x1: mid, y1: bottom, x2: mid, y2: top, thickness: Math.max(w, 0.1) };
  }
  return null;
}

function mergeRuns(
  runs: readonly Ruling[],
  positionTolerance: number,
): Ruling[] {
  if (runs.length === 0) return [];
  const sorted = [...runs].sort(
    (a, b) => a.position - b.position || a.from - b.from,
  );
  const merged: Ruling[] = [];

  for (const run of sorted) {
    const last = merged[merged.length - 1];
    // Same border when the fixed coordinate matches and the extents touch.
    // The gap allowance lets a rule broken at each cell join back into one.
    const touches =
      last !== undefined &&
      Math.abs(last.position - run.position) <= positionTolerance &&
      run.from <= last.to + MERGE_TOLERANCE;
    if (touches && last !== undefined) {
      last.to = Math.max(last.to, run.to);
      last.position = (last.position + run.position) / 2;
      last.thickness = Math.max(last.thickness, run.thickness);
      continue;
    }
    merged.push({ ...run });
  }

  return merged.filter((run) => run.to - run.from >= MIN_RULE_LENGTH);
}

/**
 * Classify segments into horizontal and vertical rulings, merging the ones
 * that are really the same border.
 */
export function segmentsToRulings(
  segments: readonly RuleSegment[],
): PageRulings {
  const horizontalRuns: Ruling[] = [];
  const verticalRuns: Ruling[] = [];

  for (const segment of segments) {
    if (segment.thickness > MAX_RULE_THICKNESS) continue;
    const dx = Math.abs(segment.x2 - segment.x1);
    const dy = Math.abs(segment.y2 - segment.y1);

    if (dy <= AXIS_TOLERANCE && dx >= MIN_RULE_LENGTH) {
      horizontalRuns.push({
        position: (segment.y1 + segment.y2) / 2,
        from: Math.min(segment.x1, segment.x2),
        to: Math.max(segment.x1, segment.x2),
        thickness: segment.thickness,
      });
      continue;
    }
    if (dx <= AXIS_TOLERANCE && dy >= MIN_RULE_LENGTH) {
      verticalRuns.push({
        position: (segment.x1 + segment.x2) / 2,
        from: Math.min(segment.y1, segment.y2),
        to: Math.max(segment.y1, segment.y2),
        thickness: segment.thickness,
      });
    }
  }

  return {
    horizontal: mergeRuns(horizontalRuns, MERGE_TOLERANCE),
    vertical: mergeRuns(verticalRuns, MERGE_TOLERANCE),
  };
}

/** Collapse edge positions that sit within `tolerance` of each other. */
function collapse(positions: readonly number[], tolerance: number): number[] {
  const sorted = [...positions].sort((a, b) => a - b);
  const out: number[] = [];
  for (const value of sorted) {
    const last = out[out.length - 1];
    if (last !== undefined && value - last <= tolerance) {
      out[out.length - 1] = (last + value) / 2;
      continue;
    }
    out.push(value);
  }
  return out;
}

/**
 * Build a grid from rulings, or return `null` when the page is not ruled.
 *
 * "Not ruled" has to be decided honestly, because falling back to whitespace
 * clustering is the right answer far more often than forcing a grid onto two
 * stray lines. Three conditions, all necessary:
 *
 * 1. At least two horizontal and two vertical rules — fewer cannot close a box.
 * 2. The verticals must actually span the horizontals' band. A page with an
 *    underlined heading and a sidebar rule has two of each and no table.
 * 3. The resulting grid must be at least two columns by two rows.
 */
export function buildGridFromRulings(
  rulings: PageRulings,
  options: { minimumSpan?: number } = {},
): RuledGrid | null {
  const minimumSpan = options.minimumSpan ?? 0.5;
  const { horizontal, vertical } = rulings;
  if (horizontal.length < 2 || vertical.length < 2) return null;

  const top = Math.max(...horizontal.map((rule) => rule.position));
  const bottom = Math.min(...horizontal.map((rule) => rule.position));
  const bandHeight = top - bottom;
  if (bandHeight <= 0) return null;

  // Keep only verticals that run a real share of the horizontal band. This is
  // condition 2, and it is what stops a page's decorative rules from becoming
  // column edges.
  const spanning = vertical.filter((rule) => {
    const overlap = Math.min(rule.to, top) - Math.max(rule.from, bottom);
    return overlap >= bandHeight * minimumSpan;
  });
  if (spanning.length < 2) return null;

  const left = Math.min(...spanning.map((rule) => rule.position));
  const right = Math.max(...spanning.map((rule) => rule.position));
  const bandWidth = right - left;
  if (bandWidth <= 0) return null;

  // And the mirror of the same test for the horizontals, so a single long rule
  // crossing the page above the table does not become the top of it.
  const crossing = horizontal.filter((rule) => {
    const overlap = Math.min(rule.to, right) - Math.max(rule.from, left);
    return overlap >= bandWidth * minimumSpan;
  });
  if (crossing.length < 2) return null;

  const columnEdges = collapse(
    spanning.map((rule) => rule.position),
    MERGE_TOLERANCE * 2,
  );
  const rowEdges = collapse(
    crossing.map((rule) => rule.position),
    MERGE_TOLERANCE * 2,
  ).reverse(); // descending: reading order runs down the page

  if (columnEdges.length < 3 || rowEdges.length < 3) return null;

  return {
    columnEdges,
    rowEdges,
    left: columnEdges[0] ?? left,
    right: columnEdges[columnEdges.length - 1] ?? right,
    top: rowEdges[0] ?? top,
    bottom: rowEdges[rowEdges.length - 1] ?? bottom,
  };
}
