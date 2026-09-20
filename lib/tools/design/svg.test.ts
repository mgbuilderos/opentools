import { describe, expect, it } from 'vitest';

import {
  getSvgDimensions,
  optimizeSvg,
  roundNumbersInString,
  sanitizeSvg,
  SVG_NAMESPACE,
} from './svg';

describe('SVG Optimizer and Sanitizer', () => {
  describe('sanitizeSvg', () => {
    it('strips script tags and inline event handlers', () => {
      const maliciousSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
          <script>alert("xss")</script>
          <script type="text/javascript">window.location="http://evil.com"</script>
          <circle cx="50" cy="50" r="40" onload="alert(1)" onclick="stealCookies()" />
          <a href="javascript:alert(2)">
            <text x="10" y="20">Click</text>
          </a>
        </svg>
      `;

      const { cleanSvg, scriptsRemoved } = sanitizeSvg(maliciousSvg);

      expect(scriptsRemoved).toBeGreaterThanOrEqual(4);
      expect(cleanSvg).not.toContain('<script');
      expect(cleanSvg).not.toContain('onload');
      expect(cleanSvg).not.toContain('onclick');
      expect(cleanSvg).not.toContain('stealCookies');
      expect(cleanSvg).not.toContain('javascript:');
      expect(cleanSvg).toContain('<circle cx="50" cy="50" r="40"');
    });
  });

  describe('optimizeSvg', () => {
    it('removes XML comments, editor metadata, empty groups, and rounds precision', () => {
      const inkscapeSvg = `
        <?xml version="1.0" encoding="UTF-8"?>
        <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
        <!-- Generator: Inkscape 1.2, SVG Export Plug-In -->
        <svg xmlns="http://www.w3.org/2000/svg"
             xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
             xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"
             viewBox="0 0 500 500" width="500" height="500">
          <metadata>
            <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
              <cc:Work rdf:about="">
                <dc:title>Test Graphic</dc:title>
              </cc:Work>
            </rdf:RDF>
          </metadata>
          <sodipodi:namedview id="namedview1" inkscape:current-layer="layer1" />
          <g inkscape:groupmode="layer" id="layer1">
            <g id="empty-subgroup">
            </g>
            <path d="M 10.123456 20.654321 L 100.999999 200.000001 C 34.567890 89.123456 12.345678 45.678901 80.000000 90.000000"
                  inkscape:connector-curvature="0"
                  fill="#000000" />
          </g>
        </svg>
      `;

      const result = optimizeSvg(inkscapeSvg, { precision: 2 });

      expect(result.scriptsRemoved).toBe(0);
      expect(result.optimizedBytes).toBeLessThan(result.originalBytes);
      expect(result.savingsPercent).toBeGreaterThan(30);

      // Verify metadata and comments stripped
      expect(result.optimizedSvg).not.toContain('<?xml');
      expect(result.optimizedSvg).not.toContain('<!DOCTYPE');
      expect(result.optimizedSvg).not.toContain('<!-- Generator: Inkscape');
      expect(result.optimizedSvg).not.toContain('<metadata>');
      expect(result.optimizedSvg).not.toContain('xmlns:inkscape');
      expect(result.optimizedSvg).not.toContain('sodipodi:namedview');
      expect(result.optimizedSvg).not.toContain('empty-subgroup');

      // Verify coordinate precision rounding
      expect(result.optimizedSvg).toContain('M 10.12 20.65 L 101 200');
      expect(result.optimizedSvg).not.toContain('10.123456');
    });
  });

  describe('getSvgDimensions', () => {
    it('extracts dimensions from width/height and viewBox', () => {
      const svg =
        '<svg viewBox="0 0 800 600" width="800px" height="600px"><rect/></svg>';
      const dim = getSvgDimensions(svg);
      expect(dim).toEqual({ width: 800, height: 600, viewBox: '0 0 800 600' });
    });

    it('falls back to viewBox when explicit width/height are omitted', () => {
      const svg = '<svg viewBox="0 0 400 300"><circle/></svg>';
      const dim = getSvgDimensions(svg);
      expect(dim).toEqual({ width: 400, height: 300, viewBox: '0 0 400 300' });
    });
  });

  describe('roundNumbersInString', () => {
    it('rounds numbers to specified precision', () => {
      expect(roundNumbersInString('12.345678', 2)).toBe('12.35');
      expect(roundNumbersInString('M 10.000001 20.999999', 2)).toBe('M 10 21');
    });
  });
});

/**
 * These are the ways the previous deny-list sanitiser could be walked past.
 * Every one of them was confirmed to survive it, while the file's own header
 * claimed it "strictly sanitizes scripts and inline event handlers to prevent
 * XSS". They are kept as a list rather than folded into one case because each
 * one is a different trick, and a future rewrite should have to answer all of
 * them.
 *
 * The page renders results in an `<img>`, where SVG scripts never execute, so
 * none of this ran here. The download is the artefact that travels.
 */
describe('sanitizeSvg refuses code however it is spelled', () => {
  const TAB = String.fromCharCode(9);
  const NEWLINE = String.fromCharCode(10);

  const attacks: [string, string][] = [
    [
      'an event handler with no space before it',
      '<svg xmlns="x"><rect/onload="alert(1)" width="1"/></svg>',
    ],
    [
      'an event handler separated by a slash',
      '<svg xmlns="x"/onload="alert(1)"></svg>',
    ],
    [
      'an event handler split by a tab',
      '<svg xmlns="x"><rect ON' + TAB + 'LOAD="alert(1)"/></svg>',
    ],
    [
      'an unquoted javascript: href',
      '<svg xmlns="x"><a href=javascript:alert(1)><rect/></a></svg>',
    ],
    [
      'a javascript: href hidden in a character reference',
      '<svg xmlns="x"><a href="&#106;avascript:alert(1)"><rect/></a></svg>',
    ],
    [
      'a javascript: href broken by a newline',
      '<svg xmlns="x"><a href="java' +
        NEWLINE +
        'script:alert(1)"><rect/></a></svg>',
    ],
    [
      'an animation that retargets href',
      '<svg xmlns="x"><a><animate attributeName="href" to="javascript:alert(1)"/></a></svg>',
    ],
    [
      'an animation that sets an event handler',
      '<svg xmlns="x"><set attributeName="onload" to="alert(1)"/></svg>',
    ],
    [
      'an iframe smuggled through foreignObject',
      '<svg xmlns="x"><foreignObject><iframe src="javascript:alert(1)"></iframe></foreignObject></svg>',
    ],
    [
      'a data: URL that is not an image',
      '<svg xmlns="x"><a href="data:text/html;base64,PHNjcmlwdD4="><rect/></a></svg>',
    ],
    [
      'a plain script element',
      '<svg xmlns="x"><script>alert(1)</script></svg>',
    ],
    ['a plain onload attribute', '<svg xmlns="x" onload="alert(1)"></svg>'],
  ];

  for (const [description, svg] of attacks) {
    it(`removes ${description}`, () => {
      const { cleanSvg, scriptsRemoved } = sanitizeSvg(svg);
      // Compared with whitespace and control characters gone, because that is
      // how the browser reads a URL before deciding what its scheme is.
      // eslint-disable-next-line no-control-regex
      const flat = cleanSvg.replace(/[\s\u0000-\u001f]/g, '');

      expect(scriptsRemoved).toBeGreaterThan(0);
      expect(flat).not.toMatch(/on[a-zA-Z]+=/i);
      expect(flat).not.toMatch(/javascript:/i);
      expect(flat).not.toMatch(/&#x?[0-9a-f]+;?avascript/i);
      expect(flat).not.toMatch(/<script/i);
      expect(flat).not.toMatch(/<iframe/i);
      expect(flat).not.toMatch(/data:text/i);
    });
  }

  it('leaves a legitimate icon completely alone', () => {
    // The other half of the job. An allow-list that quietly eats gradients,
    // animation or external links would pass every test above and be useless.
    const icon =
      '<svg xmlns="' +
      SVG_NAMESPACE +
      '" viewBox="0 0 24 24" width="24" height="24">' +
      '<title>Icon</title>' +
      '<defs><linearGradient id="g"><stop offset="0" stop-color="#fff"/></linearGradient></defs>' +
      '<g fill="none" stroke="#000" stroke-width="2">' +
      '<path d="M4 4 L20 20" stroke-linecap="round"/>' +
      '<circle cx="12" cy="12" r="5" fill="url(#g)"/></g>' +
      '<a href="https://example.com/x?a=1&amp;b=2"><use href="#g"/></a>' +
      '<animate attributeName="opacity" from="0" to="1" dur="1s"/></svg>';

    const { cleanSvg, scriptsRemoved } = sanitizeSvg(icon);

    expect(scriptsRemoved).toBe(0);
    for (const kept of [
      'viewBox="0 0 24 24"',
      'stroke-linecap="round"',
      'fill="url(#g)"',
      'linearGradient id="g"',
      'stop-color="#fff"',
      'href="https://example.com/x?a=1&amp;b=2"',
      'use href="#g"',
      'attributeName="opacity"',
      '<title>Icon</title>',
      'd="M4 4 L20 20"',
    ]) {
      expect(cleanSvg).toContain(kept);
    }
  });

  it('keeps self-closing tags self-closing, because an SVG is XML', () => {
    // Regression: the tag rebuild was greedy and ate the trailing slash, so
    // `<rect/>` came back as `<rect>` and the document was malformed. It broke
    // the editor-metadata removal in this same file, which looks for
    // `<sodipodi:namedview .../>`.
    const { cleanSvg } = sanitizeSvg('<svg xmlns="x"><rect width="1"/></svg>');

    expect(cleanSvg).toContain('<rect width="1" />');
  });
});
