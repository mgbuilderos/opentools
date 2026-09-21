import type { Schema, SchemaColumn, SchemaTable } from './types';

export function emitJsonSchema(schema: Schema): string {
  const definitions: Record<string, unknown> = {};

  for (const table of schema.tables) {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const col of table.columns) {
      const typeInfo: Record<string, unknown> = {
        type: mapSqlTypeToJsonSchema(col.type),
      };
      if (col.comment) typeInfo.description = col.comment;
      if (col.default !== undefined) typeInfo.default = col.default;

      properties[col.name] = typeInfo;
      if (!col.nullable) {
        required.push(col.name);
      }
    }

    definitions[table.name] = {
      type: 'object',
      description: table.comment,
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }

  const jsonSchema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'DatabaseSchema',
    type: 'object',
    definitions,
  };

  return JSON.stringify(jsonSchema, null, 2);
}

function mapSqlTypeToJsonSchema(type: string): string {
  const norm = type.trim().toLowerCase();
  if (norm.includes('int')) return 'integer';
  if (norm.includes('float') || norm.includes('double') || norm.includes('decimal') || norm.includes('numeric'))
    return 'number';
  if (norm.includes('bool')) return 'boolean';
  return 'string';
}

export function parseJsonSchema(input: string): Schema {
  let doc: Record<string, unknown>;
  try {
    doc = JSON.parse(input);
  } catch (err) {
    throw new Error(`Invalid JSON Schema: ${err instanceof Error ? err.message : String(err)}`);
  }

  const definitions = (doc.definitions || doc.$defs || {}) as Record<string, Record<string, unknown>>;
  const tables: SchemaTable[] = [];

  for (const [tableName, def] of Object.entries(definitions)) {
    const props = (def.properties || {}) as Record<string, Record<string, unknown>>;
    const requiredList = Array.isArray(def.required) ? (def.required as string[]) : [];
    const columns: SchemaColumn[] = [];

    for (const [colName, p] of Object.entries(props)) {
      const jsonType = String(p.type || 'string');
      let sqlType = 'VARCHAR(255)';
      if (jsonType === 'integer') sqlType = 'INTEGER';
      else if (jsonType === 'number') sqlType = 'DECIMAL(10, 2)';
      else if (jsonType === 'boolean') sqlType = 'BOOLEAN';

      const isPk = colName.toLowerCase() === 'id';
      const isRequired = isPk || requiredList.includes(colName);

      columns.push({
        name: colName,
        type: sqlType,
        nullable: !isRequired,
        primaryKey: isPk,
        default: p.default !== undefined ? String(p.default) : undefined,
        comment: p.description ? String(p.description) : undefined,
      });
    }

    tables.push({
      name: tableName,
      columns,
      comment: def.description ? String(def.description) : undefined,
    });
  }

  return {
    tables,
    relations: [],
  };
}
