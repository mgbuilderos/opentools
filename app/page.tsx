import type { Metadata } from 'next';

import { HomeWorkspace } from '@/components/home-workspace';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'OpenTools — 100% Free & Private Browser Utilities',
  description:
    'Instant in-browser utilities for PDF, image, audio, video, text, developer, and data tasks. Zero server uploads, zero accounts, zero paywalls.',
  alternates: {
    canonical: '/',
  },
};

export default function Home() {
  return <HomeWorkspace />;
}
