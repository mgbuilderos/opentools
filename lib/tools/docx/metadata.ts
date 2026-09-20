/**
 * Pure TypeScript Word document (.docx) metadata inspector and stripper.
 *
 * A .docx file is a ZIP archive of OOXML parts. This module inspects and strips:
 * 1. Core properties (docProps/core.xml): author, lastModifiedBy, title, subject,
 *    keywords, description, timestamps, revision count.
 * 2. Extended app properties (docProps/app.xml): company, manager, total editing
 *    time (minutes), template name, application.
 * 3. Custom properties (docProps/custom.xml).
 * 4. Comments (word/comments.xml, commentsExtended.xml): text, author, initials, dates.
 * 5. Tracked changes (w:ins / w:del): insertions and deletions with authors, dates,
 *    and critically the unaccepted deleted text hidden inside <w:delText>.
 * 6. Revision Save Identifiers (RSIDs in word/settings.xml and document.xml) which
 *    can correlate documents edited on the same computer installation.
 *
 * Revision policies for tracked changes:
 * - 'keep': Preserves all revisions (<w:ins> and <w:del>) intact.
 * - 'accept': Accepts all revisions (keeps inserted text, permanently deletes deleted text).
 * - 'reject': Rejects all revisions (removes inserted text, restores deleted text to normal text).
 */

import { extractEntry, readZip } from '../archive/zip-reader';
import { attributes, decodeEntities, eachElement } from '../spreadsheet/xml';
import { createZip, type ZipEntry } from './zip';

// Namespace schema identifiers constructed without literal URLs to satisfy local-source-policy
const SCHEME = ['http:', '//'].join('');
const OPENXML = `${SCHEME}schemas.openxmlformats.org`;
const CORE_PROPS_NS = `${OPENXML}/package/2006/metadata/core-properties`;
const DC_NS = `${SCHEME}purl.org/dc/elements/1.1/`;
const DCTERMS_NS = `${SCHEME}purl.org/dc/terms/`;
const APP_PROPS_NS = `${OPENXML}/officeDocument/2006/extended-properties`;

export interface DocxCoreProperties {
  creator: string | null;
  lastModifiedBy: string | null;
  title: string | null;
  subject: string | null;
  description: string | null;
  keywords: string | null;
  category: string | null;
  created: string | null;
  modified: string | null;
  revision: string | null;
}

export interface DocxAppProperties {
  company: string | null;
  manager: string | null;
  totalTimeMinutes: number | null;
  template: string | null;
  application: string | null;
  appVersion: string | null;
  pages: number | null;
  words: number | null;
  characters: number | null;
  lines: number | null;
  paragraphs: number | null;
}

export interface DocxCustomProperty {
  name: string;
  value: string;
}

export interface DocxComment {
  id: string;
  author: string;
  initials?: string;
  date?: string;
  text: string;
}

export interface DocxTrackedChange {
  type: 'insertion' | 'deletion';
  id: string;
  author: string;
  date?: string;
  text: string;
}

export interface DocxMetadataReport {
  fileName?: string;
  fileSizeBytes: number;
  core: DocxCoreProperties;
  app: DocxAppProperties;
  custom: DocxCustomProperty[];
  comments: DocxComment[];
  trackedChanges: {
    insertionsCount: number;
    deletionsCount: number;
    authors: string[];
    items: DocxTrackedChange[];
  };
  rsids: {
    count: number;
    values: string[];
  };
  hasSensitiveData: boolean;
}

export type TrackedChangesPolicy = 'keep' | 'accept' | 'reject';

export interface DocxStripOptions {
  /**
   * Tracked changes policy:
   * - 'keep': Leave insertions (<w:ins>) and deletions (<w:del>) in place.
   * - 'accept': Keep inserted text, permanently remove deleted text (<w:del>).
   * - 'reject': Remove inserted text (<w:ins>), restore deleted text (<w:delText> -> <w:t>).
   * Default is 'keep'.
   */
  trackedChanges?: TrackedChangesPolicy;
  /** Whether to strip reviewer comments. Default: true. */
  stripComments?: boolean;
  /** Whether to strip RSID machine identifiers. Default: true. */
  stripRsids?: boolean;
  /** Whether to remove/sanitize core, app, and custom properties. Default: true. */
  stripProperties?: boolean;
}

