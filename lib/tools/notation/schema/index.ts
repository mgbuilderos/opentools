import { emitDataDictionary } from './data-dictionary';
import { emitDbml, parseDbml } from './dbml';
import { emitJsonSchema, parseJsonSchema } from './json-schema';
import { emitMermaidErDiagram, parseMermaidErDiagram } from './mermaid';
import { emitDjangoModels, emitPrismaSchema, emitSqlAlchemy } from './orm';
import { emitPlantUml } from './plantuml';
import { emitSqlDdl, parseSqlDdl } from './sql-ddl';
import type { Schema, SchemaEmitOptions, SchemaFormat } from './types';

export * from './types';
export { parseSqlDdl, emitSqlDdl } from './sql-ddl';
export { parseMermaidErDiagram, emitMermaidErDiagram } from './mermaid';

export function detectSchemaFormat(input: string): SchemaFormat {
  const trimmed = input.trim();
  if (/^\s*erDiagram\b/u.test(trimmed) || trimmed.includes('||--')) {
    return 'mermaid';
  }
  if (
    /\bTable\s+\w+\s*\{/u.test(trimmed) &&
    (trimmed.includes('Ref:') ||
      /\[.*(?:pk|not null|unique).*\]/iu.test(trimmed))
  ) {
    return 'dbml';
  }
  if (/^\{[\s\S]*\}$/u.test(trimmed)) {
    try {
      const obj = JSON.parse(trimmed);
      if (obj.$schema || obj.definitions || obj.$defs || obj.properties) {
        return 'json-schema';
      }
    } catch {
      // Not JSON
    }
  }
  return 'sql-ddl';
}

export function parseSchema(
  input: string,
  format?: SchemaFormat | 'auto',
): Schema {
  const resolved =
    !format || format === 'auto' ? detectSchemaFormat(input) : format;

  switch (resolved) {
    case 'sql-ddl':
      return parseSqlDdl(input);
    case 'mermaid':
      return parseMermaidErDiagram(input);
    case 'dbml':
      return parseDbml(input);
    case 'json-schema':
      return parseJsonSchema(input);
    default:
      return parseSqlDdl(input);
  }
}

export function emitSchema(
  schema: Schema,
  format: SchemaFormat,
  options: SchemaEmitOptions = {},
): string {
  switch (format) {
    case 'sql-ddl':
      return emitSqlDdl(schema, options.dialect ?? 'postgresql');
    case 'mermaid':
      return emitMermaidErDiagram(schema);
    case 'dbml':
      return emitDbml(schema);
    case 'plantuml':
      return emitPlantUml(schema);
    case 'json-schema':
      return emitJsonSchema(schema);
    case 'data-dictionary':
      return emitDataDictionary(schema);
    case 'prisma':
      return emitPrismaSchema(schema);
    case 'sqlalchemy':
      return emitSqlAlchemy(schema);
    case 'django':
      return emitDjangoModels(schema);
    default:
      throw new Error(`Unsupported schema output format: ${String(format)}`);
  }
}

export function convertSchema(
  input: string,
  from: SchemaFormat | 'auto' = 'auto',
  to: SchemaFormat = 'mermaid',
  options: SchemaEmitOptions = {},
): string {
  const schema = parseSchema(input, from);
  return emitSchema(schema, to, options);
}
