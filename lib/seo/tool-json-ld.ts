import type { Metadata } from 'next';

import { loadsLocalModel } from '../security/content-security-policy';
import { CATEGORY_LINKS } from './category-hubs';
import { toolPageDepth } from './tool-page-depth';

/*
  THE MEASURED GAP THIS FILE CLOSES.

  On 2026-09-25 a sweep of the rendered HTML found structured data on
  `/blog/*`, `/guides/*` and `/templates/*`, and on the 64 tool routes that
  carry depth content (`components/page-depth-content.tsx` emits `HowTo` and
  `FAQPage` from the words it renders). Every other tool page -- the whole
  commercial core, the pages a person has to open because the answer is a
  converted file rather than a number -- served none at all. A crawler read
  them as an untyped document with a title.

  That matters more now than it did. A growing share of "how do I merge a PDF
  without uploading it" is asked of an assistant rather than a search box, and
  an assistant picking a source does not weigh twenty years of backlinks. It
  picks the page that states, unambiguously and in a form it can parse, what
  the thing is, what it costs, where it runs, and what can be checked. This
  file is that statement.

  WHAT IS CLAIMED, AND WHY EACH CLAIM IS CHECKABLE.

  - `SoftwareApplication` / `WebApplication`, priced at 0, `isAccessibleForFree`.
    True of every route: no account, no quota, no watermark.
  - The Content-Security-Policy the route is actually served with, read from
    `lib/security/content-security-policy.ts` -- the same module that emits the
    header. `connect-src 'none'` on most routes; `connect-src 'self'` on the
    five that fetch a model or a decoder from this same origin. The header is
    what makes the privacy claim a fact rather than a promise, and naming it
    per route is why this file asks that module instead of restating a string.
  - `softwareHelp` points at `/proof`, which carries the exfiltration protocol
    and the measured result per vector. A claim with its evidence attached.
  - `BreadcrumbList`, from `CATEGORY_LINKS` -- the same list the homepage
    renders, so the hierarchy a machine reads is the one a person clicks.

  WHAT IS NOT CLAIMED. No `aggregateRating`, no `review`, no `datePublished`
  invented for the occasion. There are no reviews to aggregate and inventing
  them is the exact kind of unearned claim `components/page-depth-content.tsx`
  already refuses. A structured-data block that lies is worse than none: it is
  the one signal an answer engine can check against the page and drop the
  source over.

  NOTHING HERE RESTATES A STRING. The name and the description are read from
  the page's own `Metadata` -- the object the page already exports or already
  builds in `generateMetadata` -- so the sentence a machine quotes is the
  sentence the search result shows, and neither can drift from the other.
*/

const siteOrigin = ['https:', '//', 'getopentools.com'].join('');
const schemaContext = ['https:', '//', 'schema.org'].join('');
const mitLicense = ['https:', '//', 'opensource.org/license/mit'].join('');

/** Route -> the short label and depth-1 address the homepage uses for it. */
const CATEGORY_BY_PREFIX = new Map(
  CATEGORY_LINKS.map((link) => [link.route, link] as const),
);

/** The `/pdf` in `/pdf/merge`, or undefined for a one-segment route. */
function categoryFor(route: string) {
  const segments = route.split('/').filter(Boolean);
  if (segments.length < 2) return undefined;
  return CATEGORY_BY_PREFIX.get(`/${segments[0]}`);
}

/**
 * The plain string behind `Metadata['title']`.
 *
 * Next lets a title be a string, an `absolute`, or a `default`. A page here
 * uses the first two; the third is a layout's fallback and never a page's own
 * title. Anything else means a page grew a shape this file has not been taught
 * to read, and silently emitting `[object Object]` as the name of the software
 * is worse than stopping.
 */
function titleText(title: Metadata['title'], route: string): string {
  if (typeof title === 'string') return title;
  if (title && typeof title === 'object' && 'absolute' in title) {
    const absolute = title.absolute;
    if (typeof absolute === 'string') return absolute;
  }
  throw new Error(`Tool page ${route} has no plain-string title to name it by`);
}

export interface ToolJsonLdInput {
  /** The path the page is served at, e.g. `/pdf/merge`. No origin, no query. */
  route: string;
  /** The page's own metadata. Read, never rewritten. */
  meta: Metadata;
}

/**
 * What a machine reading one tool page should come away knowing.
 *
 * Returned as a `@graph` so the software, the page and the trail are three
 * addressable nodes rather than one blob, and so the page can point at the
 * site-wide `WebSite` and `Organization` that `app/layout.tsx` already emits
 * instead of declaring a second, competing copy of either.
 */
export function toolJsonLd({
  route,
  meta,
}: ToolJsonLdInput): Record<string, unknown> {
  const url = `${siteOrigin}${route}`;
  const name = titleText(meta.title, route);
  const description = meta.description;
  if (typeof description !== 'string' || description.length === 0) {
    throw new Error(`Tool page ${route} has no description to describe it by`);
  }

  const category = categoryFor(route);
  const localModel = loadsLocalModel(route);
  /*
    Asked rather than passed in. `offlineReady` is true only for a route in the
    service worker precache list, and `lib/seo/tool-page-depth.test.ts` already
    fails the build if it is set anywhere else -- so the depth entry is the one
    place that knows, and a page repeating the flag here could only get it
    wrong.
  */
  const offlineReady = toolPageDepth(route)?.offlineReady === true;

  const featureList = [
    'Runs in the browser tab: the file or input is read by the page itself',
    localModel
      ? // Named exactly as served. The five routes that fetch a model or a
        // decoder get 'self', and saying 'none' here would be the one
        // structured-data claim on the site a reader could disprove with
        // `curl -I`.
        "Served with Content-Security-Policy connect-src 'self': the page may fetch its model and WebAssembly runtime from this site only, never from a third party"
      : "Served with Content-Security-Policy connect-src 'none': the browser refuses to let the page open a connection to any server, including this one",
    "Served with webrtc 'block': no peer connection can be opened either",
    'No account, no upload, no quota, no watermark, no paywall',
    ...(offlineReady ? ['Works offline after the first visit'] : []),
  ];

  const breadcrumb = [
    { name: 'Home', item: siteOrigin },
    ...(category
      ? [{ name: category.name, item: `${siteOrigin}${category.route}` }]
      : []),
    { name, item: url },
  ];

  return {
    '@context': schemaContext,
    '@graph': [
      {
        '@type': ['SoftwareApplication', 'WebApplication'],
        '@id': `${url}#tool`,
        name,
        description,
        url,
        applicationCategory: 'UtilitiesApplication',
        ...(category ? { applicationSubCategory: category.name } : {}),
        operatingSystem: 'All modern browsers (Chrome, Firefox, Safari, Edge)',
        browserRequirements: 'Requires JavaScript. No plugin, no install.',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        isAccessibleForFree: true,
        license: mitLicense,
        featureList,
        softwareHelp: {
          '@type': 'WebPage',
          name: 'How the zero-egress claim was measured',
          url: `${siteOrigin}/proof`,
        },
        publisher: { '@id': `${siteOrigin}/#organization` },
        isPartOf: { '@id': `${siteOrigin}/#website` },
      },
      {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name,
        description,
        isPartOf: { '@id': `${siteOrigin}/#website` },
        mainEntity: { '@id': `${url}#tool` },
        breadcrumb: { '@id': `${url}#breadcrumb` },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: breadcrumb.map((crumb, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: crumb.name,
          item: crumb.item,
        })),
      },
    ],
  };
}