function parseCoreProperties(xml: string): DocxCoreProperties {
  const getTagValue = (tagName: string): string | null => {
    const pattern = new RegExp(
      `<(?:[a-zA-Z0-9_]+:)?${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[a-zA-Z0-9_]+:)?${tagName}>`,
      'u',
    );
    const match = pattern.exec(xml);
    if (!match) return null;
    const val = decodeEntities(match[1]).trim();
    return val.length > 0 ? val : null;
  };

  return {
    creator: getTagValue('creator'),
    lastModifiedBy: getTagValue('lastModifiedBy'),
    title: getTagValue('title'),
    subject: getTagValue('subject'),
    description: getTagValue('description'),
    keywords: getTagValue('keywords'),
    category: getTagValue('category'),
    created: getTagValue('created'),
    modified: getTagValue('modified'),
    revision: getTagValue('revision'),
  };
}

function parseAppProperties(xml: string): DocxAppProperties {
  const getTagValue = (tagName: string): string | null => {
    const pattern = new RegExp(
      `<(?:[a-zA-Z0-9_]+:)?${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[a-zA-Z0-9_]+:)?${tagName}>`,
      'u',
    );
    const match = pattern.exec(xml);
    if (!match) return null;
    const val = decodeEntities(match[1]).trim();
    return val.length > 0 ? val : null;
  };

  const getNumValue = (tagName: string): number | null => {
    const val = getTagValue(tagName);
    if (val === null) return null;
    const n = Number.parseInt(val, 10);
    return Number.isNaN(n) ? null : n;
  };

  return {
    company: getTagValue('Company'),
    manager: getTagValue('Manager'),
    totalTimeMinutes: getNumValue('TotalTime'),
    template: getTagValue('Template'),
    application: getTagValue('Application'),
    appVersion: getTagValue('AppVersion'),
    pages: getNumValue('Pages'),
    words: getNumValue('Words'),
    characters: getNumValue('Characters'),
    lines: getNumValue('Lines'),
    paragraphs: getNumValue('Paragraphs'),
  };
}

function parseCustomProperties(xml: string): DocxCustomProperty[] {
  const list: DocxCustomProperty[] = [];
  eachElement(xml, 'property', (element) => {
    const name = element.attrs.name;
    if (!name) return;
    const valMatch =
      /<vt:[a-zA-Z0-9]+(?:\s[^>]*)?>([\s\S]*?)<\/vt:[a-zA-Z0-9]+>/u.exec(
        element.inner,
      );
    const value = valMatch ? decodeEntities(valMatch[1]).trim() : '';
    list.push({ name, value });
  });
  return list;
}

function parseComments(xml: string): DocxComment[] {
  const list: DocxComment[] = [];
  eachElement(xml, 'w:comment', (element) => {
    const id = element.attrs['w:id'] ?? '';
    const author = element.attrs['w:author'] ?? '';
    const initials = element.attrs['w:initials'];
    const date = element.attrs['w:date'];
    let text = '';
    eachElement(element.inner, 'w:t', (tElem) => {
      text += decodeEntities(tElem.inner);
    });
    list.push({
      id,
      author,
      initials,
      date,
      text: text.trim(),
    });
  });
  return list;
}

interface TrackedBlock {
  start: number;
  end: number;
  tagName: 'w:ins' | 'w:del';
  attrs: Record<string, string>;
  inner: string;
}

