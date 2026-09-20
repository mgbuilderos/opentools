/**
 * Writing an animated GIF, by hand.
 *
 * This is the one video operation that cannot be done by copying bytes. Trim,
 * mute and extract-audio are container surgery — see `mp4.ts` — but a GIF holds
 * pixels, so the frames genuinely have to be decoded and then encoded again.
 *
 * **Why write the encoder rather than take a dependency.** A GIF encoder is a
 * colour quantiser plus LZW, and both are a few hundred lines. The alternative
 * is shipping a library to every visitor for a format from 1989, on a site whose
 * whole argument is that it sends nothing and downloads little. So: no
 * dependency, and the same pure-function shape as every other engine here.
 *
 * **The hard part is not LZW, it is colour.** A GIF frame may use at most **256
 * colours**, and a video frame has up to 16.7 million. Choosing which 256 is the
 * entire quality question, and a naive choice — the most common colours, say —
 * destroys gradients, because a sky of 10,000 near-identical blues loses to a
 * few hundred pixels of pure red. `medianCut` below picks colours by repeatedly
 * splitting the colour space where it is widest, which keeps a gradient's range
 * instead of its mode.
 *
 * Format, for anyone changing this: a GIF89a is a header, a logical screen
 * descriptor, a global colour table, a Netscape extension carrying the loop
 * count, then per frame a graphic control extension (which holds the delay) and
 * an image descriptor followed by LZW data in sub-blocks of at most 255 bytes,
 * and finally a single trailer byte.
 */

/** One frame: RGBA bytes, four per pixel, row by row from the top left. */
export interface GifFrame {
  rgba: Uint8Array;
  /** How long to show it, in **hundredths of a second** — the GIF unit. */
  delayCentiseconds: number;
}

export interface GifOptions {
  width: number;
  height: number;
  /** 0 means loop forever, which is what a GIF is usually for. */
  loopCount?: number;
  /** Colours in the palette, 2 to 256. Fewer is smaller and blockier. */
  colors?: number;
  /**
   * Spread the quantisation error into neighbouring pixels.
   *
   * Without it, a smooth gradient becomes visible bands. With it, the bands
   * break up into noise, which the eye forgives far more readily — at the cost
   * of a larger file, because neighbouring pixels stop being identical and LZW
   * has less to compress.
   */
  dither?: boolean;
}

const MAX_COLORS = 256;
const MIN_COLORS = 2;

/* ------------------------------------------------------------------ palette */

interface Box {
  /** Indices into the colour list this box covers. */
  colors: number[];
}

/**
 * Median-cut quantisation.
 *
 * Start with every distinct colour in one box. Repeatedly take the box with the
 * widest spread on any channel, sort it on that channel, and split it at the
 * median. Stop at the requested number of boxes. Each box becomes one palette
 * entry: the average of the colours it holds, weighted by how often each occurs.
 *
 * Splitting at the **median** rather than the midpoint is what makes this work
 * on real images: it puts an equal number of *pixels* either side, so a crowded
 * region of colour space gets more palette entries than an empty one.
 */
function medianCut(
  histogram: Map<number, number>,
  wanted: number,
): { palette: Uint8Array; lookup: Map<number, number> } {
  const colors = [...histogram.keys()];
  const counts = colors.map((key) => histogram.get(key)!);
  const channel = (key: number, index: number) =>
    (key >> (16 - index * 8)) & 0xff;

  let boxes: Box[] = [{ colors: colors.map((_, index) => index) }];

  while (boxes.length < wanted) {
    let bestBox = -1;
    let bestRange = -1;
    let bestChannel = 0;

    boxes.forEach((box, boxIndex) => {
      if (box.colors.length < 2) return;
      for (let c = 0; c < 3; c += 1) {
        let low = 255;
        let high = 0;
        for (const index of box.colors) {
          const value = channel(colors[index], c);
          if (value < low) low = value;
          if (value > high) high = value;
        }
        const range = high - low;
        if (range > bestRange) {
          bestRange = range;
          bestBox = boxIndex;
          bestChannel = c;
        }
      }
    });

    // Every remaining box holds a single colour: the image has fewer distinct
    // colours than the palette has room for, which is a fine place to stop.
    if (bestBox < 0 || bestRange <= 0) break;

    const box = boxes[bestBox];
    const sorted = [...box.colors].sort(
      (a, b) =>
        channel(colors[a], bestChannel) - channel(colors[b], bestChannel),
    );
    // Split where half the *pixels* fall, not half the colours.
    const total = sorted.reduce((sum, index) => sum + counts[index], 0);
    let running = 0;
    let cut = 1;
    for (let i = 0; i < sorted.length - 1; i += 1) {
      running += counts[sorted[i]];
      if (running * 2 >= total) {
        cut = i + 1;
        break;
      }
      cut = i + 2;
    }
    // A split that leaves one side empty would not increase the box count, and
    // the loop would spin forever on an image it could not divide. Clamping
    // guarantees both sides get at least one colour, so every pass makes
    // progress. Found by deliberately disabling the median search: the encoder
    // hung instead of producing a worse palette, which is the wrong failure.
    const safeCut = Math.max(1, Math.min(cut, sorted.length - 1));
    boxes = [
      ...boxes.slice(0, bestBox),
      { colors: sorted.slice(0, safeCut) },
      { colors: sorted.slice(safeCut) },
      ...boxes.slice(bestBox + 1),
    ].filter((entry) => entry.colors.length > 0);
  }

  const palette = new Uint8Array(boxes.length * 3);
  const lookup = new Map<number, number>();
  boxes.forEach((box, boxIndex) => {
    let r = 0;
    let g = 0;
    let b = 0;
    let weight = 0;
    for (const index of box.colors) {
      const count = counts[index];
      r += channel(colors[index], 0) * count;
      g += channel(colors[index], 1) * count;
      b += channel(colors[index], 2) * count;
      weight += count;
    }
    palette[boxIndex * 3] = Math.round(r / weight);
    palette[boxIndex * 3 + 1] = Math.round(g / weight);
    palette[boxIndex * 3 + 2] = Math.round(b / weight);
    for (const index of box.colors) lookup.set(colors[index], boxIndex);
  });

  return { palette, lookup };
}

