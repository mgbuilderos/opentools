/**
 * One image pipeline, many addresses.
 *
 * WHY THIS FILE EXISTS. Measured on 2026-09-23, `/image` held thirteen pages
 * against `/pdf`'s nineteen, and image editing is the part of this site a
 * search engine cannot answer in its own results: "resize an image to 800px"
 * has no answer box, so the person has to open something. Every job below is
 * a query people type by name, and each one needs a URL and a title of its
 * own before it can rank for that name.
 *
 * WHAT IS SHARED AND WHAT IS NOT. The alternative to this file was thirty-odd
 * components, each with its own file picker, its own decode, its own canvas
 * and its own encoder — thirty copies of the same four bugs. So the *engine*
 * is one: `components/image-studio-tool.tsx` decodes, draws, runs a pixel
 * pass, and encodes, and it reads every parameter from the operation record
 * here. What is NOT shared is the page: each operation carries its own title,
 * its own description and its own controls, because a page that is a template
 * with two words swapped is a page that deserves to rank for nothing.
 *
 * EVERYTHING HERE IS PURE. No canvas, no DOM, no timers. The maths that
 * decides an output size, the pixel loops, the median cut that finds a
 * palette and the ICO container writer are all plain functions over numbers
 * and typed arrays, which is why `image-studio.test.ts` can check the actual
 * output bytes rather than checking that a button exists.
 *
 * NO NETWORK. Nothing in this module or the component that drives it reaches
 * off the tab; `local-source-policy.test.ts` fails the build on the primitives
 * that would let it.
 */

export type RasterOutputType =
  | 'image/png'
  | 'image/jpeg'
  | 'image/webp'
  | 'image/x-icon';

/** A control the page renders, and the value the engine reads back from it. */
export interface StudioField {
  id: string;
  label: string;
  type: 'number' | 'range' | 'select' | 'text' | 'colour' | 'checkbox';
  defaultValue: string;
  min?: number;
  max?: number;
  step?: number;
  options?: readonly { value: string; label: string }[];
  /** One line under the control. Never a claim; only what the control does. */
  help?: string;
}

/**
 * What the engine does with the decoded image.
 *
 * A discriminated union rather than a callback, because the operations are
 * data: the route reads them at build time to write titles and the registry
 * reads them to publish addresses, and neither can run a canvas.
 */
export type StudioAction =
  /** Decode and re-encode, optionally at a new size. */
  | { kind: 'convert' }
  | { kind: 'resize' }
  /** Whole-image pixel pass. */
  | {
      kind: 'filter';
      filter:
        | 'grayscale'
        | 'invert'
        | 'sepia'
        | 'brightness-contrast'
        | 'sharpen'
        | 'blur'
        | 'pixelate'
        | 'denoise';
    }
  /** Pixel pass inside a rectangle the person chooses. */
  | { kind: 'region'; effect: 'blur' | 'pixelate' }
  | { kind: 'border' }
  | { kind: 'round-corners' }
  | { kind: 'watermark' }
  | { kind: 'meme' }
  | { kind: 'social-crop' }
  | { kind: 'split' }
  | { kind: 'favicon' }
  | { kind: 'collage' }
  | { kind: 'sprite-sheet' }
  | { kind: 'palette' }
  | { kind: 'colour-picker' }
  | { kind: 'to-base64' }
  | { kind: 'from-base64' }
  | { kind: 'strip-metadata' };

export interface ImageStudioOperation {
  /** The URL segment: `/image/<id>`. */
  id: string;
  /** The page heading, and the label on every link to it. */
  name: string;
  /** The sentence under the heading, and the meta description's first clause. */
  description: string;
  /** The `<title>`, written for the query the page answers. */
  title: string;
  /** The meta description, written for the same query. */
  metaDescription: string;
  /** Grouping for the browse cards. */
  section: 'convert' | 'resize' | 'effects' | 'colour' | 'compose' | 'encode';
  /** What the file picker accepts. */
  accept: string;
  /** More than one file at a time. */
  multiple: boolean;
  /** What comes out: one file, several files, or text. */
  outputs: 'one' | 'many' | 'text';
  /** The encoder, for operations that produce an image. */
  outputType?: RasterOutputType;
  /** Extension for the saved file, when it is not implied by `outputType`. */
  action: StudioAction;
  fields: readonly StudioField[];
}

