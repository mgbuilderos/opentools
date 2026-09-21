import type { Metadata } from 'next';
import { ImageEditorTool } from '@/components/image-editor-tool';
import { IMAGE_EDITOR_OPERATIONS } from '@/lib/tools/catalog';
import { excludedToolIdsForPrefix } from '@/lib/seo/live-tools';
import { relatedToolsFor } from '@/lib/seo/related-tools';

export const revalidate = 86400;

/*
  One page per image edit, generated from the operations the editor can run.

  All seven used to answer on `/image/editor?tool=<id>` — one URL, one title
  ("Local Photo Editor") for all of them, and none of the query-string variants
  in the sitemap. As with the PDF page tools, the component never read `?tool=`,
  so the parameter decided nothing: "image cropper" and "image grayscale"
  reached byte-identical markup.

  TWO TRAPS ARE HANDLED HERE.

  1. `/image` already holds seven hand-written folders (editor, optimize,
     exact-size, metadata, background-remover, and the two held back for the
     owner's tech review). A literal segment beats a dynamic one, so an id
     matching one of them would be claimed here and served there — a sitemap
     URL the build never writes. `excludedToolIdsForPrefix` is the single list
     both this route and the registry exclude against. No id collides today;
     the filter is what keeps that true when the next one is added. The two
     held-back tools are literal folders that are not operations of this
     editor, so nothing here can publish them.

  2. `/image/editor` and `/image/background-remover` are the SAME component
     with different props, and `lib/seo/live-tools.ts` gives both routes the
     same id set. So a shared id needs one decision about which face of the
     tool it opens, taken in one place rather than by whichever lookup runs
     first. `PROPS_FOR` below is that place, and it matches the decision the
     catalogue already records in `searchEntries` for `image-editor`:
     `solid-background-remover` is the background remover, everything else is
     the editor. Changing it here changes it everywhere this route serves.

  `dynamicParams = false`: an unknown slug 404s rather than rendering a
  fallback that claims a tool it is not showing.
*/

const BASE = '/image';
const CANONICAL_ORIGIN = ['https:', '//', 'getopentools.com'].join('');
const DEDICATED = excludedToolIdsForPrefix(BASE);

export const dynamicParams = false;

const OPERATIONS = IMAGE_EDITOR_OPERATIONS.filter(
  (operation) => !DEDICATED.has(operation.id),
);

/** The one place that says which face of the shared editor an id opens. */
function propsFor(tool: string) {
  return tool === 'solid-background-remover'
    ? { defaultRemoveBackground: true }
    : {};
}

export function generateStaticParams() {
  return OPERATIONS.map((operation) => ({ tool: operation.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tool: string }>;
}): Promise<Metadata> {
  const { tool } = await params;
  const operation = OPERATIONS.find((item) => item.id === tool);
  if (!operation) return {};
  return {
    title: operation.name,
    description: operation.description,
    alternates: { canonical: `${CANONICAL_ORIGIN}${BASE}/${operation.id}` },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ tool: string }>;
}) {
  const { tool } = await params;
  if (!OPERATIONS.some((operation) => operation.id === tool)) return null;
  return (
    <ImageEditorTool
      initialOperationId={tool}
      relatedTools={relatedToolsFor(`${BASE}/${tool}`)}
      {...propsFor(tool)}
    />
  );
}
