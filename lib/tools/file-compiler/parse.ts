/**
 * The controlled command language: typed constraints out of a short phrase.
 *
 * This is a deterministic matcher over a documented, bounded vocabulary. It is
 * not a language model and does not guess. Its central obligation is the one
 * that is easy to get wrong and dishonest to skip: **it reports which parts of
 * the text it understood and which parts it did not.** Text it does not
 * recognise is returned in `unresolvedText` so the interface can show it back,
 * and it never reaches an operation.
 *
 * How that guarantee is kept: every matcher records the character span it
 * consumed. Whatever span is left over, once filler words are discounted, is by
 * construction the part that was not understood. A matcher cannot quietly widen
 * its reach without the leftover text changing, which is what the tests pin.
 *
 * Safety properties, all of them load-bearing rather than decorative:
 *
 * - No `eval`, no `new Function`, no dynamic import, no template evaluation.
 * - Every quantifier is bounded (`\d{1,6}`, never `\d+`) and no pattern nests
 *   quantifiers, so there is no input that makes matching blow up.
 * - Input over `MAX_COMMAND_LENGTH` is refused rather than truncated, because a
 *   truncated command means something different from what was typed.
 * - Nothing is sent anywhere. This module has no I/O of any kind.
 */

import { MAX_EDGE, QUALITY_CEILING, QUALITY_FLOOR } from '../exact-size';
import type { VerifiableFormat } from '../image-verify';
import {
  findConflicts,
  MAX_INPUT_BYTES,
  MIN_TARGET_BYTES,
  type FitBehaviour,
  type ImageRequirement,
  type RequirementConflict,
} from './requirement';

/**
 * Longest command accepted. Long enough for every phrase in the vocabulary
 * several times over, short enough that no input can be a denial-of-service
 * attempt. Beyond it the text is refused, not cut.
 */
export const MAX_COMMAND_LENGTH = 200;

/** Bytes assumed per KB. Portals that mean 1,000 are the exception. */
export const KB = 1024;

/** One constraint the parser recognised, with the text it came from. */
export interface ParsedConstraint {
  /** Which field of the requirement this set. */
  field: keyof ImageRequirement | 'maxEdge' | 'exactSize';
  /** The exact span of the visitor's text that produced it. */
  text: string;
  /** Plain-language readback, e.g. "JPEG" or "no wider than 1200 px". */
  summary: string;
  /**
   * Where the span started in the normalised text. Kept so the readback can be
   * ordered the way the visitor typed it rather than the order the matchers
   * happen to run in, and so the interface can highlight the span later.
   */
  at: number;
}

export interface ParseResult {
  requirement: ImageRequirement;
  /** What was understood, in the order it appeared. */
  recognised: ParsedConstraint[];
  /** Fragments that were not understood and were not acted on. */
  unresolvedText: string[];
  conflicts: RequirementConflict[];
  /** The input exceeded `MAX_COMMAND_LENGTH` and was not parsed at all. */
  tooLong: boolean;
}

/**
 * Words that carry no constraint and are not evidence of a misunderstanding.
 *
 * Kept deliberately short. A generous filler list would hide real failures by
 * silently swallowing words the parser does not actually understand, which is
 * the opposite of what this module promises.
 */
const FILLER = new Set([
  'a',
  'an',
  'and',
  'as',
  'at',
  'be',
  'file',
  'image',
  'in',
  'into',
  'is',
  'it',
  'make',
  'must',
  'photo',
  'picture',
  'please',
  'should',
  'the',
  'to',
  'with',
]);

interface Matcher {
  /** Stable id, used by tests and by the readback. */
  id: string;
  pattern: RegExp;
  /**
   * Turn a match into requirement fields. Returning null rejects the match —
   * an out-of-range number, for instance — and leaves the span unconsumed so it
   * surfaces as text the parser did not act on.
   */
  read: (match: RegExpExecArray) => {
    patch: Partial<ImageRequirement>;
    field: ParsedConstraint['field'];
    summary: string;
  } | null;
}

const FORMAT_BY_WORD: Record<string, VerifiableFormat> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

const FORMAT_NAME: Record<VerifiableFormat, string> = {
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
  'image/webp': 'WebP',
};

/** Multiplier for a written size unit. `k`/`m` are read as KB/MB. */
function unitBytes(unit: string): number | null {
  switch (unit) {
    case 'b':
    case 'byte':
    case 'bytes':
      return 1;
    case 'k':
    case 'kb':
    case 'kib':
      return KB;
    case 'm':
    case 'mb':
    case 'mib':
      return KB * KB;
    default:
      return null;
  }
}

