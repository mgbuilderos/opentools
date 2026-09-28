import type { Metadata } from 'next';
import { ArrowLeft, Wrench } from 'lucide-react';

import { FixMyUploadIntegration } from '@/components/fix-my-upload-integration';

/**
 * The page a site owner reads, not the page their visitor uses.
 *
 * WHY THIS ONE IS INDEXABLE AND `/fix/<request>` IS NOT. This describes a thing
 * anybody may adopt and holds nobody's requirement. The pages under it carry
 * somebody else's upload rules and are `noindex`, for the same reason `/ask/*`
 * is.
 *
 * NOT IN `sitemap.xml`, and that is a hold rather than an oversight — the same
 * one `/ask` carries. Listing a route needs a key in
 * `lib/seo/sitemap-lastmod.generated.ts`, and regenerating that file rewrites
 * hundreds of unrelated routes' dates for reasons that are partly a rendering
 * difference between machines. That belongs in its own commit.
 */
export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/fix' },
  title: 'Fix my upload — let people correct a rejected file, privately',
  description:
    'When your upload form rejects a file, send the person here with the requirement attached. They correct it on their own device and you can get the corrected file straight back.',
};

export default function FixPage() {
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

        <header className="rounded-2xl border bg-card p-5 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl border bg-muted sm:size-12">
              <Wrench
                aria-hidden="true"
                className="size-5 text-foreground sm:size-6"
              />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                For site owners
              </p>
              <h1 className="mt-0.5 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Fix my upload
              </h1>
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            Your upload form rejects a file and tells the person why. Most of
            them then search for a converter and hand the document they were
            trying to send you to whichever site ranks first. Put a link beside
            the error instead: the requirement travels, the file does not.
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            The correction runs in their browser. Nothing about the file reaches
            this site, so adopting this does not make us a party to your
            visitors&rsquo; documents, and there is no account or key to obtain.
          </p>
        </header>

        <div className="mt-5">
          <FixMyUploadIntegration />
        </div>
      </div>
    </main>
  );
}
