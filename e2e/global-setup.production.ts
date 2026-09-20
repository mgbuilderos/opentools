import type { FullConfig } from '@playwright/test';

/**
 * The deployed counterpart of `global-setup.ts`.
 *
 * Locally the guard is "is this server serving THIS worktree's build" — it can
 * compare against `dist/`. Against a deployed site there is no local build to
 * compare with, so the guard does the other necessary job instead: it NAMES
 * what answered. Evidence that does not say which build it measured is not
 * evidence, and rule 23 asks whether a *specific* build passed.
 */
const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/140.0 Safari/537.36';

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL;
  if (!baseURL) throw new Error('No baseURL configured for the deployed egress run.');

  // A browser-shaped request on purpose: Cloudflare only injected its analytics
  // beacon for requests that looked like a real browser asking for HTML, so a
  // weaker request returns a false all-clear.
  const response = await fetch(baseURL, {
    headers: { 'User-Agent': BROWSER_UA, Accept: 'text/html' },
  });
  const html = await response.text();

  if (!html.includes('OpenTools')) {
    const title = /<title>([^<]*)<\/title>/u.exec(html)?.[1] ?? '(no title)';
    throw new Error(`${baseURL} is serving "${title}", not OpenTools.`);
  }

  const chunk =
    /\/_next\/static\/chunks\/(index-[A-Za-z0-9_-]+\.js)/u.exec(html)?.[1] ??
    '(no app chunk in the HTML)';
  const worker = response.headers.get('cf-ray') ?? '(no cf-ray)';
  const beacons = (html.match(/cloudflareinsights/gu) ?? []).length;

  console.log(
    `\nEgress proof target: ${baseURL}\n` +
      `  app chunk served: ${chunk}\n` +
      `  cf-ray:           ${worker}\n` +
      `  third-party beacon tags in HTML: ${beacons}\n`,
  );
  if (beacons > 0) {
    throw new Error(
      `${baseURL} is serving ${beacons} cloudflareinsights tag(s). The CSP ` +
        `would block them, but "no third-party trackers" must not depend on ` +
        `one directive catching an injected tag. Disable Real User ` +
        `Measurements in Cloudflare Web Analytics before claiming it.`,
    );
  }
}
