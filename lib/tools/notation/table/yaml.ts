import type { Table } from './types';

/**
 * YAML as a table notation: a sequence of mappings.
 *
 * WHY IT LIVES HERE. Every other format in this folder contributes ONE parser
 * and ONE emitter, and the grid of conversions between them then costs
 * nothing: adding YAML adds twenty pairs (yaml -> the other ten, and the other
 * ten -> yaml) without a single new conversion function. The alternative --
 * writing `csv-to-yaml`, `json-to-yaml`, `yaml-to-json` and the rest by hand --
 * is the N-squared trap twelve of this repo's converters were already built
 * in before `notation/table` existed.
 *
 * WHAT IS AND IS NOT SUPPORTED. A table is rows of scalar cells, so the YAML
 * this reads and writes is the shape a table can survive: a top-level sequence
 * whose entries are mappings of scalar values. Anchors, aliases, tags, nested
 * mappings and block scalars are not a table and are refused by name rather
 * than silently flattened -- a converter that quietly drops structure is worse
 * than one that says it cannot.
 */

/** Scalars YAML would read back as something other than the text written. */
const AMBIGUOUS_PLAIN =
  /^$|^\s|\s$|^[-?:,[\]{}#&*!|>'"%@`]|:\s|\s#|[\n\r\t]|:$/u;

function quoteScalar(value: string): string {
  if (!AMBIGUOUS_PLAIN.test(value)) return value;
  return `"${value
    .replace(/\\/gu, '\\\\')
    .replace(/"/gu, '\\"')
    .replace(/\n/gu, '\\n')
    .replace(/\r/gu, '\\r')
    .replace(/\t/gu, '\\t')}"`;
}

/**
 * A quoted scalar read back to its text. Plain scalars are returned as written
 * with a trailing comment removed, which is the only YAML comment form a
 * single-line scalar can carry.
 */
function unquoteScalar(raw: string): string {
  const value = raw.trim();
  if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
    return value
      .slice(1, -1)
      .replace(/\\n/gu, '\n')
      .replace(/\\r/gu, '\r')
      .replace(/\\t/gu, '\t')
      .replace(/\\"/gu, '"')
      .replace(/\\\\/gu, '\\');
  }
  if (value.startsWith("'") && value.endsWith("'") && value.length >= 2) {
    return value.slice(1, -1).replace(/''/gu, "'");
  }
  const withoutComment = value.replace(/\s+#.*$/u, '').trim();
  return withoutComment === '~' || withoutComment === 'null'
    ? ''
    : withoutComment;
}

export function emitYamlTable(table: Table): string {
  const lines: string[] = [];
  for (const row of table.rows) {
    table.headers.forEach((header, index) => {
      const key = quoteScalar(header);
      const cell = quoteScalar(row[index] ?? '');
      lines.push(`${index === 0 ? '-' : ' '} ${key}: ${cell}`);
    });
  }
  return lines.length > 0
    ? lines.join('\n')
    : `# ${table.headers.map((header) => quoteScalar(header)).join(', ')}\n[]`;
}

/** `  key: value` split at the first colon that is not inside a quoted key. */
function splitEntry(line: string): { key: string; value: string } | undefined {
  let quote = '';
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (quote) {
      if (character === quote) quote = '';
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (
      character === ':' &&
      (index === line.length - 1 || /\s/u.test(line[index + 1]!))
    ) {
      return {
        key: unquoteScalar(line.slice(0, index)),
        value: unquoteScalar(line.slice(index + 1)),
      };
    }
  }
  return undefined;
}

export function parseYamlTable(input: string): Table {
  const text = input.replace(/\r\n?/gu, '\n');
  if (!text.trim()) throw new Error('YAML input is empty.');

  const lines = text
    .split('\n')
    .filter((line) => line.trim() !== '' && !/^\s*#/u.test(line))
    .filter((line) => !/^\s*(?:---|\.\.\.)\s*$/u.test(line));

  if (lines.length === 0) throw new Error('YAML input has no entries.');

  const records: Record<string, string>[] = [];
  const headers: string[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const bullet = /^(\s*)-\s*(.*)$/u.exec(line);
    const body = bullet ? bullet[2] : line;
    if (bullet) records.push({});
    if (body.trim() === '') continue;

    const entry = splitEntry(body);
    if (!entry) {
      throw new Error(
        'YAML tables must be a sequence of mappings, one "key: value" per line.',
      );
    }
    const record = records.at(-1);
    if (!record) {
      throw new Error(
        'YAML tables must start with a sequence entry, written "- key: value".',
      );
    }
    record[entry.key] = entry.value;
    if (!seen.has(entry.key)) {
      seen.add(entry.key);
      headers.push(entry.key);
    }
  }

  if (records.length === 0 || headers.length === 0) {
    throw new Error(
      'YAML tables must be a sequence of mappings, written "- key: value".',
    );
  }

  return {
    headers,
    rows: records.map((record) =>
      headers.map((header) => record[header] ?? ''),
    ),
  };
}
