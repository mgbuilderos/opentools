import { NextResponse } from 'next/server';

import { buildWhatsNewFeed } from '@/lib/seo/whats-new';

export const dynamic = 'force-static';

/**
 * The subscription mechanism for `/whats-new`.
 *
 * RSS rather than email: a mailing list needs a server, an address list and a
 * record of who reads what, which are the three things this product exists not
 * to have. A feed costs nothing to serve and tells us nothing about the reader.
 */
export async function GET() {
  return new NextResponse(buildWhatsNewFeed(), {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
