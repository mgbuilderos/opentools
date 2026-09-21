import { csvToRecords } from './structured';
import {
  emitCsv,
  parseCsv,
  emitJsonTable,
  parseJsonTable,
  emitSqlTable,
  emitMarkdownTable,
  parseMarkdownTable,
} from './notation/table';

export interface SpreadsheetField {
  id: string;
  label: string;
  type: 'number' | 'text' | 'textarea' | 'select';
  defaultValue: string;
  placeholder?: string;
  options?: readonly { value: string; label: string }[];
}

export interface SpreadsheetOperation {
  id: string;
  name: string;
  description: string;
  fields: readonly SpreadsheetField[];
}

const sampleCsv =
  'name,team,score,date\nAda,Blue,91,2026-01-05\nLin,Red,84,2026-01-06\nMina,Blue,91,2026-01-07';
const secondCsv = 'name,city\nAda,London\nLin,Singapore\nMina,Mumbai';

const area = (
  id: string,
  label: string,
  defaultValue: string,
): SpreadsheetField => ({ id, label, type: 'textarea', defaultValue });
const text = (
  id: string,
  label: string,
  defaultValue: string,
): SpreadsheetField => ({ id, label, type: 'text', defaultValue });
const number = (
  id: string,
  label: string,
  defaultValue: string,
): SpreadsheetField => ({ id, label, type: 'number', defaultValue });
const select = (
  id: string,
  label: string,
  options: readonly { value: string; label: string }[],
): SpreadsheetField => ({
  id,
  label,
  type: 'select',
  defaultValue: options[0]?.value ?? '',
  options,
});
const csv = () => area('input', 'CSV data', sampleCsv);
const second = () => area('second', 'Second CSV data', secondCsv);

