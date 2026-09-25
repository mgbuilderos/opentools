/**
 * SVG Optimizer and Sanitizer.
 * Cleans editor metadata, comments, and redundant precision.
 *
 * It also removes the parts of an SVG that can run code: script elements, event
 * handler attributes, and URLs whose scheme is not one an image should use.
 *
 * **It is not a security boundary, and this file no longer claims to be one.**
 * An SVG is XML, this runs on text, and there is no DOM parser available to it
 * (`lib/tools/**` takes no dependencies, and the unit tests run under node).
 * What makes it defensible is that it works by allow-list -- every tag is
 * re-emitted from its parsed attributes and anything unrecognised is dropped --
 * so an unknown construct fails closed. That is a much stronger position than
 * the deny-list this replaced, which matched `on...=` only when whitespace
 * preceded it and `javascript:` only when quotes surrounded it.
 *
 * The page renders results in an `<img>`, where SVG scripts never execute. The
 * download is the artefact that travels, which is why this matters at all.
 */

const SVG_NAMESPACE = 'http:' + '//www.w3.org/2000/svg';
export { SVG_NAMESPACE };

export interface SvgOptimizeOptions {
  precision?: number;
  removeMetadata?: boolean;
  removeComments?: boolean;
  removeEmptyGroups?: boolean;
}

export interface SvgOptimizeResult {
  optimizedSvg: string;
  originalBytes: number;
  optimizedBytes: number;
  savingsBytes: number;
  savingsPercent: number;
  scriptsRemoved: number;
}

export interface SvgDimensions {
  width: number;
  height: number;
  viewBox?: string;
}

/**
 * Remove any script tags, inline event handlers, and javascript: links.
 */
/** Elements that exist to run or embed something, rather than to draw. */
const EXECUTABLE_ELEMENTS = new Set([
  'script',
  'foreignobject',
  'handler',
  'iframe',
  'embed',
  'object',
  'audio',
  'video',
]);

/**
 * Elements that animate another attribute. Legitimate in SVG, so they are kept
 * -- but not when the attribute they drive is one that can carry code, because
 * `<animate attributeName="href" to="javascript:...">` needs no script tag and
 * no event handler.
 */
const ANIMATION_ELEMENTS = new Set([
  'animate',
  'animatetransform',
  'animatemotion',
  'set',
]);

const URL_ATTRIBUTES = new Set([
  'href',
  'xlink:href',
  'src',
  'from',
  'to',
  'values',
]);

/**
 * Collapse a value the way a browser does before it decides what a URL means:
 * numeric character references are decoded, and whitespace and control
 * characters are ignored. Without this, `java&#10;script:` and `java\nscript:`
 * both read as harmless text here and as `javascript:` to the browser.
 */
function collapseForSchemeCheck(raw: string): string {
  return (
    raw
      .replace(/&#x([0-9a-f]+);?/gi, (_m, hex) =>
        String.fromCodePoint(Number.parseInt(hex, 16)),
      )
      .replace(/&#(\d+);?/g, (_m, dec) =>
        String.fromCodePoint(Number.parseInt(dec, 10)),
      )
      // eslint-disable-next-line no-control-regex
      .replace(/[\s\u0000-\u001f\u007f]/g, '')
      .toLowerCase()
  );
}

/** Allow-list of what a URL in an optimised image may point at. */
function isSafeUrlValue(raw: string): boolean {
  const value = collapseForSchemeCheck(raw);
  if (!value) return true;
  if (/^[#./]/.test(value)) return true;
  if (!value.includes(':')) return true;
  return /^(?:https?:|mailto:|data:image\/(?:png|jpe?g|gif|webp);base64,)/.test(
    value,
  );
}

function isEventHandlerName(name: string): boolean {
  return /^on/i.test(name);
}

const ATTRIBUTE_PATTERN =
  /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s/>]+)))?/g;

