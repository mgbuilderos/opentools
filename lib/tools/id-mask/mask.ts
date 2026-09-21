/**
 * Detects and masks Aadhaar and PAN numbers in plain text.
 *
 * This is the only place in the repository that states what an Aadhaar or PAN
 * number looks like and how much of one is hidden. Three tools read from it:
 * the whole-text masker at `/life-admin/aadhaar-pan-masker`, which scans a
 * paste or a text file through `maskIdentifiers`, and the single-field
 * `aadhaar-masking-tool` and `pan-masking-tool` in the life-admin workbench,
 * which call `maskAadhaarValue` and `maskPanValue` at the bottom of this file.
 * Where those two deliberately differ from the scanner, the reason is written
 * down beside them — a difference nobody can explain is a bug in one of them.
 *
 * Rules (the page and the tests depend on these exact choices):
 *
 * Digits
 * - ASCII, full-width (U+FF10–FF19), Arabic-Indic, Devanagari, Bengali,
 *   Gurmukhi, Gujarati, Odia, Tamil, Telugu, Kannada and Malayalam digits are
 *   read by value. Digits from any other script are left to the re-check in
 *   `recheck.ts`, which flags every Unicode decimal digit.
 * - Zero-width and invisible formatting characters (U+200B–200D, U+2060,
 *   U+FEFF, U+00AD, U+180E) are ignored wherever they appear, so they cannot
 *   hide a number. They are kept in the output.
 *
 * Aadhaar
 * - Digits joined by at most two separator characters form one chain; the
 *   separators are ASCII and Unicode spaces (not tab), line breaks, hyphens and
 *   dashes, and dots. Inside a chain, each separator splits a group.
 * - A candidate is either one group of exactly 12 digits, or three consecutive
 *   groups of exactly 4 digits. A run of 4-digit groups whose length is a
 *   multiple of three is split into that many candidates; any other run of
 *   four or more 4-digit groups (a 16-digit card number or Virtual ID, say) is
 *   not masked and is counted as a long number run instead, as is any single
 *   group of 13 or more digits.
 * - The first digit must be 2–9, as every Aadhaar number's is.
 * - Every candidate is masked, whether or not it passes the Verhoeff checksum,
 *   so a number with a typo is still hidden. The report says which passed.
 * - Masking follows the masked-Aadhaar convention: the first 8 digits become
 *   `X` and the last 4 stay. Separators and layout are kept, so
 *   `2345-6789-0123` becomes `XXXX-XXXX-0123`.
 * - The 16-digit Aadhaar Virtual ID is not masked: it has the same shape as a
 *   card number and cannot be told apart from one reliably. It is counted as a
 *   long number run.
 *
 * PAN
 * - Five letters, four digits, one letter, case-insensitive, with the fourth
 *   letter one of P C H F A T B L J G. Full-width letters count.
 * - It must stand alone: the letters and digits on either side end the match.
 *   Internal spaces are not accepted, because "Block 1234 C" has the same
 *   shape in ordinary addresses. The re-check flags spaced forms instead.
 * - Default masking shows the last four characters (`XXXXXX234F`); `all`
 *   masks all ten.
 */

export type PanMaskStyle = 'last4' | 'all';

export interface MaskOptions {
  panMask: PanMaskStyle;
}

export interface MaskResult {
  output: string;
  /** Aadhaar-shaped numbers masked that pass the Verhoeff checksum. */
  aadhaarChecksumValid: number;
  /** Aadhaar-shaped numbers masked that fail the checksum (typos included). */
  aadhaarShapeOnly: number;
  pan: number;
  /** Runs of 13 or more digits left unmasked, for the user to check. */
  longNumberRuns: number;
}

const VERHOEFF_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
] as const;

const VERHOEFF_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 8, 7, 6, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 8, 5],
] as const;

const VERHOEFF_INV = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9] as const;

/** True when the digit values (most significant first) pass Verhoeff. */
export function verhoeffValid(digits: readonly number[]) {
  let check = 0;
  for (let index = 0; index < digits.length; index += 1) {
    const digit = digits[digits.length - 1 - index]!;
    check = VERHOEFF_D[check]![VERHOEFF_P[index % 8]![digit]!]!;
  }
  return check === 0;
}

