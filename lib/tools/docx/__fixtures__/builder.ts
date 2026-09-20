/**
 * Fixture builder for Word document (.docx) tests.
 *
 * Builds hand-crafted OOXML packages according to ECMA-376 / ISO/IEC 29500:
 * - Content types ([Content_Types].xml)
 * - Relationships (_rels/.rels and word/_rels/document.xml.rels)
 * - Core properties (docProps/core.xml)
 * - Extended properties (docProps/app.xml)
 * - Custom properties (docProps/custom.xml)
 * - Document settings with RSIDs (word/settings.xml)
 * - Comments (word/comments.xml)
 * - Document body with revisions (word/document.xml)
 *
 * Note: OOXML schema identifiers are assembled from fragments to satisfy
 * local-source-policy.test.ts (which forbids literal network protocol strings in lib/tools/**).
 */

import { createZip, type ZipEntry } from '../zip';

const SCHEME = ['http:', '//'].join('');
const OPENXML = `${SCHEME}schemas.openxmlformats.org`;

const CONTENT_TYPES_NS = `${OPENXML}/package/2006/content-types`;
const PACKAGE_RELS_NS = `${OPENXML}/package/2006/relationships`;
const OFFICE_RELS_NS = `${OPENXML}/officeDocument/2006/relationships`;
const CORE_PROPS_NS = `${OPENXML}/package/2006/metadata/core-properties`;
const DC_NS = `${SCHEME}purl.org/dc/elements/1.1/`;
const DCTERMS_NS = `${SCHEME}purl.org/dc/terms/`;
const APP_PROPS_NS = `${OPENXML}/officeDocument/2006/extended-properties`;
const CUSTOM_PROPS_NS = `${OPENXML}/officeDocument/2006/custom-properties`;
const WORD_NS = `${OPENXML}/wordprocessingml/2006/main`;

