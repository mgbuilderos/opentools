/**
 * One reader, and one statement of the cache policy, for `_headers`.
 *
 * Two things need to ask the same questions of this file and must not drift
 * apart: `lib/edge-cache-headers.test.ts`, which checks the source in
 * `public/`, and `scripts/verify-built-headers.mjs`, which checks the copy in
 * `dist/client/` that the deploy actually uploads. A second parser, or a
 * second list of invariants, is how one of the two ends up passing on a file
 * the other would have rejected.
 *
 * Plain JavaScript because the build guard is a `node scripts/...` step and
 * there is no TypeScript runtime in the build. The test imports it directly.
 */

/**
 * @typedef {object} HeaderLine
 * @property {'set' | 'unset'} kind
 * @property {string} name
 * @property {string} value Empty for an `! Name` line.
 */

/**
 * @typedef {object} HeaderRule
 * @property {string} pattern
 * @property {HeaderLine[]} lines Every line of the rule, in file order.
 */

/**
 * Parses `_headers` the way Cloudflare's asset layer reads it: an unindented
 * line opens a rule, indented lines belong to it, `#` lines and blanks are
 * ignored.
 *
 * @param {string} source
 * @returns {HeaderRule[]}
 */
export function parseHeaderRules(source) {
  /** @type {HeaderRule[]} */
  const rules = [];
  for (const line of source.split('\n')) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    if (!/^\s/u.test(line)) {
      rules.push({ pattern: line.trim(), lines: [] });
      continue;
    }
    const rule = rules.at(-1);
    if (!rule) throw new Error(`an indented line precedes any rule: ${line}`);
    const removed = /^\s*!\s*(\S+)\s*$/u.exec(line);
    if (removed) {
      rule.lines.push({ kind: 'unset', name: removed[1], value: '' });
      continue;
    }
    const assigned = /^\s*([^:\s]+):\s*(.+?)\s*$/u.exec(line);
    if (!assigned) throw new Error(`unparseable header line: ${line}`);
    rule.lines.push({ kind: 'set', name: assigned[1], value: assigned[2] });
  }
  return rules;
}

/**
 * The value of one `Cache-Control` directive, `''` when it is present without
 * a value, `undefined` when it is absent.
 *
 * @param {string} value
 * @param {string} name
 * @returns {string | undefined}
 */
export function directive(value, name) {
  const match = new RegExp(
    `(?:^|,)\\s*${name}(?:=([^,]+))?\\s*(?:,|$)`,
    'u',
  ).exec(value);
  if (!match) return undefined;
  return match[1]?.trim() ?? '';
}

/** @param {HeaderRule} rule @param {'set' | 'unset'} kind */
function cacheControlAt(rule, kind) {
  return rule.lines.findIndex(
    (line) => line.kind === kind && line.name === 'Cache-Control',
  );
}

/** @param {HeaderRule} rule @returns {string[]} */
function cacheControlValues(rule) {
  return rule.lines
    .filter((line) => line.kind === 'set' && line.name === 'Cache-Control')
    .map((line) => line.value);
}

/** The longest an unpurged deploy may stay invisible at the edge, in seconds. */
export const MAX_EDGE_STALENESS = 3600;

/**
 * Every invariant the shipped cache policy has to satisfy, as a list of
 * problems. Empty means the file is correct.
 *
 * Each of these has been wrong on the live site at least once:
 *
 *   * no `s-maxage` on the catch-all — the edge inherited `max-age=0`,
 *     revalidated against the Worker on every single request, and the zone hit
 *     rate sat at 42.55% on a site where every URL is a build-time file.
 *   * `max-age=86400, must-revalidate` on content-hashed build output, which
 *     re-checks about fifteen unchangeable files on every page view.
 *   * a narrower rule setting `Cache-Control` with no `! Cache-Control` first.
 *     Rules COMBINE rather than replace, so that rule ships both its own value
 *     and the catch-all's, and the catch-all's `max-age=0` wins. Measured
 *     2026-09-23 by dropping the unset line from `/og.png` and serving the
 *     build: it answered `...must-revalidate, s-maxage=3600, ..., max-age=86400`
 *     — both policies at once, the stricter one first.
 *
 * @param {HeaderRule[]} rules
 * @returns {string[]}
 */