/** The Verhoeff check digit to append to the given digits. */
export function verhoeffCheckDigit(digits: readonly number[]) {
  let check = 0;
  for (let index = 0; index < digits.length; index += 1) {
    const digit = digits[digits.length - 1 - index]!;
    check = VERHOEFF_D[check]![VERHOEFF_P[(index + 1) % 8]![digit]!]!;
  }
  return VERHOEFF_INV[check]!;
}

/** Code points of the zero digit in each script read by value. */
const DIGIT_ZEROS = [
  0x30, 0xff10, 0x0660, 0x06f0, 0x0966, 0x09e6, 0x0a66, 0x0ae6, 0x0b66, 0x0be6,
  0x0c66, 0x0ce6, 0x0d66,
];

/** Value 0–9, or -1 when the code unit is not a digit this engine reads. */
function digitValue(code: number) {
  if (code >= 0x30 && code <= 0x39) return code - 0x30;
  if (code < 0x0660) return -1;
  for (const zero of DIGIT_ZEROS) {
    if (code >= zero && code <= zero + 9) return code - zero;
  }
  return -1;
}

function isIgnorable(code: number) {
  return (
    code === 0x200b ||
    code === 0x200c ||
    code === 0x200d ||
    code === 0x2060 ||
    code === 0xfeff ||
    code === 0x00ad ||
    code === 0x180e
  );
}

function isSeparator(code: number) {
  return (
    code === 0x20 ||
    code === 0x2d ||
    code === 0x2e ||
    code === 0x0a ||
    code === 0x0d ||
    code === 0xa0 ||
    (code >= 0x2000 && code <= 0x200a) ||
    (code >= 0x2010 && code <= 0x2015) ||
    code === 0x202f ||
    code === 0x205f ||
    code === 0x2212 ||
    code === 0x3000 ||
    code === 0xfe63 ||
    code === 0xff0d ||
    code === 0xff0e
  );
}

/** ASCII letter (upper-cased code), full-width letter folded, or -1. */
function letterCode(code: number) {
  if (code >= 0x41 && code <= 0x5a) return code;
  if (code >= 0x61 && code <= 0x7a) return code - 0x20;
  if (code >= 0xff21 && code <= 0xff3a) return code - 0xfee0;
  if (code >= 0xff41 && code <= 0xff5a) return code - 0xff00;
  return -1;
}

const PAN_HOLDER_TYPES = new Set('PCHFATBLJG');
const MAX_SEPARATORS = 2;

/** Aadhaar is twelve digits, of which the masked form hides the first eight. */
const AADHAAR_DIGITS = 12;
const AADHAAR_HIDDEN_DIGITS = 8;
/** PAN is ten characters, of which the default masking hides the first six. */
const PAN_LENGTH = 10;
const PAN_HIDDEN_CHARACTERS = 6;

/**
 * True when ten folded character codes read as five letters, four digits and a
 * letter. This is the shape alone — the holder-type letter is checked
 * separately, because the two rules answer different questions. See
 * `isPanHolderType`.
 */
function isPanCharacterShape(codes: readonly number[]) {
  if (codes.length !== PAN_LENGTH) return false;
  for (let index = 0; index < PAN_LENGTH; index += 1) {
    const isDigit = codes[index]! < 0x41;
    if ((index >= 5 && index <= 8) !== isDigit) return false;
  }
  return true;
}

/**
 * True when the fourth letter is one of the ten holder types a PAN uses.
 *
 * This is a *detection* rule, not a validity rule: in free-running text,
 * "Block 1234 C" and part numbers have the PAN shape too, and the holder-type
 * letter is what keeps the scanner from masking them. A single field the user
 * filled in because they were asked for a PAN has no such false positives, so
 * `maskPanValue` deliberately does not apply it — see the note there.
 */
function isPanHolderType(code: number) {
  return PAN_HOLDER_TYPES.has(String.fromCharCode(code));
}

interface Group {
  /** Offset into the chain's position/value arrays. */
  start: number;
  length: number;
}

