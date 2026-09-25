import type { Metadata } from 'next';
import './globals.css';
import { HandedOverFile } from '@/components/handed-over-file';

const httpsScheme = ['https:', '//'].join('');
const siteOrigin = `${httpsScheme}getopentools.com`;
const schemaContext = `${httpsScheme}schema.org`;

/**
 * Every page on this site is built from static catalog data, so each one is
 * rendered once and then served from the KV-backed ISR cache for a day. This
 * also gives responses a real `s-maxage` policy, replacing the `no-store`
 * that stopped Cloudflare caching HTML at the edge.
 */
// Caching is opted into per page, not set here for all 649 of them. See
// docs/CACHE_BUDGET.md: the free Cloudflare KV allowance is ~1,000 writes a
// day and a blanket setting spends ~1,298 of them without ever serving a hit.

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: {
    default: 'OpenTools — Fast, private browser utilities',
    template: '%s · OpenTools',
  },
  description:
    '100% in-browser, zero-upload private utilities for PDF, image, audio, video, text, developer, and structured data tasks.',
  keywords: [
    'private browser tools',
    'offline pdf tools',
    'client-side image editor',
    'zero upload tools',
    'zero egress utilities',
    'local webassembly tools',
    'pdf merge offline',
    'image background remover local',
    'developer tools in browser',
  ],
  /*
   * No `alternates.canonical` here. Next.js inherits a layout's canonical
   * into every page that does not declare its own, so this line made all
   * 59 dedicated routes -- every PDF and image tool, and all fourteen
   * workbenches -- ship a `<link rel="canonical">` pointing at `siteOrigin`
   * and ask Google not to index them. Measured live 2026-09-23. The home
   * page states its own canonical in `app/page.tsx`; every other page
   * states its own too, held to it by `lib/seo/canonical-coverage.test.ts`.
   */
  /*
   * NO `title`, `description` OR ABSOLUTE `url` HERE, AND THAT IS THE POINT.
   *
   * Measured against a fresh `dist/client` on 2026-09-23: of 1,413 sitemap
   * URLs, 1,335 served the identical `og:title`
   * `OpenTools — Fast, Private Browser Utilities`, the identical
   * `og:description`, and an `og:url` pointing at the home page. Only 79
   * distinct values existed across the whole site. Every one of those 1,335 is
   * a tool page that declares no `openGraph` of its own and inherited this
   * block wholesale, so a link posted to Hacker News or Reddit previewed as
   * the site rather than as the tool that was shared -- and `og:url` is read
   * as the canonical by Facebook and LinkedIn, which folded all 1,335 shares
   * into one object. Their `<title>` tags were already 1,413 distinct values;
   * only the card was generic.
   *
   * Leaving the three fields out is the fix, not an omission. The metadata
   * shim fills `og:title` from the page's own resolved title (template
   * applied) and `og:description` from its own description whenever this block
   * states neither -- see `postProcessMetadata` in vinext's metadata shim, and
   * `lib/seo/share-card-coverage.test.ts`, which pins that behaviour so an
   * upgrade that drops it fails here rather than in a feed. `url: '.'`
   * resolves against the page's own pathname for the same reason.
   *
   * Setting any of the three again re-breaks all 1,335 pages at once and no
   * page file will look wrong. The population check in
   * `scripts/check-share-and-heading-order.mjs` is what catches it.
   */
  openGraph: {
    url: '.',
    siteName: 'OpenTools',
    locale: 'en_US',
    type: 'website',
    /**
     * The share card. `twitter.card` was already `summary_large_image`, which
     * reserves a full-width image slot, while no image was ever declared — so
     * every share on X, LinkedIn, Slack, Discord, Reddit and WhatsApp rendered
     * an empty one. Regenerate with `scripts/generate-og-image.py`; it reads
     * the dark theme tokens out of `app/globals.css` so the card cannot drift
     * away from the site it represents.
     */
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: 'OpenTools — your files never leave your browser.',
      },
    ],
  },
  /*
   * Same omission, same reason. X reads `twitter:title` first and does not
   * fall back to `og:title` once a card type is declared, so a generic pair
   * here would have kept all 1,335 pages generic on X alone even after the
   * Open Graph block was fixed. With neither field stated, the shim copies
   * `og:title` and `og:description` -- which are now the page's own.
   */
  twitter: {
    card: 'summary_large_image',
    images: ['/og.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION,
    other: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
      ? { 'msvalidate.01': process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION }
      : undefined,
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: ['/favicon.svg'],
  },
  manifest: '/site.webmanifest',
};

const rootJsonLd = {
  '@context': schemaContext,
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${siteOrigin}/#website`,
      url: siteOrigin,
      name: 'OpenTools',
      description:
        '100% in-browser, zero-upload private utilities for PDF, image, audio, video, text, developer, and structured data tasks.',
      publisher: {
        '@type': 'Organization',
        '@id': `${siteOrigin}/#organization`,
        name: 'OpenTools',
        url: siteOrigin,
      },
    },
    {
      '@type': 'SoftwareApplication',
      name: 'OpenTools Suite',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'All modern browsers (Chrome, Firefox, Safari, Edge)',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      featureList: [
        '100% In-Browser Execution',
        'Zero Server Uploads',
        'Zero Network Egress',
        'Hardware Speed Compute',
        'No Ads, Paywalls, or Mandatory Logins',
      ],
    },
  ],
};

const themeScript = `
  try {
    const saved = localStorage.getItem('tools-theme');
    const dark = saved === 'dark' || (!saved && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
  } catch (_) {}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="dns-prefetch" href={siteOrigin} />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icon-32.png" />
        <link
          rel="icon"
          type="image/png"
          sizes="192x192"
          href="/icon-192.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="512x512"
          href="/icon-512.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link rel="manifest" href="/site.webmanifest" />
        <link
          rel="search"
          type="application/opensearchdescription+xml"
          href="/opensearch.xml"
          title="OpenTools"
        />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(rootJsonLd) }}
        />
      </head>
      <body>
        {children}
        {/* Collects a file handed over by the smart dropzone. Renders nothing. */}
        <HandedOverFile />
      </body>
    </html>
  );
}
