import { describe, expect, it } from 'vitest';

import { publicTools } from '../tools/catalog';
import { getCategoryBySlug } from './internal-linking-graph';
import { removedToolRedirect } from './removed-tool-redirects';
import { TOOL_CATALOG } from './tool-catalog-data';

const guideSlugs = new Set(TOOL_CATALOG.map((tool) => tool.slug));
const toolRoutes = new Set(publicTools.map((tool) => tool.href));

function isLivePage(path: string) {
  if (path === '/guides' || toolRoutes.has(path)) return true;
  const category = /^\/guides\/category\/([a-z0-9-]+)$/u.exec(path);
  if (category) return getCategoryBySlug(category[1]) !== undefined;
  const guide = /^\/guides\/([a-z0-9-]+)$/u.exec(path);
  return guide ? guideSlugs.has(guide[1]) : false;
}

const removedPaths = [
  '/audio/transcribe',
  '/image/upscaler',
  '/guides/category/astrology-and-numerology',
  '/guides/health-and-fitness-water-intake-calculator',
  '/guides/image-image-upscaler',
  '/guides/video-video-to-gif',
  '/guides/audio-audio-format-converter',
  '/guides/astrology-and-numerology-kundali-chart-maker',
  '/guides/astrology-and-numerology-panchang-viewer',
  '/guides/astrology-and-numerology-rahu-kaal-calculator',
  '/guides/astrology-and-numerology-destiny-number-calculator',
  '/guides/astrology-and-numerology-lo-shu-grid-maker',
  '/guides/astrology-and-numerology-life-path-number-calculator',
  '/guides/astrology-and-numerology-birth-number-calculator',
  '/guides/astrology-and-numerology-personal-year-number-calculator',
];

describe('removed tool redirects', () => {
  it('sends every removed tool URL to a page that still exists', () => {
    for (const path of removedPaths) {
      const target = removedToolRedirect(path);
      expect(target, path).not.toBeNull();
      expect(isLivePage(target!), `${path} -> ${target}`).toBe(true);
      expect(isLivePage(path), `${path} should no longer be a live page`).toBe(
        false,
      );
    }
  });

  it('keeps moved numerology tools on their own new guide pages', () => {
    for (const tool of [
      'life-path-number-calculator',
      'birth-number-calculator',
      'personal-year-number-calculator',
    ]) {
      expect(
        removedToolRedirect(`/guides/astrology-and-numerology-${tool}`),
      ).toBe(`/guides/date-time-and-productivity-${tool}`);
    }
  });

  it('handles trailing slashes and leaves live pages alone', () => {
    expect(removedToolRedirect('/image/upscaler/')).toBe('/image/optimize');
    for (const path of [
      '/',
      '/guides',
      '/image/editor',
      '/image/optimize',
      '/guides/date-time-and-productivity-life-path-number-calculator',
      '/guides/category/date-time-and-productivity',
      '/guides/pdf-merge-pdf',
    ]) {
      expect(removedToolRedirect(path), path).toBeNull();
    }
  });
});
