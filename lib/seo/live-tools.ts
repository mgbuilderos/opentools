import { IMAGE_EDITOR_OPERATIONS, PDF_PAGE_OPERATIONS } from '../tools/catalog';
import { CREATOR_OPERATIONS } from '../tools/creator-workbench';
import { DATE_OPERATIONS } from '../tools/date-workbench';
import { ADVANCED_DEVELOPER_OPERATIONS } from '../tools/developer-advanced-workbench';
import { DEVELOPER_DATA_OPERATIONS } from '../tools/developer-data-workbench';
import { DOCUMENT_OPERATIONS } from '../tools/document-workbench';
import { FILE_WORKBENCH_OPERATIONS } from '../tools/file-workbench';
import { FINANCE_OPERATIONS } from '../tools/finance-business-workbench';
import { LIFE_ADMIN_OPERATIONS } from '../tools/life-admin-workbench';
import { MATH_OPERATIONS } from '../tools/math-workbench';
import { PRODUCTIVITY_OPERATIONS } from '../tools/productivity-workbench';
import { QR_BARCODE_OPERATIONS } from '../tools/qr-barcode-workbench';
import { SCIENCE_OPERATIONS } from '../tools/science-education-workbench';
import { SPREADSHEET_OPERATIONS } from '../tools/spreadsheet-workbench';
import { SUBTITLE_OPERATIONS } from '../tools/subtitle-workbench';
import { TEXT_OPERATIONS } from '../tools/text-workbench';
import { WEB_OPERATIONS } from '../tools/web-workbench';
import { WRITING_OPERATIONS } from '../tools/writing-workbench';
import { TOOL_CATALOG, type ToolCatalogEntry } from './tool-catalog-data';

/** Routes that render one complete tool page. */
export const DEDICATED_TOOL_ROUTES = [
  '/pdf/merge',
  '/pdf/extract-pages',
  '/pdf/images-to-pdf',
  '/pdf/page-tools',
  '/pdf/compress',
  '/pdf/ocr',
  '/pdf/to-word',
  '/pdf/to-excel',
  '/pdf/sign',
  '/image/editor',
  '/image/background-remover',
  '/image/optimize',
  '/image/to-text',
  '/audio/mp3-toolkit',
  '/audio/convert',
  '/video/trim',
  '/image/exact-size',
  '/data/excel',
  '/image/metadata',
  // '/image/svg', '/image/colour', '/data/lists' -- Antigravity phases 4 and 5.
  // Deliberately unregistered: the owner asked on 2026-09-20 that no new tool is
  // published before a tech review, and registering one puts it in the sitemap,
  // gives it a guide page and makes every CTA offer it on the next deploy. The
  // pages are built and pass their tests; only publication is held. Re-register
  // by deleting this comment and restoring the three routes, and remove the
  // matching entries from HELD_BACK in lib/seo/tool-page-registration.test.ts.
  '/documents/metadata',
  '/pdf/bates',
  '/pdf/redact',
  '/web/file-to-html',
  '/data/csv-to-json',
  '/data/json',
  '/file/hash-calculator',
  '/file/archive',
  '/text/case-converter',
  '/developer/base64-encoder',
  '/developer/base64-decoder',
  '/developer/unix-timestamp',
  '/developer/uuid-generator',
  '/math/percentage-calculator',
  '/date/age-calculator',
  '/date/date-difference',
] as const;

/**
 * Controls on the combined PDF page tool (components/pdf-page-tools.tsx).
 *
 * 66 catalogue entries point at `/pdf/page-tools`; six of them name something
 * the page has a control for. Flatten, PDF-to-images, reverse, split ranges and
 * the other 60 are listed elsewhere but have no control there, so they are not
 * live and must never be given a page — a page whose title promises a tool the
 * component cannot run is worse than no page.
 *
 * This is the same list `PDF_PAGE_OPERATIONS` already holds with names and
 * descriptions, so it is read from there rather than typed out a second time:
 * the route that generates the pages and the registry that publishes them now
 * cannot disagree about which six exist.
 */
const PDF_PAGE_TOOL_OPERATION_IDS = PDF_PAGE_OPERATIONS.map(({ id }) => id);

const ids = (operations: readonly { id: string }[]) =>
  new Set(operations.map(({ id }) => id));

const imageEditorIds = ids(IMAGE_EDITOR_OPERATIONS);

