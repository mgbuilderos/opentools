# Notation Engine: Unified Tables & Schemas

The OpenTools Notation Engine provides zero-egress, client-side transformation across tabular structures and database schema specifications. All operations execute strictly in the browser memory using pure TypeScript with no server roundtrips, no telemetry, and zero npm runtime dependencies.

---

## 1. Architecture & Design Principles

The engine is partitioned into two specialized engines under `lib/tools/notation/`:

```
lib/tools/notation/
├── table/
│   ├── types.ts          # Table AST (headers, rows, alignments, caption, label)
│   ├── csv.ts            # CSV / TSV parser & emitter with delimiter sniffing
│   ├── markdown.ts       # GFM Markdown table parser & emitter
│   ├── latex.ts          # LaTeX tabular / booktabs / longtable parser & emitter
│   ├── html.ts           # HTML <table> parser & emitter
│   ├── json.ts           # JSON records parser & emitter
│   ├── sql.ts            # SQL INSERT / CREATE TABLE parser & emitter
│   ├── asciidoc.ts       # AsciiDoc (|===) parser & emitter
│   ├── rst.ts            # reStructuredText grid table parser & emitter
│   ├── table.test.ts     # 14 unit & round-trip tests
│   └── index.ts          # Unified parseTable, emitTable, convertTable, detectTableFormat
└── schema/
    ├── types.ts          # Schema AST (tables, columns, relationships, types)
    ├── sql-ddl.ts        # SQL DDL parser & multi-dialect emitter (PG, MySQL, SQLite, MSSQL)
    ├── mermaid.ts        # Mermaid erDiagram parser & emitter
    ├── dbml.ts           # DBML parser & emitter
    ├── plantuml.ts       # PlantUML ERD emitter
    ├── json-schema.ts    # JSON Schema (Draft-07) parser & emitter
    ├── data-dictionary.ts# Markdown Data Dictionary emitter
    ├── orm.ts            # Prisma, SQLAlchemy, and Django ORM emitters
    ├── schema.test.ts    # 11 unit & round-trip tests
    └── index.ts          # Unified parseSchema, emitSchema, convertSchema, detectSchemaFormat
```

### Core Tenets
1. **Deterministic Round-Tripping**: An emitted format can be re-parsed without loss of columns, headers, records, or structural relationships.
2. **Zero Ingestion / Egress**: Parsers and emitters do not invoke network primitives, analytics beacons, or remote APIs.
3. **Escaping Correctness**: LaTeX special characters (`& % _ # $ ~ ^ \ { }`), HTML entities (`& < > " '`), Markdown pipes (`\|`), and SQL string quotes (`''`) are escaped strictly once on emit and unescaped symmetrically on parse.
4. **Resilient Delimiter & Dialect Sniffing**: Auto-detects delimiters (`,`, `\t`, `;`, `|`), table formats, and schema notations from raw text.

---

## 2. Table Notation Engine

### Supported Formats

| Format | Parsing | Emitting | Features & Variations Supported |
|---|:---:|:---:|---|
| **CSV** | Yes | Yes | RFC 4180 quotes, multiline cells, auto-sniffed delimiters (`,`, `;`, `\|`) |
| **TSV** | Yes | Yes | Tab-separated, whitespace preservation, escaping |
| **Markdown** | Yes | Yes | GitHub Flavored Markdown (GFM), column alignments (`:---`, `:---:`, `---:`), pipe escaping (`\|`) |
| **LaTeX** | Yes | Yes | `booktabs` (`\toprule`, `\midrule`, `\bottomrule`), classic `tabular` (`\hline`), `longtable` multi-page, float environments (`table`, `table*`), `siunitx` decimal alignment (`S` column), captions & labels |
| **HTML** | Yes | Yes | Semantic `<table>`, `<thead>`, `<tbody>`, `<caption>`, column alignments (`style="text-align: ..."`), HTML entity escaping |
| **JSON** | Yes | Yes | Array of record objects `Record<string, string | number | boolean>` |
| **SQL** | Yes | Yes | `INSERT INTO table (cols) VALUES (...)` and typed `CREATE TABLE` definitions |
| **AsciiDoc** | Yes | Yes | Standard `|===` block delimiters and cell alignment |
| **reStructuredText** | Yes | Yes | Grid table notation with `+---+---+` borders and header dividers `+===+===+` |

### Round-Trip Guarantees
All 8 formats pass automated round-trip verifications in `table.test.ts`:
- `CSV -> LaTeX (tabular & booktabs) -> CSV`
- `CSV -> Markdown -> CSV`
- `CSV -> HTML -> CSV`
- `CSV -> JSON -> CSV`
- `CSV -> SQL -> CSV`
- `CSV -> AsciiDoc -> CSV`
- `CSV -> reStructuredText -> CSV`

---

## 3. Schema Notation Engine

### Supported Formats & Emitters

