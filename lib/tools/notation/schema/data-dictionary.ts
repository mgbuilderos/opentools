import type { Schema } from './types';

export function emitDataDictionary(schema: Schema): string {
  const sections: string[] = ['# Database Data Dictionary', ''];

  for (const table of schema.tables) {
    sections.push(`## Table: \`${table.name}\``);
    if (table.comment) {
      sections.push(`*${table.comment}*\n`);
    }

    sections.push('| Column | Type | Nullable | Key | Default | Notes |');
    sections.push('| :--- | :--- | :--- | :--- | :--- | :--- |');

    for (const col of table.columns) {
      let keyStr = '-';
      if (col.primaryKey) keyStr = 'PK';
      else if (col.unique) keyStr = 'UK';
      else {
        const isFk = schema.relations.some(
          (r) => r.fromTable.toLowerCase() === table.name.toLowerCase() && r.fromColumn.toLowerCase() === col.name.toLowerCase(),
        );
        if (isFk) keyStr = 'FK';
      }

      const nullStr = col.nullable ? 'Yes' : 'No';
      const defStr = col.default !== undefined ? `\`${col.default}\`` : '-';
      const notes = col.comment || '-';

      sections.push(`| ${col.name} | \`${col.type}\` | ${nullStr} | ${keyStr} | ${defStr} | ${notes} |`);
    }
    sections.push('');
  }

  if (schema.relations.length > 0) {
    sections.push('## Foreign Key Relationships', '');
    sections.push('| Source Table | Source Column | Target Table | Target Column | Type |');
    sections.push('| :--- | :--- | :--- | :--- | :--- |');
    for (const rel of schema.relations) {
      sections.push(
        `| \`${rel.fromTable}\` | \`${rel.fromColumn}\` | \`${rel.toTable}\` | \`${rel.toColumn}\` | ${rel.kind ?? 'one-to-many'} |`,
      );
    }
    sections.push('');
  }

  return sections.join('\n');
}
