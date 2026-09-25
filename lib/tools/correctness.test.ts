import { describe, expect, it } from 'vitest';

import {
  ADVANCED_DEVELOPER_OPERATIONS,
  runAdvancedDeveloperOperation,
} from './developer-advanced-workbench';
import { CREATOR_OPERATIONS, runCreatorOperation } from './creator-workbench';
import { DATE_OPERATIONS, runDateOperation } from './date-workbench';
import {
  DEVELOPER_DATA_OPERATIONS,
  runDeveloperDataOperation,
} from './developer-data-workbench';
import {
  DOCUMENT_OPERATIONS,
  runDocumentOperation,
} from './document-workbench';
import {
  FINANCE_OPERATIONS,
  runFinanceOperation,
} from './finance-business-workbench';
import {
  LIFE_ADMIN_OPERATIONS,
  runLifeAdminOperation,
} from './life-admin-workbench';
import { MATH_OPERATIONS, runMathOperation } from './math-workbench';
import {
  PRODUCTIVITY_OPERATIONS,
  runProductivityOperation,
} from './productivity-workbench';
import {
  QR_BARCODE_OPERATIONS,
  runQrBarcodeOperation,
} from './qr-barcode-workbench';
import {
  SCIENCE_OPERATIONS,
  runScienceOperation,
} from './science-education-workbench';
import {
  SPREADSHEET_OPERATIONS,
  runSpreadsheetOperation,
} from './spreadsheet-workbench';
import { WEB_OPERATIONS, runWebOperation } from './web-workbench';
import { WRITING_OPERATIONS, runWritingOperation } from './writing-workbench';

/**
 * Are the answers right?
 *
 * WHY THIS FILE EXISTS. `all-operations-qc.test.ts` runs all 598 operations and
 * asserts, for each one, that the output is not empty, carries no NUL byte, no
 * `[object Object]` and no `NaN`. That is a garbage check. A SHA-256 tool
 * returning the wrong digest, a converter using the wrong factor and a loan
 * calculator with a sign error all pass it, and a visitor cannot tell by
 * looking. This file checks the answers themselves.
 *
 * WHERE THE EXPECTED VALUES COME FROM. Never from this codebase. The digests
 * and encodings below were produced by Node's own `crypto` and `Buffer` and
 * frozen here as literals -- the test does not compute them at run time and
 * does not shell out, so it cannot drift into agreeing with whatever the tool
 * happens to do. The conversion factors are the units' defining constants
 * (1 in = 25.4 mm, 1 lb = 453.59237 g, 1 atm = 101325 Pa, 1 GiB = 2^30 B, all
 * exact). The finance figures come from the formulas implemented again here,
 * independently, including a month-by-month amortisation rather than a closed
 * form. The calendar cases come from the Gregorian leap rule and ISO-8601.
 */

const SAMPLE = 'Hello, world! ☃ & <tag> "q" 100%';

// Frozen from Node crypto/Buffer. Do not regenerate these from the tools.
const FROZEN = {
  sha256: '75700e7166cd0f52066236aeffe8478a9ae080680176c828239df2a6194d878f',
  sha384:
    '4f65d3c3ff2f1dfd67ec19f6a8424ae2c2240b3f35b6cdb5422ec42ac16d584077fe285893ee396c951db35bb22be1e4',
  sha512:
    '3724cbd8e0ee8337cfa149fb37b0c980f92db4762544a49188d3e7840d559a336fa4c0636b3c7fd8e9ddb0b94dda86f5cd0cc300c36e78997574c9b05244ac90',
  base64: 'SGVsbG8sIHdvcmxkISDimIMgJiA8dGFnPiAicSIgMTAwJQ==',
  base64url: 'SGVsbG8sIHdvcmxkISDimIMgJiA8dGFnPiAicSIgMTAwJQ',
  hex: '48656c6c6f2c20776f726c642120e298832026203c7461673e202271222031303025',
  uriComponent:
    'Hello%2C%20world!%20%E2%98%83%20%26%20%3Ctag%3E%20%22q%22%20100%25',
  uri: 'Hello,%20world!%20%E2%98%83%20&%20%3Ctag%3E%20%22q%22%20100%25',
};

interface OperationField {
  id: string;
  type?: string;
  defaultValue?: string;
  options?: ReadonlyArray<{ value: string }>;
}

