import { existsSync, readdirSync, readFileSync } from 'node:fs';
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
  routedToolIdsForPrefix,
  routedToolPrefixes,
} from './live-tools';
import { TOOL_CATALOG } from './tool-catalog-data';

const appRoot = path.resolve(__dirname, '../..');
const origin = ['https:', '//', 'getopentools.com'].join('');
const sitemapUrls = sitemap().map(({ url }) => url.slice(origin.length));

describe('live tool registry', () => {
  /**
   * A route has a page when `app/<route>/page.tsx` exists, or when a dynamic
   * segment one level up renders it — `app/math/[tool]/page.tsx` serves every
   * `/math/<id>` its `generateStaticParams` names.
   *
   * The check stays as strict as it was. It is not "a dynamic parent exists,
   * so anything under it passes": the parent must actually generate this exact
   * path, which is asserted separately below. Without that second half a typo
   * in a route would sail through here and 404 in production.
   */
  function pageFileFor(route: string) {
    if (existsSync(path.join(appRoot, 'app', route, 'page.tsx'))) return true;
    const parent = route.slice(0, route.lastIndexOf('/'));
    return existsSync(path.join(appRoot, 'app', parent, '[tool]', 'page.tsx'));
  }

  it('only names routes that have a page', () => {
    for (const route of LIVE_TOOL_ROUTES) {
      expect(pageFileFor(route), route).toBe(true);
    }
  });

  it('claims no per-tool route its dynamic page does not generate', () => {
    // The other half of `pageFileFor`. A dynamic parent existing is not
    // enough: it must really produce this exact path, or the registry puts a
    // URL in the sitemap that the build never writes and Google gets a 404.
    const prefixes = new Set(
      LIVE_TOOL_ROUTES.filter(
        (route) => !existsSync(path.join(appRoot, 'app', route, 'page.tsx')),
      ).map((route) => route.slice(0, route.lastIndexOf('/'))),
    );

    expect(prefixes.size).toBeGreaterThan(0);
    for (const prefix of prefixes) {
      const generated = new Set(
        (routedToolIdsForPrefix(prefix) ?? []).map(
          (operation) => `${prefix}/${operation.id}`,
        ),
      );
      const claimed = LIVE_TOOL_ROUTES.filter(
        (route) =>
          route.startsWith(`${prefix}/`) &&
          !existsSync(path.join(appRoot, 'app', route, 'page.tsx')),
      );
      expect(
        claimed.filter((route) => !generated.has(route)),
        prefix,
      ).toEqual([]);
    }
  });

  it('gives every tool exactly one URL', () => {
    // Two workbenches can host the same operation. Generating a page under
    // each prefix produces two URLs with the same title running the same tool
    // -- duplicate content, which splits the ranking and makes a search engine
    // guess which is canonical. `json-to-csv` and `url-normalizer` shipped that
    // way before an audit of titles across the built site caught them, so the
    // audit is this test.
    // Walk the prefixes rather than parsing route strings: a hand-written
    // route can legitimately end in the same segment as another (/image/metadata
    // and /documents/metadata are different tools), and every workbench hub
    // ends in "workbench". Only generated per-tool pages can collide on an id.
    const seen = new Map<string, string>();
    const duplicated: string[] = [];
    for (const prefix of routedToolPrefixes()) {
      for (const operation of routedToolIdsForPrefix(prefix) ?? []) {
        const route = `${prefix}/${operation.id}`;
        const already = seen.get(operation.id);
        if (already)
          duplicated.push(`${operation.id}: ${already} and ${route}`);
        else seen.set(operation.id, route);
      }
    }

    expect(seen.size).toBeGreaterThan(500);
    expect(
      duplicated,
      `the same tool is published at more than one URL: ${duplicated.join(', ')}`,
    ).toEqual([]);
  });

  it('rejects operations a route does not run', () => {
    expect(isLiveToolUrl('/developer/advanced?tool=jwt-decoder')).toBe(true);
    expect(isLiveToolUrl('/pdf/page-tools?tool=rotate-pdf')).toBe(true);
    expect(isLiveToolUrl('/pdf/merge')).toBe(true);
    expect(isLiveToolUrl('/pdf/ocr')).toBe(true);
    expect(isLiveToolUrl('/image/to-text')).toBe(true);
    expect(isLiveToolUrl('/image/exact-size')).toBe(true);
    expect(
      isLiveToolUrl('/creator/workbench?tool=exact-kb-image-compressor'),
    ).toBe(false);
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
    expect(guides).toContain('/guides/pdf-ocr-pdf');
    expect(guides).toContain('/guides/image-image-to-text');
    expect(guides).not.toContain('/guides/video-video-to-gif');
    // /image/exact-size really writes the file, so its guide is listed.
    expect(guides).toContain('/guides/image-resize-image-to-exact-kb');
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

/**
 * Claims the product cannot back, kept out of the surfaces a visitor reads.
 *
 * On 2026-09-18 the shipped bundle carried "zero data leaks", "zero cloud
 * uploads" and "Prevented accidental data leaks" on the card shown after every
 * completed task, while `ai/KNOWN_ISSUES.md` recorded the egress proof
 * protocol as "not empirically complete" and `implementation/ARCHITECTURE.md`
 * said that because of it "the UI says proof is pending". It did not.
 *
 * `e2e/egress-proof.spec.ts` now supplies that proof per release, so the
 * *egress* claim is earned. These two are not, and no proof can earn them:
 *
 * - A **security guarantee** ("zero data leaks", "prevented data leaks") is an
 *   assertion about every vulnerability that does not exist. Egress evidence
 *   says where bytes went, never that no flaw remains.
 * - A **claim about the reader's money** ("saved you paid subscriptions") is an
 *   invented number by another name — board §1.7.
 */
describe('claims the build cannot back', () => {
  const surfaces = [
    'components/completion-value-dialog.tsx',
    'components/milestone-modal.tsx',
    'components/app-shell.tsx',
    'app/support/page.tsx',
  ];

  const forbidden: Array<[RegExp, string]> = [
    [
      /zero[- ]?data[- ]?leaks?/iu,
      'a security guarantee no proof can establish',
    ],
    [
      /prevented\s+(accidental\s+)?data[- ]?leaks?/iu,
      'claims a breach was averted',
    ],
    [/saved you paid/iu, "a claim about the reader's money"],
    [
      /\b0 bytes uploaded\b/iu,
      'rule 23 — needs the egress proof named explicitly',
    ],
  ];

  it.each(surfaces)('%s makes no unbackable claim', (relative) => {
    const file = path.join(appRoot, relative);
    if (!existsSync(file)) return;
    // Comments may quote a removed claim in order to explain why it went.
    const code = readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//gu, '')
      .replace(/\{\/\*[\s\S]*?\*\/\}/gu, '')
      .replace(/\/\/[^\n]*/gu, '');
    for (const [pattern, why] of forbidden) {
      expect(code, `${relative}: ${why}`).not.toMatch(pattern);
    }
  });

  it('keeps the egress proof wired to the claim it backs', () => {
    // If the dialog names the mechanism, the test that verifies it must exist.
    const dialog = readFileSync(
      path.join(appRoot, 'components/completion-value-dialog.tsx'),
      'utf8',
    );
    if (/connect-src/iu.test(dialog)) {
      expect(existsSync(path.join(appRoot, 'e2e/egress-proof.spec.ts'))).toBe(
        true,
      );
    }
  });
});

/**
 * No competitor is named in shipped code, ever.
 *
 * Owner decision, 2026-09-18: "let us not take any competitor name, hardcode it
 * never we will do it in the tool." A measurement script briefly shipped a list
 * of rival products as its default targets. Two reasons that was wrong, and the
 * second is the one that matters commercially:
 *
 * 1. A claim about a named company baked into a repository goes stale the
 *    moment they change a header, and a stale claim about someone else is the
 *    one unrecoverable mistake here.
 * 2. It reads as an attack from a rival rather than as a measurement. A reader
 *    who runs the check against a site they chose reaches the conclusion
 *    themselves, which is worth far more than being told it.
 *
 * File-format references are not competitor mentions — `xmlns:adobe` in SVG
 * cleanup and `ns.adobe.com/xap/` in XMP parsing are specification names, and
 * removing them would break real tools.
 */
describe('no competitor is named in shipped code', () => {
  const brands =
    /\b(smallpdf|ilovepdf|pdf24|tinypng|sejda|pdf2go|stirlingpdf|acrobat)\b/iu;

  // Declared separately rather than inline: a named function expression handed
  // to flatMap is called with a `this` of undefined, which TypeScript rejects.
  const walk = (dir: string): string[] => {
    const here = path.join(appRoot, dir);
    if (!existsSync(here)) return [];
    return readdirSync(here, { withFileTypes: true }).flatMap((entry) => {
      const next = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(next);
      return /\.(tsx?|mjs)$/u.test(entry.name) && !/\.test\./u.test(entry.name)
        ? [next]
        : [];
    });
  };
  const files = ['app', 'components', 'scripts', 'workers'].flatMap(walk);

  it('scans a meaningful number of files', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it.each(files)('%s names no competitor', (relative) => {
    const source = readFileSync(path.join(appRoot, relative), 'utf8');
    const hit = source.match(brands);
    expect(
      hit?.[0],
      `${relative} hardcodes "${hit?.[0]}" — measure by argument, never by a baked-in list`,
    ).toBeUndefined();
  });
});
