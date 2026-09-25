import { MATH_OPERATIONS, runMathOperation } from '../tools/math-workbench';
import { TITLE_SUFFIX_LENGTH } from './title-budget';

/**
 * One page per from->to unit pair, derived from the converters' own unit lists.
 *
 * WHY THIS EXISTS. "cm to inches", "km to miles" and "kg to lbs" are three
 * searches, not one. Until now all three were answered by `/math/`, three
 * addresses whose page titles were the converter's name -- "Distance
 * converter" -- so none of them said the words anybody typed. A converter is
 * not one search intent; it is the whole grid of pairs it supports, and each
 * cell of that grid is a question with its own answer.
 *
 * WHY THIS IS NOT THE THIN-PAGE FAMILY C4 FORBIDS. The ~430 URLs being
 * de-indexed under decision 11 are prose *about* tools, near-identical to each
 * other, with nothing on them that does the job. These are the opposite: the
 * page's whole content is the work. The converter arrives pre-set to the pair,
 * so the answer is one keystroke away, and the factor and worked examples
 * below it are produced by calling the same `runMathOperation` the tool runs --
 * a different number on every page, incapable of drifting from the tool
 * because it is the tool. A pair with no working conversion generates no page.
 *
 * DERIVED, NEVER TYPED. The pairs come from the operation definitions, so a
 * unit added to a converter gets its pages on the next build, and a unit
 * removed loses them. Nothing here names a unit.
 */

export interface ConversionUnit {
  value: string;
  label: string;
}

/** A converter that takes a value and converts it between two of its units. */
export interface ConversionSystem {
  operationId: string;
  name: string;
  units: readonly ConversionUnit[];
}

export interface ConversionPair {
  /** Slug, and the `id` that `routedToolIdsForPrefix('/convert')` reports. */
  id: string;
  operationId: string;
  from: string;
  to: string;
  fromLabel: string;
  toLabel: string;
  title: string;
}

/** An input and what the converter really returns for it. */
export interface ConversionExample {
  input: string;
  output: string;
}

export interface ConversionFacts {
  /** What the numbers prove about this pair; '' when nothing could be proved. */
  relationship: string;
  examples: readonly ConversionExample[];
  /** Unit key -> label, for this converter only. */
  units: Record<string, string>;
  /** `${from}|${to}` -> pair slug, for this converter only. */
  routes: Record<string, string>;
  description: string;
}

/**
 * A converter is recognised by its own shape rather than by a list of ids: a
 * numeric `value`, and `from`/`to` selects offering the same units. That is
 * what every unit converter in the workbench already looks like, so a new one
 * is picked up without this file being edited -- and an operation that only
 * resembles one (a different option list on each side) is not.
 */
function unitsOf(
  operation: (typeof MATH_OPERATIONS)[number],
): readonly ConversionUnit[] | undefined {
  const value = operation.fields.find((field) => field.id === 'value');
  const from = operation.fields.find((field) => field.id === 'from');
  const to = operation.fields.find((field) => field.id === 'to');
  if (
    value?.type !== 'number' ||
    from?.type !== 'select' ||
    to?.type !== 'select'
  )
    return undefined;
  const fromUnits = from.options ?? [];
  const toUnits = to.options ?? [];
  if (fromUnits.length < 2) return undefined;
  const same =
    fromUnits.length === toUnits.length &&
    fromUnits.every((unit, index) => unit.value === toUnits[index]?.value);
  return same ? fromUnits : undefined;
}

export const CONVERSION_SYSTEMS: readonly ConversionSystem[] =
  MATH_OPERATIONS.flatMap((operation) => {
    const units = unitsOf(operation);
    return units
      ? [{ operationId: operation.id, name: operation.name, units }]
      : [];
  });

export function slugify(source: string) {
  return source
    .normalize('NFKD')
    .replace(/[̀-ͯ]/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '');
}

