'use client';

import { createContext, useContext, type ReactNode } from 'react';

import type { ToolPageDepth } from '@/lib/seo/tool-page-depth-types';

/*
  How a page's depth content reaches the bottom of the app shell.

  A tool page renders exactly one thing -- `<PdfMergeTool />`, `<ImageOptimizeTool />`
  -- and that component owns the `AppShell` it sits in. So the page knows its
  route and its content, and the only element that can place something under
  the tool is twenty components deep. Threading a prop through all twenty is
  twenty chances to get it wrong in a file that is otherwise about merging
  PDFs; `RelatedTools` is already threaded that way through twenty-two of them
  and needed twenty-two edits.

  Context makes it one edit. The page wraps the tool, `AppShell` reads the
  value and renders `PageDepthContent` at the end of its `<main>`. A page that
  provides nothing gets `null` and nothing renders, which is every page on the
  site that is not one of these 32.

  The value is plain data (strings and arrays of strings) so a server component
  can hand it straight across the client boundary.
*/

const PageDepthContext = createContext<ToolPageDepth | null>(null);

export function PageDepthProvider({
  content,
  children,
}: {
  content: ToolPageDepth;
  children: ReactNode;
}) {
  return (
    <PageDepthContext.Provider value={content}>
      {children}
    </PageDepthContext.Provider>
  );
}

export function usePageDepth(): ToolPageDepth | null {
  return useContext(PageDepthContext);
}
