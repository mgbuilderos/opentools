import { IMAGE_EDITOR_OPERATIONS } from '../tools/catalog';
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
  '/pdf/to-word',
  '/pdf/to-excel',
  '/pdf/sign',
  '/image/editor',
  '/image/background-remover',
  '/image/optimize',
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
 * Flatten, PDF-to-images, reverse and split ranges are listed elsewhere but
 * have no control on that page, so they are not live.
 */
const PDF_PAGE_TOOL_OPERATION_IDS = [
  'rotate-pdf',
  'reorder-pdf-pages',
  'delete-pdf-pages',
  'pdf-page-numbers',
  'pdf-watermark',
  'pdf-metadata-editor',
];

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
    ['/finance', FINANCE_OPERATIONS],
    ['/life-admin', LIFE_ADMIN_OPERATIONS],
    ['/math', MATH_OPERATIONS],
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
 * here as well — `generateStaticParams` excludes the same ids.
 */
const DEDICATED_ROUTE_SET = new Set<string>(DEDICATED_TOOL_ROUTES);

const ROUTED_TOOL_ROUTES = [...ROUTED_TOOL_PREFIXES].flatMap(
  ([prefix, operations]) =>
    operations
      .map((operation) => `${prefix}/${operation.id}`)
      .filter((route) => !DEDICATED_ROUTE_SET.has(route)),
);

/** Every route that renders a working tool. */
export const LIVE_TOOL_ROUTES: readonly string[] = [
  ...new Set<string>([
    ...DEDICATED_TOOL_ROUTES,
    ...OPERATION_IDS_BY_ROUTE.keys(),
    ...ROUTED_TOOL_ROUTES,
  ]),
];

/** The operations a `[tool]` route generates a page for, by prefix. */
export function routedToolIdsForPrefix(prefix: string) {
  return ROUTED_TOOL_PREFIXES.get(prefix);
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
