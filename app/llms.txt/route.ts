import { NextResponse } from 'next/server';
import { getAllBlogPosts } from '@/lib/seo/blog-data';
import { getAllCategoryPillars } from '@/lib/seo/internal-linking-graph';
import { LIVE_TOOL_CATALOG } from '@/lib/seo/live-tools';

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
