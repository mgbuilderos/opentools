/* oxlint-disable jsx-a11y/anchor-has-content, jsx-a11y/control-has-associated-label, jsx-a11y/anchor-is-valid, react/no-unescaped-entities */
import type { Metadata } from 'next';
import { ArrowLeft, HeartHandshake, ShieldCheck } from 'lucide-react';
import { SupportDualView } from '@/components/support-dual-view';
import { buildSitemap } from '@/lib/seo/sitemap-entries';

/*
  Counted, never typed. This page asks people for money and states the size of
  the site as a fact, and the fact had gone stale: it read "645+ pages" while
  the sitemap carried 1,464, and quoted a cache figure of "<125 writes/day"
  against a real budget of 900. `stated-numbers.test.ts` now fails on a
  hand-written count in any page, which is the only thing that keeps a number
  in a sentence honest a year from now.
*/
const PAGE_COUNT = buildSitemap().length;

export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/support' },
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
            Zero ads, zero accounts, zero tracking cookies. Every tool executes
            strictly inside your browser tab. Voluntary contributions fund our
            real domain and edge hosting costs so the project stays independent
            and fast for everyone.
          </p>
        </section>

        {/* UPI (India) and Buy Me a Coffee (international) take money today;
            GitHub Sponsors is shown as pending and takes none. */}
        <section className="mb-4 sm:mb-6">
          <SupportDualView />
        </section>

        {/* Transparent Infrastructure Breakdown: What Support Actually Pays For */}
        <section className="rounded-xl border bg-card p-5 text-sm leading-6 text-muted-foreground sm:p-6">
          <h2 className="text-base font-semibold text-foreground">
            What your support pays for — transparent infrastructure costs
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            OpenTools is entirely self-funded and operates with no venture
            backing or ad networks. Here is the exact breakdown of our operating
            costs:
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border bg-muted/20 p-3.5 sm:p-4">
              <div className="flex items-center justify-between font-mono text-sm font-bold text-foreground">
                <span>Edge Hosting &amp; Uptime</span>
                <span>$5 / month</span>
              </div>
              <p className="mt-1.5 text-xs leading-normal text-muted-foreground">
                Funds independent edge infrastructure and development time. All{' '}
                {PAGE_COUNT.toLocaleString('en-GB')} pages are prerendered and
                served from the edge as static files, so tools load instantly
                worldwide without commercial sponsors.
              </p>
            </div>

            <div className="rounded-lg border bg-muted/20 p-3.5 sm:p-4">
              <div className="flex items-center justify-between font-mono text-sm font-bold text-foreground">
                <span>Domain &amp; DNS</span>
                <span>$12 / year</span>
              </div>
              <p className="mt-1.5 text-xs leading-normal text-muted-foreground">
                Annual renewal for{' '}
                <code className="text-foreground">getopentools.com</code>. Keeps
                the site running on a clean, independent domain without
                third-party sponsorship banners.
              </p>
            </div>

            <div className="rounded-lg border bg-muted/20 p-3.5 sm:p-4">
              <div className="flex items-center justify-between font-mono text-sm font-bold text-foreground">
                <span>Cloud File Ingestion &amp; Storage</span>
                <span className="text-success">$0 / forever</span>
              </div>
              <p className="mt-1.5 text-xs leading-normal text-muted-foreground">
                Zero dollars spent on file processing servers. Because tools run
                locally via JavaScript, Web Workers, and WebAssembly with a
                strict{' '}
                <code className="text-foreground">connect-src 'none'</code>{' '}
                Content Security Policy, your files never reach a server.
              </p>
            </div>

            <div className="rounded-lg border bg-muted/20 p-3.5 sm:p-4">
              <div className="flex items-center justify-between font-mono text-sm font-bold text-foreground">
                <span>Independent Tool Engineering</span>
                <span>Pure Code</span>
              </div>
              <p className="mt-1.5 text-xs leading-normal text-muted-foreground">
                Writing zero-dependency client-side engines: whole MPEG frame
                MP3 cutting, subtitle two-point synchronization, offline PDF
                page operations, and local schema formatters.
              </p>
            </div>
          </div>

          <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">
            No paid tiers, no premium paywalls, no feature gating. Support is
            100% voluntary; if you choose not to contribute, every tool remains
            equally and completely free.
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
