import { ArrowLeft } from 'lucide-react';

import { CATEGORY_LINKS, categoryHub } from '@/lib/seo/category-hubs';
import { toolPagesForPrefix } from '@/lib/seo/related-tools';

/*
  One component for all 21 category hubs.

  A server component with no `'use client'` on purpose: the whole point of
  these pages is that the links are in the prerendered HTML, so a crawler
  reading the homepage reaches every tool in two hops. The homepage's category
  switcher renders its cards from client state, which is why it could never do
  this job — see the note at the top of `lib/seo/category-hubs.ts`.

  Nothing about the list is written here. The tools come from
  `hubToolPages`, which reads the same link graph `relatedToolsFor` reads, so
  this page cannot drift from what the build actually ships.
*/

export function CategoryHubPage({ route }: { route: string }) {
  const hub = categoryHub(route);
  // Unreachable from a real page: every caller is an `app/<prefix>/page.tsx`
  // whose path is in `CATEGORY_HUBS`, and `category-hubs.test.ts` checks that
  // both directions still match. Narrowed rather than asserted so a typo in a
  // new hub folder is a blank page and not a crash on every request.
  if (!hub) return null;

  /*
    Read from the link graph, never written down: `toolPagesForPrefix` reads the
    same `collectToolPages` that every tool page's "related tools" block reads,
    with the withheld routes and the workbench landings already removed. Add a
    tool to a workbench and it appears here on the next build with no edit to
    any file. `category-hubs.test.ts` asserts the hubs between them link every
    linkable route outside `/convert`.
  */
  const tools = toolPagesForPrefix(route);
  const others = CATEGORY_LINKS.filter((other) => other.route !== route);

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-5 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <nav className="mb-3 sm:mb-6">
          <a
            href="/"
            className="focus-ring inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to all tools
          </a>
        </nav>

        <section className="rounded-2xl border bg-card p-5 sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {hub.name}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.04em] sm:text-4xl">
            {hub.title}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            {hub.description}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            {tools.length} tools, every one of them running in this tab. No
            upload, no account, no file leaving your device.
          </p>

          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {tools.map((tool) => (
              <li key={tool.href}>
                <a
                  href={tool.href}
                  className="focus-ring block h-full rounded-xl border bg-background p-4 hover:border-foreground/30"
                >
                  <span className="block text-sm font-semibold">
                    {tool.name}
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                    {tool.description}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-6 rounded-2xl border bg-card p-5 sm:p-8">
          <h2 className="text-lg font-semibold tracking-[-0.02em]">
            Other categories
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {others.map((other) => (
              <li key={other.route}>
                <a
                  href={other.route}
                  className="focus-ring inline-flex rounded-lg border bg-background px-3 py-1.5 text-sm font-medium hover:border-foreground/30"
                >
                  {other.name}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
