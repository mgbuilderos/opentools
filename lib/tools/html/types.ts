export type ImageFormat = 'jpeg' | 'png' | 'webp' | 'svg';

export interface ImageDimension {
  format: ImageFormat;
  width: number;
  height: number;
}

export interface HtmlSliceItem {
  id: string;
  filename: string;
  format: ImageFormat;
  width: number;
  height: number;
  bytes: Uint8Array;
  altText?: string;
  linkUrl?: string;
}

export interface HtmlConversionOptions {
  title?: string;
  maxWidth?: number; // default 600
  backgroundColor?: string; // default '#f4f4f5'
  contentBackgroundColor?: string; // default '#ffffff'
  imagePrefix?: string; // default 'images/'
  preheader?: string;
}

export interface HtmlConversionResult {
  emailHtml: string;
  webHtml: string;
  emailPackageZip: Uint8Array;
  slices: {
    filename: string;
    format: ImageFormat;
    width: number;
    height: number;
    byteLength: number;
  }[];
  totalBytes: number;
}