/**
 * The word a person types. A one-word label is the unit's name and makes the
 * better URL -- `celsius-to-fahrenheit`, not `c-to-f`. A label of several
 * words, or one carrying a qualifier in brackets, would make an unreadable
 * slug, so the unit's own key stands in: `cup-us`, `psi`, `kB`.
 */
export function slugToken(unit: ConversionUnit) {
  return slugify(/^[^\s(]+$/u.test(unit.label) ? unit.label : unit.value);
}

/** Lowercases a label's first word unless it is an acronym such as US or BTU. */
function inSentence(label: string) {
  return /^[A-Z][a-z]/u.test(label)
    ? `${label[0]!.toLowerCase()}${label.slice(1)}`
    : label;
}

/** What a search result shows of a title before it truncates it. */
const SNIPPET_LIMIT = 60;

/** A key short enough to read as a unit symbol in a title: `cm`, `kWh`, `m/s`. */
function isSymbol(unit: ConversionUnit) {
  return /^[^\s-]{1,5}$/u.test(unit.value) && unit.value !== unit.label;
}

/**
 * Both phrasings where they fit: people search "cm to in" and they search
 * "centimetres to inches". The symbols are dropped when a label already
 * carries a bracketed qualifier, or when the pair of them would push the title
 * past what a result page shows.
 */
function titleFor(from: ConversionUnit, to: ConversionUnit) {
  const words = `Convert ${from.label} to ${to.label}`;
  const withSymbols = `${words} (${from.value} to ${to.value})`;
  const bracketed = from.label.includes('(') || to.label.includes('(');
  // The 60 is the whole served title, so it has to include the twelve
  // characters `app/layout.tsx` appends. Counting only this string let six
  // pairs ship a 72-character title -- `km² to cm²` was cut off in results by
  // the site name it was measured without.
  return isSymbol(from) &&
    isSymbol(to) &&
    !bracketed &&
    withSymbols.length + TITLE_SUFFIX_LENGTH <= SNIPPET_LIMIT
    ? withSymbols
    : words;
}

/**
 * Every ordered pair of different units, from every converter.
 *
 * Two converters can offer the same pair -- the cooking converter repeats the
 * volume converter's millilitres, litres, cups and fluid ounces. The first
 * converter to claim a slug keeps it, because a second page would be the same
 * question with the same answer, which is precisely the duplicate this route
 * exists to avoid. `conversion-pairs.test.ts` checks that the two really do
 * answer alike -- to the twelfth significant figure, which is as far as either
 * prints -- so "first wins" cannot quietly pick the wrong one.
 */
export const CONVERSION_PAIRS: readonly ConversionPair[] = (() => {
  const claimed = new Set<string>();
  const pairs: ConversionPair[] = [];
  for (const system of CONVERSION_SYSTEMS)
    for (const from of system.units)
      for (const to of system.units) {
        if (from.value === to.value) continue;
        const id = `${slugToken(from)}-to-${slugToken(to)}`;
        if (claimed.has(id)) continue;
        claimed.add(id);
        pairs.push({
          id,
          operationId: system.operationId,
          from: from.value,
          to: to.value,
          fromLabel: from.label,
          toLabel: to.label,
          title: titleFor(from, to),
        });
      }
  return pairs;
})();

const PAIR_BY_ID = new Map(CONVERSION_PAIRS.map((pair) => [pair.id, pair]));

export function conversionPairById(id: string) {
  return PAIR_BY_ID.get(id);
}

/** What the converter prints for this input, or undefined when it refuses it. */
function output(pair: ConversionPair, value: number) {
  try {
    return runMathOperation(pair.operationId, {
      value: String(value),
      from: pair.from,
      to: pair.to,
    });
  } catch {
    return undefined;
  }
}

/** The number out of that, so the shape of the conversion can be measured. */
function measure(pair: ConversionPair, value: number) {
  const printed = output(pair, value);
  const parsed = Number(
    /^-?[\d.]+(?:e[+-]?\d+)?/iu.exec(printed ?? '')?.[0] ?? 'x',
  );
  return Number.isFinite(parsed) ? parsed : undefined;
}

const PROBES = [1, 10, 100];
/** Twelve significant figures, the precision the converter itself prints at. */
const trim = (value: number) => String(Number(value.toPrecision(12)));
const agrees = (actual: number, expected: number) =>
  Math.abs(actual - expected) <= 1e-9 * Math.max(1, Math.abs(expected));

/**
 * What kind of relationship this pair is, measured by running it.
 *
 * Most conversions scale, so the honest fact is the factor. Temperature does
 * not -- it scales and shifts -- and fuel economy inverts, because litres per
 * 100 km falls as miles per gallon rises. Printing "the factor" on those pages
 * would be a confident falsehood, so the shape is established from the
 * converter's own answers before anything is claimed, and a pair whose shape
 * cannot be established says nothing about it and shows the worked examples
 * alone.
 */
function relationshipOf(pair: ConversionPair) {
  const measured = PROBES.map((probe) => measure(pair, probe));
  if (measured.some((value) => value === undefined)) return '';
  const [one, ten, hundred] = measured as [number, number, number];
  const fits = (predict: (input: number) => number) =>
    PROBES.every((probe, index) => agrees(measured[index]!, predict(probe)));

  // Scaling, which is what nearly every unit pair does. The factor quoted is
  // the string the converter itself prints for an input of 1, so the sentence
  // and the tool cannot disagree about it by even a digit.
  const printed = output(pair, 1)?.replace(/\s\S+$/u, '');
  if (printed && fits((input) => one * input))
    return `Exact factor: multiply ${inSentence(pair.fromLabel)} by ${printed} to get ${inSentence(pair.toLabel)}.`;

  // Scale and shift, which is what temperature does.
  const slope = (hundred - ten) / 90;
  const offset = ten - slope * 10;
  if (fits((input) => slope * input + offset))
    return `Exact relationship: multiply by ${trim(slope)}, then ${offset < 0 ? 'subtract' : 'add'} ${trim(Math.abs(offset))}.`;

  // Inverse, which is what litres per 100 km against miles per gallon does.
  if (fits((input) => one / input))
    return `Reciprocal relationship: ${inSentence(pair.fromLabel)} multiplied by ${inSentence(pair.toLabel)} is always ${trim(one)}, so a higher figure on one side is a lower figure on the other.`;

  return '';
}

/**
 * The pair-specific content of the page, computed at build time by running the
 * converter. Kept out of `CONVERSION_PAIRS` on purpose: the list is imported by
 * the route registry and the sitemap, and only the one page being rendered
 * needs its own worked examples.
 */
export function conversionFacts(pair: ConversionPair): ConversionFacts {
  const system = CONVERSION_SYSTEMS.find(
    (candidate) => candidate.operationId === pair.operationId,
  );
  const preset =
    MATH_OPERATIONS.find(
      (operation) => operation.id === pair.operationId,
    )?.fields.find((field) => field.id === 'value')?.defaultValue ?? '1';
  const inputs = [...new Set([1, Number(preset), 10, 100])]
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);
  const examples = inputs.flatMap((value) => {
    const printed = output(pair, value);
    return printed ? [{ input: `${value} ${pair.from}`, output: printed }] : [];
  });

  const units: Record<string, string> = {};
  for (const unit of system?.units ?? []) units[unit.value] = unit.label;
  const routes: Record<string, string> = {};
  for (const other of CONVERSION_PAIRS)
    if (other.operationId === pair.operationId)
      routes[`${other.from}|${other.to}`] = other.id;

  const first = examples[0];
  return {
    relationship: relationshipOf(pair),
    examples,
    units,
    routes,
    description: `${first ? `${first.input} = ${first.output}. ` : ''}Convert ${inSentence(pair.fromLabel)} to ${inSentence(pair.toLabel)} in this browser tab, with the exact factor and worked examples.`,
  };
}
