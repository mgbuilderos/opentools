import { NextResponse } from 'next/server';
import { LIVE_TOOL_CATALOG } from '@/lib/seo/live-tools';

const baseUrl = ['https:', '//', 'getopentools.com'].join('');

export const dynamic = 'force-static';

export async function GET() {
  const lines = [
    `# OpenTools machine-readable catalog (${LIVE_TOOL_CATALOG.length} working tools)`,
    `# Canonical URL: ${baseUrl}`,
    `# Every tool below runs in the visitor's own browser tab. Files and inputs`,
    `# are not sent to a server. Only tools that work are listed.`,
    `# Format: ID | Name | Category | Tool URL | Guide URL | Execution mode`,
    ``,
    ...LIVE_TOOL_CATALOG.map(
      (t) =>
        `${t.id} | ${t.name} | ${t.category} | ${baseUrl}${t.destinationUrl} | ${baseUrl}/guides/${t.slug} | ${t.executionMode}`,
    ),
  ];

  return new NextResponse(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
