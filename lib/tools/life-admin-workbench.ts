import { maskAadhaarValue, maskPanValue } from './id-mask/mask';

export interface LifeAdminField {
  id: string;
  label: string;
  type: 'number' | 'text' | 'textarea' | 'select';
  defaultValue: string;
  options?: readonly { value: string; label: string }[];
}

export interface LifeAdminOperation {
  id: string;
  name: string;
  description: string;
  fields: readonly LifeAdminField[];
  notice: string;
  outputExtension?: string;
}

const text = (
  id: string,
  label: string,
  defaultValue: string,
): LifeAdminField => ({
  id,
  label,
  type: 'text',
  defaultValue,
});
const number = (
  id: string,
  label: string,
  defaultValue: string,
): LifeAdminField => ({
  id,
  label,
  type: 'number',
  defaultValue,
});
const area = (
  id: string,
  label: string,
  defaultValue: string,
): LifeAdminField => ({
  id,
  label,
  type: 'textarea',
  defaultValue,
});

const privacyNotice =
  'This local utility transforms the value you enter in this tab. Clear the result when using a shared device.';
const syntaxNotice =
  'Format check only. A matching result does not prove that the identifier, account, branch, address, or beneficiary exists or is active.';
const planningNotice =
  'Planning arithmetic using only your inputs. It does not apply contracts, taxes, tariffs, penalties, eligibility rules, or provider-specific terms.';
const dateNotice =
  'Calendar estimate using the dates and interval you supply. Verify contractual, banking, holiday, time-zone, and local-rule effects separately.';
const numerologyNotice =
  'Numerology is a cultural practice, not science. This shows the arithmetic only — no meanings or predictions. Your date of birth stays on this device.';

