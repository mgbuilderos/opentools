import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { FixMyUploadSurface } from '@/components/fix-my-upload-surface';
import { ASK_REQUESTS, findAskRequest } from '@/lib/tools/ask-link';

/**
 * Where a person lands when a site's upload rejected their file.
 *
 * One static page per declared request, and `dynamicParams = false`, so
 * `/fix/<anything>` is a 404 rather than a render. The requirement arrives
 * either in the query string (a plain link) or as a message from the window
 * that opened this one (the return channel); both are read on the client
 * against the same registry, because this page is prerendered to a static file
 * and there is no request on the server to read either from.
 *
 * `noindex, nofollow`. These are somebody else's upload requirements, not
 * search landing pages, and a stranger arriving from a search result would see
 * a specification for a job they do not have. The same reasoning as `/ask/*`.
 */
export const revalidate = 86400;
export const dynamicParams = false;

export function generateStaticParams() {
  return ASK_REQUESTS.map((request) => ({ request: request.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ request: string }>;
}): Promise<Metadata> {
  const { request: id } = await params;
  const request = findAskRequest(id);
  if (!request) return { robots: { index: false, follow: false } };
  return {
    alternates: { canonical: `/fix/${request.id}` },
    title: `Correct a file — ${request.headline}`,
    /*
     * Its own sentence, not Ask Link's. `lib/seo/description-coverage.test.ts`
     * fails when two pages describe themselves identically, and reusing
     * `request.metaDescription` here made every `/fix/<id>` a twin of its
     * `/ask/<id>`. The rule is right even for a `noindex` page: a description
     * nobody wrote for that page is a description nobody checked. The wording
     * also differs in substance — an ask link is a person asking a person, this
     * is a form that rejected a file.
     */
    description: `A website could not accept your ${request.subjectNoun}. Correct it here, on this device, and send it on — the file is not uploaded to do it.`,
    robots: { index: false, follow: false },
  };
}

export default async function FixRequestPage({
  params,
}: {
  params: Promise<{ request: string }>;
}) {
  const { request: id } = await params;
  const request = findAskRequest(id);
  if (!request) notFound();

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-5 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <nav className="mb-3 sm:mb-6">
          <a
            href="/"
            className="focus-ring inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            OpenTools
          </a>
        </nav>
        <header className="mb-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Fix my upload
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            {request.headline}
          </h1>
        </header>
        <FixMyUploadSurface request={request} />
      </div>
    </main>
  );
}
