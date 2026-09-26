import type { Metadata } from 'next';

import { LocaleHubPage } from '@/components/locale-hub-page';
import { LOCALE_CODES } from '@/lib/i18n/locales';
import { localizedHubMetadata } from '@/lib/i18n/routes';

/*
  The eight locale hubs: `/es`, `/pt`, `/fr`, `/de`, `/it`, `/ja`, `/ru`, `/id`.

  One file, eight prerendered pages. `dynamicParams = false` means any other
  first segment 404s here rather than rendering a hub for a language that does
  not exist -- and because a literal route segment beats a dynamic one, every
  existing top-level page (`/pdf`, `/about`, `/guides`, ...) is matched by its
  own folder and never reaches this file.
*/

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
  return localizedHubMetadata(locale);
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <LocaleHubPage localeCode={locale} />;
}
