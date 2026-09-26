/**
 * BUILDS THE COMMAND BAR'S INDEX FROM THE REGISTRIES THAT ALREADY EXIST.
 *
 * Nothing here invents a tool, a name or a description. Every entry is read out
 * of the module the tool's own page reads -- `routedToolIdsForPrefix` for the
 * `[tool]` pages, `shadowedToolOperations` for the ones with a hand-written
 * folder, `publicTools` for the dedicated pages, `TOOL_SEARCH_COPY` for the
 * longer line a search result gets -- so a tool renamed in one place is renamed
 * here, and a tool that does not exist cannot be advertised by the box.
 *
 * LIKE `meta-inventory.ts`, THIS IS NOT FOR A PAGE. It imports every workbench
 * catalogue at once. Two callers only: `scripts/generate-command-index.mjs`,
 * which writes `catalogue.generated.ts`, and `catalogue.test.ts`, which fails
 * when that file drifts from what this function returns today. The browser
 * reads the generated file and never this one.
 */
import { KERNEL_MANIFEST } from '../kernel/manifest';
import type { KernelOperationDescriptor } from '../kernel/types';
import {
  LIVE_TOOL_ROUTES,
  routedToolIdsForPrefix,
  routedToolPrefixes,
  shadowedToolOperations,
} from '../seo/live-tools';
import { CONVERSION_PAIRS } from '../seo/conversion-pairs';
import { toolPageDepth } from '../seo/tool-page-depth';
import { toolSearchCopy } from '../seo/tool-search-copy';
import { publicTools } from '../tools/catalog';
import { contentTokens, joinedForms, tokenize } from './tokens';
import type { CommandCatalogueEntry, CommandOperationRef } from './types';

/**
 * Live tool routes the box deliberately does not offer, each with the reason.
 *
 * This is not a list of tools that are missing something. It is a list of
 * SECOND ADDRESSES for a tool that is already here, and the argument for
 * leaving them out is the one `lib/seo/live-tools.ts` already makes about the
 * menu: two "Compress PDF" rows in one answer is a worse answer than one. The
 * page stays live, stays in the sitemap and keeps its own search traffic.
 *
 * `catalogue.test.ts` requires every other live tool route to be reachable, and
 * requires each entry here to still be a live route -- so a page that is
 * deleted or renamed cannot be quietly excused by this list.
 */
export const NOT_OFFERED: Readonly<Record<string, string>> = {
  '/pdf/compress-offline':
    'A second address for /pdf/compress, for the offline query. Same compressor.',
};

/** A tool before its match terms have been worked out. */
interface Draft {
  href: string;
  name: string;
  summary: string;
  /** Anything else worth matching on: aliases, jobs, the search-result copy. */
  extra: string[];
  /** The workbench operation id this page runs, when it runs one. */
  operationId?: string;
  /** Hrefs that share one operation catalogue, for resolving its kernel source. */
  group: string;
}

const KERNEL_BY_ID = ((): ReadonlyMap<
  string,
  readonly KernelOperationDescriptor[]
> => {
  const byId = new Map<string, KernelOperationDescriptor[]>();
  for (const descriptor of KERNEL_MANIFEST) {
    const existing = byId.get(descriptor.id);
    if (existing) existing.push(descriptor);
    else byId.set(descriptor.id, [descriptor]);
  }
  return byId;
})();

/** `/text/word-count` -> `/text`; `/data/workbench?tool=x` -> `/data/workbench`. */
function groupOf(href: string) {
  const [path = ''] = href.split('?');
  if (href.includes('?')) return path;
  const segments = path.split('/');
  return segments.length > 2 ? `/${segments[1]}` : path;
}

function operationIdOf(href: string) {
  const [, query = ''] = href.split('?');
  const named = new URLSearchParams(query).get('tool');
  if (named) return named;
  const segments = href.split('/');
  return segments.length > 2 ? segments[segments.length - 1] : undefined;
}

