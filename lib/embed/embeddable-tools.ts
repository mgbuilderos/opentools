import { TABLE_FORMAT_LABELS } from './table-formats';

/**
 * Which tools another website may frame, and the one place that answers it.
 *
 * `app/embed/[tool]/page.tsx`, the snippet page at `app/embed/page.tsx`, the
 * sitemap and the tests all read this list, so a tool is embeddable exactly
 * when it appears here -- there is no second switch to forget.
 *
 * ## The rule for adding one, and it is narrow on purpose
 *
 * An embeddable tool must be **text in, text out**. No file input, no
 * dropzone, no camera, no clipboard read, no support or donation prompt. That
 * is not a style preference: an embed runs inside a page we do not control and
 * cannot see, and a file picker in that position asks a visitor to hand a
 * document to a frame whose surrounding page may be misrepresenting it. Text a
 * visitor pastes is text they chose to paste after reading our own visible
 * header. See `decisions/ADR-019-embed-frame-ancestors.md` §4.
 *
 * `lib/embed/embeddable-tools.test.ts` fails if an entry names a component
 * outside the allowed set, so widening this is a deliberate code change and
 * not an oversight.
 */
export interface EmbeddableTool {
  /** URL segment: the tool is served at `/embed/<slug>`. */
  slug: string;
  /** Shown in the embed's own header, and in the snippet page's list. */
  name: string;
  /** One line, for the snippet page. Not a page description. */
  summary: string;
  /**
   * The page the attribution link points at. This is the whole economic point
   * of the programme: every embed is a permanent, contextual link to a page we
   * want to rank. It must be a real, live, canonical route.
   */
  canonicalPath: string;
  /** Default `height` in the iframe snippet, in CSS pixels. */
  defaultHeight: number;
}

export const EMBEDDABLE_TOOLS: readonly EmbeddableTool[] = [
  {
    slug: 'table-converter',
    name: 'Table Converter',
    summary: `Paste a table in any of ${
      Object.keys(TABLE_FORMAT_LABELS).length
    } notations and get it back in any other — LaTeX booktabs, Markdown, CSV, SQL and the rest. No upload.`,
    canonicalPath: '/latex/table-generator',
    defaultHeight: 620,
  },
  /*
   * The four below are option-free `TEXT_OPERATIONS`, served by the one generic
   * `EmbedTextOperation` component. They were chosen from the 24 that qualify
   * on one question -- would a site owner actually host this? -- rather than on
   * how easy each was to add, which was identical for all 24.
   *
   *   word-counter / character-counter  every writing and social-scheduling
   *                                     page has a use for these, and they are
   *                                     the two most-embedded text widgets on
   *                                     the web.
   *   reading-time                      blogs put "N min read" above the fold.
   *   slug-generator                    CMS and publishing workflows.
   *
   * Adding a fifth is a line here and a line in `EMBED_COMPONENTS`. Anything
   * with an `optionKind` is not eligible -- see `embed-text-operation.tsx`.
   */
  {
    slug: 'word-counter',
    name: 'Word Counter',
    summary:
      'Paste a draft and get the word count back as you type. Nothing is sent anywhere.',
    canonicalPath: '/text/word-counter',
    defaultHeight: 440,
  },
  {
    slug: 'character-counter',
    name: 'Character Counter',
    summary:
      'Characters with and without spaces — for meta descriptions, post limits and form fields.',
    canonicalPath: '/text/character-counter',
    defaultHeight: 440,
  },
  {
    slug: 'reading-time',
    name: 'Reading Time',
    summary:
      'How long a piece takes to read at 225 words per minute, in seconds for short pieces.',
    canonicalPath: '/text/reading-time',
    defaultHeight: 440,
  },
  {
    slug: 'slug-generator',
    name: 'Slug Generator',
    summary:
      'Turn a headline into a lowercase URL slug: accents stripped to ASCII, everything else hyphenated.',
    canonicalPath: '/text/slug-generator',
    defaultHeight: 400,
  },
] as const;

export function embeddableTool(slug: string): EmbeddableTool | undefined {
  return EMBEDDABLE_TOOLS.find((tool) => tool.slug === slug);
}

/**
 * The snippet a site owner copies. A plain `<iframe>` and nothing else -- no
 * script tag, so there is nothing for us to change under an embedder later and
 * nothing of theirs for us to read. `loading="lazy"` keeps an embed off the
 * critical path of the page hosting it, which is the difference between being
 * kept and being removed for hurting a Core Web Vitals score.
 *
 * The `title` is not decoration: a frame with no accessible name is an
 * unlabelled landmark to a screen reader, and embedders will not add one.
 */
export function embedSnippet(tool: EmbeddableTool, origin: string): string {
  return [
    `<iframe src="${origin}/embed/${tool.slug}"`,
    `        title="${tool.name} — OpenTools"`,
    `        width="100%" height="${tool.defaultHeight}"`,
    '        style="border:1px solid #e5e7eb;border-radius:12px;max-width:100%"',
    '        loading="lazy"></iframe>',
  ].join('\n');
}

/**
 * The embeddable tool whose own page this is, or `undefined`.
 *
 * WHY THIS EXISTS. Until 2026-09-30 the embed programme had no entry point:
 * `/embed` was live, it was in the sitemap, and **not one of the 1,031 pages on
 * the site linked to it**. Measured that day against production — `curl` of
 * `/pdf/redact`, `/data/csv-join` and `/math/median-calculator` returned no
 * `/embed` link at all, and Cloudflare recorded a single request to `/embed` in
 * 24 hours. A channel whose whole economics is other people's sites carrying a
 * permanent link back cannot start from a page nobody can reach.
 *
 * Keyed on the pathname rather than a tool id on purpose: `canonicalPath` is
 * already the field this list guarantees is "a real, live, canonical route",
 * so there is no second mapping to keep in step and nothing to forget when a
 * tool is added. `components/embed-this-tool.tsx` is the only caller.
 *
 * EXACT MATCH ONLY, including no trailing slash and no locale prefix. A
 * localised edition at `/de/...` deliberately does not offer this: the snippet
 * page and the embed header are English, so sending a German reader there would
 * be a worse experience than not offering it. `embed-entry-point.test.ts` pins
 * both halves of that.
 */
export function embeddableToolByPath(
  pathname: string,
): EmbeddableTool | undefined {
  return EMBEDDABLE_TOOLS.find((tool) => tool.canonicalPath === pathname);
}
