import { describe, expect, it } from 'vitest';

import { runWebOperation, WEB_OPERATIONS } from './web-workbench';

function defaults(id: string) {
  const operation = WEB_OPERATIONS.find((item) => item.id === id);
  if (!operation) throw new Error(`Missing operation ${id}`);
  return Object.fromEntries(
    operation.fields.map((field) => [field.id, field.defaultValue]),
  );
}

describe('web and SEO workbench', () => {
  it('publishes 41 unique real operations whose defaults all run', () => {
    expect(WEB_OPERATIONS).toHaveLength(41);
    expect(new Set(WEB_OPERATIONS.map((item) => item.id)).size).toBe(41);
    for (const operation of WEB_OPERATIONS) {
      expect(runWebOperation(operation.id, defaults(operation.id))).not.toBe(
        '',
      );
    }
  });

  it('escapes generated head metadata', () => {
    expect(
      runWebOperation('meta-tag-generator', {
        title: '<Fast & private>',
        description: 'A "local" tool',
        canonical: 'https://example.com/',
        robots: 'index,follow',
      }),
    ).toContain('&lt;Fast &amp; private&gt;');
  });

  it('generates and reads escaped sitemaps', () => {
    const sitemap = runWebOperation('sitemap-generator', {
      urls: 'https://example.com/?a=1&b=2',
    });
    expect(sitemap).toContain('&amp;');
    expect(runWebOperation('sitemap-viewer', { xml: sitemap })).toContain(
      'https://example.com/?a=1&b=2',
    );
  });

  it('evaluates the longest matching robots rule', () => {
    expect(
      runWebOperation('robots-txt-tester', {
        robots: 'User-agent: *\nDisallow: /private\nAllow: /private/public',
        agent: 'ExampleBot',
        path: '/private/public/page',
      }),
    ).toContain('Allowed by Allow');
  });

  it('normalizes URLs and preserves repeated query keys', () => {
    expect(
      runWebOperation('url-normalizer', {
        url: 'HTTPS://Example.COM:443/a/../tools/?b=2&a=1#top',
      }),
    ).toBe('https://example.com/tools/?a=1&b=2');
    expect(
      runWebOperation('query-string-parser', {
        query: '?tag=pdf&tag=image',
      }),
    ).toContain('[\n    "pdf",\n    "image"\n  ]');
  });

  it('detects redirect chains and loops', () => {
    expect(
      runWebOperation('redirect-chain-planner', {
        redirects: '/old /new\n/new /latest',
      }),
    ).toContain('CHAIN');
    expect(
      runWebOperation('redirect-chain-planner', {
        redirects: '/a /b\n/b /a',
      }),
    ).toContain('LOOP');
  });

  it('calculates CSS clamp and viewport values', () => {
    expect(
      runWebOperation('css-clamp-calculator', {
        minSize: '16',
        maxSize: '32',
        minViewport: '320',
        maxViewport: '1280',
      }),
    ).toBe('clamp(16px, 10.6667px + 1.6667vw, 32px)');
    expect(
      runWebOperation('viewport-size-calculator', {
        width: '1440',
        height: '900',
        vw: '50',
        vh: '50',
      }),
    ).toContain('50vw = 720.00px');
  });

  it('reports reduced aspect ratios and WCAG contrast', () => {
    expect(
      runWebOperation('aspect-ratio-calculator', {
        width: '1920',
        height: '1080',
        newWidth: '1280',
      }),
    ).toContain('16:9');
    expect(
      runWebOperation('accessibility-contrast-checker', {
        foreground: '#000000',
        background: '#ffffff',
      }),
    ).toContain('21.00:1');
  });

  it('escapes tables and links', () => {
    expect(
      runWebOperation('html-table-generator', {
        table: 'Name\tRole\n<script>\tAdmin',
      }),
    ).toContain('&lt;script&gt;');
    expect(
      runWebOperation('text-to-html-link', {
        label: '<Open>',
        url: 'https://example.com/',
        target: 'blank',
      }),
    ).toContain('rel="noopener noreferrer"');
  });

  it('rejects unsupported protocols and malformed structured input', () => {
    expect(() =>
      runWebOperation('text-to-html-link', {
        label: 'Bad',
        url: 'javascript:alert(1)',
        target: 'same',
      }),
    ).toThrow('HTTP or HTTPS');
    expect(() =>
      runWebOperation('schema-markup-validator', { json: '{bad}' }),
    ).toThrow('valid JSON');
    expect(() =>
      runWebOperation('css-clip-path-generator', { points: 'not a point' }),
    ).toThrow('x% y%');
  });
});
