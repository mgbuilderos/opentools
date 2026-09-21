/**
 * Which tool a file handed to us from outside the browser belongs in.
 *
 * Two doors lead here and they must agree:
 *
 * - The **Android share sheet**, which POSTs the file to `/share-target`.
 *   `public/sw.js` answers that POST and cannot import this module — it is
 *   served verbatim out of `public/` with no module graph — so it carries a
 *   copy of the table below, and `lib/share-routing.test.ts` fails the build
 *   if the copy drifts.
 * - A **file handler**, where the installed app is opened by the operating
 *   system with a file already chosen. That arrives as a plain navigation and
 *   is handled by `components/share-target-landing.tsx`, which does import it.
 *
 * The destinations are not invented here. They are the `isPrimary` entry of
 * `SMART_DROPZONE_ACTIONS` — the answer this product already gives to
 * "someone handed us this kind of file, what do they most likely want" — so
 * the share sheet and the home-page dropzone cannot send the same file to two
 * different places.
 */
import {
  SMART_DROPZONE_ACTIONS,
  type DetectedInputType,
} from '@/components/smart-dropzone-actions';

/**
 * The kinds a file can be sorted into from a name and a MIME type alone.
 *
 * A subset of `DetectedInputType`: the rest of that union describes *text* the
 * dropzone recognised by reading it — a timestamp, a colour, a SQL statement —
 * which is not something a shared file announces.
 */
export const SHARE_KINDS = [
  'pdf',
  'image',
  'csv',
  'json',
  'generic-file',
] as const satisfies readonly DetectedInputType[];

export type ShareKind = (typeof SHARE_KINDS)[number];

function primaryDestination(kind: ShareKind): string {
  const actions = SMART_DROPZONE_ACTIONS[kind];
  const primary = actions.find((action) => action.isPrimary) ?? actions[0];
  return primary.href;
}

/** Kind to route, taken from the dropzone's own primary action for that kind. */
export const SHARE_ROUTES: Record<ShareKind, string> = Object.fromEntries(
  SHARE_KINDS.map((kind) => [kind, primaryDestination(kind)]),
) as Record<ShareKind, string>;

const IMAGE_EXTENSIONS = /^(?:png|jpe?g|gif|webp|avif|bmp|heic|heif|tiff?)$/u;

/**
 * Sort a file by what it is called and what it says it is.
 *
 * Extension first, MIME type second, and the reason is the case this whole
 * feature exists for: Android share intents routinely arrive with
 * `application/octet-stream` for a file whose name says plainly what it is,
 * and a document forwarded through a chat app is exactly such a file.
 */
export function shareKindFor(name: string, type: string): ShareKind {
  const extension =
    /\.([a-z0-9]+)$/iu.exec(name ?? '')?.[1]?.toLowerCase() ?? '';
  const mime = (type ?? '').toLowerCase();

  if (extension === 'pdf' || mime === 'application/pdf') return 'pdf';
  if (extension === 'csv' || mime === 'text/csv') return 'csv';
  if (extension === 'json' || mime === 'application/json') return 'json';
  if (IMAGE_EXTENSIONS.test(extension) || mime.startsWith('image/')) {
    return 'image';
  }
  return 'generic-file';
}

/** The route a shared file should open, with no handoff marker attached. */
export function shareDestinationFor(name: string, type: string): string {
  return SHARE_ROUTES[shareKindFor(name, type)];
}

/**
 * The query flag that tells a tool page a handed-over file is waiting for it.
 *
 * The collector normally learns that from a `sessionStorage` marker the
 * dropzone writes on its way out. A service worker has no `sessionStorage`, so
 * a share arrives carrying this instead. See `lib/file-handoff.ts`.
 */
export const HANDOFF_FLAG = 'shared';

/** `/tool?x=1` plus the marker, with whichever separator that needs. */
export function withHandoffFlag(destination: string, origin: string): string {
  const url = new URL(destination, origin);
  url.searchParams.set(HANDOFF_FLAG, '1');
  return `${url.pathname}${url.search}`;
}
