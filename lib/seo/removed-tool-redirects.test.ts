import { describe, expect, it } from 'vitest';

import { getAllBlogPosts } from './blog-data';
import { getCategoryBySlug, toCategorySlug } from './internal-linking-graph';
import { LIVE_TOOL_CATALOG, isLiveToolUrl } from './live-tools';
import { removedToolRedirect } from './removed-tool-redirects';

const liveGuideSlugs = new Set(LIVE_TOOL_CATALOG.map((tool) => tool.slug));
const liveCategorySlugs = new Set(
  LIVE_TOOL_CATALOG.map((tool) => toCategorySlug(tool.category)),
);

/** A page only counts as live when it lists or runs at least one live tool. */
function isLivePage(path: string) {
  if (path === '/guides') return true;
  if (isLiveToolUrl(path)) return true;
  const category = /^\/guides\/category\/([a-z0-9-]+)$/u.exec(path);
  if (category)
    return (
      getCategoryBySlug(category[1]!) !== undefined &&
      liveCategorySlugs.has(category[1]!)
    );
  const guide = /^\/guides\/([a-z0-9-]+)$/u.exec(path);
  return guide ? liveGuideSlugs.has(guide[1]!) : false;
}

const removedPaths = [
  '/audio/transcribe',
  '/image/upscaler',
  '/developer/sql-visualizer',
  '/guides/category/video',
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

  // Owner decision 2026-09-17 (docs/DECISION_LOG.md section 7, board item A5.1):
  // the video-compression article was removed and no live page compresses
  // video, so its URL 404s rather than redirecting to an off-topic article.
  it('leaves the removed video-compression article as a 404', () => {
    const path = '/blog/compress-mp4-webm-video-in-browser';
    const slug = path.slice('/blog/'.length);

    expect(
      getAllBlogPosts().some((post) => post.slug === slug),
      'the article is removed, so nothing should publish this slug',
    ).toBe(false);

    for (const variant of [path, `${path}/`]) {
      expect(
        removedToolRedirect(variant),
        `${variant} must stay a 404, not redirect to an unrelated article`,
      ).toBeNull();
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
