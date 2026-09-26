import { toolJsonLd, type ToolJsonLdInput } from '@/lib/seo/tool-json-ld';

/*
  The structured data for one tool page, rendered into the page's own markup.

  A server component on purpose. It reads `lib/seo/tool-json-ld.ts`, which
  reads the route's Content-Security-Policy and the homepage's category list,
  and none of that should cross into a client bundle to produce a script tag
  that never changes after the response is written.

  It goes in the page rather than the layout because a layout is not told which
  route is rendering, and the claim here is per route: `/image/heic-to-jpg` is
  served a different `connect-src` from `/pdf/merge`, and a block that said
  otherwise would be the one thing on the page a reader could disprove.
*/
export function ToolJsonLd(props: ToolJsonLdInput) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(toolJsonLd(props)) }}
    />
  );
}
