import type { MetadataRoute } from 'next';

const siteOrigin = ['https:', '//', 'getopentools.com'].join('');

/**
 * Paths this site has never had and never will, listed so a well-behaved
 * crawler stops asking for them.
 *
 * WHAT THIS DOES AND DOES NOT DO. On 2026-09-22 the site answered 10,089
 * requests and 5,255 of them -- 52% -- were 404s for paths like `/.env`,
 * `/wp-json/wp/v2/users`, `/config/aws.yml`, `/credentials.js` and
 * `/index.php`. That traffic is vulnerability scanners, and a scanner does not
 * read robots.txt, so **this file will not reduce it**. A Cloudflare WAF rule
 * is the thing that would, and it is not configurable from this repository:
 * WAF custom rules are zone-level configuration set in the Cloudflare
 * dashboard or through the API, not in `wrangler.json`. See the note in
 * `docs/` and the owner action recorded with this change.
 *
 * What this list does do is cheap and worth having anyway: Googlebot and
 * Bingbot *do* read robots.txt, they *do* retry URLs they have seen linked or
 * referenced anywhere, and a 404 they fetch is crawl budget spent on this
 * site's behalf. Declaring these paths off-limits keeps compliant crawlers off
 * them permanently and makes the remaining 404s in the log legible as attack
 * traffic rather than as site faults.
 *
 * Every entry is a prefix. None of them is a prefix of any route under `app/`
 * -- that is asserted by `lib/seo/canonical-coverage.test.ts`, which reads
 * this list and excludes matching routes from the canonical sweep. Adding a
 * prefix that shadowed a real route would silently drop that route out of the
 * canonical guard, so check before you add.
 */
const SCANNER_PATHS = [
  // Secrets and credentials probed by name.
  '/.env',
  '/.git/',
  '/.aws/',
  '/.ssh/',
  '/credentials',
  '/id_rsa',
  '/server-status',
  // WordPress, by far the loudest family in the log.
  '/wp-admin/',
  '/wp-content/',
  '/wp-includes/',
  '/wp-json/',
  '/wp-login.php',
  '/xmlrpc.php',
  // PHP applications this site does not run.
  '/index.php',
  '/phpmyadmin/',
  '/cgi-bin/',
  '/vendor/',
  '/composer.json',
  // Framework and infrastructure endpoints from other stacks.
  '/actuator/',
  '/telescope/',
  '/admin/',
  '/config/',
  '/backup',
  '/debug/',
] as const;

/**
 * Static for the Node/Docker self-host path. On Cloudflare the file is written
 * by the capture step in `scripts/prerender-to-assets.mjs`; see `sitemap.ts`.
 */
export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/'],
        // `/embed/*` is the framable copy of a tool, served for other
        // people's pages. Every one of them is a stripped version of a page
        // this site is trying to rank, so letting a crawler index both splits
        // the signal the embed programme exists to build. The pages must keep
        // answering 200 -- they are loaded by browsers, not by crawlers -- and
        // they carry `X-Robots-Tag: noindex, follow` in `public/_headers` as
        // well, because a frame fetched as a subresource may never have its
        // `<meta name="robots">` read. `follow` is the half that matters: the
        // attribution link out of the frame is the whole return. `/embed`
        // itself, the page that hands a site owner the snippet, is NOT
        // disallowed -- it is the page meant to rank. ADR-019.
        //
        // `/guides-cached/*` is the rewrite target behind CACHED_GUIDE_SLUGS,
        // not a place for a reader. Every one of its 50 pages is byte-identical
        // to the `/guides/*` page it serves, answers 200 to anyone who asks,
        // and appears in no sitemap -- so a crawler that finds one has found
        // duplicate content and has to guess which URL is canonical. Blocking
        // the prefix is the fix; the pages themselves must keep working,
        // because the rewrite is what serves `/guides/*`.
        disallow: ['/api/', '/guides-cached/', '/embed/', ...SCANNER_PATHS],
      },
      {
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'ClaudeBot',
          'PerplexityBot',
          'Google-Extended',
          'Applebot',
          'Applebot-Extended',
          'bingbot',
          'cohere-ai',
        ],
        allow: ['/'],
        disallow: ['/api/', '/guides-cached/', '/embed/', ...SCANNER_PATHS],
      },
    ],
    sitemap: `${siteOrigin}/sitemap.xml`,
  };
}
