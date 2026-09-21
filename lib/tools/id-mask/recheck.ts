/**
 * Re-checks masked output for anything that still looks like an Aadhaar or PAN
 * number.
 *
 * This is deliberately written apart from `mask.ts` and shares no code with
 * it, so a bug in the masker is not repeated here. It is also deliberately
 * looser, so it reports things the masker chose not to touch:
 *
 * - Digits are any Unicode decimal digit (\p{Nd}), in every script.
 * - Every Unicode format character (\p{Cf}: zero-width spaces and joiners,
 *   soft hyphens, bidi marks) is ignored.
 * - Separators are any whitespace, tab and line breaks included, any dash,
 *   dots, slashes, underscores and middle dots. Digit chains are built three
 *   times, allowing 1, 2 and 3 separator characters between digits.
 * - A chain with exactly 12 digits is flagged whatever its grouping or first
 *   digit. In a longer chain, one to three consecutive groups of at least two
 *   digits that add up to exactly 12 are flagged, unless the chain is four or
 *   more 4-digit groups (the card-number and Virtual ID shape the masker
 *   already reports as a long number run).
 * - Any five letters, four digits and a letter are flagged, in any case, with
 *   no word boundary and any fourth letter. Upper-case letters with a space or
 *   hyphen between the parts are flagged too.
 *
 * Three narrow exceptions keep ordinary text from raising the alarm:
 * - a dotted IPv4 address (four dot-separated groups of one to three digits);
 * - an Indian phone number written +91 followed by ten digits;
 * - a PAN-shaped match whose letters are XXXXX, which is what masked output
 *   next to a letter looks like.
 */

export type RecheckKind = 'twelve-digits' | 'pan-shape';

export interface RecheckFinding {
  kind: RecheckKind;
  /** UTF-16 offsets into the checked text, end exclusive. */
  start: number;
  end: number;
  /** 1-based line and column (UTF-16 code units, as a textarea counts). */
  line: number;
  column: number;
}

const DECIMAL_DIGIT = /^\p{Nd}$/u;
const FORMAT_CHARACTER = /^\p{Cf}$/u;
const SEPARATOR = /^[\s\p{Pd}./_\u00b7]$/u;

const CharacterClass = {
  Unknown: 0,
  Digit: 1,
  Ignorable: 2,
  Separator: 3,
  Other: 4,
} as const;
type CharacterClass = (typeof CharacterClass)[keyof typeof CharacterClass];

let classes: Uint8Array | null = null;

function classify(code: number): CharacterClass {
  classes ??= new Uint8Array(0x10000);
  const known = classes[code] as CharacterClass;
  if (known !== CharacterClass.Unknown) return known;
  const character = String.fromCharCode(code);
  const found = DECIMAL_DIGIT.test(character)
    ? CharacterClass.Digit
    : FORMAT_CHARACTER.test(character)
      ? CharacterClass.Ignorable
      : SEPARATOR.test(character)
        ? CharacterClass.Separator
        : CharacterClass.Other;
  classes[code] = found;
  return found;
}

/**
 * The text with format characters removed, full-width forms folded to ASCII,
 * every non-ASCII digit written as `0`, and a map back to the original offset.
 * Supplementary-plane digits (e.g. mathematical digits) are counted too.
 */
function fold(text: string) {
  const codes = new Uint16Array(text.length);
  const origin = new Int32Array(text.length + 1);
  let size = 0;
  for (let index = 0; index < text.length; index += 1) {
    let code = text.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff && index + 1 < text.length) {
      const pair = text.codePointAt(index)!;
      const character = String.fromCodePoint(pair);
      if (DECIMAL_DIGIT.test(character) || FORMAT_CHARACTER.test(character)) {
        if (DECIMAL_DIGIT.test(character)) {
          origin[size] = index;
          codes[size] = 0x30;
          size += 1;
        }
        index += 1;
        continue;
      }
    }
    const kind = classify(code);
    if (kind === CharacterClass.Ignorable) continue;
    if (code >= 0xff01 && code <= 0xff5e) code -= 0xfee0;
    else if (code > 0x7f && kind === CharacterClass.Digit) code = 0x30;
    origin[size] = index;
    codes[size] = code;
    size += 1;
  }
  origin[size] = text.length;
  let folded = '';
  for (let offset = 0; offset < size; offset += 8192) {
    folded += String.fromCharCode(
      ...codes.subarray(offset, Math.min(size, offset + 8192)),
    );
  }
  return { folded, origin };
}

interface LooseGroup {
  start: number;
  end: number;
  digits: number;
  /**
   * Separator characters between the previous group and this one, or
   * `CHAIN_BREAK` when something that is neither a digit nor a separator came
   * between them (and for the first group of all).
   */
  gapBefore: number;
}

/** Larger than any gap a chain tolerates, so it always ends one. */
const CHAIN_BREAK = Number.MAX_SAFE_INTEGER;

function isAsciiDigit(code: number) {
  return code >= 0x30 && code <= 0x39;
}

function isIpv4(folded: string, groups: LooseGroup[]) {
  if (groups.length !== 4) return false;
  for (let index = 0; index < 4; index += 1) {
    if (groups[index]!.digits > 3) return false;
    if (index > 0) {
      const gap = folded.slice(groups[index - 1]!.end, groups[index]!.start);
      if (gap !== '.') return false;
    }
  }
  return true;
}

