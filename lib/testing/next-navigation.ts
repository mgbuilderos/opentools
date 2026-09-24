/**
 * The `next/navigation` surface a page file needs merely to be imported.
 *
 * Four server components -- the blog, guide, guide-category and template
 * `[slug]` routes -- call `notFound()` for a slug that does not exist. vinext
 * supplies that module at build time and there is no `next` package installed,
 * so importing any of those pages under vitest fails to resolve it. That is the
 * reason `guide-prerender-coverage.test.ts` reads its page off disk as text
 * rather than importing it.
 *
 * `description-coverage.test.ts` cannot do that: it has to call the real
 * `generateMetadata`, because a description assembled by a helper is exactly
 * the kind that no substring search can measure. So `vitest.config.ts` points
 * `next/navigation` here. Nothing in this file runs in the build, and it throws
 * rather than returning, so a test that reaches a not-found branch is told so
 * instead of quietly measuring a page Next would never have served.
 */

export class NotFoundError extends Error {
  readonly digest = 'NEXT_NOT_FOUND';
  constructor() {
    super('notFound() was called');
    this.name = 'NotFoundError';
  }
}

export function notFound(): never {
  throw new NotFoundError();
}

export function redirect(url: string): never {
  throw new Error(`redirect(${url}) was called`);
}

export function permanentRedirect(url: string): never {
  throw new Error(`permanentRedirect(${url}) was called`);
}