/**
 * Masks every Aadhaar and PAN number found by the rules above. Positions in
 * the input are replaced one code unit at a time, so the output has exactly
 * the input's length and layout.
 */
export function maskIdentifiers(
  text: string,
  options: MaskOptions = { panMask: 'last4' },
): MaskResult {
  const length = text.length;
  // 1 marks a code unit to replace with X. Allocated lazily.
  let marks: Uint8Array | null = null;
  const mark = (position: number) => {
    marks ??= new Uint8Array(length);
    marks[position] = 1;
  };

  let aadhaarChecksumValid = 0;
  let aadhaarShapeOnly = 0;
  let pan = 0;
  let longNumberRuns = 0;

  // Aadhaar: one pass that builds digit chains.
  const positions: number[] = [];
  const values: number[] = [];
  const groups: Group[] = [];
  let pendingSeparators = 0;

  const maskCandidate = (start: number) => {
    if (values[start]! < 2) return;
    const digits = values.slice(start, start + AADHAAR_DIGITS);
    if (verhoeffValid(digits)) aadhaarChecksumValid += 1;
    else aadhaarShapeOnly += 1;
    for (let offset = 0; offset < AADHAAR_HIDDEN_DIGITS; offset += 1)
      mark(positions[start + offset]!);
  };

  const finishChain = () => {
    let index = 0;
    while (index < groups.length) {
      const group = groups[index]!;
      if (group.length !== 4) {
        if (group.length === AADHAAR_DIGITS) maskCandidate(group.start);
        else if (group.length > AADHAAR_DIGITS) longNumberRuns += 1;
        index += 1;
        continue;
      }
      let run = 0;
      while (index + run < groups.length && groups[index + run]!.length === 4)
        run += 1;
      if (run % 3 === 0) {
        for (let triple = 0; triple < run; triple += 3)
          maskCandidate(groups[index + triple]!.start);
      } else if (run >= 4) {
        longNumberRuns += 1;
      }
      index += run;
    }
    positions.length = 0;
    values.length = 0;
    groups.length = 0;
    pendingSeparators = 0;
  };

  for (let position = 0; position < length; position += 1) {
    const code = text.charCodeAt(position);
    const value = digitValue(code);
    if (value >= 0) {
      if (groups.length === 0 || pendingSeparators > 0) {
        groups.push({ start: positions.length, length: 0 });
      }
      pendingSeparators = 0;
      positions.push(position);
      values.push(value);
      groups[groups.length - 1]!.length += 1;
    } else if (isIgnorable(code)) {
      continue;
    } else if (groups.length > 0 && isSeparator(code)) {
      pendingSeparators += 1;
      if (pendingSeparators > MAX_SEPARATORS) finishChain();
    } else if (groups.length > 0) {
      finishChain();
    }
  }
  if (groups.length > 0) finishChain();

  // PAN: tokens of letters and digits, ignoring invisible characters.
  const tokenPositions: number[] = [];
  const tokenCodes: number[] = [];
  let tokenTooLong = false;
  const finishToken = () => {
    if (
      !tokenTooLong &&
      isPanCharacterShape(tokenCodes) &&
      isPanHolderType(tokenCodes[3]!)
    ) {
      pan += 1;
      const hidden =
        options.panMask === 'all' ? PAN_LENGTH : PAN_HIDDEN_CHARACTERS;
      for (let index = 0; index < hidden; index += 1)
        mark(tokenPositions[index]!);
    }
    tokenPositions.length = 0;
    tokenCodes.length = 0;
    tokenTooLong = false;
  };

  for (let position = 0; position < length; position += 1) {
    const code = text.charCodeAt(position);
    const letter = letterCode(code);
    const digit = letter < 0 ? digitValue(code) : -1;
    if (letter >= 0 || digit >= 0) {
      if (tokenCodes.length >= PAN_LENGTH) {
        tokenTooLong = true;
        continue;
      }
      tokenPositions.push(position);
      tokenCodes.push(letter >= 0 ? letter : 0x30 + digit);
    } else if (isIgnorable(code)) {
      continue;
    } else if (tokenCodes.length > 0) {
      finishToken();
    }
  }
  if (tokenCodes.length > 0) finishToken();

  return {
    output: marks ? applyMarks(text, marks) : text,
    aadhaarChecksumValid,
    aadhaarShapeOnly,
    pan,
    longNumberRuns,
  };
}

