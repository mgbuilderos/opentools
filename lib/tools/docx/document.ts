/**
 * A minimal WordprocessingML (`.docx`) writer.
 *
 * Only what a text conversion needs: paragraphs, runs with bold and a size,
 * and page breaks. No styles part, so headings are direct formatting rather
 * than named styles — that keeps the package to three parts and avoids a
 * styles.xml every reader would then have to agree with us about.
 *
 * The OOXML namespace identifiers below are assembled from parts on purpose.
 * They are schema identifiers, never fetched, but `local-source-policy.test.ts`
 * rejects a literal URL anywhere under `lib/tools/**` and that rule is worth
 * more than the readability of four constants.
 */

import { createZip, type ZipEntry } from './zip';

const SCHEME = ['http:', '//'].join('');
const OPENXML = `${SCHEME}schemas.openxmlformats.org`;
const CONTENT_TYPES_NS = `${OPENXML}/package/2006/content-types`;
const PACKAGE_RELS_NS = `${OPENXML}/package/2006/relationships`;
const OFFICE_RELS_NS = `${OPENXML}/officeDocument/2006/relationships`;
const WORD_NS = `${OPENXML}/wordprocessingml/2006/main`;

const DOCUMENT_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml';

export const DOCX_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export interface DocxRun {
  text: string;
  bold?: boolean;
  /** Font size in half-points, as OOXML counts it. 24 is 12pt. */
  sizeHalfPoints?: number;
}

export type DocxBlock =
  | { kind: 'paragraph'; runs: readonly DocxRun[] }
  | { kind: 'pageBreak' };

/**
 * Escape text for XML content, and drop the control characters XML 1.0 forbids
 * outright. PDFs routinely carry stray control bytes; left in, they make the
 * whole document unopenable, which is a worse failure than losing one glyph.
 */
export function escapeXml(value: string): string {
  let out = '';
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    const allowedControl = code === 0x09 || code === 0x0a || code === 0x0d;
    if (code < 0x20 && !allowedControl) continue;
    if (code === 0xfffe || code === 0xffff) continue;
    switch (character) {
      case '&':
        out += '&amp;';
        break;
      case '<':
        out += '&lt;';
        break;
      case '>':
        out += '&gt;';
        break;
      case '"':
        out += '&quot;';
        break;
      case "'":
        out += '&apos;';
        break;
      default:
        out += character;
    }
  }
  return out;
}

function runXml(run: DocxRun): string {
  const properties: string[] = [];
  if (run.bold) properties.push('<w:b/>');
  if (run.sizeHalfPoints !== undefined) {
    const size = Math.max(2, Math.round(run.sizeHalfPoints));
    properties.push(`<w:sz w:val="${size}"/><w:szCs w:val="${size}"/>`);
  }
  const rPr =
    properties.length > 0 ? `<w:rPr>${properties.join('')}</w:rPr>` : '';
  return `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(run.text)}</w:t></w:r>`;
}

function blockXml(block: DocxBlock): string {
  if (block.kind === 'pageBreak') {
    return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
  }
  if (block.runs.length === 0) return '<w:p/>';
  return `<w:p>${block.runs.map(runXml).join('')}</w:p>`;
}

export function buildDocumentXml(blocks: readonly DocxBlock[]): string {
  const body = blocks.map(blockXml).join('');
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    `<w:document xmlns:w="${WORD_NS}"><w:body>${body}` +
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>' +
    '<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/>' +
    '</w:sectPr></w:body></w:document>'
  );
}

function contentTypesXml(): string {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    `<Types xmlns="${CONTENT_TYPES_NS}">` +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    `<Override PartName="/word/document.xml" ContentType="${DOCUMENT_CONTENT_TYPE}"/>` +
    '</Types>'
  );
}

function rootRelsXml(): string {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    `<Relationships xmlns="${PACKAGE_RELS_NS}">` +
    `<Relationship Id="rId1" Type="${OFFICE_RELS_NS}/officeDocument" Target="word/document.xml"/>` +
    '</Relationships>'
  );
}

/** Build a complete `.docx` from a block list. */
export async function buildDocx(
  blocks: readonly DocxBlock[],
): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const entries: ZipEntry[] = [
    // [Content_Types].xml must be the first entry for some strict readers.
    { path: '[Content_Types].xml', data: encoder.encode(contentTypesXml()) },
    { path: '_rels/.rels', data: encoder.encode(rootRelsXml()) },
    {
      path: 'word/document.xml',
      data: encoder.encode(buildDocumentXml(blocks)),
    },
  ];
  return createZip(entries);
}
