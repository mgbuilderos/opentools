import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * `app/sitemap.ts` submits a `/guides/:slug` URL for every tool in the
 * catalogue, so the build has to produce a page for every one of them.
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
  it('builds from the whole catalogue, the same source the sitemap uses', () => {
    const body = generateStaticParamsBody('app/guides/[slug]/page.tsx');

    expect(body).toContain('LIVE_TOOL_CATALOG.map(');
  });

  it('narrows the catalogue nowhere', () => {
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
