import {
  createEmailPackageZip,
  generateEmailHtml,
  generateWebHtml,
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

export async function convertFilesToHtml(
  inputs: RawFileInput[],
  options: HtmlConversionOptions = {},
): Promise<HtmlConversionResult> {
  if (!inputs || inputs.length === 0) {
    throw new Error('No files provided for HTML conversion.');
  }

  const slices: HtmlSliceItem[] = [];
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

    const cleanFilename = input.name.replace(/[^\w.-]/g, '_');

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
  };
}
