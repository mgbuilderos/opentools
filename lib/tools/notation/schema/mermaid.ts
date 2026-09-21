import type {
  RelationKind,
  Schema,
  SchemaRelation,
  SchemaTable,
} from './types';

export function emitMermaidErDiagram(schema: Schema): string {
  const lines: string[] = ['erDiagram'];

  // Relations
  for (const rel of schema.relations) {
    const from = rel.fromTable.toUpperCase();
    const to = rel.toTable.toUpperCase();
    const label =
      rel.label || (rel.fromColumn ? `"${rel.fromColumn}"` : 'references');
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
        (r) =>
          r.fromTable.toLowerCase() === table.name.toLowerCase() &&
          r.fromColumn.toLowerCase() === col.name.toLowerCase(),
      );
      if (isFk) keys.push('FK');

      const mType = mapTypeToMermaid(col.type);
      const keyStr = keys.length > 0 ? ` ${keys.join(',')}` : '';
      const commentStr = col.comment
        ? ` "${col.comment.replace(/"/gu, "'")}"`
        : '';

      lines.push(`        ${mType} ${col.name}${keyStr}${commentStr}`);
    }
    lines.push('    }');
  }

  return lines.join('\n');
}

function mapTypeToMermaid(type: string): string {
  const norm = type.trim().toLowerCase();
  if (norm.includes('int') || norm.includes('serial')) return 'int';
  if (norm.includes('char') || norm.includes('text') || norm.includes('clob'))
    return 'string';
  if (
    norm.includes('float') ||
    norm.includes('double') ||
    norm.includes('decimal') ||
    norm.includes('numeric')
  )
    return 'decimal';
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
    if (!trimmed || trimmed === 'erDiagram' || trimmed.startsWith('%%'))
      continue;

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
      const attrMatch = /^(\w+)\s+(\w+)(?:\s+([\w,]+))?(?:\s+"([^"]*)")?/u.exec(
        trimmed,
      );
      if (attrMatch) {
        const type = mapMermaidToSqlType(attrMatch[1]);
        const name = attrMatch[2];
        const keys = attrMatch[3]
          ? attrMatch[3].split(',').map((k) => k.trim().toUpperCase())
          : [];
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
    const relMatch =
      /^(\w+)\s+([|o}{]{2}--[|o}{]{2})\s+(\w+)(?:\s*:\s*(?:"([^"]*)"|(\S+)))?/u.exec(
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

/* -------------------------------------------------------------------------
 * Mermaid ER diagram -> SQL DDL conversion
 * ---------------------------------------------------------------------- */

export interface DetailedMermaidAttribute {
  name: string;
  mermaidType: string;
  keys: string[];
  comment: string;
}

export interface DetailedMermaidEntity {
  name: string;
  attributes: DetailedMermaidAttribute[];
}

export interface DetailedMermaidRelationship {
  left: string;
  right: string;
  leftMany: boolean;
  rightMany: boolean;
  label: string;
}

const MERMAID_TYPE_MAP: Record<string, Record<string, string>> = {
  postgresql: {
    string: 'VARCHAR(255)',
    str: 'VARCHAR(255)',
    text: 'TEXT',
    int: 'INTEGER',
    integer: 'INTEGER',
    number: 'INTEGER',
    bigint: 'BIGINT',
    long: 'BIGINT',
    float: 'REAL',
    double: 'DOUBLE PRECISION',
    decimal: 'NUMERIC(12,2)',
    money: 'NUMERIC(12,2)',
    bool: 'BOOLEAN',
    boolean: 'BOOLEAN',
    date: 'DATE',
    time: 'TIME',
    datetime: 'TIMESTAMP',
    timestamp: 'TIMESTAMP',
    uuid: 'UUID',
    json: 'JSONB',
    blob: 'BYTEA',
    binary: 'BYTEA',
  },
  mysql: {
    string: 'VARCHAR(255)',
    str: 'VARCHAR(255)',
    text: 'TEXT',
    int: 'INT',
    integer: 'INT',
    number: 'INT',
    bigint: 'BIGINT',
    long: 'BIGINT',
    float: 'FLOAT',
    double: 'DOUBLE',
    decimal: 'DECIMAL(12,2)',
    money: 'DECIMAL(12,2)',
    bool: 'TINYINT(1)',
    boolean: 'TINYINT(1)',
    date: 'DATE',
    time: 'TIME',
    datetime: 'DATETIME',
    timestamp: 'TIMESTAMP',
    uuid: 'CHAR(36)',
    json: 'JSON',
    blob: 'BLOB',
    binary: 'BLOB',
  },
  sqlite: {
    string: 'TEXT',
    str: 'TEXT',
    text: 'TEXT',
    int: 'INTEGER',
    integer: 'INTEGER',
    number: 'INTEGER',
    bigint: 'INTEGER',
    long: 'INTEGER',
    float: 'REAL',
    double: 'REAL',
    decimal: 'NUMERIC',
    money: 'NUMERIC',
    bool: 'INTEGER',
    boolean: 'INTEGER',
    date: 'TEXT',
    time: 'TEXT',
    datetime: 'TEXT',
    timestamp: 'TEXT',
    uuid: 'TEXT',
    json: 'TEXT',
    blob: 'BLOB',
    binary: 'BLOB',
  },
};

const SQL_RESERVED = new Set([
  'order',
  'user',
  'group',
  'table',
  'select',
  'from',
  'where',
  'index',
  'key',
  'primary',
  'references',
  'check',
  'default',
  'column',
  'constraint',
  'values',
  'grant',
  'role',
  'transaction',
  'limit',
  'offset',
  'case',
  'when',
  'desc',
  'asc',
  'end',
]);

function toSnakeCase(value: string): string {
  return value
    .replace(/[\s-]+/gu, '_')
    .replace(/([a-z0-9])([A-Z])/gu, '$1_$2')
    .replace(/__+/gu, '_')
    .toLowerCase();
}

function quoteIdentifier(name: string, dialect: string): string {
  const safe = /^[A-Za-z_][A-Za-z0-9_]*$/u.test(name);
  if (safe && !SQL_RESERVED.has(name.toLowerCase())) return name;
  if (dialect === 'mysql') return `\`${name.replaceAll('`', '``')}\``;
  return `"${name.replaceAll('"', '""')}"`;
}

function mapMermaidType(mermaidType: string, dialect: string): string {
  const raw = mermaidType.trim();
  if (!raw) return dialect === 'sqlite' ? 'TEXT' : 'VARCHAR(255)';
  const key = raw.toLowerCase();
  const map = MERMAID_TYPE_MAP[dialect] ?? MERMAID_TYPE_MAP.postgresql;
  if (map[key]) return map[key];
  if (/[()]/u.test(raw) || /\s/u.test(raw)) return raw.toUpperCase();
  return raw.toUpperCase();
}

export function parseDetailedMermaidErDiagram(source: string): {
  entities: DetailedMermaidEntity[];
  relationships: DetailedMermaidRelationship[];
  ignored: string[];
} {
  const entities = new Map<string, DetailedMermaidEntity>();
  const relationships: DetailedMermaidRelationship[] = [];
  const ignored: string[] = [];

  const entityFor = (name: string) => {
    const existing = entities.get(name);
    if (existing) return existing;
    const created: DetailedMermaidEntity = { name, attributes: [] };
    entities.set(name, created);
    return created;
  };

  const lines = source
    .split(/\r?\n/u)
    .map((line) => line.replace(/%%.*$/u, '').trim());

  let current: DetailedMermaidEntity | null = null;

  for (const line of lines) {
    if (!line) continue;
    if (/^erDiagram\b/iu.test(line)) continue;
    if (
      /^(?:direction|title|classDef|class|style|accTitle|accDescr)\b/iu.test(
        line,
      )
    )
      continue;

    if (current) {
      if (line === '}') {
        current = null;
        continue;
      }
      const attribute =
        /^([A-Za-z_][\w()[\],. ]*?)\s+([A-Za-z_]\w*)\s*((?:\b(?:PK|FK|UK)\b[ ,]*)*)\s*(?:"([^"]*)")?\s*$/u.exec(
          line,
        );
      if (!attribute) {
        ignored.push(line);
        continue;
      }
      current.attributes.push({
        mermaidType: attribute[1].trim(),
        name: attribute[2],
        keys: (attribute[3] ?? '')
          .toUpperCase()
          .split(/[ ,]+/u)
          .filter(Boolean),
        comment: attribute[4] ?? '',
      });
      continue;
    }

    const relationship =
      /^(\w+)(?:\s*\[[^\]]*\])?\s+([|}o]{2})(?:--|\.\.)([|o{]{2})\s+(\w+)(?:\s*\[[^\]]*\])?\s*:\s*(.+)$/u.exec(
        line,
      );
    if (relationship) {
      const [, left, leftCardinality, rightCardinality, right, label] =
        relationship;
      entityFor(left);
      entityFor(right);
      relationships.push({
        left,
        right,
        leftMany: leftCardinality.includes('}'),
        rightMany: rightCardinality.includes('{'),
        label: label.replace(/^["']|["']$/gu, '').trim(),
      });
      continue;
    }

    const block = /^(\w+)(?:\s*\[[^\]]*\])?\s*\{$/u.exec(line);
    if (block) {
      current = entityFor(block[1]);
      continue;
    }

    if (/^\w+(?:\s*\[[^\]]*\])?$/u.test(line)) {
      entityFor(line.replace(/\s*\[[^\]]*\]$/u, ''));
      continue;
    }

    ignored.push(line);
  }

  return { entities: [...entities.values()], relationships, ignored };
}

