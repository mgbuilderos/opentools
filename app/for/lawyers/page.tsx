import type { Metadata } from 'next';
import { AudiencePage } from '@/components/audience-page';

export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/for/lawyers' },
  title: 'Redact and Bates-Number Exhibits Without Uploading',
  description:
    'Black out names in an exhibit, Bates-number a bundle and assemble a brief — all on your own machine. Privileged material never reaches anyone else’s server.',
};

export default function Page() {
  return (
    <AudiencePage
      eyebrow="For litigation and conveyancing"
      heading="Exhibits, bundles and redaction that stay on your machine"
      standfirst="Disclosure is the one job where uploading the file is the problem. A bundle going to the other side is privileged until the moment it is not, and a free web tool is a third party you did not brief, did not retain and cannot indemnify. Everything below runs inside the page already open in front of you."
      tools={[
        {
          href: '/pdf/redact',
          name: 'Redact a PDF',
          why: 'Removes the text underneath, not just a black rectangle over it. A drawn box that leaves the words selectable has ended careers; this deletes the content and you can confirm it by searching the output.',
        },
        {
          href: '/pdf/bates',
          name: 'Bates numbering',
          why: 'Stamps a continuous reference across a bundle so every page can be cited in a witness statement and found again by opposing counsel.',
        },
        {
          href: '/pdf/merge',
          name: 'Assemble a bundle',
          why: 'Orders exhibits into one file in the sequence the index promises, rather than eleven attachments the judge has to reconcile.',
        },
        {
          href: '/pdf/compare',
          name: 'Compare two drafts',
          why: 'Shows what moved between an engrossment and the version that came back, when the covering email says "minor amendments".',
        },
        {
          href: '/pdf/metadata',
          name: 'Inspect and strip metadata',
          why: 'A document carries its author, its revision history and sometimes the name of the firm that drafted it. Read what is in there before it leaves.',
        },
        {
          href: '/batch',
          name: 'Do it across a whole folder',
          why: 'Disclosure arrives as a folder, not as one file. Point at the folder and run one operation over all of it.',
        },
      ]}
      limits={[
        'It is not legal advice and it does not know your jurisdiction’s rules on disclosure, retention or certification.',
        'Redaction removes what you select. It cannot find what you did not — read the document, then check the output by searching it.',
        'Nothing here signs anything with legal weight. The signature tool places a visible mark; it is not a qualified electronic signature.',
        'No audit trail is kept, because nothing is stored. If your matter needs a chain of custody, that has to come from your practice management system.',
      ]}
    >
      <p>
        The work that brings people here is nearly always the same afternoon: an
        exhibit bundle has to go out, one page in it names a person who is not
        party to the proceedings, and the file is 180 MB of scanned
        correspondence that the court&rsquo;s filing portal will not take.
      </p>
      <p>
        Three separate problems, and the usual answer to each is a website that
        wants the file first. That is the part worth stopping on. Handing a
        privileged document to an unknown third party to make it smaller is a
        disclosure you did not intend to make, and it is not cured by the
        site&rsquo;s promise to delete it afterwards — you have no way to check
        that, and no contract with them if it turns out to be untrue.
      </p>
      <p>
        These tools do the same jobs without that step existing. The page holds
        the file, does the work and hands it back. There is no size limit and no
        file count limit, because there is no server being paid for: a folder of
        four thousand scanned letters is the same job as one letter, only
        longer.
      </p>
    </AudiencePage>
  );
}
