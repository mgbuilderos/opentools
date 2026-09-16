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
  it('publishes 47 unique real operations whose defaults all run', () => {
    expect(WEB_OPERATIONS).toHaveLength(47);
    expect(new Set(WEB_OPERATIONS.map((item) => item.id)).size).toBe(47);
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

  it('optimizes and cleans SVG markup', () => {
    const rawSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><!-- comment --><g inkscape:label="Layer 1"><circle cx="50.0001" cy="50.0002" r="40.0000" fill="#000"/></g></svg>`;
    const output = runWebOperation('svg-optimizer', {
      svg: rawSvg,
      precision: '2',
      removeComments: 'yes',
      removeMetadata: 'yes',
      minifyWhitespace: 'yes',
    });

    expect(output).toContain('SVG Optimization Report');
    expect(output).toContain('Reduction:');
    expect(output).not.toContain('<!-- comment -->');
    expect(output).not.toContain('inkscape:label');
  });

  it('generates multi-platform favicon HTML snippet and webmanifest', () => {
    const output = runWebOperation('favicon-html-generator', {
      appName: 'OpenTools',
      shortName: 'Tools',
      themeColor: '#09090b',
      tileColor: '#09090b',
      basePath: '/',
    });

    expect(output).toContain('rel="apple-touch-icon" sizes="180x180"');
    expect(output).toContain('rel="icon" type="image/png" sizes="32x32"');
    expect(output).toContain('site.webmanifest');
    expect(output).toContain('"short_name": "Tools"');
  });

  it('generates CSS glassmorphism and neumorphism styles', () => {
    const glass = runWebOperation('css-glassmorphism-generator', {
      blur: '20',
      opacity: '30',
      tint: '#ffffff',
      borderOpacity: '25',
      shadowDepth: 'medium',
      borderRadius: '16',
    });
    expect(glass).toContain('backdrop-filter: blur(20px);');
    expect(glass).toContain('-webkit-backdrop-filter: blur(20px);');
    expect(glass).toContain('border-radius: 16px;');
    expect(glass).toContain('rgba(255, 255, 255, 0.30)');

    const neumorph = runWebOperation('css-neumorphism-generator', {
      baseColor: '#e0e5ec',
      distance: '12',
      blur: '24',
      shape: 'flat',
      lightAngle: 'top-left',
      intensity: '15',
      borderRadius: '20',
    });
    expect(neumorph).toContain('.neumorphic-element');
    expect(neumorph).toContain('border-radius: 20px;');
    expect(neumorph).toContain('box-shadow:');

    const anim = runWebOperation('css-animation-generator', {
      animationType: 'float',
      duration: '2.5',
      timingFunction: 'ease-in-out',
      iterationCount: 'infinite',
      direction: 'normal',
      fillMode: 'both',
      gpuAcceleration: 'yes',
    });
    expect(anim).toContain('@keyframes float');
    expect(anim).toContain('transform: translateY(-14px);');
    expect(anim).toContain('.animated-element');
    expect(anim).toContain('animation-duration: 2.5s;');
    expect(anim).toContain('will-change: transform');
  });

  it('generates multi-stop CSS gradients, Tailwind classes, and SVG defs', () => {
    const gradient = runWebOperation('css-gradient-studio', {
      type: 'linear',
      direction: '135deg',
      colorStops: '#3b82f6 0%\n#8b5cf6 50%\n#ec4899 100%',
      format: 'all',
    });

    expect(gradient).toContain('background-image: linear-gradient(135deg');
    expect(gradient).toContain('#3b82f6 0%');
    expect(gradient).toContain('#8b5cf6 50%');
    expect(gradient).toContain('#ec4899 100%');
    expect(gradient).toContain('bg-[linear-gradient(135deg');
    expect(gradient).toContain('<linearGradient id="gradient"');
    expect(gradient).toContain('<stop offset="100%" stop-color="#ec4899"/>');
  });
});