function orderEntitiesParentsFirst(
  entities: DetailedMermaidEntity[],
  relationships: DetailedMermaidRelationship[],
): { entities: DetailedMermaidEntity[]; cyclic: string[] } {
  const byName = new Map(entities.map((entity) => [entity.name, entity]));
  const parentsOf = new Map<string, Set<string>>(
    entities.map((entity) => [entity.name, new Set<string>()]),
  );

  for (const relationship of relationships) {
    if (relationship.leftMany === relationship.rightMany) continue;
    const parent = relationship.rightMany
      ? relationship.left
      : relationship.right;
    const child = relationship.rightMany
      ? relationship.right
      : relationship.left;
    if (parent === child) continue;
    parentsOf.get(child)?.add(parent);
  }

  const ordered: DetailedMermaidEntity[] = [];
  const placed = new Set<string>();
  let progressed = true;

  while (progressed) {
    progressed = false;
    for (const entity of entities) {
      if (placed.has(entity.name)) continue;
      const parents = parentsOf.get(entity.name) ?? new Set<string>();
      const waiting = [...parents].some(
        (parent) => byName.has(parent) && !placed.has(parent),
      );
      if (waiting) continue;
      ordered.push(entity);
      placed.add(entity.name);
      progressed = true;
    }
  }

  const cyclic = entities
    .filter((entity) => !placed.has(entity.name))
    .map((entity) => entity.name);

  return {
    entities: [
      ...ordered,
      ...entities.filter((entity) => !placed.has(entity.name)),
    ],
    cyclic,
  };
}

