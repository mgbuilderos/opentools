import { describe, expect, it } from 'vitest';

import {
  getSvgDimensions,
  optimizeSvg,
  roundNumbersInString,
  sanitizeSvg,
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
