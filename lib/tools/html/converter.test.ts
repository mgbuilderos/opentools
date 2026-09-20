import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { extractEntry, readZip } from '../archive/zip-reader';
import { convertFilesToHtml, type RawFileInput } from './converter';
import { generateEmailHtml, generateWebHtml } from './generator';
import { getImageDimensions } from './image-dimensions';
import type { HtmlSliceItem } from './types';

const fixtureDir = path.resolve(__dirname, '__fixtures__');
const readFixture = (name: string) =>
  fs.readFileSync(path.join(fixtureDir, name));

describe('File to HTML Converter', () => {
  describe('getImageDimensions', () => {
    it('extracts dimensions from PNG', () => {
      const bytes = readFixture('product.png');
      const dim = getImageDimensions(bytes);
      expect(dim).toEqual({ format: 'png', width: 64, height: 64 });
    });

    it('extracts dimensions from JPEG', () => {
      const bytes = readFixture('banner.jpg');
      const dim = getImageDimensions(bytes);
      expect(dim).toEqual({ format: 'jpeg', width: 8, height: 8 });
    });

    it('extracts dimensions from WebP', () => {
      const bytes = readFixture('promo.webp');
      const dim = getImageDimensions(bytes);
      expect(dim).toEqual({ format: 'webp', width: 64, height: 64 });
    });

    it('extracts dimensions from SVG', () => {
      const bytes = readFixture('logo.svg');
      const dim = getImageDimensions(bytes);
      expect(dim).toEqual({ format: 'svg', width: 600, height: 120 });
    });

    it('returns null for corrupt or short bytes', () => {
      expect(getImageDimensions(new Uint8Array([1, 2, 3]))).toBeNull();
      expect(getImageDimensions(new Uint8Array(20))).toBeNull();
    });
  });

  describe('generateEmailHtml', () => {
    const slices: HtmlSliceItem[] = [
      {
        id: '1',
        filename: 'header.jpg',
        format: 'jpeg',
        width: 600,
        height: 150,
        bytes: new Uint8Array([1, 2, 3]),
        altText: 'Header Banner',
        linkUrl: 'https://example.com',
      },
      {
        id: '2',
        filename: 'body.png',
        format: 'png',
        width: 600,
        height: 400,
        bytes: new Uint8Array([4, 5, 6]),
        altText: 'Main Content',
      },
    ];

    it('generates email-safe table structure with Outlook conditional comments', () => {
      const html = generateEmailHtml(slices, {
        title: 'Special Offer',
        maxWidth: 600,
        preheader: 'Check out our latest release!',
        imagePrefix: 'images/',
      });

      // Standards check: XHTML doctype and viewport
      expect(html).toContain(
        '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN"',
      );
      expect(html).toContain('<html xmlns="http://www.w3.org/1999/xhtml"');
      expect(html).toContain('<title>Special Offer</title>');
      expect(html).toContain('Check out our latest release!');

      // Outlook conditional comments
      expect(html).toContain('<!--[if (gte mso 9)|(IE)]>');
      expect(html).toContain(
        '<table align="center" border="0" cellpadding="0" cellspacing="0" width="600">',
      );

      // Table-based presentation
      expect(html).toContain('role="presentation"');
      expect(html).not.toContain('display: flex');
      expect(html).not.toContain('display: grid');

      // Image formatting with gap prevention
      expect(html).toContain('src="images/header.jpg"');
      expect(html).toContain('src="images/body.png"');
      expect(html).toContain('display: block');
      expect(html).toContain('-ms-interpolation-mode: bicubic');

      // Link wrapping on slice 1
      expect(html).toContain('href="https://example.com"');
    });
  });

  describe('generateWebHtml', () => {
    const slices: HtmlSliceItem[] = [
      {
        id: '1',
        filename: 'banner.jpg',
        format: 'jpeg',
        width: 8,
        height: 8,
        bytes: readFixture('banner.jpg'),
      },
    ];

    it('generates standalone HTML5 with embedded base64 data URIs', () => {
      const html = generateWebHtml(slices, {
        title: 'Standalone Page',
        maxWidth: 720,
      });

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain(
        '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
      );
      expect(html).toContain('<title>Standalone Page</title>');
      expect(html).toContain('data:image/jpeg;base64,');
      expect(html).toContain('max-width: 720px;');
    });
  });

  describe('convertFilesToHtml & createEmailPackageZip', () => {
    it('converts mixed image files into email HTML, standalone web HTML, and valid ZIP package', async () => {
      const inputs: RawFileInput[] = [
        { name: 'logo.svg', bytes: readFixture('logo.svg') },
        {
          name: 'banner.jpg',
          bytes: readFixture('banner.jpg'),
          linkUrl: 'https://example.com/promo',
        },
        { name: 'product.png', bytes: readFixture('product.png') },
        { name: 'promo.webp', bytes: readFixture('promo.webp') },
      ];

      const result = await convertFilesToHtml(inputs, {
        title: 'Complete Campaign',
        maxWidth: 600,
        imagePrefix: 'images/',
      });

      expect(result.slices).toHaveLength(4);
      expect(result.slices[0]!.format).toBe('svg');
      expect(result.slices[1]!.format).toBe('jpeg');
      expect(result.slices[2]!.format).toBe('png');
      expect(result.slices[3]!.format).toBe('webp');

      // Verify ZIP package
      expect(result.emailPackageZip.byteLength).toBeGreaterThan(500);
      const archive = readZip(result.emailPackageZip);
      const paths = archive.entries.map((e) => e.path);

      expect(paths).toContain('index.html');
      expect(paths).toContain('README.txt');
      expect(paths).toContain('images/logo.svg');
      expect(paths).toContain('images/banner.jpg');
      expect(paths).toContain('images/product.png');
      expect(paths).toContain('images/promo.webp');

      // Verify extracted image bytes match input bytes
      const bannerEntry = archive.entries.find(
        (e) => e.path === 'images/banner.jpg',
      )!;
      const extractedBanner = await extractEntry(
        result.emailPackageZip,
        bannerEntry,
      );
      expect(extractedBanner).toEqual(new Uint8Array(inputs[1]!.bytes));
    });

    it('refuses empty input list', async () => {
      await expect(convertFilesToHtml([])).rejects.toThrow(
        'No files provided for HTML conversion.',
      );
    });

    it('refuses unrecognized or non-image files with clear message', async () => {
      const invalid = new TextEncoder().encode('not an image');
      await expect(
        convertFilesToHtml([{ name: 'random.bin', bytes: invalid }]),
      ).rejects.toThrow('File "random.bin" is not a recognized image format');
    });
  });
});