/* ------------------------------------------------------------------ sizing */

/**
 * The output size for a resize, given what the person filled in.
 *
 * `fit` keeps the aspect ratio and treats width/height as a box; `exact`
 * takes both numbers literally; `percent` scales. Every route through here
 * returns whole pixels of at least 1, because a canvas of 0 throws and a
 * canvas of 12.4 silently rounds somewhere else.
 */
export function resizePlan(
  sourceWidth: number,
  sourceHeight: number,
  options: {
    mode: 'fit' | 'exact' | 'percent';
    width?: number;
    height?: number;
    percent?: number;
  },
): { width: number; height: number } {
  if (
    !Number.isFinite(sourceWidth) ||
    !Number.isFinite(sourceHeight) ||
    sourceWidth < 1 ||
    sourceHeight < 1
  ) {
    throw new Error('The source image has no usable size.');
  }
  if (options.mode === 'percent') {
    const percent = options.percent ?? 100;
    if (!Number.isFinite(percent) || percent <= 0 || percent > 1000) {
      throw new Error('Choose a scale between 1% and 1000%.');
    }
    return {
      width: Math.max(1, Math.round((sourceWidth * percent) / 100)),
      height: Math.max(1, Math.round((sourceHeight * percent) / 100)),
    };
  }
  const width = options.width ?? 0;
  const height = options.height ?? 0;
  if (options.mode === 'exact') {
    if (width < 1 || height < 1) {
      throw new Error('Enter a width and a height of at least 1 pixel.');
    }
    return { width: Math.round(width), height: Math.round(height) };
  }
  if (width < 1 && height < 1) {
    throw new Error('Enter a width, a height, or both.');
  }
  // Only one side given: the other follows from the source ratio.
  if (width < 1) {
    const scale = height / sourceHeight;
    return {
      width: Math.max(1, Math.round(sourceWidth * scale)),
      height: Math.max(1, Math.round(height)),
    };
  }
  if (height < 1) {
    const scale = width / sourceWidth;
    return {
      width: Math.max(1, Math.round(width)),
      height: Math.max(1, Math.round(sourceHeight * scale)),
    };
  }
  const scale = Math.min(width / sourceWidth, height / sourceHeight);
  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale)),
  };
}

export interface PixelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A rectangle clamped to the image, so a pixel loop can never run past it. */
export function clampRect(
  rect: PixelRect,
  imageWidth: number,
  imageHeight: number,
): PixelRect {
  const round = (value: number) =>
    Number.isFinite(value) ? Math.round(value) : 0;
  const x = Math.min(Math.max(round(rect.x), 0), Math.max(0, imageWidth - 1));
  const y = Math.min(Math.max(round(rect.y), 0), Math.max(0, imageHeight - 1));
  return {
    x,
    y,
    width: Math.min(Math.max(round(rect.width), 1), imageWidth - x),
    height: Math.min(Math.max(round(rect.height), 1), imageHeight - y),
  };
}

/**
 * The crop a fixed aspect ratio takes out of an image, centred.
 *
 * This is what every social preset does: the person picked "Instagram square"
 * and the honest answer is the largest 1:1 rectangle in the middle of what
 * they gave us, scaled to the size that platform displays.
 */
export function centredAspectCrop(
  sourceWidth: number,
  sourceHeight: number,
  ratioWidth: number,
  ratioHeight: number,
): PixelRect {
  if (
    ![sourceWidth, sourceHeight, ratioWidth, ratioHeight].every(
      (value) => Number.isFinite(value) && value > 0,
    )
  ) {
    throw new Error('A crop needs a positive size and a positive ratio.');
  }
  const targetRatio = ratioWidth / ratioHeight;
  const sourceRatio = sourceWidth / sourceHeight;
  if (sourceRatio > targetRatio) {
    const width = Math.max(1, Math.round(sourceHeight * targetRatio));
    return {
      x: Math.round((sourceWidth - width) / 2),
      y: 0,
      width,
      height: sourceHeight,
    };
  }
  const height = Math.max(1, Math.round(sourceWidth / targetRatio));
  return {
    x: 0,
    y: Math.round((sourceHeight - height) / 2),
    width: sourceWidth,
    height,
  };
}

