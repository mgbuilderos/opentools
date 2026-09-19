/**
 * Excel stores dates as numbers, and gets 1900 wrong on purpose.
 *
 * A date in a spreadsheet is a count of days since an epoch, with the fraction
 * being the time of day. `45000` is a date; whether it is *shown* as one depends
 * entirely on the cell's number format, which lives in a different file inside
 * the archive. A reader that ignores formats turns every date in the sheet into
 * a five-digit number, and one that guesses turns every invoice total into 1993.
 *
 * **The 1900 leap-year bug.** Excel believes 29 February 1900 existed. It did
 * not — 1900 was not a leap year. Lotus 1-2-3 had the bug in 1983, and Excel
 * copied it deliberately so the two would agree, and has kept it for forty years
 * because fixing it would shift every date in every file ever saved.
 *
 * The consequence for anyone reading these files: serial numbers **below 60 sit
 * one day away from serials above it**, so a single epoch cannot convert both.
 * Serial 60 is the day that never happened.
 *
 * **The 1904 system.** Spreadsheets written by old Mac Excel count from 1904
 * instead and have no leap bug. The workbook says which system it uses, in one
 * attribute, and ignoring it puts every date out by four years and a day.
 */

/** Days from 1899-12-31 to the Unix epoch, used to convert without a Date loop. */
const MS_PER_DAY = 86_400_000;
const EPOCH_1900_UTC = Date.UTC(1899, 11, 31);
const EPOCH_1904_UTC = Date.UTC(1904, 0, 1);

/**
 * The serial Excel assigns to its phantom 29 February 1900. Any file containing
 * it was written by something that trusted Excel's calendar rather than a real
 * one, so the value is reported as suspect rather than silently shifted.
 */
export const PHANTOM_LEAP_DAY_SERIAL = 60;

export interface ExcelDate {
  /** UTC instant. Spreadsheets carry no time zone, so none is invented. */
  date: Date;
  /** `true` when the cell also carried a time of day. */
  hasTime: boolean;
  /**
   * Set only for serial 60, the day Excel invented. The date returned is
   * 28 February 1900, which is what the number most likely meant.
   */
  phantomLeapDay: boolean;
}

/**
 * Turns a spreadsheet serial number into a date.
 *
 * `date1904` comes from the workbook, not from a guess.
 */
export function serialToDate(serial: number, date1904 = false): ExcelDate {
  if (!Number.isFinite(serial)) {
    throw new Error(`${serial} is not a date serial number.`);
  }
  const whole = Math.floor(serial);
  const fraction = serial - whole;

  if (date1904) {
    return {
      date: new Date(
        EPOCH_1904_UTC + whole * MS_PER_DAY + Math.round(fraction * MS_PER_DAY),
      ),
      hasTime: fraction !== 0,
      phantomLeapDay: false,
    };
  }

  // At and above the phantom day, every serial is one too high, because Excel
  // counted a day that did not exist. Below it, the count is correct. The
  // comparison is `>=`, not `>`: serial 60 is the phantom itself, and letting it
  // through would report 1 March for a number that meant 29 February.
  const days = whole >= PHANTOM_LEAP_DAY_SERIAL ? whole - 1 : whole;
  return {
    date: new Date(
      EPOCH_1900_UTC + days * MS_PER_DAY + Math.round(fraction * MS_PER_DAY),
    ),
    hasTime: fraction !== 0,
    phantomLeapDay: whole === PHANTOM_LEAP_DAY_SERIAL,
  };
}

/** The inverse, for writing. Round-trips every serial except the phantom day. */
export function dateToSerial(date: Date, date1904 = false): number {
  const utc = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
  );
  if (date1904) return (utc - EPOCH_1904_UTC) / MS_PER_DAY;
  const raw = (utc - EPOCH_1900_UTC) / MS_PER_DAY;
  // Put the phantom day back, so the number matches what Excel would write.
  return raw > PHANTOM_LEAP_DAY_SERIAL - 1 ? raw + 1 : raw;
}

/**
 * Number format ids Excel reserves for dates and times.
 *
 * 14-22 are the date and time formats; 45-47 are the elapsed-time ones. Ids in
 * between belong to currency and percentages and must not be treated as dates —
 * mistaking format 44 (accounting) for a date is how a column of prices becomes
 * a column of days in 1900.
 */
const BUILT_IN_DATE_FORMATS = new Set([
  14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47,
]);

/**
 * Whether a number format shows its value as a date.
 *
 * Custom formats are decided by their pattern. The characters are checked
 * outside quoted literals and outside colour and condition blocks, because
 * `"d" mmm` is a literal 'd' followed by a month, and `[Red]0.00` is not a date
 * merely for containing a bracketed word.
 */
export function isDateFormat(
  numFmtId: number,
  formatCode: string | undefined,
): boolean {
  if (BUILT_IN_DATE_FORMATS.has(numFmtId)) return true;
  if (!formatCode) return false;

  let inQuotes = false;
  let inBracket = false;
  for (let index = 0; index < formatCode.length; index += 1) {
    const character = formatCode[index];
    if (character === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (inQuotes) continue;
    if (character === '[') {
      inBracket = true;
      continue;
    }
    if (character === ']') {
      inBracket = false;
      continue;
    }
    if (inBracket) continue;
    // An escaped character is a literal, not a field.
    if (character === '\\') {
      index += 1;
      continue;
    }
    if ('yYmMdDhHsS'.includes(character)) return true;
  }
  return false;
}
