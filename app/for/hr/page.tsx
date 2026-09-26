import type { Metadata } from 'next';
import { AudiencePage } from '@/components/audience-page';

export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/for/hr' },
  title: 'Handle Salary Slips and ID Scans Without Uploading',
  description:
    'Split a payroll run, mask an identity document and strip metadata from a CV — on your own machine. Staff data never reaches a third-party server.',
};

export default function Page() {
  return (
    <AudiencePage
      eyebrow="For HR, payroll and recruitment"
      heading="The files you are least allowed to upload"
      standfirst="Payroll runs, identity documents, right-to-work scans, signed contracts, CVs from people who have not told their current employer. HR holds the densest concentration of personal data in most organisations, and the everyday tasks performed on it are exactly the ones free web tools exist to do."
      tools={[
        {
          href: '/pdf/burst',
          name: 'Split a payroll run into one file per person',
          why: 'Payroll exports as a single document with everyone in it. Sending it whole is the most common accidental disclosure in HR.',
        },
        {
          href: '/life-admin/aadhaar-pan-masker',
          name: 'Mask an identity number',
          why: 'Covers the digits on an ID scan that a personnel file does not need to hold in full.',
        },
        {
          href: '/documents/metadata',
          name: 'Strip metadata from a document',
          why: 'A CV usually names the author, and sometimes the template it came from. An offer letter can carry the previous candidate’s name in its revision data.',
        },
        {
          href: '/pdf/redact',
          name: 'Redact before sharing with a panel',
          why: 'Removes names and addresses from an application so a shortlisting panel sees the content and not the person.',
        },
        {
          href: '/pdf/sign',
          name: 'Place a signature',
          why: 'Adds a visible signature to a letter without routing the contract through a signing service.',
        },
      ]}
      limits={[
        'It is not employment law advice and it does not know your jurisdiction’s rules on retention, consent or right-to-work checks.',
        'Splitting a payroll file divides the pages. It cannot tell whether page four belongs to the person named on page three — check before sending.',
        'Masking covers what you mark. An identity number that also appears in a document’s text or filename is not covered by masking the image.',
        'There is no record of what was done, because nothing is stored. If your process needs an audit trail, it has to come from your HR system.',
      ]}
    >
      <p>
        The recurring HR disaster is not dramatic. Somebody has a payroll PDF
        with three hundred people in it and needs to send each person their own
        page. The split has to happen somewhere, the finance system will not do
        it, and the first result for splitting a PDF is a website with a large
        friendly button.
      </p>
      <p>
        What makes this different from other sensitive-file work is the density.
        A single mistake does not expose one person&rsquo;s data, it exposes
        everyone&rsquo;s at once, and salary is the category colleagues are
        least forgiving about. The organisation usually discovers its
        file-handling policy was theoretical on the day it is tested.
      </p>
      <p>
        Removing the upload removes the question. The file is opened by the page
        in front of you, split there, and written back out; nothing is
        transmitted, so there is no third party to assess, no processor
        agreement to chase and no retention promise to take on faith. You can
        verify it the blunt way: disconnect from the network and do the job
        anyway.
      </p>
    </AudiencePage>
  );
}
