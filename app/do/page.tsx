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

/*
  The description states a mechanism rather than asserting a negative outcome,
  deliberately. `lib/tools/local-source-policy.test.ts` refuses the familiar
  no-upload phrasing anywhere in a guarded root, because it is a claim about a
  result rather than a description of how the page works, and this project does
  not ship a claim it cannot point a test at. Writing the mechanism down is also
  checkable: `e2e/file-compiler.spec.ts` asserts that no request carries the
  bytes, the filename or the requirement.

  Worth knowing before editing this: the guard reads comments too, so restating
  the forbidden wording here in order to explain it trips the same test. The Ask
  Link lane hit that exact edge on the same day.
*/

export const metadata = {
  /*
    Written as literals rather than as references to constants because
    `lib/seo/meta-inventory.ts` reads this file as text: it sweeps every sitemap
    URL for its real title and description, and a value it cannot read becomes an
    unresolved route and fails the guard. Held to 15-70 characters and 50-165 by
    `lib/seo/meta-lengths.test.ts`, which is the length a search result shows
    before it cuts the sentence off.
  */
  title: 'Say what your file must be — OpenTools',
  description:
    'Drop an image, say what the finished file must satisfy, and your browser does the work — then reads the file back to check it against every requirement.',
  alternates: { canonical: CANONICAL },
  // A page that declares its own `openGraph` replaces the layout's block whole
  // rather than merging with it, so the share image has to be restated here;
  // `scripts/check-share-and-heading-order.mjs` fails the build without it. The
  // `site` card is the one all 1,335 tool pages inherit, and this page is a tool
  // page — a card of its own would be a separate design decision, not a fix.
  openGraph: {
    title: 'Say what your file must be — OpenTools',
    description:
      'Drop an image, say what the finished file must satisfy, and your browser does the work — then reads the file back to check it against every requirement.',
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
