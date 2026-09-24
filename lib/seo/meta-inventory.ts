import { readFileSync } from 'node:fs';
import path from 'node:path';

import { practiceBrief } from '../practice-briefs';
import { getAllTemplates } from '../templates/templates-data';
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
import { getAllBlogPosts } from './blog-data';
import { conversionFacts, conversionPairById } from './conversion-pairs';
import { formatFacts, formatHubMeta, formatPairById } from './format-pairs';
import { imagePairFacts, imageSeoPairById } from './image-pairs';
import { getGuideBySlug } from './guide-content';
import { guidesIndexMeta } from './guides-index-meta';
import { hubToolMeta } from './hub-tool-meta';
import { guideCategoryMetaTitle } from './guide-category-meta';
import { TITLE_SUFFIX } from './title-budget';
import { getAllCategoryPillars } from './internal-linking-graph';
import { buildSitemap } from './sitemap-entries';
import { toolSearchCopy } from './tool-search-copy';
import { type ToolPageDepth, toolPageDepth } from './tool-page-depth';

/*
  WHAT THIS FILE IS FOR.

  On 2026-09-23 a sweep of all 1,392 live URLs found 258 descriptions and 77
  titles outside the length a search result will show: `/pdf/extract-pages`
  wrote 199 characters where Google prints about 160, and every `/templates`
  page spent 42 of its title's characters on the suffix
  `| Free Open-Source Template · OpenTools` before saying what the template was.
  Not one unit test could see it, because no test knew what a page's title
  finally *is* -- the strings live in eighteen different modules and the page
  files compose them.

  So this module answers one question for the whole site: for every URL in the
  sitemap, what `<title>` and `<meta name="description">` does it serve? It is
  the input to `meta-lengths.test.ts`, and it is deliberately NOT imported by
  any page: it pulls in every workbench catalogue at once and would drag all of
  them into the client bundle of whichever route imported it.

  HOW IT STAYS HONEST. Nothing here restates a string. Every value is read
  from the module the page itself reads -- the workbench operation, the depth
  entry, the blog post, the conversion pair -- or, for a hand-written page, out
  of that page's own source file. The one composition a page still performs
  (`/guides/category`) lives in `guide-category-meta.ts` and both the page and
  this file call it. A route the resolver cannot answer for is reported rather
  than skipped, so a new route family shows up as a failure instead of as
  silence.
*/

const APP_DIR = path.join(__dirname, '..', '..', 'app');

export interface PageMeta {
  route: string;
  title: string;
  description: string;
  /** Where the strings were read from, so a failure names the file to edit. */
  source: string;
}

type Operation = { id: string; name: string; description: string };

/** Prefix -> the operation catalogues that `app/<prefix>/[tool]/page.tsx` serves. */
const OPERATIONS_BY_PREFIX: Readonly<
  Record<string, readonly (readonly Operation[])[]>
> = {
  '/creator': [CREATOR_OPERATIONS],
  '/data': [SPREADSHEET_OPERATIONS],
  '/date': [DATE_OPERATIONS],
  '/developer': [ADVANCED_DEVELOPER_OPERATIONS, DEVELOPER_DATA_OPERATIONS],
  '/documents': [DOCUMENT_OPERATIONS],
  '/file': [FILE_WORKBENCH_OPERATIONS],
  '/finance': [FINANCE_OPERATIONS],
  '/life-admin': [LIFE_ADMIN_OPERATIONS],
  '/math': [MATH_OPERATIONS],
  '/productivity': [PRODUCTIVITY_OPERATIONS],
  '/qr': [QR_BARCODE_OPERATIONS],
  '/science': [SCIENCE_OPERATIONS],
  '/subtitles': [SUBTITLE_OPERATIONS],
  '/text': [TEXT_OPERATIONS, WRITING_OPERATIONS],
  '/web': [WEB_OPERATIONS],
};

function operationFor(route: string): Operation | undefined {
  const cut = route.lastIndexOf('/');
  const prefix = route.slice(0, cut);
  const id = route.slice(cut + 1);
  for (const list of OPERATIONS_BY_PREFIX[prefix] ?? [])
    for (const operation of list) if (operation.id === id) return operation;
  return undefined;
}

/**
 * The string literal a `title:` or `description:` key is given in a page file.
 *
 * Deliberately narrow: it reads a single quoted literal, optionally wrapped
 * onto the next line, and returns undefined for anything else. An undefined
 * becomes an unresolved route, which the test reports -- a parser that guessed
 * would be worse than one that admits it cannot read the value.
 */
