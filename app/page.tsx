import type { Metadata } from 'next';

import { HomeWorkspace } from '@/components/home-workspace';

export const revalidate = 86400;

/*
  The title states no brand of its own. `app/layout.tsx` appends
  ` · OpenTools` to every page title, so `OpenTools — 100% Free & Private
  Browser Utilities` was served as `OpenTools — 100% Free & Private Browser
  Utilities · OpenTools` -- the brand twice, in a tab and in a search result,
  and now in the share card too, since `og:title` is filled from this.

  Brand-first is the convention for a home page, and it is the wrong trade
  here: Search Console shows this site ranking on two query clusters with no
  brand demand at all, so the leading eleven characters were spent on a word
  nobody searches. The value words go first and the suffix carries the brand
  once.
*/
export const metadata: Metadata = {
  title: '100% Free & Private Browser Utilities',
  description:
    'Instant in-browser utilities for PDF, image, audio, video, text, developer, and data tasks. Zero server uploads, zero accounts, zero paywalls.',
  alternates: {
    canonical: '/',
  },
};

export default function Home() {
  return <HomeWorkspace />;
}