/** The sizes the social presets produce, and the ratio each one crops to. */
export const SOCIAL_PRESETS = [
  {
    value: 'instagram-square',
    label: 'Instagram square',
    width: 1080,
    height: 1080,
  },
  {
    value: 'instagram-portrait',
    label: 'Instagram portrait',
    width: 1080,
    height: 1350,
  },
  {
    value: 'instagram-story',
    label: 'Instagram story',
    width: 1080,
    height: 1920,
  },
  { value: 'x-post', label: 'X post', width: 1600, height: 900 },
  { value: 'x-header', label: 'X header', width: 1500, height: 500 },
  { value: 'linkedin-post', label: 'LinkedIn post', width: 1200, height: 627 },
  {
    value: 'linkedin-banner',
    label: 'LinkedIn banner',
    width: 1584,
    height: 396,
  },
  {
    value: 'facebook-cover',
    label: 'Facebook cover',
    width: 1640,
    height: 856,
  },
  {
    value: 'youtube-thumbnail',
    label: 'YouTube thumbnail',
    width: 1280,
    height: 720,
  },
  { value: 'open-graph', label: 'Open Graph card', width: 1200, height: 630 },
] as const;

export function socialPreset(value: string) {
  const preset = SOCIAL_PRESETS.find((entry) => entry.value === value);
  if (!preset) throw new Error('Choose one of the listed sizes.');
  return preset;
}

/** The square PNG sizes a favicon set needs, smallest first. */
export const FAVICON_SIZES = [16, 32, 48, 64, 128, 180, 192, 256, 512] as const;

/** The sizes packed into the .ico file itself, which only holds squares. */
export const ICO_SIZES = [16, 32, 48] as const;

/* ------------------------------------------------------------ pixel passes */

function clamp255(value: number) {
  return value < 0 ? 0 : value > 255 ? 255 : value;
}

function assertRgba(pixels: Uint8ClampedArray, width: number, height: number) {
  if (pixels.length !== width * height * 4) {
    throw new Error('Pixel data does not match the stated image size.');
  }
}

/** Rec. 709 luma, the same weights a display uses to desaturate. */
export function applyGrayscale(pixels: Uint8ClampedArray) {
  for (let index = 0; index < pixels.length; index += 4) {
    const luma =
      0.2126 * pixels[index]! +
      0.7152 * pixels[index + 1]! +
      0.0722 * pixels[index + 2]!;
    const value = Math.round(luma);
    pixels[index] = value;
    pixels[index + 1] = value;
    pixels[index + 2] = value;
  }
  return pixels;
}

export function applyInvert(pixels: Uint8ClampedArray) {
  for (let index = 0; index < pixels.length; index += 4) {
    pixels[index] = 255 - pixels[index]!;
    pixels[index + 1] = 255 - pixels[index + 1]!;
    pixels[index + 2] = 255 - pixels[index + 2]!;
  }
  return pixels;
}

export function applySepia(pixels: Uint8ClampedArray, amount: number) {
  const strength = Math.min(1, Math.max(0, amount / 100));
  for (let index = 0; index < pixels.length; index += 4) {
    const red = pixels[index]!;
    const green = pixels[index + 1]!;
    const blue = pixels[index + 2]!;
    const toneRed = 0.393 * red + 0.769 * green + 0.189 * blue;
    const toneGreen = 0.349 * red + 0.686 * green + 0.168 * blue;
    const toneBlue = 0.272 * red + 0.534 * green + 0.131 * blue;
    pixels[index] = clamp255(red + (toneRed - red) * strength);
    pixels[index + 1] = clamp255(green + (toneGreen - green) * strength);
    pixels[index + 2] = clamp255(blue + (toneBlue - blue) * strength);
  }
  return pixels;
}

/**
 * Brightness as a multiplier and contrast as a pivot around mid grey — the
 * same two knobs a photo app shows, both expressed as a percentage where 100
 * means "leave it alone".
 */
