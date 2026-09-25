import type { Metadata } from 'next';
import { AudiencePage } from '@/components/audience-page';

export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/batch/heic-photos' },
  title: 'Convert a Whole Folder of HEIC Photos',
  description:
    'Turn every HEIC an iPhone produced into JPG or PNG in one pass, on your own machine. No upload, no per-photo limit — and the location data comes off too.',
};

export default function Page() {
  return (
    <AudiencePage
      eyebrow="Batch"
      heading="Convert a folder of HEIC photos"
      standfirst="Nobody chose HEIC. An iPhone produced it, and now a thousand holiday photographs will not open on a work laptop, will not attach to a claim form and will not upload to a printing service. This converts the folder, not the photo."
      toolsHeading="Start here"
      tools={[
        {
          href: '/batch',
          name: 'Open the batch runner',
          why: 'Choose the folder of photos, pick the conversion, and run it across all of them at once.',
        },
        {
          href: '/image/heic-to-jpg',
          name: 'HEIC to JPG',
          why: 'The single-photo version, and the right choice when you want the smaller, universally accepted format.',
        },
        {
          href: '/image/heic-to-png',
          name: 'HEIC to PNG',
          why: 'Lossless instead, for a photo that will be edited again rather than filed.',
        },
        {
          href: '/image/metadata',
          name: 'Check what the photo carries',
          why: 'A phone photograph records where and when it was taken. Worth reading before a folder of them goes anywhere.',
        },
      ]}
      limits={[
        'JPG is lossy. Converting re-encodes the picture, so a photo converted repeatedly degrades — convert from the original each time.',
        'Live Photos become a single still. The motion is not in the converted file.',
        'Editing done in the iPhone Photos app is sometimes stored separately from the image. Export from Photos rather than copying the raw file if an edit must survive.',
        'A very large folder is bounded by your browser’s memory, since the decoding happens in the tab. The page says so rather than refusing.',
      ]}
    >
      <p>
        HEIC is the format problem that reached ordinary people. It is a
        perfectly good container that most phones now write by default, and much
        of the rest of computing — older laptops, claim portals, print shops,
        plenty of workplace software — simply does not read it. The result is a
        recurring, low-grade emergency involving a folder of photographs that
        exist and cannot be opened.
      </p>
      <p>
        The usual fix is a converter site that takes twenty at a time, which is
        the wrong unit: the folder is a thousand. That limit is not modesty
        about what the software can do, it is the cost of receiving a thousand
        photographs, and it is precisely the cost that does not arise when the
        conversion happens in the browser.
      </p>
      <p>
        There is a privacy consequence worth naming, because photographs are
        unusually revealing. Each one records when it was taken and usually
        where — a year of family photographs is a map of where a family lives
        and goes. Converting them here means that folder is never handed to
        anyone, and the metadata tools let you check what came across.
      </p>
    </AudiencePage>
  );
}
