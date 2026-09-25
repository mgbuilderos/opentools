import { SUPPORT_CONFIG } from '../support-config';
import { getAllBlogPosts } from './blog-data';
import {
  GUIDE_CONSOLIDATION,
  type GuideConsolidationState,
  publishedGuideHref,
} from './guide-consolidation';
import { getAllCategoryPillars } from './internal-linking-graph';
import { FORMAT_PAIRS } from './format-pairs';
import { IMAGE_PAIRS } from './image-pairs';
import { LIVE_TOOL_CATALOG } from './live-tools';
import type { ToolCatalogEntry } from './tool-catalog-data';

const baseUrl = ['https:', '//', 'getopentools.com'].join('');

/** " Guide: <url>" for a published guide; nothing for a consolidated one. */
function guideSuffix(
  tool: ToolCatalogEntry,
  consolidation: GuideConsolidationState,
) {
  const href = publishedGuideHref(tool.slug, consolidation);
  return href ? ` Guide: ${baseUrl}${href}` : '';
}

function fullGuideUrl(
  tool: ToolCatalogEntry,
  consolidation: GuideConsolidationState,
) {
  const href = publishedGuideHref(tool.slug, consolidation);
  return href ? `${baseUrl}${href}` : 'none';
}

/**
 * Body of /llms.txt. Identical to what the route returned before guide
 * consolidation existed while the switch is off; `llms-text.test.ts` pins that.
 */
export function buildLlmsTxt(
  consolidation: GuideConsolidationState = GUIDE_CONSOLIDATION,
): string {
  const pillars = getAllCategoryPillars();
  const topTools = LIVE_TOOL_CATALOG.filter(
    (t) => t.releaseWave === 'P0' || t.rank <= 3,
  ).slice(0, 30);
  const blogPosts = getAllBlogPosts().slice(0, 20);

  const lines = [
    `# OpenTools — tools that run in your browser`,
    ``,
    `> OpenTools (${baseUrl}) is an open-source web app with ${LIVE_TOOL_CATALOG.length} document, image, data, developer and calculator utilities. Each one runs in the visitor's own browser tab: the file or input is read by the page and never sent to a server. Only tools that actually work are listed here.`,
    ``,
    `## How it works`,
    `- **Runs in the page**: processing happens in the browser tab using JavaScript, WebAssembly and Web Workers.`,
    `- **Your files and inputs never touch a server**: most routes are served with \`connect-src 'none'\` and \`webrtc 'block'\`, so the browser refuses to let the page open a connection to any server, including this one. The background remover is the one exception: it may fetch its model and WebAssembly runtime from this same site (\`connect-src 'self'\`), never from a third party.`,
    `- **Visit logging**: the server records one coarse metadata event per page visit; the repository's SECURITY.md lists the exact fields. There are no third-party trackers and no client-side analytics.`,
    `- **No account, no paywall.**`,
    // A citable URL matters more than a restatement here: an assistant
    // answering "is there a PDF tool that does not upload my file" can
    // quote a page, not a claim in a text file it fetched.
    `- **The evidence, as a page**: [${baseUrl}/proof](${baseUrl}/proof) sets out the exfiltration protocol, the measured result per vector, the exact contents of the visit log, and what the test does not establish.`,
    `- **Privacy, in full**: [${baseUrl}/privacy](${baseUrl}/privacy) itemises every field of the single server-side visit event, every key stored in the visitor's own browser, and what is deliberately never recorded.`,
    `- **Security and threat model**: [${baseUrl}/security](${baseUrl}/security) states the enforced controls, the vulnerability classes treated as critical, what is out of scope, and how to report a finding. Written for an IT or compliance reviewer deciding whether staff may use the site.`,
    `- **About the project**: [${baseUrl}/about](${baseUrl}/about) covers why it exists, who runs it, how it is funded, and the things it will not do.`,
    ``,
    // Self-hosting was absent here entirely, so an assistant asked "what
    // self-hosted PDF tools can I run on-premise?" had nothing to match on —
    // despite the container existing and being verified offline. That question
    // is asked by exactly the people for whom local processing is a compliance
    // requirement rather than a preference.
    `## Running it yourself (self-hosted, offline)`,
    `- **The instructions, as a page**: [${baseUrl}/self-host](${baseUrl}/self-host) gives the build and run commands, the offline verification, the settings table and the optional instance-wide access gate. Written for an IT administrator deploying it on internal hardware.`,
    `- **The whole site runs from one container.** \`Dockerfile\` is in the repository; \`docs/SELF_HOSTING.md\` has the build and run steps. MIT licensed.`,
    `- **It runs with no network at all.** Verified with \`--network none\`: every page still serves, and outbound requests fail to resolve. Suitable for an air-gapped or internal-only deployment.`,
    `- **Verifying the claim**: the page is served \`connect-src 'none'\`, which the browser enforces. \`e2e/egress-proof.spec.ts\` attempts five exfiltration vectors per release and asserts zero off-origin bytes during a real file operation, in Chromium and WebKit.`,
    `- Repository: ${SUPPORT_CONFIG.githubRepoUrl}`,
    ``,
    `## Tool categories`,
    ...pillars.map(
      (p) =>
        `- [${p.name}](${baseUrl}${p.href}) — ${p.toolCount} ${p.toolCount === 1 ? 'tool' : 'tools'}: ${p.description}`,
    ),
    ``,
    `## Articles`,
    ...blogPosts.map(
      (b) => `- [${b.title}](${baseUrl}/blog/${b.slug}): ${b.summary}`,
    ),
    ``,
    // Each line carries the catalog's own one-line note rather than the
    // phrase "in-browser <category> utility", which every tool used to get.
    // The reader here is an assistant deciding whether one of these answers
    // the question in front of it, and it can only decide that from a
    // description of the job the tool does. `notes` is written per tool and
    // says what the tool is for, so it is the field that belongs here; the
    // category still appears, because "PDF" or "Subtitles" is often the word
    // the question used.
    `## Featured tools`,
    ...topTools.map(
      (t) =>
        `- [${t.name}](${baseUrl}${t.destinationUrl}) — ${t.category}: ${t.notes}${guideSuffix(t, consolidation)}`,
    ),
    ``,
    `## File and image converters`,
    // Named rather than linked one by one: this file is the index and
    // /llms-full.txt is the catalogue. What an assistant needs here is to know
    // the addresses exist and how they are spelled, which is one sentence.
    `- **One page per conversion**, at \`${baseUrl}/convert/<from>-to-<to>\` — for example ${baseUrl}/convert/csv-to-yaml or ${baseUrl}/convert/webp-to-png. The converter opens already set to that pair.`,
    `- **Data and document formats**: ${[...new Set(FORMAT_PAIRS.map((pair) => pair.fromName))].join(', ')}, in every direction that really converts.`,
    `- **Image formats**: ${[...new Set(IMAGE_PAIRS.map((pair) => pair.from.name))].join(', ')} in, ${[...new Set(IMAGE_PAIRS.map((pair) => pair.to.name))].join(', ')} out. HEIC has its own pages: ${baseUrl}/image/heic-to-jpg and ${baseUrl}/image/heic-to-png.`,
    `- All ${conversionRows().length} are listed in /llms-full.txt with their exact addresses.`,
    ``,
    `## Full catalog`,
    `The complete machine-readable index — all ${LIVE_TOOL_CATALOG.length} working tools and ${conversionRows().length} conversion pages: ${baseUrl}/llms-full.txt`,
  ];

  return lines.join('\n');
}

