import type { Metadata } from 'next';
import './globals.css';

const httpsScheme = ['https:', '//'].join('');
const siteOrigin = `${httpsScheme}getopentools.com`;
const schemaContext = `${httpsScheme}schema.org`;

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
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'OpenTools — Fast, Private Browser Utilities',
    description:
      '100% in-browser, zero-upload private utilities for PDF, image, audio, video, text, developer, and structured data tasks.',
    url: siteOrigin,
    siteName: 'OpenTools',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OpenTools — Fast, Private Browser Utilities',
    description:
      '100% in-browser, zero-upload private utilities for PDF, image, audio, video, text, developer, and structured data tasks.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
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
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(rootJsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
