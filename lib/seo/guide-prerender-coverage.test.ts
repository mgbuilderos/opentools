import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * `app/sitemap.ts` submits a `/guides/:slug` URL for every guide it publishes,
 * so the build has to produce a page for every one of them. Both sides read
 * `getPublishedGuideTools()` (lib/seo/guide-consolidation.ts) -- the whole live
 * catalogue while guide consolidation is off -- and this test is what stops one
 * of them being narrowed on its own.
 *
 * A narrower `generateStaticParams` does not fail the build. It just leaves the
 * rest rendering per request on a Worker capped at 10ms CPU, which is how 177
 * guides came to return 503 to Google on 2026-09-20 while the build was capped
 * at `.slice(0, 50)`.
 *
 * The page is read from disk rather than imported: it is a server component and
 * pulls `next/navigation`, which does not resolve under vitest's node
 * environment. `cache-budget.test.ts` reads page files the same way.
 */
const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);

function generateStaticParamsBody(pageFile: string): string {
  const source = readFileSync(path.join(projectRoot, pageFile), 'utf8');
  const start = source.indexOf('export async function generateStaticParams()');
  expect(start, `${pageFile} declares no generateStaticParams`).toBeGreaterThan(
    -1,
  );
  const end = source.indexOf('\n}', start);
  return source.slice(start, end);
}

describe('every guide in the sitemap is prerendered', () => {
  it('builds from the same source the sitemap uses', () => {
    const body = generateStaticParamsBody('app/guides/[slug]/page.tsx');
    const sitemap = readFileSync(
      path.join(projectRoot, 'lib/seo/sitemap-entries.ts'),
      'utf8',
    );

    // One function answers "which guides exist" for both the pages that get
    // built and the URLs handed to Google, so neither can be changed alone.
    expect(body).toContain('getPublishedGuideTools().map(');
    expect(sitemap).toContain('getPublishedGuideTools(');
  });

  // Narrowing belongs in `getPublishedGuideTools`, where the sitemap sees it
  // too. Narrowing here would leave the difference rendering per request.
  it('narrows the list nowhere of its own', () => {
    const body = generateStaticParamsBody('app/guides/[slug]/page.tsx');
    const narrowing = ['.slice(', '.filter(', '.splice('].filter((call) =>
      body.includes(call),
    );

    expect(
      narrowing,
      `guides left out here still appear in the sitemap and render per request: ${narrowing.join(', ')}`,
    ).toEqual([]);
  });
});
