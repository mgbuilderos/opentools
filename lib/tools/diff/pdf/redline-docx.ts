import { escapeXml } from '../../docx/document';
import { createZip, type ZipEntry } from '../../docx/zip';
import type { PdfDiffResult } from './types';

const SCHEME = ['http:', '//'].join('');
const OPENXML = `${SCHEME}schemas.openxmlformats.org`;
const CONTENT_TYPES_NS = `${OPENXML}/package/2006/content-types`;
const PACKAGE_RELS_NS = `${OPENXML}/package/2006/relationships`;
const OFFICE_RELS_NS = `${OPENXML}/officeDocument/2006/relationships`;
const WORD_NS = `${OPENXML}/wordprocessingml/2006/main`;

const DOCUMENT_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml';

const encoder = new TextEncoder();
const part = (xml: string) =>
  encoder.encode(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n${xml}`,
  );

export async function generateRedlineDocx(
  diffResult: PdfDiffResult,
): Promise<Uint8Array> {
  const dateStr = new Date().toISOString();
  let trackId = 1;

  // Build document body paragraphs
  const paragraphsXml: string[] = [];

  // Title header paragraph
  paragraphsXml.push(`
    <w:p>
      <w:pPr><w:pStyle w:val="Heading1"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="36"/></w:rPr><w:t>Document Comparison Redline</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:rPr><w:color w:val="666666"/><w:sz w:val="20"/></w:rPr>
        <w:t>Original: ${escapeXml(diffResult.summary.docAName)} · Revised: ${escapeXml(diffResult.summary.docBName)}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r><w:rPr><w:color w:val="666666"/><w:sz w:val="20"/></w:rPr>
        <w:t>Changes: ${diffResult.summary.insertions} insertions, ${diffResult.summary.deletions} deletions, ${diffResult.summary.moves} moves, ${diffResult.summary.formatOnly} formatting changes.</w:t>
      </w:r>
    </w:p>
    <w:p><w:r><w:t></w:t></w:r></w:p>
  `);

  // Build redline content from aligned streams and changes
  // Walk stream B or changes
  let currentRunsXml: string[] = [];

  for (const chg of diffResult.changes) {
    if (chg.type === 'insert') {
      const insId = trackId++;
      const text = escapeXml(chg.revisedText ?? '');
      currentRunsXml.push(
        `<w:ins w:id="${insId}" w:author="OpenTools Redline" w:date="${dateStr}">` +
          `<w:r><w:rPr><w:color w:val="008000"/><w:u w:val="single"/></w:rPr>` +
          `<w:t xml:space="preserve">${text} </w:t></w:r></w:ins>`,
      );
    } else if (chg.type === 'delete') {
      const delId = trackId++;
      const text = escapeXml(chg.originalText ?? '');
      currentRunsXml.push(
        `<w:del w:id="${delId}" w:author="OpenTools Redline" w:date="${dateStr}">` +
          `<w:r><w:rPr><w:color w:val="CC0000"/><w:strike/></w:rPr>` +
          `<w:delText xml:space="preserve">${text} </w:delText></w:r></w:del>`,
      );
    } else if (chg.type === 'move') {
      const moveFromId = trackId++;
      const moveToId = trackId++;
      const oldText = escapeXml(chg.originalText ?? '');
      const newText = escapeXml(chg.revisedText ?? '');

      currentRunsXml.push(
        `<w:moveFrom w:id="${moveFromId}" w:author="OpenTools Redline" w:date="${dateStr}">` +
          `<w:r><w:rPr><w:color w:val="D97706"/><w:strike/></w:rPr>` +
          `<w:delText xml:space="preserve">${oldText} </w:delText></w:r></w:moveFrom>`,
      );
      currentRunsXml.push(
        `<w:moveTo w:id="${moveToId}" w:author="OpenTools Redline" w:date="${dateStr}">` +
          `<w:r><w:rPr><w:color w:val="D97706"/><w:u w:val="double"/></w:rPr>` +
          `<w:t xml:space="preserve">${newText} </w:t></w:r></w:moveTo>`,
      );
    } else if (chg.type === 'format') {
      const text = escapeXml(chg.revisedText ?? chg.originalText ?? '');
      currentRunsXml.push(
        `<w:r><w:rPr><w:highlight w:val="cyan"/><w:b/></w:rPr>` +
          `<w:t xml:space="preserve">${text} </w:t></w:r>`,
      );
    }

    if (currentRunsXml.length >= 10) {
      paragraphsXml.push(`<w:p>${currentRunsXml.join('')}</w:p>`);
      currentRunsXml = [];
    }
  }

  if (currentRunsXml.length > 0) {
    paragraphsXml.push(`<w:p>${currentRunsXml.join('')}</w:p>`);
  }

  const documentXml = `<w:document xmlns:w="${WORD_NS}">
  <w:body>
    ${paragraphsXml.join('\n')}
    <w:sectPr/>
  </w:body>
</w:document>`;

  const settingsXml = `<w:settings xmlns:w="${WORD_NS}">
  <w:trackRevisions/>
</w:settings>`;

  const contentTypes = `<Types xmlns="${CONTENT_TYPES_NS}">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="${DOCUMENT_CONTENT_TYPE}"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
</Types>`;

  const packageRels = `<Relationships xmlns="${PACKAGE_RELS_NS}">
  <Relationship Id="rId1" Type="${OFFICE_RELS_NS}/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const documentRels = `<Relationships xmlns="${PACKAGE_RELS_NS}">
  <Relationship Id="rId1" Type="${OFFICE_RELS_NS}/settings" Target="settings.xml"/>
</Relationships>`;

  const entries: ZipEntry[] = [
    { path: '[Content_Types].xml', data: part(contentTypes) },
    { path: '_rels/.rels', data: part(packageRels) },
    { path: 'word/document.xml', data: part(documentXml) },
    { path: 'word/settings.xml', data: part(settingsXml) },
    { path: 'word/_rels/document.xml.rels', data: part(documentRels) },
  ];

  return createZip(entries);
}
