import type { ReactNode } from 'react';
import type { EmbeddableTool } from '@/lib/embed/embeddable-tools';

const CANONICAL_ORIGIN = ['https:', '//', 'getopentools.com'].join('');

/**
 * The chrome every embed carries: a name at the top, and an attribution link
 * at the bottom that the embedding site cannot remove.
 *
 * "Cannot remove" is a structural claim, not a licence term we hope is
 * honoured. An embed is a cross-origin iframe: the page around it can size the
 * frame and nothing else. It cannot inject CSS, cannot reach the DOM, cannot
 * read what the visitor typed and cannot delete this link. That is why the
 * programme ships as an iframe and not as the `<script>` widget the original
 * proposal described -- a script runs in the embedder's document, where every
 * one of those protections is theirs to switch off. Business rule 33, amended
 * by the owner 2026-09-24.
 *
 * The header is not branding for its own sake either. A tool framed inside
 * somebody else's page is the textbook setup for UI redressing, and the
 * honest mitigation for a visitor is being able to see, without leaving the
 * page, whose tool this is and where it really lives. Both links open in a new
 * tab: a frame that navigates its own parent is the one behaviour an embedder
 * would be right to object to.
 */
export function EmbedFrame({
  tool,
  children,
}: {
  tool: EmbeddableTool;
  children: ReactNode;
}) {
  const canonicalUrl = `${CANONICAL_ORIGIN}${tool.canonicalPath}`;
  return (
    <div
      data-embed={tool.slug}
      className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)]"
    >
      <header className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-2.5">
        <span className="text-sm font-semibold">{tool.name}</span>
        <span className="text-xs text-[var(--muted-foreground)]">
          Runs in your browser · nothing uploaded
        </span>
      </header>

      <main className="flex-1 p-4">{children}</main>

      {/*
        The attribution. `rel` carries no `nofollow` on purpose -- an ordinary
        followed link to the canonical tool page is the entire return on giving
        the tool away, and the reason business rule 33 was amended to allow a
        non-removable one. `noopener` is still correct and costs nothing.
      */}
      <footer className="border-t border-[var(--border)] px-4 py-2.5 text-xs text-[var(--muted-foreground)]">
        <a
          href={canonicalUrl}
          target="_blank"
          rel="noopener"
          className="font-medium underline underline-offset-2"
        >
          {tool.name} by OpenTools
        </a>
        {' — free, open source, and your data never leaves this page.'}
      </footer>
    </div>
  );
}
