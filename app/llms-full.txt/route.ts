import { NextResponse } from 'next/server';
import { TOOL_CATALOG } from '@/lib/seo/tool-catalog-data';

const baseUrl = ['https:', '//', 'getopentools.com'].join('');

export const dynamic = 'force-static';

export async function GET() {
  const lines = [
    `# OpenTools Full Machine-Readable Catalog (1,000 Tools)`,
    `# Canonical URL: ${baseUrl}`,
    `# Privacy Standard: 100% Client-Side In-Browser Computation (Zero Egress)`,
    `# Format: ID | Name | Category | Interactive URL | Guide URL | Risk Tier | Execution Mode`,
    ``,
    ...TOOL_CATALOG.map(
      (t) =>
        `${t.id} | ${t.name} | ${t.category} | ${baseUrl}${t.destinationUrl} | ${baseUrl}/guides/${t.slug} | ${t.riskTier} | ${t.executionMode}`,
    ),
  ];

  return new NextResponse(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
