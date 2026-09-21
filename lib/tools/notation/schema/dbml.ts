import type { Schema, SchemaColumn, SchemaRelation, SchemaTable } from './types';

export function emitDbml(schema: Schema): string {
  const blocks: string[] = [];

  for (const table of schema.tables) {
    const lines: string[] = [`Table ${table.name} {`];
    for (const col of table.columns) {
      const settings: string[] = [];
      if (col.primaryKey) settings.push('pk');
      if (col.unique && !col.primaryKey) settings.push('unique');
      if (!col.nullable && !col.primaryKey) settings.push('not null');
      if (col.default !== undefined) settings.push(`default: \`${col.default}\``);
      if (col.comment) settings.push(`note: '${col.comment.replace(/'/gu, "\\'")}'`);

      const settingsStr = settings.length > 0 ? ` [${settings.join(', ')}]` : '';
      const type = col.type.toLowerCase().replace(/\s+/gu, '_');
      lines.push(`  ${col.name} ${type}${settingsStr}`);
    }
    lines.push('}');
    blocks.push(lines.join('\n'));
  }

  for (const rel of schema.relations) {
    blocks.push(`Ref: ${rel.fromTable}.${rel.fromColumn} > ${rel.toTable}.${rel.toColumn}`);
  }

  return blocks.join('\n\n');
}

export function parseDbml(input: string): Schema {
  const tables: SchemaTable[] = [];
  const relations: SchemaRelation[] = [];

  // Match Table name { ... }
  const tableRegex = /Table\s+(\w+)\s*\{([\s\S]*?)\}/giu;
  let tMatch: RegExpExecArray | null;

  while ((tMatch = tableRegex.exec(input)) !== null) {
    const tableName = tMatch[1];
    const body = tMatch[2];
    const columns: SchemaColumn[] = [];

    const lines = body.split(/\r?\n/u);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//')) continue;

      // Extract colName colType [settings]
      const colMatch = /^(\w+)\s+([\w()]+)(?:\s+\[(.*)\])?/u.exec(trimmed);
      if (!colMatch) continue;

      const colName = colMatch[1];
      const colType = colMatch[2];
      const settingsStr = colMatch[3] || '';

      const isPk = /\bpk\b/iu.test(settingsStr);
      const isUnique = /\bunique\b/iu.test(settingsStr);
      const isNotNull = isPk || /\bnot\s+null\b/iu.test(settingsStr);

      const defaultMatch = /default:\s*`?([^`,]+)`?/iu.exec(settingsStr);
      const defaultValue = defaultMatch ? defaultMatch[1].trim() : undefined;

      const noteMatch = /note:\s*'([^']*)'/iu.exec(settingsStr);
      const note = noteMatch ? noteMatch[1].trim() : undefined;

      columns.push({
        name: colName,
        type: colType,
        nullable: !isNotNull,
        primaryKey: isPk,
        unique: isUnique,
        default: defaultValue,
        comment: note,
      });
    }

    tables.push({
      name: tableName,
      columns,
    });
  }

  // Match Ref: child.col > parent.col
  const refRegex = /Ref(?:\s+\w+)?:\s*(\w+)\.(\w+)\s*([><-])\s*(\w+)\.(\w+)/giu;
  let rMatch: RegExpExecArray | null;

  while ((rMatch = refRegex.exec(input)) !== null) {
    const leftTable = rMatch[1];
    const leftCol = rMatch[2];
    const op = rMatch[3];
    const rightTable = rMatch[4];
    const rightCol = rMatch[5];

    let fromTable = leftTable;
    let fromCol = leftCol;
    let toTable = rightTable;
    let toCol = rightCol;

    if (op === '<') {
      fromTable = rightTable;
      fromCol = rightCol;
      toTable = leftTable;
      toCol = leftCol;
    }

    relations.push({
      fromTable,
      fromColumn: fromCol,
      toTable,
      toColumn: toCol,
      kind: op === '-' ? 'one-to-one' : 'one-to-many',
    });
  }

  if (tables.length === 0) {
    throw new Error('No Table definitions found in DBML.');
  }

  return {
    tables,
    relations,
  };
}