export function auditCachePolicy(rules) {
  /** @type {string[]} */
  const problems = [];

  if (rules.length <= 5) {
    problems.push(
      `only ${rules.length} rules parsed — the file is empty, truncated, or ` +
        'no longer in the format the asset layer reads. Every check below ' +
        'would vacuously pass on nothing.',
    );
    return problems;
  }

  for (const rule of rules) {
    const values = cacheControlValues(rule);
    if (values.length > 1) {
      problems.push(
        `${rule.pattern} sets Cache-Control ${values.length} times; the ` +
          'values are combined and the result is a policy nobody wrote',
      );
    }
  }

  const catchAll = rules.find((rule) => rule.pattern === '/*');
  if (!catchAll) {
    problems.push(
      'no /* rule, so HTML pages get the asset layer default of ' +
        '`max-age=0, must-revalidate` and every page view wakes the Worker',
    );
  } else {
    const value = cacheControlValues(catchAll)[0] ?? '';
    if (directive(value, 'public') === undefined) {
      problems.push(
        '/* Cache-Control is not `public`, so no shared cache stores it',
      );
    }
    if (directive(value, 'max-age') !== '0') {
      problems.push(
        '/* no longer tells the browser `max-age=0`; a visitor would hold a ' +
          'page past a deploy, which is the one thing s-maxage exists to avoid',
      );
    }
    if (directive(value, 'must-revalidate') === undefined) {
      problems.push('/* dropped `must-revalidate` for the browser');
    }

    const shared = directive(value, 's-maxage');
    if (shared === undefined) {
      problems.push(
        '/* has no `s-maxage`, so Cloudflare inherits `max-age=0` and ' +
          'revalidates against the Worker on every request — the 42.55% zone ' +
          'hit rate measured 2026-09-23',
      );
    } else if (Number(shared) < 600) {
      problems.push(`/* s-maxage=${shared} is under the 600s floor`);
    } else if (Number(shared) > MAX_EDGE_STALENESS) {
      problems.push(
        `/* s-maxage=${shared} exceeds ${MAX_EDGE_STALENESS}s. That is how ` +
          'long a deploy can stay invisible at the edge, and it is a decision ' +
          'about propagation, not a tuning knob.',
      );
    }

    const stale = directive(value, 'stale-while-revalidate');
    if (stale === undefined) {
      problems.push(
        '/* has no `stale-while-revalidate`, so the hourly refresh makes a ' +
          'visitor wait for the Worker instead of happening in the background',
      );
    } else if (Number(stale) < Number(shared ?? 0)) {
      problems.push(
        `/* stale-while-revalidate=${stale} is shorter than s-maxage=${shared}`,
      );
    }
  }

  const hashed = rules.find((rule) => rule.pattern === '/_next/static/*');
  if (!hashed) {
    problems.push(
      'no /_next/static/* rule; content-hashed build output would fall back ' +
        'to the catch-all and be re-checked on every page view',
    );
  } else if (
    cacheControlValues(hashed)[0] !== 'public, max-age=31536000, immutable'
  ) {
    problems.push(
      `/_next/static/* is \`${cacheControlValues(hashed)[0]}\`, not ` +
        '`public, max-age=31536000, immutable`. Every filename under that ' +
        'prefix carries a content hash or sits in a build-id directory, so a ' +
        'cached copy can never go stale and has nothing to revalidate.',
    );
  }

  for (const pattern of ['/_next/static/*', '/ocr/*']) {
    const rule = rules.find((candidate) => candidate.pattern === pattern);
    if (!rule || cacheControlValues(rule).length === 0) continue;
    const value = cacheControlValues(rule)[0];
    if (directive(value, 'immutable') === undefined) {
      problems.push(`${pattern} is not immutable: \`${value}\``);
    }
    if (directive(value, 'must-revalidate') !== undefined) {
      problems.push(
        `${pattern} still carries must-revalidate; a name that cannot be ` +
          'reused has nothing to re-check',
      );
    }
    if (directive(value, 'max-age') === '0') {
      problems.push(`${pattern} has max-age=0`);
    }
  }

  // The trap that makes this file dangerous to edit: matching rules are
  // combined, never replaced.
  for (const rule of rules) {
    if (rule.pattern === '/*') continue;
    const set = cacheControlAt(rule, 'set');
    if (set === -1) continue;
    const unset = cacheControlAt(rule, 'unset');
    if (unset === -1) {
      problems.push(
        `${rule.pattern} sets Cache-Control without \`! Cache-Control\` ` +
          "first. Rules combine, so it ships its own value AND the catch-all's " +
          '`max-age=0, must-revalidate` — and the catch-all wins.',
      );
    } else if (unset > set) {
      problems.push(
        `${rule.pattern} removes Cache-Control after setting it, which ` +
          'leaves the rule with no policy at all',
      );
    }
  }

  return problems;
}