function literalAfter(source: string, key: string): string | undefined {
  const at = source.search(new RegExp(`(^|[{,\\s])${key}:\\s*`, 'm'));
  if (at < 0) return undefined;
  let i = source.indexOf(`${key}:`, at) + key.length + 1;
  while (i < source.length && /\s/.test(source[i]!)) i += 1;
  const quote = source[i];
  if (quote !== "'" && quote !== '"' && quote !== '`') return undefined;
  i += 1;
  let value = '';
  while (i < source.length && source[i] !== quote) {
    if (source[i] === '\\') {
      const next = source[i + 1]!;
      value += next === 'n' ? '\n' : next;
      i += 2;
      continue;
    }
    // A template literal with a hole cannot be read as a constant.
    if (quote === '`' && source[i] === '$' && source[i + 1] === '{')
      return undefined;
    value += source[i];
    i += 1;
  }
  return value;
}

/** The `export const metadata = { ... }` object of a hand-written page file. */
function metadataBlock(file: string): string | undefined {
  let source: string;
  try {
    source = readFileSync(file, 'utf8');
  } catch {
    return undefined;
  }
  const start = source.search(/export const metadata[^=]*=\s*{/);
  if (start < 0) return undefined;
  const i = source.indexOf('{', start);
  let depth = 0;
  for (let j = i; j < source.length; j += 1) {
    if (source[j] === '{') depth += 1;
    else if (source[j] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(i, j + 1);
    }
  }
  return undefined;
}

/**
 * Pages whose metadata is composed rather than written out, and the function
 * that composes it. A page listed here imports the same function, so this is
 * the string the page ships and not a second copy of it. The pattern follows
 * `CANONICAL_HELPERS` in `canonical-coverage.test.ts`: indirection is allowed,
 * an unreadable page is not.
 */
const METADATA_HELPERS: Readonly<
  Record<string, () => { title?: string; description?: string }>
> = {
  '/convert/formats': formatHubMeta,
  '/guides': guidesIndexMeta,
};

/**
 * `title: BRIEF.heading` -- three pages title themselves from the practice
 * brief they are written around, so the heading is resolved from the brief
 * rather than given up on. Without this the route fell through to the
 * workbench catalogue and was measured against a description the page does
 * not serve: `/finance/invoice-generator` read as 123 characters when the
 * live page ships 219.
 */
function briefHeading(source: string, block: string): string | undefined {
  if (!/\btitle:\s*BRIEF\.heading\b/.test(block)) return undefined;
  const id = /practiceBrief\(\s*'([^']+)'\s*\)/.exec(source)?.[1];
  return id ? practiceBrief(id).heading : undefined;
}

/**
 * The two strings a depth entry gives its page.
 *
 * Read off the entry rather than out of `toolPageMetadata`'s `Metadata`,
 * whose `title` is typed as a string, an object or a template -- stringifying
 * that would quietly measure `[object Object]` if the helper ever returned
 * the object form.
 */
function depthMeta(depth: ToolPageDepth): Omit<PageMeta, 'route'> {
  return {
    title: depth.title,
    description: depth.description,
    source: 'lib/seo/tool-page-depth-*.ts',
  };
}

/** A page file's own metadata: whether it claims the route, and what it says. */
interface OwnMeta {
  /** True when a file under `app/` states this route's metadata itself. */
  claimed: boolean;
  meta?: PageMeta;
}

/**
 * A claimed route is never resolved from anywhere else. Falling through to the
 * workbench catalogue when a page file could not be read would measure a
 * string the page does not serve, which is worse than admitting the miss:
 * an unreadable claim is reported as unresolved and fails the guard.
 */
