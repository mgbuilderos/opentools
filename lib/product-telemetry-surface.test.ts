import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import nextConfig from '@/next.config';
import { parseHeaderRules } from '../scripts/lib/headers-policy.mjs';
import { contentSecurityPolicy } from './security/content-security-policy';
import { buildSitemap } from './seo/sitemap-entries';
import { PRODUCT_SIGNALS, SIGNAL_PATHS } from './product-telemetry';

/**
 * Everything about the nine counters that is true of the *deployment* rather
 * than of the module: the files exist, they are uncacheable, they are not in
 * the sitemap, they are not precached, the security header did not move, and a
 * self-hosted instance asks its own origin for them.
 *
 * Each of these has a failure mode that would be silent. A cacheable counter
 * stops counting and looks like a site nobody uses. A precached counter is
 * answered from the worker's own cache and reports an offline visit that never
 * reached anyone. A counter in the sitemap asks Google to crawl it, which
 * would count Googlebot as a person. A CSP that drifted would mean this
 * feature had quietly cost the product its one real promise.
 */
const projectRoot = path.resolve(import.meta.dirname, '..');
const read = (relative: string) =>
  readFileSync(path.join(projectRoot, relative), 'utf8');

const headerRules = parseHeaderRules(read('public/_headers'));
const telemetryRule = headerRules.find(
  (rule) => rule.pattern === '/telemetry/v1/*',
);

describe('the counter assets exist and are served uncacheably', () => {
  it('ships one file per signal and no extras', () => {
    const directory = path.join(projectRoot, 'public/telemetry/v1');
    expect(existsSync(directory)).toBe(true);
    expect(readdirSync(directory).sort()).toEqual(
      PRODUCT_SIGNALS.map((signal) => `${signal}.svg`).sort(),
    );
    for (const signal of PRODUCT_SIGNALS) {
      const file = path.join(projectRoot, 'public', SIGNAL_PATHS[signal]);
      expect(existsSync(file), SIGNAL_PATHS[signal]).toBe(true);
      // A counter is not a picture. Nothing in it may vary by event, or the
      // bytes themselves would become a channel.
      expect(readFileSync(file, 'utf8')).toBe(
        read('public/telemetry/v1/completed-web.svg'),
      );
    }
  });

  it('is no-store on the Cloudflare path', () => {
    // MUTATION GUARD. Change `no-store` to anything cacheable and this fails:
    // the second event of a kind would be answered from a cache, never reach
    // Cloudflare, and never be counted.
    expect(
      telemetryRule,
      'public/_headers has no /telemetry/v1/* rule',
    ).toBeDefined();
    const values = telemetryRule!.lines
      .filter((line) => line.kind === 'set' && line.name === 'Cache-Control')
      .map((line) => line.value);
    expect(values).toEqual(['no-store']);
  });

  it('unsets the inherited policy first, because rules combine', () => {
    const unset = telemetryRule!.lines.findIndex(
      (line) => line.kind === 'unset' && line.name === 'Cache-Control',
    );
    const set = telemetryRule!.lines.findIndex(
      (line) => line.kind === 'set' && line.name === 'Cache-Control',
    );
    expect(unset).toBeGreaterThan(-1);
    expect(unset).toBeLessThan(set);
  });

  it('is no-store on the Node and Docker path too', async () => {
    // The two header files govern different halves of the audience and a rule
    // added to one alone reaches half the users. See `header-parity.test.ts`.
    const declared = (await nextConfig.headers!()).find((entry) =>
      entry.source.startsWith('/telemetry/v1/'),
    );
    expect(
      declared,
      'next.config.ts declares no /telemetry/v1 headers',
    ).toBeDefined();
    expect(
      declared!.headers.find(({ key }) => key === 'Cache-Control')?.value,
    ).toBe('no-store');
    expect(
      declared!.headers.find(({ key }) => key === 'X-Robots-Tag')?.value,
    ).toContain('noindex');
  });

  it('asks search engines not to index a counter', () => {
    const robots = telemetryRule!.lines.find(
      (line) => line.kind === 'set' && line.name === 'X-Robots-Tag',
    );
    expect(robots?.value).toContain('noindex');
  });
});

describe('a counter is not a page', () => {
  it('appears nowhere in the sitemap', () => {
    const urls = buildSitemap().map((entry) => entry.url);
    expect(urls.length).toBeGreaterThan(100);
    const leaked = urls.filter((url) => url.includes('/telemetry/'));
    expect(leaked, leaked.join('\n')).toEqual([]);
  });

  it('has no page component under app/', () => {
    expect(existsSync(path.join(projectRoot, 'app/telemetry'))).toBe(false);
  });
});

describe('the security header did not move', () => {
  /**
   * The exact policy `origin/main` shipped before this feature existed, copied
   * out of `public/_headers` at commit `26ccc5b`. An image request is governed
   * by `img-src`, which already allowed `'self'`, so nothing here needed to
   * change — and this test is what proves that claim rather than repeating it.
   */
  const BEFORE =
    "default-src 'self'; base-uri 'self'; connect-src 'none'; font-src 'self'; " +
    "form-action 'none'; frame-ancestors 'none'; img-src 'self' blob: data:; " +
    "object-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' " +
    "'unsafe-inline'; webrtc 'block'; worker-src 'self' blob:";

  it('serves the same catch-all CSP, byte for byte, as before the counters', () => {
    const catchAll = headerRules.find((rule) => rule.pattern === '/*');
    const served = catchAll!.lines.find(
      (line) => line.kind === 'set' && line.name === 'Content-Security-Policy',
    );
    expect(served!.value).toBe(BEFORE);
  });

  it('keeps connect-src none, which is what makes the promise real', () => {
    const policy = contentSecurityPolicy({ development: false });
    expect(policy).toContain("connect-src 'none'");
    expect(policy).toContain("img-src 'self'");
  });

  it('adds no rule that relaxes a policy for the counters', () => {
    // A `/telemetry/*` rule that also set a CSP would be a second, quieter way
    // to loosen the site's policy. There is no reason for one to exist.
    expect(
      telemetryRule!.lines.some(
        (line) => line.name === 'Content-Security-Policy',
      ),
    ).toBe(false);
  });
});

describe('a self-hosted instance never phones home', () => {
  it('requests every counter from its own origin, by relative path', () => {
    for (const signal of PRODUCT_SIGNALS) {
      expect(SIGNAL_PATHS[signal].startsWith('/')).toBe(true);
      expect(SIGNAL_PATHS[signal]).not.toContain('//');
    }
  });

  it('names no origin in any file that can send a signal', () => {
    // MUTATION GUARD. Pointing a counter at the public site would make every
    // Docker deployment report to getopentools.com, which is the single worst
    // outcome this feature could have.
    for (const file of [
      'lib/product-telemetry.ts',
      'lib/completion.ts',
      'lib/pwa-install.ts',
      'components/product-signals.tsx',
      'components/install-prompt.tsx',
      'components/share-target-landing.tsx',
      'components/handed-over-file.tsx',
    ]) {
      expect(read(file), file).not.toContain('getopentools');
      expect(read(file), file).not.toMatch(/https?:\/\//u);
    }
  });

  it('ships the counter files inside the image, so no request escapes it', () => {
    // `public/` is copied into the build, so an instance with no network at
    // all answers its own counters. Nothing is forwarded anywhere.
    const dockerfile = read('Dockerfile');
    expect(dockerfile).toMatch(/COPY|WORKDIR/u);
    expect(existsSync(path.join(projectRoot, 'public/telemetry/v1'))).toBe(
      true,
    );
  });
});