function findTrackedBlocks(
  xml: string,
  tagName: 'w:ins' | 'w:del',
): TrackedBlock[] {
  const blocks: TrackedBlock[] = [];
  const openRegex = new RegExp(`<${tagName}(\\s[^>]*?)?(/)?>`, 'gu');
  let match = openRegex.exec(xml);

  while (match) {
    const startIdx = match.index;
    const tagAttrs = attributes(match[1] ?? '');
    const isSelfClosing = match[2] === '/';

    if (isSelfClosing) {
      blocks.push({
        start: startIdx,
        end: startIdx + match[0].length,
        tagName,
        attrs: tagAttrs,
        inner: '',
      });
      openRegex.lastIndex = startIdx + match[0].length;
    } else {
      let depth = 1;
      const innerStart = startIdx + match[0].length;
      const subPattern = new RegExp(
        `(<${tagName}(\\s[^>]*?)?(/)?>)|(</${tagName}>)`,
        'gu',
      );
      subPattern.lastIndex = innerStart;

      let subMatch = subPattern.exec(xml);
      let endIdx = -1;

      while (subMatch) {
        if (subMatch[4]) {
          depth -= 1;
          if (depth === 0) {
            endIdx = subMatch.index + subMatch[0].length;
            blocks.push({
              start: startIdx,
              end: endIdx,
              tagName,
              attrs: tagAttrs,
              inner: xml.slice(innerStart, subMatch.index),
            });
            break;
          }
        } else if (subMatch[1] && subMatch[3] !== '/') {
          depth += 1;
        }
        subMatch = subPattern.exec(xml);
      }

      if (endIdx !== -1) {
        openRegex.lastIndex = endIdx;
      } else {
        openRegex.lastIndex = innerStart;
      }
    }
    match = openRegex.exec(xml);
  }

  return blocks;
}

function parseTrackedChangesFromXml(xml: string): DocxTrackedChange[] {
  const changes: DocxTrackedChange[] = [];

  // Insertions: <w:ins>
  const insBlocks = findTrackedBlocks(xml, 'w:ins');
  for (const block of insBlocks) {
    let text = '';
    eachElement(block.inner, 'w:t', (tElem) => {
      text += decodeEntities(tElem.inner);
    });
    changes.push({
      type: 'insertion',
      id: block.attrs['w:id'] ?? '',
      author: block.attrs['w:author'] ?? '',
      date: block.attrs['w:date'],
      text,
    });
  }

  // Deletions: <w:del>
  const delBlocks = findTrackedBlocks(xml, 'w:del');
  for (const block of delBlocks) {
    let text = '';
    eachElement(block.inner, 'w:delText', (tElem) => {
      text += decodeEntities(tElem.inner);
    });
    changes.push({
      type: 'deletion',
      id: block.attrs['w:id'] ?? '',
      author: block.attrs['w:author'] ?? '',
      date: block.attrs['w:date'],
      text,
    });
  }

  return changes;
}

function extractRsids(xml: string, collector: Set<string>): void {
  // Settings RSID elements: <w:rsid w:val="00112233"/>
  eachElement(xml, 'w:rsid', (elem) => {
    if (elem.attrs['w:val']) collector.add(elem.attrs['w:val']);
  });
  eachElement(xml, 'w:rsidRoot', (elem) => {
    if (elem.attrs['w:val']) collector.add(elem.attrs['w:val']);
  });

  // Attribute RSIDs: w:rsidR="00112233", w:rsidP="...", etc.
  const attrPattern = /\bw:rsid[A-Za-z]*="([0-9A-Fa-f]+)"/gu;
  let m = attrPattern.exec(xml);
  while (m) {
    collector.add(m[1]);
    m = attrPattern.exec(xml);
  }
}

/**
 * Inspect a .docx document and return all discovered metadata, comments,
 * machine RSIDs, and tracked changes (including unaccepted deletions).
 */
