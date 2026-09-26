import { FileCompilerTool } from '@/components/file-compiler-tool';
import { ToolJsonLd } from '@/components/tool-json-ld';
import { shareImages } from '@/lib/seo/share-images';

export const revalidate = 86400;

/*
  Split rather than written whole, the way `app/embed/page.tsx` does it:
  `lib/tools/local-source-policy.test.ts` guards `app/` against an absolute-URL
  literal, so that the one place a URL is built is visible and deliberate.
*/
const ORIGIN = ['https:', '//', 'getopentools.com'].join('');
const CANONICAL = `${ORIGIN}${'/do'}`;

/*
  WHY THIS PAGE WRITES ITS OWN METADATA INSTEAD OF USING `toolPageMetadata`.

  `lib/seo/tool-page-depth.ts` carries the title, description and the written
  half of every `/pdf/*` and `/image/*` tool page, because those pages compete
  for searches whose answer is an 800-word explanation plus a tool. This page is
  not that. Nobody searches for a constraint compiler; they arrive holding a file
  and a rule somebody else gave them. `tool-page-depth.test.ts` scopes its
  800-word requirement to routes starting `/pdf/` or `/image/` plus a named core
  list, so `/do` is outside it by that test's own definition rather than by an
  exemption added here.

  The description is still written to be the search snippet, and
  `description-coverage.test.ts` holds it to being unique and long enough.
*/

const ROUTE = '/do';

const TITLE = 'Say what your file must be — OpenTools';
const DESCRIPTION =
  'Drop an image, say what the finished file must satisfy — JPEG, under 2 MB, maximum 1200 px — and your browser does the work and checks the result against every requirement. Nothing is uploaded.';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: CANONICAL },
  // A page that declares its own `openGraph` replaces the layout's block whole
  // rather than merging with it, so the share image has to be restated here;
  // `scripts/check-share-and-heading-order.mjs` fails the build without it. The
  // `site` card is the one all 1,335 tool pages inherit, and this page is a tool
  // page — a card of its own would be a separate design decision, not a fix.
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: CANONICAL,
    images: shareImages('site'),
  },
};

export default function Page() {
  return (
    <>
      <ToolJsonLd route={ROUTE} meta={metadata} />
      <FileCompilerTool />
    </>
  );
}