export const SPREADSHEET_OPERATIONS: readonly SpreadsheetOperation[] = [
  {
    id: 'csv-viewer',
    name: 'CSV viewer',
    description:
      'Parse strict header-based CSV and show a tab-separated table preview.',
    fields: [csv()],
  },
  {
    id: 'csv-editor',
    name: 'CSV editor',
    description:
      'Edit in the input panel, then validate and normalize quoted CSV output.',
    fields: [csv()],
  },
  {
    id: 'csv-cleaner',
    name: 'CSV cleaner',
    description:
      'Trim headers and cells, then remove completely blank records.',
    fields: [csv()],
  },
  {
    id: 'csv-sorter',
    name: 'CSV sorter',
    description: 'Stable-sort rows by a named column as text or numbers.',
    fields: [
      csv(),
      text('column', 'Column', 'score'),
      select('mode', 'Comparison', [
        { value: 'number-desc', label: 'Number, descending' },
        { value: 'number-asc', label: 'Number, ascending' },
        { value: 'text-asc', label: 'Text, A–Z' },
        { value: 'text-desc', label: 'Text, Z–A' },
      ]),
    ],
  },
  {
    id: 'csv-filter',
    name: 'CSV filter',
    description:
      'Keep rows whose selected column matches a simple bounded condition.',
    fields: [
      csv(),
      text('column', 'Column', 'team'),
      select('operator', 'Condition', [
        { value: 'equals', label: 'Equals' },
        { value: 'contains', label: 'Contains' },
        { value: 'starts', label: 'Starts with' },
        { value: 'greater', label: 'Number greater than' },
        { value: 'less', label: 'Number less than' },
      ]),
      text('value', 'Value', 'Blue'),
    ],
  },
  {
    id: 'csv-column-selector',
    name: 'CSV column selector',
    description: 'Keep and order a comma-separated selection of columns.',
    fields: [csv(), text('columns', 'Columns', 'name,score')],
  },
  {
    id: 'csv-column-renamer',
    name: 'CSV column renamer',
    description:
      'Rename headers with old=new pairs while preventing duplicates.',
    fields: [
      csv(),
      area('renames', 'old=new, one per line', 'name=person\nscore=points'),
    ],
  },
  {
    id: 'csv-deduplicator',
    name: 'CSV deduplicator',
    description:
      'Remove later duplicate rows using selected key columns or the full row.',
    fields: [csv(), text('columns', 'Key columns (blank = all)', 'score')],
  },
  {
    id: 'csv-merger',
    name: 'CSV merger',
    description: 'Append two CSV datasets with the same headers.',
    fields: [
      csv(),
      area(
        'second',
        'Second CSV data',
        'name,team,score,date\nNoor,Green,76,2026-01-08',
      ),
    ],
  },
  {
    id: 'csv-splitter',
    name: 'CSV splitter',
    description:
      'Split rows into separately labelled CSV parts with repeated headers.',
    fields: [csv(), number('size', 'Rows per part', '2')],
  },
  {
    id: 'csv-transposer',
    name: 'CSV transposer',
    description: 'Swap rows and columns in a bounded rectangular CSV table.',
    fields: [csv()],
  },
  {
    id: 'csv-pivot-table',
    name: 'CSV pivot table',
    description:
      'Create a sum or count pivot from row, column, and value fields.',
    fields: [
      csv(),
      text('row', 'Row field', 'team'),
      text('column', 'Column field', 'date'),
      text('value', 'Value field', 'score'),
      select('aggregate', 'Aggregate', [
        { value: 'sum', label: 'Sum' },
        { value: 'count', label: 'Count' },
      ]),
    ],
  },
  {
    id: 'csv-group-by',
    name: 'CSV group by',
    description: 'Group by one column and calculate row count or numeric sum.',
    fields: [
      csv(),
      text('group', 'Group column', 'team'),
      text('value', 'Numeric column', 'score'),
      select('aggregate', 'Aggregate', [
        { value: 'count', label: 'Count' },
        { value: 'sum', label: 'Sum' },
        { value: 'average', label: 'Average' },
      ]),
    ],
  },
  {
    id: 'csv-join',
    name: 'CSV join',
    description:
      'Inner- or left-join two CSV datasets using named key columns.',
    fields: [
      csv(),
      second(),
      text('leftKey', 'First key', 'name'),
      text('rightKey', 'Second key', 'name'),
      select('join', 'Join type', [
        { value: 'left', label: 'Left join' },
        { value: 'inner', label: 'Inner join' },
      ]),
    ],
  },
  {
    id: 'csv-diff',
    name: 'CSV diff',
    description:
      'Compare two datasets by a key and report added, removed, and changed rows.',
    fields: [
      csv(),
      area(
        'second',
        'Second CSV data',
        'name,team,score,date\nAda,Blue,92,2026-01-05\nLin,Red,84,2026-01-06\nNoor,Green,76,2026-01-08',
      ),
      text('key', 'Unique key column', 'name'),
    ],
  },
  {
    id: 'csv-schema-inferer',
    name: 'CSV schema inferer',
    description:
      'Infer conservative boolean, integer, number, ISO-date, or text column types.',
    fields: [csv()],
  },
  {
    id: 'csv-type-converter',
    name: 'CSV type converter',
    description:
      'Normalize one column to trimmed text, number, boolean, or ISO date.',
    fields: [
      csv(),
      text('column', 'Column', 'score'),
      select('type', 'Target type', [
        { value: 'number', label: 'Number' },
        { value: 'boolean', label: 'Boolean' },
        { value: 'date', label: 'ISO date' },
        { value: 'text', label: 'Trimmed text' },
      ]),
    ],
  },
  {
    id: 'csv-to-json',
    name: 'CSV to JSON',
    description: 'Convert strict header-based CSV to an array of JSON objects.',
    fields: [csv()],
  },
  {
    id: 'json-to-csv',
    name: 'JSON to CSV',
    description: 'Convert a bounded array of JSON objects to quoted CSV.',
    fields: [
      area(
        'input',
        'JSON array',
        '[{"name":"Ada","score":91},{"name":"Lin","score":84}]',
      ),
    ],
  },
  {
    id: 'csv-to-tsv',
    name: 'CSV to TSV',
    description:
      'Convert CSV to tab-separated values while rejecting tabs/newlines inside cells.',
    fields: [csv()],
  },
  {
    id: 'tsv-to-csv',
    name: 'TSV to CSV',
    description: 'Convert rectangular tab-separated rows to quoted CSV.',
    fields: [area('input', 'TSV data', 'name\tscore\nAda\t91\nLin\t84')],
  },
  {
    id: 'csv-to-sql',
    name: 'CSV to SQL',
    description:
      'Generate escaped SQL INSERT statements with quoted identifiers and text values.',
    fields: [csv(), text('table', 'Table name', 'scores')],
  },
  {
    id: 'spreadsheet-formula-viewer',
    name: 'Spreadsheet formula viewer',
    description:
      'List CSV cells beginning with =; formulas are never evaluated.',
    fields: [area('input', 'CSV data', 'item,total\nA,=2*5\nB,"=SUM(3,4)"')],
  },
  {
    id: 'spreadsheet-cell-inspector',
    name: 'Spreadsheet cell inspector',
    description: 'Inspect one 1-based data row and named column.',
    fields: [
      csv(),
      number('row', 'Data row (1-based)', '2'),
      text('column', 'Column', 'score'),
    ],
  },
  {
    id: 'spreadsheet-duplicate-finder',
    name: 'Spreadsheet duplicate finder',
    description: 'Report duplicate values and row numbers in a chosen column.',
    fields: [csv(), text('column', 'Column', 'score')],
  },
  {
    id: 'spreadsheet-blank-row-remover',
    name: 'Spreadsheet blank-row remover',
    description:
      'Remove physical CSV lines that contain only separators and whitespace.',
    fields: [area('input', 'CSV data', 'name,score\nAda,91\n,\nLin,84')],
  },
  {
    id: 'spreadsheet-data-profiler',
    name: 'Spreadsheet data profiler',
    description:
      'Profile row count, uniqueness, missingness, and inferred type per column.',
    fields: [csv()],
  },
  {
    id: 'vlookup-generator',
    name: 'VLOOKUP generator',
    description:
      'Generate a spreadsheet VLOOKUP formula from explicit cell/range settings.',
    fields: [
      text('lookup', 'Lookup cell', 'A2'),
      text('range', 'Table range', 'Sheet2!A1:D100'),
      number('index', 'Return column index', '3'),
      select('match', 'Match', [
        { value: 'FALSE', label: 'Exact' },
        { value: 'TRUE', label: 'Approximate' },
      ]),
    ],
  },
  {
    id: 'pivot-table-planner',
    name: 'Pivot-table planner',
    description:
      'Validate field choices and produce a concise pivot configuration plan.',
    fields: [
      csv(),
      text('rows', 'Row fields', 'team'),
      text('columns', 'Column fields', 'date'),
      text('values', 'Value fields', 'score'),
      text('filters', 'Filter fields (optional)', ''),
    ],
  },
  {
    id: 'data-sampling-tool',
    name: 'Data sampling tool',
    description: 'Select a bounded random sample without replacement.',
    fields: [csv(), number('size', 'Sample rows', '2')],
  },
  {
    id: 'random-row-selector',
    name: 'Random row selector',
    description: 'Select one complete row using browser randomness.',
    fields: [csv()],
  },
  {
    id: 'column-statistics',
    name: 'Column statistics',
    description:
      'Calculate numeric count, minimum, maximum, mean, median, and population deviation.',
    fields: [csv(), text('column', 'Numeric column', 'score')],
  },
  {
    id: 'missing-value-analyzer',
    name: 'Missing-value analyzer',
    description:
      'Count blank, NA, N/A, null, and undefined markers per column.',
    fields: [area('input', 'CSV data', 'name,score\nAda,91\nLin,NA\n,84')],
  },
  {
    id: 'outlier-detector',
    name: 'Outlier detector',
    description: 'Flag numeric values outside the 1.5×IQR fences.',
    fields: [
      area('input', 'CSV data', 'name,score\nA,10\nB,11\nC,12\nD,13\nE,100'),
      text('column', 'Numeric column', 'score'),
    ],
  },
  {
    id: 'date-column-normalizer',
    name: 'Date-column normalizer',
    description:
      'Normalize one column from ISO, DD/MM/YYYY, or MM/DD/YYYY to YYYY-MM-DD.',
    fields: [
      area('input', 'CSV data', 'name,date\nAda,05/01/2026\nLin,06/01/2026'),
      text('column', 'Date column', 'date'),
      select('format', 'Input format', [
        { value: 'DMY', label: 'DD/MM/YYYY' },
        { value: 'MDY', label: 'MM/DD/YYYY' },
        { value: 'ISO', label: 'YYYY-MM-DD' },
      ]),
    ],
  },
  {
    id: 'phone-column-normalizer',
    name: 'Phone-column normalizer',
    description:
      'Normalize one phone column to +country-and-national-digits form.',
    fields: [
      area(
        'input',
        'CSV data',
        'name,phone\nAda,98765 43210\nLin,+44 20 7946 0958',
      ),
      text('column', 'Phone column', 'phone'),
      text('country', 'Default country calling code', '91'),
    ],
  },
  {
    id: 'address-column-cleaner',
    name: 'Address-column cleaner',
    description:
      'Collapse whitespace and normalize comma spacing in an address column.',
    fields: [
      area('input', 'CSV data', 'name,address\nAda,"12  Main St,  London"'),
      text('column', 'Address column', 'address'),
    ],
  },
  {
    id: 'table-to-markdown',
    name: 'Table to Markdown',
    description: 'Convert CSV into an escaped GitHub-style Markdown table.',
    fields: [csv()],
  },
  {
    id: 'markdown-table-to-csv',
    name: 'Markdown table to CSV',
    description:
      'Convert a simple pipe-delimited Markdown table to quoted CSV.',
    fields: [
      area(
        'input',
        'Markdown table',
        '| Name | Score |\n| --- | ---: |\n| Ada | 91 |\n| Lin | 84 |',
      ),
    ],
  },
] as const;