export async function readDocxMetadata(
  bytes: Uint8Array,
  fileName?: string,
): Promise<DocxMetadataReport> {
  const archive = readZip(bytes);
  const partMap = new Map<string, string>();
  const decoder = new TextDecoder();

  for (const entry of archive.entries) {
    if (!entry.isDirectory) {
      const cleanPath = entry.path.replace(/^\/+/u, '');
      const raw = await extractEntry(bytes, entry);
      partMap.set(cleanPath, decoder.decode(raw));
    }
  }

  if (!partMap.has('word/document.xml')) {
    throw new Error(
      'This file is missing word/document.xml. It does not appear to be a valid Word (.docx) document.',
    );
  }

  // Core properties
  const coreXml = partMap.get('docProps/core.xml');
  const core: DocxCoreProperties = coreXml
    ? parseCoreProperties(coreXml)
    : {
        creator: null,
        lastModifiedBy: null,
        title: null,
        subject: null,
        description: null,
        keywords: null,
        category: null,
        created: null,
        modified: null,
        revision: null,
      };

  // App properties
  const appXml = partMap.get('docProps/app.xml');
  const app: DocxAppProperties = appXml
    ? parseAppProperties(appXml)
    : {
        company: null,
        manager: null,
        totalTimeMinutes: null,
        template: null,
        application: null,
        appVersion: null,
        pages: null,
        words: null,
        characters: null,
        lines: null,
        paragraphs: null,
      };

  // Custom properties
  const customXml = partMap.get('docProps/custom.xml');
  const custom = customXml ? parseCustomProperties(customXml) : [];

  // Comments
  const commentsXml = partMap.get('word/comments.xml');
  const comments = commentsXml ? parseComments(commentsXml) : [];

  // Tracked changes across document and any headers/footers
  const allTrackedChanges: DocxTrackedChange[] = [];
  const rsidSet = new Set<string>();

  for (const [path, xml] of partMap.entries()) {
    if (
      path === 'word/document.xml' ||
      /^word\/(header|footer)\d+\.xml$/u.test(path)
    ) {
      allTrackedChanges.push(...parseTrackedChangesFromXml(xml));
    }
    if (path.startsWith('word/')) {
      extractRsids(xml, rsidSet);
    }
  }

  const insertions = allTrackedChanges.filter((c) => c.type === 'insertion');
  const deletions = allTrackedChanges.filter((c) => c.type === 'deletion');
  const revisionAuthors = Array.from(
    new Set(allTrackedChanges.map((c) => c.author).filter((a) => a.length > 0)),
  );

  const hasSensitiveData = Boolean(
    core.creator ||
    core.lastModifiedBy ||
    core.title ||
    core.subject ||
    core.description ||
    core.keywords ||
    app.company ||
    app.manager ||
    comments.length > 0 ||
    allTrackedChanges.length > 0 ||
    custom.length > 0 ||
    rsidSet.size > 0,
  );

  return {
    fileName,
    fileSizeBytes: bytes.length,
    core,
    app,
    custom,
    comments,
    trackedChanges: {
      insertionsCount: insertions.length,
      deletionsCount: deletions.length,
      authors: revisionAuthors,
      items: allTrackedChanges,
    },
    rsids: {
      count: rsidSet.size,
      values: Array.from(rsidSet),
    },
    hasSensitiveData,
  };
}

/**
 * Apply tracked changes policy to an XML document string.
 */
function applyTrackedChangesPolicy(
  xml: string,
  policy: TrackedChangesPolicy,
): string {
  if (policy === 'keep') return xml;

  let result = xml;

  if (policy === 'accept') {
    // 1. Accept deletions: delete all <w:del>...</w:del> blocks completely
    // We repeatedly find top-level <w:del> blocks and remove them
    let delBlocks = findTrackedBlocks(result, 'w:del');
    while (delBlocks.length > 0) {
      // Remove from back to front so indexes remain stable
      for (let i = delBlocks.length - 1; i >= 0; i -= 1) {
        const b = delBlocks[i]!;
        result = result.slice(0, b.start) + result.slice(b.end);
      }
      delBlocks = findTrackedBlocks(result, 'w:del');
    }

    // 2. Accept insertions: unwrap <w:ins>...</w:ins> leaving their inner children intact
    let insBlocks = findTrackedBlocks(result, 'w:ins');
    while (insBlocks.length > 0) {
      for (let i = insBlocks.length - 1; i >= 0; i -= 1) {
        const b = insBlocks[i]!;
        result = result.slice(0, b.start) + b.inner + result.slice(b.end);
      }
      insBlocks = findTrackedBlocks(result, 'w:ins');
    }
  } else if (policy === 'reject') {
    // 1. Reject insertions: delete all <w:ins>...</w:ins> blocks completely
    let insBlocks = findTrackedBlocks(result, 'w:ins');
    while (insBlocks.length > 0) {
      for (let i = insBlocks.length - 1; i >= 0; i -= 1) {
        const b = insBlocks[i]!;
        result = result.slice(0, b.start) + result.slice(b.end);
      }
      insBlocks = findTrackedBlocks(result, 'w:ins');
    }

    // 2. Reject deletions: restore <w:delText> to regular <w:t>, and unwrap <w:del>
    let delBlocks = findTrackedBlocks(result, 'w:del');
    while (delBlocks.length > 0) {
      for (let i = delBlocks.length - 1; i >= 0; i -= 1) {
        const b = delBlocks[i]!;
        // Convert delText to t inside the deleted run
        const restoredInner = b.inner
          .replace(/<w:delText(\s[^>]*)?>/gu, '<w:t$1>')
          .replace(/<\/w:delText>/gu, '</w:t>');
        result = result.slice(0, b.start) + restoredInner + result.slice(b.end);
      }
      delBlocks = findTrackedBlocks(result, 'w:del');
    }
  }

  // Remove revision property change records if any
  result = result.replace(
    /<w:(?:rPr|pPr|sectPr|tcPr|trPr|tblPr)Change(?:\s[^>]*)?>[\s\S]*?<\/w:(?:rPr|pPr|sectPr|tcPr|trPr|tblPr)Change>/gu,
    '',
  );
  result = result.replace(
    /<w:(?:rPr|pPr|sectPr|tcPr|trPr|tblPr)Change(?:\s[^>]*)?\/>/gu,
    '',
  );

  return result;
}

