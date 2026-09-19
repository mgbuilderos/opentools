import { describe, expect, it } from 'vitest';
import { dateToSerial, isDateFormat, serialToDate } from './excel-date';

/**
 * Ground truth is Python's `datetime`, an implementation with nothing to do with
 * this one, plus the serials everybody who works with these files knows by heart:
 * 1 is 1 January 1900, 25569 is the Unix epoch, and 60 is the day that never
 * happened.
 */
const iso = (serial: number, date1904 = false) =>
  serialToDate(serial, date1904).date.toISOString().slice(0, 10);

describe('the 1900 date system, leap-year bug included', () => {
  it('converts the serials everyone knows', () => {
    expect(iso(1)).toBe('1900-01-01');
    expect(iso(59)).toBe('1900-02-28');
    expect(iso(61)).toBe('1900-03-01');
    expect(iso(25_569)).toBe('1970-01-01');
    expect(iso(45_000)).toBe('2023-03-15');
  });

  it('reports serial 60 as the day Excel invented', () => {
    // Excel thinks 60 is 29 February 1900. There was no such day. Returning
    // 1 March would silently move the value a day forward, and returning
    // "29 February" would invent a date, so it reports the day before and says
    // the number is suspect.
    const phantom = serialToDate(60);
    expect(phantom.phantomLeapDay).toBe(true);
    expect(phantom.date.toISOString().slice(0, 10)).toBe('1900-02-28');
    // Nothing else is flagged.
    expect(serialToDate(59).phantomLeapDay).toBe(false);
    expect(serialToDate(61).phantomLeapDay).toBe(false);
  });

  it('keeps serials either side of the phantom day one real day apart', () => {
    // The bug in one assertion. Serials 59 and 61 are **two numbers** apart and
    // only **one day** apart, because the number between them is not a day at
    // all. Any reader that treats the serial as a plain day count is wrong by
    // one for every date before 1 March 1900 — or, if it picks the other epoch,
    // wrong by one for every date after it.
    const before = serialToDate(59).date.getTime();
    const after = serialToDate(61).date.getTime();
    expect((after - before) / 86_400_000).toBe(1);
  });

  it('reads the time of day out of the fraction', () => {
    const noon = serialToDate(45_000.5);
    expect(noon.hasTime).toBe(true);
    expect(noon.date.toISOString()).toBe('2023-03-15T12:00:00.000Z');
    expect(serialToDate(45_000).hasTime).toBe(false);
  });

  it('round-trips through the serial and back', () => {
    for (const serial of [1, 59, 61, 1000, 25_569, 45_000, 50_000]) {
      expect(dateToSerial(serialToDate(serial).date)).toBe(serial);
    }
  });

  it('refuses something that is not a number', () => {
    expect(() => serialToDate(Number.NaN)).toThrow(/not a date serial/u);
    expect(() => serialToDate(Number.POSITIVE_INFINITY)).toThrow(
      /not a date serial/u,
    );
  });
});

describe('the 1904 system, which old Mac files use', () => {
  it('counts from 1904 and has no phantom day', () => {
    expect(iso(0, true)).toBe('1904-01-01');
    expect(iso(1, true)).toBe('1904-01-02');
    expect(iso(24_107, true)).toBe('1970-01-01');
    expect(serialToDate(60, true).phantomLeapDay).toBe(false);
  });

  it('is 1,462 days from the 1900 system, which is the four-year gap', () => {
    // Reading a 1904 file as a 1900 one puts every date out by this much, and
    // the only thing that says which system applies is one workbook attribute.
    expect(24_107 + 1462).toBe(25_569);
  });

  it('round-trips in the 1904 system too', () => {
    for (const serial of [0, 1, 24_107, 40_000]) {
      expect(dateToSerial(serialToDate(serial, true).date, true)).toBe(serial);
    }
  });
});

describe('deciding whether a number is shown as a date', () => {
  it('knows the built-in date and time formats', () => {
    for (const id of [14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47]) {
      expect(isDateFormat(id, undefined), `format ${id}`).toBe(true);
    }
  });

  it('does not mistake money or percentages for dates', () => {
    // 44 is accounting and 9-10 are percentages. Treating 44 as a date turns a
    // column of prices into a column of days in 1900, which is the single most
    // destructive thing a spreadsheet reader can do quietly.
    for (const id of [0, 1, 2, 9, 10, 37, 38, 39, 40, 44, 48, 49]) {
      expect(isDateFormat(id, undefined), `format ${id}`).toBe(false);
    }
  });

  it('reads custom formats by their pattern', () => {
    expect(isDateFormat(164, 'dd/mm/yyyy')).toBe(true);
    expect(isDateFormat(165, 'yyyy-mm-dd hh:mm:ss')).toBe(true);
    expect(isDateFormat(166, '0.00')).toBe(false);
    expect(isDateFormat(167, '#,##0')).toBe(false);
  });

  it('ignores letters that are quoted, escaped, or in a colour block', () => {
    // Each of these contains a date letter that is not a date field.
    expect(isDateFormat(168, '0.00"days"')).toBe(false);
    expect(isDateFormat(169, '[Red]0.00')).toBe(false);
    expect(isDateFormat(170, '\\d0.00')).toBe(false);
    expect(isDateFormat(171, '0.00_);[Blue](0.00)')).toBe(false);
    // And a real pattern is still found next to a quoted literal.
    expect(isDateFormat(172, '"on "dd mmm yyyy')).toBe(true);
  });
});
