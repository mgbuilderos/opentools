export type FinanceFormat = 'ofx' | 'qif';
export type NumberConvention = 'standard-us' | 'european' | 'indian-lakh';

export type FinanceFormatErrorCode =
  | 'INVALID_ENCODING'
  | 'UNSUPPORTED_FORMAT'
  | 'MALFORMED_OFX'
  | 'MALFORMED_QIF'
  | 'INVALID_AMOUNT'
  | 'DECLARED_LENGTH_EXCEEDS_BUFFER';

export class FinanceFormatError extends Error {
  readonly code: FinanceFormatErrorCode;

  constructor(code: FinanceFormatErrorCode, message: string) {
    super(message);
    this.name = 'FinanceFormatError';
    this.code = code;
  }
}

export interface ParsedAmount {
  raw: string;
  value: number | null;
  currency?: string;
  isDebit: boolean;
  isCredit: boolean;
}

export interface FinanceAccount {
  id: string;
  name?: string;
  type?: string;
  currency?: string;
  bankId?: string;
  description?: string;
  statementStart?: string;
  statementEnd?: string;
  openingBalance: number | null;
  closingBalance: number | null;
}

export interface FinanceSplit {
  category?: string;
  memo?: string;
  amount: number | null;
}

export interface FinanceTransaction {
  accountId: string;
  type?: string;
  date: string | null;
  amount: number;
  rawAmount: string;
  currency?: string;
  id?: string;
  reference?: string;
  payee?: string;
  memo?: string;
  category?: string;
  cleared?: string;
  splits?: readonly FinanceSplit[];
}

export interface FinanceParseResult {
  format: FinanceFormat;
  version?: string;
  accounts: readonly FinanceAccount[];
  transactions: readonly FinanceTransaction[];
  openingBalance: number | null;
  closingBalance: number | null;
}

export interface ReconcileInput {
  opening: number | null;
  transactions: readonly (number | { readonly amount: number })[];
  closing: number;
}

export type ReconcileResult =
  | {
      balanced: boolean;
      delta: number;
    }
  | {
      balanced: false;
      delta: null;
      reason: 'no-opening-balance';
    };

const CURRENCY_SYMBOLS: Record<string, string> = {
  $: 'USD',
  '€': 'EUR',
  '£': 'GBP',
  '₹': 'INR',
  '¥': 'JPY',
  'Rs.': 'INR',
  Rs: 'INR',
  INR: 'INR',
  USD: 'USD',
  EUR: 'EUR',
  GBP: 'GBP',
};

/** Kept byte-for-byte equivalent to the statement-value engine. */
export function detectNumberConvention(
  cells: readonly string[],
): NumberConvention {
  let europeanVotes = 0;
  let indianVotes = 0;
  let standardVotes = 0;

  for (const raw of cells) {
    const text = raw
      .trim()
      .replace(/^[+\-($€£₹¥Rs.\s]+/iu, '')
      .replace(/[)\-crdr\s]+$/iu, '');
    if (!text) continue;

    if (
      /^\d{1,3}(\.\d{3})*,\d{2}$/u.test(text) ||
      (/,\d{2}$/u.test(text) && !text.includes('.'))
    ) {
      europeanVotes += 2;
    }

    if (
      /^\d{1,2}(,\d{2})+,\d{3}\.\d{2}$/u.test(text) ||
      /^\d{1,2},\d{2},\d{3}/u.test(text)
    ) {
      indianVotes += 3;
    }

    if (
      /^\d{1,3}(,\d{3})*\.\d{2}$/u.test(text) ||
      (/\.\d{2}$/u.test(text) && !text.includes(','))
    ) {
      standardVotes += 2;
    }
  }

  if (indianVotes > standardVotes && indianVotes > europeanVotes) {
    return 'indian-lakh';
  }
  if (europeanVotes > standardVotes) return 'european';
  return 'standard-us';
}

const DEBIT_MARKER = /(?<![a-z])dr(?![a-z])/iu;
const CREDIT_MARKER = /(?<![a-z])cr(?![a-z])/iu;
const MARKER_WORDS =
  /(?<![a-z])(Rs\.?|INR|USD|EUR|GBP|dr\.?|cr\.?)(?![a-z])/giu;