/**
 * Which kernel source a group of pages draws its operations from.
 *
 * Nine operation ids exist in two sources each -- `regex-tester` is in both
 * developer lists, `invoice-generator` in the document and finance ones -- and
 * an id alone is ambiguous, which `getOperation` refuses outright. Rather than
 * keep a hand-written prefix-to-source map that nothing would check, the source
 * is the one whose manifest covers the most of the group's ids: `/data`'s 39
 * pages are 39 spreadsheet operations, so `csv-to-json` there is the
 * spreadsheet one, and under `/developer` it is the developer-data one.
 */
function sourcesByGroup(
  drafts: readonly Draft[],
): ReadonlyMap<string, readonly string[]> {
  const idsByGroup = new Map<string, Set<string>>();
  for (const draft of drafts) {
    if (!draft.operationId) continue;
    const ids = idsByGroup.get(draft.group) ?? new Set<string>();
    ids.add(draft.operationId);
    idsByGroup.set(draft.group, ids);
  }

  const ranked = new Map<string, readonly string[]>();
  for (const [group, ids] of idsByGroup) {
    const covered = new Map<string, number>();
    for (const id of ids) {
      for (const descriptor of KERNEL_BY_ID.get(id) ?? []) {
        covered.set(
          descriptor.source,
          (covered.get(descriptor.source) ?? 0) + 1,
        );
      }
    }
    ranked.set(
      group,
      [...covered]
        .sort(
          ([leftSource, left], [rightSource, right]) =>
            right - left || leftSource.localeCompare(rightSource),
        )
        .map(([source]) => source),
    );
  }
  return ranked;
}

function operationRef(
  draft: Draft,
  preferred: readonly string[],
): CommandOperationRef | undefined {
  if (!draft.operationId) return undefined;
  const candidates = KERNEL_BY_ID.get(draft.operationId) ?? [];
  if (!candidates.length) return undefined;
  const chosen =
    candidates.length === 1
      ? candidates[0]
      : preferred
          .flatMap((source) =>
            candidates.filter((candidate) => candidate.source === source),
          )
          .at(0);
  if (!chosen) return undefined;
  // `input: 'none'` operations generate rather than transform -- a QR code, a
  // UUID. They are perfectly good destinations and they are in the index as
  // pages; they are simply never a step something feeds, which is what
  // `lib/pipeline/validate.ts` says too.
  if (chosen.output.kind !== 'text' && chosen.output.kind !== 'files')
    return undefined;
  return {
    id: chosen.id,
    source: chosen.source,
    input: chosen.input,
    output: chosen.output.kind,
  };
}

