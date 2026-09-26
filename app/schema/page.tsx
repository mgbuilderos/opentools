import type { Metadata } from 'next';
import { SchemaHubTool } from '@/components/schema-hub-tool';
import { relatedToolsFor } from '@/lib/seo/related-tools';
import { ToolJsonLd } from '@/components/tool-json-ld';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Schema Architecture & Data Modeling Hub',
  description:
    'A browser database architecture suite: SQL to ER diagram, ERD to DDL, dialect conversion, ORM models, data dictionaries and schema diffing.',
  alternates: {
    canonical: '/schema',
  },
};

export default function SchemaHubPage() {
  const related = relatedToolsFor('/schema');
  return (
    <>
      <ToolJsonLd route="/schema" meta={metadata} />
      <SchemaHubTool initialTab="erd" relatedTools={related} />
    </>
  );
}
