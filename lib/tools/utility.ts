export type PercentageMode = 'percent-of' | 'what-percent' | 'change';

export function encodeBase64Text(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function decodeBase64Text(value: string): string {
  const normalized = value.replace(/\s+/gu, '');
  if (!normalized) return '';
  if (
    normalized.length % 4 !== 0 ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(
      normalized,
    )
  ) {
    throw new Error('Enter valid standard Base64 with correct padding.');
  }
  try {
    const binary = atob(normalized);
    const bytes = Uint8Array.from(binary, (character) =>
      character.charCodeAt(0),
    );
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new Error('The Base64 value does not contain valid UTF-8 text.');
  }
}

export function generateUuids(count: number): string[] {
  if (!Number.isInteger(count) || count < 1 || count > 100) {
    throw new Error('Choose between 1 and 100 UUIDs.');
  }
  return Array.from({ length: count }, () => crypto.randomUUID());
}

export type TimestampResult = {
  iso: string;
  unixSeconds: number;
  unixMilliseconds: number;
};

export function convertTimestamp(value: string): TimestampResult {
  const trimmed = value.trim();
  if (!trimmed) throw new Error('Enter a Unix timestamp or ISO date.');

  let milliseconds: number;
  if (/^-?\d+$/u.test(trimmed)) {
    const numeric = Number(trimmed);
    if (!Number.isSafeInteger(numeric)) {
      throw new Error('The timestamp is outside the exact integer range.');
    }
    milliseconds =
      Math.abs(numeric) < 100_000_000_000 ? numeric * 1000 : numeric;
  } else {
    milliseconds = Date.parse(trimmed);
  }

  const date = new Date(milliseconds);
  if (!Number.isFinite(milliseconds) || Number.isNaN(date.getTime())) {
    throw new Error('The timestamp or date is not valid.');
  }

  return {
    iso: date.toISOString(),
    unixSeconds: Math.floor(milliseconds / 1000),
    unixMilliseconds: milliseconds,
  };
}

export function calculatePercentage(
  mode: PercentageMode,
  first: number,
  second: number,
): number {
  if (!Number.isFinite(first) || !Number.isFinite(second)) {
    throw new Error('Enter two finite numbers.');
  }
  if (mode === 'percent-of') return (first / 100) * second;
  if (second === 0 && mode === 'what-percent') {
    throw new Error('The reference value cannot be zero.');
  }
  if (first === 0 && mode === 'change') {
    throw new Error('The starting value cannot be zero.');
  }
  return mode === 'what-percent'
    ? (first / second) * 100
    : ((second - first) / Math.abs(first)) * 100;
}

type DateParts = { year: number; month: number; day: number };

function parseDateOnly(value: string): DateParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (!match) throw new Error('Choose a valid calendar date.');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error('Choose a valid calendar date.');
  }
  return { year, month, day };
}

function epochDay(parts: DateParts): number {
  return Date.UTC(parts.year, parts.month - 1, parts.day) / 86_400_000;
}

function compareDate(a: DateParts, b: DateParts): number {
  return epochDay(a) - epochDay(b);
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function addMonthsClamped(parts: DateParts, months: number): DateParts {
  const total = parts.year * 12 + parts.month - 1 + months;
  const year = Math.floor(total / 12);
  const month = (((total % 12) + 12) % 12) + 1;
  return {
    year,
    month,
    day: Math.min(parts.day, daysInMonth(year, month)),
  };
}

export function dateDifference(start: string, end: string): number {
  const startParts = parseDateOnly(start);
  const endParts = parseDateOnly(end);
  return Math.abs(epochDay(endParts) - epochDay(startParts));
}

export type CalendarAge = {
  years: number;
  months: number;
  days: number;
  totalDays: number;
};

export function calendarAge(birth: string, onDate: string): CalendarAge {
  const start = parseDateOnly(birth);
  const end = parseDateOnly(onDate);
  if (compareDate(start, end) > 0) {
    throw new Error('Birth date must not be after the comparison date.');
  }

  let years = end.year - start.year;
  let cursor = addMonthsClamped(start, years * 12);
  if (compareDate(cursor, end) > 0) {
    years -= 1;
    cursor = addMonthsClamped(start, years * 12);
  }

  let months = 0;
  while (months < 11) {
    const next = addMonthsClamped(cursor, 1);
    if (compareDate(next, end) > 0) break;
    cursor = next;
    months += 1;
  }

  return {
    years,
    months,
    days: epochDay(end) - epochDay(cursor),
    totalDays: epochDay(end) - epochDay(start),
  };
}

export type HashAlgorithm = 'SHA-256' | 'SHA-384' | 'SHA-512';

export async function hashBytes(
  bytes: ArrayBuffer,
  algorithm: HashAlgorithm,
): Promise<string> {
  const digest = await crypto.subtle.digest(algorithm, bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 8,
  }).format(value);
}
