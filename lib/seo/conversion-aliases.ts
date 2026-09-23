import {
  CONVERSION_SYSTEMS,
  conversionPairById,
  slugToken,
  slugify,
} from './conversion-pairs';

/**
 * The spellings people type, sent to the page that answers them.
 *
 * `/convert` names a unit by the word the converter's own label uses, which is
 * British and written out: `centimetres-to-inches`, `kilograms-to-pounds`,
 * `celsius-to-fahrenheit`. Nobody types that. On 2026-09-23 `/convert/cm-to-in`,
 * `/convert/kg-to-lbs`, `/convert/c-to-f` and `/convert/km-to-mi` all returned
 * 404 while the long form sat there unread.
 *
 * REDIRECTS, NOT PAGES. A second page for `cm-to-in` would be the same
 * converter answering the same question at a second address, which splits
 * whatever either had earned between them and leaves a search engine to pick a
 * canonical on our behalf. One page, and every other spelling of its question
 * points at it.
 *
 * DERIVED, NEVER TYPED. Every alias below comes from the converters' own unit
 * lists: the unit's key (`cm`), the words of its label (`centimetres`), the
 * American spelling of those words, and the singular of either. Only genuinely
 * irregular spellings -- `lbs` for pounds, `kph` for kilometres per hour -- are
 * named, and they are named against the unit key so a renamed label cannot
 * strand them. A unit added to a converter brings its aliases with it.
 *
 * AMBIGUITY IS DROPPED, NOT GUESSED. If two units would claim the same
 * spelling, neither gets it: a redirect that might send someone to the wrong
 * conversion is worse than a 404 they can read.
 */

/** Irregular spellings, keyed by the unit key they belong to. */
const EXTRA_SPELLINGS: Readonly<Record<string, readonly string[]>> = {
  lb: ['lbs'],
  kg: ['kgs'],
  C: ['centigrade'],
  s: ['sec', 'secs'],
  min: ['mins'],
  h: ['hr', 'hrs'],
  'km/h': ['kmh', 'kph'],
  'cm³': ['cc'],
  'm²': ['sqm'],
  'ft²': ['sqft'],
  'gal-us': ['gallons'],
  'cup-us': ['cups'],
  'floz-us': ['fl-oz', 'fluid-ounces'],
  tsp: ['teaspoons'],
  tbsp: ['tablespoons'],
  kB: ['kilobytes'],
  MB: ['megabytes'],
  GB: ['gigabytes'],
  KiB: ['kibibytes'],
  MiB: ['mebibytes'],
  GiB: ['gibibytes'],
  nmi: ['nautical-mile'],
};

/** `centimetres` -> `centimeters`, `litres` -> `liters`. */
function americanised(token: string): string {
  return token.replace(/([bcdfghjklmnpqrstvwxz])res?\b/gu, '$1ers');
}

function spellings(token: string): string[] {
  const forms = new Set<string>();
  for (const base of [token, americanised(token)]) {
    if (!base) continue;
    forms.add(base);
    if (base.endsWith('s')) forms.add(base.slice(0, -1));
  }
  return [...forms];
}

/**
 * Alias token -> the token the page's slug uses. Built once, lazily: the proxy
 * asks for it only when a `/convert/` path did not match a page, which is a
 * small minority of a small minority of requests.
 */
let aliases: ReadonlyMap<string, string> | undefined;

function unitAliases(): ReadonlyMap<string, string> {
  if (aliases) return aliases;

  const canonical = new Set<string>();
  for (const system of CONVERSION_SYSTEMS)
    for (const unit of system.units) canonical.add(slugToken(unit));

  const claimed = new Map<string, string>();
  const ambiguous = new Set<string>();

  for (const system of CONVERSION_SYSTEMS) {
    for (const unit of system.units) {
      const target = slugToken(unit);
      const candidates = new Set<string>();
      for (const source of [
        slugify(unit.value),
        slugify(unit.label),
        ...(EXTRA_SPELLINGS[unit.value] ?? []),
      ]) {
        for (const spelling of spellings(source)) candidates.add(spelling);
      }

      for (const candidate of candidates) {
        // Already the name of a unit in its own right, so it is not free.
        if (canonical.has(candidate)) continue;
        const existing = claimed.get(candidate);
        if (existing && existing !== target) {
          ambiguous.add(candidate);
          continue;
        }
        claimed.set(candidate, target);
      }
    }
  }

  for (const token of ambiguous) claimed.delete(token);
  aliases = claimed;
  return claimed;
}

/** Exposed for the test, which checks every alias resolves to a real page. */
export function conversionUnitAliases(): ReadonlyMap<string, string> {
  return unitAliases();
}

/**
 * The canonical `/convert` page for a path someone typed, or null.
 *
 * Null for a path that already is a page: the caller is asking what to
 * redirect, and redirecting a live URL to itself is a loop.
 */
export function conversionAliasRedirect(pathname: string): string | null {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/u, '') : pathname;
  const slug = /^\/convert\/([a-z0-9]+(?:-[a-z0-9]+)*)$/u.exec(
    path.toLowerCase(),
  )?.[1];
  if (!slug) return null;
  if (conversionPairById(slug)) return null;

  const parts = slug.split('-to-');
  if (parts.length !== 2) return null;
  const map = unitAliases();
  const from = map.get(parts[0]!) ?? parts[0]!;
  const to = map.get(parts[1]!) ?? parts[1]!;
  const canonical = `${from}-to-${to}`;
  if (canonical === slug) return null;
  return conversionPairById(canonical) ? `/convert/${canonical}` : null;
}