interface Operation {
  id: string;
  fields?: readonly OperationField[];
}

type RunOperation = (id: string, values: Record<string, string>) => unknown;

const text = (value: unknown) =>
  typeof value === 'string'
    ? value
    : String((value as { output?: string })?.output ?? value);

/**
 * Some suites run synchronously and some return a promise (the digests go
 * through WebCrypto). Normalising here keeps every call site identical and
 * keeps `await` off values that were never thenable.
 */
const answer = async (
  run: RunOperation,
  id: string,
  values: Record<string, string>,
) => text(await Promise.resolve(run(id, values)));

const firstNumber = (value: string) =>
  Number((value.match(/-?[\d.]+(?:e[+-]?\d+)?/u) ?? ['NaN'])[0]);

const numberAfter = (value: string, label: string) =>
  Number((value.split(label)[1] ?? '').match(/-?[\d.]+/u)?.[0] ?? NaN);

describe('tool answers, against sources outside this codebase', () => {
  it('digests and encodings match Node crypto and Buffer', async () => {
    const run = (id: string, input: string) =>
      answer(runDeveloperDataOperation, id, { input });

    expect((await run('sha-256-text', SAMPLE)).trim()).toBe(FROZEN.sha256);
    expect((await run('sha-384-text', SAMPLE)).trim()).toBe(FROZEN.sha384);
    expect((await run('sha-512-text', SAMPLE)).trim()).toBe(FROZEN.sha512);
    expect((await run('base64-encode-text', SAMPLE)).trim()).toBe(
      FROZEN.base64,
    );
    expect((await run('base64url-encode-text', SAMPLE)).trim()).toBe(
      FROZEN.base64url,
    );
    expect((await run('hex-encode-text', SAMPLE)).trim()).toBe(FROZEN.hex);
    expect((await run('url-encode-component', SAMPLE)).trim()).toBe(
      FROZEN.uriComponent,
    );
    expect((await run('url-encode', SAMPLE)).trim()).toBe(FROZEN.uri);

    // Decoders are fed the frozen encoding and must return the original.
    expect((await run('base64-decode-text', FROZEN.base64)).trim()).toBe(
      SAMPLE,
    );
    expect((await run('hex-decode-text', FROZEN.hex)).trim()).toBe(SAMPLE);
    expect(
      (await run('url-decode-component', FROZEN.uriComponent)).trim(),
    ).toBe(SAMPLE);

    // The checksum picker must work for every algorithm it offers.
    const picker = ADVANCED_DEVELOPER_OPERATIONS.find(
      (operation) => operation.id === 'checksum-calculator',
    );
    const offered =
      picker?.fields.find((field) => field.id === 'algorithm')?.options ?? [];
    expect(offered.length).toBeGreaterThan(0);
    for (const option of offered) {
      const digest = (
        await answer(runAdvancedDeveloperOperation, 'checksum-calculator', {
          input: SAMPLE,
          algorithm: option.value,
        })
      ).trim();
      expect(digest, `checksum-calculator offers ${option.value}`).toMatch(
        /^[0-9a-f]{40,128}$/u,
      );
    }
    expect(
      (
        await answer(runAdvancedDeveloperOperation, 'checksum-calculator', {
          input: SAMPLE,
          algorithm: 'SHA-256',
        })
      ).trim(),
    ).toBe(FROZEN.sha256);
  });

  it('unit converters match the units defining constants', async () => {
    // [operation, value, from, to, exact expected]
    const cases: ReadonlyArray<
      readonly [string, string, string, string, number]
    > = [
      ['data-size-converter', '1', 'GiB', 'B', 1073741824],
      ['data-size-converter', '1', 'MiB', 'KiB', 1024],
      ['data-size-converter', '1', 'GB', 'B', 1e9],
      ['cooking-unit-converter', '1', 'cup-us', 'ml', 236.5882365],
      ['cooking-unit-converter', '1', 'tbsp', 'tsp', 3],
      ['cooking-unit-converter', '1', 'floz-us', 'ml', 29.5735295625],
      ['temperature-converter', '100', 'C', 'F', 212],
      ['temperature-converter', '-40', 'C', 'F', -40],
      ['temperature-converter', '0', 'C', 'K', 273.15],
      ['pressure-converter', '1', 'atm', 'Pa', 101325],
      ['pressure-converter', '1', 'bar', 'Pa', 100000],
      ['pressure-converter', '1', 'psi', 'Pa', 6894.757293168],
      ['energy-converter', '1', 'kWh', 'J', 3600000],
      ['energy-converter', '1', 'cal', 'J', 4.184],
      ['energy-converter', '1', 'BTU', 'J', 1055.05585262],
      ['speed-converter', '1', 'mph', 'km/h', 1.609344],
      ['speed-converter', '1', 'knot', 'km/h', 1.852],
      ['distance-converter', '1', 'in', 'mm', 25.4],
      ['distance-converter', '1', 'mi', 'km', 1.609344],
      ['distance-converter', '1', 'nmi', 'm', 1852],
      ['mass-converter', '1', 'lb', 'g', 453.59237],
      ['mass-converter', '1', 'oz', 'g', 28.349523125],
      ['mass-converter', '1', 'stone', 'lb', 14],
      ['power-converter', '1', 'hp', 'W', 745.6998715822702],
      ['angle-converter', '180', 'deg', 'rad', Math.PI],
      ['area-converter', '1', 'acre', 'm²', 4046.8564224],
      ['volume-converter', '1', 'gal-us', 'l', 3.785411784],
      ['fuel-economy-converter', '10', 'l100km', 'mpg-us', 23.5214583],
    ];

    for (const [operation, value, from, to, expected] of cases) {
      const got = firstNumber(
        await answer(runMathOperation, operation, { value, from, to }),
      );
      expect(
        Math.abs(got - expected) <= Math.abs(expected) * 1e-9,
        `${operation}: ${value} ${from} -> ${to} gave ${got}, expected ${expected}`,
      ).toBe(true);
    }
  });

  it('finance formulas match implementations written from the definitions', async () => {
    const emi = (principal: number, annual: number, years: number) => {
      const rate = annual / 100 / 12;
      const periods = years * 12;
      return (
        (principal * rate * (1 + rate) ** periods) / ((1 + rate) ** periods - 1)
      );
    };
    const npv = (rate: number, flows: readonly number[]) =>
      flows.reduce((sum, flow, index) => sum + flow / (1 + rate) ** index, 0);
    // Amortised month by month rather than by a closed form, so a rounding or
    // ordering mistake in the tool cannot be matched by the same mistake here.
    const amortise = (balance: number, annual: number, payment: number) => {
      const rate = annual / 100 / 12;
      let owed = balance;
      let interest = 0;
      let months = 0;
      while (owed > 0 && months < 1200) {
        const accrued = owed * rate;
        interest += accrued;
        owed = owed + accrued - payment;
        months += 1;
      }
      return { months, interest };
    };

    let out = await answer(runFinanceOperation, 'loan-emi-calculator', {
      principal: '1000000',
      annualRate: '8.5',
      years: '20',
    });
    expect(numberAfter(out, 'interest:')).toBeCloseTo(emi(1e6, 8.5, 20), 6);

    out = await answer(runFinanceOperation, 'mortgage-calculator', {
      principal: '2500000',
      annualRate: '6.75',
      years: '30',
    });
    expect(numberAfter(out, 'interest:')).toBeCloseTo(emi(2.5e6, 6.75, 30), 6);

    out = await answer(runFinanceOperation, 'npv-calculator', {
      rate: '8',
      flows: '-1000, 400, 400, 400',
    });
    expect(numberAfter(out, 'NPV:')).toBeCloseTo(
      npv(0.08, [-1000, 400, 400, 400]),
      6,
    );

    const debt = amortise(200000, 18, 10000);
    out = await answer(runFinanceOperation, 'debt-payoff-calculator', {
      balance: '200000',
      annualRate: '18',
      payment: '10000',
    });
    expect(numberAfter(out, 'months:')).toBe(debt.months);
    expect(numberAfter(out, 'interest:')).toBeCloseTo(debt.interest, 2);

    out = await answer(runFinanceOperation, 'compound-interest-calculator', {
      principal: '100000',
      annualRate: '8',
      years: '10',
      frequency: '4',
    });
    expect(numberAfter(out, 'value:')).toBeCloseTo(
      100000 * (1 + 0.08 / 4) ** 40,
      6,
    );

    out = await answer(runFinanceOperation, 'cagr-calculator', {
      beginning: '100',
      ending: '180',
      years: '5',
    });
    expect(numberAfter(out, 'CAGR:')).toBeCloseTo(
      ((180 / 100) ** (1 / 5) - 1) * 100,
      9,
    );
  });

  it('date tools hold at the calendar boundaries', async () => {
    const cases: ReadonlyArray<
      readonly [string, Record<string, string>, string | RegExp]
    > = [
      // The Gregorian century rule: 1900 and 2100 are not leap years, 2000 is.
      ['leap-year-checker', { year: '2000' }, /is a leap year/u],
      ['leap-year-checker', { year: '1900' }, /is not a leap year/u],
      ['leap-year-checker', { year: '2100' }, /is not a leap year/u],
      ['day-of-year-calculator', { date: '2024-12-31' }, '366'],
      ['day-of-year-calculator', { date: '2023-12-31' }, '365'],
      ['day-of-year-calculator', { date: '2024-03-01' }, '61'],
      ['day-of-year-calculator', { date: '2023-03-01' }, '60'],
      ['add-days-to-date', { date: '2024-02-28', days: '1' }, '2024-02-29'],
      ['add-days-to-date', { date: '2023-02-28', days: '1' }, '2023-03-01'],
      ['add-days-to-date', { date: '2025-12-31', days: '1' }, '2026-01-01'],
      [
        'subtract-days-from-date',
        { date: '2024-03-01', days: '1' },
        '2024-02-29',
      ],
      // ISO-8601 weeks at the year seam belong to the neighbouring year.
      ['week-number-calculator', { date: '2021-01-01' }, '2020-W53'],
      ['week-number-calculator', { date: '2023-01-01' }, '2022-W52'],
      ['week-number-calculator', { date: '2024-12-30' }, '2025-W01'],
      ['week-number-calculator', { date: '2026-01-01' }, '2026-W01'],
    ];

    for (const [id, values, expected] of cases) {
      const got = (await answer(runDateOperation, id, values))
        .replace(/\s+/gu, ' ')
        .trim();
      const ok =
        expected instanceof RegExp
          ? expected.test(got)
          : got.includes(expected);
      expect(ok, `${id} ${JSON.stringify(values)} gave "${got}"`).toBe(true);
    }
  });

  it('encode and decode round-trip on input designed to break them', async () => {
    // Surrogate pairs, a ZWJ sequence, combining marks and the base64
    // alphabet's own padding characters are where naive encoders lose bytes.
    const awkward = [
      'Hello, world!',
      'a+b/c=d==e',
      'x ☃ y',
      'x \u{1F600} y',
      '\u{1F468}‍\u{1F469}‍\u{1F467}',
      'ȩ́ ä',
      '你好世界',
      'a\r\nb\tc\nd',
      '<a href="x">A & B\'s</a>',
      '  padded  ',
      'x'.repeat(5000),
    ];
    const pairs = [
      ['url-encode-component', 'url-decode-component'],
      ['url-encode', 'url-decode'],
      ['html-entity-encode', 'html-entity-decode'],
      ['base64-encode-text', 'base64-decode-text'],
      ['base64url-encode-text', 'base64url-decode-text'],
      ['hex-encode-text', 'hex-decode-text'],
      ['binary-encode-text', 'binary-decode-text'],
      ['utf8-byte-encoder', 'utf8-byte-decoder'],
      ['json-string-escape', 'json-string-unescape'],
    ] as const;

    for (const [encode, decode] of pairs) {
      for (const value of awkward) {
        const encoded = await answer(runDeveloperDataOperation, encode, {
          input: value,
        });
        const back = await answer(runDeveloperDataOperation, decode, {
          input: encoded,
        });
        expect(
          back,
          `${encode} -> ${decode} lost ${JSON.stringify(value.slice(0, 40))}`,
        ).toBe(value);
      }
    }
  });

  it('formatters are idempotent and parsers refuse garbage', async () => {
    const idempotent: ReadonlyArray<
      readonly [
        (id: string, values: Record<string, string>) => unknown,
        string,
        Record<string, string>,
      ]
    > = [
      [
        runDeveloperDataOperation,
        'json-format',
        { input: '{"b":1,"a":[1,2,{"c":3}],"d":null}' },
      ],
      [
        runDeveloperDataOperation,
        'json-minify',
        { input: '{ "b" : 1 , "a" : [ 1 , 2 ] }' },
      ],
      [
        runDeveloperDataOperation,
        'json-sort-keys',
        { input: '{"b":1,"a":2,"c":{"z":1,"y":2}}' },
      ],
      [
        runAdvancedDeveloperOperation,
        'sql-formatter',
        { input: 'select a,b from t where x=1 order by a' },
      ],
      [
        runAdvancedDeveloperOperation,
        'sql-minifier',
        { input: 'select   a ,  b\nfrom t' },
      ],
      [
        runAdvancedDeveloperOperation,
        'graphql-formatter',
        { input: '{ user { id name } }' },
      ],
    ];
    for (const [run, id, values] of idempotent) {
      const once = (await answer(run, id, values)).trim();
      const twice = (await answer(run, id, { ...values, input: once })).trim();
      expect(twice, `${id} is not idempotent`).toBe(once);
    }

    // A parser that invents an answer for malformed input is worse than one
    // that refuses, because the visitor cannot tell.
    const garbage: ReadonlyArray<
      readonly [
        (id: string, values: Record<string, string>) => unknown,
        string,
        Record<string, string>,
      ]
    > = [
      [runDeveloperDataOperation, 'json-format', { input: '{not json,}' }],
      [runDeveloperDataOperation, 'json-minify', { input: '{"a":}' }],
      [runDeveloperDataOperation, 'json-sort-keys', { input: '[1,2' }],
      [runDeveloperDataOperation, 'hex-decode-text', { input: 'zzzz' }],
      [runDeveloperDataOperation, 'binary-decode-text', { input: '22222222' }],
      [runDeveloperDataOperation, 'base64-decode-text', { input: '!!!!' }],
      [runLifeAdminOperation, 'ifsc-format-checker', { input: 'nonsense' }],
      [runLifeAdminOperation, 'upi-id-format-checker', { input: 'no-at-sign' }],
      [runLifeAdminOperation, 'pin-code-format-checker', { input: '12' }],
    ];
    for (const [run, id, values] of garbage) {
      let refused = false;
      try {
        const out = await answer(run, id, values);
        refused =
          /invalid|not valid|malformed|could not|cannot|unable|error|fail|not a/iu.test(
            out,
          );
        expect(
          refused,
          `${id} accepted ${JSON.stringify(values)} and returned "${out.slice(0, 80)}"`,
        ).toBe(true);
      } catch {
        refused = true;
      }
      expect(refused).toBe(true);
    }
  });
});

