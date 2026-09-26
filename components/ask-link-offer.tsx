'use client';

import { Send } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import {
  buildAskCreatorUrl,
  findAskRequest,
  type AskRequest,
} from '@/lib/tools/ask-link';
import type { RecipeValues } from '@/lib/tools/recipe-link';

/**
 * "Ask someone for this file" — the loop, offered at the one moment it makes
 * sense.
 *
 * WHERE IT SITS AND WHY. Under the finished result, after the save action, as an
 * outline button. Somebody who has just prepared a file to somebody else's
 * specification is the one person on this site who already knows what an ask
 * link is for — they have just been on the receiving end of the problem it
 * solves. That is the moment to offer it, and it is also the moment when
 * interrupting them would be worst, so this is a link and not a dialog: it
 * cannot cover the download, cannot delay it, and does nothing until it is
 * pressed. No modal, no toast, no second ask if it is ignored.
 *
 * WHAT IT CARRIES. The request id and the settings that just ran, filtered by
 * the request's own definition on the way out — `buildAskCreatorUrl`. The
 * creator opens with those settings already filled in, which is the whole
 * saving: the specification was typed once, by the tool.
 *
 * WHY A PLAIN `<a>`. Every navigation in this app is a full page load, which is
 * what lets the file handoff work at all. A router push here would be
 * inconsistent with the rest for no gain.
 */
export function AskLinkOffer({
  requestId,
  values,
  label = 'Ask someone for this file',
}: {
  /** The id of a request declared in `lib/tools/ask-link.ts`. */
  requestId: string;
  /** The settings that just ran. Anything undeclared is dropped. */
  values: RecipeValues;
  label?: string;
}) {
  /*
   * Resolved from the id rather than taken as an object, the same way the
   * completion receipt resolves a recipe: a tool cannot widen what its own
   * request may carry by handing this component a shape it invented. An
   * undeclared id renders nothing at all rather than a link to nowhere.
   */
  const request: AskRequest | null = findAskRequest(requestId);
  if (!request) return null;

  return (
    <div className="mt-3">
      <a
        href={creatorHref(request, values)}
        className={buttonVariants({
          variant: 'outline',
          className: 'h-11 w-full',
        })}
      >
        <Send aria-hidden="true" />
        {label}
      </a>
      <p className="mt-2 text-xs text-muted-foreground">
        Sends one link with these settings. Whoever opens it prepares the file
        on their own device — the link never contains a file.
      </p>
    </div>
  );
}

/**
 * The creator's address, built on the client so the origin is the one the
 * visitor is actually on. During server rendering there is no origin to read, so
 * a relative path is emitted and the absolute form is never needed: this is a
 * link on the same site.
 */
function creatorHref(request: AskRequest, values: RecipeValues): string {
  const origin =
    typeof window === 'undefined'
      ? 'https://getopentools.com'
      : window.location.origin;
  const absolute = buildAskCreatorUrl(request, values, origin);
  const url = new URL(absolute);
  return `${url.pathname}${url.search}`;
}
