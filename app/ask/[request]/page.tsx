import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { AskLinkRequest } from '@/components/ask-link-request';
import { ASK_REQUESTS, findAskRequest } from '@/lib/tools/ask-link';

/**
 * The recipient's page for one kind of request.
 *
 * ONE STATIC PAGE PER DECLARED REQUEST, and `dynamicParams = false` so a path
 * nobody declared is a 404 rather than a render. That is deliberate: it means
 * `/ask/<anything>` cannot be used to reach a page at all, let alone to point
 * one somewhere. The settings arrive in the query string and are read on the
 * client against the request's own definition — see `components/ask-link-request.tsx`.
 *
 * `noindex, nofollow`.
 *
 * `noindex`: these are private requests between two people. A search result
 * leading a stranger here shows them somebody else's specification and a file
 * picker for a job they do not have.
 *
 * `nofollow`, where the framable embeds under `/embed/` say `follow`: an embed
 * carries an attribution link that is the whole return on that programme, and
 * there is nothing of that kind here. The only links out of this page are to the
 * tool and to `/ask`, both of which are reachable in better ways.
 *
 * A self-canonical, stated per request, because a canonical is required on every
 * page — `lib/seo/canonical-coverage.test.ts`, written after 59 pages spent a
 * week telling Google to index the home page instead of themselves. It names the
 * path without the query, which is right in its own terms: the settings are
 * somebody's private request and belong in no canonical URL.
 *
 * These pages are NOT in the sitemap, and must never be: a generated link
 * variant of a private request is not an address this site publishes. `/ask`
 * itself is `index, follow` and reachable through the tool pages — see the note
 * in `app/ask/page.tsx` for why its sitemap entry is held back to a separate
 * commit.
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
    alternates: { canonical: `/ask/${request.id}` },
    title: `${request.headline} — a file request`,
    description: request.metaDescription,
    robots: { index: false, follow: false },
  };
}

export default async function AskRequestPage({
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
            A file request
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            {request.headline}
          </h1>
        </header>

        <AskLinkRequest request={request} />

        <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
          Need a file from someone yourself?{' '}
          <a href="/ask" className="focus-ring rounded font-semibold underline">
            Create a request
          </a>
          .
        </p>
      </div>
    </main>
  );
}
