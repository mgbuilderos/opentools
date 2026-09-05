export type JsonTransformMode = 'pretty' | 'minify' | 'sort';

export class StructuredDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StructuredDataError';
  }
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, sortValue(item)]),
    );
  }
  return value;
}

const jsonNumberPattern = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;

function assertJsonNumbersAreSafe(input: string) {
  let inString = false;
  let escaped = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') {
      inString = true;
      continue;
    }
    if (character !== '-' && (character < '0' || character > '9')) continue;

    jsonNumberPattern.lastIndex = index;
    const match = jsonNumberPattern.exec(input);
    if (!match) continue;
    const token = match[0];
    if (!token.includes('.') && !/[eE]/u.test(token)) {
      const integer = BigInt(token);
      if (
        integer > BigInt(Number.MAX_SAFE_INTEGER) ||
        integer < BigInt(Number.MIN_SAFE_INTEGER)
      ) {
        throw new StructuredDataError(
          `JSON integer ${token} is outside the exact JavaScript range. Quote it as text to preserve every digit.`,
        );
      }
    } else if (!Number.isFinite(Number(token))) {
      throw new StructuredDataError(
        `JSON number ${token} is outside the finite JavaScript range. Quote it as text to preserve it.`,
      );
    }
    index = jsonNumberPattern.lastIndex - 1;
  }
}

export function transformJson(input: string, mode: JsonTransformMode) {
  if (!input.trim())
    throw new StructuredDataError('Paste JSON before running this tool.');

  assertJsonNumbersAreSafe(input);

  let value: unknown;
  try {
    value = JSON.parse(input);
  } catch (error) {
    const detail =
      error instanceof SyntaxError ? error.message : 'Invalid JSON syntax.';
    throw new StructuredDataError(`JSON could not be parsed: ${detail}`);
  }

  const nextValue = mode === 'sort' ? sortValue(value) : value;
  return JSON.stringify(nextValue, null, mode === 'minify' ? 0 : 2);
}

export type CsvResult = {
  headers: string[];
  rows: Array<Record<string, string>>;
};

function parseCsvRows(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (quoted) {
      if (character === '"') {
        if (input[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"' && field.length === 0) {
      quoted = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && input[index + 1] === '\n') index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }

  if (quoted)
    throw new StructuredDataError('CSV contains an unclosed quoted field.');
  row.push(field);
  rows.push(row);

  while (rows.length > 1 && rows.at(-1)?.every((cell) => cell === ''))
    rows.pop();
  return rows;
}

export function csvToRecords(input: string): CsvResult {
  if (!input.trim())
    throw new StructuredDataError('Paste CSV or choose a CSV file first.');
  const parsed = parseCsvRows(input.replace(/^\uFEFF/, ''));
  const headers = parsed[0].map((header) => header.trim());
  if (headers.some((header) => !header)) {
    throw new StructuredDataError(
      'Every CSV column needs a header in the first row.',
    );
  }
  if (new Set(headers).size !== headers.length) {
    throw new StructuredDataError(
      'CSV headers must be unique before conversion.',
    );
  }

  const rows = parsed.slice(1).map((cells, rowIndex) => {
    if (cells.length !== headers.length) {
      throw new StructuredDataError(
        `Row ${rowIndex + 2} has ${cells.length} columns; expected ${headers.length}.`,
      );
    }
    return Object.fromEntries(
      headers.map((header, index) => [header, cells[index]]),
    );
  });

  return { headers, rows };
}

export function csvToJson(input: string) {
  const result = csvToRecords(input);
  return { ...result, json: JSON.stringify(result.rows, null, 2) };
}
