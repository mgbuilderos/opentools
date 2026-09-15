import type { Metadata } from 'next';

import { AudioTranscribeTool } from '@/components/audio-transcribe-tool';

export const metadata: Metadata = {
  title: 'AI Audio Transcriber',
  description: 'Privately transcribe speech to text directly in your browser.',
};

export default function Page() {
  return <AudioTranscribeTool />;
}
