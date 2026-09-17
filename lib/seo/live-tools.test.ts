import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import sitemap from '../../app/sitemap';
import { loadsLocalModel } from '../security/content-security-policy';
import { getGuideBySlug } from './guide-content';
import {
  LIVE_TOOL_CATALOG,
  LIVE_TOOL_ROUTES,
  isLiveToolUrl,
  operationIdsForRoute,
} from './live-tools';
import { TOOL_CATALOG } from './tool-catalog-data';

const appRoot = path.resolve(__dirname, '../..');
const origin = ['https:', '//', 'getopentools.com'].join('');
const sitemapUrls = sitemap().map(({ url }) => url.slice(origin.length));

describe('live tool registry', () => {
  it('only names routes that have a page', () => {
    for (const route of LIVE_TOOL_ROUTES) {
      expect(
        existsSync(path.join(appRoot, 'app', route, 'page.tsx')),
        route,
      ).toBe(true);
    }
  });

  it('rejects operations a route does not run', () => {
    expect(isLiveToolUrl('/developer/advanced?tool=jwt-decoder')).toBe(true);
    expect(isLiveToolUrl('/pdf/page-tools?tool=rotate-pdf')).toBe(true);
    expect(isLiveToolUrl('/pdf/merge')).toBe(true);
    expect(isLiveToolUrl('/pdf/page-tools?tool=compress-pdf')).toBe(false);
    expect(isLiveToolUrl('/pdf/page-tools?tool=pdf-to-images')).toBe(false);
    expect(isLiveToolUrl('/developer/workbench?tool=jwt-decoder')).toBe(false);
    expect(isLiveToolUrl('/video/compress')).toBe(false);
    expect(isLiveToolUrl('/image/ocr')).toBe(false);
  });

  it('keeps every catalog link on the route that runs its operation', () => {
    const misrouted = TOOL_CATALOG.filter((tool) => {
      const [route, query = ''] = tool.destinationUrl.split('?');
      const operationId = new URLSearchParams(query).get('tool');
      if (!operationId || operationIdsForRoute(route)?.has(operationId)) {
        return false;
      }
      return LIVE_TOOL_ROUTES.some((other) =>
        operationIdsForRoute(other)?.has(operationId),
      );
    }).map((tool) => tool.slug);
    expect(misrouted).toEqual([]);
  });
});

describe('execution mode claims', () => {
  it('says local-wasm only where the route may compile WebAssembly', () => {
    // Only local-model routes are served with 'wasm-unsafe-eval'; everywhere
    // else the Content Security Policy blocks WebAssembly outright.
    const unbacked = LIVE_TOOL_CATALOG.filter(
      (tool) =>
        tool.executionMode === 'local-wasm' &&
        !loadsLocalModel(tool.destinationUrl.split('?')[0]),
    ).map((tool) => tool.id);
    expect(unbacked).toEqual([]);
  });

  it('does not claim every tool runs on WebAssembly on the support page', () => {
    const page = readFileSync(
      path.join(appRoot, 'app/support/page.tsx'),
      'utf8',
    ).replace(/\s+/gu, ' ');
    const sentences = page
      .split(/(?<=\.)\s/u)
      .filter((sentence) => /webassembly|wasm/iu.test(sentence));
    for (const sentence of sentences) {
      if (/\bevery\b|\ball\b/iu.test(sentence)) {
        expect(sentence).toMatch(/\b(a few|some|where)\b/iu);
      }
    }
  });

  it('keeps WebAssembly out of the sign and form guides', () => {
    for (const slug of ['pdf-sign-pdf', 'pdf-fill-pdf-form']) {
      const guide = getGuideBySlug(slug);
      expect(guide, slug).toBeDefined();
      const text = JSON.stringify(guide).toLowerCase();
      expect(text.includes('webassembly'), slug).toBe(false);
      expect(text.includes('wasm'), slug).toBe(false);
    }
  });
});

describe('sitemap', () => {
  it('lists every live tool guide and no other guide', () => {
    const guides = sitemapUrls.filter((url) =>
      /^\/guides\/(?!category\/)[a-z0-9-]+$/u.test(url),
    );
    expect(new Set(guides)).toEqual(
      new Set(LIVE_TOOL_CATALOG.map((tool) => `/guides/${tool.slug}`)),
    );
    expect(guides).toContain('/guides/developer-and-data-jwt-decoder');
    // Compress PDF is live now that /pdf/compress runs it; the guide that used
    // to point at a control the page tool never had is back in the sitemap.
    expect(guides).toContain('/guides/pdf-compress-pdf');
    expect(guides).not.toContain('/guides/video-video-to-gif');
  });

  it('leaves out placeholder pages and the roadmap', () => {
    for (const route of [
      '/video/compress',
      '/image/ocr',
      '/developer/sql-visualizer',
      '/roadmap',
    ]) {
      expect(sitemapUrls).not.toContain(route);
    }
  });

  it('has no duplicate URLs and no build-time lastModified', () => {
    expect(new Set(sitemapUrls).size).toBe(sitemapUrls.length);
    for (const entry of sitemap()) {
      if (entry.url.includes('/blog/')) continue;
      expect(entry.lastModified, entry.url).toBeUndefined();
    }
  });
});
