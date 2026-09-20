import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  LIVE_TOOL_ROUTES as LIGHT_ROUTES,
  isLiveToolUrl as lightIsLive,
  operationIdsForRoute as lightOperationIds,
} from './live-tool-routes';
import {
  LIVE_TOOL_ROUTES,
  isLiveToolUrl,
  operationIdsForRoute,
} from './live-tools';

describe('live tool routes, generated copy', () => {
  it('answers exactly what live-tools answers', () => {
    expect([...LIGHT_ROUTES]).toEqual([...LIVE_TOOL_ROUTES]);

    for (const route of LIVE_TOOL_ROUTES) {
      const heavy = operationIdsForRoute(route);
      const light = lightOperationIds(route);
      expect(
        light ? [...light].sort() : light,
        `${route}: operation ids`,
      ).toEqual(heavy ? [...heavy].sort() : heavy);

      expect(lightIsLive(route), `${route}: isLiveToolUrl`).toBe(
        isLiveToolUrl(route),
      );
      for (const id of heavy ?? []) {
        const url = `${route}?tool=${id}`;
        expect(lightIsLive(url), url).toBe(isLiveToolUrl(url));
      }
    }

    for (const url of [
      '/pdf/merge',
      '/pdf/merge?tool=nope',
      '/not/a/route',
      '/text/workbench?tool=word-counter',
      '',
    ]) {
      expect(lightIsLive(url), url).toBe(isLiveToolUrl(url));
    }
  });

  it('carries routes and ids only, never operation text', () => {
    // If this file ever imports an operation module it stops being light, and
    // the home page silently goes back to shipping the whole catalogue.
    const source = readFileSync(
      path.join(import.meta.dirname, 'live-tool-routes.ts'),
      'utf8',
    );
    const imports = source.match(/^\s*import\s.*$/gm) ?? [];
    expect(imports, 'live-tool-routes.ts must import nothing').toEqual([]);
  });

  it('is the one the client uses', () => {
    const dropzone = readFileSync(
      path.join(
        import.meta.dirname,
        '..',
        '..',
        'components/smart-dropzone.tsx',
      ),
      'utf8',
    );
    expect(dropzone).toContain("from '@/lib/seo/live-tool-routes'");
    expect(dropzone).not.toContain("from '@/lib/seo/live-tools'");
  });
});
