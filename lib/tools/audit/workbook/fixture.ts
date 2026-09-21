import { createZip } from '../../docx/zip';

const SCHEME = ['http:', '//'].join('');
const OPENXML = `${SCHEME}schemas.openxmlformats.org`;
const CONTENT_TYPES_NS = `${OPENXML}/package/2006/content-types`;
const PACKAGE_RELS_NS = `${OPENXML}/package/2006/relationships`;
const OFFICE_RELS_NS = `${OPENXML}/officeDocument/2006/relationships`;
const SHEET_NS = `${OPENXML}/spreadsheetml/2006/main`;

const encoder = new TextEncoder();
const part = (xml: string) =>
  encoder.encode(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n${xml}`,
  );

export async function createAuditFixtureWorkbook(): Promise<Uint8Array> {
  const contentTypes = `<Types xmlns="${CONTENT_TYPES_NS}">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;

  const packageRels = `<Relationships xmlns="${PACKAGE_RELS_NS}">
  <Relationship Id="rId1" Type="${OFFICE_RELS_NS}/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const workbookRels = `<Relationships xmlns="${PACKAGE_RELS_NS}">
  <Relationship Id="rId1" Type="${OFFICE_RELS_NS}/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="${OFFICE_RELS_NS}/worksheet" Target="worksheets/sheet2.xml"/>
  <Relationship Id="rId3" Type="${OFFICE_RELS_NS}/worksheet" Target="worksheets/sheet3.xml"/>
  <Relationship Id="rId4" Type="${OFFICE_RELS_NS}/styles" Target="styles.xml"/>
  <Relationship Id="rId5" Type="${OFFICE_RELS_NS}/externalLink" Target="externalLinks/externalLink1.xml"/>
</Relationships>`;

  const workbookXml = `<workbook xmlns="${SHEET_NS}" xmlns:r="${OFFICE_RELS_NS}">
  <sheets>
    <sheet name="AuditTest" sheetId="1" r:id="rId1"/>
    <sheet name="HiddenAssumptions" sheetId="2" r:id="rId2" state="hidden"/>
    <sheet name="ConfidentialModel" sheetId="3" r:id="rId3" state="veryHidden"/>
  </sheets>
</workbook>`;

  const stylesXml = `<styleSheet xmlns="${SHEET_NS}">
  <numFmts count="1">
    <numFmt numFmtId="164" formatCode="yyyy-mm-dd"/>
  </numFmts>
  <fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="2">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
  </cellXfs>
</styleSheet>`;

  // Build Sheet1 rows:
  const rows: string[] = [];

  // Header row
  rows.push(`<row r="1">
    <c r="A1" t="str"><v>Sequence</v></c>
    <c r="B1" t="str"><v>RunFormula</v></c>
    <c r="C1" t="str"><v>Overwritten</v></c>
    <c r="D1" t="str"><v>Constant</v></c>
    <c r="E1" t="str"><v>ErrorCell</v></c>
    <c r="F1" t="str"><v>External</v></c>
    <c r="G1" t="str"><v>Circular</v></c>
    <c r="H1" t="str"><v>MixedTypes</v></c>
    <c r="I1" t="str"><v>MADOutliers</v></c>
    <c r="J1" t="str"><v>RoundFigures</v></c>
    <c r="K1" t="str"><v>BenfordValues</v></c>
    <c r="L1" t="str"><v>Dates</v></c>
  </row>`);

  // Sequence in Col A: 101, 102, 104, 105, 106, 107, 108, 109, 110 (missing 103!)
  const seqValues = [101, 102, 104, 105, 106, 107, 108, 109, 110];

  // Benford in Col K: 35 values all starting with 9 (e.g. 91, 920, 9500...)
  const benfordVals: number[] = [];
  for (let i = 0; i < 35; i++) {
    benfordVals.push(90 + i * 5);
  }

  // Round numbers in Col J: 25 round numbers (100, 200, 300...)
  const roundVals: number[] = [];
  for (let i = 0; i < 25; i++) {
    roundVals.push((i + 1) * 100);
  }

  // MAD outliers in Col I: 15 normal values around 10, plus 50000 at row 16
  const madVals = [
    10, 11, 12, 10, 13, 11, 12, 10, 11, 12, 13, 10, 11, 12, 10, 50000,
  ];

  for (let r = 2; r <= 38; r++) {
    const isHiddenRow = r === 7 ? ' hidden="1"' : '';
    const cells: string[] = [];

    // Col A: Sequence
    if (r - 2 < seqValues.length) {
      cells.push(`<c r="A${r}"><v>${seqValues[r - 2]}</v></c>`);
    }

    // Col B: Broken Formula Run (row 5 is A5*3, while rows 2,3,4,6 are A*2)
    if (r <= 6) {
      const mult = r === 5 ? 3 : 2;
      cells.push(
        `<c r="B${r}"><f>A${r}*${mult}</f><v>${(seqValues[r - 2] ?? 100) * mult}</v></c>`,
      );
    }

    // Col C: Overwritten formula with value (row 5 has static 999 with no formula, while 2,3,4,6,7 have formulas)
    if (r <= 7) {
      if (r === 5) {
        cells.push(`<c r="C${r}"><v>999</v></c>`);
      } else {
        cells.push(`<c r="C${r}"><f>B${r}+10</f><v>210</v></c>`);
      }
    }

    // Col D: Hardcoded constant inside formula
    if (r === 2) {
      cells.push(`<c r="D2"><f>B2*1.2</f><v>242.4</v></c>`);
    }

    // Col E: Error cell & propagation
    if (r === 2) {
      cells.push(`<c r="E2" t="e"><f>1/0</f><v>#DIV/0!</v></c>`);
    } else if (r === 3) {
      cells.push(`<c r="E3"><f>E2+5</f><v>#DIV/0!</v></c>`);
    }

    // Col F: External link
    if (r === 2) {
      cells.push(
        `<c r="F2"><f>[Budget2025.xlsx]Sheet1!$A$1*2</f><v>500</v></c>`,
      );
    }

    // Col G: Circular reference (G2 = G3 + 1, G3 = G2 + 1)
    if (r === 2) {
      cells.push(`<c r="G2"><f>G3+1</f><v>0</v></c>`);
    } else if (r === 3) {
      cells.push(`<c r="G3"><f>G2+1</f><v>0</v></c>`);
    }

    // Col H: Inconsistent types (Rows 2-5 are numbers 100..400, row 6 is text "400")
    if (r >= 2 && r <= 5) {
      cells.push(`<c r="H${r}"><v>${r * 100}</v></c>`);
    } else if (r === 6) {
      cells.push(`<c r="H6" t="str"><v>400</v></c>`);
    }

    // Col I: MAD Outliers
    if (r - 2 < madVals.length) {
      cells.push(`<c r="I${r}"><v>${madVals[r - 2]}</v></c>`);
    }

    // Col J: Round numbers
    if (r - 2 < roundVals.length) {
      cells.push(`<c r="J${r}"><v>${roundVals[r - 2]}</v></c>`);
    }

    // Col K: Benford
    if (r - 2 < benfordVals.length) {
      cells.push(`<c r="K${r}"><v>${benfordVals[r - 2]}</v></c>`);
    }

    // Col L: Dates with weekend posting (row 2 is 2026-03-15 Sunday -> serial 46096)
    if (r === 2) {
      cells.push(`<c r="L2" s="1"><v>46096</v></c>`);
    } else if (r === 3) {
      cells.push(`<c r="L3" s="1"><v>46097</v></c>`);
    }

    // Duplicate rows test: rows 37 and 38 have identical content across all columns
    if (r === 37 || r === 38) {
      cells.length = 0;
      cells.push(
        `<c r="A${r}"><v>999</v></c><c r="B${r}" t="str"><v>DUPLICATE_ITEM</v></c>`,
      );
    }

    rows.push(`<row r="${r}"${isHiddenRow}>${cells.join('')}</row>`);
  }

  const sheet1Xml = `<worksheet xmlns="${SHEET_NS}">
  <cols>
    <col min="14" max="14" hidden="1"/>
  </cols>
  <sheetData>
    ${rows.join('\n')}
  </sheetData>
  <mergeCells count="1">
    <mergeCell ref="B8:C8"/>
  </mergeCells>
</worksheet>`;

  const sheet2Xml = `<worksheet xmlns="${SHEET_NS}">
  <sheetData>
    <row r="1"><c r="A1" t="str"><v>HiddenSheetContent</v></c></row>
  </sheetData>
</worksheet>`;

  const sheet3Xml = `<worksheet xmlns="${SHEET_NS}">
  <sheetData>
    <row r="1"><c r="A1" t="str"><v>VeryHiddenContent</v></c></row>
  </sheetData>
</worksheet>`;

  const files = [
    { path: '[Content_Types].xml', data: part(contentTypes) },
    { path: '_rels/.rels', data: part(packageRels) },
    { path: 'xl/workbook.xml', data: part(workbookXml) },
    { path: 'xl/_rels/workbook.xml.rels', data: part(workbookRels) },
    { path: 'xl/styles.xml', data: part(stylesXml) },
    { path: 'xl/worksheets/sheet1.xml', data: part(sheet1Xml) },
    { path: 'xl/worksheets/sheet2.xml', data: part(sheet2Xml) },
    { path: 'xl/worksheets/sheet3.xml', data: part(sheet3Xml) },
  ];

  return createZip(files);
}