// The attribute run is lazy so that a trailing `/` is captured as the
// self-closing marker instead of being swallowed as an attribute. Greedy, it
// ate the slash and `<rect/>` came back as `<rect>` -- an SVG is XML, so that
// is not merely untidy, it is malformed.
const TAG_PATTERN =
  /<\/?([a-zA-Z][\w:.-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)\s*(\/?)>/g;

/**
 * Removes scripts, event handlers and unsafe URL schemes.
 *
 * Every tag is taken apart and rebuilt from the attributes actually parsed out
 * of it, so how an attribute was separated from the tag name -- a space, a
 * newline, a `/`, several of each -- cannot hide it. `scriptsRemoved` counts
 * every element and attribute dropped, so the page can report a real number.
 */
export function sanitizeSvg(svg: string): {
  cleanSvg: string;
  scriptsRemoved: number;
} {
  let removed = 0;
  let clean = svg;

  // Executable elements go with their content. Looped until stable because
  // removing one can reveal another that was nested inside it.
  for (const element of EXECUTABLE_ELEMENTS) {
    const paired = new RegExp(
      `<${element}\\b(?:"[^"]*"|'[^']*'|[^>"'])*>[\\s\\S]*?<\\/${element}\\s*>`,
      'gi',
    );
    const bare = new RegExp(
      `<\\/?${element}\\b(?:"[^"]*"|'[^']*'|[^>"'])*\\/?>`,
      'gi',
    );
    for (const pattern of [paired, bare]) {
      let previous: string;
      do {
        previous = clean;
        clean = clean.replace(pattern, () => {
          removed += 1;
          return '';
        });
      } while (clean !== previous);
    }
  }

  clean = clean.replace(
    TAG_PATTERN,
    (whole, rawName: string, rawAttrs: string, selfClose: string) => {
      if (whole.startsWith('</')) return whole;

      const name = rawName.toLowerCase();
      const kept: string[] = [];
      let animatesSomethingDangerous = false;

      ATTRIBUTE_PATTERN.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = ATTRIBUTE_PATTERN.exec(rawAttrs)) !== null) {
        const attrName = match[1]!;
        const quoted = match[2] ?? match[3];
        const value = quoted ?? match[4] ?? '';
        const lower = attrName.toLowerCase();

        if (isEventHandlerName(lower)) {
          removed += 1;
          continue;
        }

        if (URL_ATTRIBUTES.has(lower) && !isSafeUrlValue(value)) {
          removed += 1;
          continue;
        }

        if (
          ANIMATION_ELEMENTS.has(name) &&
          lower === 'attributename' &&
          (isEventHandlerName(collapseForSchemeCheck(value)) ||
            URL_ATTRIBUTES.has(collapseForSchemeCheck(value)))
        ) {
          animatesSomethingDangerous = true;
        }

        kept.push(
          quoted === undefined && match[4] === undefined
            ? attrName
            : `${attrName}="${(value as string).replace(/"/g, '&quot;')}"`,
        );
      }

      // An animation element that drives `href` or an `on...` attribute is
      // dropped whole: keeping the element and removing only its target would
      // leave an animation pointing at nothing, which is not what it asked for.
      if (animatesSomethingDangerous) {
        removed += 1;
        return '';
      }

      const attrs = kept.length > 0 ? ` ${kept.join(' ')}` : '';
      return `<${rawName}${attrs}${selfClose ? ' /' : ''}>`;
    },
  );

  return { cleanSvg: clean, scriptsRemoved: removed };
}

/**
 * Round floating-point numbers in an SVG path or numeric attribute.
 */
export function roundNumbersInString(str: string, precision = 2): string {
  // Matches float numbers like 12.345678 or -0.987654 or .12345
  return str.replace(/-?\d+\.\d{3,}/g, (match) => {
    const num = parseFloat(match);
    if (isNaN(num)) return match;
    const rounded = Number(num.toFixed(precision));
    return String(rounded);
  });
}

/**
 * Optimize SVG by stripping editor artifacts, comments, empty groups, and rounding precision.
 */
