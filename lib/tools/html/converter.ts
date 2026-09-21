import {
  createEmailPackageZip,
  generateEmailHtml,
  generateWebHtml,
  safeLinkUrl,
} from './generator';
import { getImageDimensions } from './image-dimensions';
import type {
  HtmlConversionOptions,
  HtmlConversionResult,
  HtmlSliceItem,
} from './types';

export interface RawFileInput {
  name: string;
  bytes: Uint8Array;
  altText?: string;
  linkUrl?: string;
}

/**
 * Keeps `logo.png` and a second, different `logo.png` apart by numbering the
 * later one, extension intact so the file still opens as what it is.
 */
export function uniqueFilename(name: string, taken: Set<string>): string {
  if (!taken.has(name)) {
    taken.add(name);
    return name;
  }
  const dot = name.lastIndexOf('.');
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  let n = 2;
  while (taken.has(`${stem}-${n}${ext}`)) n++;
  const unique = `${stem}-${n}${ext}`;
  taken.add(unique);
  return unique;
}

export async function convertFilesToHtml(
  inputs: RawFileInput[],
  options: HtmlConversionOptions = {},
): Promise<HtmlConversionResult> {
  if (!inputs || inputs.length === 0) {
    throw new Error('No files provided for HTML conversion.');
  }

  const slices: HtmlSliceItem[] = [];
  const rejectedLinks: string[] = [];
  // Two files can arrive with the same name from different folders. Both would
  // be written to the same path in the ZIP and referenced by the same `src`, so
  // one image would silently stand in for the other in the sent email.
  const usedFilenames = new Set<string>();
  let totalBytes = 0;

  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i]!;
    totalBytes += input.bytes.byteLength;

    const dim = getImageDimensions(input.bytes);
    if (!dim) {
      throw new Error(
        `File "${input.name}" is not a recognized image format (JPEG, PNG, WebP, SVG).`,
      );
    }

    const cleanFilename = uniqueFilename(
      input.name.replace(/[^\w.-]/g, '_'),
      usedFilenames,
    );

    if (input.linkUrl && !safeLinkUrl(input.linkUrl)) {
      rejectedLinks.push(input.linkUrl);
    }

    slices.push({
      id: `slice-${i + 1}-${cleanFilename}`,
      filename: cleanFilename,
      format: dim.format,
      width: dim.width,
      height: dim.height,
      bytes: input.bytes,
      altText: input.altText,
      linkUrl: input.linkUrl,
    });
  }

  const emailHtml = generateEmailHtml(slices, options);
  const webHtml = generateWebHtml(slices, options);
  const emailPackageZip = await createEmailPackageZip(
    emailHtml,
    slices,
    options,
  );

  return {
    emailHtml,
    webHtml,
    emailPackageZip,
    slices: slices.map((s) => ({
      filename: s.filename,
      format: s.format,
      width: s.width,
      height: s.height,
      byteLength: s.bytes.byteLength,
    })),
    totalBytes,
    rejectedLinks,
  };
}