function isIndianPhone(folded: string, groups: LooseGroup[]) {
  const first = groups[0]!;
  return (
    (first.digits === 2 || first.digits === 12) &&
    folded.slice(first.start, first.start + 2) === '91' &&
    folded[first.start - 1] === '+'
  );
}

/**
 * Every run of digits in the text, in order, each carrying how far it sits
 * from the run before it.
 *
 * Read once, not once per gap width. The three chain widths below differ only
 * in where they cut a chain, and that is decided entirely by `gapBefore`, so
 * one pass over five megabytes serves all three instead of three.
 */
function collectGroups(folded: string): LooseGroup[] {
  const groups: LooseGroup[] = [];
  let gap = CHAIN_BREAK;

  for (let index = 0; index < folded.length; index += 1) {
    const code = folded.charCodeAt(index);
    if (isAsciiDigit(code)) {
      const current = groups.at(-1);
      if (current && gap === 0) {
        current.end = index + 1;
        current.digits += 1;
      } else {
        groups.push({
          start: index,
          end: index + 1,
          digits: 1,
          gapBefore: gap,
        });
      }
      gap = 0;
    } else if (
      groups.length > 0 &&
      gap !== CHAIN_BREAK &&
      classify(code) === CharacterClass.Separator
    ) {
      gap += 1;
    } else {
      gap = CHAIN_BREAK;
    }
  }
  return groups;
}

/** Reports the 12-digit windows in one chain of digit groups. */
function reportChain(
  folded: string,
  groups: LooseGroup[],
  report: (start: number, end: number, kind: RecheckKind) => void,
) {
  const total = groups.reduce((sum, group) => sum + group.digits, 0);
  if (total === 12) {
    if (!isIpv4(folded, groups) && !isIndianPhone(folded, groups))
      report(groups[0]!.start, groups.at(-1)!.end, 'twelve-digits');
  } else if (total > 12) {
    const cardShaped =
      groups.length >= 4 && groups.every((group) => group.digits === 4);
    if (!cardShaped) {
      for (let first = 0; first < groups.length; first += 1) {
        let sum = 0;
        for (
          let last = first;
          last < groups.length && last < first + 3;
          last += 1
        ) {
          if (groups[last]!.digits < 2) break;
          sum += groups[last]!.digits;
          if (sum === 12)
            report(groups[first]!.start, groups[last]!.end, 'twelve-digits');
          if (sum >= 12) break;
        }
      }
    }
  }
}

/** Chains built by joining groups no more than `maxGap` separators apart. */
function scanDigitChains(
  folded: string,
  groups: readonly LooseGroup[],
  maxGap: number,
  report: (start: number, end: number, kind: RecheckKind) => void,
) {
  let chainStart = 0;
  for (let index = 1; index <= groups.length; index += 1) {
    if (index < groups.length && groups[index]!.gapBefore <= maxGap) continue;
    reportChain(folded, groups.slice(chainStart, index), report);
    chainStart = index;
  }
}

const PAN_ANY_CASE = /[A-Za-z]{5}[0-9]{4}[A-Za-z]/gu;
const PAN_SPACED =
  /[A-Z]{5}[\s-][0-9]{4}[\s-]?[A-Z]|[A-Z]{5}[\s-]?[0-9]{4}[\s-][A-Z]/gu;

function scanPanShapes(
  folded: string,
  report: (start: number, end: number, kind: RecheckKind) => void,
) {
  for (const pattern of [PAN_ANY_CASE, PAN_SPACED]) {
    for (const match of folded.matchAll(pattern)) {
      if (match[0].slice(0, 5) === 'XXXXX') continue;
      report(match.index, match.index + match[0].length, 'pan-shape');
    }
  }
}

/** Everything in `text` that still looks like an Aadhaar or PAN number. */
export function findUnmaskedIdentifiers(text: string): RecheckFinding[] {
  const { folded, origin } = fold(text);
  const spans = new Map<
    string,
    { start: number; end: number; kind: RecheckKind }
  >();
  const report = (start: number, end: number, kind: RecheckKind) => {
    const from = origin[start]!;
    // `end` is exclusive in folded offsets; map the last character and step
    // past it so trailing format characters are not included.
    const to = origin[end - 1]! + 1;
    spans.set(`${from}:${to}`, { start: from, end: to, kind });
  };

  const groups = collectGroups(folded);
  for (const maxGap of [1, 2, 3])
    scanDigitChains(folded, groups, maxGap, report);
  scanPanShapes(folded, report);

  const sorted = [...spans.values()].sort((a, b) => a.start - b.start);
  // Overlapping spans describe the same place; keep the widest.
  const merged: typeof sorted = [];
  for (const span of sorted) {
    const previous = merged.at(-1);
    if (previous && span.start < previous.end) {
      previous.end = Math.max(previous.end, span.end);
      continue;
    }
    merged.push({ ...span });
  }

  const lineStarts = [0];
  for (
    let index = text.indexOf('\n');
    index !== -1;
    index = text.indexOf('\n', index + 1)
  )
    lineStarts.push(index + 1);

  return merged.map((span) => {
    let low = 0;
    let high = lineStarts.length - 1;
    while (low < high) {
      const middle = (low + high + 1) >> 1;
      if (lineStarts[middle]! <= span.start) low = middle;
      else high = middle - 1;
    }
    return {
      ...span,
      line: low + 1,
      column: span.start - lineStarts[low]! + 1,
    };
  });
}
