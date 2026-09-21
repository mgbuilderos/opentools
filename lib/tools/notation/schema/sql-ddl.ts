import type { Schema, SchemaColumn, SchemaRelation, SchemaTable, SqlDialect } from './types';

export function quoteSqlIdentifier(name: string, dialect: SqlDialect): string {
  if (dialect === 'mysql') return `\`${name.replace(/`/gu, '``')}\``;
  if (dialect === 'mssql') return `[${name.replace(/\]/gu, ']]')}]`;
  return `"${name.replace(/"/gu, '""')}"`;
}

export function mapSqlType(type: string, targetDialect: SqlDialect): string {
  const norm = type.trim().toUpperCase();

  // Serial / auto-increment types
  if (/^(?:SERIAL|BIGSERIAL|AUTO_INCREMENT)$/u.test(norm)) {
    if (targetDialect === 'postgresql') return 'SERIAL';
    if (targetDialect === 'mysql') return 'INT AUTO_INCREMENT';
    if (targetDialect === 'sqlite') return 'INTEGER PRIMARY KEY AUTOINCREMENT';
    if (targetDialect === 'mssql') return 'INT IDENTITY(1,1)';
  }

  // Boolean
  if (/^(?:BOOLEAN|BOOL|TINYINT\(1\)|BIT)$/u.test(norm)) {
    if (targetDialect === 'postgresql') return 'BOOLEAN';
    if (targetDialect === 'mysql') return 'TINYINT(1)';
    if (targetDialect === 'sqlite') return 'INTEGER';
    if (targetDialect === 'mssql') return 'BIT';
  }

  // Integer
  if (/^(?:INT|INTEGER|INT4)$/u.test(norm)) {
    return targetDialect === 'sqlite' ? 'INTEGER' : 'INT';
  }

  // Text
  if (/^(?:TEXT|VARCHAR|NVARCHAR|CLOB)/u.test(norm)) {
    if (targetDialect === 'mssql' && norm === 'TEXT') return 'NVARCHAR(MAX)';
    return type;
  }

  // Timestamp / Datetime
  if (/^(?:TIMESTAMP|DATETIME|TIMESTAMPTZ)/u.test(norm)) {
    if (targetDialect === 'sqlite') return 'TEXT';
    if (targetDialect === 'mysql') return 'DATETIME';
    if (targetDialect === 'mssql') return 'DATETIME2';
    return 'TIMESTAMP';
  }

  return type;
}

