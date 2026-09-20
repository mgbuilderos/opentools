import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { extractEntry, readZip } from '../archive/zip-reader';
import { convertFilesToHtml, type RawFileInput } from './converter';
import { generateEmailHtml, generateWebHtml, safeLinkUrl } from './generator';
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

  /**
   * This tool's output is code that leaves the machine: it is pasted into
   * Mailchimp and sent, or uploaded and served. So what reaches the file
   * matters even when the person typing is the person harmed, and a legitimate
   * `&` in a tracking URL breaks a page exactly as thoroughly as a deliberate
   * `<script>` does.
   */
  describe('what reaches the generated file', () => {
    const png = readFixture('product.png');
    const one = (over: Partial<HtmlSliceItem> = {}): HtmlSliceItem[] => [
      {
        id: 's1',
        filename: 'a.png',
        format: 'png',
        width: 64,
        height: 64,
        bytes: png,
        ...over,
      },
    ];

    it('leaves an already-encoded tracking link exactly as typed', () => {
      // `encodeURI` re-encoded the `%` of `%20` into `%2520`, so every UTM link
      // carrying an encoded space led somewhere that did not exist.
      const url = 'https://shop.example.com/p?utm_content=spring%20sale&a=b';
      const html = generateEmailHtml(one({ linkUrl: url }), {});

      expect(html).toContain('utm_content=spring%20sale');
      expect(html).not.toContain('%2520');
    });

    it('accepts a link typed without its scheme, and mailto', () => {
      expect(safeLinkUrl('shop.example.com/sale')).toBe(
        'https://shop.example.com/sale',
      );
      expect(safeLinkUrl('mailto:hi@example.com')).toBe(
        'mailto:hi@example.com',
      );
      expect(safeLinkUrl('  ')).toBeNull();
    });

    it('writes no javascript: link into the file, and says it did not', async () => {
      const html = generateEmailHtml(
        one({ linkUrl: 'javascript:alert(document.domain)' }),
        {},
      );
      expect(html).not.toContain('javascript:');
      expect(html).not.toContain('<a href');

      const result = await convertFilesToHtml([
        { name: 'a.png', bytes: png, linkUrl: 'javascript:alert(1)' },
        { name: 'b.png', bytes: png, linkUrl: 'https://example.com' },
      ]);
      expect(result.rejectedLinks).toEqual(['javascript:alert(1)']);
    });

    it('cannot be made to break out of the src attribute', () => {
      const html = generateEmailHtml(one(), {
        imagePrefix: '"><script>alert(1)</script><img src="',
      });

      expect(html).not.toContain('<script>alert(1)</script>');
      expect(html).toContain('&quot;&gt;&lt;script&gt;');
    });

    it('cannot be made to close the style block through a colour field', () => {
      const attack = '#fff;}</style><script>alert(1)</script><style>{a:';

      expect(
        generateEmailHtml(one(), { backgroundColor: attack }),
      ).not.toContain('</style><script>');
      expect(
        generateWebHtml(one(), { contentBackgroundColor: attack }),
      ).not.toContain('</style><script>');
    });

    it('keeps a real colour, in any of the forms the field accepts', () => {
      const html = generateWebHtml(one(), {
        backgroundColor: 'rgb(12, 34, 56)',
        contentBackgroundColor: '#ABCDEF',
      });
      expect(html).toContain('rgb(12, 34, 56)');
      expect(html).toContain('#ABCDEF');
    });

    it('falls back when the width is not a number', () => {
      expect(generateEmailHtml(one(), { maxWidth: Number.NaN })).toContain(
        'max-width: 600px',
      );
    });

    it('emits exactly one src per slice, in order', () => {
      // components/file-to-html-tool.tsx swaps these for blob URLs by
      // position to build its preview. If the template ever grows another
      // `src`, that preview silently pairs the wrong image with the wrong row.
      const slices = [...one(), ...one({ id: 's2', filename: 'b.png' })];
      const srcs = [...generateEmailHtml(slices, {}).matchAll(/src="/g)];

      expect(srcs).toHaveLength(slices.length);
    });
  });

  describe('two files with the same name', () => {
    it('keeps them apart instead of letting one stand in for the other', async () => {
      const first = readFixture('product.png');
      const second = readFixture('banner.jpg');
      const result = await convertFilesToHtml([
        { name: 'logo.png', bytes: first },
        { name: 'logo.png', bytes: second },
      ]);

      expect(result.slices.map((s) => s.filename)).toEqual([
        'logo.png',
        'logo-2.png',
      ]);

      const archive = readZip(result.emailPackageZip);
      const paths = archive.entries.map((e) => e.path);
      expect(paths).toContain('images/logo.png');
      expect(paths).toContain('images/logo-2.png');

      // The second image really is a different image, so pointing both rows at
      // one file would have shown the wrong picture, not a duplicate one.
      const renamed = archive.entries.find(
        (e) => e.path === 'images/logo-2.png',
      )!;
      expect(await extractEntry(result.emailPackageZip, renamed)).toEqual(
        new Uint8Array(second),
      );
    });
  });

  describe('the image folder written into the ZIP', () => {
    it('cannot climb out of wherever the recipient unpacks it', async () => {
      const result = await convertFilesToHtml(
        [{ name: 'a.png', bytes: readFixture('product.png') }],
        { imagePrefix: '../../../../tmp/evil/' },
      );

      const paths = readZip(result.emailPackageZip).entries.map((e) => e.path);
      expect(paths.some((entry) => entry.includes('..'))).toBe(false);
      expect(paths).toContain('tmp/evil/a.png');
    });
  });

  /**
   * Frozen bytes, checked once by tools that are not ours and then committed.
   *
   * Python's `zipfile` verified the CRC of every entry, confirmed no path
   * climbs out of the extraction directory, and confirmed each stored image is
   * byte-identical to its source. Python's `html.parser` then read both HTML
   * files and found **zero `<script>` elements** despite the title, the alt
   * text and the image path all carrying markup, decoded the title back to
   * exactly `Spring <Sale> & "Savings"`, and found one `<a>` for three images
   * because the `javascript:` link was refused.
   *
   * Comparing against those bytes is how that verdict survives on a machine
   * with none of those tools installed. Regenerating this file means getting it
   * approved again -- see `docs/FILE_TO_HTML.md`.
   */
  describe('the package an outside tool approved', () => {
    it('is still byte-for-byte what was approved', async () => {
      const result = await convertFilesToHtml(
        [
          {
            name: 'banner.jpg',
            bytes: readFixture('banner.jpg'),
            altText: 'Spring sale <banner> & "more"',
            linkUrl: 'https://shop.example.com/p?utm_content=spring%20sale&a=b',
          },
          { name: 'logo.svg', bytes: readFixture('logo.svg'), altText: 'Logo' },
          {
            name: 'banner.jpg',
            bytes: readFixture('product.png'),
            linkUrl: 'javascript:alert(1)',
          },
        ],
        {
          title: 'Spring <Sale> & "Savings"',
          preheader: 'Up to 50% off',
          maxWidth: 600,
          backgroundColor: '#f4f4f5',
          contentBackgroundColor: '#ffffff',
          imagePrefix: 'images/',
        },
      );

      expect(new Uint8Array(result.emailPackageZip)).toEqual(
        new Uint8Array(readFixture('golden-email-package.zip')),
      );
      expect(result.rejectedLinks).toEqual(['javascript:alert(1)']);
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
