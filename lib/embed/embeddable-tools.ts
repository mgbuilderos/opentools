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
