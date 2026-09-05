import type { Metadata } from 'next';

import { HomeWorkspace } from '@/components/home-workspace';

export const metadata: Metadata = {
  title: 'Tools — Fast, private browser utilities',
  description:
    'Find fast browser utilities for PDF and text tasks without an account or output gate.',
};

export default function Home() {
  return <HomeWorkspace />;
}