/**
 * Does each tool read its own input at all?
 *
 * A tool wired to a constant passes every check above that does not name it, and
 * passes `all-operations-qc.test.ts` outright. This changes one field at a time
 * and requires the answer to move.
 *
 * The exceptions below are not bugs. The perturbation appends a token, and a
 * tool that parses structure -- a URL, a head block, a SQL statement -- is right
 * to ignore text appended after it. Each was re-checked by hand with input whose
 * *meaning* differs, and every one answered differently. The list is here so
 * that a genuinely inert tool shows up as a new entry.
 */
const IGNORES_APPENDED_TEXT = new Set([
  'developer data/url-origin-extractor',
  'advanced developer/user-agent-parser',
  'advanced developer/sql-minifier',
  'advanced developer/escape-sequence-viewer',
  'advanced developer/curl-to-code',
  'creator/rss-feed-validator',
  'spreadsheet/spreadsheet-data-profiler',
  'spreadsheet/missing-value-analyzer',
  'web/sitemap-viewer',
  'web/canonical-url-builder',
  'web/html-head-inspector',
  'web/link-extractor',
  'web/url-normalizer',
  'web/favicon-inspector',
  'web/aria-label-checklist',
  'web/heading-structure-checker',
]);

describe('every operation reads its own input', () => {
  const suites: ReadonlyArray<
    readonly [string, readonly Operation[], RunOperation]
  > = [
    ['developer data', DEVELOPER_DATA_OPERATIONS, runDeveloperDataOperation],
    [
      'advanced developer',
      ADVANCED_DEVELOPER_OPERATIONS,
      runAdvancedDeveloperOperation,
    ],
    ['creator', CREATOR_OPERATIONS, runCreatorOperation],
    ['date', DATE_OPERATIONS, runDateOperation],
    ['document', DOCUMENT_OPERATIONS, runDocumentOperation],
    ['finance', FINANCE_OPERATIONS, runFinanceOperation],
    ['life admin', LIFE_ADMIN_OPERATIONS, runLifeAdminOperation],
    ['math', MATH_OPERATIONS, runMathOperation],
    ['productivity', PRODUCTIVITY_OPERATIONS, runProductivityOperation],
    ['qr', QR_BARCODE_OPERATIONS, runQrBarcodeOperation],
    ['science', SCIENCE_OPERATIONS, runScienceOperation],
    ['spreadsheet', SPREADSHEET_OPERATIONS, runSpreadsheetOperation],
    ['web', WEB_OPERATIONS, runWebOperation],
    ['writing', WRITING_OPERATIONS, runWritingOperation],
  ];

  const perturb = (field: OperationField): string | null => {
    const current = String(field.defaultValue ?? '');
    const options = field.options ?? [];
    if (options.length > 1) {
      const other = options.find((option) => option.value !== current);
      return other ? String(other.value) : null;
    }
    if (field.type === 'file') return null;
    if (field.type === 'number' || /^-?\d+(?:\.\d+)?$/u.test(current.trim())) {
      const parsed = Number(current);
      return Number.isFinite(parsed) ? String(parsed + 7) : null;
    }
    return current === '' ? 'perturbed sample text' : `${current} ZZQ9`;
  };

  it('answers change when a field changes', async () => {
    const inert: string[] = [];

    for (const [suiteName, operations, run] of suites) {
      for (const operation of operations) {
        const fields = (operation.fields ?? []).filter(
          (field) => field.type !== 'file',
        );
        if (!fields.length) continue;
        const base = Object.fromEntries(
          (operation.fields ?? []).map((field) => [
            field.id,
            field.defaultValue ?? '',
          ]),
        );
        let baseline: string;
        try {
          baseline = await answer(run, operation.id, base);
        } catch {
          continue; // needs a real file or a live fetch; covered elsewhere
        }
        // A tool that is random by design changes without being asked to.
        if ((await answer(run, operation.id, base)) !== baseline) continue;

        let responded = false;
        for (const field of fields) {
          const alternative = perturb(field);
          if (
            alternative === null ||
            alternative === String(field.defaultValue ?? '')
          )
            continue;
          try {
            if (
              text(
                await run(operation.id, { ...base, [field.id]: alternative }),
              ) !== baseline
            ) {
              responded = true;
              break;
            }
          } catch {
            responded = true; // refusing the new value is still reading it
            break;
          }
        }
        /*
          Before calling it inert, make sure it is not simply random.

          The two-run check above is one sample, and one sample cannot tell a
          stub from a coin landing the same way twice. `productivity/name-picker`
          returns `shuffle(names, random)[0]`: with a short default list, two
          runs match often enough that the check misses the randomness, the
          perturbed run then matches the baseline as well, and a correct tool is
          reported as ignoring its input. Measured on CI 2026-09-25 -- it failed
          the deploy gate on one commit and passed on the next, with nothing
          between them that touched it.

          A deploy gate that fails at random is worse than no gate: it teaches
          whoever is looking at it to re-run until it goes green, which is the
          habit that lets a real failure through. So the doubt is resolved here,
          on the rare path only -- an operation that already looks inert -- and
          a handful of samples takes the odds of a wrong verdict from roughly
          one in thirty to one in millions.
        */
        if (!responded) {
          let varies = false;
          for (let sample = 0; sample < 8 && !varies; sample += 1) {
            varies = (await answer(run, operation.id, base)) !== baseline;
          }
          if (!varies) inert.push(`${suiteName}/${operation.id}`);
        }
      }
    }

    const unexpected = inert.filter(
      (entry) => !IGNORES_APPENDED_TEXT.has(entry),
    );
    expect(
      unexpected.sort(),
      `${unexpected.length} operations returned the same answer no matter what was typed`,
    ).toEqual([]);

    // Keep the exception list honest: a tool that starts responding should be
    // removed from it rather than left behind as cover for a future stub.
    const stale = [...IGNORES_APPENDED_TEXT].filter(
      (entry) => !inert.includes(entry),
    );
    expect(
      stale.sort(),
      'these are listed as ignoring appended text but now respond to it; remove them from IGNORES_APPENDED_TEXT',
    ).toEqual([]);
  });
});
