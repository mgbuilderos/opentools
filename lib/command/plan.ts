/**
 * TURNING A SENTENCE INTO STEPS, OR INTO AN HONEST NO.
 *
 * This is what the box on the home page calls. It takes the words, the index and
 * -- when a file has been dropped -- what kind of thing that file is, and returns
 * either a plan or the reason there isn't one. Nothing here reaches a network,
 * because nothing on this site can: the pages are served with
 * `connect-src 'none'`, which is why the sentence and the file are both still
 * only on the machine they were typed on.
 *
 * THE PART THAT MATTERS MOST IS THE NO. A catalogue this size can produce a
 * confident-looking answer to almost anything, and four of its 1,367 tools are
 * called translators. So a clause gets an answer only when the words really
 * reach a tool (`match.ts` measures that), a known-wrong match is overruled by
 * `limits.ts` before it is ever shown, and anything left over is reported as a
 * gap -- with the words that were not recognised, and an offer to file it.
 */
import { limitsFor, type LimitKind, type LimitRule } from './limits';
import { findTools, type PreparedCatalogue, type ToolMatch } from './match';
import { parseRequest, type ParsedClause } from './parse';
import type { CommandOperationRef, SubjectKind } from './types';

export interface CommandPlanStep {
  /** The words this step answers, as typed. */
  clause: string;
  name: string;
  href: string;
  /** Present when `lib/pipeline` can run it as part of a chain. */
  op?: CommandOperationRef;
  /** Other tools that fit, for when the first one is not what was meant. */
  alternatives: readonly { name: string; href: string }[];
  /** What the words asked for that this step should carry, and what it will not do. */
  notes: readonly string[];
}

export interface CommandPlanGap {
  clause: string;
  kind: LimitKind;
  /** Why this cannot be done here. */
  because: string;
  instead?: { label: string; href: string; note?: string };
  /** Typed words that appear in no tool on the site. */
  unrecognised: readonly string[];
  /**
   * A GitHub issue, prefilled with the clause, for a gap that is a missing tool
   * rather than a rule of the place. Built, never opened: nothing is sent unless
   * the person clicks it and then submits it themselves.
   */
  requestUrl?: string;
}

export interface CommandPlan {
  query: string;
  steps: readonly CommandPlanStep[];
  gaps: readonly CommandPlanGap[];
  /** Where to run every step over your files in one pass, when they chain. */
  chain?: { href: string; steps: number };
  /** Why they do not chain, when there is more than one runnable step. */
  chainBlocked?: string;
  /** How many tools were looked at, so the answer can say. */
  searched: number;
}

const REPO = ['https:', '//', 'github.com/mgbuilderos/opentools'].join('');

/** Text that is safe to put in a URL: one line, bounded, no control characters. */
function boundedText(value: string, maximum: number) {
  return Array.from(value.trim(), (character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint < 32 || codePoint === 127 ? ' ' : character;
  })
    .join('')
    .replace(/\s+/gu, ' ')
    .trim()
    .slice(0, maximum);
}

/**
 * A prefilled tool request.
 *
 * Only the clause travels, and only if the person clicks: this returns a string,
 * and a string is not a request. GitHub shows them the filled form before
 * anything is filed, and the field it lands in is the one
 * `.github/ISSUE_TEMPLATE/tool_request.yml` asks first -- the task, not the tool
 * name, because that is what the template asks for.
 */
function requestUrl(clause: string): string {
  const search = new URLSearchParams({
    template: 'tool_request.yml',
    title: `Tool request: ${boundedText(clause, 70)}`,
    task: boundedText(clause, 300),
  });
  return `${REPO}/issues/new?${search.toString()}`;
}

/**
 * The other tools worth offering, which is not simply "the rest of the list".
 *
 * A weighted search always returns something second, and an alternative that
 * scored a fifth of the winner is noise with a link on it: "read the text out of
 * this scan" offered OCR, and under it, an SMS QR code generator. So an
 * alternative has to be within reach of the answer, and two pages that carry the
 * same name -- `/data/csv-to-json` and `/convert/csv-to-json` both exist -- are
 * shown once.
 */
