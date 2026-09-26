import type { Metadata } from 'next';
import { ArrowLeft, Link2 } from 'lucide-react';

import { AskLinkCreator } from '@/components/ask-link-creator';

/**
 * Ask Link — the sender's page.
 *
 * WHY THIS ONE IS INDEXABLE AND `/ask/<request>` IS NOT. This page is a product
 * page: it describes something anybody can use and it holds no request. The
 * pages under it are private messages between two people — a college office and
 * a candidate — and a search result leading a stranger into one of those would
 * be a dead end for them and a leak of nothing useful to anyone. So this one is
 * `index, follow` and each recipient page says `noindex`.
 *
 * NOT YET IN `sitemap.xml`, and that is a deliberate hold rather than an
 * oversight. Adding a route means adding a key to
 * `lib/seo/sitemap-lastmod.generated.ts`, and regenerating that file on this
 * machine rewrote 667 unrelated routes' dates — partly a `+00:00` versus `Z`
 * rendering difference, partly commit dates that differ between lanes. That
 * churn belongs in its own commit, not in this feature's. Meanwhile the page is
 * reachable and crawlable: `components/ask-link-offer.tsx` links to it from
 * `/image/optimize`, `/image/exact-size` and `/pdf/compress`, and every
 * recipient page links to it too.
 *
 * It is prerendered like every other route. The creator is a client component
 * because it is a form, but it imports no engine: building a URL needs none, and
 * the person sending a request is not the one doing the work.
 */
export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/ask' },
  title: 'Ask someone for a file — send one link with the settings',
  description:
    'Say what file you need, copy one link, send it. Whoever opens it prepares the file on their own device. The link carries the settings, never a file.',
};

export default function AskPage() {
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

        <header className="rounded-2xl border bg-card p-5 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl border bg-muted sm:size-12">
              <Link2
                aria-hidden="true"
                className="size-5 text-foreground sm:size-6"
              />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Ask Link
              </p>
              <h1 className="mt-0.5 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Ask someone for a file
              </h1>
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            Instead of typing out the specification every time, say what you
            need once and send one link. Whoever opens it sees the requirement
            in plain words, chooses the file on their own device, and the work
            happens in their browser. They send you the finished file
            themselves.
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            The link carries the settings and nothing else. No file passes
            through this site in either direction, there is no account on either
            side, and nobody is told who opened the link.
          </p>
        </header>

        <div className="mt-5">
          <AskLinkCreator />
        </div>

        <section className="mt-5 rounded-2xl border bg-card p-5 sm:p-8">
          <h2 className="text-lg font-semibold tracking-[-0.02em]">
            How it works
          </h2>
          <ol className="mt-4 grid gap-4 text-sm leading-6 sm:grid-cols-3">
            <li>
              <span className="font-semibold">1. Say what you need.</span>
              <span className="mt-1 block text-muted-foreground">
                Pick the kind of file and the details — a format, a size in
                pixels, a limit in KB.
              </span>
            </li>
            <li>
              <span className="font-semibold">2. Send the link.</span>
              <span className="mt-1 block text-muted-foreground">
                Copy it into a message, an email or a form. It works for one
                person or a hundred.
              </span>
            </li>
            <li>
              <span className="font-semibold">3. They prepare the file.</span>
              <span className="mt-1 block text-muted-foreground">
                On their own device, in their own browser, and they send you the
                result themselves.
              </span>
            </li>
          </ol>
          <h3 className="mt-6 text-sm font-semibold">
            What the link cannot contain
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            A file, part of a file, a file name, a message you typed, an email
            address or a phone number. The settings are the only thing that can
            be written into one, which is why the same link can be sent to a
            hundred people without any of them appearing in it.
          </p>
        </section>
      </div>
    </main>
  );
}
