import type { Metadata } from 'next';

import { FinanceBusinessWorkbenchTool } from '@/components/finance-business-workbench-tool';
import { practiceBrief } from '@/lib/practice-briefs';
import { relatedToolsFor } from '@/lib/seo/related-tools';

export const revalidate = 86400;

/*
  A hand-written page at an address `app/finance/[tool]/page.tsx` would
  otherwise generate. See the note on the sibling page under `/life-admin` for
  why replacing a generated page at the same URL is not a duplicate.

  Worth saying plainly what this page is careful NOT to claim. The generator
  behind it makes a bill: parties, line items, one tax rate, a total. It has no
  GSTIN field, no HSN or SAC code, no place of supply and no CGST/SGST/IGST
  split, so it cannot produce a tax invoice under the GST law and the brief
  says so in as many words. Titling this page "GST invoice generator" would win
  the better query and hand somebody a document that does not carry the
  particulars the law asks for.
*/

const BRIEF = practiceBrief('bill-the-client');
const CANONICAL_ORIGIN = ['https:', '//', 'getopentools.com'].join('');

export const metadata: Metadata = {
  title: BRIEF.heading,
  description:
    'Lay out a print-ready professional fee bill in your browser, with rupee amounts grouped in lakh and crore. Not a tax invoice: there is no GSTIN or HSN field.',
  alternates: { canonical: `${CANONICAL_ORIGIN}${BRIEF.route}` },
};

export default function Page() {
  return (
    <FinanceBusinessWorkbenchTool
      initialOperationId="invoice-generator"
      routedBasePath="/finance"
      relatedTools={relatedToolsFor(BRIEF.route)}
      brief={BRIEF}
    />
  );
}