/** Kept byte-for-byte equivalent to the statement-value engine. */
export function parseAmount(
  text: string,
  convention: NumberConvention = 'standard-us',
): ParsedAmount {
  const raw = text.trim();
  if (!raw) {
    return { raw, value: null, isDebit: false, isCredit: false };
  }

  let currency: string | undefined;
  for (const [symbol, code] of Object.entries(CURRENCY_SYMBOLS)) {
    if (raw.includes(symbol)) {
      currency = code;
      break;
    }
  }

  const hasParentheses = raw.startsWith('(') && raw.endsWith(')');
  const hasLeadingMinus = raw.startsWith('-');
  const hasTrailingMinus = raw.endsWith('-');
  const hasDr = DEBIT_MARKER.test(raw);
  const hasCr = CREDIT_MARKER.test(raw);
  const isNegative =
    hasParentheses || hasLeadingMinus || hasTrailingMinus || hasDr;

  let numericPart = raw
    .replace(/[$€£₹¥]/gu, '')
    .replace(MARKER_WORDS, '')
    .replace(/[-+\s()]/gu, '');

  if (!numericPart) {
    return { raw, value: null, currency, isDebit: false, isCredit: false };
  }

  let numValue: number | null = null;
  if (convention === 'european') {
    numericPart = numericPart.replace(/\./gu, '').replace(/,/gu, '.');
    const parsed = Number.parseFloat(numericPart);
    if (!Number.isNaN(parsed)) {
      numValue = isNegative ? -Math.abs(parsed) : Math.abs(parsed);
    }
  } else {
    numericPart = numericPart.replace(/,/gu, '');
    const parsed = Number.parseFloat(numericPart);
    if (!Number.isNaN(parsed)) {
      numValue = isNegative ? -Math.abs(parsed) : Math.abs(parsed);
    }
  }

  return {
    raw,
    value: numValue,
    currency,
    isDebit: hasDr || (numValue !== null && numValue < 0),
    isCredit: hasCr || (numValue !== null && numValue > 0),
  };
}

function decodeBytes(bytes: Uint8Array, label = 'utf-8'): string {
  if (bytes.length === 0) {
    throw new FinanceFormatError(
      'UNSUPPORTED_FORMAT',
      'The finance document is empty.',
    );
  }
  try {
    return new TextDecoder(label, { fatal: true })
      .decode(bytes)
      .replace(/^\uFEFF/u, '');
  } catch {
    throw new FinanceFormatError(
      'INVALID_ENCODING',
      'The finance document uses an invalid or unsupported text encoding.',
    );
  }
}

function decodeOfx(bytes: Uint8Array): string {
  const headerProbe = new TextDecoder('windows-1252').decode(
    bytes.subarray(0, Math.min(bytes.length, 2048)),
  );
  const encoding = /(?:^|\r?\n)ENCODING\s*:\s*([^\r\n]+)/iu
    .exec(headerProbe)?.[1]
    ?.trim()
    .toUpperCase();
  const charset = /(?:^|\r?\n)CHARSET\s*:\s*([^\r\n]+)/iu
    .exec(headerProbe)?.[1]
    ?.trim()
    .toUpperCase();
  const label =
    encoding === 'UNICODE' || encoding === 'UTF-8' || charset === 'UTF-8'
      ? 'utf-8'
      : encoding === 'USASCII' || charset === '1252'
        ? 'windows-1252'
        : 'utf-8';
  return decodeBytes(bytes, label);
}

