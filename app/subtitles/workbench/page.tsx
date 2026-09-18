import type { Metadata } from 'next';

import { SubtitleWorkbenchTool } from '@/components/subtitle-workbench-tool';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Subtitle Converter, Sync and Caption Checker',
  description:
    'Convert SRT, WebVTT, SBV, LRC and SubStation subtitles, fix timing that drifts, join or trim files and check captions — in your browser, with no upload.',
};

export default function Page() {
  return <SubtitleWorkbenchTool />;
}
