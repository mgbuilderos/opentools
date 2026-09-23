import type { Metadata } from 'next';

import { PdfToExcelTool } from '@/components/pdf-to-excel-tool';
import { practiceBrief } from '@/lib/practice-briefs';

export const revalidate = 86400;

/*
  Re-pointed at one profession rather than at everyone.

  The tool is unchanged and the URL is unchanged; the title, heading and
  standfirst now name the job — a client's bank statement, into the books —
  instead of naming the file formats. "PDF to Excel converter" is what the
  page did; "the statement the bank emailed, as rows I can post" is what
  somebody is actually looking for at nine on a Monday.
*/

const BRIEF = practiceBrief('bank-statement-to-books');

export const metadata: Metadata = {
  alternates: { canonical: '/pdf/to-excel' },
  title: BRIEF.heading,
  description:
    'Turn a client bank statement PDF into Excel (.xlsx) or CSV in your browser. Reads separate debit and credit columns, DR and CR markers and lakh grouping, rejoins wrapped narration, and recomputes the running balance so a dropped row is found before you post it.',
};

export default function Page() {
  return <PdfToExcelTool brief={BRIEF} />;
}
