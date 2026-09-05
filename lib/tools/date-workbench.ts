import type { MathField, MathOperation } from './math-workbench';

const DAY_MS = 86_400_000;
const MAX_DATE_SHIFT = 1_000_000;
const MAX_WORKDAY_SHIFT = 100_000;

const dateField = (
  id: string,
  label: string,
  defaultValue: string,
): MathField => ({
  id,
  label,
  type: 'text',
  defaultValue,
  placeholder: 'YYYY-MM-DD',
});

const numberField = (
  id: string,
  label: string,
  defaultValue: string,
): MathField => ({
  id,
  label,
  type: 'number',
  defaultValue,
});

const textField = (
  id: string,
  label: string,
  defaultValue = '',
  placeholder = '',
): MathField => ({
  id,
  label,
  type: 'text',
  defaultValue,
  placeholder,
});

export const DATE_OPERATIONS: readonly MathOperation[] = [
  {
    id: 'add-days-to-date',
    name: 'Add days to date',
    description: 'Add calendar days with UTC-stable date arithmetic.',
    fields: [
      dateField('date', 'Starting date', '2026-01-01'),
      numberField('days', 'Days to add', '30'),
    ],
  },
  {
    id: 'subtract-days-from-date',
    name: 'Subtract days from date',
    description: 'Subtract calendar days with UTC-stable date arithmetic.',
    fields: [
      dateField('date', 'Starting date', '2026-01-31'),
      numberField('days', 'Days to subtract', '30'),
    ],
  },
  {
    id: 'business-days-calculator',
    name: 'Business-days calculator',
    description:
      'Count Monday–Friday dates, excluding the start and including the end.',
    fields: [
      dateField('start', 'Starting date', '2026-01-05'),
      dateField('end', 'Ending date', '2026-01-09'),
    ],
  },
  {
    id: 'workday-calculator',
    name: 'Workday calculator',
    description: 'Add or subtract weekdays; public holidays are not included.',
    fields: [
      dateField('date', 'Starting date', '2026-01-05'),
      numberField('days', 'Workdays (negative to subtract)', '10'),
    ],
  },
  {
    id: 'birthday-countdown',
    name: 'Birthday countdown',
    description:
      'Count calendar days to the next month/day; Feb 29 uses Feb 28 in non-leap years.',
    fields: [
      dateField('birthday', 'Birthday', '1990-09-20'),
      dateField('from', 'Count from', '2026-09-06'),
    ],
  },
  {
    id: 'anniversary-calculator',
    name: 'Anniversary calculator',
    description:
      'Count complete years and remaining days; Feb 29 uses Feb 28 when needed.',
    fields: [
      dateField('start', 'Starting date', '2015-09-06'),
      dateField('end', 'Comparison date', '2026-09-06'),
    ],
  },
  {
    id: 'week-number-calculator',
    name: 'ISO week-number calculator',
    description: 'Calculate the ISO-8601 week year and week number.',
    fields: [dateField('date', 'Date', '2026-09-06')],
  },
  {
    id: 'day-of-year-calculator',
    name: 'Day-of-year calculator',
    description: 'Calculate the one-based ordinal day in the year.',
    fields: [dateField('date', 'Date', '2026-09-06')],
  },
  {
    id: 'leap-year-checker',
    name: 'Leap-year checker',
    description: 'Apply the proleptic Gregorian leap-year rules.',
    fields: [numberField('year', 'Year', '2028')],
  },
  {
    id: 'iso-date-formatter',
    name: 'ISO date formatter',
    description:
      'Validate an ISO timestamp with an explicit offset and normalize it to UTC.',
    fields: [
      textField(
        'timestamp',
        'Timestamp with offset',
        '2026-09-06T12:30:00+05:30',
      ),
    ],
  },
  {
    id: 'timezone-converter',
    name: 'Timezone converter',
    description: 'Format one absolute timestamp in a selected IANA time zone.',
    fields: [
      textField(
        'timestamp',
        'Timestamp with offset',
        '2026-09-06T12:30:00+05:30',
      ),
      textField('timezone', 'IANA time zone', 'Asia/Kolkata'),
    ],
  },
  {
    id: 'world-clock',
    name: 'World clock',
    description:
      'Show one absolute instant in a comma-separated list of IANA time zones.',
    fields: [
      textField('timestamp', 'Timestamp with offset', '2026-09-06T12:30:00Z'),
      textField(
        'timezones',
        'IANA time zones',
        'Asia/Kolkata,Europe/London,America/New_York',
      ),
    ],
  },
  {
    id: 'meeting-time-planner',
    name: 'Meeting-time planner',
    description:
      'Compare one proposed instant across multiple IANA time zones.',
    fields: [
      textField(
        'timestamp',
        'Proposed timestamp with offset',
        '2026-09-06T12:30:00Z',
      ),
      textField(
        'timezones',
        'IANA time zones',
        'Asia/Kolkata,Europe/London,America/New_York',
      ),
    ],
  },
  {
    id: 'duration-calculator',
    name: 'Duration calculator',
    description:
      'Calculate elapsed time between two timestamps with explicit offsets.',
    fields: [
      textField('start', 'Starting timestamp', '2026-09-06T09:00:00Z'),
      textField('end', 'Ending timestamp', '2026-09-06T17:30:00Z'),
    ],
  },
  {
    id: 'hours-calculator',
    name: 'Hours calculator',
    description:
      'Calculate hours between two 24-hour times, allowing overnight spans.',
    fields: [
      textField('start', 'Start time', '09:00', 'HH:MM'),
      textField('end', 'End time', '17:30', 'HH:MM'),
      numberField('breakMinutes', 'Unpaid break minutes', '30'),
    ],
  },
  {
    id: 'timesheet-calculator',
    name: 'Timesheet calculator',
    description:
      'Add HH:MM-HH:MM shifts with optional break minutes after a slash.',
    fields: [
      textField(
        'shifts',
        'One shift per line',
        '09:00-17:30/30\n09:15-18:00/45',
      ),
    ],
  },
] as const;

