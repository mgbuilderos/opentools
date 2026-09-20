import type { Metadata } from 'next';
import { ArrowLeft, Ban, Compass, Cpu, Scale } from 'lucide-react';
import { LIVE_TOOL_CATALOG, getLiveCategories } from '@/lib/seo/live-tools';

export const revalidate = 86400;

/*
  The page a reader reaches after asking "who is behind this, and what is the
  catch". Two failure modes to avoid.

  The first is a mission statement: adjectives about empowerment, no facts. The
  second is overclaiming the team. This is a small independent project, and
  saying so is a feature — it explains both why there are no ads and why
  support matters.

  Counts come from the live catalogue at build time rather than being typed in,
  because a hand-written tool count is wrong the week after it is written, and
  a wrong number here undermines the pages that carry careful ones.
*/

const REPO = ['https:', '//', 'github.com/mgbuilderos/opentools'].join('');
const CANONICAL = ['https:', '//', 'getopentools.com', '/about'].join('');

export const metadata: Metadata = {
  title: 'About OpenTools — why it exists and how it is paid for',
  description:
    'An independent, MIT-licensed collection of everyday file and text tools that run inside your browser. Why it was built, how it stays free, and the things it will never do.',
  alternates: { canonical: CANONICAL },
};

const NEVER = [
  [
    'No upload of your work',
    'Tools run in the tab. A version of this site that sent your file somewhere would not be a new feature; it would be a different product.',
  ],
  [
    'No account, ever',
    'Nothing here needs to know who you are, so nothing here asks.',
  ],
  [
    'No advertising, tracking or session replay',
    'Not as a setting you can switch off — as code that is not present, and a test that fails if it appears.',
  ],
  [
    'No paid tier, and no gated result',
    'Support is voluntary and changes nothing about what you can do. A result is never held back.',
  ],
  [
    'No watermark or branding in your file',
    'What comes out is your document, not an advertisement for this site.',
  ],
] as const;

