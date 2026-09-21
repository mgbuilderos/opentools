import type { SqlEmitOptions, Table } from './types';

export function emitSqlTable(
  table: Table,
  options: SqlEmitOptions = {},
): string {
  const tableName = options.tableName || 'imported_table';
  const dialect = options.dialect || 'postgresql';
  const includeCreate = options.includeCreateTable !== false;

  const quote = (ident: string) => {
    if (dialect === 'mysql') return `\`${ident.replace(/`/gu, '``')}\``;
    if (dialect === 'mssql') return `[${ident.replace(/\]/gu, ']]')}]`;
    return `"${ident.replace(/"/gu, '""')}"`;
  };

  const escapeValue = (val: string) => {
    if (val === '' || val.toUpperCase() === 'NULL') return 'NULL';
    if (/^-?\d+(?:\.\d+)?$/u.test(val)) return val;
    if (/^(?:true|false)$/iu.test(val)) return val.toUpperCase();
    return `'${val.replace(/'/gu, "''")}'`;
  };

  const inferType = (colIdx: number): string => {
    let hasInt = true;
    let hasFloat = true;
    let hasBool = true;
    let total = 0;

    for (const row of table.rows) {
      const v = row[colIdx]?.trim();
      if (!v || v.toUpperCase() === 'NULL') continue;
      total++;
      if (!/^-?\d+$/u.test(v)) hasInt = false;
      if (!/^-?\d+(?:\.\d+)?$/u.test(v)) hasFloat = false;
      if (!/^(?:true|false)$/iu.test(v)) hasBool = false;
    }

    if (total === 0) return 'TEXT';
    if (hasInt) return dialect === 'postgresql' ? 'INTEGER' : 'INT';
    if (hasFloat) return 'DECIMAL(10, 2)';
    if (hasBool) return dialect === 'sqlite' ? 'INTEGER' : 'BOOLEAN';
    return 'VARCHAR(255)';
  };

  const statements: string[] = [];

  if (includeCreate) {
    const colDefs = table.headers.map((h, i) => {
      return `  ${quote(h)} ${inferType(i)}`;
    });
    statements.push(`CREATE TABLE ${quote(tableName)} (\n${colDefs.join(',\n')}\n);`);
  }

  if (table.rows.length > 0) {
    const cols = table.headers.map(quote).join(', ');
    const valueRows = table.rows.map((row) => {
      const vals = table.headers.map((_, i) => escapeValue(row[i] ?? ''));
      return `  (${vals.join(', ')})`;
    });

    statements.push(
      `INSERT INTO ${quote(tableName)} (${cols}) VALUES\n${valueRows.join(',\n')};`,
    );
  }

  return statements.join('\n\n');
}

export function parseSqlTable(input: string): Table {
  // Parse INSERT INTO table (col1, col2) VALUES (v1, v2), (v3, v4);
  const insertRegex =
    /INSERT\s+INTO\s+["`\[]?\w+["`\]]?\s*\(([^)]+)\)\s*VALUES\s*([\s\S]*?);/giu;
  const match = insertRegex.exec(input);

  if (!match) {
    throw new Error(
      'Could not parse SQL table. Expected INSERT INTO table (columns...) VALUES (...);',
    );
  }

  const rawCols = match[1];
  const rawValues = match[2];

  const headers = rawCols
    .split(',')
    .map((c) => c.trim().replace(/^["`\[]|["`\]]$/gu, ''));

  const rows: string[][] = [];
  const tupleRegex = /\(([^)]+)\)/gu;
  let tupleMatch: RegExpExecArray | null;

  while ((tupleMatch = tupleRegex.exec(rawValues)) !== null) {
    const tupleStr = tupleMatch[1];
    // Split tuple values respecting quotes
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < tupleStr.length; i++) {
      const char = tupleStr[i];
      if (char === "'") {
        if (inQuotes && tupleStr[i + 1] === "'") {
          current += "'";
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        cells.push(cleanSqlCell(current.trim()));
        current = '';
      } else {
        current += char;
      }
    }
    cells.push(cleanSqlCell(current.trim()));
    rows.push(cells);
  }

  return {
    headers,
    rows,
  };
}

function cleanSqlCell(cell: string): string {
  if (cell.toUpperCase() === 'NULL') return '';
  if (cell.startsWith("'") && cell.endsWith("'")) {
    return cell.slice(1, -1).replace(/''/gu, "'");
  }
  return cell;
}
