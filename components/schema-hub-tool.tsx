'use client';

import {
  ArrowLeftRight,
  BookOpen,
  Check,
  Copy,
  Database,
  Download,
  FileCode,
  GitCompare,
  LockKeyhole,
  Sparkles,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import { RelatedTools } from '@/components/related-tools';
import { ToolExplainerSection } from '@/components/tool-explainer';
import { Button } from '@/components/ui/button';
import { announceCompletion } from '@/lib/completion';
import type { RelatedTool } from '@/lib/seo/related-tools';
import {
  convertMermaidErDiagramToSql,
  convertSchema,
  type SqlDialect,
} from '@/lib/tools/notation/schema';
import { diffSchemas, type SchemaDiffResult } from '@/lib/tools/schema-diff';

export type SchemaHubTab =
  | 'erd'
  | 'erd-to-sql'
  | 'dialect-converter'
  | 'orm-models'
  | 'data-dictionary'
  | 'schema-diff';

interface SchemaHubToolProps {
  initialTab?: SchemaHubTab;
  relatedTools?: readonly RelatedTool[];
}

const TABS: readonly {
  id: SchemaHubTab;
  label: string;
  desc: string;
  icon: typeof Database;
}[] = [
  {
    id: 'erd',
    label: 'SQL &rarr; ER Diagram',
    desc: 'Mermaid, DBML, PlantUML',
    icon: Database,
  },
  {
    id: 'erd-to-sql',
    label: 'ERD &rarr; SQL DDL',
    desc: 'Mermaid to CREATE TABLE',
    icon: FileCode,
  },
  {
    id: 'dialect-converter',
    label: 'SQL Dialect Converter',
    desc: 'PostgreSQL, MySQL, SQLite',
    icon: ArrowLeftRight,
  },
  {
    id: 'orm-models',
    label: 'DDL &rarr; ORM Models',
    desc: 'Prisma, Django, SQLAlchemy',
    icon: FileCode,
  },
  {
    id: 'data-dictionary',
    label: 'Data Dictionary',
    desc: 'Markdown docs generator',
    icon: BookOpen,
  },
  {
    id: 'schema-diff',
    label: 'Schema Diff & Migration',
    desc: 'Compare & migrate DDL',
    icon: GitCompare,
  },
];

export function SchemaHubTool({
  initialTab = 'erd',
  relatedTools = [],
}: SchemaHubToolProps) {
  const [activeTab, setActiveTab] = useState<SchemaHubTab>(initialTab);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = useCallback((text: string, key: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }, []);

  // --------------------------------------------------------------------------
  // Samples
  // --------------------------------------------------------------------------
  const sampleSqlDdl = `CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE teams (
  id SERIAL PRIMARY KEY,
  team_name VARCHAR(100) NOT NULL,
  plan VARCHAR(50) DEFAULT 'starter'
);

CREATE TABLE memberships (
  user_id INTEGER REFERENCES users(id),
  team_id INTEGER REFERENCES teams(id),
  role VARCHAR(50) DEFAULT 'member',
  PRIMARY KEY (user_id, team_id)
);`;

  const sampleMermaidEr = `erDiagram
  USER ||--o{ ORDER : places
  USER {
    int id PK
    string email
    string name
  }
  ORDER ||--|{ ORDER_ITEM : contains
  ORDER {
    int id PK
    int user_id FK
    decimal total_amount
    date placed_at
  }
  ORDER_ITEM {
    int id PK
    int order_id FK
    int product_id
    int quantity
  }`;

  // --------------------------------------------------------------------------
  // Tab 1: SQL to ERD (Mermaid, DBML, PlantUML)
  // --------------------------------------------------------------------------
  const [erdSqlInput, setErdSqlInput] = useState<string>(sampleSqlDdl);
  const [erdFormat, setErdFormat] = useState<'mermaid' | 'dbml' | 'plantuml'>(
    'mermaid',
  );

  const erdResult = useMemo(() => {
    try {
      return convertSchema(erdSqlInput, 'sql-ddl', erdFormat);
    } catch (err) {
      return `/* Error parsing DDL: ${err instanceof Error ? err.message : String(err)} */`;
    }
  }, [erdSqlInput, erdFormat]);

  // --------------------------------------------------------------------------
  // Tab 2: ERD to SQL
  // --------------------------------------------------------------------------
  const [erdInput, setErdInput] = useState<string>(sampleMermaidEr);
  const [erdSqlDialect, setErdSqlDialect] = useState<
    'postgresql' | 'mysql' | 'sqlite'
  >('postgresql');

  const erdToSqlResult = useMemo(() => {
    try {
      return convertMermaidErDiagramToSql(erdInput, { dialect: erdSqlDialect });
    } catch (err) {
      return `-- Error converting Mermaid to SQL: ${err instanceof Error ? err.message : String(err)}`;
    }
  }, [erdInput, erdSqlDialect]);

  // --------------------------------------------------------------------------
  // Tab 3: SQL Dialect Converter
  // --------------------------------------------------------------------------
  const [dialectSqlInput, setDialectSqlInput] = useState<string>(sampleSqlDdl);
  const [targetDialect, setTargetDialect] = useState<SqlDialect>('mysql');

  const dialectResult = useMemo(() => {
    try {
      return convertSchema(dialectSqlInput, 'sql-ddl', 'sql-ddl', {
        dialect: targetDialect,
      });
    } catch (err) {
      return `-- Error converting dialect: ${err instanceof Error ? err.message : String(err)}`;
    }
  }, [dialectSqlInput, targetDialect]);

  // --------------------------------------------------------------------------
  // Tab 4: DDL to ORM Models (Prisma, Django, SQLAlchemy)
  // --------------------------------------------------------------------------
  const [ormSqlInput, setOrmSqlInput] = useState<string>(sampleSqlDdl);
  const [ormTarget, setOrmTarget] = useState<
    'prisma' | 'django' | 'sqlalchemy'
  >('prisma');

  const ormResult = useMemo(() => {
    try {
      return convertSchema(ormSqlInput, 'sql-ddl', ormTarget);
    } catch (err) {
      return `// Error generating ORM: ${err instanceof Error ? err.message : String(err)}`;
    }
  }, [ormSqlInput, ormTarget]);

  // --------------------------------------------------------------------------
  // Tab 5: Data Dictionary Generator
  // --------------------------------------------------------------------------
  const [dictSqlInput, setDictSqlInput] = useState<string>(sampleSqlDdl);

  const dictResult = useMemo(() => {
    try {
      return convertSchema(dictSqlInput, 'sql-ddl', 'data-dictionary');
    } catch (err) {
      return `Failed to generate data dictionary: ${err instanceof Error ? err.message : String(err)}`;
    }
  }, [dictSqlInput]);

  // --------------------------------------------------------------------------
  // Tab 6: Schema Diff
  // --------------------------------------------------------------------------
  const sampleDiffV1 = `CREATE TABLE customers (
  id INT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL
);

CREATE TABLE legacy_sessions (
  session_id VARCHAR(64) PRIMARY KEY,
  created_at TIMESTAMP
);`;

  const sampleDiffV2 = `CREATE TABLE customers (
  id INT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  tier VARCHAR(20) DEFAULT 'bronze'
);

CREATE TABLE invoices (
  id INT PRIMARY KEY,
  customer_id INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  paid_at TIMESTAMP
);`;

  const [diffDdlA, setDiffDdlA] = useState<string>(sampleDiffV1);
  const [diffDdlB, setDiffDdlB] = useState<string>(sampleDiffV2);
  const [diffDialect, setDiffDialect] = useState<
    'postgresql' | 'mysql' | 'sqlite'
  >('postgresql');

  const diffResult: SchemaDiffResult | null = useMemo(() => {
    try {
      return diffSchemas(diffDdlA, diffDdlB, diffDialect);
    } catch {
      return null;
    }
  }, [diffDdlA, diffDdlB, diffDialect]);

  const handleDownloadMigration = () => {
    if (!diffResult) return;
    const blob = new Blob([diffResult.migrationSql], {
      type: 'text/sql;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `schema_migration_${diffDialect}.sql`;
    a.click();
    URL.revokeObjectURL(url);
    announceCompletion({
      operation: 'Generate Schema Migration',
      durationMs: 30,
      summary: `Generated migration script for ${diffResult.summary.totalChanges} detected schema changes.`,
      metrics: [
        {
          label: 'Tables Added',
          value: String(diffResult.summary.tablesAdded),
        },
        {
          label: 'Columns Added',
          value: String(diffResult.summary.columnsAdded),
        },
      ],
    });
  };

  return (
    <AppShell currentToolId="schema-hub" currentGroupId="developer-files">
      <section
        id="tool"
        tabIndex={-1}
        className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
      >
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">
                <Database className="h-3.5 w-3.5" />
                Data Architecture &amp; Modeling Hub
              </span>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                Schema Architecture &amp; Modeling Hub
              </h1>
              <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">
                Database engineering in your browser: SQL to ER diagrams, ERD to
                DDL, multi-dialect translation, ORM code generation (Prisma,
                Django, SQLAlchemy), automated data dictionaries, and schema
                diffing.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="/developer/sql-to-er-diagram"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
              >
                <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                Dedicated SQL to ERD Tool &rarr;
              </a>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <LockKeyhole className="h-3.5 w-3.5 text-success" />
            <span>
              <strong>100% Client-Side Privacy:</strong> Schema DDL and database
              structures never leave browser memory. Operations execute entirely
              in local browser tab memory.
            </span>
          </div>
        </div>

        {/* Navigation Tabs Header */}
        <div className="mb-6 border-b border-border">
          <nav
            className="-mb-px flex flex-wrap gap-2 sm:gap-4"
            aria-label="Schema Tools Navigation"
          >
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-xs font-medium transition sm:text-sm ${
                    isActive
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* ================================================================== */}
        {/* Tab 1: SQL to ERD */}
        {/* ================================================================== */}
        {activeTab === 'erd' && (
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    SQL DDL &rarr; Diagram Notations
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Parse CREATE TABLE definitions and emit Mermaid erDiagram,
                    DBML, or PlantUML code.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {(['mermaid', 'dbml', 'plantuml'] as const).map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => setErdFormat(fmt)}
                        className={`rounded px-2.5 py-1 text-xs font-medium transition ${
                          erdFormat === fmt
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {fmt.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div>
                  <label
                    htmlFor="erd-sql-input"
                    className="block text-xs font-semibold text-foreground"
                  >
                    SQL DDL Input (CREATE TABLE statements)
                  </label>
                  <textarea
                    id="erd-sql-input"
                    rows={12}
                    value={erdSqlInput}
                    onChange={(e) => setErdSqlInput(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-border bg-muted p-3 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-hidden"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">
                      Diagram Code Output ({erdFormat.toUpperCase()})
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(erdResult, 'erd-output')}
                      className="rounded border border-border bg-card px-2 py-1 text-xs text-foreground shadow-xs hover:bg-muted"
                    >
                      {copiedKey === 'erd-output' ? (
                        <span className="inline-flex items-center gap-1 text-success">
                          <Check className="h-3 w-3" /> Copied
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <Copy className="h-3 w-3" /> Copy
                        </span>
                      )}
                    </button>
                  </div>
                  <pre className="mt-2 h-[240px] overflow-auto rounded-lg border border-border bg-muted p-3 font-mono text-xs text-foreground">
                    {erdResult}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* Tab 2: ERD to SQL */}
        {/* ================================================================== */}
        {activeTab === 'erd-to-sql' && (
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    Mermaid ERD &rarr; SQL DDL
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Convert Mermaid `erDiagram` syntax directly to PostgreSQL,
                    MySQL, or SQLite CREATE TABLE statements.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    Dialect:
                  </span>
                  <select
                    value={erdSqlDialect}
                    onChange={(e) =>
                      setErdSqlDialect(
                        e.target.value as 'postgresql' | 'mysql' | 'sqlite',
                      )
                    }
                    className="rounded border border-border bg-card px-2.5 py-1 text-xs text-foreground"
                  >
                    <option value="postgresql">PostgreSQL</option>
                    <option value="mysql">MySQL</option>
                    <option value="sqlite">SQLite</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div>
                  <label
                    htmlFor="erd-input"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Mermaid erDiagram Input
                  </label>
                  <textarea
                    id="erd-input"
                    rows={12}
                    value={erdInput}
                    onChange={(e) => setErdInput(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-border bg-muted p-3 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-hidden"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">
                      Generated SQL DDL
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(erdToSqlResult, 'erd-sql-output')
                      }
                      className="rounded border border-border bg-card px-2 py-1 text-xs text-foreground shadow-xs hover:bg-muted"
                    >
                      {copiedKey === 'erd-sql-output' ? (
                        <span className="inline-flex items-center gap-1 text-success">
                          <Check className="h-3 w-3" /> Copied
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <Copy className="h-3 w-3" /> Copy
                        </span>
                      )}
                    </button>
                  </div>
                  <pre className="mt-2 h-[240px] overflow-auto rounded-lg border border-border bg-muted p-3 font-mono text-xs text-foreground">
                    {erdToSqlResult}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* Tab 3: Dialect Converter */}
        {/* ================================================================== */}
        {activeTab === 'dialect-converter' && (
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-3">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    SQL Dialect Converter
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Translate database schemas across PostgreSQL, MySQL, SQLite,
                    and SQL Server.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">Target Dialect:</span>
                  <select
                    value={targetDialect}
                    onChange={(e) =>
                      setTargetDialect(e.target.value as SqlDialect)
                    }
                    className="rounded border border-border bg-card px-2.5 py-1 text-xs text-foreground"
                  >
                    <option value="postgresql">PostgreSQL</option>
                    <option value="mysql">MySQL</option>
                    <option value="sqlite">SQLite</option>
                    <option value="mssql">SQL Server (MSSQL)</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div>
                  <label
                    htmlFor="dialect-sql-input"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Source SQL DDL
                  </label>
                  <textarea
                    id="dialect-sql-input"
                    rows={12}
                    value={dialectSqlInput}
                    onChange={(e) => setDialectSqlInput(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-border bg-muted p-3 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-hidden"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">
                      Converted {targetDialect.toUpperCase()} DDL
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(dialectResult, 'dialect-output')
                      }
                      className="rounded border border-border bg-card px-2 py-1 text-xs text-foreground shadow-xs hover:bg-muted"
                    >
                      {copiedKey === 'dialect-output' ? (
                        <span className="inline-flex items-center gap-1 text-success">
                          <Check className="h-3 w-3" /> Copied
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <Copy className="h-3 w-3" /> Copy
                        </span>
                      )}
                    </button>
                  </div>
                  <pre className="mt-2 h-[240px] overflow-auto rounded-lg border border-border bg-muted p-3 font-mono text-xs text-foreground">
                    {dialectResult}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* Tab 4: DDL to ORM Models */}
        {/* ================================================================== */}
        {activeTab === 'orm-models' && (
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-3">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    DDL &rarr; ORM Code Generator
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Instantly generate Prisma Schema, Django Models, or
                    SQLAlchemy classes from SQL DDL.
                  </p>
                </div>
                <div className="flex gap-1">
                  {(['prisma', 'django', 'sqlalchemy'] as const).map((orm) => (
                    <button
                      key={orm}
                      type="button"
                      onClick={() => setOrmTarget(orm)}
                      className={`rounded px-2.5 py-1 text-xs font-medium transition ${
                        ormTarget === orm
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {orm.charAt(0).toUpperCase() + orm.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div>
                  <label
                    htmlFor="orm-sql-input"
                    className="block text-xs font-semibold text-foreground"
                  >
                    SQL DDL Input
                  </label>
                  <textarea
                    id="orm-sql-input"
                    rows={12}
                    value={ormSqlInput}
                    onChange={(e) => setOrmSqlInput(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-border bg-muted p-3 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-hidden"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">
                      {ormTarget.toUpperCase()} Output
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(ormResult, 'orm-output')}
                      className="rounded border border-border bg-card px-2 py-1 text-xs text-foreground shadow-xs hover:bg-muted"
                    >
                      {copiedKey === 'orm-output' ? (
                        <span className="inline-flex items-center gap-1 text-success">
                          <Check className="h-3 w-3" /> Copied
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <Copy className="h-3 w-3" /> Copy
                        </span>
                      )}
                    </button>
                  </div>
                  <pre className="mt-2 h-[240px] overflow-auto rounded-lg border border-border bg-muted p-3 font-mono text-xs text-foreground">
                    {ormResult}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* Tab 5: Data Dictionary */}
        {/* ================================================================== */}
        {activeTab === 'data-dictionary' && (
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-3">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    Automated Data Dictionary Generator
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Generates clean, documentation-ready Markdown tables
                    documenting all database tables, columns, types, and
                    constraints.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(dictResult, 'dict-output')}
                  className="text-xs"
                >
                  {copiedKey === 'dict-output' ? (
                    <Check className="mr-1 h-3.5 w-3.5 text-success" />
                  ) : (
                    <Copy className="mr-1 h-3.5 w-3.5" />
                  )}
                  Copy Markdown
                </Button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div>
                  <label
                    htmlFor="dict-sql-input"
                    className="block text-xs font-semibold text-foreground"
                  >
                    SQL DDL Input
                  </label>
                  <textarea
                    id="dict-sql-input"
                    rows={14}
                    value={dictSqlInput}
                    onChange={(e) => setDictSqlInput(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-border bg-muted p-3 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-hidden"
                  />
                </div>

                <div>
                  <span className="block text-xs font-semibold text-foreground">
                    Markdown Data Dictionary
                  </span>
                  <pre className="mt-2 h-[290px] overflow-auto rounded-lg border border-border bg-muted p-3 font-mono text-xs text-foreground">
                    {dictResult}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* Tab 6: Schema Diff */}
        {/* ================================================================== */}
        {activeTab === 'schema-diff' && (
          <div className="space-y-6">
            {/* Metric Tiles */}
            {diffResult && (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-6">
                <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                    Tables Added
                  </span>
                  <p className="mt-1 text-2xl font-bold text-foreground">
                    {diffResult.summary.tablesAdded}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
                  <span className="text-[11px] font-semibold text-destructive uppercase">
                    Tables Dropped
                  </span>
                  <p className="mt-1 text-2xl font-bold text-destructive">
                    {diffResult.summary.tablesDropped}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                    Tables Modified
                  </span>
                  <p className="mt-1 text-2xl font-bold text-foreground">
                    {diffResult.summary.tablesModified}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                    Columns Added
                  </span>
                  <p className="mt-1 text-2xl font-bold text-foreground">
                    {diffResult.summary.columnsAdded}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
                  <span className="text-[11px] font-semibold text-destructive uppercase">
                    Columns Dropped
                  </span>
                  <p className="mt-1 text-2xl font-bold text-destructive">
                    {diffResult.summary.columnsDropped}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                    Columns Modified
                  </span>
                  <p className="mt-1 text-2xl font-bold text-foreground">
                    {diffResult.summary.columnsModified}
                  </p>
                </div>
              </div>
            )}

            {/* Dialect Selector */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
              <span className="text-xs font-semibold text-foreground">
                Target Database Dialect
              </span>
              <div className="flex items-center gap-2">
                <select
                  value={diffDialect}
                  onChange={(e) =>
                    setDiffDialect(
                      e.target.value as 'postgresql' | 'mysql' | 'sqlite',
                    )
                  }
                  className="rounded border border-border bg-card px-2.5 py-1 text-xs text-foreground"
                >
                  <option value="postgresql">PostgreSQL</option>
                  <option value="mysql">MySQL</option>
                  <option value="sqlite">SQLite</option>
                </select>
              </div>
            </div>

            {/* Inputs: Schema A vs Schema B */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                  Baseline Schema (V1)
                </span>
                <textarea
                  rows={8}
                  value={diffDdlA}
                  onChange={(e) => setDiffDdlA(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-border bg-muted p-3 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-hidden"
                />
              </div>

              <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                  Target Schema (V2)
                </span>
                <textarea
                  rows={8}
                  value={diffDdlB}
                  onChange={(e) => setDiffDdlB(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-border bg-muted p-3 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-hidden"
                />
              </div>
            </div>

            {/* Migration SQL Output */}
            {diffResult && (
              <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-3">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">
                      Generated Migration Script
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Forward SQL migration to update Schema V1 &rarr; V2.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        copyToClipboard(diffResult.migrationSql, 'diff-sql')
                      }
                      className="text-xs"
                    >
                      {copiedKey === 'diff-sql' ? (
                        <Check className="mr-1 h-3.5 w-3.5 text-success" />
                      ) : (
                        <Copy className="mr-1 h-3.5 w-3.5" />
                      )}
                      Copy SQL
                    </Button>
                    <Button
                      size="sm"
                      data-receipt-download
                      onClick={handleDownloadMigration}
                    >
                      <Download className="mr-1 h-3.5 w-3.5" />
                      Download .sql
                    </Button>
                  </div>
                </div>

                <pre className="mt-4 h-[220px] overflow-auto rounded-lg border border-border bg-muted p-3 font-mono text-xs text-foreground">
                  {diffResult.migrationSql}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Tool Explainer */}
        <div className="mt-16">
          <ToolExplainerSection
            toolId={activeTab}
            toolName={
              TABS.find((t) => t.id === activeTab)?.label ?? 'Schema Tool'
            }
          />
        </div>

        {/* Related Tools */}
        {relatedTools.length > 0 && (
          <div className="mt-16 border-t border-border pt-8">
            <RelatedTools tools={relatedTools} />
          </div>
        )}
      </section>
    </AppShell>
  );
}
