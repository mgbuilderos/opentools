import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { parseEmail, parseMbox, parseMsg } from '@/lib/formats/email';
import { sanitizeEmailHtml } from './sanitize-html';

const fixturesDir = resolve(process.cwd(), 'lib/formats/email/__fixtures__');

async function loadFixture(name: string): Promise<Uint8Array> {
  return new Uint8Array(await readFile(resolve(fixturesDir, name)));
}

describe('Email Reader and Sanitizer', () => {
  it('parses multipart EML fixture with attachments and headers', async () => {
    const bytes = await loadFixture('multipart.eml');
    const messages = await parseEmail(bytes);

    expect(messages).toHaveLength(1);
    const msg = messages[0]!;
    expect(msg.headers.subject).toBe('Quarterly ✓ report');
    expect(msg.headers.from).toBe('sender@example.invalid');
    expect(msg.textBody).toContain('Plain body with a check mark: ✓');
    expect(msg.htmlBody).toContain('<p>HTML body ✓</p>');
    expect(msg.attachments).toHaveLength(2);
    expect(msg.attachments[0]?.filename).toBe('report.csv');
  });

  it('parses mbox fixture with multiple messages', async () => {
    const bytes = await loadFixture('three-message.mbox');
    const messages = await parseMbox(bytes);

    expect(messages).toHaveLength(3);
    expect(messages[0]?.headers.subject).toBe('First');
    expect(messages[1]?.headers.subject).toBe('Second');
    expect(messages[2]?.headers.subject).toBe('Third');
  });

  it('parses Outlook MSG binary fixture', async () => {
    const bytes = await loadFixture('unicode.msg');
    const messages = await parseMsg(bytes);

    expect(messages).toHaveLength(1);
    const msg = messages[0]!;
    expect(msg.headers.subject).toBe('Synthetic résumé ✓');
    expect(msg.attachments).toHaveLength(1);
  });

  describe('HTML Sanitization and Remote Image Blocking', () => {
    it('blocks remote HTTP/HTTPS images and tracking pixels', () => {
      const maliciousHtml = `
        <div>
          <p>Hello world</p>
          <img src="https://tracker.com/pixel.png" width="1" height="1" alt="pixel" />
          <img src="http://evil.com/logger.jpg" />
        </div>
      `;

      const sanitized = sanitizeEmailHtml(maliciousHtml);
      expect(sanitized).not.toContain('https://tracker.com/pixel.png');
      expect(sanitized).not.toContain('http://evil.com/logger.jpg');
      expect(sanitized).toContain('Remote image blocked');
      expect(sanitized).toContain('Hello world');
    });

    it('removes active scripts, iframes, and inline event handlers', () => {
      const dirtyHtml = `
        <div>
          <script>alert('xss')</script>
          <iframe src="https://bad.com"></iframe>
          <a href="javascript:alert(1)" onclick="doBad()">Click me</a>
          <p style="background: url(https://evil.com/bg.png); color: red;">Styled text</p>
        </div>
      `;

      const sanitized = sanitizeEmailHtml(dirtyHtml);
      expect(sanitized).not.toContain('<script');
      expect(sanitized).not.toContain('<iframe');
      expect(sanitized).not.toContain('onclick');
      expect(sanitized).not.toContain('javascript:alert(1)');
      expect(sanitized).not.toContain('https://evil.com/bg.png');
      expect(sanitized).toContain('Styled text');
    });

    it('resolves inline CID attachments to object URLs safely', () => {
      const cidHtml = `
        <div>
          <img src="cid:chart-01" alt="Sales Chart" />
        </div>
      `;

      const attachments = [
        {
          filename: 'chart.png',
          contentType: 'image/png',
          bytes: new Uint8Array([1, 2, 3]),
          contentId: '<chart-01>',
        },
      ];

      const sanitized = sanitizeEmailHtml(
        cidHtml,
        attachments,
        (att) => `blob:local-app/${att.filename}`,
      );

      expect(sanitized).toContain('blob:local-app/chart.png');
      expect(sanitized).not.toContain('cid:chart-01');
    });
  });
});

/**
 * The four vectors that fetched through the original sanitiser, held here as
 * unit assertions as well as in `e2e/email-tracker.spec.ts`.
 *
 * The e2e guard is the authoritative one — it watches real network traffic in
 * a real browser, which is the only place the DOMParser path runs. These are
 * the cheap copy that fails in a second rather than in a browser run, and they
 * cover the regex fallback, which is what `environment: 'node'` actually
 * executes here.
 *
 * Verified to go red: against the pre-fix sanitiser all five fail.
 */
describe('remote fetch vectors', () => {
  const TRACKER = 'http://tracker.invalid';

  it('strips an SVG image href', () => {
    expect(
      sanitizeEmailHtml(`<svg><image href="${TRACKER}/svgimg.png" /></svg>`),
    ).not.toContain('tracker.invalid');
  });

  it('strips an SVG image xlink:href', () => {
    expect(
      sanitizeEmailHtml(
        `<svg><image xlink:href="${TRACKER}/svgxlink.png" /></svg>`,
      ),
    ).not.toContain('tracker.invalid');
  });

  it('strips an SVG use href', () => {
    expect(
      sanitizeEmailHtml(`<svg><use href="${TRACKER}/svguse.svg" /></svg>`),
    ).not.toContain('tracker.invalid');
  });

  it('strips a legacy table-cell background', () => {
    expect(
      sanitizeEmailHtml(
        `<table><tr><td background="${TRACKER}/td.png">x</td></tr></table>`,
      ),
    ).not.toContain('tracker.invalid');
  });

  it('strips poster, srcset, imagesrcset, ping and formaction', () => {
    expect(
      sanitizeEmailHtml(
        `<p poster="${TRACKER}/a.png" srcset="${TRACKER}/b.png" imagesrcset="${TRACKER}/c.png" ping="${TRACKER}/d" formaction="${TRACKER}/e">x</p>`,
      ),
    ).not.toContain('tracker.invalid');
  });
});
