export type FindingSeverity = 'critical' | 'warning' | 'info';

export type FindingCategory = 'structural' | 'statistical' | 'diff';

export interface AuditFinding {
  id: string;
  sheet?: string;
  cell?: string;
  range?: string;
  rowIndex?: number;
  columnIndex?: number;
  category: FindingCategory;
  findingClass: string;
  title: string;
  message: string;
  remedy?: string;
  severity: FindingSeverity;
  value?: string | number;
  metadata?: Record<string, unknown>;
}

export interface WorkbookAuditSummary {
  fileName: string;
  sheetCount: number;
  totalCellsAudited: number;
  formulaCount: number;
  totalFindings: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  byCategory: {
    structural: number;
    statistical: number;
  };
  byClass: Record<string, number>;
  auditedSheets: string[];
}

export interface WorkbookAuditResult {
  summary: WorkbookAuditSummary;
  findings: AuditFinding[];
}
