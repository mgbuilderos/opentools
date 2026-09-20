/**
 * SVG Optimizer and Security Sanitizer.
 * Cleans editor metadata (Inkscape, Illustrator), comments, and redundant precision.
 * Strictly sanitizes scripts and inline event handlers to prevent XSS.
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
export function sanitizeSvg(svg: string): {
  cleanSvg: string;
  scriptsRemoved: number;
} {
  let scriptsRemoved = 0;
  let clean = svg;

  // Count and remove <script> tags
  const scriptRegex = /<script\b[^>]*>[\s\S]*?<\/script>/gi;
  const scriptMatches = clean.match(scriptRegex);
  if (scriptMatches) {
    scriptsRemoved += scriptMatches.length;
    clean = clean.replace(scriptRegex, '');
  }

  // Self-closing <script ... />
  const selfScriptRegex = /<script\b[^>]*\/>/gi;
  const selfScriptMatches = clean.match(selfScriptRegex);
  if (selfScriptMatches) {
    scriptsRemoved += selfScriptMatches.length;
    clean = clean.replace(selfScriptRegex, '');
  }

  // Event handlers (e.g. onload=, onclick=, onerror=, onmouseover=)
  const eventHandlerRegex =
    /\s+on[a-zA-Z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
  const eventMatches = clean.match(eventHandlerRegex);
  if (eventMatches) {
    scriptsRemoved += eventMatches.length;
    clean = clean.replace(eventHandlerRegex, '');
  }

  // javascript: pseudoprotocol in href or xlink:href
  const jsHrefRegex =
    /\s+(?:xlink:)?href\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi;
  const jsMatches = clean.match(jsHrefRegex);
  if (jsMatches) {
    scriptsRemoved += jsMatches.length;
    clean = clean.replace(jsHrefRegex, '');
  }

  return { cleanSvg: clean, scriptsRemoved };
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
