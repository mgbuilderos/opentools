/**
 * Turning an OOXML package -- Word, Excel, PowerPoint -- into ranked findings.
 *
 * **Why one adapter for three formats.** A `.docx`, `.xlsx` and `.pptx` are the
 * same thing in different clothes: a ZIP carrying `docProps/core.xml` and
 * `docProps/app.xml`, whose element names and namespaces do not depend on which
 * application wrote them. So the author name, the company, the save count and
 * the editing time are read once here for all three, through the two parsers
 * `lib/tools/docx/metadata.ts` exports for exactly this reason.
 *
 * **What is Word-only.** Tracked changes, reviewer comments and RSIDs live in
 * `word/` parts, and `readDocxMetadata` already parses all three -- including
 * the part that matters most, the text inside `<w:delText>`, which is text the
 * author deleted that is still in the file because the deletion was never
 * accepted. A `.docx` is therefore read through that function and gets those
 * findings on top of the shared ones; a `.xlsx` or `.pptx` gets the shared ones
 * plus whatever revision parts its own package declares.
 *
 * **On previews.** A document under review can carry hundreds of tracked
 * changes, and a report with three hundred rows has buried the one that matters
 * as surely as a report with none. Deletions, insertions and comments are each
 * summarised into a single finding whose value opens with the real text, so the
 * reader sees what is actually in there without the page becoming a diff.
 */

import { readZip, extractEntry } from '../../archive/zip-reader';
import {
  parseAppProperties,
  parseCoreProperties,
  type DocxAppProperties,
  type DocxCoreProperties,
  type DocxCustomProperty,
  type DocxMetadataReport,
} from '../../docx/metadata';
import type { XrayFinding, XrayFormat } from '../types';

/** How long a preview of real document text may run before it is cut. */
const PREVIEW_LIMIT = 240;

function preview(parts: readonly string[]): string {
  const joined = parts
    .map((part) => part.replace(/\s+/gu, ' ').trim())
    .filter((part) => part.length > 0)
    .join(' · ');
  if (joined.length <= PREVIEW_LIMIT) return joined;
  return `${joined.slice(0, PREVIEW_LIMIT).trimEnd()}…`;
}

/** Joins a list of names for a sentence, without the Oxford comma question. */
function nameList(names: readonly string[]): string {
  return names.filter(Boolean).join(', ');
}

/**
 * Findings from the two parts every OOXML package carries.
 *
 * `application` is named in the switch below rather than given a fixed string,
 * because "Microsoft Excel" in a file someone swears was made in Google Sheets
 * is a different disclosure from the same string in a file nobody asked about.
 */
