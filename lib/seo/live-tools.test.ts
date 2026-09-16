import { existsSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import sitemap from '../../app/sitemap';
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

describe('sitemap', () => {
  it('lists every live tool guide and no other guide', () => {
    const guides = sitemapUrls.filter((url) =>
      /^\/guides\/(?!category\/)[a-z0-9-]+$/u.test(url),
    );
    expect(new Set(guides)).toEqual(
      new Set(LIVE_TOOL_CATALOG.map((tool) => `/guides/${tool.slug}`)),
    );
    expect(guides).toContain('/guides/developer-and-data-jwt-decoder');
    expect(guides).not.toContain('/guides/pdf-compress-pdf');
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
