import type { Metadata } from 'next';
import { AudiencePage } from '@/components/audience-page';

export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/for/accountants' },
  title: 'Bank Statements to Excel, Privately',
  description:
    'Turn a client’s bank statement PDF into a spreadsheet, and compress a return so a filing portal accepts it — without the statement leaving your machine.',
};

export default function Page() {
  return (
    <AudiencePage
      eyebrow="For practices and bookkeepers"
      heading="A client’s bank statement should not pass through a stranger"
      standfirst="Reconciliation season is a folder of statement PDFs that need to become rows in a spreadsheet, and a set of returns that need to be small enough for a portal to accept. Both jobs have a free website ready to do them, and both of those websites want the client’s finances first."
      tools={[
        {
          href: '/pdf/to-excel',
          name: 'Statement PDF to spreadsheet',
          why: 'Pulls tabular rows out of a statement so they can be reconciled, instead of being retyped from a printout.',
        },
        {
          href: '/data/workbook-audit',
          name: 'Audit a workbook',
          why: 'Finds the broken references, the hardcoded overrides and the formulas that stopped pointing where they used to.',
        },
        {
          href: '/pdf/compress',
          name: 'Compress to fit a filing portal',
          why: 'Portals cap what they accept, and a scanned set of supporting documents is usually several times over it.',
        },
        {
          href: '/pdf/merge',
          name: 'Combine supporting documents',
          why: 'One attachment in the order the schedule lists them, rather than nine files named scan_001.',
        },
        {
          href: '/life-admin/aadhaar-pan-masker',
          name: 'Mask an identity number',
          why: 'Covers the digits on a PAN or Aadhaar scan that should not be in a working file at all.',
        },
        {
          href: '/batch',
          name: 'Do the whole client folder',
          why: 'Twelve months of statements is twelve files. Point at the folder and run it once.',
        },
      ]}
      limits={[
        'It is not tax or accounting advice, and it knows nothing about your jurisdiction’s filing rules, thresholds or deadlines.',
        'Extraction is mechanical. It reads the table it finds; it does not understand what a transaction means, and a statement laid out unusually will come out imperfectly. Check the totals.',
        'It does not connect to a bank, a portal or your practice software, and it never will — that would require exactly the network access this product does not have.',
        'Nothing is stored between sessions, so there is no working file to come back to. Save what you produce.',
      ]}
    >
      <p>
        There is a specific, slightly absurd shape to this problem. A statement
        PDF is a table that has been flattened into a picture of a table, and
        getting it back into rows is a solved technical problem with dozens of
        free tools. Every one of those tools is a form that says: upload your
        client&rsquo;s bank statement here.
      </p>
      <p>
        A practice holds documents whose disclosure is a professional matter,
        not an inconvenience — statements, salary details, identity scans,
        drafts of returns. The confidentiality that covers them is not something
        a member of staff can waive by finding a convenient website on a
        deadline, and in most practices nobody has ever decided whether that is
        allowed, because nobody was asked.
      </p>
      <p>
        These tools take the decision away by removing the upload. The work
        happens in the browser tab, on the machine the file is already on. There
        is no size cap and no per-day limit, because there is no bill arriving
        for the bytes — the constraint is your own computer, and it is the only
        one.
      </p>
    </AudiencePage>
  );
}