type DateParts = { year: number; month: number; day: number };

function parseDateOnly(value: string): DateParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value?.trim() ?? '');
  if (!match) throw new Error('Use a valid date in YYYY-MM-DD form.');

  const parts = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
  if (parts.year < 100 || parts.year > 9999) {
    throw new Error('Dates must use years from 0100 through 9999.');
  }

  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  if (
    date.getUTCFullYear() !== parts.year ||
    date.getUTCMonth() !== parts.month - 1 ||
    date.getUTCDate() !== parts.day
  ) {
    throw new Error('Use a valid calendar date.');
  }
  return parts;
}

function epochDay(parts: DateParts) {
  return Date.UTC(parts.year, parts.month - 1, parts.day) / DAY_MS;
}

function fromEpochDay(value: number) {
  const date = new Date(value * DAY_MS);
  const year = date.getUTCFullYear();
  if (year < 100 || year > 9999) {
    throw new Error('The resulting date must be between 0100 and 9999.');
  }
  return date.toISOString().slice(0, 10);
}

function integer(values: Record<string, string>, key: string) {
  const raw = values[key]?.trim();
  const value = Number(raw);
  if (!raw || !Number.isSafeInteger(value)) {
    throw new Error(`${key} must be a safe whole number.`);
  }
  return value;
}

function boundedShift(value: number, maximum: number, label: string) {
  if (Math.abs(value) > maximum) {
    throw new Error(
      `${label} are limited to ${maximum.toLocaleString('en-US')}.`,
    );
  }
  return value;
}

function parseInstant(value: string) {
  const source = value?.trim() ?? '';
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|([+-])(\d{2}):(\d{2}))$/u.exec(
      source,
    );
  if (!match) {
    throw new Error(
      'Use an ISO timestamp ending in Z or an explicit ±HH:MM offset.',
    );
  }

  const date = parseDateOnly(`${match[1]}-${match[2]}-${match[3]}`);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] ?? 0);
  const millisecond = Number((match[7] ?? '').padEnd(3, '0'));
  if (hour > 23 || minute > 59 || second > 59) {
    throw new Error('Enter a valid clock time in the timestamp.');
  }

  let offsetMinutes = 0;
  if (match[8] !== 'Z') {
    const offsetHours = Number(match[10]);
    const offsetRemainder = Number(match[11]);
    if (
      offsetHours > 14 ||
      offsetRemainder > 59 ||
      (offsetHours === 14 && offsetRemainder !== 0)
    ) {
      throw new Error('Use a valid time-zone offset from -14:00 to +14:00.');
    }
    offsetMinutes =
      (offsetHours * 60 + offsetRemainder) * (match[9] === '-' ? -1 : 1);
  }

  const milliseconds =
    Date.UTC(
      date.year,
      date.month - 1,
      date.day,
      hour,
      minute,
      second,
      millisecond,
    ) -
    offsetMinutes * 60_000;
  if (!Number.isFinite(milliseconds))
    throw new Error('Enter a valid timestamp.');
  return milliseconds;
}

