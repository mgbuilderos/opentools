/**
 * Schema Diff & Migration Generator.
 *
 * Compares two SQL DDL schemas and generates structural diff metrics,
 * human-readable changelog, and executable forward migration SQL.
 */

import { parseSqlDdl } from '@/lib/tools/notation/schema/sql-ddl';
import type {
  Schema,
  SchemaColumn,
  SchemaTable,
  SqlDialect,
} from '@/lib/tools/notation/schema/types';

export interface ColumnDiff {
  name: string;
  type: 'added' | 'dropped' | 'modified';
  oldType?: string;
  newType?: string;
  oldNullable?: boolean;
  newNullable?: boolean;
}

export interface TableDiff {
  tableName: string;
  status: 'added' | 'dropped' | 'modified' | 'unchanged';
  columnDiffs: ColumnDiff[];
  primaryKeyChanged: boolean;
  foreignKeysAdded: string[];
  foreignKeysDropped: string[];
}

export interface SchemaDiffResult {
  tables: TableDiff[];
  summary: {
    tablesAdded: number;
    tablesDropped: number;
    tablesModified: number;
    columnsAdded: number;
    columnsDropped: number;
    columnsModified: number;
    totalChanges: number;
  };
  migrationSql: string;
  markdownReport: string;
}

/**
 * Computes structural differences between Schema A (baseline) and Schema B (target).
 */