type Table = ReturnType<typeof csvToRecords>;

function csvCell(value: unknown) {
  const raw =
    typeof value === 'string'
      ? value
      : value == null
        ? ''
        : (JSON.stringify(value) ?? '');
  return /[",\r\n]/u.test(raw) ? `"${raw.replaceAll('"', '""')}"` : raw;
}

function toCsv(headers: string[], rows: Array<Record<string, unknown>>) {
  return [
    headers.map(csvCell).join(','),
    ...rows.map((row) =>
      headers.map((header) => csvCell(row[header])).join(','),
    ),
  ].join('\n');
}

function table(values: Record<string, string>, key = 'input') {
  const value = values[key] ?? '';
  if (value.length > 2_000_000)
    throw new Error('Tabular input is limited to 2,000,000 characters.');
  const parsed = csvToRecords(value);
  if (parsed.rows.length > 100_000 || parsed.headers.length > 1_000)
    throw new Error('Tables are limited to 100,000 rows and 1,000 columns.');
  return parsed;
}

function header(data: Table, name: string) {
  const selected = name.trim();
  if (!data.headers.includes(selected))
    throw new Error(`Unknown column: ${selected || '(blank)'}.`);
  return selected;
}

function integer(
  values: Record<string, string>,
  key: string,
  minimum: number,
  maximum: number,
) {
  const value = Number(values[key]);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum)
    throw new Error(
      `${key} must be a whole number from ${minimum} to ${maximum}.`,
    );
  return value;
}