function drafts(): Draft[] {
  const found = new Map<string, Draft>();
  const add = (draft: Draft) => {
    if (!found.has(draft.href)) found.set(draft.href, draft);
    else found.get(draft.href)!.extra.push(...draft.extra);
  };

  // The dedicated pages, which are the ones with aliases and jobs written for
  // them -- "uppercase converter", "fix capitalization" -- and those are the
  // phrasings a typed sentence actually uses.
  for (const tool of publicTools) {
    add({
      href: tool.href,
      name: tool.name,
      summary: tool.shortDescription,
      extra: [...tool.aliases, ...tool.jobs],
      operationId: operationIdOf(tool.href),
      group: groupOf(tool.href),
    });
  }

  /*
    The unit a converter is asked for by.

    `/convert/miles-to-kilometres` is titled "Convert Miles to Kilometres" and
    described with the same two words, so "5 miles to km" found nothing: `km` is
    the unit's own key in `CONVERSION_SYSTEMS` and appeared nowhere a query could
    reach. Both keys of all 512 unit pairs are added here, which is what makes
    "kg to lb", "cm to inch" and "ml to oz" work at all.
  */
  const unitKeys = new Map<string, readonly string[]>(
    CONVERSION_PAIRS.map((pair) => [
      `/convert/${pair.id}`,
      [pair.from, pair.to],
    ]),
  );

  // Every `[tool]` page: 1,280 of the live routes, including all 631 under
  // `/convert`.
  for (const prefix of routedToolPrefixes()) {
    for (const operation of routedToolIdsForPrefix(prefix) ?? []) {
      const href = `${prefix}/${operation.id}`;
      add({
        href,
        name: operation.name,
        summary: operation.description,
        extra: [...(unitKeys.get(href) ?? [])],
        operationId: operation.id,
        group: prefix,
      });
    }
  }

  // Pages whose folder is hand-written, so the `[tool]` route never generates
  // them -- `/finance/invoice-generator` and the rest of
  // `shadowedToolOperations`. Without these the operation they run is missing
  // from the index even though its page is live and in the sitemap.
  for (const { route, operation } of shadowedToolOperations()) {
    add({
      href: route,
      name: operation.name,
      summary: operation.description,
      extra: [],
      operationId: operation.id,
      group: groupOf(route),
    });
  }

  // The workbench entries. A tool whose own page exists is reached at that
  // page, so only the ones with no page of their own are kept as `?tool=` URLs.
  const routes = new Set<string>(LIVE_TOOL_ROUTES);
  for (const tool of publicTools) {
    for (const entry of tool.searchEntries ?? []) {
      const [path = ''] = entry.href.split('?');
      const prefix = `/${path.split('/')[1]}`;
      if (routes.has(`${prefix}/${entry.id}`)) continue;
      add({
        href: entry.href,
        name: entry.name,
        summary: entry.description,
        extra: [],
        operationId: entry.id,
        group: groupOf(entry.href),
      });
    }
  }

  /*
    THE OPERATIONS WITH NO PAGE AT ALL.

    Ten of the kernel's operations are reachable only through the batch runner:
    `pdfcrypt-decrypt` unlocks a PDF, `email-parse-mbox` reads a mailbox,
    `finance-reconcile` checks a statement's totals, and none of them has a route
    of its own. Measured before this: "remove the password from this pdf" offered
    the AES-GCM file encryptor, which is a different thing done backwards, because
    the tool that does it was in no index.

    They are added at `/batch?tool=<id>`, and `plan.ts` turns that into a one-step
    pipeline link, so the operation arrives already chosen. Nothing here invents a
    capability: every one of these runs today, and `catalogue.test.ts` checks each
    against the manifest like any other entry.
  */
  const claimed = new Set(
    [...found.values()].flatMap((draft) =>
      draft.operationId ? [draft.operationId] : [],
    ),
  );
  for (const descriptor of KERNEL_MANIFEST) {
    if (claimed.has(descriptor.id)) continue;
    add({
      href: `/batch?tool=${descriptor.id}`,
      name: descriptor.name,
      summary: descriptor.description,
      extra: [],
      operationId: descriptor.id,
      group: '/batch',
    });
  }

  /*
    Anything still missing is a page with a hand-written folder that no
    catalogue lists -- `/image/background-remover` and `/image/heic-to-png`,
    whose operations live under a different route's manifest. Their own
    `metadata` comes from `tool-page-depth.ts`, so that is what is read here:
    the title without the search-result tail it adds after the em dash, which is
    boilerplate ("Free, Runs in Your Tab") rather than the tool's name.
  */
  for (const route of LIVE_TOOL_ROUTES) {
    if (found.has(route) || NOT_OFFERED[route]) continue;
    const depth = toolPageDepth(route);
    if (!depth) continue;
    add({
      href: route,
      name: depth.title.split('—')[0]!.trim(),
      summary: depth.description,
      extra: [],
      operationId: operationIdOf(route),
      group: groupOf(route),
    });
  }

  return [...found.values()].filter(
    (draft) =>
      routes.has(draft.href.split('?')[0]!) && !NOT_OFFERED[draft.href],
  );
}

/**
 * A word in half the index cannot tell two tools apart.
 *
 * Measured on this tree: "browser" is in the terms of 48.8% of the 1,367
 * entries, because 632 `/convert` descriptions end "in your browser." -- 6 KB
 * of index that no query is better off for. Nothing else in the terms reaches
 * this cut; "pdf" is 7% and "csv" 4.5%, and both are exactly the kind of word
 * that has to stay.
 *
 * The matcher weighs a rare word above a common one on its own
 * (`match.ts`), so this is about bytes rather than about ranking.
 */