function coreAndAppFindings(
  core: DocxCoreProperties,
  app: DocxAppProperties,
  custom: readonly DocxCustomProperty[],
): XrayFinding[] {
  const findings: XrayFinding[] = [];

  if (core.creator) {
    findings.push({
      id: 'ooxml-creator',
      category: 'identity',
      severity: 'high',
      label: 'Author',
      value: core.creator,
      consequence:
        'The name on the account that created the file. It is saved automatically and stays through every later edit unless somebody removes it.',
      source: 'Document properties',
    });
  }

  if (core.lastModifiedBy) {
    findings.push({
      id: 'ooxml-last-modified-by',
      category: 'identity',
      severity: 'high',
      label: 'Last saved by',
      value: core.lastModifiedBy,
      consequence:
        'The last person to save the file. When a document is reused or passed around, this is the name that gives away who actually touched it.',
      source: 'Document properties',
    });
  }

  if (app.company) {
    findings.push({
      id: 'ooxml-company',
      category: 'identity',
      severity: 'high',
      label: 'Company',
      value: app.company,
      consequence:
        'Your employer, taken from the copy of Office that made the file. It is in the document whether or not the document mentions them.',
      source: 'Extended properties',
    });
  }

  if (app.manager) {
    findings.push({
      id: 'ooxml-manager',
      category: 'identity',
      severity: 'high',
      label: 'Manager',
      value: app.manager,
      consequence:
        'A second person named in the file, usually from a company template.',
      source: 'Extended properties',
    });
  }

  for (const [id, label, value] of [
    ['ooxml-title', 'Title', core.title],
    ['ooxml-subject', 'Subject', core.subject],
    ['ooxml-description', 'Description', core.description],
    ['ooxml-keywords', 'Keywords', core.keywords],
    ['ooxml-category', 'Category', core.category],
  ] as const) {
    if (value) {
      findings.push({
        id,
        category: 'hidden-content',
        severity: 'medium',
        label,
        value,
        consequence:
          'Saved with the file rather than shown in it, so it survives a rename and is often an older working title.',
        source: 'Document properties',
      });
    }
  }

  for (const property of custom) {
    findings.push({
      id: `ooxml-custom-${property.name.toLowerCase().replace(/[^a-z0-9]+/gu, '-')}`,
      category: 'hidden-content',
      severity: 'medium',
      label: `Custom property: ${property.name}`,
      value: property.value,
      consequence:
        'A field added by a template or a document management system. These routinely carry client names, matter numbers and internal classifications.',
      source: 'Custom properties',
    });
  }

  if (app.template) {
    findings.push({
      id: 'ooxml-template',
      category: 'device',
      severity: 'medium',
      label: 'Template',
      value: app.template,
      consequence:
        'The template the file was built from. When it is a full path it often contains a Windows username or a network share name.',
      source: 'Extended properties',
    });
  }

  const application = [app.application, app.appVersion]
    .filter(Boolean)
    .join(' ');
  if (application) {
    findings.push({
      id: 'ooxml-application',
      category: 'device',
      severity: 'low',
      label: 'Application',
      value: application,
      consequence:
        'Which program and version wrote the file, which says what you run and can contradict a claim about how it was made.',
      source: 'Extended properties',
    });
  }

  if (app.totalTimeMinutes !== null && app.totalTimeMinutes > 0) {
    findings.push({
      id: 'ooxml-editing-time',
      category: 'timeline',
      severity: 'medium',
      label: 'Total editing time',
      value: `${app.totalTimeMinutes} minutes`,
      consequence:
        'How long the file was actually open and being edited. A document presented as a week of work can show twenty minutes here.',
      source: 'Extended properties',
    });
  }

  for (const [id, label, value, severity] of [
    ['ooxml-created', 'Created', core.created, 'medium'],
    ['ooxml-modified', 'Modified', core.modified, 'low'],
  ] as const) {
    if (value) {
      findings.push({
        id,
        category: 'timeline',
        severity,
        label,
        value,
        consequence:
          'When the file was really created or last saved, which can disagree with the date written in it.',
        source: 'Document properties',
      });
    }
  }

  if (core.revision) {
    findings.push({
      id: 'ooxml-revision',
      category: 'timeline',
      severity: 'low',
      label: 'Revision number',
      value: core.revision,
      consequence:
        'How many times the file has been saved, which hints at how much it has been reworked.',
      source: 'Document properties',
    });
  }

  for (const [id, label, value] of [
    ['ooxml-pages', 'Pages', app.pages],
    ['ooxml-words', 'Words', app.words],
    ['ooxml-characters', 'Characters', app.characters],
    ['ooxml-lines', 'Lines', app.lines],
    ['ooxml-paragraphs', 'Paragraphs', app.paragraphs],
  ] as const) {
    if (value !== null && value !== undefined) {
      findings.push({
        id,
        category: 'technical',
        severity: 'low',
        label,
        value: String(value),
        consequence:
          'A count of the document itself. It says nothing about you.',
        source: 'Extended properties',
      });
    }
  }

  return findings;
}

/** Everything a Word document says, including what it no longer shows. */
export function docxFindings(
  report: DocxMetadataReport,
): readonly XrayFinding[] {
  const findings = coreAndAppFindings(report.core, report.app, report.custom);

  const deletions = report.trackedChanges.items.filter(
    (item) => item.type === 'deletion' && item.text.trim().length > 0,
  );
  if (deletions.length > 0) {
    findings.push({
      id: 'docx-deleted-text',
      category: 'hidden-content',
      severity: 'high',
      label: `Deleted text still in the file (${deletions.length})`,
      value: preview(deletions.map((item) => item.text)),
      /*
        The single most surprising thing in this whole tool, and the reason the
        docx parser goes after `<w:delText>` at all: a deletion that was never
        accepted is not gone. Word hides it, every reader hides it, and it is
        sitting in the XML.
      */
      consequence:
        'This is text somebody deleted that is still inside the file, because the deletion was never accepted. Word does not show it. Anyone who opens the file in a text editor, or turns markup back on, can read every word.',
      source: 'Tracked changes',
    });
  }

  const insertions = report.trackedChanges.items.filter(
    (item) => item.type === 'insertion' && item.text.trim().length > 0,
  );
  if (insertions.length > 0) {
    findings.push({
      id: 'docx-insertions',
      category: 'hidden-content',
      severity: 'medium',
      label: `Tracked insertions (${insertions.length})`,
      value: preview(insertions.map((item) => item.text)),
      consequence:
        'Text marked as added rather than plain, which shows what changed and who changed it.',
      source: 'Tracked changes',
    });
  }

  if (report.trackedChanges.authors.length > 0) {
    findings.push({
      id: 'docx-revision-authors',
      category: 'identity',
      severity: 'high',
      label: 'Editors named in tracked changes',
      value: nameList(report.trackedChanges.authors),
      consequence:
        'Everyone who edited the document with tracking on is named in it, whether or not they were meant to be part of the conversation.',
      source: 'Tracked changes',
    });
  }

  if (report.comments.length > 0) {
    findings.push({
      id: 'docx-comments',
      category: 'hidden-content',
      severity: 'high',
      label: `Reviewer comments (${report.comments.length})`,
      value: preview(
        report.comments.map((comment) =>
          comment.author ? `${comment.author}: ${comment.text}` : comment.text,
        ),
      ),
      consequence:
        'Comment threads are stored in the file and travel with it. A reader who opens the review pane sees the internal discussion, including the parts about them.',
      source: 'Comments',
    });
  }

  if (report.rsids.count > 0) {
    findings.push({
      id: 'docx-rsids',
      category: 'device',
      severity: 'high',
      label: `Revision save identifiers (${report.rsids.count})`,
      value: report.rsids.values.slice(0, 8).join(', '),
      consequence:
        'Random ids Word stamps into the file per editing session, tied to the installation that made them. They can show that two documents from supposedly unrelated sources were edited on the same computer.',
      source: 'Word settings',
    });
  }

  return findings;
}