const ALTERNATIVE_SHARE = 0.4;

/** A pipeline of one, as a link the batch runner opens with it already chosen. */
function pipelineHref(
  steps: readonly { name: string; op: CommandOperationRef }[],
) {
  const search = new URLSearchParams({
    pipeline: JSON.stringify({
      version: 1,
      // Built from the steps rather than from the sentence: a pipeline name ends
      // up in the address bar and in browser history, and the sentence is the
      // visitor's own words.
      name: boundedText(steps.map((step) => step.name).join(', then '), 80),
      steps: steps.map((step) => ({
        op: step.op.id,
        source: step.op.source,
        params: {},
      })),
    }),
  });
  return `/batch?${search.toString()}`;
}

function alternativesOf(matches: readonly ToolMatch[]) {
  const best = matches[0];
  if (!best) return [];
  const seen = new Set([best.entry.name]);
  return matches.slice(1).flatMap((match) => {
    if (match.score < best.score * ALTERNATIVE_SHARE) return [];
    if (seen.has(match.entry.name)) return [];
    seen.add(match.entry.name);
    return [{ name: match.entry.name, href: match.entry.href }];
  });
}

/**
 * The note that admits a guess.
 *
 * "Make this under 2MB" does not say what it is, and the answer has to be
 * something -- so it is the compressor for whichever kind ranked first. Saying
 * that out loud, with the other kinds one click away, is the difference between a
 * guess and a wrong answer.
 */
function guessNote(
  clause: ParsedClause,
  best: ToolMatch,
  alternatives: readonly { href: string }[],
) {
  if (clause.subject) return [];
  const area = (href: string) => href.split('/')[1];
  const elsewhere = alternatives.some(
    (other) => area(other.href) !== area(best.entry.href),
  );
  return elsewhere
    ? [
        'Nothing in that said what kind of file it is, so this is the best guess \u2014 the alternatives are the other kinds.',
      ]
    : [];
}

function notesFor(clause: ParsedClause, caveats: readonly string[]) {
  const notes: string[] = [];
  if (clause.size)
    notes.push(
      `You asked for ${clause.size.value} ${clause.size.unit} or under. Set that ceiling in the tool — it is not carried for you.`,
    );
  if (clause.dimensions)
    notes.push(
      `You asked for ${clause.dimensions.width}×${clause.dimensions.height}. Set it in the tool.`,
    );
  return [...notes, ...caveats];
}

/**
 * Whether one step's output is something the next step accepts.
 *
 * The same three rules `lib/pipeline/validate.ts` applies, checked here against
 * the kinds carried in the index so that offering the chain costs nothing: the
 * batch runner validates it again, against the real kernel, before it runs.
 */
function feeds(from: CommandOperationRef, to: CommandOperationRef) {
  if (to.input === 'none') return false;
  if (from.output === 'text') return to.input === 'text';
  return to.input === 'file' || to.input === 'files';
}

/** Whether the steps can be run in one pass, and why not when they cannot. */
type ChainResult =
  | { kind: 'ready'; href: string; steps: number }
  | { kind: 'blocked'; because: string }
  | { kind: 'none' };

function chainFor(steps: readonly CommandPlanStep[]): ChainResult {
  const runnable = steps.filter(
    (step): step is CommandPlanStep & { op: CommandOperationRef } =>
      Boolean(step.op),
  );
  if (runnable.length < 2) {
    return steps.length > 1
      ? {
          kind: 'blocked',
          because:
            'These steps run on their own pages: not every one of them is an operation the batch runner can take.',
        }
      : { kind: 'none' };
  }
  for (let index = 0; index < runnable.length - 1; index += 1) {
    if (!feeds(runnable[index]!.op, runnable[index + 1]!.op)) {
      return {
        kind: 'blocked',
        because: `${runnable[index]!.name} hands back ${
          runnable[index]!.op.output === 'text' ? 'text' : 'files'
        } and ${runnable[index + 1]!.name} takes ${
          runnable[index + 1]!.op.input
        }, so they cannot be run one after the other.`,
      };
    }
  }

  return {
    kind: 'ready',
    href: pipelineHref(runnable),
    steps: runnable.length,
  };
}