const MAX_TERM_SHARE = 0.25;

/**
 * An alias that is another tool's name is not an alias.
 *
 * A manifest for a page that hosts several operations declares its aliases as
 * `OPERATIONS.map(o => o.name)` and its jobs as their descriptions, and `/batch`
 * -- which can run any of them over a folder -- declares all 640 of the kernel's.
 * Left in, those made the batch runner the best match for "sha-256", and they
 * were 55 KB of the first build, because every one of those operations is
 * already an entry of its own with a page of its own.
 *
 * So an alias is kept only when no tool in this index is called that, and a job
 * only when no tool's description says it. "Open heic on windows" and "fix
 * capitalization" are nobody's name, and those are the ones worth the bytes: the
 * words someone types that the tool's own name does not contain.
 */
function withoutOtherToolsNames(
  drafted: readonly Draft[],
): ReadonlyMap<string, readonly string[]> {
  const taken = new Set<string>();
  for (const draft of drafted) {
    taken.add(tokenize(draft.name).join(' '));
    taken.add(tokenize(draft.summary).join(' '));
  }
  return new Map(
    drafted.map((draft) => [
      draft.href,
      draft.extra.filter((phrase) => !taken.has(tokenize(phrase).join(' '))),
    ]),
  );
}

/** Every live tool, with the words that should find it. */
export function buildCommandCatalogue(): CommandCatalogueEntry[] {
  const all = drafts();
  const sources = sourcesByGroup(all);
  const aliases = withoutOtherToolsNames(all);

  const drafted = all.map((draft) => {
    const copy = toolSearchCopy(draft.href);
    /*
      WHY THE DESCRIPTIONS ARE NOT STORED, ONLY THEIR WORDS.

      A description is prose written to be read on the tool's own page, and this
      index is read by a matcher. Keeping both cost 96 KB of the first build for
      no extra reach: 632 of the entries are `/convert` pages whose description
      is their own name with " in your browser." after it.

      So the words go in and the sentences stay where they were written. Each
      entry holds its name -- which is what a row in an answer shows -- and every
      match word that name does not already contain: the description's, the
      hand-written aliases and jobs, and the search-result copy, which is written
      to BE the answer to a query and is the best match text on the site.
      Deduplicated and sorted, so regenerating after an unrelated edit produces
      no diff.
    */
    const extra = [
      draft.summary,
      ...(aliases.get(draft.href) ?? []),
      copy?.title ?? '',
      copy?.description ?? '',
      // The address is a word people type: `/batch` is called "The Bench" and
      // described as running operations over a folder, and "batch" appears in
      // neither. Where the slug is already in the name -- which is most of them
      // -- these tokens are deduplicated away and cost nothing.
      (draft.href.split('?')[0] ?? '')
        .split('/')
        .slice(-1)
        .join(' ')
        .replace(/-/gu, ' '),
      // "Wi-Fi" answers to "wifi", on this side and in the query.
      joinedForms(`${draft.name} ${draft.summary}`).join(' '),
    ];
    const known = new Set(tokenize(draft.name));
    const terms = [
      ...new Set(
        contentTokens(extra.join(' ')).filter((token) => !known.has(token)),
      ),
    ].sort();
    const op = operationRef(draft, sources.get(draft.group) ?? []);
    return { href: draft.href, name: draft.name, terms, op };
  });

  const frequency = new Map<string, number>();
  for (const entry of drafted)
    for (const term of entry.terms)
      frequency.set(term, (frequency.get(term) ?? 0) + 1);
  const ceiling = drafted.length * MAX_TERM_SHARE;

  return drafted
    .map((entry) => ({
      href: entry.href,
      name: entry.name,
      terms: entry.terms
        .filter((term) => (frequency.get(term) ?? 0) <= ceiling)
        .join(' '),
      ...(entry.op
        ? { op: `${entry.op.source} ${entry.op.input} ${entry.op.output}` }
        : {}),
    }))
    .sort((left, right) => left.href.localeCompare(right.href));
}