export const LIFE_ADMIN_OPERATIONS: readonly LifeAdminOperation[] = [
  {
    id: 'aadhaar-masking-tool',
    name: 'Aadhaar masking tool',
    description:
      'Hide the first eight digits of one number and retain only the last four.',
    fields: [text('input', '12-digit Aadhaar number', '2345 6789 0124')],
    notice:
      'Masking follows UIDAI’s displayed masked-Aadhaar pattern. This does not validate, authenticate, store, or retrieve Aadhaar data. For a whole document or paste, use the Aadhaar and PAN masker.',
  },
  {
    id: 'pan-masking-tool',
    name: 'PAN masking tool',
    description:
      'Hide the first six characters of one ten-character PAN value.',
    fields: [text('input', 'PAN value', 'ABCDE1234F')],
    notice:
      'Privacy transform only. It does not validate PAN structure, ownership, status, or tax records. For a whole document or paste, use the Aadhaar and PAN masker.',
  },
  {
    id: 'bank-account-masking-tool',
    name: 'Bank account masking tool',
    description:
      'Hide all but the last four characters of an account reference.',
    fields: [text('input', 'Account number', '123456789012')],
    notice: privacyNotice,
  },
  {
    id: 'indian-address-formatter',
    name: 'Indian address formatter',
    description:
      'Clean spacing and place comma-separated address parts on lines.',
    fields: [
      area(
        'input',
        'Address',
        '42 Example Road, Indiranagar, Bengaluru, Karnataka 560038',
      ),
    ],
    notice:
      'Layout helper only. It does not verify a locality, PIN code, deliverability, or government-address record.',
  },
  {
    id: 'pin-code-format-checker',
    name: 'PIN code format checker',
    description:
      'Check an Indian PIN code against the six-digit shape with a non-zero first digit. Spaces are stripped first, and it tests the format, not whether it exists.',
    fields: [text('input', 'PIN code', '560038')],
    notice: syntaxNotice,
  },
  {
    id: 'indian-phone-number-formatter',
    name: 'Indian phone number formatter',
    description:
      'Paste a mobile number with spaces, brackets, a leading zero or 91, and get it back as +91 XXXXX XXXXX. Ten digits beginning 6 to 9 are accepted.',
    fields: [text('input', 'Mobile number', '+91 98765 43210')],
    notice:
      'Formatting check only. It does not verify assignment, ownership, reachability, consent, or DND status.',
  },
  {
    id: 'ifsc-format-checker',
    name: 'IFSC format checker',
    description: 'Check the RBI-documented 11-character IFSC structure.',
    fields: [text('input', 'IFSC', 'SBIN0001234')],
    notice:
      'Structure check only: four letters, zero as the fifth character, then six alphanumerics. Verify the current branch code with RBI or the bank.',
  },
  {
    id: 'micr-format-checker',
    name: 'MICR format checker',
    description: 'Check whether a MICR value contains exactly nine digits.',
    fields: [text('input', 'MICR code', '400002001')],
    notice: syntaxNotice,
  },
  {
    id: 'upi-id-format-checker',
    name: 'UPI ID format checker',
    description:
      'Check a conservative user@handle syntax and 45-character limit.',
    fields: [text('input', 'UPI ID', 'sample@bank')],
    notice:
      'Syntax check only. NPCI describes a UPI ID/VPA as a payment address; only a UPI app or PSP can verify that a particular ID exists and can receive money.',
  },
  {
    id: 'indian-currency-number-to-words',
    name: 'Indian currency number to words',
    description: 'Write rupees using thousand, lakh, and crore groups.',
    fields: [number('amount', 'Amount', '1234567.89')],
    notice:
      'English wording for non-negative amounts below ₹1,00,00,00,00,000. Verify institutional spelling and rounding requirements.',
  },
  {
    id: 'cheque-amount-writer',
    name: 'Cheque amount writer',
    description:
      'Type an amount in this tab and get the English words line for a cheque, in Indian lakh and crore, with paise spelled out and Rupees … Only wrapped around it.',
    fields: [number('amount', 'Amount', '12500.5')],
    notice:
      'Writing aid only. Verify the numeric amount, payee, date, bank instructions, overwriting rules, and local acceptance before signing.',
  },
  {
    id: 'house-rent-split-calculator',
    name: 'House rent split calculator',
    description: 'Split rent and shared charges evenly across occupants.',
    fields: [
      number('rent', 'Monthly rent', '30000'),
      number('shared', 'Shared charges', '3000'),
      number('people', 'Occupants', '3'),
    ],
    notice: planningNotice,
  },
  {
    id: 'electricity-bill-unit-calculator',
    name: 'Electricity unit calculator',
    description:
      'Calculate meter units and an optional user-supplied unit cost.',
    fields: [
      number('previous', 'Previous reading', '12450'),
      number('current', 'Current reading', '12780'),
      number('rate', 'Cost per unit', '8'),
      number('fixed', 'Fixed/other charges', '0'),
    ],
    notice:
      'Arithmetic estimate only. It does not model slabs, taxes, subsidies, demand charges, fuel adjustments, meter multipliers, or utility rules.',
  },
  {
    id: 'lpg-consumption-calculator',
    name: 'LPG consumption calculator',
    description: 'Estimate daily use and days remaining from measured weights.',
    fields: [
      number('startWeight', 'Starting gas weight (kg)', '14.2'),
      number('currentWeight', 'Current gas weight (kg)', '9.5'),
      number('daysUsed', 'Days used', '20'),
    ],
    notice:
      'Linear estimate from measured gas weight; consumption varies. Do not use this estimate for leak detection or safety decisions.',
  },
  {
    id: 'fuel-cost-calculator',
    name: 'Fuel cost calculator',
    description: 'Estimate fuel needed and cost from distance and mileage.',
    fields: [
      number('distance', 'Distance (km)', '500'),
      number('efficiency', 'Mileage (km/L)', '15'),
      number('price', 'Fuel price per litre', '100'),
    ],
    notice: planningNotice,
  },
  {
    id: 'mileage-calculator',
    name: 'Mileage calculator',
    description: 'Calculate kilometres per litre from distance and fuel used.',
    fields: [
      number('distance', 'Distance (km)', '420'),
      number('fuel', 'Fuel used (L)', '28'),
    ],
    notice: planningNotice,
  },
  {
    id: 'road-trip-cost-calculator',
    name: 'Road trip cost calculator',
    description: 'Combine fuel, toll, stay, food, and other trip estimates.',
    fields: [
      number('distance', 'Distance (km)', '800'),
      number('efficiency', 'Mileage (km/L)', '16'),
      number('price', 'Fuel price per litre', '100'),
      number('tolls', 'Tolls/parking', '1500'),
      number('stay', 'Stay', '4000'),
      number('food', 'Food', '2500'),
      number('other', 'Other', '1000'),
      number('people', 'Travellers', '4'),
    ],
    notice: planningNotice,
  },
  {
    id: 'document-expiry-tracker',
    name: 'Document expiry tracker',
    description:
      'Calculate days until a document expires from a supplied date.',
    fields: [
      text('name', 'Document name', 'Passport'),
      text('asOf', 'As-of date (YYYY-MM-DD)', '2026-09-06'),
      text('expiry', 'Expiry date (YYYY-MM-DD)', '2028-04-30'),
    ],
    notice: dateNotice,
  },
  {
    id: 'warranty-expiry-tracker',
    name: 'Warranty expiry tracker',
    description: 'Estimate a warranty end date from purchase date and months.',
    fields: [
      text('item', 'Item', 'Laptop'),
      text('purchase', 'Purchase date (YYYY-MM-DD)', '2026-09-06'),
      number('months', 'Warranty months', '24'),
    ],
    notice:
      'Calendar estimate only. Registration, replacement, repairs, exclusions, proof of purchase, and provider terms may change coverage.',
  },
  {
    id: 'emi-due-date-planner',
    name: 'EMI due-date planner',
    description:
      'Give a first due date, a count of instalments up to 600 and an amount, and get a CSV of dates; a 31st falls back to the last day of shorter months.',
    fields: [
      text('start', 'First due date (YYYY-MM-DD)', '2026-10-05'),
      number('months', 'Number of instalments', '12'),
      number('amount', 'Amount per instalment', '12500'),
    ],
    notice: dateNotice,
    outputExtension: 'csv',
  },
  {
    id: 'school-fee-planner',
    name: 'School fee planner',
    description: 'Split a supplied total into equal scheduled instalments.',
    fields: [
      number('total', 'Total planned fee', '120000'),
      number('installments', 'Instalments', '4'),
      text('start', 'First due date (YYYY-MM-DD)', '2026-10-01'),
      number('interval', 'Months between instalments', '3'),
    ],
    notice: planningNotice,
    outputExtension: 'csv',
  },
  {
    id: 'wedding-budget-planner',
    name: 'Wedding budget planner',
    description:
      'Compare major supplied category estimates with a total budget.',
    fields: [
      number('budget', 'Total budget', '1000000'),
      number('venue', 'Venue', '250000'),
      number('catering', 'Catering', '300000'),
      number('decor', 'Decor', '100000'),
      number('photo', 'Photo/video', '100000'),
      number('clothing', 'Clothing', '100000'),
      number('other', 'Other', '75000'),
    ],
    notice: planningNotice,
  },
  {
    id: 'notice-period-calculator',
    name: 'Notice period calculator',
    description:
      'Add calendar days, up to 3,650, to the date notice was given to see the end date. Weekends and holidays are counted, as this is plain calendar arithmetic.',
    fields: [
      text('start', 'Notice date (YYYY-MM-DD)', '2026-09-06'),
      number('days', 'Calendar notice days', '30'),
    ],
    notice:
      'Calendar-day arithmetic only. Employment terms, service rules, holidays, leave, buyout, notice acceptance, and jurisdiction can change the actual last working day.',
  },
  {
    id: 'life-path-number-calculator',
    name: 'Life path number calculator',
    description:
      'Calculate the life path number from a date of birth using digit reduction.',
    fields: [text('birthDate', 'Date of birth (YYYY-MM-DD)', '1990-07-15')],
    notice: numerologyNotice,
  },
  {
    id: 'birth-number-calculator',
    name: 'Birth number calculator',
    description:
      'Calculate the birth number from the day of a date of birth using digit reduction.',
    fields: [text('birthDate', 'Date of birth (YYYY-MM-DD)', '1990-07-15')],
    notice: numerologyNotice,
  },
  {
    id: 'personal-year-number-calculator',
    name: 'Personal year number calculator',
    description:
      'Calculate the personal year number for a chosen year from a date of birth using digit reduction.',
    fields: [
      text('birthDate', 'Date of birth (YYYY-MM-DD)', '1990-07-15'),
      number('year', 'Year', '2026'),
    ],
    notice: numerologyNotice,
  },
] as const;

