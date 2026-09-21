import { NextResponse } from 'next/server';
import { buildLlmsTxt } from '@/lib/seo/llms-text';

export const dynamic = 'force-static';

export async function GET() {
  return new NextResponse(buildLlmsTxt(), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
