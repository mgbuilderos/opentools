import type { Metadata } from 'next';
import { AudiencePage } from '@/components/audience-page';

export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/for/architects' },
  title: 'Drawing Registers and Revision Comparison',
  description:
    'Build a drawing register from a set, compare two revisions and prepare an issue sheet. Large drawing sets stay on your machine — no upload, no size cap.',
};

export default function Page() {
  return (
    <AudiencePage
      eyebrow="For practices, contractors and consultants"
      heading="Drawing sets are too big to upload, and too important to get wrong"
      standfirst="An issue is fifty sheets that each have a number, a revision letter and a date, and the register has to agree with all of them. The consequence of a mistake is not embarrassment, it is somebody building to a superseded drawing."
      tools={[
        {
          href: '/pdf/drawing-register',
          name: 'Build a drawing register',
          why: 'Reads the sheet numbers and revisions out of a set and produces the register, instead of one being typed from the title blocks and drifting.',
        },
        {
          href: '/pdf/compare',
          name: 'Compare two revisions',
          why: 'Shows what actually changed between Rev C and Rev D when the transmittal says "minor coordination amendments".',
        },
        {
          href: '/pdf/preflight',
          name: 'Preflight before issue',
          why: 'Catches the problems that stop a set printing correctly, before it is with the contractor rather than after.',
        },
        {
          href: '/pdf/merge',
          name: 'Assemble the issue',
          why: 'One document in the order the register lists, which is what a site team can actually use.',
        },
        {
          href: '/pdf/bates',
          name: 'Stamp a continuous reference',
          why: 'Gives every sheet in a bundle a reference that survives being printed, marked up and scanned back in.',
        },
        {
          href: '/batch',
          name: 'Run it over the whole set',
          why: 'A set is a folder. There is no file count limit and no size limit here, so the folder is the unit of work.',
        },
      ]}
      limits={[
        'It reads PDFs. It is not CAD or BIM software, it does not open DWG, RVT or IFC, and it has no understanding of geometry.',
        'A register is built from what the sheets say. If a title block is inconsistent or a revision was never stamped, the register will faithfully reproduce that — it is a reader, not a checker.',
        'Comparison shows visual and textual differences. It does not know which differences are significant, and it is not a substitute for a coordination review.',
        'Nothing is stored, so there is no shared register, no revision history and no common data environment. This produces files; managing them stays with your existing system.',
      ]}
    >
      <p>
        Drawing work runs into a wall that most document tools never meet: size.
        A full architectural set at issue resolution is routinely hundreds of
        megabytes, and the free tools that would help are capped an order of
        magnitude below that — not because the operation is hard, but because
        every megabyte crosses somebody&rsquo;s network and appears on
        somebody&rsquo;s bill.
      </p>
      <p>
        There is no server here, so there is no such bill and no such cap. The
        limit is the memory in the machine on your desk, which for this kind of
        work is usually a generous one. A folder of four thousand sheets is the
        same operation as one sheet, running for longer.
      </p>
      <p>
        The confidentiality point is smaller than in medicine or law but it is
        real: a set under a non-disclosure agreement, a scheme before planning
        submission, or a client who would rather their project were not on an
        unknown third party&rsquo;s storage. Not uploading it resolves that
        without anybody having to assess a vendor.
      </p>
    </AudiencePage>
  );
}
