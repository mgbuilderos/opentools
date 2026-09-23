/* oxlint-disable */
'use client';

/*
  ONE ENGINE, MANY PAGES.

  This component is the whole of `/image`'s new surface: thirty-four jobs, each
  with its own URL and its own title, all driven by one record from
  `lib/tools/image-studio-operations.ts`. The alternative was thirty-four
  components, each repeating the file picker, the decode, the canvas, the
  encoder and the object-URL bookkeeping — and repeating the same four bugs
  thirty-four times over.

  What is shared is the machinery. What is NOT shared is the page: the heading,
  the sentence under it, the controls and the wording of the result all come
  from the operation, because a page that is a template with two words swapped
  earns nothing.

  THE PIPELINE, IN ORDER. Choose files → decode each through an
  `HTMLImageElement` (which is also what gives SVG, AVIF, GIF and BMP support,
  for free, from whatever the browser can already read) → work out the output
  canvas from the operation's own maths in `lib/tools/image-studio.ts` → draw →
  optionally run a pixel pass → encode with `canvas.toBlob` → hand back an
  object URL. Nothing here reaches off the tab, and
  `lib/tools/local-source-policy.test.ts` fails the build on the primitives
  that would let it.

  WHAT THE BROWSER DECIDES, NOT US. `canvas.toBlob` may answer a WebP request
  with a PNG — WebKit does. The result is reported as the format the browser
  actually produced and the file is named for that, because a file named for a
  format it is not is a bug someone else discovers.
*/

import {
  ArrowDownToLine,
  Check,
  Copy,
  FileImage,
  LockKeyhole,
  Trash2,
  X,
} from 'lucide-react';
import NextImage from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import { RelatedTools } from '@/components/related-tools';
import { Button } from '@/components/ui/button';
import { announceCompletion } from '@/lib/completion';
import type { RelatedTool } from '@/lib/seo/related-tools';
import { encodeIco, type IcoFrame } from '@/lib/tools/favicon-pack';
import {
  applyBoxBlur,
  applyBrightnessContrast,
  applyGrayscale,
  applyInvert,
  applyMedianDenoise,
  applyPixelate,
  applyRegionBlur,
  applySepia,
  applySharpen,
  borderPlan,
  centredAspectCrop,
  clampRect,
  cornerRadius,
  extensionForImageType,
  extractPalette,
  FAVICON_SIZES,
  gridPlan,
  ICO_SIZES,
  outputFileName,
  overlayOrigin,
  parseImageDataUrl,
  pixelAt,
  resizePlan,
  sniffImageType,
  socialPreset,
  splitPlan,
  spriteCss,
  type ImageStudioOperation,
  type OverlayPosition,
  type PaletteEntry,
  type PixelRect,
} from '@/lib/tools/image-studio';

/** 25 MB per file, the same ceiling the other image tools here use. */
const MAX_BYTES = 25 * 1024 * 1024;
const MAX_FILES = 40;
/** A canvas larger than this is refused by browsers rather than allocated. */
const MAX_PIXELS = 64_000_000;

type Decoded = {
  file: File;
  url: string;
  element: HTMLImageElement;
  width: number;
  height: number;
};

type Produced = {
  name: string;
  blob: Blob;
  url: string;
  width: number;
  height: number;
  sourceBytes: number;
};

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(
        new Error(
          'This browser could not decode that file. It may be a format it does not support.',
        ),
      );
    image.src = url;
  });
}

function encode(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error('The browser could not encode this image.')),
      type,
      quality,
    );
  });
}