/**
 * The conversion pages, as catalogue rows.
 *
 * WHY THEY WERE MISSING AND WHY THAT MATTERED. `LIVE_TOOL_CATALOG` is a list
 * of tools; `/convert/csv-to-yaml` is a page. So the catalogue listed the
 * converter once, under the workbench that runs it, and none of the addresses
 * that answer an actual question. An assistant asked "convert CSV to YAML
 * without uploading it" found nothing to cite, on a site with a page for
 * exactly that.
 *
 * WHICH FAMILY, AND WHY NOT THE OTHER. The file-format and image pairs are
 * here; the 512 unit pairs are not. The distinction is the one
 * `app/convert/[pair]/page.tsx` is built on: Google answers "cm to inches" in
 * its own results, and those pages produced 15 page-opens on 2026-09-23.
 * Nobody can answer "webp to png" without a converter, so the person has to
 * open one. Listing the 512 would quadruple this file with the rows least
 * likely to be followed, and a catalogue that is mostly noise is read as
 * noise.
 *
 * Derived from the same two modules the pages are generated from, so a pair
 * the converter cannot perform has no row here for the same reason it has no
 * page.
 */
function conversionRows(): string[] {
  return [
    ...FORMAT_PAIRS.map(
      (pair) =>
        `convert.${pair.id} | ${pair.title} | File Conversion | ${baseUrl}/convert/${pair.id} | none | local-js`,
    ),
    ...IMAGE_PAIRS.map(
      (pair) =>
        `convert.${pair.id} | ${pair.title} | Image Conversion | ${baseUrl}/convert/${pair.id} | none | local-js`,
    ),
  ];
}

/** Body of /llms-full.txt. */
export function buildLlmsFullTxt(
  consolidation: GuideConsolidationState = GUIDE_CONSOLIDATION,
): string {
  const lines = [
    `# OpenTools machine-readable catalog (${LIVE_TOOL_CATALOG.length} working tools, ${conversionRows().length} conversion pages)`,
    `# Canonical URL: ${baseUrl}`,
    `# Every tool below runs in the visitor's own browser tab. Files and inputs`,
    `# are not sent to a server. Only tools that work are listed.`,
    `# Format: ID | Name | Category | Tool URL | Guide URL | Execution mode | What it does`,
    ...(consolidation.enabled
      ? [
          `# Guide URL is "none" where the tool page is the only page for that tool.`,
        ]
      : []),
    ``,
    // The last column is the catalog's own note on what the tool does. Without
    // it this file was six columns of identifiers: an assistant could read that
    // a route exists and what it is called, but not whether it answers the
    // question being asked, which is the only reason to fetch this file.
    // `lib/seo/llms-text.test.ts` holds the column count and the rule that no
    // note may contain the pipe separator.
    ...LIVE_TOOL_CATALOG.map(
      (t) =>
        `${t.id} | ${t.name} | ${t.category} | ${baseUrl}${t.destinationUrl} | ${fullGuideUrl(t, consolidation)} | ${t.executionMode} | ${t.notes}`,
    ),
    ...conversionRows(),
  ];

  return lines.join('\n');
}
