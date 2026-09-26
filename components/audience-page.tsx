import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';

import { SUPPORT_CONFIG, canAcceptSupport } from '@/lib/support-config';

/**
 * The frame these pages share. Only the frame.
 *
 * The prose, the tool list and the caveats are written per page and passed in;
 * nothing here generates a sentence. That division is the point — see
 * `lib/seo/audience-pages.ts` for why a template that could produce two of
 * these pages from the same blanks would defeat the reason they exist.
 */

export interface AudienceTool {
  href: string;
  name: string;
  /** Why this profession reaches for it, not what the operation does. */
  why: string;
}

export function AudiencePage({
  eyebrow,
  heading,
  standfirst,
  children,
  tools,
  toolsHeading = 'What to use',
  limits,
}: {
  eyebrow: string;
  heading: string;
  standfirst: string;
  children: ReactNode;
  tools: readonly AudienceTool[];
  toolsHeading?: string;
  /** What this will not do. A professional reads this before trusting it. */
  limits: readonly string[];
}) {
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {eyebrow}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.04em] sm:text-4xl">
            {heading}
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            {standfirst}
          </p>
        </section>

        <section className="mt-4 space-y-4 rounded-2xl border bg-card p-5 text-sm leading-6 text-muted-foreground sm:mt-6 sm:p-8 sm:text-base sm:leading-7">
          {children}
        </section>

        <section className="mt-4 rounded-2xl border bg-card p-5 sm:mt-6 sm:p-8">
          <h2 className="text-lg font-semibold tracking-[-0.02em] sm:text-2xl">
            {toolsHeading}
          </h2>
          <ul className="mt-4 space-y-3">
            {tools.map((tool) => (
              <li key={tool.href}>
                <a
                  href={tool.href}
                  className="focus-ring block rounded-xl border p-4 transition-all duration-[var(--motion-standard)] ease-[var(--motion-ease)] hover:border-foreground/30"
                >
                  <span className="block font-semibold">{tool.name}</span>
                  <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                    {tool.why}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-4 rounded-2xl border bg-card p-5 sm:mt-6 sm:p-8">
          <h2 className="text-lg font-semibold tracking-[-0.02em] sm:text-2xl">
            What this will not do
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            Worth reading before you put a client&rsquo;s file through it.
          </p>
          <ul className="mt-4 space-y-2 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            {limits.map((limit) => (
              <li key={limit}>— {limit}</li>
            ))}
          </ul>
        </section>

        <section className="mt-4 rounded-2xl border bg-card p-5 sm:mt-6 sm:p-8">
          <h2 className="text-lg font-semibold tracking-[-0.02em] sm:text-2xl">
            Check it rather than trust it
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            Turn off your wifi and use any tool here. If the work still happens,
            the file is not going anywhere — that is a proof you can perform in
            three seconds, and it beats anything we could write. The longer
            version, with the protocol and the result, is on{' '}
            <a
              className="focus-ring font-medium text-foreground underline underline-offset-4"
              href="/proof"
            >
              the proof page
            </a>
            .
          </p>
          {canAcceptSupport() ? (
            <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
              Everything here is free, MIT-licensed and has no account, quota or
              watermark. It is maintained by one person, unpaid. If it saves you
              an afternoon,{' '}
              <a
                className="focus-ring font-medium text-foreground underline underline-offset-4"
                href={SUPPORT_CONFIG.buyMeACoffeeUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                you can support the work
              </a>
              .
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