function selectedHeaders(data: Table, value: string, allowBlank = false) {
  const names = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  if (!names.length && allowBlank) return data.headers;
  if (!names.length) throw new Error('Choose at least one column.');
  for (const name of names) header(data, name);
  if (new Set(names).size !== names.length)
    throw new Error('Column selection contains a duplicate.');
  return names;
}

function numeric(data: Table, column: string) {
  const name = header(data, column);
  const values = data.rows.map((row, index) => {
    const value = Number(row[name]);
    if (!Number.isFinite(value))
      throw new Error(`Row ${index + 1} is not numeric in ${name}.`);
    return value;
  });
  if (!values.length) throw new Error('At least one data row is required.');
  return { name, values };
}

function percentile(sorted: number[], fraction: number) {
  const position = (sorted.length - 1) * fraction;
  const lower = Math.floor(position);
  const remainder = position - lower;
  return (
    sorted[lower] +
    ((sorted[lower + 1] ?? sorted[lower]) - sorted[lower]) * remainder
  );
}

function parseDate(value: string, format: string) {
  const patterns: Record<string, RegExp> = {
    ISO: /^(\d{4})-(\d{2})-(\d{2})$/u,
    DMY: /^(\d{2})\/(\d{2})\/(\d{4})$/u,
    MDY: /^(\d{2})\/(\d{2})\/(\d{4})$/u,
  };
  const match = patterns[format]?.exec(value.trim());
  if (!match) throw new Error(`Date ${value} does not match ${format}.`);
  const [year, month, day] =
    format === 'ISO'
      ? [Number(match[1]), Number(match[2]), Number(match[3])]
      : format === 'DMY'
        ? [Number(match[3]), Number(match[2]), Number(match[1])]
        : [Number(match[3]), Number(match[1]), Number(match[2])];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    throw new Error(`Invalid calendar date: ${value}.`);
  return date.toISOString().slice(0, 10);
}

