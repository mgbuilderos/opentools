import {
  extractEntry,
  readZip,
  type ZipArchive,
} from '../../archive/zip-reader';
import { isDateFormat, serialToDate } from '../../spreadsheet/excel-date';
import {
  attributes,
  decodeEntities,
  eachElement,
  joinedText,
  parseCellReference,
} from '../../spreadsheet/xml';
import { a1ToR1C1 } from './r1c1';

export interface AuditCell {
  ref: string;
  row: number; // 0-indexed
  col: number; // 0-indexed
  kind: 'empty' | 'text' | 'number' | 'date' | 'boolean' | 'error';
  text?: string;
  number?: number;
  date?: Date;
  boolean?: boolean;
  errorCode?: string;
  rawFormula?: string;
  r1c1Formula?: string;
  isSharedFormula?: boolean;
  sharedFormulaIndex?: number;
  hasFormula: boolean;
}

export interface AuditSheet {
  name: string;
  sheetId: string;
  state: 'visible' | 'hidden' | 'veryHidden';
  cells: Map<string, AuditCell>;
  rows: Map<number, Map<number, AuditCell>>;
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
  mergedRanges: string[];
  hiddenRows: Set<number>;
  hiddenCols: Set<number>;
}

export interface AuditWorkbookModel {
  sheets: AuditSheet[];
  externalLinks: string[];
  date1904: boolean;
}

const decoder = new TextDecoder();

async function readPart(
  bytes: Uint8Array,
  archive: ZipArchive,
  path: string,
): Promise<string | null> {
  const norm = path.startsWith('/') ? path.slice(1) : path;
  const entry = archive.entries.find(
    (item) => item.path === norm || item.path === `xl/${norm}`,
  );
  if (!entry || entry.isDirectory) return null;
  return decoder.decode(await extractEntry(bytes, entry));
}

function readSharedStrings(xml: string | null): string[] {
  if (!xml) return [];
  const strings: string[] = [];
  eachElement(xml, 'si', (element) => {
    strings.push(joinedText(element.inner));
  });
  return strings;
}

interface Styles {
  cellFormats: number[];
  customFormats: Map<number, string>;
}

function readStyles(xml: string | null): Styles {
  const cellFormats: number[] = [];
  const customFormats = new Map<number, string>();
  if (!xml) return { cellFormats, customFormats };

  eachElement(xml, 'numFmt', (element) => {
    const id = Number.parseInt(element.attrs.numFmtId ?? '', 10);
    if (Number.isFinite(id) && element.attrs.formatCode) {
      customFormats.set(id, element.attrs.formatCode);
    }
  });

  const start = xml.indexOf('<cellXfs');
  if (start !== -1) {
    const end = xml.indexOf('</cellXfs>', start);
    const section = xml.slice(start, end === -1 ? undefined : end);
    eachElement(section, 'xf', (element) => {
      cellFormats.push(Number.parseInt(element.attrs.numFmtId ?? '0', 10) || 0);
    });
  }
  return { cellFormats, customFormats };
}

function isDateStyle(styleIndex: number | null, styles: Styles): boolean {
  if (styleIndex === null) return false;
  const numFmtId = styles.cellFormats[styleIndex];
  if (numFmtId === undefined) return false;
  return isDateFormat(numFmtId, styles.customFormats.get(numFmtId));
}

interface SheetMeta {
  name: string;
  sheetId: string;
  relId: string;
  state: 'visible' | 'hidden' | 'veryHidden';
}

