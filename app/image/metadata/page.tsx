import type { Metadata } from 'next';

import { MetadataTool } from '@/components/metadata-tool';

export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/image/metadata' },
  title: 'Photo Metadata Viewer & Stripper',
  description:
    'Inspect EXIF tags, GPS location, camera model and shot settings in JPEG, PNG, and WebP photos, or strip metadata before sharing.',
};

export default function Page() {
  return <MetadataTool />;
}