export function applyBrightnessContrast(
  pixels: Uint8ClampedArray,
  brightnessPercent: number,
  contrastPercent: number,
) {
  const brightness = Math.min(400, Math.max(0, brightnessPercent)) / 100;
  const contrast = Math.min(400, Math.max(0, contrastPercent)) / 100;
  for (let index = 0; index < pixels.length; index += 4) {
    for (let channel = 0; channel < 3; channel += 1) {
      const value = pixels[index + channel]! * brightness;
      pixels[index + channel] = clamp255((value - 128) * contrast + 128);
    }
  }
  return pixels;
}

/**
 * A separable box blur run `passes` times.
 *
 * Three passes of a box blur approximate a Gaussian closely enough that the
 * difference is invisible, and it costs O(pixels) per pass instead of
 * O(pixels x radius^2) — which is what makes a 24-pixel radius on a phone
 * photograph finish rather than hang the tab.
 */
export function applyBoxBlur(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number,
  passes = 3,
) {
  assertRgba(pixels, width, height);
  const span = Math.min(200, Math.max(0, Math.round(radius)));
  if (span === 0) return pixels;
  const scratch = new Uint8ClampedArray(pixels.length);
  for (let pass = 0; pass < passes; pass += 1) {
    blurAxis(pixels, scratch, width, height, span, true);
    blurAxis(scratch, pixels, width, height, span, false);
  }
  return pixels;
}

function blurAxis(
  from: Uint8ClampedArray,
  to: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number,
  horizontal: boolean,
) {
  const outer = horizontal ? height : width;
  const inner = horizontal ? width : height;
  const step = horizontal ? 4 : width * 4;
  const lineStep = horizontal ? width * 4 : 4;
  for (let line = 0; line < outer; line += 1) {
    const base = line * lineStep;
    for (let channel = 0; channel < 4; channel += 1) {
      let total = 0;
      let count = 0;
      for (
        let position = 0;
        position <= radius && position < inner;
        position += 1
      ) {
        total += from[base + position * step + channel]!;
        count += 1;
      }
      for (let position = 0; position < inner; position += 1) {
        to[base + position * step + channel] = Math.round(total / count);
        const leaving = position - radius;
        const entering = position + radius + 1;
        if (leaving >= 0) {
          total -= from[base + leaving * step + channel]!;
          count -= 1;
        }
        if (entering < inner) {
          total += from[base + entering * step + channel]!;
          count += 1;
        }
      }
    }
  }
}

/** Average each block and write the average back over it. */
export function applyPixelate(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  blockSize: number,
  region?: PixelRect,
) {
  assertRgba(pixels, width, height);
  const size = Math.min(512, Math.max(2, Math.round(blockSize)));
  const area = region
    ? clampRect(region, width, height)
    : { x: 0, y: 0, width, height };
  for (let top = area.y; top < area.y + area.height; top += size) {
    for (let left = area.x; left < area.x + area.width; left += size) {
      const right = Math.min(left + size, area.x + area.width);
      const bottom = Math.min(top + size, area.y + area.height);
      let red = 0;
      let green = 0;
      let blue = 0;
      let alpha = 0;
      let count = 0;
      for (let y = top; y < bottom; y += 1) {
        for (let x = left; x < right; x += 1) {
          const index = (y * width + x) * 4;
          red += pixels[index]!;
          green += pixels[index + 1]!;
          blue += pixels[index + 2]!;
          alpha += pixels[index + 3]!;
          count += 1;
        }
      }
      if (count === 0) continue;
      const averageRed = Math.round(red / count);
      const averageGreen = Math.round(green / count);
      const averageBlue = Math.round(blue / count);
      const averageAlpha = Math.round(alpha / count);
      for (let y = top; y < bottom; y += 1) {
        for (let x = left; x < right; x += 1) {
          const index = (y * width + x) * 4;
          pixels[index] = averageRed;
          pixels[index + 1] = averageGreen;
          pixels[index + 2] = averageBlue;
          pixels[index + 3] = averageAlpha;
        }
      }
    }
  }
  return pixels;
}

/** Box-blur a rectangle only, leaving the rest of the frame untouched. */
export function applyRegionBlur(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  region: PixelRect,
  radius: number,
) {
  assertRgba(pixels, width, height);
  const area = clampRect(region, width, height);
  const patch = new Uint8ClampedArray(area.width * area.height * 4);
  for (let y = 0; y < area.height; y += 1) {
    const from = ((area.y + y) * width + area.x) * 4;
    patch.set(pixels.subarray(from, from + area.width * 4), y * area.width * 4);
  }
  applyBoxBlur(patch, area.width, area.height, radius);
  for (let y = 0; y < area.height; y += 1) {
    const to = ((area.y + y) * width + area.x) * 4;
    pixels.set(
      patch.subarray(y * area.width * 4, (y + 1) * area.width * 4),
      to,
    );
  }
  return pixels;
}

