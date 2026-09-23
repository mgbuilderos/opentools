import type { Metadata } from 'next';
import { SchemaHubTool } from '@/components/schema-hub-tool';
import { relatedToolsFor } from '@/lib/seo/related-tools';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Schema Architecture & Data Modeling Hub | OpenTools',
  description:
    'Browser database architecture suite: SQL to ER diagram (Mermaid, DBML, PlantUML), ERD to DDL, SQL dialect conversion, ORM models (Prisma, Django, SQLAlchemy), data dictionary, and schema diffing.',
  alternates: {
    canonical: '/schema',
  },
};

export default function SchemaHubPage() {
  const related = relatedToolsFor('/schema');
  return <SchemaHubTool initialTab="erd" relatedTools={related} />;
}
