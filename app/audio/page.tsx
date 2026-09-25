import type { Metadata } from 'next';

import { CategoryHubPage } from '@/components/category-hub-page';
import { categoryHubMetadata } from '@/lib/seo/category-hub-metadata';

/*
  The category hub for /audio. Every line of it is derived: see
  `lib/seo/category-hubs.ts` for why these pages exist and
  `components/category-hub-page.tsx` for what they render.
*/

const ROUTE = '/audio';

export const revalidate = 86400;

export const metadata: Metadata = categoryHubMetadata(ROUTE);

export default function Page() {
  return <CategoryHubPage route={ROUTE} />;
}