function parseTime(value: string) {
  const match = /^(\d{2}):(\d{2})$/u.exec(value?.trim() ?? '');
  if (!match) throw new Error('Use a 24-hour time in HH:MM form.');
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) {
    throw new Error('Use a valid 24-hour clock time.');
  }
  return hours * 60 + minutes;
}

function durationText(milliseconds: number) {
  const totalSeconds = Math.floor(Math.abs(milliseconds) / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${milliseconds < 0 ? '-' : ''}${days} days · ${hours} hours · ${minutes} minutes · ${seconds} seconds`;
}

function formatInZone(milliseconds: number, timezone: string) {
  const zone = timezone?.trim() ?? '';
  if (!zone || zone.length > 100) {
    throw new Error('Enter an IANA time zone up to 100 characters.');
  }
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
      timeZoneName: 'short',
    }).format(new Date(milliseconds));
  } catch {
    throw new Error(`Unsupported IANA time zone: ${zone}.`);
  }
}

function weekdaysInClosedRange(start: number, end: number) {
  const days = end - start + 1;
  const fullWeeks = Math.floor(days / 7);
  let count = fullWeeks * 5;
  const remainder = days % 7;
  const firstWeekday = new Date(start * DAY_MS).getUTCDay();
  for (let index = 0; index < remainder; index += 1) {
    const weekday = (firstWeekday + index) % 7;
    if (weekday !== 0 && weekday !== 6) count += 1;
  }
  return count;
}

function businessDays(start: number, end: number) {
  if (start === end) return 0;
  if (end > start) return weekdaysInClosedRange(start + 1, end);
  return -weekdaysInClosedRange(end, start - 1);
}

function addWorkdays(start: number, shift: number) {
  if (shift === 0) return start;
  const direction = shift < 0 ? -1 : 1;
  let remaining = Math.abs(shift);
  let day = start;

  const startingWeekday = new Date(day * DAY_MS).getUTCDay();
  if (startingWeekday === 0 || startingWeekday === 6) {
    do {
      day += direction;
    } while ([0, 6].includes(new Date(day * DAY_MS).getUTCDay()));
    remaining -= 1;
  }

  const fullWeeks = Math.floor(remaining / 5);
  day += fullWeeks * 7 * direction;
  remaining %= 5;
  while (remaining > 0) {
    day += direction;
    const weekday = new Date(day * DAY_MS).getUTCDay();
    if (weekday !== 0 && weekday !== 6) remaining -= 1;
  }
  return day;
}

export function runDateOperation(
  operationId: string,
  values: Record<string, string>,
) {
  switch (operationId) {
    case 'add-days-to-date': {
      const days = boundedShift(
        integer(values, 'days'),
        MAX_DATE_SHIFT,
        'Date adjustments',
      );
      return fromEpochDay(epochDay(parseDateOnly(values.date)) + days);
    }
    case 'subtract-days-from-date': {
      const days = boundedShift(
        integer(values, 'days'),
        MAX_DATE_SHIFT,
        'Date adjustments',
      );
      return fromEpochDay(epochDay(parseDateOnly(values.date)) - days);
    }
    case 'business-days-calculator': {
      const start = epochDay(parseDateOnly(values.start));
      const end = epochDay(parseDateOnly(values.end));
      const difference = businessDays(start, end);
      return `${difference} business ${Math.abs(difference) === 1 ? 'day' : 'days'}`;
    }
    case 'workday-calculator': {
      const days = boundedShift(
        integer(values, 'days'),
        MAX_WORKDAY_SHIFT,
        'Workday adjustments',
      );
      return fromEpochDay(
        addWorkdays(epochDay(parseDateOnly(values.date)), days),
      );
    }
    case 'birthday-countdown': {
      const birthday = parseDateOnly(values.birthday);
      const from = parseDateOnly(values.from);
      const occurrence = (year: number) => {
        const lastDay = new Date(
          Date.UTC(year, birthday.month, 0),
        ).getUTCDate();
        return {
          year,
          month: birthday.month,
          day: Math.min(birthday.day, lastDay),
        };
      };
      let next = occurrence(from.year);
      if (epochDay(next) < epochDay(from)) next = occurrence(from.year + 1);
      return `${epochDay(next) - epochDay(from)} days · ${fromEpochDay(epochDay(next))}`;
    }
    case 'anniversary-calculator': {
      const start = parseDateOnly(values.start);
      const end = parseDateOnly(values.end);
      if (epochDay(end) < epochDay(start)) {
        throw new Error(
          'Comparison date must not be before the starting date.',
        );
      }
      const anniversary = (year: number) => ({
        year,
        month: start.month,
        day: Math.min(
          start.day,
          new Date(Date.UTC(year, start.month, 0)).getUTCDate(),
        ),
      });
      let years = end.year - start.year;
      if (epochDay(anniversary(start.year + years)) > epochDay(end)) years -= 1;
      const last = anniversary(start.year + years);
      return `${years} complete years · ${epochDay(end) - epochDay(last)} days since anniversary`;
    }
    case 'week-number-calculator': {
      const parts = parseDateOnly(values.date);
      const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
      const weekday = date.getUTCDay() || 7;
      date.setUTCDate(date.getUTCDate() + 4 - weekday);
      const weekYear = date.getUTCFullYear();
      const yearStart = Date.UTC(weekYear, 0, 1);
      const week = Math.ceil((date.getTime() - yearStart) / DAY_MS / 7 + 1 / 7);
      return `${weekYear}-W${String(week).padStart(2, '0')}`;
    }
    case 'day-of-year-calculator': {
      const parts = parseDateOnly(values.date);
      return String(
        epochDay(parts) - epochDay({ year: parts.year, month: 1, day: 1 }) + 1,
      );
    }
    case 'leap-year-checker': {
      const year = integer(values, 'year');
      if (year < 1 || year > 9999) {
        throw new Error('Year must be from 1 through 9999.');
      }
      const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
      return leap ? `${year} is a leap year.` : `${year} is not a leap year.`;
    }
    case 'iso-date-formatter':
      return new Date(parseInstant(values.timestamp)).toISOString();
    case 'timezone-converter': {
      const zone = values.timezone?.trim() ?? '';
      return `${zone}: ${formatInZone(parseInstant(values.timestamp), zone)}`;
    }
    case 'world-clock':
    case 'meeting-time-planner': {
      const instant = parseInstant(values.timestamp);
      const zones = (values.timezones ?? '')
        .split(',')
        .map((zone) => zone.trim())
        .filter(Boolean);
      if (!zones.length || zones.length > 20) {
        throw new Error(
          'Enter from one to 20 comma-separated IANA time zones.',
        );
      }
      return zones
        .map((zone) => `${zone}: ${formatInZone(instant, zone)}`)
        .join('\n');
    }
    case 'duration-calculator':
      return durationText(
        parseInstant(values.end) - parseInstant(values.start),
      );
    case 'hours-calculator': {
      const start = parseTime(values.start);
      let end = parseTime(values.end);
      if (end < start) end += 1440;
      const breakMinutes = integer(values, 'breakMinutes');
      if (breakMinutes < 0 || breakMinutes > end - start) {
        throw new Error('Break minutes must fit within the elapsed shift.');
      }
      return `${((end - start - breakMinutes) / 60).toFixed(2)} hours`;
    }
    case 'timesheet-calculator': {
      const source = values.shifts ?? '';
      if (source.length > 100_000) {
        throw new Error('Timesheet input is limited to 100,000 characters.');
      }
      const shifts = source
        .split(/\r?\n/gu)
        .map((line) => line.trim())
        .filter(Boolean);
      if (!shifts.length || shifts.length > 366) {
        throw new Error('Enter from one to 366 shifts.');
      }

      let total = 0;
      for (const [index, shift] of shifts.entries()) {
        const match = /^(\d{2}:\d{2})-(\d{2}:\d{2})(?:\/(\d+))?$/u.exec(shift);
        if (!match) {
          throw new Error(
            `Shift ${index + 1} must use HH:MM-HH:MM or HH:MM-HH:MM/break.`,
          );
        }
        const start = parseTime(match[1]);
        let end = parseTime(match[2]);
        if (end < start) end += 1440;
        const breakMinutes = Number(match[3] ?? 0);
        if (!Number.isSafeInteger(breakMinutes) || breakMinutes > end - start) {
          throw new Error(`Shift ${index + 1} has an invalid break length.`);
        }
        total += end - start - breakMinutes;
      }
      return `${(total / 60).toFixed(2)} hours · ${Math.floor(total / 60)}h ${total % 60}m`;
    }
    default:
      throw new Error('Choose a supported date or time operation.');
  }
}
