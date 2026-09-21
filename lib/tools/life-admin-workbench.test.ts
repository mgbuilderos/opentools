import { describe, expect, it } from 'vitest';

import {
  LIFE_ADMIN_OPERATIONS,
  runLifeAdminOperation,
} from './life-admin-workbench';

function defaults(operationId: string) {
  const operation = LIFE_ADMIN_OPERATIONS.find(
    (item) => item.id === operationId,
  );
  if (!operation) throw new Error(`Missing test operation: ${operationId}`);
  return Object.fromEntries(
    operation.fields.map((field) => [field.id, field.defaultValue]),
  );
}

describe('life-admin workbench', () => {
  it('ships 26 unique operations whose defaults execute', () => {
    expect(LIFE_ADMIN_OPERATIONS).toHaveLength(26);
    expect(
      new Set(LIFE_ADMIN_OPERATIONS.map((operation) => operation.id)).size,
    ).toBe(26);

    for (const operation of LIFE_ADMIN_OPERATIONS) {
      expect(
        runLifeAdminOperation(operation.id, defaults(operation.id)).length,
      ).toBeGreaterThan(0);
      expect(operation.notice.length).toBeGreaterThan(20);
    }
  });

  it('masks identifiers without validating ownership', () => {
    // The Aadhaar and PAN cases run on lib/tools/id-mask/mask.ts, the same
    // engine as the whole-text masker, so they keep the layout the user typed
    // rather than imposing one, and they agree with it digit for digit.
    expect(
      runLifeAdminOperation('aadhaar-masking-tool', {
        input: '2345 6789 0124',
      }),
    ).toBe('XXXX XXXX 0124');
    expect(
      runLifeAdminOperation('aadhaar-masking-tool', {
        input: '2345-6789-0124',
      }),
    ).toBe('XXXX-XXXX-0124');
    expect(
      runLifeAdminOperation('pan-masking-tool', { input: 'abcde1234f' }),
    ).toBe('XXXXXX234F');
    expect(
      runLifeAdminOperation('bank-account-masking-tool', {
        input: '1234-5678-9012',
      }),
    ).toBe('XXXXXXXX9012');
    expect(() =>
      runLifeAdminOperation('aadhaar-masking-tool', { input: 'abcd56789012' }),
    ).toThrow(/digits, spaces, and hyphens/u);
    // No Aadhaar number starts with 0 or 1, and the scanner will not mask one
    // either; saying so is better than masking twelve digits that are not one.
    expect(() =>
      runLifeAdminOperation('aadhaar-masking-tool', {
        input: '1234 5678 9012',
      }),
    ).toThrow(/never begins with 0 or 1/u);
    expect(() =>
      runLifeAdminOperation('pan-masking-tool', { input: '1234567890' }),
    ).toThrow(/five letters, then four digits/u);
  });

  it('checks formats conservatively and preserves invalid evidence', () => {
    expect(
      runLifeAdminOperation('ifsc-format-checker', { input: 'sbin0001234' }),
    ).toContain('MATCHES FORMAT');
    expect(
      runLifeAdminOperation('ifsc-format-checker', { input: 'SBIN1001234' }),
    ).toContain('DOES NOT MATCH FORMAT');
    expect(
      runLifeAdminOperation('pin-code-format-checker', { input: '560038' }),
    ).toContain('MATCHES FORMAT');
    expect(
      runLifeAdminOperation('upi-id-format-checker', { input: 'sample@bank' }),
    ).toContain('MATCHES FORMAT');
    expect(
      runLifeAdminOperation('micr-format-checker', { input: 'ABC400002001' }),
    ).toContain('DOES NOT MATCH FORMAT');
  });

  it('writes Indian currency groups and cheque wording', () => {
    expect(
      runLifeAdminOperation('indian-currency-number-to-words', {
        amount: '1234567.89',
      }),
    ).toBe(
      'Twelve Lakh Thirty Four Thousand Five Hundred Sixty Seven Rupees and Eighty Nine Paise',
    );
    expect(
      runLifeAdminOperation('cheque-amount-writer', { amount: '12500.5' }),
    ).toBe('Rupees Twelve Thousand Five Hundred and Fifty Paise Only');
    expect(
      runLifeAdminOperation('indian-currency-number-to-words', {
        amount: '99999999999.99',
      }),
    ).toContain('Nine Thousand Nine Hundred Ninety Nine Crore');
  });

  it('runs household and travel calculations from supplied assumptions', () => {
    expect(
      runLifeAdminOperation('house-rent-split-calculator', {
        rent: '30000',
        shared: '3000',
        people: '3',
      }),
    ).toContain('Per occupant: ₹11,000');
    expect(
      runLifeAdminOperation('electricity-bill-unit-calculator', {
        previous: '100',
        current: '250',
        rate: '8',
        fixed: '50',
      }),
    ).toContain('Estimated total: ₹1,250');
    expect(
      runLifeAdminOperation('fuel-cost-calculator', {
        distance: '300',
        efficiency: '15',
        price: '100',
      }),
    ).toContain('₹2,000');
    expect(
      runLifeAdminOperation('mileage-calculator', {
        distance: '420',
        fuel: '28',
      }),
    ).toContain('15 km/L');
    expect(
      runLifeAdminOperation('road-trip-cost-calculator', {
        distance: '300',
        efficiency: '15',
        price: '100',
        tolls: '500',
        stay: '1000',
        food: '500',
        other: '0',
        people: '2',
      }),
    ).toContain('Per traveller: ₹2,000');
  });

  it('clamps month-end schedules and rejects impossible dates', () => {
    expect(
      runLifeAdminOperation('warranty-expiry-tracker', {
        item: 'Laptop',
        purchase: '2025-01-31',
        months: '1',
      }),
    ).toContain('2025-02-28');
    expect(
      runLifeAdminOperation('emi-due-date-planner', {
        start: '2025-01-31',
        months: '2',
        amount: '1000',
      }),
    ).toContain('2,2025-02-28,1000.00');
    expect(() =>
      runLifeAdminOperation('notice-period-calculator', {
        start: '2025-02-30',
        days: '30',
      }),
    ).toThrow(/not a real calendar date/u);
  });

  it('preserves exact totals in schedules and budget comparisons', () => {
    const schedule = runLifeAdminOperation('school-fee-planner', {
      total: '100',
      installments: '3',
      start: '2026-01-31',
      interval: '1',
    });
    expect(schedule).toContain('1,2026-01-31,33.33');
    expect(schedule).toContain('2,2026-02-28,33.33');
    expect(schedule).toContain('3,2026-03-31,33.34');
    expect(
      runLifeAdminOperation('wedding-budget-planner', {
        budget: '1000',
        venue: '200',
        catering: '300',
        decor: '100',
        photo: '100',
        clothing: '100',
        other: '50',
      }),
    ).toContain('Unallocated: ₹150');
  });

  it('reduces birth-date digits and keeps master numbers only for life path', () => {
    const lines = (operationId: string, values: Record<string, string>) =>
      runLifeAdminOperation(operationId, values).split('\n');
    const method = expect.stringMatching(/^Method: \S/u);

    // 15 → 1+5 = 6; 7 → 7; 1990 → 1+9+9+0 = 19 → 1+9 = 10 → 1+0 = 1;
    // total 6 + 7 + 1 = 14 → 1+4 = 5.
    expect(
      lines('life-path-number-calculator', { birthDate: '1990-07-15' }),
    ).toEqual([
      'Life path number: 5',
      'Day 15 → 6',
      'Month 7 → 7',
      'Year 1990 → 19 → 10 → 1',
      'Total 6 + 7 + 1 = 14 → 5',
      method,
    ]);
    // Master total kept: 12 → 1+2 = 3; 7 → 7; 1990 → 19 → 10 → 1;
    // total 3 + 7 + 1 = 11 stays 11 (a plain reduction would give 2).
    expect(
      lines('life-path-number-calculator', { birthDate: '1990-07-12' }),
    ).toEqual([
      'Life path number: 11',
      'Day 12 → 3',
      'Month 7 → 7',
      'Year 1990 → 19 → 10 → 1',
      'Total 3 + 7 + 1 = 11 → 11',
      method,
    ]);
    // Master component kept: 29 → 2+9 = 11 stays 11; 7 → 7;
    // 1930 → 1+9+3+0 = 13 → 1+3 = 4; total 11 + 7 + 4 = 22 stays 22.
    // Reducing the day to 2 instead would give 2 + 7 + 4 = 13 → 4.
    expect(
      lines('life-path-number-calculator', { birthDate: '1930-07-29' }),
    ).toEqual([
      'Life path number: 22',
      'Day 29 → 11',
      'Month 7 → 7',
      'Year 1930 → 13 → 4',
      'Total 11 + 7 + 4 = 22 → 22',
      method,
    ]);
    // Every part is a master number: 29 → 2+9 = 11; month 11 needs no
    // reduction; 2009 → 2+0+0+9 = 11; total 11 + 11 + 11 = 33 stays 33.
    expect(
      lines('life-path-number-calculator', { birthDate: '2009-11-29' }),
    ).toEqual([
      'Life path number: 33',
      'Day 29 → 11',
      'Month 11 → 11',
      'Year 2009 → 11',
      'Total 11 + 11 + 11 = 33 → 33',
      method,
    ]);

    // Birth number never keeps master numbers: 29 → 2+9 = 11 → 1+1 = 2.
    expect(
      lines('birth-number-calculator', { birthDate: '1990-07-29' }),
    ).toEqual(['Birth number: 2', 'Day 29 → 11 → 2', method]);

    // Month 7 → 7; day 15 → 1+5 = 6; 2026 → 2+0+2+6 = 10 → 1+0 = 1;
    // total 7 + 6 + 1 = 14 → 1+4 = 5.
    expect(
      lines('personal-year-number-calculator', {
        birthDate: '1990-07-15',
        year: '2026',
      }),
    ).toEqual([
      'Personal year number: 5',
      'Birth month 7 → 7',
      'Birth day 15 → 6',
      'Year 2026 → 10 → 1',
      'Total 7 + 6 + 1 = 14 → 5',
      method,
    ]);
    // Personal year does not keep a master total: 7 + 3 + 1 = 11 → 1+1 = 2.
    expect(
      lines('personal-year-number-calculator', {
        birthDate: '1990-07-12',
        year: '2026',
      }),
    ).toEqual([
      'Personal year number: 2',
      'Birth month 7 → 7',
      'Birth day 12 → 3',
      'Year 2026 → 10 → 1',
      'Total 7 + 3 + 1 = 11 → 2',
      method,
    ]);
  });

  it('rejects empty, malformed, and impossible birth dates and years', () => {
    for (const operationId of [
      'life-path-number-calculator',
      'birth-number-calculator',
      'personal-year-number-calculator',
    ]) {
      const run = (birthDate: string) => () =>
        runLifeAdminOperation(operationId, { birthDate, year: '2026' });
      expect(run('')).toThrow('Enter a date of birth first.');
      expect(run('15/07/1990')).toThrow(/must use YYYY-MM-DD/u);
      expect(run('2026-02-30')).toThrow(/not a real calendar date/u);
      expect(run('1990-13-01')).toThrow(/not a real calendar date/u);
      expect(run('0000-01-01')).toThrow(/between 1 and 9999/u);
      expect(run('0001-01-01')).not.toThrow();
      expect(run('9999-12-31')).not.toThrow();
    }
    for (const year of ['', '0', '10000', '2026.5']) {
      expect(() =>
        runLifeAdminOperation('personal-year-number-calculator', {
          birthDate: '1990-07-15',
          year,
        }),
      ).toThrow(/^Year must be/u);
    }
  });

  it('limits numerology output to numbers and neutral arithmetic wording', () => {
    // Allowlist rather than blocklist: any word outside this neutral
    // arithmetic vocabulary fails the test, whatever topic it comes from.
    const neutralWords = new Set(
      'a add and are birth by chosen day digit digits kept life master method month not number numbers of or path personal reduce remains results same separately single sum summing the three total until way year'.split(
        ' ',
      ),
    );
    for (const operationId of [
      'life-path-number-calculator',
      'birth-number-calculator',
      'personal-year-number-calculator',
    ]) {
      for (const birthDate of ['1990-07-15', '2009-11-29']) {
        const output = runLifeAdminOperation(operationId, {
          birthDate,
          year: '2026',
        });
        for (const word of output.toLowerCase().match(/\p{L}+/gu) ?? []) {
          expect(neutralWords, `${operationId}: ${word}`).toContain(word);
        }
      }
    }
  });

  it('rejects unknown operation identifiers', () => {
    expect(() => runLifeAdminOperation('not-a-tool', {})).toThrow(
      'Unknown life-admin operation.',
    );
  });
});
