import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SchemaHubTool, type SchemaHubTab } from '@/components/schema-hub-tool';
import { relatedToolsFor } from '@/lib/seo/related-tools';

export const revalidate = 86400;
export const dynamicParams = false;

const CANONICAL_ORIGIN = ['https:', '//', 'getopentools.com'].join('');

const TOOL_META: Record<SchemaHubTab, { title: string; description: string }> =
  {
    erd: {
      title:
        'SQL to ER Diagram — Mermaid, DBML & PlantUML Generator | OpenTools',
      description:
        'Generate interactive entity-relationship diagrams from SQL DDL: export Mermaid erDiagram, DBML, and PlantUML notation with instant browser preview.',
    },
    'erd-to-sql': {
      title:
        'Mermaid ERD to SQL DDL Generator — PostgreSQL, MySQL, SQLite | OpenTools',
      description:
        'Reverse diagram compiler: convert Mermaid erDiagram text models directly into executable CREATE TABLE SQL DDL for PostgreSQL, MySQL, and SQLite.',
    },
    'dialect-converter': {
      title:
        'SQL Dialect Converter — PostgreSQL, MySQL, SQLite, SQL Server | OpenTools',
      description:
        'Translate database DDL syntax between PostgreSQL, MySQL, SQLite, and SQL Server with accurate data type and constraint mappings.',
    },
    'orm-models': {
      title:
        'SQL DDL to ORM Models — Prisma Schema, Django & SQLAlchemy | OpenTools',
      description:
        'Transform database SQL DDL directly into code: generate Prisma schema models, Django models.py classes, and SQLAlchemy Declarative definitions.',
    },
    'data-dictionary': {
      title: 'Automated Data Dictionary Markdown Generator | OpenTools',
      description:
        'Compile SQL DDL into clean documentation-ready Markdown data dictionaries with tables, columns, data types, nullability, and primary keys.',
    },
    'schema-diff': {
      title: 'SQL Schema Diff & Migration Generator — Compare DDL | OpenTools',
      description:
        'Compare two SQL DDL database schemas: identify added, dropped, and modified tables or columns, and generate forward SQL migration scripts.',
    },
  };

export function generateStaticParams() {
  return (Object.keys(TOOL_META) as SchemaHubTab[]).map((tool) => ({ tool }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tool: string }>;
}): Promise<Metadata> {
  const { tool } = await params;
  const meta = TOOL_META[tool as SchemaHubTab];
  if (!meta) return {};
  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: `${CANONICAL_ORIGIN}/schema/${tool}`,
    },
  };
}

export default async function SchemaToolPage({
  params,
}: {
  params: Promise<{ tool: string }>;
}) {
  const { tool } = await params;
  if (!TOOL_META[tool as SchemaHubTab]) {
    notFound();
  }

  const related = relatedToolsFor(`/schema/${tool}`);
  return (
    <SchemaHubTool initialTab={tool as SchemaHubTab} relatedTools={related} />
  );
}