export function diffSchemas(
  ddlA: string,
  ddlB: string,
  dialect: SqlDialect = 'postgresql',
): SchemaDiffResult {
  const schemaA: Schema = parseSqlDdl(ddlA);
  const schemaB: Schema = parseSqlDdl(ddlB);

  const mapA = new Map<string, SchemaTable>(
    schemaA.tables.map((t) => [t.name.toLowerCase(), t]),
  );
  const mapB = new Map<string, SchemaTable>(
    schemaB.tables.map((t) => [t.name.toLowerCase(), t]),
  );

  const tableDiffs: TableDiff[] = [];
  const migrationLines: string[] = [
    '-- Generated Migration Script',
    `-- Dialect: ${dialect}`,
    '',
  ];
  const reportLines: string[] = [
    '# Database Migration & Schema Diff Report',
    '',
  ];

  let tablesAdded = 0;
  let tablesDropped = 0;
  let tablesModified = 0;
  let columnsAdded = 0;
  let columnsDropped = 0;
  let columnsModified = 0;

  // 1. Check tables in B (added or modified)
  for (const [nameB, tableB] of mapB.entries()) {
    const tableA = mapA.get(nameB);

    if (!tableA) {
      // Table Added
      tablesAdded++;
      const cols: ColumnDiff[] = tableB.columns.map((c: SchemaColumn) => ({
        name: c.name,
        type: 'added',
        newType: c.type,
        newNullable: c.nullable,
      }));
      columnsAdded += cols.length;

      const pks = tableB.columns.filter((c) => c.primaryKey).map((c) => c.name);
      tableDiffs.push({
        tableName: tableB.name,
        status: 'added',
        columnDiffs: cols,
        primaryKeyChanged: pks.length > 0,
        foreignKeysAdded: [],
        foreignKeysDropped: [],
      });

      // Migration SQL
      const colDefs = tableB.columns.map(
        (c: SchemaColumn) =>
          `  ${c.name} ${c.type}${c.nullable ? '' : ' NOT NULL'}${c.primaryKey ? ' PRIMARY KEY' : ''}`,
      );
      migrationLines.push(
        `CREATE TABLE ${tableB.name} (\n${colDefs.join(',\n')}\n);`,
        '',
      );
    } else {
      // Check for column differences
      const colMapA = new Map<string, SchemaColumn>(
        tableA.columns.map((c: SchemaColumn) => [c.name.toLowerCase(), c]),
      );
      const colMapB = new Map<string, SchemaColumn>(
        tableB.columns.map((c: SchemaColumn) => [c.name.toLowerCase(), c]),
      );
      const colDiffs: ColumnDiff[] = [];

      for (const [colNameB, colB] of colMapB.entries()) {
        const colA = colMapA.get(colNameB);
        if (!colA) {
          colDiffs.push({
            name: colB.name,
            type: 'added',
            newType: colB.type,
            newNullable: colB.nullable,
          });
          columnsAdded++;
          migrationLines.push(
            `ALTER TABLE ${tableB.name} ADD COLUMN ${colB.name} ${colB.type}${colB.nullable ? '' : ' NOT NULL'};`,
          );
        } else if (
          colA.type.toLowerCase() !== colB.type.toLowerCase() ||
          colA.nullable !== colB.nullable
        ) {
          colDiffs.push({
            name: colB.name,
            type: 'modified',
            oldType: colA.type,
            newType: colB.type,
            oldNullable: colA.nullable,
            newNullable: colB.nullable,
          });
          columnsModified++;
          if (dialect === 'postgresql') {
            migrationLines.push(
              `ALTER TABLE ${tableB.name} ALTER COLUMN ${colB.name} TYPE ${colB.type};`,
            );
          } else if (dialect === 'mysql') {
            migrationLines.push(
              `ALTER TABLE ${tableB.name} MODIFY COLUMN ${colB.name} ${colB.type};`,
            );
          } else {
            migrationLines.push(
              `-- SQLite requires table recreation to alter column type for ${tableB.name}.${colB.name}`,
            );
          }
        }
      }

      for (const [colNameA, colA] of colMapA.entries()) {
        if (!colMapB.has(colNameA)) {
          colDiffs.push({
            name: colA.name,
            type: 'dropped',
            oldType: colA.type,
            oldNullable: colA.nullable,
          });
          columnsDropped++;
          migrationLines.push(
            `ALTER TABLE ${tableB.name} DROP COLUMN ${colA.name};`,
          );
        }
      }

      const pksA = tableA.columns
        .filter((c) => c.primaryKey)
        .map((c) => c.name)
        .join(',');
      const pksB = tableB.columns
        .filter((c) => c.primaryKey)
        .map((c) => c.name)
        .join(',');
      const pkChanged = pksA !== pksB;

      if (colDiffs.length > 0 || pkChanged) {
        tablesModified++;
        tableDiffs.push({
          tableName: tableB.name,
          status: 'modified',
          columnDiffs: colDiffs,
          primaryKeyChanged: pkChanged,
          foreignKeysAdded: [],
          foreignKeysDropped: [],
        });
      } else {
        tableDiffs.push({
          tableName: tableB.name,
          status: 'unchanged',
          columnDiffs: [],
          primaryKeyChanged: false,
          foreignKeysAdded: [],
          foreignKeysDropped: [],
        });
      }
    }
  }

  // 2. Check dropped tables (in A but not B)
  for (const [nameA, tableA] of mapA.entries()) {
    if (!mapB.has(nameA)) {
      tablesDropped++;
      const cols: ColumnDiff[] = tableA.columns.map((c: SchemaColumn) => ({
        name: c.name,
        type: 'dropped',
        oldType: c.type,
        oldNullable: c.nullable,
      }));
      columnsDropped += cols.length;

      tableDiffs.push({
        tableName: tableA.name,
        status: 'dropped',
        columnDiffs: cols,
        primaryKeyChanged: false,
        foreignKeysAdded: [],
        foreignKeysDropped: [],
      });

      migrationLines.push(`DROP TABLE ${tableA.name};`, '');
    }
  }

  // Generate Markdown report
  reportLines.push(
    `## Summary of Changes`,
    `- **Tables Added:** ${tablesAdded}`,
    `- **Tables Dropped:** ${tablesDropped}`,
    `- **Tables Modified:** ${tablesModified}`,
    `- **Columns Added:** ${columnsAdded}`,
    `- **Columns Dropped:** ${columnsDropped}`,
    `- **Columns Modified:** ${columnsModified}`,
    '',
    `## Detailed Changes by Table`,
  );

  for (const diff of tableDiffs) {
    if (diff.status === 'unchanged') continue;
    reportLines.push(
      `### Table: \`${diff.tableName}\` (${diff.status.toUpperCase()})`,
    );
    if (diff.columnDiffs.length > 0) {
      reportLines.push(
        '| Column | Change | Details |',
        '| :--- | :--- | :--- |',
      );
      for (const col of diff.columnDiffs) {
        if (col.type === 'added') {
          reportLines.push(`| \`${col.name}\` | Added | \`${col.newType}\` |`);
        } else if (col.type === 'dropped') {
          reportLines.push(
            `| \`${col.name}\` | Dropped | Prior type: \`${col.oldType}\` |`,
          );
        } else {
          reportLines.push(
            `| \`${col.name}\` | Modified | \`${col.oldType}\` &rarr; \`${col.newType}\` |`,
          );
        }
      }
      reportLines.push('');
    }
  }

  return {
    tables: tableDiffs,
    summary: {
      tablesAdded,
      tablesDropped,
      tablesModified,
      columnsAdded,
      columnsDropped,
      columnsModified,
      totalChanges:
        tablesAdded +
        tablesDropped +
        tablesModified +
        columnsAdded +
        columnsDropped +
        columnsModified,
    },
    migrationSql: migrationLines.join('\n').trim(),
    markdownReport: reportLines.join('\n').trim(),
  };
}