function decodeEntities(value: string): string {
  return value.replace(
    /&(?:amp|lt|gt|quot|apos|#\d+|#x[\da-f]+);/giu,
    (entity) => {
      const lower = entity.toLowerCase();
      if (lower === '&amp;') return '&';
      if (lower === '&lt;') return '<';
      if (lower === '&gt;') return '>';
      if (lower === '&quot;') return '"';
      if (lower === '&apos;') return "'";
      const hexadecimal = lower.startsWith('&#x');
      const digits = entity.slice(hexadecimal ? 3 : 2, -1);
      const point = Number.parseInt(digits, hexadecimal ? 16 : 10);
      return Number.isSafeInteger(point) && point >= 0 && point <= 0x10ffff
        ? String.fromCodePoint(point)
        : entity;
    },
  );
}

function openTagEnd(source: string, tag: string, start = 0): number {
  const upper = source.toUpperCase();
  const needle = `<${tag.toUpperCase()}`;
  let position = start;
  while ((position = upper.indexOf(needle, position)) >= 0) {
    const boundary = upper[position + needle.length];
    if (boundary === '>' || /\s/u.test(boundary ?? '')) {
      return source.indexOf('>', position);
    }
    position += needle.length;
  }
  return -1;
}

function extractBlocks(source: string, tag: string): string[] {
  const blocks: string[] = [];
  const upper = source.toUpperCase();
  const closing = `</${tag.toUpperCase()}>`;
  let offset = 0;
  while (offset < source.length) {
    const openEnd = openTagEnd(source, tag, offset);
    if (openEnd < 0) break;
    const closeStart = upper.indexOf(closing, openEnd + 1);
    if (closeStart < 0) break;
    blocks.push(source.slice(openEnd + 1, closeStart));
    offset = closeStart + closing.length;
  }
  return blocks;
}

function countOpeningTags(source: string, tag: string): number {
  const upper = source.toUpperCase();
  const needle = `<${tag.toUpperCase()}`;
  let count = 0;
  let offset = 0;
  while (offset < source.length) {
    const position = upper.indexOf(needle, offset);
    if (position < 0) break;
    const boundary = upper[position + needle.length];
    if (boundary === '>' || /\s/u.test(boundary ?? '')) count += 1;
    offset = position + needle.length;
  }
  return count;
}

function readTag(source: string, tag: string): string | undefined {
  const openEnd = openTagEnd(source, tag);
  if (openEnd < 0) return;
  const upper = source.toUpperCase();
  const close = `</${tag.toUpperCase()}>`;
  const closeStart = upper.indexOf(close, openEnd + 1);
  const nextTag = source.indexOf('<', openEnd + 1);
  const end =
    closeStart >= 0 && (nextTag < 0 || closeStart === nextTag)
      ? closeStart
      : nextTag >= 0
        ? nextTag
        : source.length;
  return decodeEntities(source.slice(openEnd + 1, end).trim());
}

function requireAmount(raw: string | undefined, context: string): number {
  if (raw === undefined) {
    throw new FinanceFormatError(
      'INVALID_AMOUNT',
      `The ${context} is missing its amount.`,
    );
  }
  const value = parseAmount(raw).value;
  if (value === null || !Number.isFinite(value)) {
    throw new FinanceFormatError(
      'INVALID_AMOUNT',
      `The ${context} contains an invalid amount.`,
    );
  }
  return value;
}

function optionalBalance(block: string | undefined): number | null {
  if (!block) return null;
  const raw = readTag(block, 'BALAMT');
  return raw === undefined ? null : requireAmount(raw, 'balance');
}

function ofxDate(raw: string | undefined): string | undefined {
  if (!raw) return;
  const match = /^(\d{4})(\d{2})(\d{2})/u.exec(raw.trim());
  if (!match) return raw.trim();
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return raw.trim();
  }
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function validateDeclaredLength(text: string, bytes: Uint8Array): void {
  const declaredText = /(?:^|\r?\n)CONTENT-LENGTH\s*:\s*(\d+)/iu.exec(
    text,
  )?.[1];
  if (!declaredText) return;
  const separator = /\r?\n\r?\n/u.exec(text);
  const payloadStart = separator
    ? (separator.index ?? 0) + separator[0].length
    : text.indexOf('<OFX');
  const prefix = payloadStart > 0 ? text.slice(0, payloadStart) : '';
  const available = bytes.length - new TextEncoder().encode(prefix).length;
  if (Number(declaredText) > available) {
    throw new FinanceFormatError(
      'DECLARED_LENGTH_EXCEEDS_BUFFER',
      'The declared payload length exceeds the available bytes.',
    );
  }
}

function malformedOfx(message: string): never {
  throw new FinanceFormatError('MALFORMED_OFX', message);
}

export async function parseOfx(bytes: Uint8Array): Promise<FinanceParseResult> {
  const text = decodeOfx(bytes);
  validateDeclaredLength(text, bytes);
  if (
    !/(?:^|\r?\n)OFXHEADER\s*:/iu.test(text) &&
    !/<(?:\?xml|\?OFX|OFX[\s>])/iu.test(text)
  ) {
    throw new FinanceFormatError(
      'UNSUPPORTED_FORMAT',
      'The document is not an OFX file.',
    );
  }
  const ofxOpen = openTagEnd(text, 'OFX');
  const ofxClose = text.toUpperCase().lastIndexOf('</OFX>');
  if (ofxOpen < 0 || ofxClose < ofxOpen) {
    malformedOfx('The OFX root aggregate is incomplete.');
  }

  const body = text.slice(ofxOpen + 1, ofxClose);
  const statementBlocks = [
    ...extractBlocks(body, 'STMTRS'),
    ...extractBlocks(body, 'CCSTMTRS'),
  ];
  if (statementBlocks.length === 0) {
    malformedOfx('The OFX document contains no supported statement aggregate.');
  }

  const accounts: FinanceAccount[] = [];
  const transactions: FinanceTransaction[] = [];
  for (const [accountIndex, statement] of statementBlocks.entries()) {
    const bankAccount = extractBlocks(statement, 'BANKACCTFROM')[0];
    const cardAccount = extractBlocks(statement, 'CCACCTFROM')[0];
    const accountBlock = bankAccount ?? cardAccount;
    if (!accountBlock)
      malformedOfx('A statement account aggregate is missing.');
    const accountId = readTag(accountBlock, 'ACCTID');
    if (!accountId) malformedOfx('A statement account identifier is missing.');

    const currency = readTag(statement, 'CURDEF');
    const transactionList = extractBlocks(statement, 'BANKTRANLIST')[0];
    const transactionBlocks = transactionList
      ? extractBlocks(transactionList, 'STMTTRN')
      : [];
    if (
      transactionList &&
      countOpeningTags(transactionList, 'STMTTRN') !== transactionBlocks.length
    ) {
      malformedOfx('A statement transaction aggregate is incomplete.');
    }

    for (const transaction of transactionBlocks) {
      const rawAmount = readTag(transaction, 'TRNAMT');
      transactions.push({
        accountId,
        type: readTag(transaction, 'TRNTYPE'),
        date: ofxDate(readTag(transaction, 'DTPOSTED')) ?? null,
        amount: requireAmount(rawAmount, 'transaction'),
        rawAmount: rawAmount!,
        ...(currency ? { currency } : {}),
        ...(readTag(transaction, 'FITID')
          ? { id: readTag(transaction, 'FITID') }
          : {}),
        ...(readTag(transaction, 'CHECKNUM')
          ? { reference: readTag(transaction, 'CHECKNUM') }
          : {}),
        ...(readTag(transaction, 'NAME')
          ? { payee: readTag(transaction, 'NAME') }
          : {}),
        ...(readTag(transaction, 'MEMO')
          ? { memo: readTag(transaction, 'MEMO') }
          : {}),
      });
    }

    const ledger = extractBlocks(statement, 'LEDGERBAL')[0];
    const opening = extractBlocks(statement, 'OPENINGBAL')[0];
    accounts.push({
      id: accountId,
      type: bankAccount
        ? (readTag(accountBlock, 'ACCTTYPE') ?? 'BANK')
        : 'CREDITCARD',
      ...(currency ? { currency } : {}),
      ...(readTag(accountBlock, 'BANKID')
        ? { bankId: readTag(accountBlock, 'BANKID') }
        : {}),
      ...(transactionList && readTag(transactionList, 'DTSTART')
        ? {
            statementStart: ofxDate(readTag(transactionList, 'DTSTART'))!,
          }
        : {}),
      ...(transactionList && readTag(transactionList, 'DTEND')
        ? { statementEnd: ofxDate(readTag(transactionList, 'DTEND'))! }
        : {}),
      openingBalance: optionalBalance(opening),
      closingBalance: optionalBalance(ledger),
    });

    if (accountIndex > 10_000) {
      malformedOfx('The OFX document contains too many statement aggregates.');
    }
  }

  const version =
    /(?:^|\r?\n)VERSION\s*:\s*([^\r\n]+)/iu.exec(text)?.[1]?.trim() ??
    /<\?OFX\b[^>]*\bVERSION\s*=\s*["']?([^\s"'?>]+)/iu.exec(text)?.[1];
  return {
    format: 'ofx',
    ...(version ? { version } : {}),
    accounts,
    transactions,
    openingBalance: accounts.length === 1 ? accounts[0]!.openingBalance : null,
    closingBalance: accounts.length === 1 ? accounts[0]!.closingBalance : null,
  };
}

type QifFields = Map<string, string[]>;

function qifField(fields: QifFields, key: string): string | undefined {
  return fields.get(key)?.[0];
}

function malformedQif(message: string): never {
  throw new FinanceFormatError('MALFORMED_QIF', message);
}

function qifAccount(
  fields: QifFields,
  convention: NumberConvention,
  index: number,
): FinanceAccount {
  const name = qifField(fields, 'N')?.trim();
  const rawBalance = qifField(fields, '$');
  const parsedBalance = rawBalance
    ? parseAmount(rawBalance, convention).value
    : null;
  if (rawBalance && parsedBalance === null) {
    throw new FinanceFormatError(
      'INVALID_AMOUNT',
      'A QIF account contains an invalid statement balance.',
    );
  }
  return {
    id: name || `qif-account-${index + 1}`,
    ...(name ? { name } : {}),
    ...(qifField(fields, 'T') ? { type: qifField(fields, 'T') } : {}),
    ...(qifField(fields, 'D') ? { description: qifField(fields, 'D') } : {}),
    ...(qifField(fields, '/') ? { statementEnd: qifField(fields, '/') } : {}),
    openingBalance: null,
    closingBalance: parsedBalance,
  };
}

function qifSplits(
  fields: QifFields,
  convention: NumberConvention,
): FinanceSplit[] | undefined {
  const categories = fields.get('S') ?? [];
  const memos = fields.get('E') ?? [];
  const amounts = fields.get('$') ?? [];
  const count = Math.max(categories.length, memos.length, amounts.length);
  if (count === 0) return;
  return Array.from({ length: count }, (_, index) => {
    const raw = amounts[index];
    return {
      ...(categories[index] ? { category: categories[index] } : {}),
      ...(memos[index] ? { memo: memos[index] } : {}),
      amount: raw ? parseAmount(raw, convention).value : null,
    };
  });
}

export async function parseQif(bytes: Uint8Array): Promise<FinanceParseResult> {
  const text = decodeBytes(bytes);
  const lines = text.replace(/\r\n?/gu, '\n').split('\n');
  if (!lines.some((line) => line.startsWith('!'))) {
    throw new FinanceFormatError(
      'UNSUPPORTED_FORMAT',
      'The document is not a QIF file.',
    );
  }

  type Mode = 'account' | 'transactions' | 'ignored';
  let mode: Mode | undefined;
  let transactionType: string | undefined;
  let record: QifFields | undefined;
  let activeAccountId: string | undefined;
  const accountRecords: QifFields[] = [];
  const transactionRecords: { accountId?: string; fields: QifFields }[] = [];

  const finishRecord = () => {
    if (!record || !mode) malformedQif('A QIF record terminator is misplaced.');
    if (mode === 'account') {
      accountRecords.push(record);
      activeAccountId = qifField(record, 'N')?.trim() || activeAccountId;
    } else if (mode === 'transactions') {
      transactionRecords.push({
        ...(activeAccountId ? { accountId: activeAccountId } : {}),
        fields: record,
      });
    }
    record = undefined;
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line) continue;
    if (line.startsWith('!')) {
      if (record) malformedQif('A QIF record is missing its terminator.');
      if (line.toLowerCase() === '!account') {
        mode = 'account';
      } else if (line.toLowerCase().startsWith('!type:')) {
        transactionType = line.slice(line.indexOf(':') + 1).trim();
        mode = /^(?:bank|cash|ccard|invst|oth\s+[al])$/iu.test(transactionType)
          ? 'transactions'
          : 'ignored';
      } else if (!line.toLowerCase().startsWith('!option:')) {
        mode = 'ignored';
      }
      continue;
    }
    if (line === '^') {
      finishRecord();
      continue;
    }
    if (!mode) malformedQif('QIF data appears before a section header.');
    record ??= new Map<string, string[]>();
    const key = line[0]!;
    const value = line.slice(1);
    const existing = record.get(key);
    if (existing) existing.push(value);
    else record.set(key, [value]);
  }
  if (record) malformedQif('A QIF record is missing its terminator.');
  if (accountRecords.length === 0 && transactionRecords.length === 0) {
    malformedQif(
      'The QIF document contains no account or transaction records.',
    );
  }

  const accountBalanceStrings = accountRecords.flatMap(
    (fields) => fields.get('$') ?? [],
  );
  const transactionAmountStrings = transactionRecords.flatMap(({ fields }) => {
    const amount = qifField(fields, 'U') ?? qifField(fields, 'T');
    return amount ? [amount] : [];
  });
  const balanceConvention = detectNumberConvention(accountBalanceStrings);
  const amountConvention = detectNumberConvention(transactionAmountStrings);
  const accounts = accountRecords.map((fields, index) =>
    qifAccount(fields, balanceConvention, index),
  );

  if (accounts.length === 0) {
    accounts.push({
      id: 'qif-account-1',
      ...(transactionType ? { type: transactionType } : {}),
      openingBalance: null,
      closingBalance: null,
    });
  }
  const accountIds = new Set(accounts.map((account) => account.id));
  const fallbackAccountId = accounts[0]!.id;
  const transactions = transactionRecords.map(({ accountId, fields }) => {
    const rawAmount = qifField(fields, 'U') ?? qifField(fields, 'T');
    const amount = rawAmount
      ? parseAmount(rawAmount, amountConvention).value
      : null;
    if (amount === null || !Number.isFinite(amount)) {
      throw new FinanceFormatError(
        'INVALID_AMOUNT',
        'A QIF transaction contains an invalid amount.',
      );
    }
    const resolvedAccountId =
      accountId && accountIds.has(accountId) ? accountId : fallbackAccountId;
    const splits = qifSplits(fields, amountConvention);
    return {
      accountId: resolvedAccountId,
      ...(transactionType ? { type: transactionType } : {}),
      date: qifField(fields, 'D') ?? null,
      amount,
      rawAmount: rawAmount!,
      ...(qifField(fields, 'N') ? { reference: qifField(fields, 'N') } : {}),
      ...(qifField(fields, 'P') ? { payee: qifField(fields, 'P') } : {}),
      ...(qifField(fields, 'M') ? { memo: qifField(fields, 'M') } : {}),
      ...(qifField(fields, 'L') ? { category: qifField(fields, 'L') } : {}),
      ...(qifField(fields, 'C') ? { cleared: qifField(fields, 'C') } : {}),
      ...(splits ? { splits } : {}),
    } satisfies FinanceTransaction;
  });

  return {
    format: 'qif',
    accounts,
    transactions,
    openingBalance: accounts.length === 1 ? accounts[0]!.openingBalance : null,
    closingBalance: accounts.length === 1 ? accounts[0]!.closingBalance : null,
  };
}

export async function parseFinance(
  bytes: Uint8Array,
): Promise<FinanceParseResult> {
  const probe = new TextDecoder('windows-1252')
    .decode(bytes.subarray(0, Math.min(bytes.length, 1024)))
    .replace(/^\uFEFF/u, '')
    .trimStart();
  if (/^(?:OFXHEADER\s*:|<\?xml|<\?OFX|<OFX[\s>])/iu.test(probe)) {
    return parseOfx(bytes);
  }
  if (probe.startsWith('!')) return parseQif(bytes);
  throw new FinanceFormatError(
    'UNSUPPORTED_FORMAT',
    'The document is not a supported OFX or QIF file.',
  );
}

interface ExactDecimal {
  coefficient: bigint;
  scale: number;
}

function exactDecimal(value: number): ExactDecimal {
  if (!Number.isFinite(value)) {
    throw new FinanceFormatError(
      'INVALID_AMOUNT',
      'Reconciliation values must be finite numbers.',
    );
  }
  const text = value.toString().toLowerCase();
  const [mantissa, exponentText = '0'] = text.split('e');
  const exponent = Number(exponentText);
  const negative = mantissa!.startsWith('-');
  const unsigned = negative ? mantissa!.slice(1) : mantissa!;
  const [whole, fraction = ''] = unsigned.split('.');
  let coefficient = BigInt(`${negative ? '-' : ''}${whole}${fraction}`);
  let scale = fraction.length - exponent;
  if (scale < 0) {
    coefficient *= BigInt(10) ** BigInt(-scale);
    scale = 0;
  }
  return { coefficient, scale };
}

function scaled(decimal: ExactDecimal, scale: number): bigint {
  return decimal.coefficient * BigInt(10) ** BigInt(scale - decimal.scale);
}

export function reconcile(input: ReconcileInput): ReconcileResult {
  if (input.opening === null) {
    return {
      balanced: false,
      delta: null,
      reason: 'no-opening-balance',
    };
  }
  const values = [
    input.opening,
    ...input.transactions.map((item) =>
      typeof item === 'number' ? item : item.amount,
    ),
    input.closing,
  ];
  const decimals = values.map(exactDecimal);
  const scale = Math.max(...decimals.map((decimal) => decimal.scale));
  const opening = scaled(decimals[0]!, scale);
  const closing = scaled(decimals.at(-1)!, scale);
  const transactionTotal = decimals
    .slice(1, -1)
    .reduce((sum, decimal) => sum + scaled(decimal, scale), BigInt(0));
  const delta = closing - opening - transactionTotal;
  const numericDelta = Number(delta) / 10 ** scale;
  return {
    balanced: delta === BigInt(0),
    delta: Object.is(numericDelta, -0) ? 0 : numericDelta,
  };
}
