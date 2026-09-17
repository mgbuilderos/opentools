/**
 * Page geometry for placing a stamp where a viewer shows it.
 *
 * A PDF page is described in user space: the visible area is the CropBox
 * clipped to the MediaBox, which need not start at 0,0, and /Rotate turns the
 * page clockwise when it is displayed. The UI measures from the top-left of
 * the page as displayed, so every placement has to go through both.
 */

export type PdfBox = { x: number; y: number; width: number; height: number };

export type PageRotation = 0 | 90 | 180 | 270;

export type PageGeometry = {
  /** Visible area in PDF user space. */
  box: PdfBox;
  rotation: PageRotation;
  /** Size as displayed, after rotation. */
  width: number;
  height: number;
};

/** A rectangle measured from the top-left of the displayed page. */
export type DisplayedRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** How far a placement may stray past the edge before it is refused. */
export const PLACEMENT_TOLERANCE = 0.5;

/** Turns a box whose corners were given in any order into x/y/width/height. */
export function normalizeBox(box: PdfBox): PdfBox {
  const x1 = Math.min(box.x, box.x + box.width);
  const y1 = Math.min(box.y, box.y + box.height);
  return {
    x: x1,
    y: y1,
    width: Math.abs(box.width),
    height: Math.abs(box.height),
  };
}

/** The CropBox clipped to the MediaBox, as viewers draw it. */
export function visibleBox(mediaBox: PdfBox, cropBox?: PdfBox): PdfBox {
  const media = normalizeBox(mediaBox);
  if (!cropBox) return media;
  const crop = normalizeBox(cropBox);
  const x = Math.max(media.x, crop.x);
  const y = Math.max(media.y, crop.y);
  const right = Math.min(media.x + media.width, crop.x + crop.width);
  const top = Math.min(media.y + media.height, crop.y + crop.height);
  // A CropBox entirely outside the MediaBox is invalid; viewers fall back to
  // the MediaBox rather than showing nothing.
  if (right <= x || top <= y) return media;
  return { x, y, width: right - x, height: top - y };
}

/** Reduces any /Rotate value to the four angles viewers honour. */
export function normalizeRotation(angle: number): PageRotation {
  if (!Number.isFinite(angle) || angle % 90 !== 0) return 0;
  return (((angle % 360) + 360) % 360) as PageRotation;
}

export function pageGeometry(
  mediaBox: PdfBox,
  cropBox: PdfBox | undefined,
  rotateAngle: number,
): PageGeometry {
  const box = visibleBox(mediaBox, cropBox);
  const rotation = normalizeRotation(rotateAngle);
  const quarterTurn = rotation === 90 || rotation === 270;
  return {
    box,
    rotation,
    width: quarterTurn ? box.height : box.width,
    height: quarterTurn ? box.width : box.height,
  };
}

/** True when the rectangle lies inside the displayed page. */
export function rectFitsPage(page: PageGeometry, rect: DisplayedRect) {
  const values = [rect.x, rect.y, rect.width, rect.height];
  if (!values.every(Number.isFinite)) return false;
  if (rect.width <= 0 || rect.height <= 0) return false;
  return (
    rect.x >= -PLACEMENT_TOLERANCE &&
    rect.y >= -PLACEMENT_TOLERANCE &&
    rect.x + rect.width <= page.width + PLACEMENT_TOLERANCE &&
    rect.y + rect.height <= page.height + PLACEMENT_TOLERANCE
  );
}

/**
 * Where to draw an upright image so it covers `rect` on the displayed page.
 *
 * Returns the user-space point for the image's own bottom-left corner and the
 * counter-clockwise rotation to draw it with. The rectangle is first pulled
 * inside the page, so a placement that passed `rectFitsPage` within its
 * tolerance still lands fully on the page.
 */
export function displayedRectToUserSpace(
  page: PageGeometry,
  rect: DisplayedRect,
) {
  const width = Math.min(rect.width, page.width);
  const height = Math.min(rect.height, page.height);
  const left = Math.min(Math.max(rect.x, 0), page.width - width);
  const top = Math.min(Math.max(rect.y, 0), page.height - height);
  // The image's bottom-left corner as the viewer shows it.
  const bottom = top + height;
  const { box, rotation } = page;

  let u: number;
  let v: number;
  if (rotation === 90) {
    u = bottom;
    v = left;
  } else if (rotation === 180) {
    u = box.width - left;
    v = bottom;
  } else if (rotation === 270) {
    u = box.width - bottom;
    v = box.height - left;
  } else {
    u = left;
    v = box.height - bottom;
  }

  return { x: box.x + u, y: box.y + v, width, height, rotate: rotation };
}
