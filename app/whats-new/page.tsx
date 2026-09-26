import type { Metadata } from 'next';
import { ArrowLeft, ArrowUpRight, Rss, Sparkles } from 'lucide-react';

import { WHATS_NEW } from '@/lib/seo/whats-new';

export const revalidate = 86400;

/*
  The only page on this site whose job is to give a returning visitor a reason
  to return *before* their next file problem.

  Two failure modes to avoid. The first is a developer changelog: version
  numbers, commit subjects, internal names — true, and useless to the person
  holding a file. The second is a marketing feed with nothing to click, which
  reads as noise within two visits. Every entry here therefore names a route,
  which also makes the page an internal-link surface aimed at pages worth
  crawling.

  Entries live in `lib/seo/whats-new.ts` because the feed renders from the same
  array. A page and a feed that can disagree will, and the disagreement is
  invisible: whoever reads the feed is not the person checking the page.
*/

const CANONICAL = ['https:', '//', 'getopentools.com', '/whats-new'].join('');

export const metadata: Metadata = {
  title: "What's new on OpenTools — recent tools and changes",
  description:
    'New tools and changes to the ones already here, newest first. Everything runs in your browser, so nothing here is a new thing to sign up for.',
  alternates: {
    canonical: CANONICAL,
    types: { 'application/rss+xml': `${CANONICAL}/feed.xml` },
  },
};

/** "26 September 2026" — long form, because a date is the one thing a reader scans for. */
function readableDate(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export default function WhatsNewPage() {
  /*
    Grouped by day so several things shipping on one date read as one moment
    rather than as repetition. The array is already newest-first and a test
    holds it that way, so this preserves order rather than sorting.
  */
  const days: { date: string; entries: typeof WHATS_NEW }[] = [];
  for (const entry of WHATS_NEW) {
    const last = days.at(-1);
    if (last?.date === entry.date) last.entries = [...last.entries, entry];
    else days.push({ date: entry.date, entries: [entry] });
  }

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-5 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto max-w-3xl">
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
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl border bg-muted sm:size-12">
              <Sparkles
                aria-hidden="true"
                className="size-5 text-foreground sm:size-6"
              />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                What&rsquo;s new
              </p>
              <h1 className="mt-0.5 text-2xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Recent changes
              </h1>
            </div>
          </div>

          <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            New tools, and changes to the ones already here. Newest first, and
            every entry links the page it is about, so nothing on this list is
            an announcement you cannot immediately go and use.
          </p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            There is no newsletter to join. A mailing list would need a server
            and a record of who reads what, which is the opposite of how the
            rest of this site works, so the{' '}
            <a
              href="/whats-new/feed.xml"
              className="focus-ring font-semibold text-foreground underline underline-offset-4"
            >
              feed
            </a>{' '}
            is the way to follow along — it tells us nothing about you.
          </p>
        </section>

        {days.map(({ date, entries }) => (
          <section
            key={date}
            className="mt-4 rounded-2xl border bg-card p-5 sm:mt-6 sm:p-8"
          >
            <h2 className="text-lg font-semibold tracking-[-0.02em] sm:text-2xl">
              <time dateTime={date}>{readableDate(date)}</time>
            </h2>
            <ul className="mt-4 divide-y rounded-xl border bg-muted/40">
              {entries.map((entry) => (
                <li
                  key={`${entry.date}-${entry.href}`}
                  className="p-3.5 sm:p-4"
                >
                  <p className="text-sm font-semibold sm:text-[0.95rem]">
                    {entry.title}
                  </p>
                  <p className="mt-1.5 text-sm leading-6 text-muted-foreground sm:text-[0.95rem]">
                    {entry.detail}
                  </p>
                  <a
                    href={entry.href}
                    className="focus-ring mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-foreground underline underline-offset-4"
                  >
                    {entry.hrefLabel}
                    <ArrowUpRight aria-hidden="true" className="size-3.5" />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section className="mt-4 rounded-2xl border bg-card p-5 sm:mt-6 sm:p-8">
          <div className="flex items-center gap-2.5">
            <Rss aria-hidden="true" className="size-5 shrink-0" />
            <h2 className="text-lg font-semibold tracking-[-0.02em] sm:text-2xl">
              Follow along
            </h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            Paste{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-[0.85em]">
              getopentools.com/whats-new/feed.xml
            </code>{' '}
            into any feed reader. Everything on this list runs in your browser,
            free, with no account — which is also why there is nothing here to
            upgrade to.
          </p>
        </section>
      </div>
    </main>
  );
}
