import { describe, expect, it } from 'vitest';
import { detectSchemaFormat, emitSchema, parseSchema } from './index';

describe('Schema notation engine', () => {
  const sampleDdl = `
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  total DECIMAL(10, 2)
);
`.trim();

  it('parses SQL DDL with foreign keys and parent-child relations', () => {
    const schema = parseSchema(sampleDdl, 'sql-ddl');
    expect(schema.tables.length).toBe(2);
    expect(schema.tables[0].name.toLowerCase()).toBe('users');
    expect(schema.tables[1].name.toLowerCase()).toBe('orders');

    const usersTable = schema.tables.find(
      (t) => t.name.toLowerCase() === 'users',
    )!;
    expect(usersTable.columns.find((c) => c.name === 'id')?.primaryKey).toBe(
      true,
    );
    expect(usersTable.columns.find((c) => c.name === 'email')?.unique).toBe(
      true,
    );

    expect(schema.relations.length).toBe(1);
    expect(schema.relations[0].fromTable.toLowerCase()).toBe('orders');
    expect(schema.relations[0].toTable.toLowerCase()).toBe('users');
  });

  it('emits SQL DDL across dialects (Postgres, MySQL, SQLite, MSSQL)', () => {
    const schema = parseSchema(sampleDdl, 'sql-ddl');

    const pg = emitSchema(schema, 'sql-ddl', { dialect: 'postgresql' });
    expect(pg).toContain('"users"');
    expect(pg).toContain('SERIAL PRIMARY KEY');

    const mysql = emitSchema(schema, 'sql-ddl', { dialect: 'mysql' });
    expect(mysql).toContain('`users`');
    expect(mysql).toContain('AUTO_INCREMENT');

    const sqlite = emitSchema(schema, 'sql-ddl', { dialect: 'sqlite' });
    expect(sqlite).toContain('AUTOINCREMENT');

    const mssql = emitSchema(schema, 'sql-ddl', { dialect: 'mssql' });
    expect(mssql).toContain('[users]');
    expect(mssql).toContain('IDENTITY(1,1)');
  });

  it('round-trips DDL -> Mermaid -> DDL returning the same tables, columns and keys', () => {
    const schema = parseSchema(sampleDdl, 'sql-ddl');
    const mermaid = emitSchema(schema, 'mermaid');
    expect(mermaid).toContain('erDiagram');
    expect(mermaid).toContain('USERS ||--o{ ORDERS');
    expect(mermaid).toContain('int id PK');

    const schemaFromMermaid = parseSchema(mermaid, 'mermaid');
    expect(schemaFromMermaid.tables.length).toBe(2);
    const usersCols = schemaFromMermaid.tables.find(
      (t) => t.name === 'users',
    )!.columns;
    expect(usersCols.find((c) => c.name === 'id')?.primaryKey).toBe(true);
    expect(usersCols.find((c) => c.name === 'email')?.unique).toBe(true);

    const ddlBack = emitSchema(schemaFromMermaid, 'sql-ddl', {
      dialect: 'postgresql',
    });
    expect(ddlBack).toContain('CREATE TABLE "users"');
    expect(ddlBack).toContain('CREATE TABLE "orders"');
    expect(ddlBack).toContain('PRIMARY KEY');
  });

  it('converts DDL to DBML format and back', () => {
    const schema = parseSchema(sampleDdl, 'sql-ddl');
    const dbml = emitSchema(schema, 'dbml');
    expect(dbml).toContain('Table users {');
    expect(dbml).toContain('id serial [pk]');
    expect(dbml).toContain('Ref: orders.user_id > users.id');

    const parsedDbml = parseSchema(dbml, 'dbml');
    expect(parsedDbml.tables.length).toBe(2);
    expect(parsedDbml.relations.length).toBe(1);
  });

  it('emits PlantUML ER diagram', () => {
    const schema = parseSchema(sampleDdl, 'sql-ddl');
    const plantuml = emitSchema(schema, 'plantuml');
    expect(plantuml).toContain('@startuml');
    expect(plantuml).toContain('entity "users" as users');
    expect(plantuml).toContain('*id :');
    expect(plantuml).toContain('users ||--o{ orders');
    expect(plantuml).toContain('@enduml');
  });

  it('emits and parses JSON Schema', () => {
    const schema = parseSchema(sampleDdl, 'sql-ddl');
    const jsonSchemaStr = emitSchema(schema, 'json-schema');
    expect(jsonSchemaStr).toContain('DatabaseSchema');
    expect(jsonSchemaStr).toContain('"users"');

    const parsedJsonSchema = parseSchema(jsonSchemaStr, 'json-schema');
    expect(parsedJsonSchema.tables.length).toBe(2);
  });

  it('emits Markdown Data Dictionary', () => {
    const schema = parseSchema(sampleDdl, 'sql-ddl');
    const dataDict = emitSchema(schema, 'data-dictionary');
    expect(dataDict).toContain('# Database Data Dictionary');
    expect(dataDict).toContain('## Table: `users`');
    expect(dataDict).toContain('| id | `');
    expect(dataDict).toContain('## Foreign Key Relationships');
  });

  it('emits ORM models: Prisma, SQLAlchemy, and Django', () => {
    const schema = parseSchema(sampleDdl, 'sql-ddl');

    const prisma = emitSchema(schema, 'prisma');
    expect(prisma).toContain('model Users {');
    expect(prisma).toContain('id Int @id @default(autoincrement())');

    const sa = emitSchema(schema, 'sqlalchemy');
    expect(sa).toContain('class Users(Base):');
    expect(sa).toContain("__tablename__ = 'users'");

    const django = emitSchema(schema, 'django');
    expect(django).toContain('class Users(models.Model):');
    expect(django).toContain("db_table = 'users'");
  });

  it('orders tables parents-first in generated DDL', () => {
    // Pass tables in child-first order
    const childFirstDdl = `
CREATE TABLE items (
  id INT PRIMARY KEY,
  category_id INT REFERENCES categories(id)
);

CREATE TABLE categories (
  id INT PRIMARY KEY,
  name VARCHAR(50)
);
`.trim();

    const schema = parseSchema(childFirstDdl, 'sql-ddl');
    const orderedDdl = emitSchema(schema, 'sql-ddl', { dialect: 'postgresql' });
    const catIdx = orderedDdl.indexOf('"categories"');
    const itemIdx = orderedDdl.indexOf('"items"');
    expect(catIdx).toBeGreaterThan(-1);
    expect(itemIdx).toBeGreaterThan(-1);
    expect(catIdx).toBeLessThan(itemIdx);
  });

  it('auto-detects schema formats accurately', () => {
    expect(detectSchemaFormat('erDiagram\n  A ||--o{ B : has')).toBe('mermaid');
    expect(
      detectSchemaFormat(
        'Table users { id int [pk] }\nRef: orders.u > users.id',
      ),
    ).toBe('dbml');
    expect(
      detectSchemaFormat(
        '{"$schema": "http://json-schema.org/draft-07/schema#"}',
      ),
    ).toBe('json-schema');
    expect(detectSchemaFormat('CREATE TABLE users (id int);')).toBe('sql-ddl');
  });

  it('refuses invalid DDL by name (G7)', () => {
    expect(() => parseSchema('SELECT * FROM users;', 'sql-ddl')).toThrow(
      'No valid CREATE TABLE statements found',
    );
  });
});
