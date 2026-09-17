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
  '/pdf/sign',
  '/image/editor',
  '/image/background-remover',
  '/image/optimize',
  '/data/csv-to-json',
  '/data/json',
  '/file/hash-calculator',
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
  ['/text/workbench', ids(TEXT_OPERATIONS)],
  ['/text/writing', ids(WRITING_OPERATIONS)],
  ['/web/workbench', ids(WEB_OPERATIONS)],
  ['/pdf/page-tools', new Set(PDF_PAGE_TOOL_OPERATION_IDS)],
  ['/image/editor', imageEditorIds],
  ['/image/background-remover', imageEditorIds],
]);

/** Every route that renders a working tool. */
export const LIVE_TOOL_ROUTES: readonly string[] = [
  ...new Set<string>([
    ...DEDICATED_TOOL_ROUTES,
    ...OPERATION_IDS_BY_ROUTE.keys(),
  ]),
];

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
