import type { Schema } from './types';

export function emitPlantUml(schema: Schema): string {
  const lines: string[] = ['@startuml', '!theme plain', 'hide circle', 'skinparam linetype ortho', ''];

  for (const table of schema.tables) {
    lines.push(`entity "${table.name}" as ${table.name} {`);
    const pks = table.columns.filter((c) => c.primaryKey);
    const nonPks = table.columns.filter((c) => !c.primaryKey);

    for (const col of pks) {
      lines.push(`  *${col.name} : ${col.type}`);
    }
    if (pks.length > 0 && nonPks.length > 0) {
      lines.push('  --');
    }
    for (const col of nonPks) {
      const isFk = schema.relations.some(
        (r) => r.fromTable.toLowerCase() === table.name.toLowerCase() && r.fromColumn.toLowerCase() === col.name.toLowerCase(),
      );
      const req = col.nullable ? '' : '*';
      const tag = isFk ? ' <<FK>>' : '';
      lines.push(`  ${req}${col.name} : ${col.type}${tag}`);
    }
    lines.push('}');
    lines.push('');
  }

  for (const rel of schema.relations) {
    // toTable is parent, fromTable is child
    lines.push(`${rel.toTable} ||--o{ ${rel.fromTable}`);
  }

  lines.push('');
  lines.push('@enduml');
  return lines.join('\n');
}