export function runSpreadsheetOperation(
  operationId: string,
  values: Record<string, string>,
  random: () => number = Math.random,
) {
  switch (operationId) {
    case 'csv-viewer': {
      const data = table(values);
      return [
        data.headers.join('\t'),
        ...data.rows.map((row) =>
          data.headers.map((name) => row[name]).join('\t'),
        ),
      ].join('\n');
    }
    case 'csv-editor': {
      const data = table(values);
      return toCsv(data.headers, data.rows);
    }
    case 'csv-cleaner': {
      const data = table(values);
      const headers = data.headers.map((name) => name.trim());
      if (new Set(headers).size !== headers.length)
        throw new Error('Trimmed headers must remain unique.');
      const rows = data.rows
        .map((row) =>
          Object.fromEntries(
            data.headers.map((name, index) => [
              headers[index],
              row[name].trim(),
            ]),
          ),
        )
        .filter((row) => headers.some((name) => row[name]));
      return toCsv(headers, rows);
    }
    case 'csv-sorter': {
      const data = table(values);
      const column = header(data, values.column);
      const [kind, direction] = values.mode.split('-');
      const sorted = data.rows
        .map((row, index) => ({ row, index }))
        .sort((left, right) => {
          const result =
            kind === 'number'
              ? Number(left.row[column]) - Number(right.row[column])
              : left.row[column].localeCompare(right.row[column], undefined, {
                  numeric: true,
                });
          if (!Number.isFinite(result))
            throw new Error(`Column ${column} contains a non-numeric value.`);
          return (
            (direction === 'desc' ? -result : result) ||
            left.index - right.index
          );
        })
        .map((item) => item.row);
      return toCsv(data.headers, sorted);
    }
    case 'csv-filter': {
      const data = table(values);
      const column = header(data, values.column);
      const needle = values.value;
      const rows = data.rows.filter((row) => {
        const value = row[column];
        if (values.operator === 'equals') return value === needle;
        if (values.operator === 'contains')
          return value.toLocaleLowerCase().includes(needle.toLocaleLowerCase());
        if (values.operator === 'starts')
          return value
            .toLocaleLowerCase()
            .startsWith(needle.toLocaleLowerCase());
        const left = Number(value);
        const right = Number(needle);
        if (!Number.isFinite(left) || !Number.isFinite(right))
          throw new Error('Numeric filters require finite numbers.');
        return values.operator === 'greater' ? left > right : left < right;
      });
      return toCsv(data.headers, rows);
    }
    case 'csv-column-selector': {
      const data = table(values);
      const headers = selectedHeaders(data, values.columns);
      return toCsv(headers, data.rows);
    }
    case 'csv-column-renamer': {
      const data = table(values);
      const renames = Object.fromEntries(
        values.renames
          .split(/\r?\n/gu)
          .filter(Boolean)
          .map((line, index) => {
            const split = line.indexOf('=');
            if (split < 1)
              throw new Error(`Rename line ${index + 1} must use old=new.`);
            const oldName = line.slice(0, split).trim();
            const next = line.slice(split + 1).trim();
            header(data, oldName);
            if (!next) throw new Error('New column names cannot be blank.');
            return [oldName, next];
          }),
      );
      const headers = data.headers.map((name) => renames[name] ?? name);
      if (new Set(headers).size !== headers.length)
        throw new Error('Renamed columns must be unique.');
      const rows = data.rows.map((row) =>
        Object.fromEntries(
          data.headers.map((name, index) => [headers[index], row[name]]),
        ),
      );
      return toCsv(headers, rows);
    }
    case 'csv-deduplicator': {
      const data = table(values);
      const columns = selectedHeaders(data, values.columns, true);
      const seen = new Set<string>();
      const rows = data.rows.filter((row) => {
        const key = JSON.stringify(columns.map((name) => row[name]));
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return toCsv(data.headers, rows);
    }
    case 'csv-merger': {
      const first = table(values);
      const next = table(values, 'second');
      if (first.headers.join('\0') !== next.headers.join('\0'))
        throw new Error(
          'Both CSV inputs must have identical headers and order.',
        );
      return toCsv(first.headers, [...first.rows, ...next.rows]);
    }
    case 'csv-splitter': {
      const data = table(values);
      const size = integer(values, 'size', 1, 100_000);
      const parts: string[] = [];
      for (let index = 0; index < data.rows.length; index += size)
        parts.push(
          `--- part ${parts.length + 1} ---\n${toCsv(data.headers, data.rows.slice(index, index + size))}`,
        );
      return parts.join('\n\n');
    }
    case 'csv-transposer': {
      const data = table(values);
      const matrix = [
        data.headers,
        ...data.rows.map((row) => data.headers.map((name) => row[name])),
      ];
      if (matrix.length * data.headers.length > 1_000_000)
        throw new Error('Transpose is limited to one million cells.');
      const transposed = data.headers.map((_, column) =>
        matrix.map((row) => row[column]),
      );
      return transposed.map((row) => row.map(csvCell).join(',')).join('\n');
    }
    case 'csv-pivot-table': {
      const data = table(values);
      const rowField = header(data, values.row);
      const columnField = header(data, values.column);
      const valueField = header(data, values.value);
      const rowKeys = [...new Set(data.rows.map((row) => row[rowField]))];
      const columnKeys = [...new Set(data.rows.map((row) => row[columnField]))];
      if (rowKeys.length * columnKeys.length > 100_000)
        throw new Error('Pivot output is limited to 100,000 cells.');
      const rows = rowKeys.map((rowKey) =>
        Object.fromEntries([
          ['row', rowKey],
          ...columnKeys.map((columnKey) => {
            const matches = data.rows.filter(
              (row) =>
                row[rowField] === rowKey && row[columnField] === columnKey,
            );
            const amount =
              values.aggregate === 'count'
                ? matches.length
                : matches.reduce((sum, row) => {
                    const value = Number(row[valueField]);
                    if (!Number.isFinite(value))
                      throw new Error(
                        `Pivot value ${row[valueField]} is not numeric.`,
                      );
                    return sum + value;
                  }, 0);
            return [columnKey, amount];
          }),
        ]),
      );
      return toCsv(['row', ...columnKeys], rows);
    }
    case 'csv-group-by': {
      const data = table(values);
      const group = header(data, values.group);
      const value = header(data, values.value);
      const groups = new Map<string, number[]>();
      for (const row of data.rows) {
        const items = groups.get(row[group]) ?? [];
        if (values.aggregate !== 'count') {
          const amount = Number(row[value]);
          if (!Number.isFinite(amount))
            throw new Error(`${value} contains a non-numeric value.`);
          items.push(amount);
        } else items.push(1);
        groups.set(row[group], items);
      }
      const rows = [...groups].map(([key, items]) => ({
        [group]: key,
        [values.aggregate]:
          values.aggregate === 'count'
            ? items.length
            : values.aggregate === 'sum'
              ? items.reduce((sum, item) => sum + item, 0)
              : items.reduce((sum, item) => sum + item, 0) / items.length,
      }));
      return toCsv([group, values.aggregate], rows);
    }
    case 'csv-join': {
      const left = table(values);
      const right = table(values, 'second');
      const leftKey = header(left, values.leftKey);
      const rightKey = header(right, values.rightKey);
      const rightHeaders = right.headers
        .filter((name) => name !== rightKey)
        .map((name) => (left.headers.includes(name) ? `right_${name}` : name));
      const index = new Map<string, typeof right.rows>();
      for (const row of right.rows)
        index.set(row[rightKey], [...(index.get(row[rightKey]) ?? []), row]);
      const rows: Array<Record<string, string>> = [];
      for (const leftRow of left.rows) {
        const matches = index.get(leftRow[leftKey]) ?? [];
        if (!matches.length && values.join === 'left')
          rows.push({
            ...leftRow,
            ...Object.fromEntries(rightHeaders.map((name) => [name, ''])),
          });
        for (const rightRow of matches)
          rows.push({
            ...leftRow,
            ...Object.fromEntries(
              right.headers
                .filter((name) => name !== rightKey)
                .map((name, index) => [rightHeaders[index], rightRow[name]]),
            ),
          });
      }
      return toCsv([...left.headers, ...rightHeaders], rows);
    }
    case 'csv-diff': {
      const first = table(values);
      const next = table(values, 'second');
      const key = header(first, values.key);
      header(next, key);
      const firstMap = new Map(first.rows.map((row) => [row[key], row]));
      const nextMap = new Map(next.rows.map((row) => [row[key], row]));
      if (
        firstMap.size !== first.rows.length ||
        nextMap.size !== next.rows.length
      )
        throw new Error('The diff key must be unique in each input.');
      const added = [...nextMap.keys()].filter((item) => !firstMap.has(item));
      const removed = [...firstMap.keys()].filter((item) => !nextMap.has(item));
      const changed = [...firstMap.keys()].filter(
        (item) =>
          nextMap.has(item) &&
          JSON.stringify(firstMap.get(item)) !==
            JSON.stringify(nextMap.get(item)),
      );
      return JSON.stringify({ added, removed, changed }, null, 2);
    }
    case 'csv-schema-inferer': {
      const data = table(values);
      const missing = /^(?:|na|n\/a|null|undefined)$/iu;
      const type = (items: string[]) => {
        const valuesToTest = items.filter((item) => !missing.test(item.trim()));
        if (!valuesToTest.length) return 'empty';
        if (valuesToTest.every((item) => /^(?:true|false)$/iu.test(item)))
          return 'boolean';
        if (
          valuesToTest.every(
            (item) =>
              /^-?(?:0|[1-9]\d*)$/u.test(item) &&
              Number.isSafeInteger(Number(item)),
          )
        )
          return 'integer';
        if (valuesToTest.every((item) => Number.isFinite(Number(item))))
          return 'number';
        if (
          valuesToTest.every(
            (item) =>
              /^\d{4}-\d{2}-\d{2}$/u.test(item) &&
              !Number.isNaN(Date.parse(`${item}T00:00:00Z`)),
          )
        )
          return 'ISO date';
        return 'text';
      };
      return data.headers
        .map((name) => `${name}: ${type(data.rows.map((row) => row[name]))}`)
        .join('\n');
    }
    case 'csv-type-converter': {
      const data = table(values);
      const column = header(data, values.column);
      const rows = data.rows.map((row, index) => {
        let output = row[column].trim();
        if (values.type === 'number') {
          const parsed = Number(output);
          if (!Number.isFinite(parsed))
            throw new Error(`Row ${index + 1} is not a finite number.`);
          output = String(parsed);
        } else if (values.type === 'boolean') {
          if (/^(?:true|1|yes)$/iu.test(output)) output = 'true';
          else if (/^(?:false|0|no)$/iu.test(output)) output = 'false';
          else throw new Error(`Row ${index + 1} is not a recognized boolean.`);
        } else if (values.type === 'date') output = parseDate(output, 'ISO');
        return { ...row, [column]: output };
      });
      return toCsv(data.headers, rows);
    }
    case 'csv-to-json':
      return emitJsonTable(parseCsv(values.input));
    case 'json-to-csv':
      return emitCsv(parseJsonTable(values.input));
    case 'csv-to-tsv':
      return emitCsv(parseCsv(values.input), '\t');
    case 'tsv-to-csv':
      return emitCsv(parseCsv(values.input, '\t'), ',');
    case 'csv-to-sql': {
      const name = values.table.trim();
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(name))
        throw new Error('Table name must be a simple SQL identifier.');
      return emitSqlTable(parseCsv(values.input), {
        tableName: name,
        includeCreateTable: false,
      });
    }
    case 'spreadsheet-formula-viewer': {
      const data = table(values);
      const found = data.rows.flatMap((row, rowIndex) =>
        data.headers.flatMap((name) =>
          row[name].startsWith('=')
            ? [`Row ${rowIndex + 1}, ${name}: ${row[name]}`]
            : [],
        ),
      );
      return found.length
        ? found.join('\n')
        : 'No leading = formulas found. Formulas were not evaluated.';
    }
    case 'spreadsheet-cell-inspector': {
      const data = table(values);
      const row = integer(values, 'row', 1, data.rows.length);
      const column = header(data, values.column);
      const value = data.rows[row - 1][column];
      return JSON.stringify(
        {
          row,
          column,
          value,
          blank: value === '',
          characters: Array.from(value).length,
          utf8Bytes: new TextEncoder().encode(value).length,
        },
        null,
        2,
      );
    }
    case 'spreadsheet-duplicate-finder': {
      const data = table(values);
      const column = header(data, values.column);
      const occurrences = new Map<string, number[]>();
      data.rows.forEach((row, index) =>
        occurrences.set(row[column], [
          ...(occurrences.get(row[column]) ?? []),
          index + 1,
        ]),
      );
      const duplicates = [...occurrences]
        .filter(([, rows]) => rows.length > 1)
        .map(([value, rows]) => ({ value, rows }));
      return duplicates.length
        ? JSON.stringify(duplicates, null, 2)
        : 'No duplicate values found.';
    }
    case 'spreadsheet-blank-row-remover': {
      const kept = values.input
        .split(/\r?\n/gu)
        .filter(
          (line, index) =>
            index === 0 ||
            line.split(',').some((cell) => cell.trim().replace(/^"|"$/gu, '')),
        )
        .join('\n');
      const data = csvToRecords(kept);
      return toCsv(data.headers, data.rows);
    }
    case 'spreadsheet-data-profiler': {
      const data = table(values);
      const missing = /^(?:|na|n\/a|null|undefined)$/iu;
      return [
        `Rows: ${data.rows.length} · Columns: ${data.headers.length}`,
        ...data.headers.map((name) => {
          const values = data.rows.map((row) => row[name]);
          const missingCount = values.filter((item) =>
            missing.test(item.trim()),
          ).length;
          const unique = new Set(values).size;
          const numericCount = values.filter(
            (item) => item.trim() && Number.isFinite(Number(item)),
          ).length;
          return `${name}: ${unique} unique · ${missingCount} missing · ${numericCount}/${values.length} numeric`;
        }),
      ].join('\n');
    }
    case 'vlookup-generator': {
      if (!/^[A-Za-z]+\d+$/u.test(values.lookup.trim()))
        throw new Error('Lookup cell must look like A2.');
      if (
        !/^(?:'[^']+'|[A-Za-z0-9_]+)?!?\$?[A-Za-z]+\$?\d+:\$?[A-Za-z]+\$?\d+$/u.test(
          values.range.trim(),
        )
      )
        throw new Error('Table range must look like Sheet2!A1:D100.');
      const index = integer(values, 'index', 1, 16_384);
      return `=VLOOKUP(${values.lookup.trim()},${values.range.trim()},${index},${values.match})`;
    }
    case 'pivot-table-planner': {
      const data = table(values);
      const parse = (value: string) =>
        value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
      const rows = parse(values.rows);
      const columns = parse(values.columns);
      const measures = parse(values.values);
      const filters = parse(values.filters);
      for (const name of [...rows, ...columns, ...measures, ...filters])
        header(data, name);
      if (!rows.length || !measures.length)
        throw new Error('Choose at least one row and value field.');
      return `Rows: ${rows.join(', ')}\nColumns: ${columns.join(', ') || '(none)'}\nValues: ${measures.join(', ')}\nFilters: ${filters.join(', ') || '(none)'}\nSource: ${data.rows.length} rows`;
    }
    case 'data-sampling-tool': {
      const data = table(values);
      const size = integer(values, 'size', 1, data.rows.length);
      const rows = [...data.rows];
      for (let index = rows.length - 1; index > 0; index -= 1) {
        const target = Math.floor(
          Math.min(Math.max(random(), 0), 0.999999999999) * (index + 1),
        );
        [rows[index], rows[target]] = [rows[target], rows[index]];
      }
      return toCsv(data.headers, rows.slice(0, size));
    }
    case 'random-row-selector': {
      const data = table(values);
      if (!data.rows.length)
        throw new Error('At least one data row is required.');
      const index = Math.floor(
        Math.min(Math.max(random(), 0), 0.999999999999) * data.rows.length,
      );
      return JSON.stringify(
        { row: index + 1, values: data.rows[index] },
        null,
        2,
      );
    }
    case 'column-statistics': {
      const data = table(values);
      const { name, values: items } = numeric(data, values.column);
      const sorted = [...items].sort((a, b) => a - b);
      const mean = items.reduce((sum, item) => sum + item, 0) / items.length;
      const deviation = Math.sqrt(
        items.reduce((sum, item) => sum + (item - mean) ** 2, 0) / items.length,
      );
      return `${name}\nCount: ${items.length}\nMinimum: ${sorted[0]}\nMaximum: ${sorted.at(-1)}\nMean: ${mean}\nMedian: ${percentile(sorted, 0.5)}\nPopulation standard deviation: ${deviation}`;
    }
    case 'missing-value-analyzer': {
      const data = table(values);
      const missing = /^(?:|na|n\/a|null|undefined)$/iu;
      return data.headers
        .map((name) => {
          const count = data.rows.filter((row) =>
            missing.test(row[name].trim()),
          ).length;
          return `${name}: ${count}/${data.rows.length} missing (${data.rows.length ? ((count / data.rows.length) * 100).toFixed(2) : '0.00'}%)`;
        })
        .join('\n');
    }
    case 'outlier-detector': {
      const data = table(values);
      const { name, values: items } = numeric(data, values.column);
      if (items.length < 4)
        throw new Error('At least four numeric rows are required.');
      const sorted = [...items].sort((a, b) => a - b);
      const q1 = percentile(sorted, 0.25);
      const q3 = percentile(sorted, 0.75);
      const lower = q1 - 1.5 * (q3 - q1);
      const upper = q3 + 1.5 * (q3 - q1);
      const outliers = data.rows
        .map((row, index) => ({ row: index + 1, value: Number(row[name]) }))
        .filter((item) => item.value < lower || item.value > upper);
      return JSON.stringify(
        { q1, q3, lowerFence: lower, upperFence: upper, outliers },
        null,
        2,
      );
    }
    case 'date-column-normalizer': {
      const data = table(values);
      const column = header(data, values.column);
      return toCsv(
        data.headers,
        data.rows.map((row) => ({
          ...row,
          [column]: parseDate(row[column], values.format),
        })),
      );
    }
    case 'phone-column-normalizer': {
      const data = table(values);
      const column = header(data, values.column);
      const country = values.country.replace(/\D/gu, '');
      if (!/^\d{1,3}$/u.test(country))
        throw new Error('Country calling code must contain 1–3 digits.');
      const rows = data.rows.map((row, index) => {
        const original = row[column].trim();
        const hasPlus = original.startsWith('+');
        let digits = original.replace(/\D/gu, '');
        if (!hasPlus) digits = country + digits.replace(/^0+/u, '');
        if (digits.length < 7 || digits.length > 15)
          throw new Error(
            `Row ${index + 1} is outside the 7–15 digit international range.`,
          );
        return { ...row, [column]: `+${digits}` };
      });
      return toCsv(data.headers, rows);
    }
    case 'address-column-cleaner': {
      const data = table(values);
      const column = header(data, values.column);
      return toCsv(
        data.headers,
        data.rows.map((row) => ({
          ...row,
          [column]: row[column]
            .trim()
            .replace(/\s+/gu, ' ')
            .replace(/\s*,\s*/gu, ', '),
        })),
      );
    }
    case 'table-to-markdown':
      return emitMarkdownTable(parseCsv(values.input));
    case 'markdown-table-to-csv':
      return emitCsv(parseMarkdownTable(values.input));
    default:
      throw new Error('Choose a supported spreadsheet or CSV operation.');
  }
}