/** Nearest palette entry by squared distance. */
function nearest(palette: Uint8Array, r: number, g: number, b: number): number {
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < palette.length / 3; index += 1) {
    const dr = r - palette[index * 3];
    const dg = g - palette[index * 3 + 1];
    const db = b - palette[index * 3 + 2];
    const distance = dr * dr + dg * dg + db * db;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  }
  return best;
}

/* --------------------------------------------------------------------- LZW */

/**
 * GIF's variant of LZW.
 *
 * Codes are written **least-significant bit first** and grow from
 * `minCodeSize + 1` bits up to 12. The dictionary starts with one entry per
 * palette colour plus a clear code and an end code, and is reset whenever it
 * fills — which is the detail that makes this GIF's LZW rather than the textbook
 * kind, and getting the reset wrong produces a file that decodes to noise
 * partway through rather than failing outright.
 */
function lzwCompress(indices: Uint8Array, minCodeSize: number): Uint8Array {
  const clearCode = 1 << minCodeSize;
  const endCode = clearCode + 1;

  let codeSize = minCodeSize + 1;
  let nextCode = endCode + 1;
  let dictionary = new Map<string, number>();

  const out: number[] = [];
  let bitBuffer = 0;
  let bitCount = 0;

  const emit = (code: number) => {
    bitBuffer |= code << bitCount;
    bitCount += codeSize;
    while (bitCount >= 8) {
      out.push(bitBuffer & 0xff);
      bitBuffer >>= 8;
      bitCount -= 8;
    }
  };

  const reset = () => {
    dictionary = new Map();
    codeSize = minCodeSize + 1;
    nextCode = endCode + 1;
  };

  emit(clearCode);
  reset();

  let current = String(indices[0]);
  for (let index = 1; index < indices.length; index += 1) {
    const next = String(indices[index]);
    const combined = `${current},${next}`;
    if (dictionary.has(combined)) {
      current = combined;
      continue;
    }
    emit(current.includes(',') ? dictionary.get(current)! : Number(current));
    dictionary.set(combined, nextCode);
    nextCode += 1;
    if (nextCode > 1 << codeSize) {
      if (codeSize < 12) {
        codeSize += 1;
      } else {
        // The dictionary is full. Tell the decoder to start again, or every
        // code after this point means something different to each side.
        emit(clearCode);
        reset();
      }
    }
    current = next;
  }
  emit(current.includes(',') ? dictionary.get(current)! : Number(current));
  emit(endCode);
  if (bitCount > 0) out.push(bitBuffer & 0xff);

  return new Uint8Array(out);
}

/* ------------------------------------------------------------------- writer */

function subBlocks(data: Uint8Array): number[] {
  // Image data travels in blocks of at most 255 bytes, each prefixed by its
  // length, terminated by a zero-length block.
  const out: number[] = [];
  for (let at = 0; at < data.length; at += 255) {
    const chunk = data.subarray(at, Math.min(at + 255, data.length));
    out.push(chunk.length, ...chunk);
  }
  out.push(0);
  return out;
}

function u16(value: number): number[] {
  return [value & 0xff, (value >> 8) & 0xff];
}

