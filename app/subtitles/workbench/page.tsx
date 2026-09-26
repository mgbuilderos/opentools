import type { Metadata } from 'next';

import { SubtitleWorkbenchTool } from '@/components/subtitle-workbench-tool';
import { ToolJsonLd } from '@/components/tool-json-ld';

export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/subtitles/workbench' },
  title: 'Subtitle Converter, Sync and Caption Checker',
  description:
    'Convert SRT, WebVTT, SBV, LRC and SubStation subtitles, fix timing that drifts, join or trim files and check captions — in your browser, with no upload.',
};

export default function Page() {
  return (
    <>
      <ToolJsonLd route="/subtitles/workbench" meta={metadata} />
      <SubtitleWorkbenchTool />
    </>
  );
}
