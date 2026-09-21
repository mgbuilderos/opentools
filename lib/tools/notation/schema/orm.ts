import type { Schema, SchemaColumn, SchemaTable } from './types';

function toPascalCase(str: string): string {
  return str
    .replace(/(?:^|[_-])(\w)/gu, (_, c) => c.toUpperCase())
    .replace(/^(\w)/u, (c) => c.toUpperCase());
}

export function emitPrismaSchema(schema: Schema): string {
  const lines: string[] = [
    '// Generated Prisma Schema',
    'datasource db {',
    '  provider = "postgresql"',
    '  url      = env("DATABASE_URL")',
    '}',
    '',
    'generator client {',
    '  provider = "prisma-client-js"',
    '}',
    '',
  ];

  for (const table of schema.tables) {
    const modelName = toPascalCase(table.name);
    lines.push(`model ${modelName} {`);

    for (const col of table.columns) {
      const pType = mapTypeToPrisma(col.type);
      const attrs: string[] = [];

      if (col.primaryKey) {
        attrs.push('@id');
        if (/int|serial/iu.test(col.type)) {
          attrs.push('@default(autoincrement())');
        }
      } else if (col.unique) {
        attrs.push('@unique');
      }

      if (col.default !== undefined && !attrs.some((a) => a.includes('@default'))) {
        attrs.push(`@default(${col.default})`);
      }

      const opt = col.nullable && !col.primaryKey ? '?' : '';
      const attrStr = attrs.length > 0 ? ` ${attrs.join(' ')}` : '';
      lines.push(`  ${col.name} ${pType}${opt}${attrStr}`);
    }

    // Add relation fields
    const childRelations = schema.relations.filter((r) => r.fromTable.toLowerCase() === table.name.toLowerCase());
    for (const rel of childRelations) {
      const parentModel = toPascalCase(rel.toTable);
      lines.push(
        `  ${rel.toTable.toLowerCase()} ${parentModel} @relation(fields: [${rel.fromColumn}], references: [${rel.toColumn}])`,
      );
    }

    const parentRelations = schema.relations.filter((r) => r.toTable.toLowerCase() === table.name.toLowerCase());
    for (const rel of parentRelations) {
      const childModel = toPascalCase(rel.fromTable);
      lines.push(`  ${rel.fromTable.toLowerCase()}s ${childModel}[]`);
    }

    lines.push('  @@map("' + table.name + '")');
    lines.push('}');
    lines.push('');
  }

  return lines.join('\n');
}

function mapTypeToPrisma(type: string): string {
  const norm = type.trim().toLowerCase();
  if (norm.includes('int') || norm.includes('serial')) return 'Int';
  if (norm.includes('float') || norm.includes('double') || norm.includes('decimal')) return 'Float';
  if (norm.includes('bool')) return 'Boolean';
  if (norm.includes('date') || norm.includes('time')) return 'DateTime';
  return 'String';
}

export function emitSqlAlchemy(schema: Schema): string {
  const lines: string[] = [
    'from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey',
    'from sqlalchemy.orm import relationship, declarative_base',
    '',
    'Base = declarative_base()',
    '',
  ];

  for (const table of schema.tables) {
    const className = toPascalCase(table.name);
    lines.push(`class ${className}(Base):`);
    lines.push(`    __tablename__ = '${table.name}'`);
    lines.push('');

    for (const col of table.columns) {
      const saType = mapTypeToSqlAlchemy(col.type);
      const args: string[] = [saType];

      const isFk = schema.relations.find(
        (r) => r.fromTable.toLowerCase() === table.name.toLowerCase() && r.fromColumn.toLowerCase() === col.name.toLowerCase(),
      );
      if (isFk) {
        args.push(`ForeignKey('${isFk.toTable}.${isFk.toColumn}')`);
      }

      if (col.primaryKey) args.push('primary_key=True');
      if (!col.nullable && !col.primaryKey) args.push('nullable=False');
      if (col.unique && !col.primaryKey) args.push('unique=True');

      lines.push(`    ${col.name} = Column(${args.join(', ')})`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function mapTypeToSqlAlchemy(type: string): string {
  const norm = type.trim().toLowerCase();
  if (norm.includes('int') || norm.includes('serial')) return 'Integer';
  if (norm.includes('float') || norm.includes('double') || norm.includes('decimal')) return 'Float';
  if (norm.includes('bool')) return 'Boolean';
  if (norm.includes('date') || norm.includes('time')) return 'DateTime';
  return 'String(255)';
}

export function emitDjangoModels(schema: Schema): string {
  const lines: string[] = ['from django.db import models', ''];

  for (const table of schema.tables) {
    const className = toPascalCase(table.name);
    lines.push(`class ${className}(models.Model):`);

    for (const col of table.columns) {
      if (col.primaryKey && /int|serial/iu.test(col.type)) {
        // Django adds id auto field by default
        continue;
      }

      const isFk = schema.relations.find(
        (r) => r.fromTable.toLowerCase() === table.name.toLowerCase() && r.fromColumn.toLowerCase() === col.name.toLowerCase(),
      );

      if (isFk) {
        const targetModel = toPascalCase(isFk.toTable);
        const nullArg = col.nullable ? ', null=True, blank=True' : '';
        lines.push(
          `    ${col.name.replace(/_id$/iu, '')} = models.ForeignKey('${targetModel}', on_delete=models.CASCADE${nullArg})`,
        );
        continue;
      }

      const fieldDef = mapTypeToDjango(col);
      lines.push(`    ${col.name} = ${fieldDef}`);
    }

    lines.push('');
    lines.push('    class Meta:');
    lines.push(`        db_table = '${table.name}'`);
    lines.push('');
  }

  return lines.join('\n');
}

function mapTypeToDjango(col: SchemaColumn): string {
  const norm = col.type.trim().toLowerCase();
  const nullOpt = col.nullable ? ', null=True, blank=True' : '';
  const uniqOpt = col.unique ? ', unique=True' : '';

  if (norm.includes('bool')) return `models.BooleanField(default=False${nullOpt})`;
  if (norm.includes('int')) return `models.IntegerField(${nullOpt.slice(2)}${uniqOpt})`;
  if (norm.includes('decimal') || norm.includes('float') || norm.includes('double')) {
    return `models.DecimalField(max_digits=10, decimal_places=2${nullOpt}${uniqOpt})`;
  }
  if (norm.includes('date') || norm.includes('time')) {
    return `models.DateTimeField(${nullOpt.slice(2)}${uniqOpt})`;
  }
  if (norm.includes('text')) return `models.TextField(${nullOpt.slice(2)}${uniqOpt})`;
  return `models.CharField(max_length=255${nullOpt}${uniqOpt})`;
}