/**
 * Unsharp masking: blur a copy, then push every pixel away from it.
 *
 * `amount` is a percentage of the difference, so 0 is the original and 100
 * doubles the local contrast the blur removed.
 */
export function applySharpen(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  amount: number,
  radius = 1,
) {
  assertRgba(pixels, width, height);
  const strength = Math.min(300, Math.max(0, amount)) / 100;
  if (strength === 0) return pixels;
  const blurred = new Uint8ClampedArray(pixels);
  applyBoxBlur(blurred, width, height, Math.max(1, Math.round(radius)), 1);
  for (let index = 0; index < pixels.length; index += 4) {
    for (let channel = 0; channel < 3; channel += 1) {
      const original = pixels[index + channel]!;
      const soft = blurred[index + channel]!;
      pixels[index + channel] = clamp255(
        original + (original - soft) * strength,
      );
    }
  }
  return pixels;
}

/**
 * A median filter, which is what removes speckle without smearing edges.
 *
 * A mean would drag an outlier into its neighbours; the median discards it.
 * That is the whole reason this is a separate tool from blur.
 */
export function applyMedianDenoise(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number,
) {
  assertRgba(pixels, width, height);
  const span = Math.min(4, Math.max(1, Math.round(radius)));
  const source = new Uint8ClampedArray(pixels);
  const window: number[] = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        window.length = 0;
        for (let dy = -span; dy <= span; dy += 1) {
          const sampleY = y + dy;
          if (sampleY < 0 || sampleY >= height) continue;
          for (let dx = -span; dx <= span; dx += 1) {
            const sampleX = x + dx;
            if (sampleX < 0 || sampleX >= width) continue;
            window.push(source[(sampleY * width + sampleX) * 4 + channel]!);
          }
        }
        window.sort((first, second) => first - second);
        pixels[index + channel] = window[(window.length - 1) >> 1]!;
      }
    }
  }
  return pixels;
}

/* ---------------------------------------------------------------- colour */

export function toHex(red: number, green: number, blue: number) {
  const part = (value: number) =>
    Math.min(255, Math.max(0, Math.round(value)))
      .toString(16)
      .padStart(2, '0');
  return `#${part(red)}${part(green)}${part(blue)}`;
}

/** The colour of one pixel, for the click-to-pick tool. */
export function pixelAt(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
) {
  assertRgba(pixels, width, height);
  if (x < 0 || y < 0 || x >= width || y >= height) {
    throw new Error('That point is outside the image.');
  }
  const index = (Math.floor(y) * width + Math.floor(x)) * 4;
  const red = pixels[index]!;
  const green = pixels[index + 1]!;
  const blue = pixels[index + 2]!;
  return {
    red,
    green,
    blue,
    alpha: pixels[index + 3]!,
    hex: toHex(red, green, blue),
    rgb: `rgb(${red}, ${green}, ${blue})`,
  };
}

export interface PaletteEntry {
  hex: string;
  red: number;
  green: number;
  blue: number;
  /** Share of the sampled pixels this swatch stands for, 0–1. */
  share: number;
}

/**
 * Median cut, the classic palette algorithm.
 *
 * Repeatedly split the box of colours along its longest axis at the median,
 * then average each box. It beats "take the most common exact RGB values"
 * on photographs, where no two pixels are the same colour and the naive
 * answer is noise.
 *
 * Fully transparent pixels are skipped: a cut-out's background is not one of
 * its colours.
 */