export interface PlanOptions {
  /** What a dropped file is, when there is one. Settles "make this smaller". */
  subject?: SubjectKind;
}

export function planRequest(
  query: string,
  prepared: PreparedCatalogue,
  options: PlanOptions = {},
): CommandPlan {
  const clauses = parseRequest(query);
  const steps: CommandPlanStep[] = [];
  const gaps: CommandPlanGap[] = [];
  /*
    One sentence is usually about one thing. "Deduplicate this csv then sort it"
    says what it is about once, and the second clause is the one that needs to
    know: on its own, "sort it" was answered with a content-calendar maker. So the
    last subject named carries forward, behind a file on the dropzone when there
    is one and behind anything the clause says for itself.
  */
  let carried = options.subject;

  for (const parsed of clauses) {
    const subject = parsed.subject ?? carried;
    carried = subject;
    const clause: ParsedClause = subject ? { ...parsed, subject } : parsed;

    const rules = limitsFor(clause.text, clause.subject);
    const decisive = rules.find(
      (rule): rule is LimitRule => rule.decisive === true,
    );
    if (decisive) {
      gaps.push({
        clause: clause.text,
        kind: decisive.kind,
        because: decisive.because,
        ...(decisive.instead ? { instead: decisive.instead } : {}),
        unrecognised: [],
      });
      continue;
    }

    const found = findTools(clause, prepared);
    const best = found.matches[0];
    if (best) {
      const caveats = found.lexicon.flatMap((hit) =>
        hit.entry.caveat && (!hit.href || hit.href === best.entry.href)
          ? [hit.entry.caveat]
          : [],
      );
      const alternatives = alternativesOf(found.matches);
      steps.push({
        clause: clause.text,
        name: best.entry.name,
        /*
          An operation with no page of its own is indexed at `/batch?tool=<id>`,
          which the batch runner does not read. One step is a pipeline, so it is
          handed over as one and arrives already chosen.
        */
        href:
          best.entry.href.startsWith('/batch?') && best.op
            ? pipelineHref([{ name: best.entry.name, op: best.op }])
            : best.entry.href,
        ...(best.op ? { op: best.op } : {}),
        alternatives,
        notes: [
          ...notesFor(clause, caveats),
          ...guessNote(clause, best, alternatives),
        ],
      });
      continue;
    }

    const rule = rules[0];
    gaps.push({
      clause: clause.text,
      kind: rule?.kind ?? 'not-a-tool',
      because:
        rule?.because ??
        'Nothing here does this. Every tool on this site runs on your own machine, so the list is what it is — this is not a paywall or a sign-in, it is a gap.',
      ...(rule?.instead ? { instead: rule.instead } : {}),
      unrecognised: found.unknownTokens,
      ...(!rule || rule.kind === 'not-a-tool'
        ? { requestUrl: requestUrl(clause.text) }
        : {}),
    });
  }

  /*
    A sentence that produced nothing at all still owes an answer. "Help" is one
    word and every word of it is a stop word, so there was no clause, no match and
    no gap -- a box that goes blank when you ask it for help. Saying so is the
    minimum.
  */
  if (!steps.length && !gaps.length && query.trim()) {
    gaps.push({
      clause: boundedText(query, 120),
      kind: 'not-a-tool',
      because:
        'There is no task in those words that this site can act on. Name the thing and what to do to it \u2014 "compress this pdf", "csv to json", "strip the exif" \u2014 or browse the categories below.',
      unrecognised: [],
    });
  }

  const chain: ChainResult =
    steps.length > 1 ? chainFor(steps) : { kind: 'none' };
  return {
    query: query.trim(),
    steps,
    gaps,
    ...(chain.kind === 'ready'
      ? { chain: { href: chain.href, steps: chain.steps } }
      : {}),
    ...(chain.kind === 'blocked' ? { chainBlocked: chain.because } : {}),
    searched: prepared.entries.length,
  };
}
