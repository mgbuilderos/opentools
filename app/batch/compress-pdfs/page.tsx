import type { Metadata } from 'next';
import { AudiencePage } from '@/components/audience-page';

export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/batch/compress-pdfs' },
  title: 'Compress 500 PDFs at Once, on Your Own Machine',
  description:
    'Point at a folder of scanned PDFs and compress every one in a single pass. No per-file limit, no daily quota, no upload — your computer is the only limit.',
};

export default function Page() {
  return (
    <AudiencePage
      eyebrow="Batch"
      heading="Compress 500 PDFs at once"
      standfirst="Not one PDF, five hundred. A year of scanned invoices, a disclosure set, an archive that has to fit somewhere smaller. Choose the folder, choose the operation, and come back when it has finished."
      toolsHeading="Start here"
      tools={[
        {
          href: '/batch',
          name: 'Open the batch runner',
          why: 'Choose a folder, pick compression, preview the first real result, then run every file. On Chrome and Edge it can write the results straight back into a second folder you choose.',
        },
        {
          href: '/pdf/compress',
          name: 'Compress a single PDF',
          why: 'The same operation on one file, when a folder is not what you have.',
        },
        {
          href: '/pdf/compress-offline',
          name: 'The offline-ready version',
          why: 'Open it once with a connection, then use it with the network switched off — which is also the simplest proof nothing is being uploaded.',
        },
      ]}
      limits={[
        'Compression is lossy on images. A scan compressed hard is smaller and blurrier; preview the first result before committing a folder to it.',
        'A PDF that is already compressed will not shrink much, and the summary says so rather than pretending otherwise.',
        'Writing results straight back into a folder needs Chrome or Edge. Other browsers give the same results as a ZIP instead.',
        'The work happens in your browser tab, so a very large folder is limited by your machine’s memory. The page warns you rather than refusing.',
      ]}
    >
      <p>
        Every hosted tool for this is one file at a time, and the reason is not
        technical. Compression is cheap; receiving five hundred files is not.
        The megabytes cross somebody&rsquo;s network, sit on somebody&rsquo;s
        disk and appear on somebody&rsquo;s invoice, which is why the free tier
        is two files a day and a hundred megabytes, and why nobody has ever
        offered to take your folder.
      </p>
      <p>
        With no server in the path, none of that arithmetic exists. There is no
        per-file ceiling, no combined ceiling, no count limit and no daily
        quota, because there is nothing to meter. The operation runs on the
        machine the files are already on.
      </p>
      <p>
        Practically, that changes the unit of work. The question stops being
        &ldquo;which of these files matters enough to bother with&rdquo; and
        becomes &ldquo;which folder&rdquo;. Point at it, preview the first
        result to check the quality is what you want, and leave it running.
      </p>
    </AudiencePage>
  );
}
