import type { RelationKind, Schema, SchemaColumn, SchemaRelation, SchemaTable } from './types';

export function emitMermaidErDiagram(schema: Schema): string {
  const lines: string[] = ['erDiagram'];

  // Relations
  for (const rel of schema.relations) {
    const from = rel.fromTable.toUpperCase();
    const to = rel.toTable.toUpperCase();
    const label = rel.label || (rel.fromColumn ? `"${rel.fromColumn}"` : 'references');
    // fromTable is child, toTable is parent
    // In Mermaid: PARENT ||--o{ CHILD : label
    lines.push(`    ${to} ||--o{ ${from} : ${label}`);
  }

  if (schema.relations.length > 0 && schema.tables.length > 0) {
    lines.push('');
  }

  // Entities
  for (const table of schema.tables) {
    lines.push(`    ${table.name.toUpperCase()} {`);
    for (const col of table.columns) {
      const keys: string[] = [];
      if (col.primaryKey) keys.push('PK');
      if (col.unique && !col.primaryKey) keys.push('UK');
      const isFk = schema.relations.some(
        (r) => r.fromTable.toLowerCase() === table.name.toLowerCase() && r.fromColumn.toLowerCase() === col.name.toLowerCase(),
      );
      if (isFk) keys.push('FK');

      const mType = mapTypeToMermaid(col.type);
      const keyStr = keys.length > 0 ? ` ${keys.join(',')}` : '';
      const commentStr = col.comment ? ` "${col.comment.replace(/"/gu, "'")}"` : '';

      lines.push(`        ${mType} ${col.name}${keyStr}${commentStr}`);
    }
    lines.push('    }');
  }

  return lines.join('\n');
}

function mapTypeToMermaid(type: string): string {
  const norm = type.trim().toLowerCase();
  if (norm.includes('int') || norm.includes('serial')) return 'int';
  if (norm.includes('char') || norm.includes('text') || norm.includes('clob')) return 'string';
  if (norm.includes('float') || norm.includes('double') || norm.includes('decimal') || norm.includes('numeric')) return 'decimal';
  if (norm.includes('bool')) return 'boolean';
  if (norm.includes('date') || norm.includes('time')) return 'datetime';
  return 'string';
}

function mapMermaidToSqlType(mType: string): string {
  const norm = mType.trim().toLowerCase();
  if (norm === 'int') return 'INTEGER';
  if (norm === 'string') return 'VARCHAR(255)';
  if (norm === 'decimal') return 'DECIMAL(10, 2)';
  if (norm === 'boolean') return 'BOOLEAN';
  if (norm === 'datetime') return 'TIMESTAMP';
  return mType.toUpperCase();
}

export function parseMermaidErDiagram(input: string): Schema {
  const lines = input.split(/\r?\n/u);
  const tables: SchemaTable[] = [];
  const relations: SchemaRelation[] = [];

  let currentTable: SchemaTable | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === 'erDiagram' || trimmed.startsWith('%%')) continue;

    // Entity block start: CUSTOMER {
    const entityStart = /^(\w+)\s*\{/u.exec(trimmed);
    if (entityStart) {
      const tableName = entityStart[1].toLowerCase();
      currentTable = { name: tableName, columns: [] };
      tables.push(currentTable);
      continue;
    }

    // Entity block end: }
    if (trimmed === '}') {
      currentTable = null;
      continue;
    }

    // Inside entity block: int id PK "comment"
    if (currentTable) {
      const attrMatch = /^(\w+)\s+(\w+)(?:\s+([\w,]+))?(?:\s+"([^"]*)")?/u.exec(trimmed);
      if (attrMatch) {
        const type = mapMermaidToSqlType(attrMatch[1]);
        const name = attrMatch[2];
        const keys = attrMatch[3] ? attrMatch[3].split(',').map((k) => k.trim().toUpperCase()) : [];
        const comment = attrMatch[4];

        const isPk = keys.includes('PK');
        const isUk = keys.includes('UK');

        currentTable.columns.push({
          name,
          type,
          nullable: !isPk,
          primaryKey: isPk,
          unique: isUk,
          comment,
        });
      }
      continue;
    }

    // Relationship line: PARENT ||--o{ CHILD : label
    const relMatch = /^(\w+)\s+([|o}{]{2}--[|o}{]{2})\s+(\w+)(?:\s*:\s*(?:"([^"]*)"|(\S+)))?/u.exec(
      trimmed,
    );
    if (relMatch) {
      const parent = relMatch[1].toLowerCase();
      const card = relMatch[2];
      const child = relMatch[3].toLowerCase();
      const label = relMatch[4] || relMatch[5] || 'references';

      let kind: RelationKind = 'one-to-many';
      if (card.includes('|{') || card.includes('}|')) {
        kind = card.includes('}{') ? 'many-to-many' : 'one-to-many';
      } else if (card.includes('||--||')) {
        kind = 'one-to-one';
      }

      // Infer column names
      const fromCol = label.includes('_id') ? label : `${parent}_id`;
      const toCol = 'id';

      relations.push({
        fromTable: child,
        toTable: parent,
        fromColumn: fromCol,
        toColumn: toCol,
        kind,
        label,
      });
    }
  }

  if (tables.length === 0) {
    throw new Error(
      'No entities found in Mermaid erDiagram. Expected syntax: erDiagram\\n ENTITY { int id PK }',
    );
  }

  return {
    tables,
    relations,
  };
}
