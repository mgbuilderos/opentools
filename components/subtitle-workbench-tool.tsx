'use client';

import { SchemaWorkbenchTool } from '@/components/schema-workbench-tool';
import {
  runSubtitleOperation,
  SUBTITLE_OPERATIONS,
} from '@/lib/tools/subtitle-workbench';

export function SubtitleWorkbenchTool() {
  return (
    <SchemaWorkbenchTool
      currentToolId="subtitle-workbench"
      eyebrow="Subtitles"
      title="Subtitle workbench"
      introduction="Convert between subtitle formats, fix timing that runs ahead or drifts, join and trim files, and check captions against the usual readability limits — all on the text of the file, in this tab."
      selectorLabel="Subtitle tool"
      actionLabel="Run"
      methodLabel="Local text processing"
      operations={SUBTITLE_OPERATIONS}
      initialOperationId="subtitle-to-srt"
      run={runSubtitleOperation}
    />
  );
}
