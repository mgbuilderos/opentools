import { describe, expect, it } from 'vitest';
import { diffSchemas } from './diff';

describe('Schema Diff & Migration Generator', () => {
  const schemaV1 = `
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL
);

CREATE TABLE legacy_tokens (
  token_id VARCHAR(64) PRIMARY KEY,
  expired_at TIMESTAMP
);
  `;

  const schemaV2 = `
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  role VARCHAR(50) DEFAULT 'user'
);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  total DECIMAL(10, 2) NOT NULL
);
  `;

  it('detects added tables, dropped tables, and added columns accurately', () => {
    const result = diffSchemas(schemaV1, schemaV2, 'postgresql');

    expect(result.summary.tablesAdded).toBe(1); // orders added
    expect(result.summary.tablesDropped).toBe(1); // legacy_tokens dropped
    expect(result.summary.tablesModified).toBe(1); // users modified
    expect(result.summary.columnsAdded).toBe(5); // phone, role in users + id, user_id, total in orders

    // Migration SQL contains forward operations
    expect(result.migrationSql).toContain('CREATE TABLE orders');
    expect(result.migrationSql).toContain('DROP TABLE legacy_tokens');
    expect(result.migrationSql).toContain('ALTER TABLE users ADD COLUMN phone');

    // Markdown report summarizes changes
    expect(result.markdownReport).toContain('Table: `orders` (ADDED)');
    expect(result.markdownReport).toContain('Table: `legacy_tokens` (DROPPED)');
    expect(result.markdownReport).toContain('Table: `users` (MODIFIED)');
  });
});