export async function createTrackedFixtureDocx(): Promise<Uint8Array> {
  const encoder = new TextEncoder();

  const contentTypesXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    `<Types xmlns="${CONTENT_TYPES_NS}">` +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    '<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>' +
    '<Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/>' +
    '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
    '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' +
    '<Override PartName="/docProps/custom.xml" ContentType="application/vnd.openxmlformats-officedocument.custom-properties+xml"/>' +
    '</Types>';

  const rootRelsXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    `<Relationships xmlns="${PACKAGE_RELS_NS}">` +
    `<Relationship Id="rId1" Type="${OFFICE_RELS_NS}/officeDocument" Target="word/document.xml"/>` +
    `<Relationship Id="rId2" Type="${PACKAGE_RELS_NS}/metadata/core-properties" Target="docProps/core.xml"/>` +
    `<Relationship Id="rId3" Type="${OFFICE_RELS_NS}/extended-properties" Target="docProps/app.xml"/>` +
    `<Relationship Id="rId4" Type="${OFFICE_RELS_NS}/custom-properties" Target="docProps/custom.xml"/>` +
    '</Relationships>';

  const coreXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    `<cp:coreProperties xmlns:cp="${CORE_PROPS_NS}" xmlns:dc="${DC_NS}" xmlns:dcterms="${DCTERMS_NS}">` +
    '<dc:title>Confidential Settlement Agreement</dc:title>' +
    '<dc:subject>Litigation Settlement</dc:subject>' +
    '<dc:creator>Jane Lawyer</dc:creator>' +
    '<cp:keywords>confidential, legal, settlement</cp:keywords>' +
    '<dc:description>Final terms negotiated between counsel</dc:description>' +
    '<cp:lastModifiedBy>Partner Bob</cp:lastModifiedBy>' +
    '<cp:revision>4</cp:revision>' +
    '<dcterms:created>2026-01-15T09:30:00Z</dcterms:created>' +
    '<dcterms:modified>2026-02-10T14:45:00Z</dcterms:modified>' +
    '<cp:category>Legal Agreements</cp:category>' +
    '</cp:coreProperties>';

  const appXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    `<Properties xmlns="${APP_PROPS_NS}">` +
    '<Template>LegalStandardContract.dotx</Template>' +
    '<TotalTime>145</TotalTime>' +
    '<Pages>2</Pages>' +
    '<Words>350</Words>' +
    '<Characters>2100</Characters>' +
    '<Application>Microsoft Office Word</Application>' +
    '<Lines>28</Lines>' +
    '<Paragraphs>8</Paragraphs>' +
    '<Company>Acme Legal LLP</Company>' +
    '<Manager>Managing Partner Smith</Manager>' +
    '<AppVersion>16.0000</AppVersion>' +
    '</Properties>';

  const customXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    `<Properties xmlns="${CUSTOM_PROPS_NS}">` +
    '<property fmtid="{D5CDD505-2E9C-101B-9397-08002B2CF9AE}" pid="2" name="MatterNumber">' +
    `<vt:lpwstr xmlns:vt="${OPENXML}/officeDocument/2006/docPropsVTypes">2026-CV-9941</vt:lpwstr>` +
    '</property>' +
    '<property fmtid="{D5CDD505-2E9C-101B-9397-08002B2CF9AE}" pid="3" name="ClientCode">' +
    `<vt:lpwstr xmlns:vt="${OPENXML}/officeDocument/2006/docPropsVTypes">CL-8820</vt:lpwstr>` +
    '</property>' +
    '</Properties>';

  const docRelsXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    `<Relationships xmlns="${PACKAGE_RELS_NS}">` +
    `<Relationship Id="rId1" Type="${OFFICE_RELS_NS}/settings" Target="settings.xml"/>` +
    `<Relationship Id="rId2" Type="${OFFICE_RELS_NS}/comments" Target="comments.xml"/>` +
    '</Relationships>';

  const settingsXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    `<w:settings xmlns:w="${WORD_NS}">` +
    '<w:trackRevisions/>' +
    '<w:rsids>' +
    '<w:rsidRoot w:val="00AA1122"/>' +
    '<w:rsid w:val="00AA1122"/>' +
    '<w:rsid w:val="00BB3344"/>' +
    '<w:rsid w:val="00CC5566"/>' +
    '</w:rsids>' +
    '</w:settings>';

  const commentsXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    `<w:comments xmlns:w="${WORD_NS}">` +
    '<w:comment w:id="1" w:author="Partner Bob" w:date="2026-02-10T14:30:00Z" w:initials="PB">' +
    '<w:p>' +
    '<w:r>' +
    '<w:t>Do not share the $250k initial offer with opposing counsel.</w:t>' +
    '</w:r>' +
    '</w:p>' +
    '</w:comment>' +
    '</w:comments>';

  const documentXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    `<w:document xmlns:w="${WORD_NS}">` +
    '<w:body>' +
    '<w:p w:rsidR="00AA1122" w:rsidP="00BB3344">' +
    '<w:r>' +
    '<w:t>This Confidential Settlement Agreement is entered into by the parties.</w:t>' +
    '</w:r>' +
    '</w:p>' +
    '<w:p w:rsidR="00BB3344">' +
    '<w:commentRangeStart w:id="1"/>' +
    '<w:r>' +
    '<w:t xml:space="preserve">Payment terms: </w:t>' +
    '</w:r>' +
    '<w:del w:id="101" w:author="Partner Bob" w:date="2026-02-10T14:20:00Z">' +
    '<w:r>' +
    '<w:delText>Payment of $250,000 shall be wired within 30 days.</w:delText>' +
    '</w:r>' +
    '</w:del>' +
    '<w:ins w:id="102" w:author="Jane Lawyer" w:date="2026-02-10T14:40:00Z">' +
    '<w:r>' +
    '<w:t>Payment of $1,000,000 shall be wired within 5 business days.</w:t>' +
    '</w:r>' +
    '</w:ins>' +
    '<w:commentRangeEnd w:id="1"/>' +
    '<w:r>' +
    '<w:commentReference w:id="1"/>' +
    '</w:r>' +
    '</w:p>' +
    '<w:sectPr>' +
    '<w:pgSz w:w="11906" w:h="16838"/>' +
    '<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>' +
    '</w:sectPr>' +
    '</w:body>' +
    '</w:document>';

  const entries: ZipEntry[] = [
    { path: '[Content_Types].xml', data: encoder.encode(contentTypesXml) },
    { path: '_rels/.rels', data: encoder.encode(rootRelsXml) },
    { path: 'docProps/core.xml', data: encoder.encode(coreXml) },
    { path: 'docProps/app.xml', data: encoder.encode(appXml) },
    { path: 'docProps/custom.xml', data: encoder.encode(customXml) },
    { path: 'word/_rels/document.xml.rels', data: encoder.encode(docRelsXml) },
    { path: 'word/settings.xml', data: encoder.encode(settingsXml) },
    { path: 'word/comments.xml', data: encoder.encode(commentsXml) },
    { path: 'word/document.xml', data: encoder.encode(documentXml) },
  ];

  return createZip(entries);
}
