'use client';

import { Code2 } from 'lucide-react';
import { usePathname } from 'next/navigation';

import { embeddableToolByPath } from '@/lib/embed/embeddable-tools';

/**
 * The embed programme's front door, on the page of the tool it embeds.
 *
 * Rendered unconditionally by `AppShell` and returns `null` on every page whose
 * tool is not embeddable — the same shape as `EgressMeter`, and for the same
 * reason: a single unconditional call site cannot drift out of step with the
 * list that decides, whereas 1,031 opt-ins would.
 *
 * WHY IT IS NOT ON EVERY TOOL PAGE, WHICH IS NOT AN OVERSIGHT. Only a
 * **text in, text out** tool may be embedded. `lib/embed/embeddable-tools.ts`
 * explains it and `decisions/ADR-019-embed-frame-ancestors.md` §4 decided it: an
 * embed runs inside a page we do not control and cannot see, so a file picker in
 * that position asks a visitor to hand a document to a frame whose surrounding
 * page may be misrepresenting it. A button offering to embed `/pdf/redact` would
 * therefore be a promise the project has decided never to keep. This appears on
 * exactly the pages where the offer is real, and each tool added to the list
 * lights up its own page with no change here.
 *
 * THE COPY IS DELIBERATELY NOT A ZERO-UPLOAD CLAIM.
 * `lib/tools/local-source-policy.test.ts` forbids the flat no-upload assertion
 * in this
 * directory, and it failed on an earlier draft of this sentence -- correctly,
 * because that claim needs the release egress proof, which has not been run.
 * What is said instead is structural and checkable from `embedSnippet`: a plain
 * iframe with no script tag, so nothing of ours executes on the embedder's page.
 */
export function EmbedThisTool() {
  const pathname = usePathname();
  const tool = embeddableToolByPath(pathname);

  if (!tool) return null;

  return (
    <aside
      aria-label={`Embed ${tool.name} on your own site`}
      className="mx-auto mt-8 max-w-6xl px-4 pb-8 sm:px-8"
    >
      <div className="ds-surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          <Code2
            aria-hidden="true"
            className="mr-2 inline size-4 align-text-bottom"
          />
          Put <span className="font-medium text-foreground">{tool.name}</span>{' '}
          on your own site. One <code>&lt;iframe&gt;</code>, no key and no
          account &mdash; and no script of ours on your page.
        </p>
        <a
          className="ds-button-secondary shrink-0 text-sm"
          href={`/embed#${tool.slug}`}
        >
          Get the embed code
        </a>
      </div>
    </aside>
  );
}
