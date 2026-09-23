import type { Metadata } from 'next';

import { VideoTrimTool } from '@/components/video-trim-tool';

export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/video/trim' },
  title: 'Trim a Video Without Re-encoding — MP4 and MOV',
  description:
    'Cut, mute or extract the audio from an MP4 or MOV in your browser. The frames are copied rather than re-encoded, so the clip keeps the original quality.',
};

export default function Page() {
  return <VideoTrimTool />;
}
