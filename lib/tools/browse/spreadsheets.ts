// Generated from `toolSubsectionsForGroup` -- see lib/tools/browse.ts for why,
// and browse.test.ts, which fails if this file drifts from the catalogue.
import type { BrowseSection } from '../browse';

export const SECTIONS: readonly BrowseSection[] = [
  {
    id: 'spreadsheets',
    title: 'Spreadsheets & data',
    description: 'JSON, CSV, Excel, and tabular data cleanup.',
    destinations: [
      {
        id: 'json-format',
        name: 'JSON formatter',
        description:
          'Validate, format, minify, or sort JSON without sending it away.',
        href: '/data/json',
        workspaceId: 'json-format',
      },
      {
        id: 'csv-to-json',
        name: 'CSV to JSON',
        description: 'Turn quoted CSV rows into structured JSON in this tab.',
        href: '/data/csv-to-json',
        workspaceId: 'csv-to-json',
      },
      {
        id: 'spreadsheet-workbench:csv-viewer',
        name: 'CSV viewer',
        description:
          'Parse strict header-based CSV and show a tab-separated table preview.',
        href: '/data/workbench?tool=csv-viewer',
        workspaceId: 'spreadsheet-workbench',
      },
      {
        id: 'spreadsheet-workbench:csv-editor',
        name: 'CSV editor',
        description:
          'Edit in the input panel, then validate and normalize quoted CSV output.',
        href: '/data/workbench?tool=csv-editor',
        workspaceId: 'spreadsheet-workbench',
      },
      {
        id: 'spreadsheet-workbench:csv-cleaner',
        name: 'CSV cleaner',
        description:
          'Trim headers and cells, then remove completely blank records.',
        href: '/data/workbench?tool=csv-cleaner',
        workspaceId: 'spreadsheet-workbench',
      },
      {
        id: 'spreadsheet-workbench:csv-sorter',
        name: 'CSV sorter',
        description: 'Stable-sort rows by a named column as text or numbers.',
        href: '/data/workbench?tool=csv-sorter',
        workspaceId: 'spreadsheet-workbench',
      },
      {
        id: 'spreadsheet-workbench:csv-filter',
        name: 'CSV filter',
        description:
          'Keep rows whose selected column matches a simple bounded condition.',
        href: '/data/workbench?tool=csv-filter',
        workspaceId: 'spreadsheet-workbench',
      },
      {
        id: 'spreadsheet-workbench:csv-column-selector',
        name: 'CSV column selector',
        description: 'Keep and order a comma-separated selection of columns.',
        href: '/data/workbench?tool=csv-column-selector',
        workspaceId: 'spreadsheet-workbench',
      },
      {
        id: 'spreadsheet-workbench:csv-column-renamer',
        name: 'CSV column renamer',
        description:
          'Rename headers with old=new pairs while preventing duplicates.',
        href: '/data/workbench?tool=csv-column-renamer',
        workspaceId: 'spreadsheet-workbench',
      },
      {
        id: 'spreadsheet-workbench:csv-deduplicator',
        name: 'CSV deduplicator',
        description:
          'Remove later duplicate rows using selected key columns or the full row.',
        href: '/data/workbench?tool=csv-deduplicator',
        workspaceId: 'spreadsheet-workbench',
      },
      {
        id: 'spreadsheet-workbench:csv-merger',
        name: 'CSV merger',
        description: 'Append two CSV datasets with the same headers.',
        href: '/data/workbench?tool=csv-merger',
        workspaceId: 'spreadsheet-workbench',
      },
      {
        id: 'spreadsheet-workbench:csv-splitter',
        name: 'CSV splitter',
        description:
          'Split rows into separately labelled CSV parts with repeated headers.',
        href: '/data/workbench?tool=csv-splitter',
        workspaceId: 'spreadsheet-workbench',
      },
      {
        id: 'spreadsheet-workbench:csv-transposer',
        name: 'CSV transposer',
        description:
          'Swap rows and columns in a bounded rectangular CSV table.',
        href: '/data/workbench?tool=csv-transposer',
        workspaceId: 'spreadsheet-workbench',
      },
      {
        id: 'spreadsheet-workbench:csv-pivot-table',
        name: 'CSV pivot table',
        description:
          'Create a sum or count pivot from row, column, and value fields.',
        href: '/data/workbench?tool=csv-pivot-table',
        workspaceId: 'spreadsheet-workbench',
      },
      {
        id: 'spreadsheet-workbench:csv-group-by',
        name: 'CSV group by',
        description:
          'Group by one column and calculate row count or numeric sum.',
        href: '/data/workbench?tool=csv-group-by',
        workspaceId: 'spreadsheet-workbench',
      },
      {
        id: 'spreadsheet-workbench:csv-join',
        name: 'CSV join',
        description:
          'Inner- or left-join two CSV datasets using named key columns.',
        href: '/data/workbench?tool=csv-join',
        workspaceId: 'spreadsheet-workbench',
      },
      {
        id: 'spreadsheet-workbench:csv-diff',
        name: 'CSV diff',
        description:
          'Compare two datasets by a key and report added, removed, and changed rows.',
        href: '/data/workbench?tool=csv-diff',
        workspaceId: 'spreadsheet-workbench',
      },
      {
        id: 'spreadsheet-workbench:csv-schema-inferer',
        name: 'CSV schema inferer',
        description:
          'Infer conservative boolean, integer, number, ISO-date, or text column types.',
        href: '/data/workbench?tool=csv-schema-inferer',
        workspaceId: 'spreadsheet-workbench',
      },
      {
        id: 'spreadsheet-workbench:csv-type-converter',
        name: 'CSV type converter',
        description:
          'Normalize one column to trimmed text, number, boolean, or ISO date.',
        href: '/data/workbench?tool=csv-type-converter',
        workspaceId: 'spreadsheet-workbench',
      },
      {
        id: 'spreadsheet-workbench:csv-to-json',
        name: 'CSV to JSON',
        description:
          'Convert strict header-based CSV to an array of JSON objects.',
        href: '/data/workbench?tool=csv-to-json',
        workspaceId: 'spreadsheet-workbench',
      },
      {
        id: 'spreadsheet-workbench:json-to-csv',
        name: 'JSON to CSV',
        description: 'Convert a bounded array of JSON objects to quoted CSV.',
        href: '/data/workbench?tool=json-to-csv',
        workspaceId: 'spreadsheet-workbench',
      },
      {
        id: 'spreadsheet-workbench:csv-to-tsv',
        name: 'CSV to TSV',
        description:
          'Convert CSV to tab-separated values while rejecting tabs/newlines inside cells.',
        href: '/data/workbench?tool=csv-to-tsv',
        workspaceId: 'spreadsheet-workbench',
      },
      {
        id: 'spreadsheet-workbench:tsv-to-csv',
        name: 'TSV to CSV',
        description: 'Convert rectangular tab-separated rows to quoted CSV.',
        href: '/data/workbench?tool=tsv-to-csv',
        workspaceId: 'spreadsheet-workbench',
      },
      {
        id: 'spreadsheet-workbench:csv-to-sql',
        name: 'CSV to SQL',
        description:
          'Generate escaped SQL INSERT statements with quoted identifiers and text values.',
        href: '/data/workbench?tool=csv-to-sql',
        workspaceId: 'spreadsheet-workbench',
      },
      {
        id: 'spreadsheet-workbench:spreadsheet-formula-viewer',
        name: 'Spreadsheet formula viewer',
        description:
          'List CSV cells beginning with =; formulas are never evaluated.',
        href: '/data/workbench?tool=spreadsheet-formula-viewer',
        workspaceId: 'spreadsheet-workbench',
      },
      {
        id: 'spreadsheet-workbench:spreadsheet-cell-inspector',
        name: 'Spreadsheet cell inspector',
        description: 'Inspect one 1-based data row and named column.',
        href: '/data/workbench?tool=spreadsheet-cell-inspector',
        workspaceId: 'spreadsheet-workbench',
      },
      {
        id: 'spreadsheet-workbench:spreadsheet-duplicate-finder',
        name: 'Spreadsheet duplicate finder',
        description:
          'Report duplicate values and row numbers in a chosen column.',
        href: '/data/workbench?tool=spreadsheet-duplicate-finder',
        workspaceId: 'spreadsheet-workbench',
      },
      {
        id: 'spreadsheet-workbench:spreadsheet-blank-row-remover',
        name: 'Spreadsheet blank-row remover',
        description:
          'Remove physical CSV lines that contain only separators and whitespace.',
        href: '/data/workbench?tool=spreadsheet-blank-row-remover',
        workspaceId: 'spreadsheet-workbench',
      },
      {
        id: 'spreadsheet-workbench:spreadsheet-data-profiler',
        name: 'Spreadsheet data profiler',
        description:
          'Profile row count, uniqueness, missingness, and inferred type per column.',
        href: '/data/workbench?tool=spreadsheet-data-profiler',
        workspaceId: 'spreadsheet-workbench',
      },
      {
        id: 'spreadsheet-workbench:vlookup-generator',
        name: 'VLOOKUP generator',
        description:
          'Generate a spreadsheet VLOOKUP formula from explicit cell/range settings.',
        href: '/data/workbench?tool=vlookup-generator',
        workspaceId: 'spreadsheet-workbench',
      },
      {
        id: 'spreadsheet-workbench:pivot-table-planner',
        name: 'Pivot-table planner',
        description:
          'Validate field choices and produce a concise pivot configuration plan.',
        href: '/data/workbench?tool=pivot-table-planner',
        workspaceId: 'spreadsheet-workbench',
      },
      {
        id: 'spreadsheet-workbench:data-sampling-tool',
        name: 'Data sampling tool',
        description: 'Select a bounded random sample without replacement.',
        href: '/data/workbench?tool=data-sampling-tool',
        workspaceId: 'spreadsheet-workbench',
      },
      {
        id: 'spreadsheet-workbench:random-row-selector',
        name: 'Random row selector',
        description: 'Select one complete row using browser randomness.',
        href: '/data/workbench?tool=random-row-selector',
        workspaceId: 'spreadsheet-workbench',
      },
      {
        id: 'spreadsheet-workbench:column-statistics',
        name: 'Column statistics',
        description:
          'Calculate numeric count, minimum, maximum, mean, median, and population deviation.',
        href: '/data/workbench?tool=column-statistics',
        workspaceId: 'spreadsheet-workbench',
      },
      {
        id: 'spreadsheet-workbench:missing-value-analyzer',
        name: 'Missing-value analyzer',
        description:
          'Count blank, NA, N/A, null, and undefined markers per column.',
        href: '/data/workbench?tool=missing-value-analyzer',
        workspaceId: 'spreadsheet-workbench',
      },
      {
        id: 'spreadsheet-workbench:outlier-detector',
        name: 'Outlier detector',
        description: 'Flag numeric values outside the 1.5×IQR fences.',
        href: '/data/workbench?tool=outlier-detector',
        workspaceId: 'spreadsheet-workbench',
      },
      {
        id: 'spreadsheet-workbench:date-column-normalizer',
        name: 'Date-column normalizer',
        description:
          'Normalize one column from ISO, DD/MM/YYYY, or MM/DD/YYYY to YYYY-MM-DD.',
        href: '/data/workbench?tool=date-column-normalizer',
        workspaceId: 'spreadsheet-workbench',
      },
      {
        id: 'spreadsheet-workbench:phone-column-normalizer',
        name: 'Phone-column normalizer',
        description:
          'Normalize one phone column to +country-and-national-digits form.',
        href: '/data/workbench?tool=phone-column-normalizer',
        workspaceId: 'spreadsheet-workbench',
      },
      {
        id: 'spreadsheet-workbench:address-column-cleaner',
        name: 'Address-column cleaner',
        description:
          'Collapse whitespace and normalize comma spacing in an address column.',
        href: '/data/workbench?tool=address-column-cleaner',
        workspaceId: 'spreadsheet-workbench',
      },
      {
        id: 'spreadsheet-workbench:table-to-markdown',
        name: 'Table to Markdown',
        description: 'Convert CSV into an escaped GitHub-style Markdown table.',
        href: '/data/workbench?tool=table-to-markdown',
        workspaceId: 'spreadsheet-workbench',
      },
      {
        id: 'spreadsheet-workbench:markdown-table-to-csv',
        name: 'Markdown table to CSV',
        description:
          'Convert a simple pipe-delimited Markdown table to quoted CSV.',
        href: '/data/workbench?tool=markdown-table-to-csv',
        workspaceId: 'spreadsheet-workbench',
      },
      {
        id: 'excel-converter',
        name: 'Excel converter',
        description:
          'Turn an .xlsx into a CSV, or a CSV into a real Excel file, in this tab.',
        href: '/data/excel',
        workspaceId: 'excel-converter',
      },
      {
        id: 'list-hygiene',
        name: 'Contact list hygiene and deduplicator',
        description:
          'De-duplicate, merge, split and compare contact lists, and tidy names, emails and phone numbers.',
        href: '/data/lists',
        workspaceId: 'list-hygiene',
      },
    ],
  },
];
