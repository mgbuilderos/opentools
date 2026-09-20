'use client';

import { SchemaWorkbenchTool } from '@/components/schema-workbench-tool';
import {
  runSubtitleOperation,
  SUBTITLE_OPERATIONS,
} from '@/lib/tools/subtitle-workbench';

/*
  The two optional props are what let this workbench also serve as one tool on
  its own page: `app/<category>/[tool]/page.tsx` renders it once per operation
  with that operation's id and the category prefix. Unset, every behaviour is
  exactly what it was, and the workbench URL keeps working for anyone holding
  it.
*/
export function SubtitleWorkbenchTool({
  initialOperationId = 'subtitle-to-srt',
  routedBasePath,
}: {
  initialOperationId?: string;
  routedBasePath?: string;
} = {}) {
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
      initialOperationId={initialOperationId}
      routedBasePath={routedBasePath}
      run={runSubtitleOperation}
    />
  );
}
