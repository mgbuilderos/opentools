import { describe, expect, it } from 'vitest';

import {
  DOCUMENT_OPERATIONS,
  runDocumentOperation,
} from './document-workbench';

function defaults(id: string) {
  const operation = DOCUMENT_OPERATIONS.find((item) => item.id === id);
  if (!operation) throw new Error(`Missing operation ${id}`);
  return Object.fromEntries(
    operation.fields.map((field) => [field.id, field.defaultValue]),
  );
}

describe('documents and office workbench', () => {
  it('publishes 38 unique operations whose defaults all run', () => {
    expect(DOCUMENT_OPERATIONS).toHaveLength(38);
    expect(new Set(DOCUMENT_OPERATIONS.map((item) => item.id)).size).toBe(38);
    for (const operation of DOCUMENT_OPERATIONS) {
      expect(
        runDocumentOperation(operation.id, defaults(operation.id)),
      ).not.toBe('');
    }
  });

  it('builds README and changelog files from explicit facts', () => {
    expect(
      runDocumentOperation('readme-generator', defaults('readme-generator')),
    ).toContain('## Installation');
    expect(
      runDocumentOperation(
        'changelog-generator',
        defaults('changelog-generator'),
      ),
    ).toContain('### Fixed');
  });

  it('calculates exact commercial document totals', () => {
    const invoice = runDocumentOperation(
      'invoice-generator',
      defaults('invoice-generator'),
    );
    expect(invoice).toContain('**Subtotal:** ₹13000.00');
    expect(invoice).toContain('**Total:** ₹15340.00');
  });

  it('fills CSV mail merge and JSON document templates', () => {
    expect(
      runDocumentOperation(
        'mail-merge-preview',
        defaults('mail-merge-preview'),
      ),
    ).toContain('Hello Ada');
    expect(
      runDocumentOperation(
        'document-template-filler',
        defaults('document-template-filler'),
      ),
    ).toContain('Status: Ready');
  });

  it('creates a stable line-level document diff', () => {
    expect(
      runDocumentOperation('document-compare', {
        before: 'Title\nOld sentence\nShared line',
        after: 'Title\nNew sentence\nShared line',
      }),
    ).toBe('  Title\n- Old sentence\n+ New sentence\n  Shared line');
  });

  it('inspects simple BibTeX and RIS records locally', () => {
    expect(
      runDocumentOperation('bibtex-viewer', defaults('bibtex-viewer')),
    ).toContain('Citation key: example2026');
    expect(
      runDocumentOperation(
        'ris-citation-viewer',
        defaults('ris-citation-viewer'),
      ),
    ).toContain('TI: Private browser tools');
  });

  it('escapes LaTeX table content once without corrupting escapes', () => {
    const output = runDocumentOperation('latex-table-generator', {
      csv: 'Name,Value\nA&B,100%\nPath,C:\\tmp',
      alignment: 'l',
    });
    expect(output).toContain('A\\&B & 100\\%');
    expect(output).toContain('C:\\textbackslash{}tmp');
    expect(output).not.toContain('textbackslash{}&');
  });

  it('counts Unicode words and totals agenda duration', () => {
    expect(
      runDocumentOperation('document-word-counter', {
        content: 'Hello भारत',
        wordsPerMinute: '200',
      }),
    ).toContain('Words: 2');
    expect(
      runDocumentOperation('agenda-generator', defaults('agenda-generator')),
    ).toContain('**Planned duration:** 30 minutes');
  });

  it('builds presentations, speaker notes, and teleprompter schedules', () => {
    const slidesHtml = runDocumentOperation(
      'markdown-to-slides',
      defaults('markdown-to-slides'),
    );
    expect(slidesHtml).toContain('<!DOCTYPE html>');
    expect(slidesHtml).toContain('class="slide"');
    expect(slidesHtml).toContain('Future of Local Computing');

    const notes = runDocumentOperation(
      'speaker-notes-extractor',
      defaults('speaker-notes-extractor'),
    );
    expect(notes).toContain('# Speaker Notes Summary');
    expect(notes).toContain('Pause for 3 seconds');

    const pacer = runDocumentOperation(
      'presentation-timer-pacer',
      defaults('presentation-timer-pacer'),
    );
    expect(pacer).toContain('PRESENTATION PACING SCHEDULE');
    expect(pacer).toContain('Slide 1:');

    const outline = runDocumentOperation(
      'presentation-outline-builder',
      defaults('presentation-outline-builder'),
    );
    expect(outline).toContain('# Zero-Egress Browser Computing');
    expect(outline).toContain('## 2. The Current Problem');
  });

  it('creates valid RFC 5545 iCalendar files, photo sheets, signatures, and form schemas', () => {
    const ics = runDocumentOperation(
      'calendar-ics-generator',
      defaults('calendar-ics-generator'),
    );
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('SUMMARY:Architecture Review & Release Sync');
    expect(ics).toContain('END:VCALENDAR');

    const photoSheet = runDocumentOperation(
      'passport-photo-sheet',
      defaults('passport-photo-sheet'),
    );
    expect(photoSheet).toContain(
      'PASSPORT & ID PHOTO PRINT SHEET SPECIFICATION',
    );
    expect(photoSheet).toContain('300 DPI');

    const signature = runDocumentOperation(
      'transparent-signature-maker',
      defaults('transparent-signature-maker'),
    );
    expect(signature).toContain('<svg xmlns="');
    expect(signature).toContain('Ada Lovelace');

    const schema = runDocumentOperation(
      'pdf-form-field-schema-builder',
      defaults('pdf-form-field-schema-builder'),
    );
    expect(schema).toContain('"title": "Employment Application"');
    expect(schema).toContain('"id": "full_name"');

    const mdTable = runDocumentOperation(
      'markdown-table-generator',
      defaults('markdown-table-generator'),
    );
    expect(mdTable).toContain('| Feature');
    expect(mdTable).toContain('| :---');

    const resume = runDocumentOperation(
      'markdown-resume-builder',
      defaults('markdown-resume-builder'),
    );
    expect(resume).toContain('# Alex Morgan');
    expect(resume).toContain('## Experience');
    expect(resume).toContain('## Technical Skills');

    const emailTemplate = runDocumentOperation(
      'html-email-templates',
      defaults('html-email-templates'),
    );
    expect(emailTemplate).toContain('<!DOCTYPE html>');
    expect(emailTemplate).toContain('<table class="main"');
    expect(emailTemplate).toContain('OpenTools');

    const nda = runDocumentOperation(
      'legal-nda-generator',
      defaults('legal-nda-generator'),
    );
    expect(nda).toContain('MUTUAL NON-DISCLOSURE AGREEMENT');
    expect(nda).toContain('Acme Technologies Inc.');
    expect(nda).toContain('2 years');
    expect(nda).toContain('Confidential Information');
  });

  it('rejects impossible dates, missing merge keys, and malformed items', () => {
    expect(() =>
      runDocumentOperation('changelog-generator', {
        ...defaults('changelog-generator'),
        date: '2026-02-31',
      }),
    ).toThrow('Invalid YYYY-MM-DD');
    expect(() =>
      runDocumentOperation('mail-merge-preview', {
        template: 'Hello {{missing}}',
        csv: 'name\nAda',
      }),
    ).toThrow('missing from CSV');
    expect(() =>
      runDocumentOperation('invoice-generator', {
        ...defaults('invoice-generator'),
        items: 'Broken | two | 10',
      }),
    ).toThrow('positive quantity');
  });

  it('generates institutional SOP playbooks and agile BDD user stories', () => {
    const sopMd = runDocumentOperation(
      'sop-generator',
      defaults('sop-generator'),
    );
    expect(sopMd).toContain(
      '# Standard Operating Procedure: Incident Response & Hotfix Deployment',
    );
    expect(sopMd).toContain('SOP-ENG-042');
    expect(sopMd).toContain('| Step | Action / Procedure | Responsible Role |');
    expect(sopMd).toContain('Deploy to Cloudflare Workers');

    const sopHtml = runDocumentOperation('sop-generator', {
      ...defaults('sop-generator'),
      format: 'html',
    });
    expect(sopHtml).toContain('<!DOCTYPE html>');
    expect(sopHtml).toContain(
      '<title>SOP: Incident Response &amp; Hotfix Deployment</title>',
    );
    expect(sopHtml).toContain('Authorized by Quality Lead');

    const story = runDocumentOperation(
      'user-story-acceptance-criteria-builder',
      defaults('user-story-acceptance-criteria-builder'),
    );
    expect(story).toContain('# User Story: Security-conscious Developer');
    expect(story).toContain('## User Story Narrative');
    expect(story).toContain('> **As a** Security-conscious Developer');
    expect(story).toContain('### Scenario: Valid cURL to Fetch');
    expect(story).toContain(
      '- **Given** I paste a valid cURL POST with headers',
    );
    expect(story).toContain('## Definition of Done (DoD)');
    expect(story).toContain('- [ ] All 8 automated QC gates pass cleanly');
  });
});