export function convertMermaidErDiagramToSql(
  source: string,
  options: {
    dialect?: string;
    naming?: string;
    joinTables?: boolean;
  } = {},
): string {
  const dialect = options.dialect ?? 'postgresql';
  const naming = options.naming ?? 'preserve';
  const joinTables = options.joinTables !== false;

  const { entities, relationships, ignored } =
    parseDetailedMermaidErDiagram(source);
  if (entities.length === 0) {
    throw new Error(
      'No entities found. Paste a Mermaid erDiagram — it starts with `erDiagram` and names entities like `CUSTOMER ||--o{ ORDER : places`.',
    );
  }

  const tableName = (name: string) =>
    naming === 'snake_case' ? toSnakeCase(name) : name;
  const columnName = (name: string) =>
    naming === 'snake_case' ? toSnakeCase(name) : name;

  const primaryKeyOf = new Map<string, DetailedMermaidAttribute[]>();
  for (const entity of entities) {
    primaryKeyOf.set(
      entity.name,
      entity.attributes.filter((attribute) => attribute.keys.includes('PK')),
    );
  }

  const statements: string[] = [];
  const notes: string[] = [];
  const emptyEntities: string[] = [];

  const ordered = orderEntitiesParentsFirst(entities, relationships);
  if (ordered.cyclic.length > 0) {
    notes.push(
      `${ordered.cyclic.join(', ')} reference each other in a cycle, so no creation order satisfies every foreign key. Create the tables first and add those constraints with ALTER TABLE.`,
    );
  }

  for (const entity of ordered.entities) {
    if (entity.attributes.length === 0) {
      emptyEntities.push(entity.name);
      continue;
    }

    const table = quoteIdentifier(tableName(entity.name), dialect);
    const columns: string[] = [];
    const constraints: string[] = [];

    for (const attribute of entity.attributes) {
      const column = quoteIdentifier(columnName(attribute.name), dialect);
      const type = mapMermaidType(attribute.mermaidType, dialect);
      const parts = [`  ${column} ${type}`];
      if (attribute.keys.includes('PK')) parts.push('NOT NULL');
      if (attribute.keys.includes('UK')) parts.push('UNIQUE');
      const comment = attribute.comment
        ? `  -- ${attribute.comment.replace(/\s+/gu, ' ')}\n`
        : '';
      columns.push(comment + parts.join(' '));
    }

    const primaryKey = primaryKeyOf.get(entity.name) ?? [];
    if (primaryKey.length > 0) {
      const keyColumns = primaryKey
        .map((attribute) =>
          quoteIdentifier(columnName(attribute.name), dialect),
        )
        .join(', ');
      constraints.push(`  PRIMARY KEY (${keyColumns})`);
    }

    const parents = relationships
      .filter(
        (relationship) =>
          (relationship.right === entity.name &&
            relationship.leftMany === false) ||
          (relationship.left === entity.name &&
            relationship.rightMany === true),
      )
      .map((relationship) =>
        relationship.right === entity.name
          ? relationship.left
          : relationship.right,
      )
      .filter((name, index, all) => all.indexOf(name) === index);

    const foreignKeyColumns = entity.attributes.filter((attribute) =>
      attribute.keys.includes('FK'),
    );

    for (const [index, attribute] of foreignKeyColumns.entries()) {
      const parent =
        parents.find((name) =>
          attribute.name.toLowerCase().startsWith(name.toLowerCase()),
        ) ?? parents[index];
      if (!parent) {
        notes.push(
          `${entity.name}.${attribute.name} is marked FK but no relationship names the table it points at — add the relationship line, or the constraint cannot be written.`,
        );
        continue;
      }
      const parentKey = primaryKeyOf.get(parent) ?? [];
      if (parentKey.length !== 1) {
        notes.push(
          `${entity.name}.${attribute.name} points at ${parent}, which declares ${parentKey.length === 0 ? 'no primary key' : 'a composite primary key'} — write that constraint by hand.`,
        );
        continue;
      }
      constraints.push(
        `  FOREIGN KEY (${quoteIdentifier(columnName(attribute.name), dialect)}) ` +
          `REFERENCES ${quoteIdentifier(tableName(parent), dialect)} ` +
          `(${quoteIdentifier(columnName(parentKey[0].name), dialect)})`,
      );
    }

    statements.push(
      `CREATE TABLE ${table} (\n${[...columns, ...constraints].join(',\n')}\n);`,
    );
  }

  if (joinTables) {
    for (const relationship of relationships) {
      if (!relationship.leftMany || !relationship.rightMany) continue;
      const leftKey = primaryKeyOf.get(relationship.left) ?? [];
      const rightKey = primaryKeyOf.get(relationship.right) ?? [];
      if (leftKey.length !== 1 || rightKey.length !== 1) {
        notes.push(
          `${relationship.left} to ${relationship.right} is many-to-many, but a junction table needs a single primary key on both sides.`,
        );
        continue;
      }
      const joinName = tableName(`${relationship.left}_${relationship.right}`);
      const leftColumn = columnName(`${relationship.left}_${leftKey[0].name}`);
      const rightColumn = columnName(
        `${relationship.right}_${rightKey[0].name}`,
      );
      statements.push(
        `-- junction table for the many-to-many "${relationship.label}"\n` +
          `CREATE TABLE ${quoteIdentifier(joinName, dialect)} (\n` +
          `  ${quoteIdentifier(leftColumn, dialect)} ${mapMermaidType(leftKey[0].mermaidType, dialect)} NOT NULL,\n` +
          `  ${quoteIdentifier(rightColumn, dialect)} ${mapMermaidType(rightKey[0].mermaidType, dialect)} NOT NULL,\n` +
          `  PRIMARY KEY (${quoteIdentifier(leftColumn, dialect)}, ${quoteIdentifier(rightColumn, dialect)}),\n` +
          `  FOREIGN KEY (${quoteIdentifier(leftColumn, dialect)}) REFERENCES ${quoteIdentifier(tableName(relationship.left), dialect)} (${quoteIdentifier(columnName(leftKey[0].name), dialect)}),\n` +
          `  FOREIGN KEY (${quoteIdentifier(rightColumn, dialect)}) REFERENCES ${quoteIdentifier(tableName(relationship.right), dialect)} (${quoteIdentifier(columnName(rightKey[0].name), dialect)})\n` +
          `);`,
      );
    }
  }

  if (statements.length === 0) {
    throw new Error(
      'Every entity in this diagram is a bare name with no attribute block, so there are no columns to create. Add `ENTITY { type name PK }` blocks.',
    );
  }

  const header = [
    `-- Generated from a Mermaid erDiagram. Dialect: ${dialect}.`,
    `-- ${statements.length} statement(s) from ${entities.length} entit${entities.length === 1 ? 'y' : 'ies'} and ${relationships.length} relationship(s).`,
  ];

  if (emptyEntities.length > 0) {
    notes.push(
      `No attribute block for ${emptyEntities.join(', ')}, so no table was created for ${emptyEntities.length === 1 ? 'it' : 'them'}.`,
    );
  }
  if (ignored.length > 0) {
    notes.push(
      `${ignored.length} line(s) were not recognised as Mermaid ER syntax and were skipped: ${ignored.slice(0, 3).join(' / ')}${ignored.length > 3 ? ' …' : ''}`,
    );
  }

  const footer =
    notes.length > 0
      ? ['', '-- Not written, and why:', ...notes.map((note) => `--   ${note}`)]
      : [];

  return [...header, '', statements.join('\n\n'), ...footer].join('\n');
}
