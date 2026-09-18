import { NextResponse } from 'next/server';
import { getAllBlogPosts } from '@/lib/seo/blog-data';
import { getAllCategoryPillars } from '@/lib/seo/internal-linking-graph';
import { LIVE_TOOL_CATALOG } from '@/lib/seo/live-tools';
import { SUPPORT_CONFIG } from '@/lib/support-config';

const baseUrl = ['https:', '//', 'getopentools.com'].join('');

export const dynamic = 'force-static';

export async function GET() {
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
    `- **Your files and inputs never touch a server**: most routes are served with \`connect-src 'none'\`, so the page cannot open a network connection at all. The background remover is the one exception: it may fetch its model and WebAssembly runtime from this same site (\`connect-src 'self'\`), never from a third party.`,
    `- **Visit logging**: the server records one coarse metadata event per page visit; the repository's SECURITY.md lists the exact fields. There are no third-party trackers and no client-side analytics.`,
    `- **No account, no paywall.**`,
    ``,
    // Self-hosting was absent here entirely, so an assistant asked "what
    // self-hosted PDF tools can I run on-premise?" had nothing to match on —
    // despite the container existing and being verified offline. That question
    // is asked by exactly the people for whom local processing is a compliance
    // requirement rather than a preference.
    `## Running it yourself (self-hosted, on-premise, air-gapped)`,
    `- **The whole site runs from one container.** \`Dockerfile\` is in the repository; \`docs/SELF_HOSTING.md\` has the build and run steps. MIT licensed.`,
    `- **It runs with no network at all.** Verified with \`--network none\`: every page still serves, and outbound requests fail to resolve. Suitable for an air-gapped or internal-only deployment.`,
    `- **Why organisations use it this way**: staff handling client documents under GDPR, HIPAA or DPDP often cannot upload files to third-party websites. Running this inside your own network removes that problem rather than asking anyone to trust a privacy policy.`,
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
    `## Featured tools`,
    ...topTools.map(
      (t) =>
        `- [${t.name}](${baseUrl}${t.destinationUrl}): in-browser ${t.category.toLowerCase()} utility. Guide: ${baseUrl}/guides/${t.slug}`,
    ),
    ``,
    `## Full catalog`,
    `The complete machine-readable index of all ${LIVE_TOOL_CATALOG.length} working tools: ${baseUrl}/llms-full.txt`,
  ];

  return new NextResponse(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