export function extractPalette(
  pixels: Uint8ClampedArray,
  count: number,
): PaletteEntry[] {
  if (pixels.length % 4 !== 0) {
    throw new Error('Pixel data must contain complete RGBA values.');
  }
  const wanted = Math.min(24, Math.max(1, Math.round(count)));
  const samples: [number, number, number][] = [];
  // Cap the sample so a 40-megapixel photograph does not sort 40 million
  // entries; a regular stride keeps the sample representative.
  const pixelCount = pixels.length / 4;
  const stride = Math.max(1, Math.floor(pixelCount / 100_000));
  for (let index = 0; index < pixelCount; index += stride) {
    const at = index * 4;
    if (pixels[at + 3]! < 8) continue;
    samples.push([pixels[at]!, pixels[at + 1]!, pixels[at + 2]!]);
  }
  if (samples.length === 0) {
    throw new Error('This image has no visible pixels to read a colour from.');
  }

  let boxes: [number, number, number][][] = [samples];
  while (boxes.length < wanted) {
    let widestIndex = -1;
    let widestSpan = -1;
    let widestChannel = 0;
    boxes.forEach((box, boxIndex) => {
      if (box.length < 2) return;
      for (let channel = 0; channel < 3; channel += 1) {
        let low = 255;
        let high = 0;
        for (const sample of box) {
          const value = sample[channel]!;
          if (value < low) low = value;
          if (value > high) high = value;
        }
        if (high - low > widestSpan) {
          widestSpan = high - low;
          widestIndex = boxIndex;
          widestChannel = channel;
        }
      }
    });
    if (widestIndex < 0 || widestSpan <= 0) break;
    const box = boxes[widestIndex]!;
    box.sort((first, second) => first[widestChannel]! - second[widestChannel]!);
    const middle = box.length >> 1;
    boxes = [
      ...boxes.slice(0, widestIndex),
      box.slice(0, middle),
      box.slice(middle),
      ...boxes.slice(widestIndex + 1),
    ].filter((entry) => entry.length > 0);
  }

  /*
    Merged by hex before returning.

    Median cut splits the widest box at its median, and a box of identical
    colours has a width of zero on every axis -- so a picture with three flat
    areas asked for eight swatches came back with `#0000ff` listed twice, at
    12.5% each. Found by running the built page on a four-colour test image on
    2026-09-23. Two identical swatches in a palette is not a rounding
    difference a reader can shrug off; it reads as a broken tool. The shares
    are added together, which is also the true answer: that colour really does
    cover 25% of the picture.
  */
  const merged = new Map<string, PaletteEntry>();
  for (const box of boxes) {
    let red = 0;
    let green = 0;
    let blue = 0;
    for (const sample of box) {
      red += sample[0]!;
      green += sample[1]!;
      blue += sample[2]!;
    }
    const averageRed = Math.round(red / box.length);
    const averageGreen = Math.round(green / box.length);
    const averageBlue = Math.round(blue / box.length);
    const hex = toHex(averageRed, averageGreen, averageBlue);
    const share = box.length / samples.length;
    const already = merged.get(hex);
    if (already) {
      already.share += share;
      continue;
    }
    merged.set(hex, {
      hex,
      red: averageRed,
      green: averageGreen,
      blue: averageBlue,
      share,
    });
  }

  return [...merged.values()].sort(
    (first, second) => second.share - first.share,
  );
}

/* --------------------------------------------------------------- geometry */

/** Output size and draw offset for an added border. */
export function borderPlan(
  width: number,
  height: number,
  thickness: number,
): { width: number; height: number; offset: number } {
  const offset = Math.min(2000, Math.max(0, Math.round(thickness)));
  return {
    width: width + offset * 2,
    height: height + offset * 2,
    offset,
  };
}

/**
 * A corner radius in pixels, from either a pixel figure or a percentage of
 * the shorter side, clamped so two corners cannot overlap.
 */
export function cornerRadius(
  width: number,
  height: number,
  value: number,
  unit: 'px' | 'percent',
): number {
  const shortest = Math.min(width, height);
  const requested =
    unit === 'percent'
      ? (shortest * Math.min(50, Math.max(0, value))) / 100
      : Math.max(0, value);
  return Math.min(shortest / 2, Math.round(requested));
}

export interface SplitTile extends PixelRect {
  row: number;
  column: number;
}

