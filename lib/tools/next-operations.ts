/**
 * What to do next with the file a tool just produced.
 *
 * THE MEASURED PROBLEM. On 24 September 939 people arrived and **one** of them
 * opened a second content page; across 26–29 September the figure was 115 of
 * 1282, 56 of 652, 91 of 501 and 169 of 548 (`docs/traffic-log.csv`, the
 * 2+-different-content-pages column). A finished job ends in a download and a
 * dead end, even when the next thing the person needs is a tool that is already
 * here. The receipt is the only place that can fix it, because it is the one
 * moment the produced file is still in hand.
 *
 * WHERE THE CANDIDATES COME FROM, AND WHY NOT THE KERNEL.
 * `KernelOperationDescriptor` declares `input` as a *kind* only — `text`,
 * `file`, `files` or `none` — and `output` as `{ kind, extension? }`. Nothing
 * in `lib/kernel/` records which file types an operation will accept, so
 * "which tools can act on this PDF" is not a question the manifest can answer:
 * every operation whose input is `file` would qualify, and a PDF would be
 * offered to an MP3 frame reader. The table that does answer it is
 * `SMART_DROPZONE_ACTIONS` — curated per file type, and already held to
 * `isLiveToolUrl()` by `components/smart-dropzone-actions.test.ts`.
 *
 * `lib/seo/related-tools.ts` is deliberately not used. It is an internal
 * linking graph built for search engines; it relates pages by subject rather
 * than by what they can open, so it would happily offer a tool that cannot
 * read the file.
 *
 * THE CLASSIFIER IS BORROWED WHOLE, not reimplemented. `shareKindFor` already
 * sorts a file by name and MIME type for the Android share sheet, extension
 * first, because a forwarded document routinely arrives as
 * `application/octet-stream`. A file this site just produced is the same
 * problem, and answering it twice is how two answers start disagreeing.
 */
import {
  SMART_DROPZONE_ACTIONS,
  type DetectedAction,
} from '@/components/smart-dropzone-actions';
import { isLiveToolUrl } from '@/lib/seo/live-tool-routes';
import { shareKindFor } from '@/lib/share-routing';

/** Just enough of a produced file to sort it. The bytes are not needed here. */
export interface ProducedFile {
  name: string;
  type: string;
}

export interface NextOperation {
  label: string;
  href: string;
}

/**
 * Three.
 *
 * The receipt already carries a share and a support ask, and a list long
 * enough to need reading is a list that gets skipped — which would cost the
 * one ask on this card that compounds. Three is also what every kind in
 * `SMART_DROPZONE_ACTIONS` can supply after the current tool is removed.
 */
export const NEXT_OPERATION_LIMIT = 3;

/**
 * What makes two links the same tool.
 *
 * Path plus `tool`, and nothing else. Four of the six PDF actions live on
 * `/pdf/page-tools` under different `tool` values, so comparing paths alone
 * would drop every sibling operation on a workbench and leave a PDF with
 * almost nothing to go to. Comparing whole hrefs instead would fail the
 * opposite way: the current page's URL can carry recipe parameters the action
 * list knows nothing about, and the tool just used would be offered back.
 */
function identity(href: string): string {
  const [rawPath = '', query = ''] = href.split('?');
  const path =
    rawPath.length > 1 && rawPath.endsWith('/')
      ? rawPath.slice(0, -1)
      : rawPath;
  const tool = new URLSearchParams(query).get('tool');
  return tool ? `${path}?tool=${tool}` : path;
}

/**
 * The tools that can open the file this job just produced, minus the one that
 * produced it, capped at `limit`.
 *
 * `currentHref` is the finished tool's own location — path and query — so that
 * a workbench does not offer the operation the person has just run.
 *
 * Returns an empty list rather than throwing for anything unrecognised. An
 * empty list renders as no section at all, which is what the receipt looked
 * like before this existed, so there is no state in which a visitor is offered
 * a tool that cannot read their file.
 */
export function nextOperations(
  produced: ProducedFile,
  currentHref: string,
  limit: number = NEXT_OPERATION_LIMIT,
): readonly NextOperation[] {
  if (limit <= 0) return [];

  const here = identity(currentHref);
  const candidates: readonly DetectedAction[] =
    SMART_DROPZONE_ACTIONS[shareKindFor(produced.name, produced.type)];

  const offers: NextOperation[] = [];
  const taken = new Set<string>();

  for (const action of candidates) {
    if (offers.length >= limit) break;
    const id = identity(action.href);
    if (id === here || taken.has(id)) continue;
    // Defence in depth: the dropzone's own test already holds this list to
    // live routes, but a tool withdrawn between the two would otherwise be
    // advertised on a receipt, which is a promise made at the worst moment.
    if (!isLiveToolUrl(action.href)) continue;
    taken.add(id);
    offers.push({ label: action.label, href: action.href });
  }

  return offers;
}
