import type { Metadata } from 'next';
import { AudioLoudnessTool } from '@/components/audio-loudness-tool';
import { relatedToolsFor } from '@/lib/seo/related-tools';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Audio Loudness Check — LUFS & True Peak',
  description:
    'Measure ITU-R BS.1770-4 integrated LUFS, true peak (dBTP), loudness range (LRA), and noise floor against Spotify, Apple Music, and ACX audiobook standards.',
  alternates: {
    canonical: '/audio/loudness',
  },
};

export default function Page() {
  const related = relatedToolsFor('/audio/loudness');
  return <AudioLoudnessTool relatedTools={related} />;
}