/** The tiles a rows x columns split cuts, covering every pixel exactly once. */
export function splitPlan(
  width: number,
  height: number,
  rows: number,
  columns: number,
): SplitTile[] {
  const rowCount = Math.min(20, Math.max(1, Math.round(rows)));
  const columnCount = Math.min(20, Math.max(1, Math.round(columns)));
  if (rowCount > height || columnCount > width) {
    throw new Error('This image is too small to cut into that many pieces.');
  }
  const tiles: SplitTile[] = [];
  for (let row = 0; row < rowCount; row += 1) {
    const top = Math.round((height * row) / rowCount);
    const bottom = Math.round((height * (row + 1)) / rowCount);
    for (let column = 0; column < columnCount; column += 1) {
      const left = Math.round((width * column) / columnCount);
      const right = Math.round((width * (column + 1)) / columnCount);
      tiles.push({
        row: row + 1,
        column: column + 1,
        x: left,
        y: top,
        width: right - left,
        height: bottom - top,
      });
    }
  }
  return tiles;
}

export interface GridCell extends PixelRect {
  index: number;
}

/**
 * A fixed-cell grid: where each of `count` pictures goes, and how big the
 * sheet has to be. Used by both the collage and the sprite sheet — the
 * difference between them is the gap and what gets written alongside, not the
 * arithmetic.
 */
export function gridPlan(
  count: number,
  columns: number,
  cellWidth: number,
  cellHeight: number,
  gap: number,
): { width: number; height: number; cells: GridCell[] } {
  const total = Math.max(1, Math.round(count));
  const perRow = Math.min(total, Math.max(1, Math.round(columns)));
  const cellW = Math.max(1, Math.round(cellWidth));
  const cellH = Math.max(1, Math.round(cellHeight));
  const space = Math.max(0, Math.round(gap));
  const rows = Math.ceil(total / perRow);
  const cells: GridCell[] = [];
  for (let index = 0; index < total; index += 1) {
    const row = Math.floor(index / perRow);
    const column = index % perRow;
    cells.push({
      index,
      x: space + column * (cellW + space),
      y: space + row * (cellH + space),
      width: cellW,
      height: cellH,
    });
  }
  return {
    width: perRow * cellW + space * (perRow + 1),
    height: rows * cellH + space * (rows + 1),
    cells,
  };
}

/** The `background-position` rules that address each frame of a sprite sheet. */
export function spriteCss(
  cells: readonly GridCell[],
  fileName: string,
  className: string,
): string {
  const safeClass = className.replace(/[^a-z0-9_-]/giu, '') || 'sprite';
  const lines = [
    `.${safeClass} {`,
    `  background-image: url('${fileName}');`,
    `  background-repeat: no-repeat;`,
    `  display: inline-block;`,
    `}`,
  ];
  for (const cell of cells) {
    lines.push(
      '',
      `.${safeClass}--${cell.index + 1} {`,
      `  width: ${cell.width}px;`,
      `  height: ${cell.height}px;`,
      `  background-position: -${cell.x}px -${cell.y}px;`,
      `}`,
    );
  }
  return lines.join('\n');
}

export type OverlayPosition =
  | 'top-left'
  | 'top-centre'
  | 'top-right'
  | 'centre'
  | 'bottom-left'
  | 'bottom-centre'
  | 'bottom-right';

export const OVERLAY_POSITIONS: readonly {
  value: OverlayPosition;
  label: string;
}[] = [
  { value: 'top-left', label: 'Top left' },
  { value: 'top-centre', label: 'Top centre' },
  { value: 'top-right', label: 'Top right' },
  { value: 'centre', label: 'Centre' },
  { value: 'bottom-left', label: 'Bottom left' },
  { value: 'bottom-centre', label: 'Bottom centre' },
  { value: 'bottom-right', label: 'Bottom right' },
];

/**
 * Where to put an overlay of a known size, given a corner and a margin.
 *
 * Returns the top-left corner, in image pixels. The caller draws from there,
 * so the same maths serves a text watermark and anything else stamped on.
 */
export function overlayOrigin(
  imageWidth: number,
  imageHeight: number,
  overlayWidth: number,
  overlayHeight: number,
  position: OverlayPosition,
  margin: number,
): { x: number; y: number } {
  const inset = Math.max(0, Math.round(margin));
  const left = inset;
  const centreX = Math.round((imageWidth - overlayWidth) / 2);
  const right = Math.round(imageWidth - overlayWidth - inset);
  const top = inset;
  const centreY = Math.round((imageHeight - overlayHeight) / 2);
  const bottom = Math.round(imageHeight - overlayHeight - inset);
  switch (position) {
    case 'top-left':
      return { x: left, y: top };
    case 'top-centre':
      return { x: centreX, y: top };
    case 'top-right':
      return { x: right, y: top };
    case 'centre':
      return { x: centreX, y: centreY };
    case 'bottom-left':
      return { x: left, y: bottom };
    case 'bottom-centre':
      return { x: centreX, y: bottom };
    default:
      return { x: right, y: bottom };
  }
}

