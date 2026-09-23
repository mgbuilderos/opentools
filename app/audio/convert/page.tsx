import type { Metadata } from 'next';

import { AudioConvertTool } from '@/components/audio-convert-tool';

export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/audio/convert' },
  title: 'Convert Audio to WAV — M4A, FLAC, OGG and AIFF',
  description:
    'Convert M4A, FLAC, OGG, AIFF or MP3 to WAV using the decoders your browser already has, with trimming, fades and peak levelling.',
};

export default function Page() {
  return <AudioConvertTool />;
}