function handWritten(route: string): OwnMeta {
  const helped = METADATA_HELPERS[route]?.() ?? {};
  for (const name of ['page.tsx', 'layout.tsx']) {
    const file = path.join(APP_DIR, route.replace(/^\//, ''), name);
    let source: string;
    try {
      source = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    // A depth page states its metadata through the shared helper.
    const depth = toolPageDepth(route);
    if (source.includes('toolPageMetadata(') && depth) {
      return {
        claimed: true,
        meta: { route, ...depthMeta(depth) },
      };
    }
    const block = metadataBlock(file);
    if (!block) continue;
    const title =
      helped.title ??
      literalAfter(block, 'title') ??
      briefHeading(source, block);
    const description =
      helped.description ?? literalAfter(block, 'description');
    if (title === undefined || description === undefined)
      return { claimed: true };
    return {
      claimed: true,
      meta: { route, title, description, source: path.relative(APP_DIR, file) },
    };
  }
  return { claimed: false };
}

function convertPage(route: string): PageMeta | undefined {
  const slug = route.slice('/convert/'.length);
  const unit = conversionPairById(slug);
  if (unit)
    return {
      route,
      title: unit.title,
      description: conversionFacts(unit).description,
      source: 'lib/seo/conversion-pairs.ts',
    };
  const format = formatPairById(slug);
  if (format)
    return {
      route,
      title: format.title,
      description: formatFacts(format).description,
      source: 'lib/seo/format-pairs.ts',
    };
  const image = imageSeoPairById(slug);
  if (image)
    return {
      route,
      title: image.title,
      description: imagePairFacts(image).description,
      source: 'lib/seo/image-pairs.ts',
    };
  return undefined;
}

const BLOG_BY_SLUG = new Map(
  getAllBlogPosts().map((post) => [post.slug, post]),
);
const TEMPLATE_BY_SLUG = new Map(
  getAllTemplates().map((template) => [template.slug, template]),
);
const PILLAR_BY_HREF = new Map(
  getAllCategoryPillars().map((pillar) => [pillar.href, pillar]),
);

/** What one sitemap route serves, or undefined when nothing here can say. */
export function pageMetaFor(route: string): PageMeta | undefined {
  const own = handWritten(route);
  if (own.meta) return own.meta;
  if (own.claimed) return undefined;

  // `/pdf/rotate-pdf` and its kind have no folder of their own: the `[tool]`
  // route renders them and takes its metadata from the depth map.
  const depth = toolPageDepth(route);
  if (depth) return { route, ...depthMeta(depth) };

  // The LaTeX and schema hubs render one `[tool]` route per tab, from a map
  // both those pages and this file read.
  const hub = hubToolMeta(route);
  if (hub) return { route, ...hub, source: 'lib/seo/hub-tool-meta.ts' };

  if (route.startsWith('/convert/')) return convertPage(route);

  if (route.startsWith('/guides/category/')) {
    const pillar = PILLAR_BY_HREF.get(route);
    if (!pillar) return undefined;
    return {
      route,
      title: guideCategoryMetaTitle(pillar.name),
      description: pillar.description,
      source: 'lib/seo/internal-linking-graph.ts',
    };
  }

  if (route.startsWith('/guides/')) {
    const guide = getGuideBySlug(route.slice('/guides/'.length));
    if (!guide) return undefined;
    return {
      route,
      title: guide.metaTitle,
      description: guide.metaDescription,
      source: 'lib/seo/guide-content.ts',
    };
  }

  if (route.startsWith('/blog/')) {
    const post = BLOG_BY_SLUG.get(route.slice('/blog/'.length));
    if (!post) return undefined;
    return {
      route,
      title: post.title,
      description: post.metaDescription,
      source: 'lib/seo/blog-data.ts',
    };
  }

  if (route.startsWith('/templates/')) {
    const template = TEMPLATE_BY_SLUG.get(route.slice('/templates/'.length));
    if (!template) return undefined;
    return {
      route,
      title: template.title,
      description: template.metaDescription,
      source: 'lib/templates/templates-data.ts',
    };
  }

  const operation = operationFor(route);
  if (operation) {
    const copy = toolSearchCopy(route);
    return {
      route,
      title: copy?.title ?? operation.name,
      description: copy?.description ?? operation.description,
      source: copy
        ? `lib/seo/tool-search-copy.ts (${route})`
        : `lib/tools/ (operation "${operation.id}")`,
    };
  }

  return undefined;
}

/** Every route the sitemap offers, as a path: `''` for the home page. */
export function sitemapRoutes(): readonly string[] {
  const origin = ['https:', '//', 'getopentools.com'].join('');
  return buildSitemap().map((entry) => String(entry.url).slice(origin.length));
}

export interface MetaInventory {
  pages: readonly PageMeta[];
  /** Sitemap routes no resolver above could answer for. */
  unresolved: readonly string[];
}

export function metaInventory(): MetaInventory {
  const pages: PageMeta[] = [];
  const unresolved: string[] = [];
  for (const route of sitemapRoutes()) {
    const meta = pageMetaFor(route === '' ? '/' : route);
    if (meta) pages.push({ ...meta, route: route || '/' });
    else unresolved.push(route || '/');
  }
  return { pages, unresolved };
}

/**
 * React escapes these when it writes the head, so the bytes a crawler reads
 * are longer than the string a page wrote. `Independent Contractor Agreement
 * & Work-for-Hire Contract` is 57 characters in source and 61 on the wire,
 * and that difference alone was the last four titles over the limit after
 * everything else had been fixed. Measuring the source string would have
 * reported them clean.
 */
const ESCAPES: ReadonlyArray<readonly [RegExp, string]> = [
  [/&/g, '&amp;'],
  [/</g, '&lt;'],
  [/>/g, '&gt;'],
  [/"/g, '&quot;'],
  [/'/g, '&#x27;'],
];

function asServed(value: string): string {
  return ESCAPES.reduce((text, [from, to]) => text.replace(from, to), value);
}

/**
 * The title as it is served.
 *
 * `app/layout.tsx` declares `title.template`, and Next applies it to every
 * page below it -- the home page included, because `app/page.tsx` sets a
 * string title rather than `title.absolute`. So the string a page writes is
 * never the string a search result shows, and the twelve characters of the
 * suffix are exactly what pushed 77 titles over the limit.
 */
export function servedTitle(meta: PageMeta): string {
  return asServed(`${meta.title}${TITLE_SUFFIX}`);
}

/** The description as it is served, escaped as the attribute is written. */
export function servedDescription(meta: PageMeta): string {
  return asServed(meta.description);
}