/* ------------------------------------------------------------ base64 / ICO */

/** The parts of a data URL, or a clear refusal. */
export function parseImageDataUrl(value: string): {
  mediaType: string;
  base64: string;
} {
  const trimmed = value.trim();
  const match = /^data:([\w.+-]+\/[\w.+-]+)?;base64,([\s\S]+)$/iu.exec(trimmed);
  if (match) {
    const base64 = match[2]!.replace(/\s+/gu, '');
    assertBase64(base64);
    return { mediaType: match[1] ?? 'image/png', base64 };
  }
  if (/^data:/iu.test(trimmed)) {
    throw new Error(
      'That data URL is not Base64 encoded, so there are no image bytes in it.',
    );
  }
  // Bare Base64 with no header is the common paste, and it is recoverable:
  // the bytes decide the type, so the caller sniffs it after decoding.
  const bare = trimmed.replace(/\s+/gu, '');
  assertBase64(bare);
  return { mediaType: '', base64: bare };
}

function assertBase64(value: string) {
  if (value.length === 0) throw new Error('Paste some Base64 first.');
  if (!/^[A-Za-z0-9+/]+={0,2}$/u.test(value)) {
    throw new Error('That is not valid Base64 — check for stray characters.');
  }
  if (value.length % 4 !== 0) {
    throw new Error('That Base64 string is truncated.');
  }
}

/**
 * The image format a byte string really is, from its signature.
 *
 * A pasted Base64 blob rarely says what it is, and naming a file `.png` when
 * it is a JPEG is exactly the kind of quiet lie that wastes someone's
 * afternoon. Only formats the browser can also decode are recognised.
 */
export function sniffImageType(bytes: Uint8Array): string {
  const starts = (...signature: number[]) =>
    signature.every((byte, index) => bytes[index] === byte);
  if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))
    return 'image/png';
  if (starts(0xff, 0xd8, 0xff)) return 'image/jpeg';
  if (starts(0x47, 0x49, 0x46, 0x38)) return 'image/gif';
  if (starts(0x42, 0x4d)) return 'image/bmp';
  if (
    starts(0x52, 0x49, 0x46, 0x46) &&
    starts0(bytes, 8, 0x57, 0x45, 0x42, 0x50)
  ) {
    return 'image/webp';
  }
  if (starts0(bytes, 4, 0x66, 0x74, 0x79, 0x70)) return 'image/avif';
  const head = new TextDecoder().decode(bytes.subarray(0, 300)).trimStart();
  if (head.startsWith('<svg') || head.startsWith('<?xml'))
    return 'image/svg+xml';
  return '';
}

function starts0(bytes: Uint8Array, offset: number, ...signature: number[]) {
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

export function extensionForImageType(mediaType: string): string {
  const known: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/bmp': 'bmp',
    'image/avif': 'avif',
    'image/svg+xml': 'svg',
    'image/x-icon': 'ico',
  };
  return known[mediaType] ?? 'bin';
}

/*
  THE ICO ENCODER IS NOT HERE ON PURPOSE.

  `lib/tools/favicon-pack.ts` already writes a Microsoft ICO container around
  PNG payloads, with its own test over the header bytes. It had no caller. A
  second encoder would have been a second thing to keep right, so the favicon
  tool imports that one.
*/

/* --------------------------------------------------------------- naming */

/** `holiday.jpeg` + `resized` + `png` -> `holiday-resized.png`. */
export function outputFileName(
  sourceName: string,
  suffix: string,
  extension: string,
): string {
  const stem =
    sourceName.replace(/\.[^.]+$/u, '').replace(/[\\/:*?"<>|]+/gu, '-') ||
    'image';
  const safeSuffix = suffix.replace(/[^a-z0-9-]/giu, '-');
  return `${stem}-${safeSuffix}.${extension}`;
}
