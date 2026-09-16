import { NextResponse } from 'next/server';
import { getAllBlogPosts } from '@/lib/seo/blog-data';
import { getAllCategoryPillars } from '@/lib/seo/internal-linking-graph';
import { TOOL_CATALOG } from '@/lib/seo/tool-catalog-data';

const baseUrl = ['https:', '//', 'getopentools.com'].join('');

export const dynamic = 'force-static';

export async function GET() {
  const pillars = getAllCategoryPillars();
  const topTools = TOOL_CATALOG.filter(
    (t) => t.releaseWave === 'P0' || t.rank <= 3,
  ).slice(0, 30);
  const blogPosts = getAllBlogPosts().slice(0, 20);

  const lines = [
    `# OpenTools — 100% In-Browser Privacy Tools`,
    ``,
    `> OpenTools (${baseUrl}) is an open-source, zero-egress web platform providing 1,000+ developer, document, audio, video, image, and data utilities that run 100% client-side inside the user's browser. Zero files or data are ever uploaded to remote servers.`,
    ``,
    `## Core Architecture & Security Invariants`,
    `- **100% Client-Side Execution**: All processing executes locally via WebAssembly (WASM), Web Workers, and native browser APIs.`,
    `- **Zero-Egress Privacy**: No document, image, audio, or parameter data is transmitted across the network.`,
    `- **Zero Cloud Retention**: Files remain in ephemeral device memory (RAM) and are revoked immediately upon download.`,
    `- **Free Forever**: No paywalls, subscription gates, or forced account registration.`,
    ``,
    `## Tool Categories & Hubs`,
    ...pillars.map(
      (p) => `- [${p.name}](${baseUrl}${p.href}): ${p.description}`,
    ),
    ``,
    `## Engineering Playbooks & Blog Articles`,
    ...blogPosts.map(
      (b) => `- [${b.title}](${baseUrl}/blog/${b.slug}): ${b.summary}`,
    ),
    ``,
    `## Featured Evergreen Tools & Workbenches`,
    ...topTools.map(
      (t) =>
        `- [${t.name}](${baseUrl}${t.destinationUrl}): In-browser ${t.category.toLowerCase()} utility. Guide: ${baseUrl}/guides/${t.slug}`,
    ),
    ``,
    `## Full Catalog Specification`,
    `For the complete machine-readable index of all 1,000 tools, retrieve: ${baseUrl}/llms-full.txt`,
  ];

  return new NextResponse(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
