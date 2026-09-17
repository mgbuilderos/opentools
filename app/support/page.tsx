/* oxlint-disable jsx-a11y/anchor-has-content, jsx-a11y/control-has-associated-label, jsx-a11y/anchor-is-valid, react/no-unescaped-entities */
import type { Metadata } from 'next';
import {
  ArrowLeft,
  Cpu,
  HeartHandshake,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react';
import { SupportDualView } from '@/components/support-dual-view';

export const metadata: Metadata = {
  title: 'Support OpenTools — 100% Free & Local Utilities',
  description:
    'Support independent development of privacy-first, zero-egress browser utilities.',
};

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-muted/30 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <nav className="mb-6">
          <a
            href="/"
            className="focus-ring inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to all tools
          </a>
        </nav>

        {/* Header */}
        <section className="rounded-2xl border bg-card p-6 sm:p-10 mb-8">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-xl border bg-muted">
              <HeartHandshake
                aria-hidden="true"
                className="size-6 text-foreground"
              />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Independent & Open Source
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Keep useful tools free for everyone
              </h1>
            </div>
          </div>

          <p className="mt-5 text-base leading-7 text-muted-foreground sm:text-lg">
            These tools are 100% free with no ads, no third-party trackers, no
            paywalls, and no corporate investors. Every single tool runs
            directly inside your browser tab on your own device, using
            JavaScript and Web Workers, and WebAssembly for a few tools that
            need a local model. Your files and inputs never touch a server.
          </p>

          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            If our fast offline utilities saved you valuable time today,
            consider supporting future development so we can keep adding more
            daily tools.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
            <span className="flex items-center gap-1.5 rounded-full border bg-muted px-3 py-1">
              <ShieldCheck
                aria-hidden="true"
                className="size-3.5 text-success"
              />
              Zero Server Egress
            </span>
            <span className="flex items-center gap-1.5 rounded-full border bg-muted px-3 py-1">
              <Cpu aria-hidden="true" className="size-3.5" />
              100% Client-Side Compute
            </span>
            <span className="flex items-center gap-1.5 rounded-full border bg-muted px-3 py-1">
              <LockKeyhole aria-hidden="true" className="size-3.5" />
              Free Forever Guarantee
            </span>
          </div>
        </section>

        {/* Dual Support Section: UPI (India) & GitHub Sponsors (International) */}
        <section className="mb-8">
          <SupportDualView />
        </section>

        {/* Privacy Boundary Guarantee */}
        <footer className="rounded-xl border bg-muted/40 p-5 text-xs leading-6 text-muted-foreground">
          <p className="flex items-center gap-2 font-semibold text-foreground">
            <ShieldCheck aria-hidden="true" className="size-4 text-success" />
            Strict Privacy Boundary
          </p>
          <p className="mt-1">
            Support is 100% voluntary. All utilities remain completely free
            forever. Your filenames, inputs, and compute receipts are never
            attached to any support transaction.
          </p>
        </footer>
      </div>
    </main>
  );
}
