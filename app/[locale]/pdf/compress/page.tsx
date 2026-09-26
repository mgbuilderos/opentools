import type { Metadata } from 'next';

import { PdfCompressTool } from '@/components/pdf-compress-tool';
import { LocaleEditionProvider } from '@/components/locale-edition-provider';
import { PageDepthProvider } from '@/components/page-depth-provider';
import { practiceBrief } from '@/lib/practice-briefs';
import { LOCALE_COPY } from '@/lib/i18n/copy';
import { LOCALE_CODES } from '@/lib/i18n/locales';
import {
  localizedToolMetadata,
  requireLocalizedDepth,
} from '@/lib/i18n/routes';

/*
  The localised editions of `/pdf/compress`, one static page per locale.

  ONE FILE, NOT ONE PER LANGUAGE. `generateStaticParams` returns the eight
  locale codes, so this single route file produces `/es/pdf/compress`,
  `/ja/pdf/compress` and the other six, each prerendered with its own title,
  description, self-canonical and prose. The tool component is the same one
  the English page renders -- there is no second implementation to keep in
  step, and nothing about the tool itself is translated because nothing about
  it is English.

  `dynamicParams = false`: a prefix that is not a published locale 404s at the
  edge instead of rendering a fallback in the wrong language. A literal
  segment beats a dynamic one in the router, so the English `/pdf/compress` is
  untouched by this file.

  NO `revalidate`, deliberately, following `app/convert/[pair]/page.tsx`:
  these are prerendered to static assets, which costs nothing, while putting
  them in the Cloudflare KV page cache would spend the free-plan write
  allowance every deploy. See docs/CACHE_BUDGET.md.
*/

const ROUTE = '/pdf/compress';

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALE_CODES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return localizedToolMetadata(locale, ROUTE);
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const hub = LOCALE_COPY[locale]?.hub;
  if (!hub) throw new Error(`No hub copy is registered for "${locale}"`);
  return (
    <LocaleEditionProvider
      edition={{
        localeCode: locale,
        route: ROUTE,
        label: hub.switcherLabel,
        englishLabel: hub.englishLinkLabel,
        stepsHeading: hub.stepsHeading,
        faqsHeading: hub.faqsHeading,
      }}
    >
      <PageDepthProvider content={requireLocalizedDepth(locale, ROUTE)}>
        <PdfCompressTool
          brief={practiceBrief('filing-bundle-under-portal-ceiling')}
        />
      </PageDepthProvider>
    </LocaleEditionProvider>
  );
}
