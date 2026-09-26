/**
 * Turning `PdfMetadataReport` into ranked findings.
 *
 * `lib/tools/pdf/metadata` already knows the four places a PDF keeps identity --
 * the Info dictionary, the XMP packet, the dates and the trailer's file
 * identifier -- and its module comment is the reference for why each one needs
 * removing separately. It returns findings already tagged with which of the four
 * they came from, so this is a classification pass: which of them would
 * embarrass someone, and what do they give away.
 *
 * The labels that parser emits are the join key. They are a small, closed set
 * declared as literals in `INFO_FIELDS` and `XMP_PATTERNS`, so matching on them
 * is matching on a list in the same repository rather than on parsed text.
 */

import type { MetadataFinding } from '../../pdf/metadata';
import type { XrayFinding } from '../types';

/**
 * How each label the PDF parser can emit is presented.
 *
 * A label absent from here still appears in the report, through the fallback in
 * `pdfFindings`. That matters because the PDF parser's `XMP_PATTERNS` list is
 * expected to grow, and a new pattern should show up as a finding the day it is
 * added rather than waiting for someone to remember this file.
 */
const RULES: Readonly<
  Record<
    string,
    {
      category: XrayFinding['category'];
      severity: XrayFinding['severity'];
      consequence: string;
    }
  >
> = {
  Author: {
    category: 'identity',
    severity: 'high',
    consequence:
      'Your name, written by whatever program made the PDF. It survives printing to PDF and is read by anyone who opens the file properties.',
  },
  'Author (XMP)': {
    category: 'identity',
    severity: 'high',
    consequence:
      'A second copy of the author name, in the XMP packet. Clearing the document properties in most editors does not remove this one.',
  },
  Title: {
    category: 'hidden-content',
    severity: 'medium',
    consequence:
      'The internal title, which is often the original filename or working title rather than the one on the cover page.',
  },
  'Title (XMP)': {
    category: 'hidden-content',
    severity: 'medium',
    consequence:
      'The title again, in the XMP packet, where an earlier working title tends to survive a rename.',
  },
  Subject: {
    category: 'hidden-content',
    severity: 'medium',
    consequence:
      'A description saved with the file that the pages themselves may not show.',
  },
  'Description (XMP)': {
    category: 'hidden-content',
    severity: 'medium',
    consequence:
      'A description held in the XMP packet, invisible in a normal reader.',
  },
  Keywords: {
    category: 'hidden-content',
    severity: 'medium',
    consequence:
      'Keywords saved with the document, sometimes including internal project or client names.',
  },
  Creator: {
    category: 'device',
    severity: 'medium',
    consequence:
      'The program the document was written in, which says what software you run.',
  },
  'Authoring tool': {
    category: 'device',
    severity: 'medium',
    consequence:
      'The authoring application recorded in XMP, usually with its exact version.',
  },
  Producer: {
    category: 'device',
    severity: 'low',
    consequence:
      'The library that wrote the final PDF bytes. Mostly of interest for matching files made the same way.',
  },
  'Producer (XMP)': {
    category: 'device',
    severity: 'low',
    consequence: 'The producing library, recorded a second time in XMP.',
  },
  'Document lineage id': {
    category: 'device',
    severity: 'high',
    consequence:
      'A single id shared by every version of this document. Two files you thought were unrelated can be proved to be drafts of one another.',
  },
  'File identifier': {
    category: 'device',
    severity: 'medium',
    consequence:
      'Two hashes in the file trailer that let copies of this document be recognised as versions of each other.',
  },
  Created: {
    category: 'timeline',
    severity: 'medium',
    consequence:
      'When the document was really written, which can contradict the date on the covering email.',
  },
  'Created (XMP)': {
    category: 'timeline',
    severity: 'low',
    consequence: 'The creation date again, in the XMP packet.',
  },
  Modified: {
    category: 'timeline',
    severity: 'low',
    consequence: 'When the file was last saved.',
  },
  'Modified (XMP)': {
    category: 'timeline',
    severity: 'low',
    consequence: 'The modification date again, in the XMP packet.',
  },
};

/** Where each of the parser's four sources came from, in a person's words. */
const SOURCE_LABELS: Readonly<Record<MetadataFinding['source'], string>> = {
  info: 'Document properties',
  xmp: 'XMP packet',
  dates: 'Document dates',
  id: 'File trailer',
};

function slug(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/gu, '-')
      .replace(/^-+|-+$/gu, '') || 'field'
  );
}

export function pdfFindings(
  findings: readonly MetadataFinding[],
): readonly XrayFinding[] {
  return findings.map((finding) => {
    const rule = RULES[finding.label];
    return {
      id: `pdf-${slug(finding.label)}`,
      category: rule?.category ?? 'identity',
      severity: rule?.severity ?? 'medium',
      label: finding.label,
      value: finding.value,
      /*
        An unknown label defaults to `identity`/`medium` rather than to
        `technical`/`low`. The PDF parser only extracts fields it considers worth
        naming, so a label this file has not caught up with is far more likely to
        be another piece of identity than a harmless one -- and a harmless field
        shown too prominently costs a reader a moment, while a name shown as
        harmless costs them the thing they came here to avoid.
      */
      consequence:
        rule?.consequence ??
        'Recorded in the file by the program that made it, and removed when you strip it.',
      source: SOURCE_LABELS[finding.source],
    };
  });
}
