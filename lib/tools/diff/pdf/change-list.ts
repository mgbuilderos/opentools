import type { PdfDiffResult } from './types';

export function generateChangeListCsv(diffResult: PdfDiffResult): string {
  const headers = [
    'Change ID',
    'Type',
    'Original Page',
    'Revised Page',
    'Description',
    'Original Text',
    'Revised Text',
  ];

  const escapeCell = (str: string) => {
    if (/[",\r\n]/u.test(str)) {
      return `"${str.replace(/"/gu, '""')}"`;
    }
    return str;
  };

  const rows = diffResult.changes.map((chg) => [
    escapeCell(chg.id),
    escapeCell(chg.type.toUpperCase()),
    escapeCell(chg.pageA !== undefined ? String(chg.pageA) : ''),
    escapeCell(chg.pageB !== undefined ? String(chg.pageB) : ''),
    escapeCell(chg.description),
    escapeCell(chg.originalText ?? ''),
    escapeCell(chg.revisedText ?? ''),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
