import type { FullConfig } from '@playwright/test';

/**
 * Refuses to run the suite against someone else's dev server.
 *
 * `reuseExistingServer` attaches to whatever already listens on the port. A
 * different project was listening on 3000 on this machine, so every route in
 * `all-tools-smoke.spec.ts` was asserting "an h1 is visible" against an
 * unrelated app — 628 passing tests that proved nothing. The suite now uses
 * its own port and checks whose server answered before any test runs.
 */
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL ?? 'http://localhost:8788';

  const response = await fetch(baseURL);
  const html = await response.text();

  if (!html.includes('OpenTools')) {
    const title = /<title>([^<]*)<\/title>/u.exec(html)?.[1] ?? '(no title)';
    throw new Error(
      `${baseURL} is serving "${title}", not OpenTools. Something else is ` +
        `listening on that port — stop it, or change the port in ` +
        `playwright.config.ts. Running the suite against it would pass ` +
        `without testing anything.`,
    );
  }
}