const wholeEdge = (raw: string): number | null => {
  const value = Number(raw);
  return Number.isInteger(value) && value >= 1 && value <= MAX_EDGE
    ? value
    : null;
};

/**
 * Matchers in priority order. Axis-specific dimension phrases come before the
 * axis-free one so "maximum width 1200" is not read as "maximum 1200", and the
 * exact-size pattern comes before both so "600x600" is never split into two
 * loose numbers.
 */
const MATCHERS: readonly Matcher[] = [
  // exactly 600x600 · 600 by 600 pixels · exact size 1080 × 1080
  {
    id: 'exactSize',
    pattern:
      /\b(?:exact(?:ly)?(?:\s+size)?\s+)?(\d{1,5})\s*(?:x|×|by)\s*(\d{1,5})(?:\s*(?:px|pixels?))?\b/g,
    read: (match) => {
      const width = wholeEdge(match[1]!);
      const height = wholeEdge(match[2]!);
      if (width === null || height === null) return null;
      return {
        patch: { exactWidth: width, exactHeight: height },
        field: 'exactSize',
        summary: `exactly ${width} × ${height} px`,
      };
    },
  },
  // maximum width 1200 px · no wider than 1600 · width at most 800
  {
    id: 'maxWidth',
    pattern:
      /\b(?:max(?:imum)?\s+width|width\s+(?:at\s+most|max(?:imum)?)|no\s+wider\s+than)\s*:?\s*(\d{1,5})\s*(?:px|pixels?)?\b/g,
    read: (match) => {
      const value = wholeEdge(match[1]!);
      if (value === null) return null;
      return {
        patch: { maxWidth: value },
        field: 'maxWidth',
        summary: `no wider than ${value} px`,
      };
    },
  },
  // maximum height 800 · no taller than 900
  {
    id: 'maxHeight',
    pattern:
      /\b(?:max(?:imum)?\s+height|height\s+(?:at\s+most|max(?:imum)?)|no\s+taller\s+than)\s*:?\s*(\d{1,5})\s*(?:px|pixels?)?\b/g,
    read: (match) => {
      const value = wholeEdge(match[1]!);
      if (value === null) return null;
      return {
        patch: { maxHeight: value },
        field: 'maxHeight',
        summary: `no taller than ${value} px`,
      };
    },
  },
  // under 2 mb · less than 500 kb · at most 250kb
  {
    id: 'maxBytes',
    pattern:
      /\b(?:under|below|less\s+than|smaller\s+than|at\s+most|no\s+more\s+than|max(?:imum)?)\s*:?\s*(\d{1,6}(?:\.\d{1,3})?)\s*(bytes?|kib|kb|mib|mb|[kmb])\b/g,
    read: (match) => {
      const multiplier = unitBytes(match[2]!);
      if (multiplier === null) return null;
      const amount = Number(match[1]!);
      if (!Number.isFinite(amount) || amount <= 0) return null;
      const bytes = Math.floor(amount * multiplier);
      if (bytes < MIN_TARGET_BYTES || bytes > MAX_INPUT_BYTES) return null;
      return {
        patch: { maxBytes: bytes },
        field: 'maxBytes',
        summary: `under ${match[1]} ${match[2]!.toUpperCase()}`,
      };
    },
  },
  // maximum 1200 px — no axis named, so it bounds the longest edge
  {
    id: 'maxEdge',
    pattern:
      /\b(?:max(?:imum)?|no\s+larger\s+than|no\s+bigger\s+than|at\s+most)\s*:?\s*(\d{1,5})\s*(?:px|pixels?)\b/g,
    read: (match) => {
      const value = wholeEdge(match[1]!);
      if (value === null) return null;
      return {
        patch: { maxWidth: value, maxHeight: value },
        field: 'maxEdge',
        summary: `no side longer than ${value} px`,
      };
    },
  },
  // quality 80 · q80
  {
    id: 'quality',
    pattern: /\b(?:quality\s*:?\s*|q)(\d{1,3})\b/g,
    read: (match) => {
      const value = Number(match[1]!);
      if (
        !Number.isInteger(value) ||
        value < QUALITY_FLOOR ||
        value > QUALITY_CEILING
      ) {
        return null;
      }
      return {
        patch: { quality: value },
        field: 'quality',
        summary: `quality ${value}`,
      };
    },
  },
  // remove metadata · strip exif · no gps data
  {
    id: 'removeMetadata',
    pattern:
      /\b(?:remove|strip|clear|delete|drop|without|no)\s+(?:all\s+)?(?:metadata|exif(?:\s+data)?|gps(?:\s+data)?|location\s+data)\b/g,
    read: () => ({
      patch: { removeMetadata: true },
      field: 'removeMetadata',
      summary: 'metadata removed',
    }),
  },
  // keep transparency · preserve alpha · transparent background
  {
    id: 'keepTransparency',
    pattern:
      /\b(?:(?:keep|preserve|retain|keeping)\s+(?:the\s+)?(?:transparency|transparent\s+background|alpha(?:\s+channel)?)|transparent\s+background)\b/g,
    read: () => ({
      patch: { keepTransparency: true },
      field: 'keepTransparency',
      summary: 'transparency kept',
    }),
  },
  // white background · background #ff0000 · on black
  {
    id: 'background',
    // Four separate alternatives rather than one with a shared `\b`: a leading
    // `\b` cannot match before a `#`, because there is no word character on its
    // left, so "#ff0000 background" would never be recognised.
    pattern:
      /\b(white|black)\s+background\b|(?:^|\s)(#[0-9a-f]{6})\s+background\b|\bbackground\s*:?\s*(white|black|#[0-9a-f]{6})\b|\bon\s+(?:a\s+)?(white|black)\s+background\b/g,
    read: (match) => {
      const word = match[1] ?? match[2] ?? match[3] ?? match[4];
      if (!word) return null;
      const colour =
        word === 'white' ? '#ffffff' : word === 'black' ? '#000000' : word;
      return {
        patch: { background: colour },
        field: 'background',
        summary: `${word} background`,
      };
    },
  },
  // crop to fit · pad · letterbox · stretch
  {
    id: 'fit',
    pattern:
      /\b(crop|pad|letterbox|stretch|squash)(?:\s+to\s+fit|ped|ding)?\b/g,
    read: (match) => {
      const word = match[1]!;
      const mode: FitBehaviour =
        word === 'crop'
          ? 'crop'
          : word === 'stretch' || word === 'squash'
            ? 'stretch'
            : 'pad';
      return {
        patch: { fit: mode },
        field: 'fit',
        summary: `${mode} to fit`,
      };
    },
  },
  // jpeg · convert to png · save as webp
  {
    id: 'format',
    pattern:
      /\b(?:(?:convert|change|save|output|export)(?:\s+it)?(?:\s+(?:to|as|into))?\s+|(?:to|as|into)\s+)?(jpe?g|png|webp)\b/g,
    read: (match) => {
      const format = FORMAT_BY_WORD[match[1]!];
      if (!format) return null;
      return {
        patch: { format },
        field: 'format',
        summary: FORMAT_NAME[format],
      };
    },
  },
];

/**
 * Normalise for matching without changing what the visitor meant.
 *
 * NFKC folds full-width digits and other compatibility forms onto their plain
 * equivalents, so `１２００` is read as 1200 rather than landing in the
 * unresolved pile. Control characters are removed because they cannot be part of
 * any phrase in the vocabulary and would otherwise split a word invisibly.
 */
export function normaliseCommand(input: string): string {
  return input
    .normalize('NFKC')
    .replace(/[ --]/gu, ' ')
    .toLowerCase()
    .replace(/\s+/gu, ' ')
    .trim();
}

/**
 * Parse a command into typed constraints.
 *
 * A later matcher never overwrites an earlier one's field: the first reading of
 * a field wins, and a second, different reading of the same field is reported
 * as a conflict rather than silently applied. This is why "convert to jpeg then
 * png" produces a question instead of a coin toss.
 */
export function parseCommand(input: string): ParseResult {
  const empty: ParseResult = {
    requirement: {},
    recognised: [],
    unresolvedText: [],
    conflicts: [],
    tooLong: false,
  };

  if (typeof input !== 'string' || input.trim() === '') {
    return empty;
  }
  if (input.length > MAX_COMMAND_LENGTH) {
    return { ...empty, tooLong: true };
  }

  const text = normaliseCommand(input);
  if (text === '') return empty;

  const consumed: boolean[] = Array.from({ length: text.length }, () => false);
  const requirement: ImageRequirement = {};
  const recognised: ParsedConstraint[] = [];
  const conflicts: RequirementConflict[] = [];
  // Which matcher set each field, so a contradiction can name both readings.
  const setBy = new Map<string, { value: unknown; text: string }>();

  for (const matcher of MATCHERS) {
    // A fresh RegExp per pass: the module-level literals carry `lastIndex`
    // state, and sharing it across calls would make parsing order-dependent.
    const pattern = new RegExp(matcher.pattern.source, matcher.pattern.flags);
    let match = pattern.exec(text);
    while (match !== null) {
      const start = match.index;
      const end = start + match[0].length;
      const overlaps = spanConsumed(consumed, start, end);
      if (!overlaps) {
        const read = matcher.read(match);
        if (read) {
          const entries = Object.entries(read.patch);
          const differing = entries.filter(([field, value]) => {
            const previous = setBy.get(field);
            return previous !== undefined && previous.value !== value;
          });
          const repeatsWhatIsSet =
            entries.length > 0 &&
            entries.every(([field, value]) => {
              const previous = setBy.get(field);
              return previous !== undefined && previous.value === value;
            });

          if (differing.length > 0) {
            // Two readings of the same field that disagree. Ask; never pick.
            for (const [field, value] of differing) {
              conflicts.push(
                contradictionConflict(
                  field,
                  setBy.get(field)!,
                  match[0],
                  value,
                ),
              );
            }
          } else if (repeatsWhatIsSet) {
            // A duplicate saying exactly what was already said — "jpeg convert
            // to jpeg". The span is still consumed, so it is not reported as
            // text we failed to understand, but it is not read back a second
            // time either: "JPEG · JPEG" would suggest we misread something.
          } else {
            for (const [field, value] of entries) {
              setBy.set(field, { value, text: match[0] });
              Object.assign(requirement, { [field]: value });
            }
            recognised.push({
              field: read.field,
              text: match[0].trim(),
              summary: read.summary,
              at: start,
            });
          }
          markSpan(consumed, start, end);
        }
      }
      if (pattern.lastIndex === match.index) {
        pattern.lastIndex += 1; // never loop on a zero-length match
      }
      match = pattern.exec(text);
    }
  }

  return {
    requirement,
    // Matchers run in priority order, which is not the order the phrases were
    // typed in. Read the constraints back the way the visitor wrote them.
    recognised: [...recognised].sort((a, b) => a.at - b.at),
    unresolvedText: leftoverPhrases(text, consumed),
    // Contradictions found while reading, then contradictions in the result.
    conflicts: [...conflicts, ...findConflicts(requirement)],
    tooLong: false,
  };
}

function spanConsumed(
  consumed: boolean[],
  start: number,
  end: number,
): boolean {
  for (let index = start; index < end; index += 1) {
    if (consumed[index]) return true;
  }
  return false;
}

function markSpan(consumed: boolean[], start: number, end: number): void {
  for (let index = start; index < end; index += 1) {
    consumed[index] = true;
  }
}

function contradictionConflict(
  field: string,
  previous: { value: unknown; text: string },
  laterText: string,
  laterValue: unknown,
): RequirementConflict {
  const name =
    field === 'format'
      ? 'file type'
      : field === 'maxBytes'
        ? 'maximum size'
        : field.replace(/([A-Z])/gu, ' $1').toLowerCase();
  return {
    id: `two-values-${field}`,
    message: `Two different values were given for the ${name}: “${previous.text.trim()}” and “${laterText.trim()}”.`,
    resolutions: [
      {
        id: 'keep-first',
        label: `Use “${previous.text.trim()}”`,
        patch: { [field]: previous.value } as Partial<ImageRequirement>,
      },
      {
        id: 'keep-second',
        label: `Use “${laterText.trim()}”`,
        patch: { [field]: laterValue } as Partial<ImageRequirement>,
      },
    ],
  };
}

/**
 * The text nobody claimed, as readable fragments.
 *
 * Filler words are dropped, and so is punctuation that only ever joins phrases.
 * Everything else is returned, because a word the parser cannot account for is
 * precisely what the visitor needs shown back to them.
 */
function leftoverPhrases(text: string, consumed: boolean[]): string[] {
  const phrases: string[] = [];
  let current = '';
  for (let index = 0; index <= text.length; index += 1) {
    const done = index === text.length;
    if (!done && !consumed[index]) {
      current += text[index];
      continue;
    }
    const trimmed = current.trim();
    if (trimmed !== '') {
      const words = trimmed
        .split(/[\s,;·]+/u)
        .map((word) => word.replace(/^[^\w#]+|[^\w%]+$/gu, ''))
        .filter((word) => word !== '' && !FILLER.has(word));
      if (words.length > 0) {
        phrases.push(words.join(' '));
      }
    }
    current = '';
  }
  return phrases;
}

/**
 * The readback line for "OpenTools understood:". Empty when nothing was
 * understood, so the interface can say that instead of showing an empty list.
 */
export function describeUnderstood(result: ParseResult): string {
  return result.recognised.map((item) => item.summary).join(' · ');
}