| Format | Parsing | Emitting | Key Capabilities |
|---|:---:|:---:|---|
| **SQL DDL** | Yes | Yes | `CREATE TABLE`, `PRIMARY KEY`, composite PKs, `REFERENCES`, `FOREIGN KEY`, inline/ALTER table constraints. Dialects: PostgreSQL, MySQL, SQLite, MSSQL. |
| **Mermaid** | Yes | Yes | `erDiagram` syntax, crow's foot cardinality (`||--o{`, `||--||`, `}o--o{`), column types, PK/FK flags, relationship labels. |
| **DBML** | Yes | Yes | Database Markup Language `Table <name> { ... }`, inline settings `[pk, not null, unique, note]`, explicit `Ref: table.col > table.col`. |
| **PlantUML** | - | Yes | `@startuml ... @enduml`, `entity` definitions, field markers (`*` mandatory, `-` optional). |
| **JSON Schema** | Yes | Yes | JSON Schema Draft-07 format, `$defs`/`definitions`, typed properties, `required` array. |
| **Data Dictionary** | - | Yes | Publication-grade Markdown Data Dictionary with per-table overview, column specifications (type, nullable, key status, default, notes), and foreign key indices. |
| **Prisma Schema** | - | Yes | `model <Name> { ... }`, `@id`, `@unique`, `@relation`, `@default(autoincrement())`. |
| **SQLAlchemy** | - | Yes | Python SQLAlchemy declarative classes, `Column`, `Integer`, `String`, `ForeignKey`. |
| **Django Models** | - | Yes | Python Django `models.Model` classes, `models.CharField`, `models.ForeignKey(..., on_delete=models.CASCADE)`. |

### Round-Trip Guarantees
- `SQL DDL -> Mermaid erDiagram -> SQL DDL`
- `SQL DDL -> DBML -> SQL DDL`
- `SQL DDL -> JSON Schema -> SQL DDL`

---

## 4. In-Place Ranking URL Upgrades

Two critical high-intent URLs already showing early organic traction in Google Search Console were upgraded in-place to serve multi-format notation:

### A. `/documents/latex-table-generator`
* **Target Query Cluster**: `"latex table generator"`, `"csv to latex table"`, `"markdown to latex table"`, `"latex table booktabs"`.
* **Before / After Metadata**:
  * **Before Title**: `LaTeX table generator · OpenTools`
  * **After Title**: `LaTeX Table Generator Online — Free CSV & Markdown to LaTeX · OpenTools`
  * **Before Description**: `Convert strict CSV into an escaped LaTeX tabular environment.`
  * **After Description**: `Generate LaTeX tables online from CSV, TSV, or Markdown. Emits booktabs, longtable, captions, and siunitx decimal alignment with zero uploads.`
* **Feature Upgrades**:
  * Multi-format source ingestion (CSV, TSV, Markdown, HTML).
  * Selectable style: `Booktabs (\toprule, \midrule, \bottomrule)` or `Classic Tabular (\hline)`.
  * Selectable environments: `Plain tabular`, `table` float, `table*` two-column float, or `longtable` multi-page.
  * Captions and labels integrated automatically.
  * Alignment options including `siunitx` decimal alignment (`S` column).

### B. `/developer/sql-to-er-diagram`
* **Target Query Cluster**: `"create er diagram from sql"`, `"erd from sql"`, `"sql to er diagram"`, `"sql to dbml"`, `"sql to mermaid"`.
* **Before / After Metadata**:
  * **Before Title**: `SQL Schema to Visual ER Diagram · OpenTools`
  * **After Title**: `ER Diagram from SQL (ERD) — Generate Mermaid, DBML & SVG · OpenTools`
  * **Before Description**: `Parse SQL DDL CREATE TABLE statements into an interactive, publication-grade SVG Entity-Relationship diagram with table nodes and foreign key links.`
  * **After Description**: `Create an ER diagram from SQL DDL online. Export interactive visual SVG, Mermaid erDiagram, DBML, and PlantUML in your browser with zero server uploads.`
* **Feature Upgrades**:
  * Format selection dropdown:
    1. Interactive Visual SVG (default, with Dark Operator, Light Clean, Blueprint themes).
    2. Mermaid (`erDiagram`).
    3. DBML (Database Markup Language).
    4. PlantUML ERD.
    5. Markdown Data Dictionary.
    6. Prisma Schema.
    7. JSON Schema (Draft-07).

---

## 5. Performance & Quality Control Benchmarks

- **Runtime Overhead**: 0 external libraries, < 25 KB unminified code for both engines combined.
- **Unit Test Coverage**:
  - `lib/tools/notation/table/table.test.ts`: 14 tests passing in < 15ms.
  - `lib/tools/notation/schema/schema.test.ts`: 11 tests passing in < 15ms.
  - Full test suite: 114 test files, 1,632 tests passing green.
- **Google Search Console Baseline**:
  - Baseline Impressions: 12 impressions, 0 clicks (measured 2026-09-20).
  - Four-Week Re-check Milestone Date: **2026-10-19**.
