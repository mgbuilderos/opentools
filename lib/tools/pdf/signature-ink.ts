/**
 * Signature ink colours. The pad shows strokes in the theme's foreground so
 * they stay visible on a dark background, while the image stamped onto the
 * PDF is always dark ink, as it would be on paper.
 */

export type Rgb = [number, number, number];

/** Dark ink for the exported signature image. */
export const PAPER_INK: Rgb = [17, 17, 17];

/** Reads `rgb(…)`, `rgba(…)` or `#rrggbb`/`#rgb`; null for anything else. */
export function parseCssColor(value: string): Rgb | null {
  const text = value.trim().toLowerCase();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/u.exec(text);
  if (hex) {
    const digits = hex[1].length === 3 ? hex[1].replace(/./gu, '$&$&') : hex[1];
    return [0, 2, 4].map((start) =>
      Number.parseInt(digits.slice(start, start + 2), 16),
    ) as Rgb;
  }
  const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/u.exec(text);
  if (!rgb) return null;
  const channels = rgb.slice(1, 4).map(Number);
  if (!channels.every((channel) => Number.isFinite(channel))) return null;
  return channels.map((channel) =>
    Math.round(Math.min(255, Math.max(0, channel))),
  ) as Rgb;
}

/** A CSS colour string for a canvas context. */
export function cssRgb([red, green, blue]: Rgb) {
  return `rgb(${red}, ${green}, ${blue})`;
}

/**
 * Recolours every painted pixel of RGBA data to one colour, keeping its
 * alpha, so anti-aliased edges survive. Transparent pixels stay transparent.
 */
export function tintPixels(data: Uint8ClampedArray, [red, green, blue]: Rgb) {
  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] === 0) continue;
    data[index] = red;
    data[index + 1] = green;
    data[index + 2] = blue;
  }
  return data;
}
