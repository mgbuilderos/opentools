/* oxlint-disable jsx-a11y/anchor-has-content, jsx-a11y/control-has-associated-label, jsx-a11y/anchor-is-valid, react/no-unescaped-entities */
import type { Metadata } from 'next';
import { ArrowLeft, HeartHandshake, ShieldCheck } from 'lucide-react';
import { SupportDualView } from '@/components/support-dual-view';

export const metadata: Metadata = {
  title: 'Support OpenTools — 100% Free & Local Utilities',
  description:
    'Support independent development of privacy-first, zero-egress browser utilities.',
};

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-muted/30 px-4 py-5 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <nav className="mb-3 sm:mb-6">
          <a
            href="/"
            className="focus-ring inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to all tools
          </a>
        </nav>

        {/*
          Header, deliberately short.

          It used to carry two paragraphs — 76 words — before the first payment
          control. Measured at 375px that pushed the pay button to y=1805 on an
          812px screen: two and a bit screens of scrolling to give money on a
          page whose only job is to make that easy. The prose was not wrong, so
          it was moved below `SupportDualView` rather than deleted.
        */}
        <section className="rounded-2xl border bg-card p-5 sm:p-8 mb-4 sm:mb-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl border bg-muted sm:size-12">
              <HeartHandshake
                aria-hidden="true"
                className="size-5 text-foreground sm:size-6"
              />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Independent &amp; open source
              </p>
              <h1 className="mt-0.5 text-2xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Keep these tools free 🙌
              </h1>
            </div>
          </div>

          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:mt-4 sm:text-base sm:leading-7">
            No ads, no signup, no trackers. 🔒 Chip in only if a tool here saved
            you time. 💚
          </p>
        </section>

        {/* UPI (India) and Buy Me a Coffee (international) take money today;
            GitHub Sponsors is shown as pending and takes none. */}
        <section className="mb-4 sm:mb-6">
          <SupportDualView />
        </section>

        {/* The long version, now that the options are out of its way. */}
        <section className="rounded-xl border bg-card p-5 text-sm leading-6 text-muted-foreground sm:p-6">
          <h2 className="text-base font-semibold text-foreground">
            Why these tools are free
          </h2>
          <p className="mt-2">
            There are no ads, no third-party trackers, no paywalls and no
            corporate investors. Every tool runs directly inside your browser
            tab on your own device, using JavaScript and Web Workers, and
            WebAssembly for a few tools that need a local model. Your files and
            inputs never touch a server.
          </p>
          <p className="mt-2">
            Support keeps the domain, the hosting and the time to build the next
            tool. It is the only thing paying for any of it.
          </p>
        </section>

        {/* Privacy Boundary Guarantee */}
        <footer className="mt-4 rounded-xl border bg-muted/40 p-4 text-xs leading-6 text-muted-foreground sm:p-5">
          <p className="flex items-center gap-2 font-semibold text-foreground">
            <ShieldCheck aria-hidden="true" className="size-4 text-success" />
            Strict privacy boundary
          </p>
          <p className="mt-1">
            Support is 100% voluntary and every tool stays free. Your filenames,
            inputs and compute receipts are never attached to a payment.
          </p>
        </footer>
      </div>
    </main>
  );
}