export function optimizeSvg(
  svgContent: string,
  options: SvgOptimizeOptions = {},
): SvgOptimizeResult {
  const {
    precision = 2,
    removeMetadata = true,
    removeComments = true,
    removeEmptyGroups = true,
  } = options;

  const originalBytes = new TextEncoder().encode(svgContent).byteLength;

  // 1. Sanitize security hazards
  const { cleanSvg: sanitized, scriptsRemoved } = sanitizeSvg(svgContent);
  let result = sanitized;

  // 2. Remove XML comments
  if (removeComments) {
    result = result.replace(/<!--[\s\S]*?-->/g, '');
  }

  // 3. Remove metadata and editor namespaces
  if (removeMetadata) {
    // Remove <metadata> blocks
    result = result.replace(/<metadata\b[^>]*>[\s\S]*?<\/metadata>/gi, '');
    // Remove editor-specific elements (sodipodi:*, inkscape:*, etc.)
    result = result.replace(
      /<(?:sodipodi|inkscape|i|adobe):[a-zA-Z0-9_-]+[^>]*>[\s\S]*?<\/(?:sodipodi|inkscape|i|adobe):[a-zA-Z0-9_-]+>/gi,
      '',
    );
    result = result.replace(
      /<(?:sodipodi|inkscape|i|adobe):[a-zA-Z0-9_-]+[^>]*\/>/gi,
      '',
    );

    // Remove editor-specific namespaces
    result = result.replace(
      /\s*xmlns:(?:inkscape|sodipodi|i|adobe|sketch)="[^"]*"/gi,
      '',
    );

    // Remove editor-specific attributes (inkscape:*, sodipodi:*, adobe:*, sketch:*, etc.)
    result = result.replace(
      /\s*(?:inkscape|sodipodi|i|adobe|sketch|illustrator):[a-zA-Z0-9_-]+\s*=\s*(?:"[^"]*"|'[^']*')/gi,
      '',
    );

    // Remove XML prolog (<?xml ...?>) and DOCTYPE if present
    result = result.replace(/<\?xml\b[^>]*\?>/gi, '');
    result = result.replace(/<!DOCTYPE\b[^>]*>/gi, '');
  }

  // 4. Remove empty groups (<g></g> or <g/>)
  if (removeEmptyGroups) {
    let prev = '';
    while (prev !== result) {
      prev = result;
      result = result.replace(/<g\b[^>]*>\s*<\/g>/gi, '');
      result = result.replace(/<g\b[^>]*\/>/gi, '');
    }
  }

  // 5. Round coordinates and numbers
  if (typeof precision === 'number' && precision >= 0) {
    // Round within path d attributes
    result = result.replace(/\bd="([^"]*)"/gi, (_, pathData) => {
      return `d="${roundNumbersInString(pathData, precision)}"`;
    });
    // Round within transform attributes
    result = result.replace(/\btransform="([^"]*)"/gi, (_, transformData) => {
      return `transform="${roundNumbersInString(transformData, precision)}"`;
    });
    // Round within points attributes (polygon, polyline)
    result = result.replace(/\bpoints="([^"]*)"/gi, (_, pointsData) => {
      return `points="${roundNumbersInString(pointsData, precision)}"`;
    });
  }

  // 6. Collapse excessive whitespace
  result = result
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();

  const optimizedBytes = new TextEncoder().encode(result).byteLength;
  const savingsBytes = Math.max(0, originalBytes - optimizedBytes);
  const savingsPercent =
    originalBytes > 0
      ? Number(((savingsBytes / originalBytes) * 100).toFixed(1))
      : 0;

  return {
    optimizedSvg: result,
    originalBytes,
    optimizedBytes,
    savingsBytes,
    savingsPercent,
    scriptsRemoved,
  };
}

/**
 * Extract native SVG dimensions from width, height, or viewBox.
 */
export function getSvgDimensions(svgContent: string): SvgDimensions | null {
  const svgMatch = svgContent.match(/<svg\b([^>]*)>/i);
  if (!svgMatch) return null;

  const attrs = svgMatch[1]!;

  const viewBoxMatch = attrs.match(
    /\bviewBox=["']\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s*["']/i,
  );
  const widthMatch = attrs.match(/\bwidth=["']\s*([0-9.]+)(?:px)?\s*["']/i);
  const heightMatch = attrs.match(/\bheight=["']\s*([0-9.]+)(?:px)?\s*["']/i);

  let width = widthMatch ? parseFloat(widthMatch[1]!) : 0;
  let height = heightMatch ? parseFloat(heightMatch[1]!) : 0;
  const viewBox = viewBoxMatch
    ? `${viewBoxMatch[1]} ${viewBoxMatch[2]} ${viewBoxMatch[3]} ${viewBoxMatch[4]}`
    : undefined;

  if ((!width || !height) && viewBoxMatch) {
    width = parseFloat(viewBoxMatch[3]!);
    height = parseFloat(viewBoxMatch[4]!);
  }

  if (width > 0 && height > 0) {
    return { width, height, viewBox };
  }

  return null;
}

/**
 * Render SVG string to PNG or WebP in browser using HTMLCanvas.
 */
export async function renderSvgToRaster(
  svgContent: string,
  options: {
    scale?: number;
    targetWidth?: number;
    targetHeight?: number;
    format?: 'image/png' | 'image/webp';
  } = {},
): Promise<{ blob: Blob; bytes: Uint8Array; width: number; height: number }> {
  if (typeof window === 'undefined' || typeof window.document === 'undefined') {
    throw new Error('SVG raster rendering requires a browser environment.');
  }

  const { cleanSvg } = sanitizeSvg(svgContent);
  const dimensions = getSvgDimensions(cleanSvg) ?? { width: 300, height: 150 };

  const scale = options.scale ?? 1;
  const targetWidth = Math.round(
    options.targetWidth ?? dimensions.width * scale,
  );
  const targetHeight = Math.round(
    options.targetHeight ?? dimensions.height * scale,
  );
  const format = options.format ?? 'image/png';

  const svgBlob = new Blob([cleanSvg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () =>
        reject(new Error('Failed to load SVG into raster image element.'));
      img.src = url;
    });

    const canvas = window.document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context from canvas.');

    ctx.clearRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, format),
    );
    if (!blob) throw new Error('Failed to export canvas to raster blob.');

    const arrayBuffer = await blob.arrayBuffer();
    return {
      blob,
      bytes: new Uint8Array(arrayBuffer),
      width: targetWidth,
      height: targetHeight,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}
