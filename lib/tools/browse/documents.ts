// Generated from `toolSubsectionsForGroup` -- see lib/tools/browse.ts for why,
// and browse.test.ts, which fails if this file drifts from the catalogue.
//
// Regenerate with `npx tsx scripts/generate-browse-data.mjs`.
import type { BrowseSection } from '../browse';

export const SECTIONS: readonly BrowseSection[] = [
  {
    id: 'documents',
    title: 'Documents & office',
    description:
      'Word and office documents, LaTeX tables, citations, and letters.',
    destinations: [
      {
        id: 'latex-hub',
        name: 'LaTeX Authoring & Academic Notation Hub',
        description:
          'Research-grade academic tools: multi-format table generation, LaTeX table reader, BibTeX deduplication and cleaning, TeXcount word counts, and symbol lookup.',
        href: '/latex',
        workspaceId: 'latex-hub',
      },
      {
        id: 'docx-metadata',
        name: 'Word document metadata viewer and stripper',
        description:
          'See the author, company, editing time, tracked changes and deleted text held inside a .docx, then remove them.',
        href: '/documents/metadata',
        workspaceId: 'docx-metadata',
      },
      {
        id: 'document-workbench:plain-text-file-maker',
        name: 'Plain-text file maker',
        description:
          'Normalize pasted text to LF line endings and download a UTF-8 .txt file.',
        href: '/documents/workbench?tool=plain-text-file-maker',
        workspaceId: 'document-workbench',
      },
      {
        id: 'document-workbench:markdown-file-maker',
        name: 'Markdown file maker',
        description:
          'Validate non-empty Markdown text and download a UTF-8 .md file.',
        href: '/documents/workbench?tool=markdown-file-maker',
        workspaceId: 'document-workbench',
      },
      {
        id: 'document-workbench:readme-generator',
        name: 'README generator',
        description:
          'Generate a structured project README from explicit project facts.',
        href: '/documents/workbench?tool=readme-generator',
        workspaceId: 'document-workbench',
      },
      {
        id: 'document-workbench:changelog-generator',
        name: 'CHANGELOG generator',
        description:
          'Group typed change entries into Added, Changed, Fixed, and Removed sections.',
        href: '/documents/workbench?tool=changelog-generator',
        workspaceId: 'document-workbench',
      },
      {
        id: 'document-workbench:invoice-generator',
        name: 'Invoice generator',
        description:
          'Calculate line totals, subtotal, stated tax, and total in a Markdown invoice.',
        href: '/documents/workbench?tool=invoice-generator',
        workspaceId: 'document-workbench',
      },
      {
        id: 'document-workbench:receipt-generator',
        name: 'Receipt generator',
        description:
          'Calculate a paid transaction summary from supplied line items.',
        href: '/documents/workbench?tool=receipt-generator',
        workspaceId: 'document-workbench',
      },
      {
        id: 'document-workbench:quotation-generator',
        name: 'Quotation generator',
        description:
          'Calculate a non-binding quotation from supplied line items and terms.',
        href: '/documents/workbench?tool=quotation-generator',
        workspaceId: 'document-workbench',
      },
      {
        id: 'document-workbench:purchase-order-generator',
        name: 'Purchase-order generator',
        description:
          'Calculate a purchase-order draft from buyer, supplier, and items.',
        href: '/documents/workbench?tool=purchase-order-generator',
        workspaceId: 'document-workbench',
      },
      {
        id: 'document-workbench:resume-builder',
        name: 'Resume builder',
        description:
          'Build a concise Markdown resume without generating or embellishing claims.',
        href: '/documents/workbench?tool=resume-builder',
        workspaceId: 'document-workbench',
      },
      {
        id: 'document-workbench:cover-letter-builder',
        name: 'Cover-letter builder',
        description:
          'Assemble supplied facts into a clean letter structure without inventing experience.',
        href: '/documents/workbench?tool=cover-letter-builder',
        workspaceId: 'document-workbench',
      },
      {
        id: 'document-workbench:business-letter-generator',
        name: 'Business-letter generator',
        description:
          'Format supplied sender, recipient, subject, and body as a business letter.',
        href: '/documents/workbench?tool=business-letter-generator',
        workspaceId: 'document-workbench',
      },
      {
        id: 'document-workbench:meeting-minutes-generator',
        name: 'Meeting-minutes generator',
        description:
          'Build structured minutes from attendees, agenda, decisions, and action items.',
        href: '/documents/workbench?tool=meeting-minutes-generator',
        workspaceId: 'document-workbench',
      },
      {
        id: 'document-workbench:agenda-generator',
        name: 'Agenda generator',
        description:
          'Create a timed meeting agenda and total planned duration.',
        href: '/documents/workbench?tool=agenda-generator',
        workspaceId: 'document-workbench',
      },
      {
        id: 'document-workbench:certificate-generator',
        name: 'Certificate generator',
        description:
          'Generate a printable text/Markdown certificate from supplied facts.',
        href: '/documents/workbench?tool=certificate-generator',
        workspaceId: 'document-workbench',
      },
      {
        id: 'document-workbench:label-sheet-generator',
        name: 'Label-sheet generator',
        description:
          'Lay out supplied labels in a bounded tab-separated row/column grid.',
        href: '/documents/workbench?tool=label-sheet-generator',
        workspaceId: 'document-workbench',
      },
      {
        id: 'document-workbench:envelope-layout-generator',
        name: 'Envelope-layout generator',
        description:
          'Create a monospaced sender/recipient placement draft for printing tests.',
        href: '/documents/workbench?tool=envelope-layout-generator',
        workspaceId: 'document-workbench',
      },
      {
        id: 'document-workbench:mail-merge-preview',
        name: 'Mail-merge preview',
        description:
          'Fill {{header}} placeholders for each strict CSV row and preview every output.',
        href: '/documents/workbench?tool=mail-merge-preview',
        workspaceId: 'document-workbench',
      },
      {
        id: 'document-workbench:document-word-counter',
        name: 'Document word counter',
        description:
          'Count Unicode-aware words, characters, paragraphs, and estimated reading time.',
        href: '/documents/workbench?tool=document-word-counter',
        workspaceId: 'document-workbench',
      },
      {
        id: 'document-workbench:document-compare',
        name: 'Document compare',
        description:
          'Produce a bounded line-level longest-common-subsequence diff.',
        href: '/documents/workbench?tool=document-compare',
        workspaceId: 'document-workbench',
      },
      {
        id: 'document-workbench:document-template-filler',
        name: 'Document-template filler',
        description:
          'Replace {{key}} placeholders from a JSON object and report missing keys.',
        href: '/documents/workbench?tool=document-template-filler',
        workspaceId: 'document-workbench',
      },
      {
        id: 'document-workbench:bibtex-viewer',
        name: 'BibTeX viewer',
        description:
          'Inspect entry type, citation key, and simple quoted/braced fields without executing TeX.',
        href: '/documents/workbench?tool=bibtex-viewer',
        workspaceId: 'document-workbench',
      },
      {
        id: 'document-workbench:ris-citation-viewer',
        name: 'RIS citation viewer',
        description:
          'Group standard two-letter RIS tags into a readable local preview.',
        href: '/documents/workbench?tool=ris-citation-viewer',
        workspaceId: 'document-workbench',
      },
      {
        id: 'document-workbench:citation-formatter',
        name: 'Citation formatter',
        description:
          'Format supplied author/title/year/source facts in a basic APA, MLA, or Chicago pattern.',
        href: '/documents/workbench?tool=citation-formatter',
        workspaceId: 'document-workbench',
      },
      {
        id: 'document-workbench:latex-table-generator',
        name: 'LaTeX table generator',
        description:
          'Generate LaTeX tables online from CSV, TSV, or Markdown. Emits booktabs, longtable, captions, and siunitx decimal alignment with zero uploads.',
        href: '/documents/workbench?tool=latex-table-generator',
        workspaceId: 'document-workbench',
      },
      {
        id: 'document-workbench:markdown-to-slides',
        name: 'Markdown to slides',
        description:
          'Convert Markdown outlines delimited by --- into an interactive presentation slide deck.',
        href: '/documents/workbench?tool=markdown-to-slides',
        workspaceId: 'document-workbench',
      },
      {
        id: 'document-workbench:speaker-notes-extractor',
        name: 'Speaker notes extractor',
        description:
          'Extract slide titles and presenter notes (lines starting with Note: or Speaker:) from a presentation draft.',
        href: '/documents/workbench?tool=speaker-notes-extractor',
        workspaceId: 'document-workbench',
      },
      {
        id: 'document-workbench:presentation-timer-pacer',
        name: 'Presentation timer & pacer',
        description:
          'Calculate slide-by-slide word counts, estimated speaking time, and teleprompter pacing marks.',
        href: '/documents/workbench?tool=presentation-timer-pacer',
        workspaceId: 'document-workbench',
      },
      {
        id: 'document-workbench:presentation-outline-builder',
        name: 'Presentation outline builder',
        description:
          'Generate a comprehensive presentation outline structure based on core topic facts.',
        href: '/documents/workbench?tool=presentation-outline-builder',
        workspaceId: 'document-workbench',
      },
      {
        id: 'document-workbench:calendar-ics-generator',
        name: 'Calendar event (.ics) generator',
        description:
          'Create an RFC 5545 compliant .ics iCalendar file ready to import into Apple Calendar, Google Calendar, or Outlook.',
        href: '/documents/workbench?tool=calendar-ics-generator',
        workspaceId: 'document-workbench',
      },
      {
        id: 'document-workbench:passport-photo-sheet',
        name: 'Passport & ID photo sheet maker',
        description:
          'Calculate standard passport photo grid layouts (2x2 inch US or 35x45mm Schengen/India) for printing on 4x6 inch paper.',
        href: '/documents/workbench?tool=passport-photo-sheet',
        workspaceId: 'document-workbench',
      },
      {
        id: 'document-workbench:transparent-signature-maker',
        name: 'Transparent signature generator',
        description:
          'Generate a clean, scalable vector SVG signature template with transparent background.',
        href: '/documents/workbench?tool=transparent-signature-maker',
        workspaceId: 'document-workbench',
      },
      {
        id: 'document-workbench:pdf-form-field-schema-builder',
        name: 'PDF form field schema builder',
        description:
          'Generate an AcroForm field definition JSON schema from field names and types for programmatic PDF form filling.',
        href: '/documents/workbench?tool=pdf-form-field-schema-builder',
        workspaceId: 'document-workbench',
      },
      {
        id: 'document-workbench:markdown-table-generator',
        name: 'Markdown table generator & CSV converter',
        description:
          'Transform CSV, pipe-separated, or tab-delimited text into perfectly padded GitHub Flavored Markdown (GFM) tables.',
        href: '/documents/workbench?tool=markdown-table-generator',
        workspaceId: 'document-workbench',
      },
      {
        id: 'document-workbench:markdown-resume-builder',
        name: 'Markdown resume builder (ATS-friendly)',
        description:
          'Generate a clean, structured, ATS-compliant Markdown developer resume ready for Markdown editors or PDF print.',
        href: '/documents/workbench?tool=markdown-resume-builder',
        workspaceId: 'document-workbench',
      },
      {
        id: 'document-workbench:html-email-templates',
        name: 'Responsive HTML email template generator',
        description:
          'Generate bulletproof, responsive HTML email templates for welcome emails, password resets, newsletters, and receipts.',
        href: '/documents/workbench?tool=html-email-templates',
        workspaceId: 'document-workbench',
      },
      {
        id: 'document-workbench:legal-nda-generator',
        name: 'Mutual Non-Disclosure Agreement (NDA) maker',
        description:
          'Generate standard, legally formatted 2-page Mutual Non-Disclosure Agreements with customizable parties, terms, and governing laws.',
        href: '/documents/workbench?tool=legal-nda-generator',
        workspaceId: 'document-workbench',
      },
      {
        id: 'document-workbench:sop-generator',
        name: 'Standard Operating Procedure (SOP) builder',
        description:
          'Generate institutional Standard Operating Procedure (SOP) playbooks with numbered procedural steps, responsible roles, scope, and verification checklists.',
        href: '/documents/workbench?tool=sop-generator',
        workspaceId: 'document-workbench',
      },
      {
        id: 'document-workbench:user-story-acceptance-criteria-builder',
        name: 'Agile user story & BDD acceptance criteria builder',
        description:
          'Generate structured agile user stories with Gherkin BDD Given/When/Then acceptance scenarios and Definition of Done (DoD) checklists.',
        href: '/documents/workbench?tool=user-story-acceptance-criteria-builder',
        workspaceId: 'document-workbench',
      },
    ],
  },
];