function raw(values: Record<string, string>, key: string) {
  return values[key] ?? '';
}

function required(values: Record<string, string>, key: string, label: string) {
  const result = raw(values, key).trim();
  if (!result) throw new Error(`Enter ${label.toLowerCase()} first.`);
  if (result.length > 100_000) throw new Error(`${label} is too long.`);
  return result;
}

function finite(
  values: Record<string, string>,
  key: string,
  label: string,
  minimum = 0,
  maximum = 1_000_000_000_000,
) {
  const result = Number(raw(values, key));
  if (!Number.isFinite(result) || result < minimum || result > maximum) {
    throw new Error(`${label} must be between ${minimum} and ${maximum}.`);
  }
  return result;
}

function integer(
  values: Record<string, string>,
  key: string,
  label: string,
  minimum: number,
  maximum: number,
) {
  const result = finite(values, key, label, minimum, maximum);
  if (!Number.isInteger(result))
    throw new Error(`${label} must be a whole number.`);
  return result;
}

const money = (amount: number) =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(amount)}`;
const quantity = (amount: number, digits = 2) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: digits }).format(
    amount,
  );

function digits(input: string) {
  return input.replace(/\D/gu, '');
}

function parseDate(value: string, label: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    throw new Error(`${label} must use YYYY-MM-DD.`);
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`${label} is not a real calendar date.`);
  }
  return date;
}

function iso(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function addMonths(date: Date, months: number) {
  const day = date.getUTCDate();
  const result = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1),
  );
  const lastDay = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

const small = [
  'Zero',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
] as const;
const tens = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
] as const;

function belowThousand(value: number): string {
  if (value < 20) return small[value];
  if (value < 100)
    return `${tens[Math.floor(value / 10)]}${value % 10 ? ` ${small[value % 10]}` : ''}`;
  return `${small[Math.floor(value / 100)]} Hundred${value % 100 ? ` ${belowThousand(value % 100)}` : ''}`;
}

function indianIntegerWords(value: number) {
  if (value === 0) return 'Zero';
  const groups = [
    { size: 10_000_000, name: 'Crore' },
    { size: 100_000, name: 'Lakh' },
    { size: 1_000, name: 'Thousand' },
  ];
  let remaining = value;
  const words: string[] = [];
  for (const group of groups) {
    const count = Math.floor(remaining / group.size);
    if (count) {
      words.push(
        `${count < 1000 ? belowThousand(count) : indianIntegerWords(count)} ${group.name}`,
      );
      remaining %= group.size;
    }
  }
  if (remaining) words.push(belowThousand(remaining));
  return words.join(' ');
}

function currencyWords(amount: number) {
  if (amount >= 100_000_000_000)
    throw new Error('Amount must be below ₹1,00,00,00,00,000.');
  const paiseTotal = Math.round((amount + Number.EPSILON) * 100);
  const rupees = Math.floor(paiseTotal / 100);
  const paise = paiseTotal % 100;
  return `${indianIntegerWords(rupees)} Rupees${paise ? ` and ${belowThousand(paise)} Paise` : ''}`;
}

function formatCheck(valid: boolean, normalized: string, rule: string) {
  return `${valid ? 'MATCHES FORMAT' : 'DOES NOT MATCH FORMAT'}\nNormalized: ${normalized || '—'}\nRule: ${rule}\nNot an existence or ownership check.`;
}

function birthDateParts(values: Record<string, string>) {
  const value = required(values, 'birthDate', 'a date of birth');
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    throw new Error('Date of birth must use YYYY-MM-DD.');
  }
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1)
    throw new Error('Date of birth year must be between 1 and 9999.');
  // setUTCFullYear keeps years 1–99 literal; Date.UTC would read them as 1900–1999.
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error('Date of birth is not a real calendar date.');
  }
  return { year, month, day };
}

/** Sums digits until 1–9, optionally stopping early at master numbers 11, 22 and 33. */
function reduceDigits(start: number, keepMasterNumbers: boolean) {
  const chain = [start];
  let value = start;
  while (value > 9 && !(keepMasterNumbers && [11, 22, 33].includes(value))) {
    let sum = 0;
    for (let rest = value; rest > 0; rest = Math.floor(rest / 10)) {
      sum += rest % 10;
    }
    value = sum;
    chain.push(value);
  }
  return {
    value,
    steps: (chain.length > 1 ? chain : [start, start]).join(' → '),
  };
}

function numerologyTotal(
  title: string,
  parts: [label: string, value: number][],
  keepMasterNumbers: boolean,
  method: string,
) {
  const reduced = parts.map(([label, value]) => ({
    label,
    ...reduceDigits(value, keepMasterNumbers),
  }));
  const total = reduceDigits(
    reduced.reduce((sum, part) => sum + part.value, 0),
    keepMasterNumbers,
  );
  return [
    `${title}: ${total.value}`,
    ...reduced.map((part) => `${part.label} ${part.steps}`),
    `Total ${reduced.map((part) => part.value).join(' + ')} = ${total.steps}`,
    `Method: ${method}`,
  ].join('\n');
}

function expiryResult(name: string, asOf: Date, expiry: Date) {
  const days = Math.round((expiry.getTime() - asOf.getTime()) / 86_400_000);
  return `${name}\nAs of: ${iso(asOf)}\nExpiry: ${iso(expiry)}\n${days >= 0 ? `${days} day${days === 1 ? '' : 's'} remaining` : `Expired ${Math.abs(days)} day${days === -1 ? '' : 's'} ago`}`;
}

export function runLifeAdminOperation(
  operationId: string,
  values: Record<string, string>,
): string {
  switch (operationId) {
    // Both of these masked their one value with a rule of their own until
    // 2026-09-21. They now call the same engine as the whole-text masker at
    // /life-admin/aadhaar-pan-masker, so "what is an Aadhaar number" and "how
    // much of it is hidden" are answered in one file rather than three.
    case 'aadhaar-masking-tool':
      return maskAadhaarValue(
        required(values, 'input', 'Aadhaar number').trim(),
      );
    case 'pan-masking-tool':
      return maskPanValue(required(values, 'input', 'PAN value').trim());
    case 'bank-account-masking-tool': {
      const normalized = required(values, 'input', 'account number').replace(
        /[\s-]+/gu,
        '',
      );
      if (!/^[A-Za-z0-9]{6,34}$/u.test(normalized))
        throw new Error(
          'Account reference must contain 6–34 letters or digits.',
        );
      return `${'X'.repeat(normalized.length - 4)}${normalized.slice(-4)}`;
    }
    case 'indian-address-formatter':
      return required(values, 'input', 'an address')
        .split(/[\n,]+/u)
        .map((part) => part.trim().replace(/\s+/gu, ' '))
        .filter(Boolean)
        .join(',\n');
    case 'pin-code-format-checker': {
      const normalized = required(values, 'input', 'a PIN code').replace(
        /\s+/gu,
        '',
      );
      return formatCheck(
        /^[1-9]\d{5}$/u.test(normalized),
        normalized,
        'six digits; first digit is not zero',
      );
    }
    case 'indian-phone-number-formatter': {
      const input = required(values, 'input', 'a mobile number');
      if (!/^[\d\s()+-]+$/u.test(input))
        throw new Error(
          'Mobile number accepts digits and common phone separators only.',
        );
      let normalized = digits(input);
      if (normalized.length === 12 && normalized.startsWith('91'))
        normalized = normalized.slice(2);
      if (normalized.length === 11 && normalized.startsWith('0'))
        normalized = normalized.slice(1);
      if (!/^[6-9]\d{9}$/u.test(normalized))
        throw new Error(
          'Enter a 10-digit Indian mobile number beginning with 6–9.',
        );
      return `+91 ${normalized.slice(0, 5)} ${normalized.slice(5)}`;
    }
    case 'ifsc-format-checker': {
      const normalized = required(values, 'input', 'an IFSC')
        .replace(/\s+/gu, '')
        .toUpperCase();
      return formatCheck(
        /^[A-Z]{4}0[A-Z0-9]{6}$/u.test(normalized),
        normalized,
        'four letters + 0 + six alphanumerics',
      );
    }
    case 'micr-format-checker': {
      const input = required(values, 'input', 'a MICR code');
      const normalized = input.replace(/[\s-]+/gu, '');
      return formatCheck(
        /^\d{9}$/u.test(normalized),
        normalized,
        'exactly nine digits',
      );
    }
    case 'upi-id-format-checker': {
      const normalized = required(values, 'input', 'a UPI ID');
      const valid =
        normalized.length <= 45 &&
        /^[A-Za-z0-9._-]{2,}@[A-Za-z0-9.-]{2,}$/u.test(normalized);
      return formatCheck(
        valid,
        normalized,
        'user@handle shape, no spaces, at most 45 characters',
      );
    }
    case 'indian-currency-number-to-words':
      return currencyWords(finite(values, 'amount', 'Amount'));
    case 'cheque-amount-writer':
      return `Rupees ${currencyWords(finite(values, 'amount', 'Amount')).replace(/ Rupees/u, '')} Only`;
    case 'house-rent-split-calculator': {
      const rent = finite(values, 'rent', 'Monthly rent');
      const shared = finite(values, 'shared', 'Shared charges');
      const people = integer(values, 'people', 'Occupants', 1, 1_000);
      const total = rent + shared;
      return `Total shared cost: ${money(total)}\nOccupants: ${people}\nPer occupant: ${money(total / people)}`;
    }
    case 'electricity-bill-unit-calculator': {
      const previous = finite(values, 'previous', 'Previous reading');
      const current = finite(values, 'current', 'Current reading');
      if (current < previous)
        throw new Error('Current reading must not be below previous reading.');
      const rate = finite(values, 'rate', 'Cost per unit');
      const fixed = finite(values, 'fixed', 'Fixed/other charges');
      const units = current - previous;
      return `Units used: ${quantity(units, 3)}\nUsage cost: ${money(units * rate)}\nFixed/other charges: ${money(fixed)}\nEstimated total: ${money(units * rate + fixed)}`;
    }
    case 'lpg-consumption-calculator': {
      const start = finite(
        values,
        'startWeight',
        'Starting gas weight',
        0.01,
        1000,
      );
      const current = finite(
        values,
        'currentWeight',
        'Current gas weight',
        0,
        start,
      );
      const days = finite(values, 'daysUsed', 'Days used', 0.01, 100_000);
      const used = start - current;
      if (used <= 0)
        throw new Error(
          'Current gas weight must be below starting gas weight.',
        );
      const daily = used / days;
      return `Gas used: ${quantity(used, 3)} kg\nAverage daily use: ${quantity(daily, 3)} kg/day\nEstimated days remaining: ${quantity(current / daily, 1)}`;
    }
    case 'fuel-cost-calculator': {
      const distance = finite(values, 'distance', 'Distance');
      const efficiency = finite(values, 'efficiency', 'Mileage', 0.01, 10_000);
      const price = finite(values, 'price', 'Fuel price');
      const litres = distance / efficiency;
      return `Fuel needed: ${quantity(litres, 2)} L\nEstimated fuel cost: ${money(litres * price)}`;
    }
    case 'mileage-calculator': {
      const distance = finite(values, 'distance', 'Distance');
      const fuel = finite(values, 'fuel', 'Fuel used', 0.01, 1_000_000);
      return `Mileage: ${quantity(distance / fuel, 2)} km/L`;
    }
    case 'road-trip-cost-calculator': {
      const distance = finite(values, 'distance', 'Distance');
      const efficiency = finite(values, 'efficiency', 'Mileage', 0.01, 10_000);
      const fuelCost =
        (distance / efficiency) * finite(values, 'price', 'Fuel price');
      const extras = ['tolls', 'stay', 'food', 'other'].reduce(
        (sum, key) => sum + finite(values, key, key),
        0,
      );
      const people = integer(values, 'people', 'Travellers', 1, 1_000);
      const total = fuelCost + extras;
      return `Fuel: ${money(fuelCost)}\nOther supplied costs: ${money(extras)}\nTrip total: ${money(total)}\nPer traveller: ${money(total / people)}`;
    }
    case 'document-expiry-tracker':
      return expiryResult(
        required(values, 'name', 'a document name'),
        parseDate(required(values, 'asOf', 'an as-of date'), 'As-of date'),
        parseDate(required(values, 'expiry', 'an expiry date'), 'Expiry date'),
      );
    case 'warranty-expiry-tracker': {
      const item = required(values, 'item', 'an item name');
      const purchase = parseDate(
        required(values, 'purchase', 'a purchase date'),
        'Purchase date',
      );
      const months = integer(values, 'months', 'Warranty months', 0, 1200);
      return `${item}\nPurchase: ${iso(purchase)}\nEstimated warranty end: ${iso(addMonths(purchase, months))}`;
    }
    case 'emi-due-date-planner': {
      const start = parseDate(
        required(values, 'start', 'a first due date'),
        'First due date',
      );
      const months = integer(values, 'months', 'Number of instalments', 1, 600);
      const amount = finite(values, 'amount', 'Amount per instalment');
      return [
        'Instalment,Due date,Amount',
        ...Array.from(
          { length: months },
          (_, index) =>
            `${index + 1},${iso(addMonths(start, index))},${amount.toFixed(2)}`,
        ),
      ].join('\n');
    }
    case 'school-fee-planner': {
      const total = finite(values, 'total', 'Total planned fee');
      const installments = integer(
        values,
        'installments',
        'Instalments',
        1,
        120,
      );
      const interval = integer(values, 'interval', 'Month interval', 1, 120);
      const start = parseDate(
        required(values, 'start', 'a first due date'),
        'First due date',
      );
      const regular = Math.floor((total / installments) * 100) / 100;
      return [
        'Instalment,Due date,Amount',
        ...Array.from({ length: installments }, (_, index) => {
          const amount =
            index === installments - 1
              ? total - regular * (installments - 1)
              : regular;
          return `${index + 1},${iso(addMonths(start, index * interval))},${amount.toFixed(2)}`;
        }),
      ].join('\n');
    }
    case 'wedding-budget-planner': {
      const budget = finite(values, 'budget', 'Total budget');
      const lines = [
        ['Venue', finite(values, 'venue', 'Venue')],
        ['Catering', finite(values, 'catering', 'Catering')],
        ['Decor', finite(values, 'decor', 'Decor')],
        ['Photo/video', finite(values, 'photo', 'Photo/video')],
        ['Clothing', finite(values, 'clothing', 'Clothing')],
        ['Other', finite(values, 'other', 'Other')],
      ] as const;
      const planned = lines.reduce((sum, [, amount]) => sum + amount, 0);
      return `${lines.map(([name, amount]) => `${name}: ${money(amount)}${budget ? ` (${quantity((amount / budget) * 100, 1)}%)` : ''}`).join('\n')}\n\nPlanned: ${money(planned)}\nBudget: ${money(budget)}\n${planned <= budget ? 'Unallocated' : 'Over budget'}: ${money(Math.abs(budget - planned))}`;
    }
    case 'notice-period-calculator': {
      const start = parseDate(
        required(values, 'start', 'a notice date'),
        'Notice date',
      );
      const days = integer(values, 'days', 'Calendar notice days', 0, 3650);
      return `Notice date: ${iso(start)}\nCalendar days: ${days}\nEstimated end date: ${iso(addDays(start, days))}`;
    }
    case 'life-path-number-calculator': {
      const { year, month, day } = birthDateParts(values);
      return numerologyTotal(
        'Life path number',
        [
          ['Day', day],
          ['Month', month],
          ['Year', year],
        ],
        true,
        'reduce the day, the month and the year separately by summing digits until a single digit or a master number (11, 22 or 33) remains; add the three results; reduce the total the same way.',
      );
    }
    case 'birth-number-calculator': {
      const day = reduceDigits(birthDateParts(values).day, false);
      return `Birth number: ${day.value}\nDay ${day.steps}\nMethod: sum the digits of the day of the month until a single digit (1–9) remains. Master numbers are not kept.`;
    }
    case 'personal-year-number-calculator': {
      const { month, day } = birthDateParts(values);
      return numerologyTotal(
        'Personal year number',
        [
          ['Birth month', month],
          ['Birth day', day],
          ['Year', integer(values, 'year', 'Year', 1, 9999)],
        ],
        false,
        'reduce the birth month, the birth day and the chosen year separately by summing digits until a single digit (1–9) remains; add the three results; reduce the total the same way. Master numbers are not kept.',
      );
    }
    default:
      throw new Error('Unknown life-admin operation.');
  }
}