function applyMarks(text: string, marks: Uint8Array) {
  const chunks: string[] = [];
  let from = 0;
  let position = marks.indexOf(1);
  while (position !== -1) {
    let end = position;
    while (end < marks.length && marks[end] === 1) end += 1;
    chunks.push(text.slice(from, position), 'X'.repeat(end - position));
    from = end;
    position = marks.indexOf(1, end);
  }
  chunks.push(text.slice(from));
  return chunks.join('');
}

/**
 * One value a person typed into a field that asked for an Aadhaar number.
 *
 * The same rules as above, minus the grouping heuristics: a chain of 12 digits
 * or three groups of 4 is how the scanner *finds* a number in running text, and
 * a field the user filled in has nothing to find. So `2345 678 901 23` is
 * masked here and not in running text, and everything that makes an Aadhaar an
 * Aadhaar — which characters count as a digit, that there are twelve, that the
 * first is 2–9, that the first eight are hidden — is read from the one set of
 * rules this file states, rather than written out a second time.
 *
 * Throws with a message meant for the person, not the developer.
 */
export function maskAadhaarValue(value: string): string {
  const positions: number[] = [];
  const digits: number[] = [];
  for (let position = 0; position < value.length; position += 1) {
    const code = value.charCodeAt(position);
    const digit = digitValue(code);
    if (digit >= 0) {
      positions.push(position);
      digits.push(digit);
    } else if (!isIgnorable(code) && !isSeparator(code)) {
      throw new Error(
        'Aadhaar masking accepts digits, spaces, and hyphens only.',
      );
    }
  }
  if (digits.length !== AADHAAR_DIGITS)
    throw new Error('Aadhaar input must contain exactly 12 digits.');
  if (digits[0]! < 2)
    throw new Error(
      'An Aadhaar number never begins with 0 or 1, so this is not one.',
    );
  const marks = new Uint8Array(value.length);
  for (let index = 0; index < AADHAAR_HIDDEN_DIGITS; index += 1)
    marks[positions[index]!] = 1;
  return applyMarks(value, marks);
}

/**
 * One value a person typed into a field that asked for a PAN.
 *
 * Same masking as above and the same idea of what a PAN looks like, with one
 * deliberate difference: the holder-type letter is not required. That letter is
 * there to stop the scanner masking ordinary text that happens to have the
 * shape, and a field filled in on purpose carries no such risk — refusing a
 * value because its fourth letter is unusual would be validating the PAN, which
 * this tool says it does not do.
 */
export function maskPanValue(
  value: string,
  style: PanMaskStyle = 'last4',
): string {
  // Unlike Aadhaar, the canonical form is what a PAN is written in, so this
  // returns the ten characters rather than preserving whatever was typed
  // around them.
  const codes: number[] = [];
  for (let position = 0; position < value.length; position += 1) {
    const code = value.charCodeAt(position);
    const letter = letterCode(code);
    const digit = letter < 0 ? digitValue(code) : -1;
    if (letter >= 0 || digit >= 0) {
      codes.push(letter >= 0 ? letter : 0x30 + digit);
    } else if (!isIgnorable(code) && !isSeparator(code)) {
      throw new Error('PAN masking expects exactly 10 letters/numbers.');
    }
  }
  if (codes.length !== PAN_LENGTH)
    throw new Error('PAN masking expects exactly 10 letters/numbers.');
  if (!isPanCharacterShape(codes))
    throw new Error(
      'A PAN is five letters, then four digits, then one letter.',
    );
  const hidden = style === 'all' ? PAN_LENGTH : PAN_HIDDEN_CHARACTERS;
  return (
    'X'.repeat(hidden) +
    codes
      .slice(hidden)
      .map((code) => String.fromCharCode(code))
      .join('')
  );
}
