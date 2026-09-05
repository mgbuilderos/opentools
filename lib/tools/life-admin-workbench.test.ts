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
  it('ships 23 unique operations whose defaults execute', () => {
    expect(LIFE_ADMIN_OPERATIONS).toHaveLength(23);
    expect(
      new Set(LIFE_ADMIN_OPERATIONS.map((operation) => operation.id)).size,
    ).toBe(23);

    for (const operation of LIFE_ADMIN_OPERATIONS) {
      expect(
        runLifeAdminOperation(operation.id, defaults(operation.id)).length,
      ).toBeGreaterThan(0);
      expect(operation.notice.length).toBeGreaterThan(20);
    }
  });

  it('masks identifiers without validating ownership', () => {
    expect(
      runLifeAdminOperation('aadhaar-masking-tool', {
        input: '1234 5678 9012',
      }),
    ).toBe('xxxx-xxxx-9012');
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

  it('rejects unknown operation identifiers', () => {
    expect(() => runLifeAdminOperation('not-a-tool', {})).toThrow(
      'Unknown life-admin operation.',
    );
  });
});
