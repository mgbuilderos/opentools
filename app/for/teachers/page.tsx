import type { Metadata } from 'next';
import { AudiencePage } from '@/components/audience-page';

export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/for/teachers' },
  title: 'Build Worksheets and Split Marked Scripts',
  description:
    'Assemble a worksheet, split a scanned set of scripts into one file per pupil and shrink a pack to fit a mail limit — free, with no account and no upload.',
};

export default function Page() {
  return (
    <AudiencePage
      eyebrow="For schools, colleges and universities"
      heading="Everything you hand out, assembled on your own laptop"
      standfirst="Teaching generates an unusual amount of document work and almost no budget to do it with. A worksheet pulled from four sources, a scanned set of scripts that has to become one file per pupil, a pack too large for the school mail system — and school devices where installing software is not an option."
      tools={[
        {
          href: '/pdf/merge',
          name: 'Assemble a worksheet or pack',
          why: 'Combine pages from several sources into the single document you actually hand out.',
        },
        {
          href: '/pdf/burst',
          name: 'Split scanned scripts',
          why: 'Turns one long scan of a marked set into a file per pupil, so feedback can go to the right person and only that person.',
        },
        {
          href: '/pdf/extract-pages',
          name: 'Take just the pages you need',
          why: 'Pull four pages out of a textbook chapter instead of distributing the whole file.',
        },
        {
          href: '/pdf/images-to-pdf',
          name: 'Photos of work into one document',
          why: 'Twenty photographs of pupils’ work become one document that can be filed or shown.',
        },
        {
          href: '/pdf/compress',
          name: 'Fit the school mail limit',
          why: 'Scanned packs are large and most school systems cap attachments well below what a scanner produces.',
        },
        {
          href: '/batch',
          name: 'Run it across the whole class folder',
          why: 'Thirty files is the same job as one, only longer. Point at the folder.',
        },
      ]}
      limits={[
        'It has nothing to say about copyright. Being able to extract pages from a book is not permission to distribute them.',
        'Splitting a scan divides pages. It does not read names, so it cannot guarantee page seven belongs to the pupil on page six — check before sending feedback out.',
        'There is no marking, grading or plagiarism function, and no integration with any virtual learning environment.',
        'Nothing is saved between sessions. Close the tab and the working file is gone, so download what you produce.',
      ]}
    >
      <p>
        The constraint that shapes this is not privacy first, it is permission.
        School and college laptops are managed devices: you cannot install
        anything, you often cannot sign up for anything, and the budget for a
        tool that does one job twice a term is zero. So the work gets done on
        whatever free website loads, on a device the institution controls, with
        pupils&rsquo; marked work as the input.
      </p>
      <p>
        Which is where privacy arrives after all. A scanned set of scripts is
        children&rsquo;s names attached to their performance, and the school has
        obligations about where that goes that no individual teacher can sign
        away at eleven at night before a deadline.
      </p>
      <p>
        These run in the browser that is already installed, need no account and
        have no quota, so there is nothing to ask permission for and nothing to
        expense. And because the file is never sent, the pupils&rsquo; work
        stays on the machine it was scanned on — provable by unplugging the
        network and watching the tools carry on working.
      </p>
    </AudiencePage>
  );
}