/** Operation ids each route really runs, taken from the code that renders it. */
const OPERATION_IDS_BY_ROUTE = new Map<string, ReadonlySet<string>>([
  ['/creator/workbench', ids(CREATOR_OPERATIONS)],
  ['/data/workbench', ids(SPREADSHEET_OPERATIONS)],
  ['/date/workbench', ids(DATE_OPERATIONS)],
  ['/developer/advanced', ids(ADVANCED_DEVELOPER_OPERATIONS)],
  ['/developer/workbench', ids(DEVELOPER_DATA_OPERATIONS)],
  ['/documents/workbench', ids(DOCUMENT_OPERATIONS)],
  ['/file/workbench', ids(FILE_WORKBENCH_OPERATIONS)],
  ['/finance/workbench', ids(FINANCE_OPERATIONS)],
  ['/life-admin/workbench', ids(LIFE_ADMIN_OPERATIONS)],
  ['/math/workbench', ids(MATH_OPERATIONS)],
  ['/productivity/workbench', ids(PRODUCTIVITY_OPERATIONS)],
  ['/qr/workbench', ids(QR_BARCODE_OPERATIONS)],
  ['/science/workbench', ids(SCIENCE_OPERATIONS)],
  ['/subtitles/workbench', ids(SUBTITLE_OPERATIONS)],
  ['/text/workbench', ids(TEXT_OPERATIONS)],
  ['/text/writing', ids(WRITING_OPERATIONS)],
  ['/web/workbench', ids(WEB_OPERATIONS)],
  ['/pdf/page-tools', new Set(PDF_PAGE_TOOL_OPERATION_IDS)],
  ['/image/editor', imageEditorIds],
  ['/image/background-remover', imageEditorIds],
  [
    '/audio/mp3-toolkit',
    new Set(['mp3-cut', 'mp3-join', 'mp3-tags', 'mp3-inspect']),
  ],
]);

/**
 * Prefixes that have an `app/<prefix>/[tool]/page.tsx`, and the operations it
 * generates a page for.
 *
 * A workbench answers on one URL with one title for every operation it hosts,
 * so none of them can rank for its own name and none reach the sitemap — a
 * query parameter is not a page. 533 of this site's tools were addressed that
 * way. Each prefix below is now off that pattern: every operation has
 * `/<prefix>/<id>` of its own.
 *
 * Two workbenches can share a prefix (`/text` and `/developer` each have two),
 * so a prefix takes the union of their operations; the route file resolves an
 * id that appears in both to one component, first source wins.
 *
 * Derived from the operation lists rather than typed out, so a tool cannot be
 * added to a workbench and silently left without an address — the failure this
 * whole change exists to stop.
 *
 * `/file`, `/image` and `/pdf` were the last three on the query parameter, and
 * they are the awkward ones: `/image` and `/pdf` already hold nine and seven
 * hand-written folders between them, and a literal folder always beats a
 * dynamic segment. The ids each prefix generates are therefore filtered
 * against `DEDICATED_TOOL_ROUTES` below, in the same expression that builds
 * the registry, so the registry can never promise a page the build skipped.
 * Only `PDF_PAGE_OPERATIONS` is listed for `/pdf`, not the 66 catalogue
 * entries aimed at that URL: see the note on `PDF_PAGE_TOOL_OPERATION_IDS`.
 */
const ROUTED_TOOL_PREFIXES: ReadonlyMap<string, readonly { id: string }[]> =
  new Map<string, readonly { id: string }[]>([
    ['/creator', CREATOR_OPERATIONS],
    ['/data', SPREADSHEET_OPERATIONS],
    ['/date', DATE_OPERATIONS],
    [
      '/developer',
      [...ADVANCED_DEVELOPER_OPERATIONS, ...DEVELOPER_DATA_OPERATIONS],
    ],
    ['/documents', DOCUMENT_OPERATIONS],
    ['/file', FILE_WORKBENCH_OPERATIONS],
    ['/finance', FINANCE_OPERATIONS],
    ['/image', IMAGE_EDITOR_OPERATIONS],
    ['/life-admin', LIFE_ADMIN_OPERATIONS],
    ['/math', MATH_OPERATIONS],
    ['/pdf', PDF_PAGE_OPERATIONS],
    ['/productivity', PRODUCTIVITY_OPERATIONS],
    ['/qr', QR_BARCODE_OPERATIONS],
    ['/science', SCIENCE_OPERATIONS],
    ['/subtitles', SUBTITLE_OPERATIONS],
    ['/text', [...TEXT_OPERATIONS, ...WRITING_OPERATIONS]],
    ['/web', WEB_OPERATIONS],
  ]);

/**
 * A literal folder always wins over a dynamic segment, so an id that already
 * has its own hand-written page is served by that page and must not be claimed
 * here as well — `generateStaticParams` excludes the same ids, through the same
 * `excludedToolIdsForPrefix` this reads.
 */
/**
 * An operation that two workbenches both host gets exactly ONE page.
 *
 * `json-to-csv` is in both the spreadsheet and developer-data lists, and
 * `url-normalizer` in both developer-data and web. Generating a page under
 * each prefix produced two URLs with the same title running the same tool —
 * duplicate content, which splits whatever ranking either would have earned
 * and leaves a search engine to pick a canonical for us. Found by auditing
 * titles across the built site rather than by any test, so the audit is now a
 * test.
 *
 * The owner is chosen by what the tool is for, not by position in the map, so
 * reordering `ROUTED_TOOL_PREFIXES` cannot silently move a live URL.
 */
const CROSS_PREFIX_OWNER: ReadonlyMap<string, string> = new Map([
  // Data shape conversions belong with the spreadsheet tools; `/data/csv-to-json`
  // already has a hand-written page, so its sibling belongs there too.
  ['csv-to-json', '/data'],
  ['json-to-csv', '/data'],
  // URL tools travel together, and someone searching for any of the three is
  // doing web work rather than general development.
  ['url-normalizer', '/web'],
  ['query-string-builder', '/web'],
  ['query-string-parser', '/web'],
  // Billing documents: the search intent is money, not document formatting.
  ['invoice-generator', '/finance'],
  ['receipt-generator', '/finance'],
  ['timesheet-calculator', '/finance'],
]);

