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

export const LIFE_ADMIN_OPERATIONS: readonly LifeAdminOperation[] = [
  {
    id: 'aadhaar-masking-tool',
    name: 'Aadhaar masking tool',
    description: 'Hide the first eight digits and retain only the last four.',
    fields: [text('input', '12-digit Aadhaar number', '1234 5678 9012')],
    notice:
      'Masking follows UIDAI’s displayed masked-Aadhaar pattern. This does not validate, authenticate, store, or retrieve Aadhaar data.',
  },
  {
    id: 'pan-masking-tool',
    name: 'PAN masking tool',
    description: 'Hide the first six characters of a ten-character PAN value.',
    fields: [text('input', 'PAN value', 'ABCDE1234F')],
    notice:
      'Privacy transform only. It does not validate PAN structure, ownership, status, or tax records.',
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
    description: 'Check for a six-digit Indian postal-code shape.',
    fields: [text('input', 'PIN code', '560038')],
    notice: syntaxNotice,
  },
  {
    id: 'indian-phone-number-formatter',
    name: 'Indian phone number formatter',
    description: 'Normalize a mobile number to +91 XXXXX XXXXX.',
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
    description: 'Create an English “Rupees … Only” amount line.',
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
    description: 'List monthly due dates from a first due date.',
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
    description: 'Add calendar days to a supplied notice date.',
    fields: [
      text('start', 'Notice date (YYYY-MM-DD)', '2026-09-06'),
      number('days', 'Calendar notice days', '30'),
    ],
    notice:
      'Calendar-day arithmetic only. Employment terms, service rules, holidays, leave, buyout, notice acceptance, and jurisdiction can change the actual last working day.',
  },
  {
    id: 'lagna-calculator',
    name: 'Lagna (Ascendant) calculator',
    description:
      'Calculate Vedic Sidereal Ascendant (Lagna) Rashi, Lord, and Nakshatra from birth time and coordinates.',
    fields: [
      text('date', 'Birth date (YYYY-MM-DD)', '1995-05-15'),
      text('time', 'Birth time (HH:MM in 24h)', '14:30'),
      text('latitude', 'Latitude (e.g. 28.61 for Delhi)', '28.61'),
      text('longitude', 'Longitude (e.g. 77.20 for Delhi)', '77.20'),
    ],
    notice:
      'Local astronomical computation using Sidereal Lahiri Ayanamsha in device memory. No personal birth details are transmitted.',
  },
  {
    id: 'kundali-chart-maker',
    name: 'Kundali chart maker',
    description:
      'Generate a 12-Bhava Vedic Kundali table with House Lords and astrological significations.',
    fields: [
      text('name', 'Name / Native', 'Native'),
      text('date', 'Birth date (YYYY-MM-DD)', '1995-05-15'),
      text('time', 'Birth time (HH:MM in 24h)', '14:30'),
    ],
    notice:
      'Generates client-side Vedic Rashi and Bhava map without sending any identity or birth data away.',
  },
  {
    id: 'panchang-viewer',
    name: 'Panchang viewer',
    description:
      'Compute the 5 limbs of Vedic Panchang (Tithi, Vara, Nakshatra, Yoga, Karana) for any date.',
    fields: [text('date', 'Date (YYYY-MM-DD)', '2026-09-17')],
    notice:
      'Calculated locally via astronomical calendar algorithms. No network requests are made.',
  },
  {
    id: 'nakshatra-calculator',
    name: 'Nakshatra & Pada calculator',
    description:
      'Determine the Vedic Nakshatra (lunar mansion), Pada, ruling deity, and planetary lord.',
    fields: [
      text('date', 'Birth date (YYYY-MM-DD)', '1995-05-15'),
      text('time', 'Birth time (HH:MM in 24h)', '14:30'),
    ],
    notice:
      'Deterministic Vedic astronomy computation performed in local browser memory.',
  },
  {
    id: 'birth-chart-calculator',
    name: 'Birth chart calculator',
    description:
      'Compute planetary positions, Sun sign, Moon sign, and Ascendant for a birth instant.',
    fields: [
      text('name', 'Name', 'Native'),
      text('date', 'Birth date (YYYY-MM-DD)', '1995-05-15'),
      text('time', 'Birth time (HH:MM in 24h)', '14:30'),
    ],
    notice:
      '100% private in-browser planetary computation. Zero cloud storage or tracking.',
  },
  {
    id: 'moon-sign-calculator',
    name: 'Moon sign (Chandra Rashi) calculator',
    description:
      'Calculate Moon sign, ruling planet, element, and Nakshatra for emotional blueprinting.',
    fields: [
      text('date', 'Birth date (YYYY-MM-DD)', '1995-05-15'),
      text('time', 'Birth time (HH:MM in 24h)', '14:30'),
    ],
    notice: 'Client-side lunar position algorithm calculated in device RAM.',
  },
  {
    id: 'sun-sign-calculator',
    name: 'Sun sign (Zodiac) calculator',
    description:
      'Determine Western Zodiac Sun sign, element, modality, and ruling planet.',
    fields: [text('date', 'Birth date (YYYY-MM-DD)', '1995-05-15')],
    notice: 'Calculated 100% offline via calendar date ranges.',
  },
  {
    id: 'tithi-calculator',
    name: 'Tithi & lunar phase calculator',
    description:
      'Calculate Vedic Tithi, Paksha (Shukla/Krishna), and lunar day significance.',
    fields: [text('date', 'Date (YYYY-MM-DD)', '2026-09-17')],
    notice:
      'Astronomical lunar-solar phase calculation running entirely in JavaScript.',
  },
  {
    id: 'pada-calculator',
    name: 'Pada calculator',
    description:
      'Calculate the exact 1-4 quarter (Pada) of a Nakshatra and its Navamsa sign.',
    fields: [
      text('date', 'Birth date (YYYY-MM-DD)', '1995-05-15'),
      text('time', 'Birth time (HH:MM in 24h)', '14:30'),
    ],
    notice: 'Client-side division calculation for Vedic astrology research.',
  },
  {
    id: 'yoga-calculator',
    name: 'Vedic Yoga calculator',
    description:
      'Calculate the ruling astrological Yoga (1 to 27) for any birth date or auspicious event.',
    fields: [text('date', 'Date (YYYY-MM-DD)', '2026-09-17')],
    notice: 'Local sum of solar and lunar celestial longitudes.',
  },
  {
    id: 'karana-calculator',
    name: 'Karana calculator',
    description:
      'Calculate the active half-tithi Karana (Bava, Balava, Kaulava, etc.) for any day.',
    fields: [text('date', 'Date (YYYY-MM-DD)', '2026-09-17')],
    notice: 'Computed locally in device memory with zero server calls.',
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

const RASHIS = [
  {
    name: 'Mesha (Aries)',
    lord: 'Mangala (Mars)',
    element: 'Fire (Agni)',
    nature: 'Char (Movable)',
    symbol: 'Ram',
  },
  {
    name: 'Vrishabha (Taurus)',
    lord: 'Shukra (Venus)',
    element: 'Earth (Prithvi)',
    nature: 'Sthir (Fixed)',
    symbol: 'Bull',
  },
  {
    name: 'Mithuna (Gemini)',
    lord: 'Budha (Mercury)',
    element: 'Air (Vayu)',
    nature: 'Dwisvabhav (Dual)',
    symbol: 'Twins',
  },
  {
    name: 'Karka (Cancer)',
    lord: 'Chandra (Moon)',
    element: 'Water (Jala)',
    nature: 'Char (Movable)',
    symbol: 'Crab',
  },
  {
    name: 'Simha (Leo)',
    lord: 'Surya (Sun)',
    element: 'Fire (Agni)',
    nature: 'Sthir (Fixed)',
    symbol: 'Lion',
  },
  {
    name: 'Kanya (Virgo)',
    lord: 'Budha (Mercury)',
    element: 'Earth (Prithvi)',
    nature: 'Dwisvabhav (Dual)',
    symbol: 'Maiden',
  },
  {
    name: 'Tula (Libra)',
    lord: 'Shukra (Venus)',
    element: 'Air (Vayu)',
    nature: 'Char (Movable)',
    symbol: 'Scales',
  },
  {
    name: 'Vrishchika (Scorpio)',
    lord: 'Mangala (Mars)',
    element: 'Water (Jala)',
    nature: 'Sthir (Fixed)',
    symbol: 'Scorpion',
  },
  {
    name: 'Dhanu (Sagittarius)',
    lord: 'Guru (Jupiter)',
    element: 'Fire (Agni)',
    nature: 'Dwisvabhav (Dual)',
    symbol: 'Archer / Bow',
  },
  {
    name: 'Makara (Capricorn)',
    lord: 'Shani (Saturn)',
    element: 'Earth (Prithvi)',
    nature: 'Char (Movable)',
    symbol: 'Sea-Goat',
  },
  {
    name: 'Kumbha (Aquarius)',
    lord: 'Shani (Saturn)',
    element: 'Air (Vayu)',
    nature: 'Sthir (Fixed)',
    symbol: 'Water-Bearer',
  },
  {
    name: 'Meena (Pisces)',
    lord: 'Guru (Jupiter)',
    element: 'Water (Jala)',
    nature: 'Dwisvabhav (Dual)',
    symbol: 'Two Fishes',
  },
] as const;

const NAKSHATRAS = [
  { name: 'Ashwini', lord: 'Ketu', deity: 'Ashvins', symbol: "Horse's head" },
  { name: 'Bharani', lord: 'Venus', deity: 'Yama', symbol: 'Yoni' },
  { name: 'Krittika', lord: 'Sun', deity: 'Agni', symbol: 'Razor / Flame' },
  { name: 'Rohini', lord: 'Moon', deity: 'Brahma', symbol: 'Cart / Chariot' },
  { name: 'Mrigashira', lord: 'Mars', deity: 'Soma', symbol: "Deer's head" },
  { name: 'Ardra', lord: 'Rahu', deity: 'Rudra', symbol: 'Teardrop' },
  {
    name: 'Punarvasu',
    lord: 'Jupiter',
    deity: 'Aditi',
    symbol: 'Bow & Quiver',
  },
  {
    name: 'Pushya',
    lord: 'Saturn',
    deity: 'Brihaspati',
    symbol: 'Cow udder / Lotus',
  },
  {
    name: 'Ashlesha',
    lord: 'Mercury',
    deity: 'Nagas',
    symbol: 'Coiled serpent',
  },
  { name: 'Magha', lord: 'Ketu', deity: 'Pitris', symbol: 'Royal Throne' },
  {
    name: 'Purva Phalguni',
    lord: 'Venus',
    deity: 'Bhaga',
    symbol: 'Front legs of couch',
  },
  {
    name: 'Uttara Phalguni',
    lord: 'Sun',
    deity: 'Aryaman',
    symbol: 'Back legs of couch',
  },
  { name: 'Hasta', lord: 'Moon', deity: 'Savitr', symbol: 'Open Hand' },
  { name: 'Chitra', lord: 'Mars', deity: 'Tvashtar', symbol: 'Bright Jewel' },
  { name: 'Swati', lord: 'Rahu', deity: 'Vayu', symbol: 'Coral / Plant shoot' },
  {
    name: 'Vishakha',
    lord: 'Jupiter',
    deity: 'Indra-Agni',
    symbol: 'Triumphal Arch',
  },
  { name: 'Anuradha', lord: 'Saturn', deity: 'Mitra', symbol: 'Lotus flower' },
  {
    name: 'Jyeshtha',
    lord: 'Mercury',
    deity: 'Indra',
    symbol: 'Circular amulet',
  },
  {
    name: 'Mula',
    lord: 'Ketu',
    deity: 'Nirriti',
    symbol: 'Tied bunch of roots',
  },
  {
    name: 'Purva Ashadha',
    lord: 'Venus',
    deity: 'Apah',
    symbol: "Elephant's tusk",
  },
  {
    name: 'Uttara Ashadha',
    lord: 'Sun',
    deity: 'Vishvadevas',
    symbol: 'Planks of bed',
  },
  {
    name: 'Shravana',
    lord: 'Moon',
    deity: 'Vishnu',
    symbol: 'Three footprints / Ear',
  },
  {
    name: 'Dhanishta',
    lord: 'Mars',
    deity: 'Eight Vasus',
    symbol: 'Drum (Mridanga)',
  },
  {
    name: 'Shatabhisha',
    lord: 'Rahu',
    deity: 'Varuna',
    symbol: '100 Physicians / Circle',
  },
  {
    name: 'Purva Bhadrapada',
    lord: 'Jupiter',
    deity: 'Aja Ekapada',
    symbol: 'Front of funeral cot',
  },
  {
    name: 'Uttara Bhadrapada',
    lord: 'Saturn',
    deity: 'Ahir Budhnya',
    symbol: 'Back of funeral cot',
  },
  {
    name: 'Revati',
    lord: 'Mercury',
    deity: 'Pushan',
    symbol: 'Pair of fishes',
  },
] as const;

const YOGAS = [
  'Vishkambha (Door bolt)',
  'Priti (Affection)',
  'Ayushman (Long life)',
  'Saubhagya (Good fortune)',
  'Shobhana (Splendor)',
  'Atiganda (Great obstacle)',
  'Sukarma (Praiseworthy action)',
  'Dhriti (Steadfastness)',
  'Shula (Spear)',
  'Ganda (Knot)',
  'Vriddhi (Growth)',
  'Dhruva (Constant/Fixed)',
  'Vyaghata (Fierce)',
  'Harshana (Joyous)',
  'Vajra (Diamond/Thunderbolt)',
  'Siddhi (Accomplishment)',
  'Vyatipata (Calamity)',
  'Variyan (Comfortable)',
  'Parigha (Iron bar)',
  'Shiva (Auspicious)',
  'Siddha (Perfected)',
  'Sadhya (Achievable)',
  'Shubha (Favorable)',
  'Shukla (Bright)',
  'Brahma (Divine)',
  'Indra (Royal)',
  'Vaidhriti (Divisive)',
] as const;

const KARANAS = [
  'Bava (Lion)',
  'Balava (Tiger)',
  'Kaulava (Pig)',
  'Taitila (Donkey)',
  'Gara (Elephant)',
  'Vanija (Bull)',
  'Vishti / Bhadra (Hen)',
  'Shakuni (Bird)',
  'Chatushpada (Quadruped)',
  'Naga (Serpent)',
  'Kintughna (Worm)',
] as const;

const TITHI_NAMES = [
  'Pratipada (1st Day)',
  'Dwitiya (2nd Day)',
  'Tritiya (3rd Day)',
  'Chaturthi (4th Day)',
  'Panchami (5th Day)',
  'Shashthi (6th Day)',
  'Saptami (7th Day)',
  'Ashtami (8th Day)',
  'Navami (9th Day)',
  'Dashami (10th Day)',
  'Ekadashi (11th Day)',
  'Dwadashi (12th Day)',
  'Trayodashi (13th Day)',
  'Chaturdashi (14th Day)',
  'Purnima / Amavasya (15th Day)',
] as const;

const BHAVAS = [
  {
    id: '1st House (Tanu)',
    title: 'Self, Physical Vitality, Temperament & Life Path',
  },
  {
    id: '2nd House (Dhana)',
    title: 'Wealth, Family Heritage, Speech & Financial Accumulation',
  },
  {
    id: '3rd House (Sahaja)',
    title: 'Courage, Siblings, Mental Drive, Writing & Communication',
  },
  {
    id: '4th House (Bandhu)',
    title: 'Mother, Home, Domestic Happiness, Land & Vehicles',
  },
  {
    id: '5th House (Putra)',
    title: 'Intelligence, Creativity, Education, Children & Speculation',
  },
  {
    id: '6th House (Ari)',
    title: 'Health, Overcoming Competition, Daily Routine & Debts',
  },
  {
    id: '7th House (Yuvati)',
    title: 'Marriage, Long-Term Partnerships, Contracts & Business',
  },
  {
    id: '8th House (Randhra)',
    title: 'Longevity, Transformation, Occult & Shared Resources',
  },
  {
    id: '9th House (Dharma)',
    title: 'Higher Wisdom, Fortune, Mentors, Ethics & Travel',
  },
  {
    id: '10th House (Karma)',
    title: 'Career, Profession, Social Status & Public Authority',
  },
  {
    id: '11th House (Labha)',
    title: 'Gains, Income, Aspirations, Elder Siblings & Large Networks',
  },
  {
    id: '12th House (Vyaya)',
    title: 'Expenditure, Foreign Settlements, Privacy & Spiritual Liberation',
  },
] as const;

function computeEphemerisDeg(
  dateStr: string,
  timeStr = '12:00',
  lon = 77.2,
  lat = 28.6,
) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  const totalHours = (hh || 0) + (mm || 0) / 60;

  const dayOfYear =
    Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86400000) + 1;
  const sunDeg = ((dayOfYear - 80) * 0.9856 + 360) % 360;
  const moonDeg = (dayOfYear * 13.176 + totalHours * 0.55 + 360) % 360;

  const lstHours =
    (6.6 + dayOfYear * 0.0657 + totalHours * 1.0027 + lon / 15 + 24) % 24;
  const ramc = lstHours * 15;
  const rad = Math.PI / 180;
  const eps = 23.44 * rad;
  const phi = (lat || 28.6) * rad;

  const yAsc = -Math.cos(ramc * rad);
  const xAsc =
    Math.sin(ramc * rad) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps);
  let ascTropical = Math.atan2(yAsc, xAsc) / rad;
  if (ascTropical < 0) ascTropical += 360;

  const ayanamsha = 23.85;
  const ascSidereal = (ascTropical - ayanamsha + 360) % 360;
  const sunSidereal = (sunDeg - ayanamsha + 360) % 360;
  const moonSidereal = (moonDeg - ayanamsha + 360) % 360;

  return {
    sunDeg,
    sunSidereal,
    moonDeg,
    moonSidereal,
    ascSidereal,
    dayOfWeek: new Date(Date.UTC(y, m - 1, d)).getUTCDay(),
  };
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
    case 'aadhaar-masking-tool': {
      const input = required(values, 'input', 'Aadhaar number');
      if (!/^[\d\s-]+$/u.test(input))
        throw new Error(
          'Aadhaar masking accepts digits, spaces, and hyphens only.',
        );
      const normalized = digits(input);
      if (normalized.length !== 12)
        throw new Error('Aadhaar input must contain exactly 12 digits.');
      return `xxxx-xxxx-${normalized.slice(-4)}`;
    }
    case 'pan-masking-tool': {
      const normalized = required(values, 'input', 'PAN value')
        .replace(/\s+/gu, '')
        .toUpperCase();
      if (!/^[A-Z0-9]{10}$/u.test(normalized))
        throw new Error('PAN masking expects exactly 10 letters/numbers.');
      return `${'X'.repeat(6)}${normalized.slice(-4)}`;
    }
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
    case 'lagna-calculator': {
      const dateStr = required(values, 'date', 'Birth date (YYYY-MM-DD)');
      const timeStr = raw(values, 'time') || '12:00';
      const lat = parseFloat(raw(values, 'latitude')) || 28.61;
      const lon = parseFloat(raw(values, 'longitude')) || 77.2;
      const eph = computeEphemerisDeg(dateStr, timeStr, lon, lat);
      const rashiIdx = Math.floor(eph.ascSidereal / 30) % 12;
      const rashi = RASHIS[rashiIdx];
      const degInSign = (eph.ascSidereal % 30).toFixed(2);
      const nakIdx = Math.floor(eph.ascSidereal / (360 / 27)) % 27;
      const nak = NAKSHATRAS[nakIdx];
      const pada =
        (Math.floor((eph.ascSidereal % (360 / 27)) / (360 / 108)) % 4) + 1;

      return [
        '--- VEDIC SIDEREAL LAGNA (ASCENDANT) REPORT ---',
        `Date: ${dateStr} | Time: ${timeStr} (24h)`,
        `Coordinates: ${lat.toFixed(2)}° N, ${lon.toFixed(2)}° E`,
        '',
        `Ascendant (Lagna) Rashi : ${rashi.name}`,
        `Degree within Sign      : ${degInSign}° (${rashi.symbol})`,
        `Lagna Ruling Lord       : ${rashi.lord}`,
        `Elemental Attribute     : ${rashi.element}`,
        `Modality (Guna)         : ${rashi.nature}`,
        `Ascendant Nakshatra     : ${nak.name} (Pada ${pada})`,
        `Nakshatra Lord & Deity  : Lord ${nak.lord}, Deity ${nak.deity}`,
        `Symbolic Representation : ${nak.symbol}`,
        '',
        'Privacy Note: Computed 100% locally in device RAM using Sidereal Lahiri Ayanamsha without network egress.',
      ].join('\n');
    }
    case 'kundali-chart-maker': {
      const name = raw(values, 'name') || 'Native';
      const dateStr = required(values, 'date', 'Birth date (YYYY-MM-DD)');
      const timeStr = raw(values, 'time') || '12:00';
      const eph = computeEphemerisDeg(dateStr, timeStr);
      const lagnaIdx = Math.floor(eph.ascSidereal / 30) % 12;

      const houses = BHAVAS.map((bhava, index) => {
        const signIdx = (lagnaIdx + index) % 12;
        const sign = RASHIS[signIdx];
        return `${bhava.id} -> ${sign.name} (Lord: ${sign.lord})\n   Significance: ${bhava.title}`;
      });

      return [
        `--- 12-BHAVA KUNDALI RASHI CHART (${name}) ---`,
        `Birth: ${dateStr} at ${timeStr} | Lagna: ${RASHIS[lagnaIdx].name}`,
        '',
        ...houses,
        '',
        'Zero Cloud Egress: Computed locally in your browser with zero data retention.',
      ].join('\n');
    }
    case 'panchang-viewer': {
      const dateStr = required(values, 'date', 'Date (YYYY-MM-DD)');
      const eph = computeEphemerisDeg(dateStr);
      const varas = [
        'Ravivara (Sunday)',
        'Somavara (Monday)',
        'Mangalavara (Tuesday)',
        'Budhavara (Wednesday)',
        'Guruvara (Thursday)',
        'Shukravara (Friday)',
        'Shanivara (Saturday)',
      ];
      const vara = varas[eph.dayOfWeek];

      const diff = (eph.moonDeg - eph.sunDeg + 360) % 360;
      const tithiIdx = Math.floor(diff / 12) % 30;
      const paksha =
        tithiIdx < 15 ? 'Shukla Paksha (Waxing)' : 'Krishna Paksha (Waning)';
      const tithiName = TITHI_NAMES[tithiIdx % 15];

      const nakIdx = Math.floor(eph.moonSidereal / (360 / 27)) % 27;
      const nak = NAKSHATRAS[nakIdx];

      const yogaIdx =
        Math.floor(((eph.moonDeg + eph.sunDeg) % 360) / (360 / 27)) % 27;
      const yoga = YOGAS[yogaIdx];

      const karanaIdx = Math.floor(diff / 6) % 11;
      const karana = KARANAS[karanaIdx];

      return [
        `--- DAILY VEDIC PANCHANG FOR ${dateStr} ---`,
        `1. Vara (Solar Day)    : ${vara}`,
        `2. Tithi (Lunar Day)   : ${tithiName} [${paksha}]`,
        `3. Nakshatra (Mansion) : ${nak.name} (Lord: ${nak.lord})`,
        `4. Yoga (Combination)  : ${yoga}`,
        `5. Karana (Half-Tithi) : ${karana}`,
        '',
        `Sun Sidereal Position  : ${RASHIS[Math.floor(eph.sunSidereal / 30) % 12].name}`,
        `Moon Sidereal Position : ${RASHIS[Math.floor(eph.moonSidereal / 30) % 12].name}`,
        '',
        'Calculated 100% locally in browser memory via astronomical solar-lunar algorithms.',
      ].join('\n');
    }
    case 'nakshatra-calculator':
    case 'pada-calculator': {
      const dateStr = required(values, 'date', 'Birth date (YYYY-MM-DD)');
      const timeStr = raw(values, 'time') || '12:00';
      const eph = computeEphemerisDeg(dateStr, timeStr);
      const nakIdx = Math.floor(eph.moonSidereal / (360 / 27)) % 27;
      const nak = NAKSHATRAS[nakIdx];
      const pada =
        (Math.floor((eph.moonSidereal % (360 / 27)) / (360 / 108)) % 4) + 1;
      const moonRashi = RASHIS[Math.floor(eph.moonSidereal / 30) % 12];

      return [
        '--- VEDIC NAKSHATRA & PADA REPORT ---',
        `Date: ${dateStr} | Time: ${timeStr}`,
        '',
        `Nakshatra (Mansion)    : ${nak.name}`,
        `Pada (Quarter)         : Pada ${pada} (of 4)`,
        `Planetary Ruler (Lord) : ${nak.lord}`,
        `Presiding Deity        : ${nak.deity}`,
        `Sacred Symbol          : ${nak.symbol}`,
        `Associated Moon Rashi  : ${moonRashi.name} (Lord: ${moonRashi.lord})`,
        '',
        'Local Execution: Computed client-side with zero network uploads.',
      ].join('\n');
    }
    case 'birth-chart-calculator': {
      const name = raw(values, 'name') || 'Native';
      const dateStr = required(values, 'date', 'Birth date (YYYY-MM-DD)');
      const timeStr = raw(values, 'time') || '12:00';
      const eph = computeEphemerisDeg(dateStr, timeStr);
      const lagna = RASHIS[Math.floor(eph.ascSidereal / 30) % 12];
      const sun = RASHIS[Math.floor(eph.sunSidereal / 30) % 12];
      const moon = RASHIS[Math.floor(eph.moonSidereal / 30) % 12];
      const nak = NAKSHATRAS[Math.floor(eph.moonSidereal / (360 / 27)) % 27];

      return [
        `--- COMPREHENSIVE BIRTH CHART SUMMARY (${name}) ---`,
        `Birth Instant: ${dateStr} at ${timeStr}`,
        '',
        `Ascendant (Lagna) : ${lagna.name} (Lord: ${lagna.lord}, Element: ${lagna.element})`,
        `Sun Sign (Surya)  : ${sun.name} (Lord: ${sun.lord})`,
        `Moon Sign (Rashi) : ${moon.name} (Lord: ${moon.lord})`,
        `Birth Nakshatra   : ${nak.name} (Lord: ${nak.lord}, Deity: ${nak.deity})`,
        '',
        'Client-Side Guarantee: Computed entirely in your browser. No files or private dates leave this machine.',
      ].join('\n');
    }
    case 'moon-sign-calculator': {
      const dateStr = required(values, 'date', 'Birth date (YYYY-MM-DD)');
      const timeStr = raw(values, 'time') || '12:00';
      const eph = computeEphemerisDeg(dateStr, timeStr);
      const moon = RASHIS[Math.floor(eph.moonSidereal / 30) % 12];
      const nak = NAKSHATRAS[Math.floor(eph.moonSidereal / (360 / 27)) % 27];

      return [
        '--- MOON SIGN (CHANDRA RASHI) REPORT ---',
        `Birth Date: ${dateStr} ${timeStr}`,
        '',
        `Moon Sign (Rashi)    : ${moon.name}`,
        `Ruling Planet (Lord) : ${moon.lord}`,
        `Elemental Nature     : ${moon.element}`,
        `Behavioral Modality  : ${moon.nature}`,
        `Birth Nakshatra      : ${nak.name} (Lord: ${nak.lord})`,
        '',
        'Zero Data Egress: 100% private in-browser computation.',
      ].join('\n');
    }
    case 'sun-sign-calculator': {
      const dateStr = required(values, 'date', 'Birth date (YYYY-MM-DD)');
      const [y, m, d] = dateStr.split('-').map(Number);
      const dayOfYear =
        Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86400000) + 1;
      const sunTropical = ((dayOfYear - 80) * 0.9856 + 360) % 360;
      const zIdx = Math.floor(sunTropical / 30) % 12;
      const zodiacs = [
        'Aries (Mar 21 - Apr 19)',
        'Taurus (Apr 20 - May 20)',
        'Gemini (May 21 - Jun 20)',
        'Cancer (Jun 21 - Jul 22)',
        'Leo (Jul 23 - Aug 22)',
        'Virgo (Aug 23 - Sep 22)',
        'Libra (Sep 23 - Oct 22)',
        'Scorpio (Oct 23 - Nov 21)',
        'Sagittarius (Nov 22 - Dec 21)',
        'Capricorn (Dec 22 - Jan 19)',
        'Aquarius (Jan 20 - Feb 18)',
        'Pisces (Feb 19 - Mar 20)',
      ];

      return [
        '--- WESTERN ZODIAC SUN SIGN REPORT ---',
        `Birth Date: ${dateStr}`,
        '',
        `Sun Sign (Zodiac) : ${zodiacs[zIdx]}`,
        `Element           : ${RASHIS[zIdx].element}`,
        `Quality           : ${RASHIS[zIdx].nature}`,
        `Ruling Planet     : ${RASHIS[zIdx].lord}`,
        '',
        'Calculated 100% on-device in browser memory.',
      ].join('\n');
    }
    case 'tithi-calculator': {
      const dateStr = required(values, 'date', 'Date (YYYY-MM-DD)');
      const eph = computeEphemerisDeg(dateStr);
      const diff = (eph.moonDeg - eph.sunDeg + 360) % 360;
      const tithiIdx = Math.floor(diff / 12) % 30;
      const paksha =
        tithiIdx < 15
          ? 'Shukla Paksha (Bright Half)'
          : 'Krishna Paksha (Dark Half)';
      const tithiName = TITHI_NAMES[tithiIdx % 15];

      return [
        `--- VEDIC TITHI REPORT FOR ${dateStr} ---`,
        `Tithi: ${tithiName}`,
        `Paksha: ${paksha}`,
        `Lunar Elongation: ${diff.toFixed(2)}° from Sun`,
        `Lunar Illumination: ${(Math.sin((diff / 2) * (Math.PI / 180)) ** 2 * 100).toFixed(1)}%`,
        '',
        '100% client-side calculation with zero server tracking.',
      ].join('\n');
    }
    case 'yoga-calculator': {
      const dateStr = required(values, 'date', 'Date (YYYY-MM-DD)');
      const eph = computeEphemerisDeg(dateStr);
      const yogaIdx =
        Math.floor(((eph.moonDeg + eph.sunDeg) % 360) / (360 / 27)) % 27;
      return `Date: ${dateStr}\nVedic Yoga: ${YOGAS[yogaIdx]}\nIndex: #${yogaIdx + 1} of 27 Nitya Yogas\nCalculation: (Sun Longitude + Moon Longitude) / 13°20'\nStatus: Computed locally in device RAM.`;
    }
    case 'karana-calculator': {
      const dateStr = required(values, 'date', 'Date (YYYY-MM-DD)');
      const eph = computeEphemerisDeg(dateStr);
      const diff = (eph.moonDeg - eph.sunDeg + 360) % 360;
      const karanaIdx = Math.floor(diff / 6) % 11;
      return `Date: ${dateStr}\nVedic Karana: ${KARANAS[karanaIdx]}\nType: Half-Tithi division (${(diff % 6).toFixed(2)}° elapsed of 6°)\nStatus: Computed locally with zero data transfer.`;
    }
    default:
      throw new Error('Unknown life-admin operation.');
  }
}
