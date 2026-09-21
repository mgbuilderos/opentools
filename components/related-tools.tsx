import { ArrowRight } from 'lucide-react';

import type { RelatedTool } from '@/lib/seo/related-tools';

/*
  The way off a tool page.

  Every one of these pages used to end at its own footer. On 2026-09-19, forty
  distinct addresses opened a page on this site and every one of them read
  exactly one; of 220 real-browser visitors that day, 28 opened a second page.
  Then 626 tool pages shipped, each with its own URL — 626 more places with no
  onward step, and 626 leaves for a crawler that reads links to work out what a
  site is about.

  The links come from `lib/seo/related-tools.ts` and are computed during the
  build, so they are in the served HTML rather than assembled after hydration:
  a crawler that runs no JavaScript still sees the connections, which is the
  half of the problem JavaScript cannot fix.

  Plain `<a>`, deliberately. `next/link` is banned by
  `lib/tools/local-source-policy.test.ts` — a client-side route change here
  would fetch the next page's payload instead of loading the page, and these
  tools are static documents that should simply be documents.
*/
export function RelatedTools({ tools }: { tools: readonly RelatedTool[] }) {
  if (tools.length === 0) return null;

  return (
    <section
      aria-labelledby="related-tools-heading"
      className="mt-7 border-t pt-6"
    >
      <h2
        id="related-tools-heading"
        className="text-base font-semibold tracking-[-0.02em]"
      >
        Next in this job
      </h2>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        Chosen from where these tools sit in the catalogue — the same workbench,
        the same category, the same words. Nothing here measures what you or
        anyone else opened.
      </p>

      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {tools.map((tool) => (
          <li key={tool.href}>
            <a
              href={tool.href}
              data-related-tool={tool.href}
              className="focus-ring group flex h-full items-start justify-between gap-3 rounded-xl border bg-card p-4 transition-colors duration-[var(--motion-standard)] ease-[var(--motion-ease)] hover:border-foreground/30 hover:bg-muted/45"
            >
              <span className="min-w-0">
                <span className="block text-sm font-semibold tracking-[-0.01em] group-hover:underline">
                  {tool.name}
                </span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  {tool.description}
                </span>
                <span className="mt-2 block text-[11px] font-medium text-muted-foreground">
                  {tool.relationship}
                </span>
              </span>
              <ArrowRight
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform duration-[var(--motion-standard)] ease-[var(--motion-ease)] group-hover:translate-x-1 motion-reduce:transform-none"
              />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
