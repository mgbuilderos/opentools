export interface SchemaColumn {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  unique?: boolean;
  default?: string;
  comment?: string;
}

export interface SchemaTable {
  name: string;
  columns: SchemaColumn[];
  comment?: string;
}

export type RelationKind = 'one-to-one' | 'one-to-many' | 'many-to-many';

export interface SchemaRelation {
  fromTable: string;
  toTable: string;
  fromColumn: string;
  toColumn: string;
  kind?: RelationKind;
  label?: string;
}

export interface Schema {
  tables: SchemaTable[];
  relations: SchemaRelation[];
}

export type SqlDialect = 'postgresql' | 'mysql' | 'sqlite' | 'mssql';

export type SchemaFormat =
  | 'sql-ddl'
  | 'mermaid'
  | 'dbml'
  | 'plantuml'
  | 'json-schema'
  | 'data-dictionary'
  | 'prisma'
  | 'sqlalchemy'
  | 'django';

export interface SchemaEmitOptions {
  dialect?: SqlDialect;
  naming?: 'preserve' | 'snake_case' | 'camelCase';
  orm?: 'prisma' | 'sqlalchemy' | 'django';
}
