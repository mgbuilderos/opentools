/**
 * WHAT THE COMMAND BAR NEEDS TO KNOW ABOUT A TOOL.
 *
 * The home page carries a box you type a sentence into -- "make this under 2MB
 * and strip my name out of it" -- and the answer has to be assembled without
 * asking anything. There is no server to ask: every page on this site ships
 * `Content-Security-Policy: connect-src 'none'` (see `public/_headers`), and
 * `e2e/egress-proof.spec.ts` fails if a page opens a connection. So the whole
 * catalogue has to be readable in the tab, which means it has to be small.
 *
 * That is why this shape is four short fields rather than the workbench
 * operation it came from. `lib/kernel/manifest.generated.ts` is 552 KB and
 * `lib/tools/catalog.ts` pulls in eighteen operation modules; either one on the
 * home page would undo the carve-out that `lib/tools/browse.ts` exists to
 * protect. `catalogue.generated.ts` holds every live tool in a fraction of
 * that, and the command bar fetches it only when someone starts typing.
 */

/** The kinds of thing a request can be about, when the words say. */
export type SubjectKind =
  | 'pdf'
  | 'image'
  | 'audio'
  | 'video'
  | 'table'
  | 'text'
  | 'archive';

/**
 * A kernel operation, copied out of the manifest so a step can be chained
 * without loading it.
 *
 * `input` and `output` are the two fields `lib/pipeline/validate.ts` uses to
 * decide whether one step can feed the next, and they are here for exactly
 * that: the command bar checks a chain before offering to run it, and
 * `catalogue.test.ts` fails if any of the four drifts from the manifest.
 *
 * This is the DECODED form, built by `prepare()`. The index stores the same
 * four values as one short string -- see `CommandCatalogueEntry.op`.
 */
export interface CommandOperationRef {
  id: string;
  source: string;
  input: 'text' | 'file' | 'files' | 'none';
  output: 'text' | 'files';
}

/** One live tool, as the command bar sees it. */
export interface CommandCatalogueEntry {
  /** The URL that opens the tool. */
  href: string;
  /** What the tool's own page calls it. This is what an answer row shows. */
  name: string;
  /**
   * Every match word the name does not already contain -- out of the tool's
   * description, its hand-written aliases and jobs, and its search-result copy.
   * Space separated rather than an array, which is worth about a third of the
   * file in quotes and commas. See `build-catalogue.ts` for why the sentences
   * themselves are not here.
   */
  terms: string;
  /**
   * Present when `lib/pipeline` can run this tool as a step: the operation's
   * `source`, `input` and `output` kinds, in that order, separated by spaces --
   * `"spreadsheet text text"`.
   *
   * Three fields rather than four because the fourth is already here: an
   * operation's id is the last segment of its route, or the `?tool=` value when
   * it has no route of its own, which is how the index found it in the first
   * place. `prepare()` reads it back out, and `catalogue.test.ts` checks all
   * 630 against the kernel manifest, so a derived id cannot quietly become the
   * wrong one.
   */
  op?: string;
}
