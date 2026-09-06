import type { Metadata } from 'next';
import { ArrowLeft, HeartHandshake, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Support the tools — Preview',
  description:
    'A separate, privacy-preserving support route for the Tools preview.',
};

export default function SupportPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-muted/45 px-4 py-10">
      <section className="w-full max-w-lg overflow-hidden rounded-2xl border bg-card">
        <div className="p-6 sm:p-8">
          <span className="grid size-11 place-items-center rounded-xl border bg-muted">
            <HeartHandshake aria-hidden="true" className="size-5" />
          </span>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Separate support surface
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
            Keep useful tools free
          </h1>
          <p className="mt-4 leading-7 text-muted-foreground">
            These tools are free to use. An open-source release is planned, and
            optional support is intended to fund compatibility testing, security
            maintenance, and accessible tools. Your files, filenames, job
            details, and receipt were not passed here.
          </p>
          <div className="mt-6 rounded-xl border bg-muted/50 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck aria-hidden="true" className="size-4 text-success" />
              Checkout intentionally not connected
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              This preview demonstrates the intended privacy boundary. A project
              license, reviewed hosted provider, tax treatment, and final amount
              must be approved before support payments go live.
            </p>
          </div>
        </div>
        <div className="border-t bg-muted/35 p-4 sm:px-8">
          <a
            href="/"
            className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold hover:bg-muted"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to all tools
          </a>
        </div>
      </section>
    </main>
  );
}