const ROUTED_TOOL_ROUTES = [...ROUTED_TOOL_PREFIXES].flatMap(
  ([prefix, operations]) => {
    const excluded = excludedToolIdsForPrefix(prefix);
    return operations
      .filter((operation) => !excluded.has(operation.id))
      .map((operation) => `${prefix}/${operation.id}`);
  },
);

/** Every route that renders a working tool. */
export const LIVE_TOOL_ROUTES: readonly string[] = [
  ...new Set<string>([
    ...DEDICATED_TOOL_ROUTES,
    ...OPERATION_IDS_BY_ROUTE.keys(),
    ...ROUTED_TOOL_ROUTES,
  ]),
];

/** Every prefix that has an `app/<prefix>/[tool]/page.tsx`. */
export function routedToolPrefixes(): readonly string[] {
  return [...ROUTED_TOOL_PREFIXES.keys()];
}

/**
 * The operations a `[tool]` route actually generates a page for.
 *
 * Exclusions are applied here rather than by each caller: this is what the
 * registry publishes, what `generateStaticParams` writes and what the
 * registration scan checks, so all three read one answer and a tool cannot be
 * orphaned by one of them disagreeing.
 */
export function routedToolIdsForPrefix(prefix: string) {
  const operations = ROUTED_TOOL_PREFIXES.get(prefix);
  if (!operations) return operations;
  const excluded = excludedToolIdsForPrefix(prefix);
  // Deduplicated by id, first source wins, because two workbenches under the
  // SAME prefix can host the same operation -- `regex-tester` is in both the
  // advanced and data developer lists. The route file resolves it the same way,
  // so the registry and the build agree on which component answers.
  return [
    ...new Map(
      operations
        .filter((operation) => !excluded.has(operation.id))
        .map((operation) => [operation.id, operation]),
    ).values(),
  ];
}

/**
 * Ids a `[tool]` route under `prefix` must NOT generate.
 *
 * Two reasons an id is excluded. First, it already has its own hand-written
 * folder: a literal segment beats a dynamic one, so `app/pdf/merge/page.tsx`
 * answers `/pdf/merge` and `app/pdf/[tool]/page.tsx` never sees it, and
 * listing it would ask the build for a page already spoken for. Second,
 * another prefix owns it — see `CROSS_PREFIX_OWNER`.
 *
 * The registry and every route's `generateStaticParams` read this one
 * function, so the sitemap and the built files cannot drift apart.
 *
 * Nested routes are ignored: only a single segment under the prefix can
 * collide with a `[tool]` slug.
 */
export function excludedToolIdsForPrefix(prefix: string): ReadonlySet<string> {
  const excluded = new Set(
    DEDICATED_TOOL_ROUTES.filter((route) =>
      route.startsWith(`${prefix}/`),
    ).flatMap((route) => {
      const id = route.slice(prefix.length + 1);
      return id.includes('/') ? [] : [id];
    }),
  );
  for (const [id, owner] of CROSS_PREFIX_OWNER) {
    if (owner !== prefix) excluded.add(id);
  }
  return excluded;
}

/** Operation ids the route runs, or undefined for a single-tool route. */
export function operationIdsForRoute(route: string) {
  return OPERATION_IDS_BY_ROUTE.get(route);
}

/**
 * True when the URL opens a working tool: the route exists and, when it names
 * a `?tool=` operation, that route really runs it. Unknown operations would
 * otherwise fall back silently to a different tool.
 */
export function isLiveToolUrl(url: string) {
  const [path, query = ''] = url.split('?');
  if (!LIVE_TOOL_ROUTES.includes(path)) return false;
  const operationId = new URLSearchParams(query).get('tool');
  if (operationId === null) return true;
  return OPERATION_IDS_BY_ROUTE.get(path)?.has(operationId) ?? false;
}

/** Catalog entries whose guide leads to a working tool. */
export const LIVE_TOOL_CATALOG: readonly ToolCatalogEntry[] =
  TOOL_CATALOG.filter((tool) => isLiveToolUrl(tool.destinationUrl));

const LIVE_TOOL_BY_SLUG: ReadonlyMap<string, ToolCatalogEntry> = new Map(
  LIVE_TOOL_CATALOG.map((tool) => [tool.slug, tool]),
);

/** The tool behind a guide slug, or undefined when that tool is not live. */
export function getLiveToolBySlug(slug: string) {
  return LIVE_TOOL_BY_SLUG.get(slug);
}

/** Live tools in a category; empty when the category has none left. */
export function getLiveToolsByCategory(category: string) {
  return LIVE_TOOL_CATALOG.filter((tool) => tool.category === category);
}

/** Categories that still have at least one live tool. */
export function getLiveCategories(): string[] {
  return [...new Set(LIVE_TOOL_CATALOG.map((tool) => tool.category))];
}
