import type { JsonEmitOptions, Table } from './types';

export function parseJsonTable(input: string): Table {
  let data: unknown;
  try {
    data = JSON.parse(input);
  } catch (err) {
    throw new Error(`Invalid JSON: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('JSON table input must be a non-empty array.');
  }

  if (Array.isArray(data[0])) {
    // Array of arrays
    const headers = (data[0] as unknown[]).map(String);
    const rows = data.slice(1).map((row) => (row as unknown[]).map(String));
    return {
      headers,
      rows,
    };
  }

  if (typeof data[0] === 'object' && data[0] !== null) {
    // Array of objects
    const headerSet = new Set<string>();
    for (const item of data) {
      if (typeof item === 'object' && item !== null) {
        for (const key of Object.keys(item)) {
          headerSet.add(key);
        }
      }
    }
    const headers = Array.from(headerSet);
    const rows = data.map((item) => {
      const obj = (item ?? {}) as Record<string, unknown>;
      return headers.map((h) => {
        const val = obj[h];
        if (val === null || val === undefined) return '';
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
      });
    });

    return {
      headers,
      rows,
    };
  }

  throw new Error(
    'JSON table input must be an array of objects or an array of row arrays.',
  );
}

export function emitJsonTable(
  table: Table,
  options: JsonEmitOptions = {},
): string {
  const mode = options.mode ?? 'objects';
  const pretty = options.pretty !== false;
  const indent = pretty ? 2 : undefined;

  if (mode === 'arrays') {
    const arr = [table.headers, ...table.rows];
    return JSON.stringify(arr, null, indent);
  }

  const objects = table.rows.map((row) => {
    const obj: Record<string, string> = {};
    for (let i = 0; i < table.headers.length; i++) {
      const header = table.headers[i];
      obj[header] = row[i] ?? '';
    }
    return obj;
  });

  return JSON.stringify(objects, null, indent);
}
