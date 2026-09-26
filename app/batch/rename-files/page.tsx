import type { Metadata } from 'next';
import { AudiencePage } from '@/components/audience-page';

export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/batch/rename-files' },
  title: 'Rename 2,000 Files by Rule, Not by Hand',
  description:
    'Apply numbering, prefixes and dates across a whole folder of filenames in one pass. Runs in your browser — the names and the files both stay on your machine.',
};

export default function Page() {
  return (
    <AudiencePage
      eyebrow="Batch"
      heading="Rename 2,000 files"
      standfirst="This is the one batch job where the contents do not matter and the names are everything. IMG_4471 through IMG_6520, or scan_001 repeated across nine folders, and a naming convention somebody has to apply before any of it can be filed."
      toolsHeading="Start here"
      tools={[
        {
          href: '/batch',
          name: 'Open the batch runner',
          why: 'Set the output naming pattern, choose the folder, and run. The pattern controls what every resulting file is called.',
        },
        {
          href: '/file/workbench',
          name: 'The file workbench',
          why: 'Listing, hashing, finding duplicates and inspecting what is actually in a folder — usually what you want before renaming it.',
        },
        {
          href: '/file/hash-calculator',
          name: 'Hash a file',
          why: 'Confirm two files with different names really are the same file before you treat them as duplicates.',
        },
      ]}
      limits={[
        'Browsers do not let a page rename files in place. The renamed copies are written to a folder you choose, or handed back as a ZIP; the originals are untouched.',
        'Writing into a folder you choose needs Chrome or Edge. Elsewhere the results come back as a ZIP you unpack.',
        'Names are built from a pattern, not from the contents. It cannot read an invoice and name the file after the supplier.',
        'Renaming is applied as asked. A pattern that collapses two files onto one name is your decision to check, not something the tool can guess at.',
      ]}
    >
      <p>
        Renaming sits oddly among file jobs. The operation is trivial — it is
        string manipulation — and yet at two thousand files it is an afternoon
        of somebody&rsquo;s life, and the tools that automate it are either a
        desktop application you have to be allowed to install or a website you
        have to upload to.
      </p>
      <p>
        Uploading is the strange one. To change what files are called, the whole
        contents get transmitted, processed and returned, because that is the
        only shape a server-based tool can take. The bytes that mattered least
        to the job travelled the furthest.
      </p>
      <p>
        Here the folder is read locally and the names are applied locally.
        Nothing about the contents needs to go anywhere, and nothing does. It
        also means there is no upper bound worth stating: two thousand files is
        not a different kind of job from twenty, just a longer one.
      </p>
    </AudiencePage>
  );
}