/**
 * Turns frames into an animated GIF.
 *
 * One shared palette is built from **all** the frames together rather than one
 * per frame. Per-frame palettes look slightly better on any single frame and
 * make the colours shift visibly as the animation plays, which is worse.
 */
export function encodeGif(
  frames: readonly GifFrame[],
  options: GifOptions,
): Uint8Array {
  const { width, height } = options;
  if (!frames.length) throw new Error('There are no frames to write.');
  if (width < 1 || height < 1)
    throw new Error('The size must be at least one pixel.');

  const wanted = Math.max(
    MIN_COLORS,
    Math.min(MAX_COLORS, options.colors ?? MAX_COLORS),
  );
  const expected = width * height * 4;
  for (const frame of frames) {
    if (frame.rgba.length !== expected) {
      throw new Error(
        `A frame has ${frame.rgba.length} bytes but ${width}x${height} needs ${expected}.`,
      );
    }
  }

  // Histogram across every frame, at full colour depth. Quantising each frame
  // separately would make the palette shift as it plays.
  const histogram = new Map<number, number>();
  for (const frame of frames) {
    for (let at = 0; at < frame.rgba.length; at += 4) {
      const key =
        (frame.rgba[at] << 16) | (frame.rgba[at + 1] << 8) | frame.rgba[at + 2];
      histogram.set(key, (histogram.get(key) ?? 0) + 1);
    }
  }

  const { palette, lookup } = medianCut(histogram, wanted);
  const paletteEntries = palette.length / 3;

  // The table must be a power of two, so it is padded rather than truncated.
  let tableBits = 1;
  while (1 << tableBits < paletteEntries) tableBits += 1;
  const tableSize = 1 << tableBits;
  const table = new Uint8Array(tableSize * 3);
  table.set(palette);

  const minCodeSize = Math.max(2, tableBits);

  const bytes: number[] = [];
  for (const character of 'GIF89a') bytes.push(character.charCodeAt(0));
  bytes.push(
    ...u16(width),
    ...u16(height),
    // Global colour table present, 8-bit colour resolution, table size.
    0x80 | ((tableBits - 1) & 0x07),
    0, // background colour index
    0, // pixel aspect ratio: none given
  );
  bytes.push(...table);

  // Netscape extension. Without it a GIF plays once, which surprises everybody.
  const loop = options.loopCount ?? 0;
  bytes.push(0x21, 0xff, 0x0b);
  for (const character of 'NETSCAPE2.0') bytes.push(character.charCodeAt(0));
  bytes.push(0x03, 0x01, ...u16(loop), 0x00);

  for (const frame of frames) {
    const indices = new Uint8Array(width * height);

    if (options.dither) {
      // Floyd-Steinberg, on a copy so the original frame is not altered.
      const work = Float32Array.from(frame.rgba);
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const at = (y * width + x) * 4;
          const r = Math.max(0, Math.min(255, work[at]));
          const g = Math.max(0, Math.min(255, work[at + 1]));
          const b = Math.max(0, Math.min(255, work[at + 2]));
          const index = nearest(table.subarray(0, paletteEntries * 3), r, g, b);
          indices[y * width + x] = index;
          const errors = [
            r - table[index * 3],
            g - table[index * 3 + 1],
            b - table[index * 3 + 2],
          ];
          const spread: [number, number, number][] = [
            [1, 0, 7 / 16],
            [-1, 1, 3 / 16],
            [0, 1, 5 / 16],
            [1, 1, 1 / 16],
          ];
          for (const [dx, dy, weight] of spread) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || nx >= width || ny >= height) continue;
            const target = (ny * width + nx) * 4;
            for (let c = 0; c < 3; c += 1)
              work[target + c] += errors[c] * weight;
          }
        }
      }
    } else {
      for (let pixel = 0; pixel < width * height; pixel += 1) {
        const at = pixel * 4;
        const key =
          (frame.rgba[at] << 16) |
          (frame.rgba[at + 1] << 8) |
          frame.rgba[at + 2];
        // Every colour in the image is in the lookup, because the histogram was
        // built from these same frames.
        indices[pixel] = lookup.get(key) ?? 0;
      }
    }

    // Graphic control extension: disposal 1 (leave in place), no transparency.
    bytes.push(
      0x21,
      0xf9,
      0x04,
      0x04,
      ...u16(Math.max(0, Math.round(frame.delayCentiseconds))),
      0x00,
      0x00,
    );
    // Image descriptor: full frame, no local table, not interlaced.
    bytes.push(0x2c, ...u16(0), ...u16(0), ...u16(width), ...u16(height), 0x00);
    bytes.push(minCodeSize);
    bytes.push(...subBlocks(lzwCompress(indices, minCodeSize)));
  }

  bytes.push(0x3b); // trailer
  return new Uint8Array(bytes);
}
