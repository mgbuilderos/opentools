import type { Metadata } from 'next';

import { AadhaarPanMaskerTool } from '@/components/aadhaar-pan-masker-tool';
import { practiceBrief } from '@/lib/practice-briefs';

export const revalidate = 86400;

/*
  Re-pointed at one profession rather than at everyone. The tool and the URL
  are unchanged; the page now names the moment it is needed, which is not
  "I would like to mask a number" but "this working paper is about to go to
  the bank and it still has the client's Aadhaar in it".
*/

const BRIEF = practiceBrief('mask-before-it-leaves-the-firm');

export const metadata: Metadata = {
  title: BRIEF.heading,
  description:
    'Find and mask Aadhaar and PAN numbers in a working paper, client list or exported statement before it goes to a bank, a lender or an auditor. Aadhaar keeps its last 4 digits; runs on your device. Text only: scans and PDFs are not read.',
};

export default function Page() {
  return <AadhaarPanMaskerTool brief={BRIEF} />;
}