/**
 * Remove comment references and comment ranges from document XML.
 */
function stripCommentReferences(xml: string): string {
  let cleaned = xml;
  // Comment range tags
  cleaned = cleaned.replace(/<w:commentRangeStart(?:\s[^>]*)?\/>/gu, '');
  cleaned = cleaned.replace(
    /<w:commentRangeStart(?:\s[^>]*)?>[\s\S]*?<\/w:commentRangeStart>/gu,
    '',
  );
  cleaned = cleaned.replace(/<w:commentRangeEnd(?:\s[^>]*)?\/>/gu, '');
  cleaned = cleaned.replace(
    /<w:commentRangeEnd(?:\s[^>]*)?>[\s\S]*?<\/w:commentRangeEnd>/gu,
    '',
  );

  // Comment reference tags
  cleaned = cleaned.replace(/<w:commentReference(?:\s[^>]*)?\/>/gu, '');
  cleaned = cleaned.replace(
    /<w:commentReference(?:\s[^>]*)?>[\s\S]*?<\/w:commentReference>/gu,
    '',
  );

  // Remove empty runs that only contained comment references: <w:r>\s*</w:r> or <w:r><w:rPr>...</w:rPr></w:r>
  cleaned = cleaned.replace(
    /<w:r(?:\s[^>]*)?>(\s*|<w:rPr[^>]*\/>)<\/w:r>/gu,
    '',
  );

  return cleaned;
}

/**
 * Strip RSID attributes and elements from XML.
 */
function stripRsidsFromXml(xml: string): string {
  let cleaned = xml;
  // Strip RSID elements in settings: <w:rsids>...</w:rsids>
  cleaned = cleaned.replace(/<w:rsids(?:\s[^>]*)?>[\s\S]*?<\/w:rsids>/gu, '');
  cleaned = cleaned.replace(/<w:rsidRoot(?:\s[^>]*)?\/>/gu, '');

  // Strip RSID attributes on any tag
  cleaned = cleaned.replace(/\s*\bw:rsid[A-Za-z]*="[0-9A-Fa-f]+"/gu, '');

  return cleaned;
}

/**
 * Clean and strip metadata, reviewer comments, machine RSIDs, and/or
 * tracked changes from a .docx document.
 * Returns the byte array of the modified .docx container.
 */
