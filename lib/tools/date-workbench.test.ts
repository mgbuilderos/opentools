import { describe, expect, it } from 'vitest';

import { DATE_OPERATIONS, runDateOperation } from './date-workbench';

function defaults(id: string) {
  const operation = DATE_OPERATIONS.find((item) => item.id === id);
  if (!operation) throw new Error(`Missing operation ${id}`);
  return Object.fromEntries(
    operation.fields.map((field) => [field.id, field.defaultValue]),
  );
}

describe('date and time workbench', () => {
  it('publishes unique operations whose defaults all run', () => {
    expect(DATE_OPERATIONS).toHaveLength(16);
    expect(new Set(DATE_OPERATIONS.map((item) => item.id)).size).toBe(16);
    for (const operation of DATE_OPERATIONS) {
      expect(runDateOperation(operation.id, defaults(operation.id))).not.toBe(
        '',
      );
    }
  });

  it('adds and subtracts dates across leap-day boundaries', () => {
    expect(
      runDateOperation('add-days-to-date', {
        date: '2028-02-28',
        days: '1',
      }),
    ).toBe('2028-02-29');
    expect(
      runDateOperation('subtract-days-from-date', {
        date: '2028-03-01',
        days: '1',
      }),
    ).toBe('2028-02-29');
  });

  it('counts business days and moves over weekends', () => {
    expect(
      runDateOperation('business-days-calculator', {
        start: '2026-01-05',
        end: '2026-01-09',
      }),
    ).toBe('4 business days');
    expect(
      runDateOperation('workday-calculator', {
        date: '2026-01-09',
        days: '1',
      }),
    ).toBe('2026-01-12');
  });

  it('reports birthdays and complete anniversaries', () => {
    expect(
      runDateOperation('birthday-countdown', {
        birthday: '1990-09-20',
        from: '2026-09-06',
      }),
    ).toBe('14 days · 2026-09-20');
    expect(
      runDateOperation('anniversary-calculator', {
        start: '2015-09-06',
        end: '2026-09-06',
      }),
    ).toBe('11 complete years · 0 days since anniversary');
  });

  it('calculates ISO week and ordinal day values', () => {
    expect(
      runDateOperation('week-number-calculator', { date: '2026-01-01' }),
    ).toBe('2026-W01');
    expect(
      runDateOperation('day-of-year-calculator', { date: '2028-12-31' }),
    ).toBe('366');
  });

  it('applies Gregorian leap-year rules', () => {
    expect(runDateOperation('leap-year-checker', { year: '2000' })).toContain(
      'is a leap year',
    );
    expect(runDateOperation('leap-year-checker', { year: '1900' })).toContain(
      'is not a leap year',
    );
  });

  it('normalizes offset timestamps and calculates durations', () => {
    expect(
      runDateOperation('iso-date-formatter', {
        timestamp: '2026-09-06T12:30:00+05:30',
      }),
    ).toBe('2026-09-06T07:00:00.000Z');
    expect(
      runDateOperation('duration-calculator', {
        start: '2026-09-06T09:00:00Z',
        end: '2026-09-06T17:30:00Z',
      }),
    ).toBe('0 days · 8 hours · 30 minutes · 0 seconds');
  });

  it('formats IANA zones without relying on the machine zone', () => {
    expect(
      runDateOperation('timezone-converter', {
        timestamp: '2026-09-06T12:30:00Z',
        timezone: 'Asia/Kolkata',
      }),
    ).toContain('Asia/Kolkata:');
    expect(() =>
      runDateOperation('timezone-converter', {
        timestamp: '2026-09-06T12:30:00Z',
        timezone: 'Not/A_Zone',
      }),
    ).toThrow('Unsupported IANA');
  });

  it('calculates working hours and multi-line timesheets', () => {
    expect(
      runDateOperation('hours-calculator', {
        start: '09:00',
        end: '17:30',
        breakMinutes: '30',
      }),
    ).toBe('8.00 hours');
    expect(
      runDateOperation('timesheet-calculator', {
        shifts: '09:00-17:30/30\n09:15-18:00/45',
      }),
    ).toBe('16.00 hours · 16h 0m');
  });

  it('rejects ambiguous or invalid input', () => {
    expect(() =>
      runDateOperation('iso-date-formatter', {
        timestamp: '2026-09-06T12:30:00',
      }),
    ).toThrow('explicit');
    expect(() =>
      runDateOperation('add-days-to-date', {
        date: '2026-02-30',
        days: '1',
      }),
    ).toThrow('valid calendar date');
    expect(() =>
      runDateOperation('hours-calculator', {
        start: '09:00',
        end: '10:00',
        breakMinutes: '90',
      }),
    ).toThrow('fit within');
  });
});