export function parseSqlDdl(input: string): Schema {
  const tableRegex =
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`\[]?(?:\w+["`\]]?\s*\.\s*["`\[]?)?(\w+)["`\]]?\s*\(([\s\S]*?)\)\s*[^;()]*;/giu;
  const tables: SchemaTable[] = [];
  const relations: SchemaRelation[] = [];

  let match: RegExpExecArray | null;
  while ((match = tableRegex.exec(input)) !== null) {
    const tableName = match[1];
    const body = match[2];

    // Depth-aware comma split
    const definitions: string[] = [];
    let depth = 0;
    let current = '';
    for (const char of body) {
      if (char === '(') depth++;
      else if (char === ')') depth--;

      if (char === ',' && depth === 0) {
        if (current.trim()) definitions.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    if (current.trim()) definitions.push(current.trim());

    const tablePks = new Set<string>();
    const tableFks = new Map<string, { targetTable: string; targetCol: string }>();
    const columns: SchemaColumn[] = [];

    // First pass: table-level constraints
    for (const def of definitions) {
      const clean = def.replace(/,\s*$/u, '').trim();
      const pkMatch = /^PRIMARY\s+KEY\s*\(([^)]+)\)/iu.exec(clean);
      if (pkMatch) {
        pkMatch[1]
          .split(',')
          .map((c) => c.trim().replace(/^["`\[]|["`\]]$/gu, ''))
          .forEach((c) => tablePks.add(c));
        continue;
      }

      const fkMatch =
        /^FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+["`\[]?(\w+)["`\]]?\s*\(([^)]+)\)/iu.exec(
          clean,
        );
      if (fkMatch) {
        const fromCol = fkMatch[1].trim().replace(/^["`\[]|["`\]]$/gu, '');
        const targetTable = fkMatch[2].trim();
        const targetCol = fkMatch[3].trim().replace(/^["`\[]|["`\]]$/gu, '');
        tableFks.set(fromCol, { targetTable, targetCol });
        continue;
      }
    }

    // Second pass: columns and inline constraints
    for (const def of definitions) {
      const clean = def.replace(/,\s*$/u, '').trim();
      if (/^(?:PRIMARY|FOREIGN|CONSTRAINT|KEY|CHECK|UNIQUE\s*\()/iu.test(clean)) {
        continue;
      }

      const colMatch =
        /^["`\[]?(\w+)["`\]]?\s+([A-Za-z0-9_]+(?:\s*\([^)]*\))?)([\s\S]*)$/iu.exec(
          clean,
        );
      if (!colMatch) continue;

      const colName = colMatch[1];
      const colType = colMatch[2];
      const rest = colMatch[3] || '';

      const isPk =
        tablePks.has(colName) || /\bPRIMARY\s+KEY\b/iu.test(rest) || /\bAUTOINCREMENT\b/iu.test(rest);
      const isUnique = /\bUNIQUE\b/iu.test(rest);
      const isNotNull = isPk || /\bNOT\s+NULL\b/iu.test(rest);

      const defaultMatch = /\bDEFAULT\s+([^,()]+|\([^)]*\))/iu.exec(rest);
      const defaultValue = defaultMatch ? defaultMatch[1].trim() : undefined;

      const inlineFk = /\bREFERENCES\s+["`\[]?(\w+)["`\]]?\s*(?:\(([^)]+)\))?/iu.exec(rest);
      if (inlineFk) {
        const targetTable = inlineFk[1];
        const targetCol = inlineFk[2]?.trim().replace(/^["`\[]|["`\]]$/gu, '') || 'id';
        tableFks.set(colName, { targetTable, targetCol });
      }

      columns.push({
        name: colName,
        type: colType,
        nullable: !isNotNull,
        primaryKey: isPk,
        unique: isUnique,
        default: defaultValue,
      });
    }

    tables.push({
      name: tableName,
      columns,
    });

    for (const [fromCol, fk] of tableFks.entries()) {
      relations.push({
        fromTable: tableName,
        toTable: fk.targetTable,
        fromColumn: fromCol,
        toColumn: fk.targetCol,
        kind: 'one-to-many',
      });
    }
  }

  if (tables.length === 0) {
    throw new Error(
      'No valid CREATE TABLE statements found. Make sure your DDL starts with CREATE TABLE and ends with ;',
    );
  }

  return {
    tables,
    relations,
  };
}

export function emitSqlDdl(schema: Schema, dialect: SqlDialect = 'postgresql'): string {
  const statements: string[] = [];

  // Parents-first topological sort
  const orderedTables = orderTablesParentsFirst(schema);

  for (const table of orderedTables) {
    const lines: string[] = [];
    const pkCols = table.columns.filter((c) => c.primaryKey).map((c) => c.name);

    for (const col of table.columns) {
      const qCol = quoteSqlIdentifier(col.name, dialect);
      let qType = mapSqlType(col.type, dialect);

      // In SQLite, an autoincrement primary key MUST be defined inline as INTEGER PRIMARY KEY AUTOINCREMENT
      if (dialect === 'sqlite' && col.primaryKey && /AUTOINCREMENT/iu.test(qType)) {
        lines.push(`  ${qCol} ${qType}`);
        continue;
      }

      const parts = [`  ${qCol} ${qType}`];
      if (col.primaryKey && pkCols.length === 1 && dialect !== 'sqlite') {
        parts.push('PRIMARY KEY');
      } else if (!col.nullable) {
        parts.push('NOT NULL');
      }

      if (col.unique && !col.primaryKey) {
        parts.push('UNIQUE');
      }

      if (col.default !== undefined) {
        parts.push(`DEFAULT ${col.default}`);
      }

      lines.push(parts.join(' '));
    }

    if (pkCols.length > 1 || (pkCols.length === 1 && dialect === 'sqlite' && !lines[0]?.includes('PRIMARY KEY'))) {
      lines.push(`  PRIMARY KEY (${pkCols.map((c) => quoteSqlIdentifier(c, dialect)).join(', ')})`);
    }

    // Foreign keys for this table
    const tableRelations = schema.relations.filter((r) => r.fromTable === table.name);
    for (const rel of tableRelations) {
      lines.push(
        `  FOREIGN KEY (${quoteSqlIdentifier(rel.fromColumn, dialect)}) REFERENCES ${quoteSqlIdentifier(rel.toTable, dialect)}(${quoteSqlIdentifier(rel.toColumn, dialect)})`,
      );
    }

    statements.push(`CREATE TABLE ${quoteSqlIdentifier(table.name, dialect)} (\n${lines.join(',\n')}\n);`);
  }

  return statements.join('\n\n');
}

function orderTablesParentsFirst(schema: Schema): SchemaTable[] {
  const tableMap = new Map<string, SchemaTable>();
  for (const t of schema.tables) {
    tableMap.set(t.name.toLowerCase(), t);
  }

  const inDegree = new Map<string, number>();
  const graph = new Map<string, string[]>();

  for (const t of schema.tables) {
    const key = t.name.toLowerCase();
    inDegree.set(key, 0);
    graph.set(key, []);
  }

  for (const r of schema.relations) {
    const from = r.fromTable.toLowerCase();
    const to = r.toTable.toLowerCase();
    if (from !== to && tableMap.has(from) && tableMap.has(to)) {
      // "to" is parent, "from" is child -> parent must come before child
      graph.get(to)!.push(from);
      inDegree.set(from, (inDegree.get(from) ?? 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [name, deg] of inDegree.entries()) {
    if (deg === 0) queue.push(name);
  }

  const result: SchemaTable[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const table = tableMap.get(current);
    if (table) result.push(table);

    for (const child of graph.get(current) ?? []) {
      const nextDeg = (inDegree.get(child) ?? 1) - 1;
      inDegree.set(child, nextDeg);
      if (nextDeg === 0) queue.push(child);
    }
  }

  // Handle any remaining cycles
  for (const t of schema.tables) {
    if (!result.some((r) => r.name.toLowerCase() === t.name.toLowerCase())) {
      result.push(t);
    }
  }

  return result;
}