function canvasOf(width: number, height: number, opaque: boolean) {
  if (width * height > MAX_PIXELS) {
    throw new Error(
      'That would make a canvas larger than the 64 megapixel limit browsers allow.',
    );
  }
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const context = canvas.getContext('2d', { alpha: !opaque });
  if (!context) {
    throw new Error('Canvas processing is unavailable in this browser.');
  }
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  return { canvas, context };
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Scale a picture to sit inside a box without distorting it. */
function containBox(
  sourceWidth: number,
  sourceHeight: number,
  boxWidth: number,
  boxHeight: number,
) {
  const scale = Math.min(boxWidth / sourceWidth, boxHeight / sourceHeight);
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  return {
    width,
    height,
    x: Math.round((boxWidth - width) / 2),
    y: Math.round((boxHeight - height) / 2),
  };
}

export function ImageStudioTool({
  operation,
  relatedTools = [],
}: {
  operation: ImageStudioOperation;
  relatedTools?: readonly RelatedTool[];
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const sourcesRef = useRef<Decoded[]>([]);
  const resultsRef = useRef<Produced[]>([]);
  /** Full-resolution pixels of the first source, for click-to-pick. */
  const sampleRef = useRef<{
    data: Uint8ClampedArray;
    width: number;
    height: number;
  } | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  const [sources, setSources] = useState<Decoded[]>([]);
  const [results, setResults] = useState<Produced[]>([]);
  const [text, setText] = useState('');
  const [palette, setPalette] = useState<PaletteEntry[]>([]);
  const [picks, setPicks] = useState<
    { hex: string; rgb: string; x: number; y: number }[]
  >([]);
  const [region, setRegion] = useState<PixelRect | null>(null);
  const [dragFrom, setDragFrom] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      operation.fields.map((field) => [field.id, field.defaultValue]),
    ),
  );

  const needsRegion = operation.action.kind === 'region';
  const isPicker = operation.action.kind === 'colour-picker';
  const takesFiles = operation.action.kind !== 'from-base64';

  useEffect(() => {
    sourcesRef.current = sources;
  }, [sources]);
  useEffect(() => {
    resultsRef.current = results;
  }, [results]);
  useEffect(
    () => () => {
      for (const source of sourcesRef.current) URL.revokeObjectURL(source.url);
      for (const result of resultsRef.current) URL.revokeObjectURL(result.url);
    },
    [],
  );
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const value = (id: string) => values[id] ?? '';
  const numeric = (id: string, fallback = 0) => {
    const parsed = Number(values[id]);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const checked = (id: string) => values[id] === 'on';

  const clearResults = () => {
    for (const result of resultsRef.current) URL.revokeObjectURL(result.url);
    resultsRef.current = [];
    setResults([]);
    setText('');
    setPalette([]);
  };

  const setField = (id: string, next: string) => {
    clearResults();
    setValues((current) => ({ ...current, [id]: next }));
  };

  /** Full-resolution pixels of the first image, kept for the picker. */
  const rememberSample = (decoded: Decoded) => {
    if (!isPicker && operation.action.kind !== 'palette') return;
    try {
      const { canvas, context } = canvasOf(
        decoded.width,
        decoded.height,
        false,
      );
      context.drawImage(decoded.element, 0, 0);
      const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
      sampleRef.current = { data, width: canvas.width, height: canvas.height };
    } catch {
      sampleRef.current = null;
    }
  };

  const chooseFiles = async (list: FileList | null) => {
    if (!list || list.length === 0 || busy) return;
    clearResults();
    setError('');
    setPicks([]);
    setRegion(null);
    const incoming = [...list].slice(0, MAX_FILES);
    const oversized = incoming.find((file) => file.size > MAX_BYTES);
    if (oversized) {
      setError(`${oversized.name} is over the 25 MB limit for one file.`);
      return;
    }
    const decoded: Decoded[] = [];
    try {
      for (const file of incoming) {
        const url = URL.createObjectURL(file);
        const element = await loadImage(url);
        decoded.push({
          file,
          url,
          element,
          // An SVG with no intrinsic size decodes at the browser's default
          // box; that is a real size and the operations below can work from
          // it, so it is used rather than refused.
          width: element.naturalWidth || element.width || 1,
          height: element.naturalHeight || element.height || 1,
        });
      }
    } catch (caught) {
      for (const item of decoded) URL.revokeObjectURL(item.url);
      setError(
        caught instanceof Error
          ? caught.message
          : 'That file could not be read.',
      );
      return;
    }
    for (const previous of sourcesRef.current)
      URL.revokeObjectURL(previous.url);
    sourcesRef.current = decoded;
    setSources(decoded);
    if (decoded[0]) {
      rememberSample(decoded[0]);
      if (needsRegion) {
        // A sensible starting box: the middle third, which is almost always
        // nearer the subject than a full-frame default would be.
        setRegion({
          x: Math.round(decoded[0].width / 3),
          y: Math.round(decoded[0].height / 3),
          width: Math.round(decoded[0].width / 3),
          height: Math.round(decoded[0].height / 3),
        });
      }
    }
  };

  /* ------------------------------------------------------------ encoding */

  const resolveType = (source: Decoded | null): string => {
    if (operation.outputType && operation.outputType !== 'image/x-icon') {
      return operation.outputType;
    }
    const chosen = value('format');
    if (chosen && chosen !== 'keep') return chosen;
    const sourceType = source?.file.type ?? '';
    return sourceType === 'image/jpeg' ||
      sourceType === 'image/webp' ||
      sourceType === 'image/png'
      ? sourceType
      : 'image/png';
  };

  const qualityFraction = () => {
    const raw = numeric('quality', 90);
    return Math.min(1, Math.max(0.05, raw / 100));
  };

  const finish = async (
    canvas: HTMLCanvasElement,
    type: string,
    source: Decoded | null,
    suffix: string,
  ): Promise<Produced> => {
    const blob = await encode(canvas, type, qualityFraction());
    const actual = blob.type || type;
    return {
      name: outputFileName(
        source?.file.name ?? 'image',
        suffix,
        extensionForImageType(actual),
      ),
      blob,
      url: URL.createObjectURL(blob),
      width: canvas.width,
      height: canvas.height,
      sourceBytes: source?.file.size ?? 0,
    };
  };

  /** Draws one source at a given output size, filling opaque formats first. */
  const drawWhole = (
    source: Decoded,
    width: number,
    height: number,
    type: string,
    background: string,
  ) => {
    const opaque = type === 'image/jpeg';
    const { canvas, context } = canvasOf(width, height, opaque);
    if (opaque) {
      context.fillStyle = background;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.drawImage(source.element, 0, 0, canvas.width, canvas.height);
    return { canvas, context };
  };

  /* ------------------------------------------------------ the operations */

  const runFilter = (
    context: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
  ) => {
    const action = operation.action;
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = image.data;
    if (action.kind === 'filter') {
      if (action.filter === 'grayscale') applyGrayscale(pixels);
      if (action.filter === 'invert') applyInvert(pixels);
      if (action.filter === 'sepia') applySepia(pixels, numeric('amount', 100));
      if (action.filter === 'brightness-contrast') {
        applyBrightnessContrast(
          pixels,
          numeric('brightness', 100),
          numeric('contrast', 100),
        );
      }
      if (action.filter === 'sharpen') {
        applySharpen(
          pixels,
          canvas.width,
          canvas.height,
          numeric('amount', 80),
          numeric('radius', 1),
        );
      }
      if (action.filter === 'blur') {
        applyBoxBlur(pixels, canvas.width, canvas.height, numeric('radius', 8));
      }
      if (action.filter === 'pixelate') {
        applyPixelate(
          pixels,
          canvas.width,
          canvas.height,
          numeric('block', 12),
        );
      }
      if (action.filter === 'denoise') {
        applyMedianDenoise(
          pixels,
          canvas.width,
          canvas.height,
          numeric('radius', 1),
        );
      }
    }
    if (action.kind === 'region') {
      if (!region) throw new Error('Drag a box over the area to change first.');
      const area = clampRect(region, canvas.width, canvas.height);
      if (action.effect === 'blur') {
        applyRegionBlur(
          pixels,
          canvas.width,
          canvas.height,
          area,
          numeric('radius', 20),
        );
      } else {
        applyPixelate(
          pixels,
          canvas.width,
          canvas.height,
          numeric('block', 16),
          area,
        );
      }
    }
    context.putImageData(image, 0, 0);
  };

  const drawCaption = (
    context: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    caption: string,
    fontSize: number,
    atTop: boolean,
  ) => {
    if (!caption) return;
    context.save();
    context.font = `bold ${fontSize}px "Impact", "Haettenschweiler", "Arial Narrow", sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = atTop ? 'top' : 'bottom';
    context.lineJoin = 'round';
    context.lineWidth = Math.max(2, fontSize / 12);
    context.strokeStyle = '#000000';
    context.fillStyle = '#ffffff';
    const margin = Math.round(fontSize * 0.35);
    const y = atTop ? margin : canvas.height - margin;
    context.strokeText(caption, canvas.width / 2, y, canvas.width * 0.94);
    context.fillText(caption, canvas.width / 2, y, canvas.width * 0.94);
    context.restore();
  };

  const run = async () => {
    if (busy) return;
    setError('');
    clearResults();
    setBusy(true);
    const started = performance.now();
    const produced: Produced[] = [];
    let textOutput = '';
    let paletteOutput: PaletteEntry[] = [];

    try {
      const action = operation.action;
      if (takesFiles && sources.length === 0) {
        throw new Error('Choose an image first.');
      }
      const first = sources[0] ?? null;

      if (action.kind === 'from-base64') {
        const { mediaType, base64 } = parseImageDataUrl(value('base64'));
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) {
          bytes[index] = binary.charCodeAt(index);
        }
        const sniffed = sniffImageType(bytes) || mediaType;
        if (!sniffed) {
          throw new Error(
            'Those bytes are not an image format this page recognises.',
          );
        }
        const blob = new Blob([bytes], { type: sniffed });
        const url = URL.createObjectURL(blob);
        const element = await loadImage(url);
        produced.push({
          name: `decoded-image.${extensionForImageType(sniffed)}`,
          blob,
          url,
          width: element.naturalWidth,
          height: element.naturalHeight,
          sourceBytes: base64.length,
        });
      } else if (action.kind === 'to-base64') {
        if (!first) throw new Error('Choose an image first.');
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () =>
            reject(new Error('That file could not be read.'));
          reader.readAsDataURL(first.file);
        });
        const bare = base64.slice(base64.indexOf(',') + 1);
        const wrap = value('wrap');
        textOutput =
          wrap === 'raw'
            ? bare
            : wrap === 'css'
              ? `background-image: url('${base64}');`
              : wrap === 'html'
                ? `<img src="${base64}" alt="" width="${first.width}" height="${first.height}">`
                : base64;
      } else if (action.kind === 'palette') {
        if (!first) throw new Error('Choose an image first.');
        const { canvas, context } = canvasOf(first.width, first.height, false);
        context.drawImage(first.element, 0, 0);
        const image = context.getImageData(0, 0, canvas.width, canvas.height);
        paletteOutput = extractPalette(image.data, numeric('count', 8));
        textOutput = paletteOutput
          .map(
            (entry) =>
              `${entry.hex}  rgb(${entry.red}, ${entry.green}, ${entry.blue})  ${(entry.share * 100).toFixed(1)}%`,
          )
          .join('\n');
      } else if (action.kind === 'colour-picker') {
        throw new Error(
          'Click anywhere on the picture to read a colour — there is nothing to run.',
        );
      } else if (action.kind === 'split') {
        if (!first) throw new Error('Choose an image first.');
        const type = resolveType(first);
        const tiles = splitPlan(
          first.width,
          first.height,
          numeric('rows', 3),
          numeric('columns', 3),
        );
        for (const tile of tiles) {
          const { canvas, context } = canvasOf(
            tile.width,
            tile.height,
            type === 'image/jpeg',
          );
          if (type === 'image/jpeg') {
            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, canvas.width, canvas.height);
          }
          context.drawImage(
            first.element,
            tile.x,
            tile.y,
            tile.width,
            tile.height,
            0,
            0,
            tile.width,
            tile.height,
          );
          produced.push(
            await finish(canvas, type, first, `r${tile.row}c${tile.column}`),
          );
        }
      } else if (action.kind === 'favicon') {
        if (!first) throw new Error('Choose an image first.');
        const transparent = checked('keepTransparent');
        const squares = new Map<number, Blob>();
        for (const size of FAVICON_SIZES) {
          const { canvas, context } = canvasOf(size, size, !transparent);
          if (!transparent) {
            context.fillStyle = value('colour') || '#ffffff';
            context.fillRect(0, 0, size, size);
          }
          const box = containBox(first.width, first.height, size, size);
          context.drawImage(first.element, box.x, box.y, box.width, box.height);
          const blob = await encode(canvas, 'image/png', 1);
          squares.set(size, blob);
          produced.push({
            name: `favicon-${size}x${size}.png`,
            blob,
            url: URL.createObjectURL(blob),
            width: size,
            height: size,
            sourceBytes: first.file.size,
          });
        }
        const frames: IcoFrame[] = [];
        for (const size of ICO_SIZES) {
          const blob = squares.get(size);
          if (!blob) continue;
          frames.push({
            width: size,
            height: size,
            pngBytes: new Uint8Array(await blob.arrayBuffer()),
          });
        }
        // Copied into a plain ArrayBuffer because `encodeIco` returns the
        // widened `Uint8Array<ArrayBufferLike>`, which is not a `BlobPart`.
        const ico = encodeIco(frames);
        const icoBuffer = new ArrayBuffer(ico.byteLength);
        new Uint8Array(icoBuffer).set(ico);
        const icoBlob = new Blob([icoBuffer], { type: 'image/x-icon' });
        produced.unshift({
          name: 'favicon.ico',
          blob: icoBlob,
          url: URL.createObjectURL(icoBlob),
          width: ICO_SIZES[ICO_SIZES.length - 1] ?? 48,
          height: ICO_SIZES[ICO_SIZES.length - 1] ?? 48,
          sourceBytes: first.file.size,
        });
        textOutput = [
          '<link rel="icon" href="/favicon.ico" sizes="any">',
          '<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">',
          '<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">',
          '<link rel="apple-touch-icon" sizes="180x180" href="/favicon-180x180.png">',
          '<link rel="icon" type="image/png" sizes="192x192" href="/favicon-192x192.png">',
        ].join('\n');
      } else if (action.kind === 'collage' || action.kind === 'sprite-sheet') {
        if (sources.length === 0) throw new Error('Choose some images first.');
        const cell = numeric('cell', action.kind === 'collage' ? 600 : 64);
        const plan = gridPlan(
          sources.length,
          numeric('columns', action.kind === 'collage' ? 3 : 4),
          cell,
          cell,
          numeric('gap', action.kind === 'collage' ? 16 : 0),
        );
        const type =
          action.kind === 'sprite-sheet' ? 'image/png' : resolveType(first);
        const opaque = type === 'image/jpeg';
        const { canvas, context } = canvasOf(plan.width, plan.height, opaque);
        // A collage's background is a choice the person made, so it is painted
        // whether or not the format could have carried transparency. A sprite
        // sheet's is not: the gaps between frames must stay see-through.
        if (action.kind === 'collage') {
          context.fillStyle = value('colour') || '#ffffff';
          context.fillRect(0, 0, canvas.width, canvas.height);
        } else if (opaque) {
          context.fillStyle = '#ffffff';
          context.fillRect(0, 0, canvas.width, canvas.height);
        }
        plan.cells.forEach((slot, index) => {
          const source = sources[index];
          if (!source) return;
          const box = containBox(
            source.width,
            source.height,
            slot.width,
            slot.height,
          );
          context.drawImage(
            source.element,
            slot.x + box.x,
            slot.y + box.y,
            box.width,
            box.height,
          );
        });
        produced.push(
          await finish(
            canvas,
            type,
            first,
            action.kind === 'collage' ? 'collage' : 'sprite',
          ),
        );
        if (action.kind === 'sprite-sheet') {
          textOutput = spriteCss(
            plan.cells,
            produced[0]?.name ?? 'sprite.png',
            value('className') || 'sprite',
          );
        }
      } else {
        // Everything that is one image in, one image out — per file.
        for (const source of sources) {
          const type = resolveType(source);
          const background =
            value('background') || value('colour') || '#ffffff';
          let canvas: HTMLCanvasElement;
          let context: CanvasRenderingContext2D;
          let suffix = operation.id;

          if (action.kind === 'resize') {
            const mode = (value('mode') || 'fit') as
              | 'fit'
              | 'exact'
              | 'percent';
            const plan = resizePlan(source.width, source.height, {
              mode,
              width: numeric('width'),
              height: numeric('height'),
              percent: numeric('percent', 100),
            });
            ({ canvas, context } = drawWhole(
              source,
              plan.width,
              plan.height,
              type,
              background,
            ));
            suffix = `${plan.width}x${plan.height}`;
          } else if (action.kind === 'social-crop') {
            const preset = socialPreset(value('preset'));
            const crop = centredAspectCrop(
              source.width,
              source.height,
              preset.width,
              preset.height,
            );
            const opaque = type === 'image/jpeg';
            ({ canvas, context } = canvasOf(
              preset.width,
              preset.height,
              opaque,
            ));
            if (opaque) {
              context.fillStyle = background;
              context.fillRect(0, 0, canvas.width, canvas.height);
            }
            context.drawImage(
              source.element,
              crop.x,
              crop.y,
              crop.width,
              crop.height,
              0,
              0,
              preset.width,
              preset.height,
            );
            suffix = preset.value;
          } else if (action.kind === 'border') {
            const plan = borderPlan(
              source.width,
              source.height,
              numeric('thickness', 24),
            );
            ({ canvas, context } = canvasOf(
              plan.width,
              plan.height,
              type === 'image/jpeg',
            ));
            context.fillStyle = value('colour') || '#ffffff';
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.drawImage(source.element, plan.offset, plan.offset);
            suffix = 'bordered';
          } else if (action.kind === 'round-corners') {
            const radius = cornerRadius(
              source.width,
              source.height,
              numeric('radius', 12),
              value('unit') === 'px' ? 'px' : 'percent',
            );
            ({ canvas, context } = canvasOf(
              source.width,
              source.height,
              false,
            ));
            context.save();
            context.beginPath();
            roundedPath(context, 0, 0, canvas.width, canvas.height, radius);
            context.clip();
            context.drawImage(source.element, 0, 0);
            context.restore();
            suffix = 'rounded';
          } else if (action.kind === 'watermark') {
            ({ canvas, context } = drawWhole(
              source,
              source.width,
              source.height,
              type,
              background,
            ));
            stampWatermark(context, canvas, {
              text: value('text'),
              sizePercent: numeric('size', 5),
              colour: value('colour') || '#ffffff',
              opacity: numeric('opacity', 60),
              position: (value('position') ||
                'bottom-right') as OverlayPosition,
              margin: numeric('margin', 24),
            });
            suffix = 'watermarked';
          } else if (action.kind === 'meme') {
            ({ canvas, context } = drawWhole(
              source,
              source.width,
              source.height,
              type,
              background,
            ));
            const fontSize = Math.max(
              12,
              Math.round((canvas.height * numeric('size', 10)) / 100),
            );
            const cased = (line: string) =>
              checked('uppercase') ? line.toUpperCase() : line;
            drawCaption(context, canvas, cased(value('top')), fontSize, true);
            drawCaption(
              context,
              canvas,
              cased(value('bottom')),
              fontSize,
              false,
            );
            if (!value('top') && !value('bottom')) {
              throw new Error('Type a top line, a bottom line, or both.');
            }
            suffix = 'meme';
          } else {
            /*
              convert, strip-metadata, filter and region all start from a
              straight redraw.

              At the source size, except for a converter that declares a
              `width` control — which is what SVG-to-PNG needs and why it has
              one: a vector has no true pixel size, so "at what width" is the
              only question that page has to ask. Until 2026-09-23 the control
              was drawn and then ignored, and the converter always answered at
              whatever box the browser gave the drawing. Found by running the
              page, not by a test, which is why there is now a test that every
              field belongs to an action that reads it.
            */
            const askedWidth =
              action.kind === 'convert' &&
              operation.fields.some((field) => field.id === 'width')
                ? numeric('width')
                : 0;
            const size =
              askedWidth > 0
                ? resizePlan(source.width, source.height, {
                    mode: 'fit',
                    width: askedWidth,
                    height: 0,
                  })
                : { width: source.width, height: source.height };
            ({ canvas, context } = drawWhole(
              source,
              size.width,
              size.height,
              type,
              background,
            ));
            if (action.kind === 'filter' || action.kind === 'region') {
              runFilter(context, canvas);
            }
            if (action.kind === 'convert') suffix = extensionForImageType(type);
            if (action.kind === 'strip-metadata') suffix = 'no-exif';
          }
          produced.push(await finish(canvas, type, source, suffix));
        }
      }

      if (produced.length === 0 && !textOutput) {
        throw new Error('Nothing came out of that run.');
      }

      resultsRef.current = produced;
      setResults(produced);
      setText(textOutput);
      setPalette(paletteOutput);
      const durationMs = performance.now() - started;
      announceCompletion({
        operation: operation.name,
        durationMs,
        summary: produced.length
          ? `${produced.length} file${produced.length === 1 ? '' : 's'} produced in this browser tab.`
          : `${operation.name} finished in this browser tab.`,
        metrics: produced.length
          ? [
              { label: 'Files', value: String(produced.length) },
              {
                label: 'In',
                value: formatBytes(
                  sources.reduce((sum, item) => sum + item.file.size, 0),
                ),
              },
              {
                label: 'Out',
                value: formatBytes(
                  produced.reduce((sum, item) => sum + item.blob.size, 0),
                ),
              },
            ]
          : [{ label: 'Characters', value: String(textOutput.length) }],
      });
    } catch (caught) {
      for (const item of produced) URL.revokeObjectURL(item.url);
      setError(
        caught instanceof Error
          ? caught.message
          : 'That did not work on this image.',
      );
    } finally {
      setBusy(false);
    }
  };

  const save = (item: Produced) => {
    const link = document.createElement('a');
    link.href = item.url;
    link.download = item.name;
    link.click();
  };

  const saveAll = () => {
    for (const item of results) save(item);
  };

  const copyText = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('This browser would not let the page write to the clipboard.');
    }
  };

  const clear = () => {
    clearResults();
    for (const source of sourcesRef.current) URL.revokeObjectURL(source.url);
    sourcesRef.current = [];
    setSources([]);
    setError('');
    setPicks([]);
    setRegion(null);
    sampleRef.current = null;
    if (fileRef.current) fileRef.current.value = '';
  };

  /* ------------------------------------------------ picking and dragging */

  const first = sources[0] ?? null;

  const pointToImage = (clientX: number, clientY: number) => {
    const frame = frameRef.current;
    if (!frame || !first) return null;
    const box = frame.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return null;
    const x = Math.round(((clientX - box.left) / box.width) * first.width);
    const y = Math.round(((clientY - box.top) / box.height) * first.height);
    return {
      x: Math.min(Math.max(x, 0), first.width - 1),
      y: Math.min(Math.max(y, 0), first.height - 1),
    };
  };

  const pickColour = (clientX: number, clientY: number) => {
    const sample = sampleRef.current;
    const point = pointToImage(clientX, clientY);
    if (!sample || !point) return;
    try {
      const read = pixelAt(
        sample.data,
        sample.width,
        sample.height,
        point.x,
        point.y,
      );
      setPicks((current) => [
        { hex: read.hex, rgb: read.rgb, x: point.x, y: point.y },
        ...current.slice(0, 11),
      ]);
      setText(
        [
          { hex: read.hex, rgb: read.rgb, x: point.x, y: point.y },
          ...picks.slice(0, 11),
        ]
          .map((pick) => `${pick.hex}  ${pick.rgb}  at ${pick.x}, ${pick.y}`)
          .join('\n'),
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'That point could not be read.',
      );
    }
  };

  const overlayStyle = useMemo(() => {
    if (!region || !first) return null;
    return {
      left: `${(region.x / first.width) * 100}%`,
      top: `${(region.y / first.height) * 100}%`,
      width: `${(region.width / first.width) * 100}%`,
      height: `${(region.height / first.height) * 100}%`,
    };
  }, [region, first]);

  const totalIn = sources.reduce((sum, item) => sum + item.file.size, 0);
  const totalOut = results.reduce((sum, item) => sum + item.blob.size, 0);

  return (
    <AppShell currentToolId="image-studio">
      <section
        id="tool"
        tabIndex={-1}
        className="min-w-0 px-4 py-8 sm:px-8 lg:px-12 lg:py-12"
      >
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col justify-between gap-5 border-b pb-8 sm:flex-row sm:items-start">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <span>Images</span>
                <span aria-hidden="true">/</span>
                <span className="capitalize">{operation.section}</span>
              </div>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                {operation.name}
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                {operation.description} It runs in this browser tab.
              </p>
            </div>
            <span className="flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold">
              <LockKeyhole aria-hidden="true" className="size-3.5" /> On-device
              prototype
            </span>
          </div>

          {error ? (
            <div
              ref={errorRef}
              role="alert"
              tabIndex={-1}
              className="focus-ring mt-6 flex items-start justify-between gap-4 rounded-xl border border-destructive/35 bg-destructive/5 p-4 text-sm"
            >
              <div>
                <p className="font-semibold">That didn’t work</p>
                <p className="mt-1 text-muted-foreground">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => setError('')}
                className="focus-ring rounded p-1"
                aria-label="Dismiss error"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
          ) : null}

          <section className="mt-8 overflow-hidden rounded-2xl border bg-card">
            <div className="grid lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="min-h-[460px] border-b p-4 lg:border-b-0 lg:border-r sm:p-6">
                {takesFiles ? (
                  <input
                    ref={fileRef}
                    type="file"
                    accept={operation.accept || undefined}
                    multiple={operation.multiple}
                    className="sr-only"
                    aria-label={`Choose ${operation.multiple ? 'images' : 'an image'}`}
                    onChange={(event) => void chooseFiles(event.target.files)}
                  />
                ) : null}

                {!takesFiles ? (
                  <div className="flex h-full min-h-[410px] flex-col justify-center">
                    <p className="text-sm font-semibold">Paste the Base64</p>
                    <textarea
                      value={value('base64')}
                      onChange={(event) =>
                        setField('base64', event.target.value)
                      }
                      spellCheck={false}
                      rows={results[0] ? 6 : 12}
                      aria-label="Base64 or data URL"
                      className="focus-ring mt-3 w-full rounded-lg border bg-background p-3 font-mono text-xs"
                      placeholder="data:image/png;base64,…"
                    />
                    {/*
                      The decoded picture, shown rather than merely offered.

                      Without it this page decoded the bytes and handed over a
                      Save button with nothing to look at, so the one question
                      a person pastes Base64 to answer -- what is this? -- went
                      unanswered until they had saved a file and opened it.
                    */}
                    {results[0] ? (
                      <div className="mt-4 border-t pt-4">
                        <p className="text-xs text-muted-foreground">
                          {results[0].width} × {results[0].height}px ·{' '}
                          {formatBytes(results[0].blob.size)} ·{' '}
                          {results[0].name}
                        </p>
                        <div className="mt-3 grid place-items-center">
                          <NextImage
                            src={results[0].url}
                            width={results[0].width}
                            height={results[0].height}
                            unoptimized
                            alt="The picture those Base64 bytes decode to"
                            className="max-h-[260px] max-w-full rounded-lg object-contain shadow-sm"
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : first ? (
                  <div className="flex h-full min-h-[410px] flex-col">
                    <div className="flex items-center justify-between gap-3 border-b pb-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {sources.length === 1
                            ? first.file.name
                            : `${sources.length} images`}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {first.width} × {first.height}px ·{' '}
                          {formatBytes(totalIn)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="h-10"
                          onClick={() => fileRef.current?.click()}
                        >
                          Replace
                        </Button>
                        <Button
                          variant="outline"
                          className="h-10"
                          onClick={clear}
                          aria-label="Remove the chosen images"
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid flex-1 place-items-center py-6">
                      <div
                        ref={frameRef}
                        className="relative inline-block max-w-full"
                        onPointerDown={(event) => {
                          if (isPicker) {
                            pickColour(event.clientX, event.clientY);
                            return;
                          }
                          if (!needsRegion) return;
                          const point = pointToImage(
                            event.clientX,
                            event.clientY,
                          );
                          if (!point) return;
                          setDragFrom(point);
                          setRegion({ ...point, width: 1, height: 1 });
                          clearResults();
                        }}
                        onPointerMove={(event) => {
                          if (!dragFrom || !needsRegion) return;
                          const point = pointToImage(
                            event.clientX,
                            event.clientY,
                          );
                          if (!point) return;
                          setRegion({
                            x: Math.min(dragFrom.x, point.x),
                            y: Math.min(dragFrom.y, point.y),
                            width: Math.max(1, Math.abs(point.x - dragFrom.x)),
                            height: Math.max(1, Math.abs(point.y - dragFrom.y)),
                          });
                        }}
                        onPointerUp={() => setDragFrom(null)}
                        onPointerLeave={() => setDragFrom(null)}
                      >
                        <NextImage
                          src={results[0]?.url ?? first.url}
                          width={results[0]?.width ?? first.width}
                          height={results[0]?.height ?? first.height}
                          unoptimized
                          draggable={false}
                          alt={
                            results[0]
                              ? 'The result of this tool'
                              : 'The image you chose'
                          }
                          className={`max-h-[520px] max-w-full rounded-lg object-contain shadow-sm ${isPicker || needsRegion ? 'cursor-crosshair' : ''}`}
                        />
                        {needsRegion && overlayStyle && !results[0] ? (
                          <span
                            aria-hidden="true"
                            style={overlayStyle}
                            className="pointer-events-none absolute border-2 border-dashed border-foreground/80 bg-foreground/10"
                          />
                        ) : null}
                      </div>
                    </div>
                    {needsRegion ? (
                      <p className="pb-2 text-center text-xs text-muted-foreground">
                        Drag a box over the part to change, or type the
                        rectangle on the right.
                      </p>
                    ) : null}
                    {isPicker ? (
                      <p className="pb-2 text-center text-xs text-muted-foreground">
                        Click anywhere on the picture to read that pixel.
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <button
                    type="button"
                    aria-label={`Choose ${operation.multiple ? 'images' : 'an image'}`}
                    onClick={() => fileRef.current?.click()}
                    className="focus-ring grid min-h-[420px] w-full place-items-center rounded-xl border border-dashed bg-muted/45 p-8 text-center"
                  >
                    <span>
                      <span className="mx-auto grid size-12 place-items-center rounded-xl border bg-background">
                        <FileImage aria-hidden="true" className="size-5" />
                      </span>
                      <span className="mt-4 block font-semibold">
                        {operation.multiple
                          ? 'Choose one or more images'
                          : 'Choose an image'}
                      </span>
                      <span className="mt-1 block text-sm text-muted-foreground">
                        Up to 25 MB each
                        {operation.multiple ? `, ${MAX_FILES} at a time` : ''}
                      </span>
                    </span>
                  </button>
                )}
              </div>

              <div className="p-4 sm:p-6">
                <h2 className="text-sm font-semibold">Settings</h2>

                {needsRegion ? (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {(['x', 'y', 'width', 'height'] as const).map((part) => (
                      <label
                        key={part}
                        className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        {part}
                        <input
                          type="number"
                          min={part === 'width' || part === 'height' ? 1 : 0}
                          value={region?.[part] ?? 0}
                          disabled={!first || busy}
                          onChange={(event) => {
                            clearResults();
                            setRegion((current) => ({
                              x: current?.x ?? 0,
                              y: current?.y ?? 0,
                              width: current?.width ?? 1,
                              height: current?.height ?? 1,
                              [part]: Number(event.target.value),
                            }));
                          }}
                          className="focus-ring mt-2 h-10 w-full rounded-lg border bg-background px-3 text-sm text-foreground"
                        />
                      </label>
                    ))}
                  </div>
                ) : null}

                {operation.fields
                  .filter((field) => field.id !== 'base64')
                  .map((field) => {
                    if (field.id === 'quality') {
                      const type = resolveType(first);
                      if (type === 'image/png') return null;
                    }
                    return (
                      <label
                        key={field.id}
                        className="mt-4 block text-xs font-semibold"
                      >
                        {field.label}
                        {field.type === 'range' ? (
                          <span className="ml-2 tabular text-muted-foreground">
                            {value(field.id)}
                          </span>
                        ) : null}
                        {field.type === 'select' ? (
                          <select
                            value={value(field.id)}
                            disabled={busy}
                            onChange={(event) =>
                              setField(field.id, event.target.value)
                            }
                            className="focus-ring mt-2 h-10 w-full rounded-lg border bg-background px-3 text-sm font-normal text-foreground"
                          >
                            {(field.options ?? []).map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : field.type === 'range' ? (
                          <input
                            type="range"
                            min={field.min}
                            max={field.max}
                            step={field.step ?? 1}
                            value={value(field.id)}
                            disabled={busy}
                            onChange={(event) =>
                              setField(field.id, event.target.value)
                            }
                            className="mt-2 h-6 w-full cursor-pointer accent-foreground"
                          />
                        ) : field.type === 'checkbox' ? (
                          <input
                            type="checkbox"
                            checked={checked(field.id)}
                            disabled={busy}
                            onChange={(event) =>
                              setField(
                                field.id,
                                event.target.checked ? 'on' : '',
                              )
                            }
                            className="ml-3 size-4 accent-foreground align-middle"
                          />
                        ) : field.type === 'colour' ? (
                          <input
                            type="color"
                            value={value(field.id)}
                            disabled={busy}
                            onChange={(event) =>
                              setField(field.id, event.target.value)
                            }
                            className="focus-ring mt-2 h-10 w-full cursor-pointer rounded-lg border bg-background"
                          />
                        ) : field.type === 'number' ? (
                          <input
                            type="number"
                            min={field.min}
                            max={field.max}
                            value={value(field.id)}
                            disabled={busy}
                            onChange={(event) =>
                              setField(field.id, event.target.value)
                            }
                            className="focus-ring mt-2 h-10 w-full rounded-lg border bg-background px-3 text-sm font-normal text-foreground"
                          />
                        ) : (
                          <input
                            type="text"
                            value={value(field.id)}
                            disabled={busy}
                            onChange={(event) =>
                              setField(field.id, event.target.value)
                            }
                            className="focus-ring mt-2 h-10 w-full rounded-lg border bg-background px-3 text-sm font-normal text-foreground"
                          />
                        )}
                        {field.help ? (
                          <span className="mt-1 block text-[11px] font-normal leading-4 text-muted-foreground">
                            {field.help}
                          </span>
                        ) : null}
                      </label>
                    );
                  })}

                {isPicker ? (
                  <div className="mt-5">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Colours you picked
                    </h3>
                    {picks.length === 0 ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        None yet — click the picture.
                      </p>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {picks.map((pick, index) => (
                          <li
                            key={`${pick.hex}-${pick.x}-${pick.y}-${index}`}
                            className="flex items-center gap-3 text-xs"
                          >
                            <span
                              aria-hidden="true"
                              style={{ backgroundColor: pick.hex }}
                              className="size-6 shrink-0 rounded border"
                            />
                            <span className="font-mono font-semibold">
                              {pick.hex}
                            </span>
                            <span className="text-muted-foreground">
                              {pick.rgb}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <Button
                    className="mt-6 w-full"
                    disabled={busy || (takesFiles && sources.length === 0)}
                    onClick={() => void run()}
                  >
                    {busy ? 'Working…' : operation.name}
                  </Button>
                )}

                {results.length > 0 ? (
                  <div className="mt-5 rounded-xl border bg-muted/35 p-4">
                    <p className="text-xs font-semibold">
                      {results.length} file{results.length === 1 ? '' : 's'}
                      {totalOut > 0 ? ` · ${formatBytes(totalOut)}` : ''}
                    </p>
                    <Button
                      className="mt-3 w-full"
                      data-receipt-download
                      onClick={saveAll}
                    >
                      <ArrowDownToLine aria-hidden="true" />{' '}
                      {results.length === 1 ? 'Save the file' : 'Save them all'}
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          {palette.length > 0 ? (
            <section className="mt-8 rounded-2xl border bg-card p-4 sm:p-6">
              <h2 className="text-sm font-semibold">The palette</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {palette.map((entry) => (
                  <li
                    key={entry.hex}
                    className="flex items-center gap-3 rounded-xl border p-3"
                  >
                    <span
                      aria-hidden="true"
                      style={{ backgroundColor: entry.hex }}
                      className="size-10 shrink-0 rounded-lg border"
                    />
                    <span className="min-w-0">
                      <span className="block font-mono text-sm font-semibold">
                        {entry.hex}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        rgb({entry.red}, {entry.green}, {entry.blue}) ·{' '}
                        {(entry.share * 100).toFixed(1)}%
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {results.length > 1 ? (
            <section className="mt-8 rounded-2xl border bg-card p-4 sm:p-6">
              <h2 className="text-sm font-semibold">Every file</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {results.map((item) => (
                  <li
                    key={item.name}
                    className="flex items-center justify-between gap-3 rounded-xl border p-3"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold">
                        {item.name}
                      </span>
                      <span className="block text-[11px] text-muted-foreground">
                        {item.width} × {item.height}px ·{' '}
                        {formatBytes(item.blob.size)}
                      </span>
                    </span>
                    <Button
                      variant="outline"
                      className="h-9 shrink-0"
                      data-receipt-download
                      onClick={() => save(item)}
                      aria-label={`Save ${item.name}`}
                    >
                      <ArrowDownToLine aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {text ? (
            <section className="mt-8 rounded-2xl border bg-card p-4 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold">
                  {operation.action.kind === 'sprite-sheet'
                    ? 'The CSS'
                    : operation.action.kind === 'favicon'
                      ? 'Tags for your <head>'
                      : 'The text'}
                </h2>
                <Button
                  variant="outline"
                  className="h-9"
                  onClick={() => void copyText()}
                >
                  {copied ? (
                    <Check aria-hidden="true" />
                  ) : (
                    <Copy aria-hidden="true" />
                  )}{' '}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <textarea
                readOnly
                value={text}
                rows={Math.min(18, Math.max(4, text.split('\n').length))}
                aria-label="The text this tool produced"
                className="focus-ring mt-3 w-full rounded-lg border bg-background p-3 font-mono text-xs"
              />
            </section>
          ) : null}

          <RelatedTools tools={relatedTools} />
        </div>
      </section>
    </AppShell>
  );
}

/** A rounded rectangle path, written out because `roundRect` is newer than
 *  some of the browsers this site still answers. */
function roundedPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

function stampWatermark(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  options: {
    text: string;
    sizePercent: number;
    colour: string;
    opacity: number;
    position: OverlayPosition;
    margin: number;
  },
) {
  const line = options.text.trim();
  if (!line) throw new Error('Type the words you want stamped on the picture.');
  const shortest = Math.min(canvas.width, canvas.height);
  const fontSize = Math.max(
    10,
    Math.round(
      (shortest * Math.min(40, Math.max(1, options.sizePercent))) / 100,
    ),
  );
  context.save();
  context.font = `600 ${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  context.textBaseline = 'top';
  context.textAlign = 'left';
  const metrics = context.measureText(line);
  const width = Math.ceil(metrics.width);
  const height = Math.ceil(fontSize * 1.2);
  const origin = overlayOrigin(
    canvas.width,
    canvas.height,
    width,
    height,
    options.position,
    options.margin,
  );
  context.globalAlpha = Math.min(1, Math.max(0.05, options.opacity / 100));
  context.fillStyle = options.colour;
  // A thin contrasting outline, so a pale watermark is still readable over a
  // pale photograph.
  context.lineWidth = Math.max(1, fontSize / 16);
  context.strokeStyle = readableOutline(options.colour);
  context.strokeText(line, origin.x, origin.y);
  context.fillText(line, origin.x, origin.y);
  context.restore();
}

/** Black behind a light watermark, white behind a dark one. */
function readableOutline(colour: string) {
  const match = /^#([\da-f]{6})$/iu.exec(colour.trim());
  if (!match) return '#000000';
  const hex = match[1]!;
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue > 140
    ? '#000000'
    : '#ffffff';
}
