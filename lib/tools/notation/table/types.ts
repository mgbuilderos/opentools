export type TableAlignment = 'left' | 'center' | 'right' | 'decimal';

export type TableFormat =
  | 'csv'
  | 'tsv'
  | 'markdown'
  | 'latex'
  | 'html'
  | 'json'
  | 'sql'
  | 'asciidoc'
  | 'rst'
  | 'yaml'
  | 'xml';

export interface Table {
  headers: string[];
  rows: string[][];
  alignments?: TableAlignment[];
  caption?: string;
  label?: string;
}

export interface LatexEmitOptions {
  style?: 'booktabs' | 'tabular';
  environment?: 'table' | 'table*' | 'longtable' | 'plain';
  placement?: string;
  caption?: string;
  label?: string;
  useSiunitx?: boolean;
}

export interface SqlEmitOptions {
  tableName?: string;
  dialect?: 'postgresql' | 'mysql' | 'sqlite' | 'mssql';
  includeCreateTable?: boolean;
}

export interface JsonEmitOptions {
  mode?: 'objects' | 'arrays';
  pretty?: boolean;
}

export interface TableEmitOptions {
  latex?: LatexEmitOptions;
  sql?: SqlEmitOptions;
  json?: JsonEmitOptions;
  delimiter?: string;
}
