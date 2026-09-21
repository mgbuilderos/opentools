import type { Metadata } from 'next';

import { LifeAdminWorkbenchTool } from '@/components/life-admin-workbench-tool';
import { practiceBrief } from '@/lib/practice-briefs';
import { relatedToolsFor } from '@/lib/seo/related-tools';

export const revalidate = 86400;

/*
  A hand-written page at an address `app/life-admin/[tool]/page.tsx` would
  otherwise generate.

  That generated page took its title, heading and description from the
  operation's own one-line `name` and `description` — "Indian currency number
  to words", "Write rupees using thousand, lakh, and crore groups" — which is
  accurate and speaks to nobody. The job is a voucher, a cheque or a bill that
  needs the figure written out, and the people doing it every day are Indian
  accountants and the businesses they keep books for.

  A literal folder beats a dynamic segment, and `excludedToolIdsForPrefix`
  removes this id from what the `[tool]` route generates as soon as the route
  is listed in `DEDICATED_TOOL_ROUTES`. So this replaces that page rather than
  competing with it: same URL, same tool, no duplicate.
*/

const BRIEF = practiceBrief('amount-in-words');
const CANONICAL_ORIGIN = ['https:', '//', 'getopentools.com'].join('');

export const metadata: Metadata = {
  title: BRIEF.heading,
  description:
    'Write a rupee figure out in words for a cheque, a payment voucher or a bill, grouped in thousand, lakh and crore rather than in millions. Runs in your browser; the amount is not sent anywhere.',
  alternates: { canonical: `${CANONICAL_ORIGIN}${BRIEF.route}` },
};

export default function Page() {
  return (
    <LifeAdminWorkbenchTool
      initialOperationId="indian-currency-number-to-words"
      routedBasePath="/life-admin"
      relatedTools={relatedToolsFor(BRIEF.route)}
      brief={BRIEF}
    />
  );
}
