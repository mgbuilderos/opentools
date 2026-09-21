import {
  GUIDE_CONSOLIDATION,
  type GuideConsolidationState,
  consolidatedGuideRedirect,
} from './guide-consolidation';
import { removedToolRedirect } from './removed-tool-redirects';

export interface SiteRedirect {
  location: string;
  status: 301 | 308;
}

/**
 * The one redirect a path gets, resolved to its final page so a visitor never
 * follows a chain.
 *
 * - Removed tools keep their 308 (lib/seo/removed-tool-redirects.ts). When the
 *   page they point at is a consolidated guide, they point at its tool page.
 * - Consolidated guides use 301 because the owner asked for 301. Both codes
 *   are permanent and search engines treat them the same; 308 only adds that a
 *   client must not turn a POST into a GET, which cannot matter for a GET-only
 *   guide page.
 *
 * `search` is the request's own query string: `removedToolRedirect` needs it to
 * recognise a removed `?tool=` operation on a route that is still live.
 */
export function siteRedirect(
  pathname: string,
  search = '',
  consolidation: GuideConsolidationState = GUIDE_CONSOLIDATION,
): SiteRedirect | null {
  const removed = removedToolRedirect(pathname, search);
  if (removed) {
    return {
      location: consolidatedGuideRedirect(removed, consolidation) ?? removed,
      status: 308,
    };
  }
  const guide = consolidatedGuideRedirect(pathname, consolidation);
  return guide ? { location: guide, status: 301 } : null;
}
