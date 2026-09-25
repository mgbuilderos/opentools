import { PdfCompressTool } from '@/components/pdf-compress-tool';
import { PageDepthProvider } from '@/components/page-depth-provider';
import {
  requireToolPageDepth,
  toolPageMetadata,
} from '@/lib/seo/tool-page-depth';
import { ToolJsonLd } from '@/components/tool-json-ld';

export const revalidate = 86400;

/*
  The same compressor as `/pdf/compress`, at the address the constrained query
  asks for.

  WHY A SECOND ADDRESS AT ALL, since business rule 22 forbids duplicate pages.
  Measured in Google's autocomplete on 2026-09-24: `compress pdf offline` and
  `pdf to word offline` each return ten suggestions, and nearly every one
  completes to "free download", "converter for pc", "windows" or "android".
  Google reads "offline" as install desktop software, because that is the only
  answer anybody gives. `/pdf/compress` carries the modifier inside a title
  about the head term; no page answered the modifier itself.

  WHAT KEEPS IT ON THE RIGHT SIDE OF RULE 29, which permits a page only where a
  working, distinct tool stands behind it. Three things, none of them wording:
  the route is in the service worker's precache list, so the address itself
  opens with no network; the compressor's engine bundle is now in that payload
  too, which it was not before this page existed — see `referencedWorkers` in
  `scripts/build-service-worker-precache.mjs`; and the page carries a readiness
  panel that reads Cache Storage and reports what this browser actually holds,
  rather than printing a promise. `e2e/share-target.spec.ts` disconnects the
  browser, loads this route and compresses a real PDF through it.

  Deliberately no practice brief. `/pdf/compress` is framed around a filing
  portal's size ceiling; this page is framed around having no connection, and
  opening with both would ask the reader to choose a job before doing anything.
*/

const ROUTE = '/pdf/compress-offline';

export const metadata = toolPageMetadata(ROUTE);

export default function Page() {
  return (
    <>
      <ToolJsonLd route="/pdf/compress-offline" meta={metadata} />
      <PageDepthProvider content={requireToolPageDepth(ROUTE)}>
        <PdfCompressTool offlineRoute={ROUTE} />
      </PageDepthProvider>
    </>
  );
}
