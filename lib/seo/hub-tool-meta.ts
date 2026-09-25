import type { LatexHubTab } from '@/components/latex-hub-tool';
import type { SchemaHubTab } from '@/components/schema-hub-tool';

/*
  Title and description for every tab of the LaTeX and schema hubs.

  These maps were written inline in `app/latex/[tool]/page.tsx` and
  `app/schema/[tool]/page.tsx`, where no test could read them -- and all
  twelve titles ended in `| OpenTools` before `app/layout.tsx` appended
  ` · OpenTools` to them as well, so the site was named twice and
  `Mermaid ERD to SQL DDL Generator` was cut off in results by the repetition.
  Moved here so `lib/seo/meta-lengths.test.ts` measures the strings the pages
  ship, and so the suffix is stated in one place: the layout.
*/

export interface HubToolMeta {
  title: string;
  description: string;
}

export const LATEX_TOOL_META: Readonly<Record<LatexHubTab, HubToolMeta>> = {
  'table-generator': {
    title: 'Table Generator — LaTeX, Markdown, HTML & CSV',
    description:
      'Convert tables between 8 technical formats at once: LaTeX (booktabs & longtable), Markdown, HTML, CSV, TSV, JSON, SQL, and AsciiDoc.',
  },
  'table-reader': {
    title: 'LaTeX Table to CSV, Excel & Markdown Reader',
    description:
      'Reverse extraction tool: parse LaTeX tabular and booktabs code into clean structured CSV, Markdown, JSON, and TSV tables in your browser.',
  },
  bibtex: {
    title: 'BibTeX Workbench — Deduplicate, Clean & Format',
    description:
      'Validate required fields, deduplicate by DOI and title, normalise page ranges (10--20), strip Google Scholar junk, and format clean .bib files.',
  },
  'word-count': {
    title: 'LaTeX Word Count — Accurate Prose Counter',
    description:
      'Accurate journal word count for LaTeX documents: separates prose body words from headers, captions, and equations without counting markup.',
  },
  symbols: {
    title: 'LaTeX Symbol Finder — Math Symbols & Greek',
    description:
      'Searchable LaTeX symbol directory: Greek letters, operators, relations, arrows, and delimiters with one-click command copy, all in your browser.',
  },
  equations: {
    title: 'LaTeX Matrix & Equation Builder',
    description:
      'Interactive visual matrix and equation builder: generate pmatrix, bmatrix, vmatrix, piecewise cases, and aligned derivations in your browser.',
  },
};

export const SCHEMA_TOOL_META: Readonly<Record<SchemaHubTab, HubToolMeta>> = {
  erd: {
    title: 'SQL to ER Diagram — Mermaid, DBML & PlantUML',
    description:
      'Generate interactive entity-relationship diagrams from SQL DDL: export Mermaid erDiagram, DBML, and PlantUML notation with instant browser preview.',
  },
  'erd-to-sql': {
    title: 'Mermaid ERD to SQL DDL — Postgres, MySQL, SQLite',
    description:
      'Reverse diagram compiler: convert Mermaid erDiagram text models directly into executable CREATE TABLE SQL DDL for PostgreSQL, MySQL, and SQLite.',
  },
  'dialect-converter': {
    title: 'SQL Dialect Converter — Postgres, MySQL, SQLite',
    description:
      'Translate database DDL syntax between PostgreSQL, MySQL, SQLite, and SQL Server with accurate data type and constraint mappings, in your browser.',
  },
  'orm-models': {
    title: 'SQL DDL to Prisma, Django & SQLAlchemy Models',
    description:
      'Transform database SQL DDL directly into code: generate Prisma schema models, Django models.py classes, and SQLAlchemy Declarative definitions.',
  },
  'data-dictionary': {
    title: 'Data Dictionary Markdown Generator',
    description:
      'Compile SQL DDL into clean documentation-ready Markdown data dictionaries with tables, columns, data types, nullability, and primary keys.',
  },
  'schema-diff': {
    title: 'SQL Schema Diff & Migration Generator',
    description:
      'Compare two SQL DDL database schemas: identify added, dropped, and modified tables or columns, and generate forward SQL migration scripts.',
  },
};

/** The hub tab a `/latex/...` or `/schema/...` route serves, if any. */
export function hubToolMeta(route: string): HubToolMeta | undefined {
  const [, hub, tool, ...rest] = route.split('/');
  if (rest.length > 0 || !tool) return undefined;
  if (hub === 'latex')
    return LATEX_TOOL_META[tool as LatexHubTab] as HubToolMeta | undefined;
  if (hub === 'schema')
    return SCHEMA_TOOL_META[tool as SchemaHubTab] as HubToolMeta | undefined;
  return undefined;
}
