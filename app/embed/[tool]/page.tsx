import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EmbedFrame } from '@/components/embed-frame';
import { EmbedTableConverter } from '@/components/embed-table-converter';
import { EMBEDDABLE_TOOLS, embeddableTool } from '@/lib/embed/embeddable-tools';

export const revalidate = 86400;
export const dynamicParams = false;

/**
 * Slug to component. Separate from `EMBEDDABLE_TOOLS` because that list is
 * imported by the sitemap and by tests that must not pull a client component
 * into a server bundle, and because a missing entry here is a typecheck error
 * rather than a blank frame on somebody else's site.
 */
const EMBED_COMPONENTS: Record<string, () => React.ReactNode> = {
  'table-converter': EmbedTableConverter,
};

export function generateStaticParams() {
  return EMBEDDABLE_TOOLS.map((tool) => ({ tool: tool.slug }));
}

/**
 * `noindex, follow`, and it matters which half is which.
 *
 * `noindex`: an embed is a stripped copy of a page we are trying to rank, and
 * letting Google index both would split the signal the programme exists to
 * build -- the exact mistake `lib/seo/removed-tool-redirects.ts` exists to
 * clean up elsewhere. `public/_headers` sends the same instruction as a header,
 * because a crawler that reaches the frame as a subresource may never parse
 * this tag.
 *
 * `follow`: the attribution link inside the frame must still count. That link
 * is the entire return on the programme.
 *
 * No `alternates.canonical`. A canonical pointing at the real tool page would
 * be the tidy-looking choice and it is the wrong one: canonicalising an
 * indexable-by-nobody frame onto the page it links to invites Google to treat
 * the two as one document and pick the frame's stripped content as the copy to
 * show. `noindex` already says everything that needs saying. These routes are
 * disallowed in `app/robots.ts`, which is what exempts them from the
 * every-page-declares-a-canonical sweep in
 * `lib/seo/canonical-coverage.test.ts`.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ tool: string }>;
}): Promise<Metadata> {
  const { tool } = await params;
  const meta = embeddableTool(tool);
  if (!meta) return {};
  return {
    title: `${meta.name} — OpenTools`,
    description: meta.summary,
    robots: { index: false, follow: true },
  };
}

export default async function EmbedToolPage({
  params,
}: {
  params: Promise<{ tool: string }>;
}) {
  const { tool } = await params;
  const meta = embeddableTool(tool);
  const Tool = EMBED_COMPONENTS[tool];
  if (!meta || !Tool) {
    notFound();
  }

  return (
    <EmbedFrame tool={meta}>
      <Tool />
    </EmbedFrame>
  );
}
