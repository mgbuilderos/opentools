import type { Metadata } from 'next';
import { ArrowLeft, Share2 } from 'lucide-react';
import { ShareTargetLanding } from '@/components/share-target-landing';

/**
 * The address the operating system hands a shared file to.
 *
 * Almost nobody sees this page. A share from the Android share sheet is a POST,
 * and `public/sw.js` answers it inside the browser and redirects to the tool
 * before anything renders. This exists for the other two ways in: a file
 * handler launch, which is a plain navigation with the file delivered
 * afterwards through `launchQueue`, and somebody simply opening the URL.
 *
 * It is prerendered like every other route so the installed app can open it
 * with no network, and precached by the worker for the same reason.
 */
export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/share-target' },
  title: 'Open a shared file',
  description:
    'Receives a file sent to OpenTools from another app and opens it in the tool that handles it.',
  // An endpoint, not a destination: it has nothing to rank for, and a search
  // result leading here would be a dead end for whoever clicked it.
  robots: { index: false, follow: false },
};

export default function ShareTargetPage() {
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
              <Share2
                aria-hidden="true"
                className="size-5 text-foreground sm:size-6"
              />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Shared file
              </p>
              <h1 className="mt-0.5 text-2xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Open a shared file
              </h1>
            </div>
          </div>

          <div className="mt-4">
            <ShareTargetLanding />
          </div>
        </section>
      </div>
    </main>
  );
}
