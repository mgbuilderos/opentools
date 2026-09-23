import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { LIVE_TOOL_ROUTES } from './live-tools';
import { buildSitemap } from './sitemap-entries';

/**
 * Sweeps all live tool routes to prove nothing is blocking indexation.
 *
 * Each route in LIVE_TOOL_ROUTES must simultaneously be:
 *   1. Self-canonical: canonical is its own absolute URL (not origin, guide, or another tool)
 *   2. Present in the sitemap
 *   3. Present as a built file in dist/client/
 *   4. Carrying a title that is UNIQUE across the entire set
 *   5. Carrying a meta description that is not empty and not the site default
 */

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const CLIENT_DIR = path.join(ROOT, 'dist/client');
const CANONICAL_ORIGIN = ['https:', '//', 'getopentools.com'].join('');
const SITE_DEFAULT_DESCRIPTION =
  '100% in-browser, zero-upload private utilities for PDF, image, audio, video, text, developer, and structured data tasks.';

function candidateFiles(route: string): string[] {
  const clean = route.replace(/^\/+|\/+$/g, '');
  if (clean === '') return ['index.html'];
  return [`${clean}.html`, path.join(clean, 'index.html')];
}

interface RouteAudit {
  route: string;
  expectedCanonical: string;
  inSitemap: boolean;
  builtFile?: string;
  canonical?: string;
  title?: string;
  description?: string;
  isSelfCanonical: boolean;
  hasUniqueTitle: boolean;
  hasValidDescription: boolean;
}

function auditRoutes(): {
  audits: RouteAudit[];
  missingSitemap: string[];
  missingDistFile: string[];
  nonSelfCanonical: { route: string; found?: string; expected: string }[];
  duplicateTitles: { title: string; routes: string[] }[];
  invalidDescriptions: { route: string; reason: string; description?: string }[];
} {
  const sitemapUrls = new Set(buildSitemap().map((entry) => String(entry.url)));
  const titleToRoutes = new Map<string, string[]>();

  const audits: RouteAudit[] = [];
  const missingSitemap: string[] = [];
  const missingDistFile: string[] = [];
  const nonSelfCanonical: { route: string; found?: string; expected: string }[] = [];
  const invalidDescriptions: { route: string; reason: string; description?: string }[] = [];

  for (const route of LIVE_TOOL_ROUTES) {
    const expectedCanonical = `${CANONICAL_ORIGIN}${route === '/' ? '' : route}`;
    const inSitemap = sitemapUrls.has(expectedCanonical);
    if (!inSitemap) {
      missingSitemap.push(route);
    }

    const candidates = candidateFiles(route);
    const matchedFile = candidates.find((rel) => existsSync(path.join(CLIENT_DIR, rel)));

    let canonical: string | undefined;
    let title: string | undefined;
    let description: string | undefined;

    if (!matchedFile) {
      missingDistFile.push(route);
    } else {
      const html = readFileSync(path.join(CLIENT_DIR, matchedFile), 'utf8');

      const canonMatch =
        html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i) ??
        html.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["']/i);
      canonical = canonMatch?.[1];

      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      title = titleMatch?.[1]?.trim();

      const descMatch =
        html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ??
        html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
      description = descMatch?.[1]?.trim();
    }

    const isSelfCanonical = Boolean(canonical && canonical === expectedCanonical);
    if (!isSelfCanonical) {
      nonSelfCanonical.push({ route, found: canonical, expected: expectedCanonical });
    }

    if (title) {
      const current = titleToRoutes.get(title) ?? [];
      current.push(route);
      titleToRoutes.set(title, current);
    }

    let hasValidDescription = true;
    if (!description) {
      hasValidDescription = false;
      invalidDescriptions.push({ route, reason: 'empty description', description });
    } else if (description === SITE_DEFAULT_DESCRIPTION) {
      hasValidDescription = false;
      invalidDescriptions.push({ route, reason: 'site default description', description });
    }

    audits.push({
      route,
      expectedCanonical,
      inSitemap,
      builtFile: matchedFile,
      canonical,
      title,
      description,
      isSelfCanonical,
      hasUniqueTitle: true,
      hasValidDescription,
    });
  }

  const duplicateTitles: { title: string; routes: string[] }[] = [];
  for (const [title, routes] of titleToRoutes.entries()) {
    if (routes.length > 1) {
      duplicateTitles.push({ title, routes });
    }
  }

  const dupTitleSet = new Set(duplicateTitles.flatMap((d) => d.routes));
  for (const audit of audits) {
    if (audit.title && dupTitleSet.has(audit.route)) {
      audit.hasUniqueTitle = false;
    }
  }

  return {
    audits,
    missingSitemap,
    missingDistFile,
    nonSelfCanonical,
    duplicateTitles,
    invalidDescriptions,
  };
}

describe('indexability sweep across all LIVE_TOOL_ROUTES', () => {
  it('covers all live tool routes', () => {
    expect(LIVE_TOOL_ROUTES.length).toBeGreaterThanOrEqual(1325);
  });

  it('verifies dist/client exists', () => {
    expect(existsSync(CLIENT_DIR)).toBe(true);
  });

  it('guarantees every live tool route is present in sitemap', () => {
    const { missingSitemap } = auditRoutes();
    expect(
      missingSitemap,
      `Routes missing from sitemap (${missingSitemap.length}):\n${missingSitemap.join('\n')}`,
    ).toEqual([]);
  });

  it('guarantees every live tool route has a built static file in dist/client/', () => {
    const { missingDistFile } = auditRoutes();
    expect(
      missingDistFile,
      `Routes missing built file (${missingDistFile.length}):\n${missingDistFile.join('\n')}`,
    ).toEqual([]);
  });

  it('guarantees every live tool route is self-canonical', () => {
    const { nonSelfCanonical } = auditRoutes();
    expect(
      nonSelfCanonical,
      `Routes not self-canonical (${nonSelfCanonical.length}):\n${nonSelfCanonical
        .map((f) => `  ${f.route} -> found: "${f.found}" (expected: "${f.expected}")`)
        .join('\n')}`,
    ).toEqual([]);
  });

  it('guarantees every live tool route has a unique title', () => {
    const { duplicateTitles } = auditRoutes();
    expect(
      duplicateTitles,
      `Duplicate titles (${duplicateTitles.length}):\n${duplicateTitles
        .map((d) => `  "${d.title}" shared by:\n    ${d.routes.join('\n    ')}`)
        .join('\n')}`,
    ).toEqual([]);
  });

  it('guarantees every live tool route has a valid, non-default meta description', () => {
    const { invalidDescriptions } = auditRoutes();
    expect(
      invalidDescriptions,
      `Invalid descriptions (${invalidDescriptions.length}):\n${invalidDescriptions
        .map((f) => `  ${f.route} -> ${f.reason}: "${f.description ?? ''}"`)
        .join('\n')}`,
    ).toEqual([]);
  });
});