/**
 * Parts whose mere presence is a finding.
 *
 * Unlike everything above, these are not read for their values -- the point is
 * that the package contains them at all. A shared workbook's revision log is
 * the spreadsheet equivalent of unaccepted tracked changes: a record of who
 * changed which cell and what it said before.
 */
const NOTABLE_PARTS: readonly {
  test: RegExp;
  id: string;
  label: string;
  category: XrayFinding['category'];
  severity: XrayFinding['severity'];
  consequence: string;
}[] = [
  {
    test: /^xl\/revisions\//u,
    id: 'xlsx-revision-log',
    label: 'Shared workbook revision log',
    category: 'hidden-content',
    severity: 'high',
    consequence:
      'A change history kept inside the workbook: which cells were edited, by whom, and in many cases the values they held before. None of it is visible on the sheet.',
  },
  {
    test: /^xl\/threadedComments\/|^xl\/comments\d*\.xml$/u,
    id: 'xlsx-comments',
    label: 'Cell comments',
    category: 'hidden-content',
    severity: 'medium',
    consequence:
      'Notes attached to cells, with their authors. They are easy to leave behind because they only appear on hover.',
  },
  {
    test: /^xl\/persons\/person\.xml$/u,
    id: 'xlsx-persons',
    label: 'Named comment authors',
    category: 'identity',
    severity: 'high',
    consequence:
      'A list of the people who commented in the workbook, stored by name and by account id.',
  },
  {
    test: /^ppt\/comments\/|^ppt\/notesSlides\//u,
    id: 'pptx-notes-comments',
    label: 'Speaker notes or slide comments',
    category: 'hidden-content',
    severity: 'medium',
    consequence:
      'Notes and comments attached to slides. A deck presented from these carries them into every copy that is shared.',
  },
];

/**
 * Findings for an OOXML package that is not a Word document.
 *
 * Reads only `docProps/` plus the archive index, so a large workbook costs two
 * small decompressions rather than a full unpack.
 */
export async function ooxmlPackageFindings(
  bytes: Uint8Array,
  format: XrayFormat,
): Promise<{
  findings: readonly XrayFinding[];
  warnings: readonly string[];
}> {
  const warnings: string[] = [];
  let archive;
  try {
    archive = readZip(bytes);
  } catch (error) {
    return {
      findings: [],
      warnings: [
        error instanceof Error
          ? error.message
          : 'This file could not be opened as an OOXML package.',
      ],
    };
  }

  const decoder = new TextDecoder();
  const partText = async (path: string): Promise<string | undefined> => {
    const entry = archive.entries.find(
      (candidate) => !candidate.isDirectory && candidate.path === path,
    );
    if (!entry) return undefined;
    try {
      return decoder.decode(await extractEntry(bytes, entry));
    } catch {
      warnings.push(`The ${path} part of this file could not be read.`);
      return undefined;
    }
  };

  const coreXml = await partText('docProps/core.xml');
  const appXml = await partText('docProps/app.xml');

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

  const findings = coreAndAppFindings(core, app, []);

  const paths = archive.entries
    .filter((entry) => !entry.isDirectory)
    .map((entry) => entry.path);
  for (const part of NOTABLE_PARTS) {
    const matches = paths.filter((path) => part.test.test(path));
    if (matches.length === 0) continue;
    findings.push({
      id: part.id,
      category: part.category,
      severity: part.severity,
      label: part.label,
      value: `${matches.length} part${matches.length === 1 ? '' : 's'}: ${matches.slice(0, 4).join(', ')}`,
      consequence: part.consequence,
      source: 'Package contents',
    });
  }

  if (format === 'zip') {
    findings.push({
      id: 'zip-entries',
      category: 'technical',
      severity: 'low',
      label: 'Archive entries',
      value: `${archive.fileCount} files, ${archive.directoryCount} folders`,
      consequence:
        'A ZIP stores every entry name and modification date in its index, readable without unpacking it.',
      source: 'Archive index',
    });
  }

  return { findings, warnings };
}