export async function parseWorkbookForAudit(
  bytes: Uint8Array,
): Promise<AuditWorkbookModel> {
  const archive = readZip(bytes);

  const workbookXml = await readPart(bytes, archive, 'xl/workbook.xml');
  if (!workbookXml) {
    throw new Error('Not a valid Excel workbook: xl/workbook.xml is missing.');
  }

  const relsXml = await readPart(bytes, archive, 'xl/_rels/workbook.xml.rels');
  const relsMap = new Map<string, string>();
  const externalLinks: string[] = [];

  if (relsXml) {
    eachElement(relsXml, 'Relationship', (element) => {
      const id = element.attrs.Id;
      const target = element.attrs.Target;
      const type = element.attrs.Type ?? '';
      if (id && target) {
        relsMap.set(id, target);
      }
      if (type.includes('externalLink') || target.includes('externalLinks/')) {
        externalLinks.push(target);
      }
    });
  }

  // Parse externalLink XML parts if any
  for (const entry of archive.entries) {
    if (
      entry.path.startsWith('xl/externalLinks/') &&
      entry.path.endsWith('.xml')
    ) {
      const extXml = decoder.decode(await extractEntry(bytes, entry));
      eachElement(extXml, 'externalBook', (el) => {
        const rId = el.attrs['r:id'];
        if (rId) externalLinks.push(rId);
      });
    }
  }

  const date1904 = /date1904="1"|date1904="true"/iu.test(workbookXml);
  const sharedStringsXml = await readPart(
    bytes,
    archive,
    'xl/sharedStrings.xml',
  );
  const shared = readSharedStrings(sharedStringsXml);

  const stylesXml = await readPart(bytes, archive, 'xl/styles.xml');
  const styles = readStyles(stylesXml);

  const sheetsMeta: SheetMeta[] = [];
  eachElement(workbookXml, 'sheet', (element) => {
    const name = element.attrs.name ?? 'Sheet';
    const sheetId = element.attrs.sheetId ?? '1';
    const relId = element.attrs['r:id'] ?? '';
    const stateAttr = (element.attrs.state ?? 'visible').toLowerCase();
    const state =
      stateAttr === 'veryhidden'
        ? 'veryHidden'
        : stateAttr === 'hidden'
          ? 'hidden'
          : 'visible';
    sheetsMeta.push({ name, sheetId, relId, state });
  });

  const sheets: AuditSheet[] = [];

  for (const meta of sheetsMeta) {
    const target = relsMap.get(meta.relId);
    const targetPath = target
      ? target.startsWith('/')
        ? target.slice(1)
        : target.startsWith('xl/')
          ? target
          : `xl/${target}`
      : `xl/worksheets/sheet${meta.sheetId}.xml`;

    const sheetXml = await readPart(bytes, archive, targetPath);
    if (!sheetXml) continue;

    const mergedRanges: string[] = [];
    eachElement(sheetXml, 'mergeCell', (el) => {
      if (el.attrs.ref) mergedRanges.push(el.attrs.ref);
    });

    const hiddenCols = new Set<number>();
    eachElement(sheetXml, 'col', (el) => {
      if (el.attrs.hidden === '1' || el.attrs.hidden === 'true') {
        const min = Number.parseInt(el.attrs.min ?? '1', 10) - 1;
        const max = Number.parseInt(el.attrs.max ?? '1', 10) - 1;
        for (let c = min; c <= max; c++) {
          hiddenCols.add(c);
        }
      }
    });

    const hiddenRows = new Set<number>();
    const cells = new Map<string, AuditCell>();
    const rows = new Map<number, Map<number, AuditCell>>();
    let minRow = Number.POSITIVE_INFINITY;
    let maxRow = -1;
    let minCol = Number.POSITIVE_INFINITY;
    let maxCol = -1;

    // Shared formulas: si -> { baseFormula, baseRow, baseCol }
    const sharedFormulas = new Map<
      number,
      { r1c1: string; baseFormula: string }
    >();

    eachElement(sheetXml, 'row', (rowEl) => {
      const rowNumAttr = rowEl.attrs.r;
      const declaredRow = rowNumAttr
        ? Number.parseInt(rowNumAttr, 10) - 1
        : null;
      if (rowEl.attrs.hidden === '1' || rowEl.attrs.hidden === 'true') {
        if (declaredRow !== null) hiddenRows.add(declaredRow);
      }

      let fallbackCol = 0;
      eachElement(rowEl.inner, 'c', (cellEl) => {
        const ref = cellEl.attrs.r;
        const parsedRef = ref ? parseCellReference(ref) : null;
        const rowIndex = parsedRef?.row ?? declaredRow ?? 0;
        const columnIndex = parsedRef?.column ?? fallbackCol;
        fallbackCol = columnIndex + 1;

        const cellRef = ref ?? `Cell_${rowIndex + 1}_${columnIndex + 1}`;
        const type = cellEl.attrs.t ?? 'n';
        const styleIndex = cellEl.attrs.s
          ? Number.parseInt(cellEl.attrs.s, 10)
          : null;

        // Formula parsing
        let rawFormula: string | undefined;
        let r1c1Formula: string | undefined;
        let isShared = false;
        let sharedSi: number | undefined;

        const fMatch = /<f([^>]*)>([\s\S]*?)<\/f>/u.exec(cellEl.inner);
        if (fMatch) {
          const fAttrs = attributes(fMatch[1] ?? '');
          const fBody = decodeEntities(fMatch[2].trim());
          if (fAttrs.t === 'shared') {
            isShared = true;
            sharedSi = Number.parseInt(fAttrs.si ?? '0', 10);
            if (fBody) {
              // Master cell for shared formula
              rawFormula = fBody;
              r1c1Formula = a1ToR1C1(rawFormula, rowIndex, columnIndex);
              sharedFormulas.set(sharedSi, {
                r1c1: r1c1Formula,
                baseFormula: rawFormula,
              });
            } else if (sharedFormulas.has(sharedSi)) {
              // Dependent cell in shared formula run
              const sharedDef = sharedFormulas.get(sharedSi)!;
              r1c1Formula = sharedDef.r1c1;
              rawFormula = sharedDef.baseFormula;
            }
          } else if (fBody) {
            rawFormula = fBody;
            r1c1Formula = a1ToR1C1(rawFormula, rowIndex, columnIndex);
          }
        } else {
          // Check self-closing <f t="shared" si="0"/>
          const selfFMatch = /<f\s+([^>]*)\/>/u.exec(cellEl.inner);
          if (selfFMatch) {
            const fAttrs = attributes(selfFMatch[1] ?? '');
            if (fAttrs.t === 'shared') {
              isShared = true;
              sharedSi = Number.parseInt(fAttrs.si ?? '0', 10);
              if (sharedFormulas.has(sharedSi)) {
                const sharedDef = sharedFormulas.get(sharedSi)!;
                r1c1Formula = sharedDef.r1c1;
                rawFormula = sharedDef.baseFormula;
              }
            }
          }
        }

        // Value parsing
        const valMatch = /<v[^>]*>([\s\S]*?)<\/v>/u.exec(cellEl.inner);
        const rawVal = valMatch ? valMatch[1].trim() : '';

        let cell: AuditCell;

        if (type === 'inlineStr') {
          cell = {
            ref: cellRef,
            row: rowIndex,
            col: columnIndex,
            kind: 'text',
            text: joinedText(cellEl.inner),
            rawFormula,
            r1c1Formula,
            isSharedFormula: isShared,
            sharedFormulaIndex: sharedSi,
            hasFormula: Boolean(rawFormula || r1c1Formula),
          };
        } else if (type === 's') {
          const sIndex = rawVal ? Number.parseInt(rawVal, 10) : Number.NaN;
          const text =
            Number.isFinite(sIndex) && shared[sIndex] !== undefined
              ? shared[sIndex]
              : '';
          cell = {
            ref: cellRef,
            row: rowIndex,
            col: columnIndex,
            kind: text ? 'text' : 'empty',
            text,
            rawFormula,
            r1c1Formula,
            isSharedFormula: isShared,
            sharedFormulaIndex: sharedSi,
            hasFormula: Boolean(rawFormula || r1c1Formula),
          };
        } else if (type === 'b') {
          cell = {
            ref: cellRef,
            row: rowIndex,
            col: columnIndex,
            kind: 'boolean',
            boolean: rawVal === '1' || rawVal.toLowerCase() === 'true',
            rawFormula,
            r1c1Formula,
            isSharedFormula: isShared,
            sharedFormulaIndex: sharedSi,
            hasFormula: Boolean(rawFormula || r1c1Formula),
          };
        } else if (type === 'e') {
          cell = {
            ref: cellRef,
            row: rowIndex,
            col: columnIndex,
            kind: 'error',
            errorCode: rawVal || '#ERROR!',
            rawFormula,
            r1c1Formula,
            isSharedFormula: isShared,
            sharedFormulaIndex: sharedSi,
            hasFormula: Boolean(rawFormula || r1c1Formula),
          };
        } else if (type === 'str') {
          cell = {
            ref: cellRef,
            row: rowIndex,
            col: columnIndex,
            kind: 'text',
            text: rawVal,
            rawFormula,
            r1c1Formula,
            isSharedFormula: isShared,
            sharedFormulaIndex: sharedSi,
            hasFormula: Boolean(rawFormula || r1c1Formula),
          };
        } else if (rawVal) {
          const num = Number.parseFloat(rawVal);
          if (Number.isFinite(num)) {
            if (isDateStyle(styleIndex, styles)) {
              const dt = serialToDate(num, date1904);
              cell = {
                ref: cellRef,
                row: rowIndex,
                col: columnIndex,
                kind: 'date',
                date: dt.date,
                number: num,
                rawFormula,
                r1c1Formula,
                isSharedFormula: isShared,
                sharedFormulaIndex: sharedSi,
                hasFormula: Boolean(rawFormula || r1c1Formula),
              };
            } else {
              cell = {
                ref: cellRef,
                row: rowIndex,
                col: columnIndex,
                kind: 'number',
                number: num,
                rawFormula,
                r1c1Formula,
                isSharedFormula: isShared,
                sharedFormulaIndex: sharedSi,
                hasFormula: Boolean(rawFormula || r1c1Formula),
              };
            }
          } else {
            cell = {
              ref: cellRef,
              row: rowIndex,
              col: columnIndex,
              kind: 'text',
              text: rawVal,
              rawFormula,
              r1c1Formula,
              isSharedFormula: isShared,
              sharedFormulaIndex: sharedSi,
              hasFormula: Boolean(rawFormula || r1c1Formula),
            };
          }
        } else {
          cell = {
            ref: cellRef,
            row: rowIndex,
            col: columnIndex,
            kind: 'empty',
            rawFormula,
            r1c1Formula,
            isSharedFormula: isShared,
            sharedFormulaIndex: sharedSi,
            hasFormula: Boolean(rawFormula || r1c1Formula),
          };
        }

        cells.set(cellRef, cell);
        if (!rows.has(rowIndex)) rows.set(rowIndex, new Map());
        rows.get(rowIndex)!.set(columnIndex, cell);

        if (rowIndex < minRow) minRow = rowIndex;
        if (rowIndex > maxRow) maxRow = rowIndex;
        if (columnIndex < minCol) minCol = columnIndex;
        if (columnIndex > maxCol) maxCol = columnIndex;
      });
    });

    sheets.push({
      name: meta.name,
      sheetId: meta.sheetId,
      state: meta.state,
      cells,
      rows,
      minRow: Number.isFinite(minRow) ? minRow : 0,
      maxRow: maxRow >= 0 ? maxRow : 0,
      minCol: Number.isFinite(minCol) ? minCol : 0,
      maxCol: maxCol >= 0 ? maxCol : 0,
      mergedRanges,
      hiddenRows,
      hiddenCols,
    });
  }

  return {
    sheets,
    externalLinks,
    date1904,
  };
}
