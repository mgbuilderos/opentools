import type { TableFormat } from '@/lib/tools/notation/table/types';

/**
 * Human labels for the notations `lib/tools/notation/table` can parse and
 * emit. Kept beside the embed rather than in the engine because the engine has
 * no business knowing what a dropdown says, and `Record<TableFormat, string>`
 * means adding a format to the engine without labelling it here fails
 * typecheck rather than rendering a raw slug to a stranger's visitors.
 */
export const TABLE_FORMAT_LABELS: Record<TableFormat, string> = {
  csv: 'CSV',
  tsv: 'TSV',
  markdown: 'Markdown',
  latex: 'LaTeX',
  html: 'HTML',
  json: 'JSON',
  sql: 'SQL',
  asciidoc: 'AsciiDoc',
  rst: 'reStructuredText',
  yaml: 'YAML',
  xml: 'XML',
};

export const TABLE_FORMATS = Object.keys(
  TABLE_FORMAT_LABELS,
) as readonly TableFormat[];
