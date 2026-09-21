import type { WorkbookAuditResult, WorkbookAuditSummary } from '../types';
import { parseWorkbookForAudit } from './model';
import { auditStatisticalFindings } from './statistical';
import { auditStructuralFindings } from './structural';
export { generateWorkbookAuditXlsx } from './report';
export type {
  AuditFinding,
  FindingSeverity,
  WorkbookAuditResult,
  WorkbookAuditSummary,
} from '../types';

export async function auditWorkbook(
  bytes: Uint8Array,
  fileName = 'workbook.xlsx',
): Promise<WorkbookAuditResult> {
  const model = await parseWorkbookForAudit(bytes);

  const structuralFindings = auditStructuralFindings(model);
  const statisticalFindings = auditStatisticalFindings(model);
  const allFindings = [...structuralFindings, ...statisticalFindings];

  let totalCellsAudited = 0;
  let formulaCount = 0;
  const auditedSheets: string[] = [];

  for (const sheet of model.sheets) {
    auditedSheets.push(sheet.name);
    for (const cell of sheet.cells.values()) {
      if (cell.kind !== 'empty') {
        totalCellsAudited++;
      }
      if (cell.hasFormula) {
        formulaCount++;
      }
    }
  }

  const byClass: Record<string, number> = {};
  let criticalCount = 0;
  let warningCount = 0;
  let infoCount = 0;

  for (const f of allFindings) {
    byClass[f.findingClass] = (byClass[f.findingClass] ?? 0) + 1;
    if (f.severity === 'critical') criticalCount++;
    else if (f.severity === 'warning') warningCount++;
    else if (f.severity === 'info') infoCount++;
  }

  const summary: WorkbookAuditSummary = {
    fileName,
    sheetCount: model.sheets.length,
    totalCellsAudited,
    formulaCount,
    totalFindings: allFindings.length,
    criticalCount,
    warningCount,
    infoCount,
    byCategory: {
      structural: structuralFindings.length,
      statistical: statisticalFindings.length,
    },
    byClass,
    auditedSheets,
  };

  return {
    summary,
    findings: allFindings,
  };
}