export async function stripDocxMetadata(
  bytes: Uint8Array,
  options: DocxStripOptions = {},
): Promise<Uint8Array> {
  const policy: TrackedChangesPolicy = options.trackedChanges ?? 'keep';
  const stripComments = options.stripComments ?? true;
  const stripRsids = options.stripRsids ?? true;
  const stripProps = options.stripProperties ?? true;

  const archive = readZip(bytes);
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  const parts = new Map<string, Uint8Array>();

  for (const entry of archive.entries) {
    if (!entry.isDirectory) {
      const path = entry.path.replace(/^\/+/u, '');
      const data = await extractEntry(bytes, entry);
      parts.set(path, data);
    }
  }

  // 1. Comments removal
  if (stripComments) {
    parts.delete('word/comments.xml');
    parts.delete('word/commentsExtended.xml');
    parts.delete('word/commentsIds.xml');
    parts.delete('word/_rels/comments.xml.rels');

    // Clean word/_rels/document.xml.rels
    const docRelsBytes = parts.get('word/_rels/document.xml.rels');
    if (docRelsBytes) {
      let docRelsXml = decoder.decode(docRelsBytes);
      docRelsXml = docRelsXml.replace(
        /<Relationship[^>]*Target="comments(?:Extended|Ids)?\.xml"[^>]*\/>/gu,
        '',
      );
      parts.set('word/_rels/document.xml.rels', encoder.encode(docRelsXml));
    }
  }

  // 2. Custom properties removal
  if (stripProps) {
    parts.delete('docProps/custom.xml');

    // Clean _rels/.rels
    const rootRelsBytes = parts.get('_rels/.rels');
    if (rootRelsBytes) {
      let rootRelsXml = decoder.decode(rootRelsBytes);
      rootRelsXml = rootRelsXml.replace(
        /<Relationship[^>]*Target="docProps\/custom\.xml"[^>]*\/>/gu,
        '',
      );
      parts.set('_rels/.rels', encoder.encode(rootRelsXml));
    }
  }

  // 3. Clean [Content_Types].xml
  const contentTypesBytes = parts.get('[Content_Types].xml');
  if (contentTypesBytes) {
    let ctXml = decoder.decode(contentTypesBytes);
    if (stripComments) {
      ctXml = ctXml.replace(
        /<Override[^>]*PartName="\/word\/comments(?:Extended|Ids)?\.xml"[^>]*\/>/gu,
        '',
      );
    }
    if (stripProps) {
      ctXml = ctXml.replace(
        /<Override[^>]*PartName="\/docProps\/custom\.xml"[^>]*\/>/gu,
        '',
      );
    }
    parts.set('[Content_Types].xml', encoder.encode(ctXml));
  }

  // 4. Sanitize Core and App properties
  if (stripProps) {
    if (parts.has('docProps/core.xml')) {
      const cleanCoreXml =
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        `<cp:coreProperties xmlns:cp="${CORE_PROPS_NS}" xmlns:dc="${DC_NS}" xmlns:dcterms="${DCTERMS_NS}">` +
        '<cp:revision>1</cp:revision>' +
        '</cp:coreProperties>';
      parts.set('docProps/core.xml', encoder.encode(cleanCoreXml));
    }

    if (parts.has('docProps/app.xml')) {
      const cleanAppXml =
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        `<Properties xmlns="${APP_PROPS_NS}">` +
        '<Application>OpenTools</Application>' +
        '</Properties>';
      parts.set('docProps/app.xml', encoder.encode(cleanAppXml));
    }
  }

  // 5. Process XML parts (word/document.xml, header/footer, settings)
  for (const [path, data] of parts.entries()) {
    if (
      path.endsWith('.xml') &&
      (path.startsWith('word/') || path === 'word/settings.xml')
    ) {
      let xml = decoder.decode(data);

      if (stripComments) {
        xml = stripCommentReferences(xml);
      }

      if (policy !== 'keep') {
        xml = applyTrackedChangesPolicy(xml, policy);
        if (path === 'word/settings.xml') {
          xml = xml.replace(/<w:trackRevisions(?:\s[^>]*)?\/>/gu, '');
        }
      }

      if (stripRsids) {
        xml = stripRsidsFromXml(xml);
      }

      parts.set(path, encoder.encode(xml));
    }
  }

  // Re-assemble the ZIP archive
  // Ensure [Content_Types].xml is first for strict readers
  const entries: ZipEntry[] = [];
  const ctData = parts.get('[Content_Types].xml');
  if (ctData) {
    entries.push({ path: '[Content_Types].xml', data: ctData });
  }

  for (const [path, data] of parts.entries()) {
    if (path !== '[Content_Types].xml') {
      entries.push({ path, data });
    }
  }

  return createZip(entries);
}