export default function AboutPage() {
  const categories = getLiveCategories().length;

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
              <Compass
                aria-hidden="true"
                className="size-5 text-foreground sm:size-6"
              />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                About
              </p>
              <h1 className="mt-0.5 text-2xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Why this exists
              </h1>
            </div>
          </div>

          <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            Nearly every free tool for a small file job asks you to upload the
            file first. People do it dozens of times a day with tax returns,
            passports, medical letters, signed contracts, salary slips and
            client work — handing a private document to a server they know
            nothing about, to perform a task their own computer could have done
            in a second.
          </p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            The upload was never technically necessary. Browsers have been able
            to do this work for years, using the same capabilities that run
            video calls and photo editors. OpenTools is{' '}
            {LIVE_TOOL_CATALOG.length} everyday tools across {categories}{' '}
            categories, built on that observation and nothing cleverer: the work
            happens in the tab you already have open, so there is no server to
            trust, no queue to wait in, and nothing to delete afterwards.
          </p>
        </section>

        <section className="mt-4 rounded-2xl border bg-card p-5 sm:mt-6 sm:p-8">
          <div className="flex items-center gap-2.5">
            <Cpu aria-hidden="true" className="size-5 shrink-0" />
            <h2 className="text-lg font-semibold tracking-[-0.02em] sm:text-2xl">
              How it actually works
            </h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            Your file is read into the page&rsquo;s memory and processed there.
            Document work runs in a background worker so the page stays
            responsive; image work uses the browser&rsquo;s own drawing engine;
            the background remover runs a compact AI model compiled to
            WebAssembly; audio and video trims copy the existing compressed
            samples rather than re-encoding them, which is why they finish
            almost instantly and lose no quality. Checksums use the
            browser&rsquo;s built-in cryptography.
          </p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            Two consequences follow, and both are the point. Your document never
            travels, so there is nothing to intercept or retain. And there is no
            round trip, so the work finishes at the speed of your own machine
            rather than the speed of someone&rsquo;s queue. The measured
            evidence for the first is on the{' '}
            <a
              href="/proof"
              className="focus-ring font-semibold text-foreground underline underline-offset-4"
            >
              proof page
            </a>
            ; the enforcement behind it is on the{' '}
            <a
              href="/security"
              className="focus-ring font-semibold text-foreground underline underline-offset-4"
            >
              security page
            </a>
            .
          </p>
        </section>

        <section className="mt-4 rounded-2xl border bg-card p-5 sm:mt-6 sm:p-8">
          <div className="flex items-center gap-2.5">
            <Ban aria-hidden="true" className="size-5 shrink-0" />
            <h2 className="text-lg font-semibold tracking-[-0.02em] sm:text-2xl">
              Things this site will not do
            </h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            Stated here so you can hold the project to them, and so that
            breaking one is visibly a broken promise rather than a quiet product
            update.
          </p>
          <ul className="mt-4 divide-y rounded-xl border bg-muted/40">
            {NEVER.map(([title, detail]) => (
              <li key={title} className="p-3.5 sm:p-4">
                <p className="text-sm font-semibold sm:text-[0.95rem]">
                  {title}
                </p>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground sm:text-[0.95rem]">
                  {detail}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-4 rounded-2xl border bg-card p-5 sm:mt-6 sm:p-8">
          <div className="flex items-center gap-2.5">
            <Scale aria-hidden="true" className="size-5 shrink-0" />
            <h2 className="text-lg font-semibold tracking-[-0.02em] sm:text-2xl">
              Who runs it, and how it is paid for
            </h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            This is a small independent project, not a company. There are no
            investors to satisfy and no growth target that would one day make
            advertising or an upload step look reasonable. It is not free
            because a paid tier subsidises it; it is free because it costs
            little to run when the visitor&rsquo;s own computer does the work.
          </p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            What it does cost — a domain and edge hosting — is covered by
            voluntary support from people who found it useful. Nothing is
            withheld from anyone who does not contribute, and the{' '}
            <a
              href="/support"
              className="focus-ring font-semibold text-foreground underline underline-offset-4"
            >
              support page
            </a>{' '}
            is deliberately kept apart from the tools: it never receives a file
            name, a job or a result.
          </p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            The entire site is open source under the MIT licence. You can read
            every line, run it on your own machine, host it inside your own
            network, fork it, or take a piece of it for something else. If this
            project ever stops being maintained, nothing you rely on disappears
            with it &mdash; which is the practical reason the licence matters
            more than any promise on this page.
          </p>
          <p className="mt-4">
            <a
              href={REPO}
              rel="noreferrer noopener"
              className="focus-ring inline-flex min-h-11 items-center rounded-lg border px-4 text-sm font-semibold"
            >
              Read the source
            </a>
          </p>
        </section>

        <section className="mt-4 rounded-2xl border bg-card p-5 sm:mt-6 sm:p-8">
          <h2 className="text-lg font-semibold tracking-[-0.02em] sm:text-2xl">
            How this site is built
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            A rule the project holds to, because breaking it is the ordinary way
            a site like this becomes untrustworthy:{' '}
            <strong>no claim ships unless code or a test proves it.</strong>{' '}
            Tool counts come from the catalogue rather than from memory. A tool
            is listed only when the page behind the link genuinely runs it.
            Speed and privacy statements are measured, dated and tied to the
            build they were measured on, and when a claim cannot be supported it
            is removed rather than rephrased &mdash; which is how several
            confident-sounding lines came off this site rather than onto it.
          </p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            If you find something on any page here that is not true, that is
            worth reporting, and the{' '}
            <a
              href="/security"
              className="focus-ring font-semibold text-foreground underline underline-offset-4"
            >
              security page
            </a>{' '}
            explains where to send it.
          </p>
        </section>
      </div>
    </main>
  );
}
