import type { Metadata } from 'next';
import { AudiencePage } from '@/components/audience-page';

export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/for/doctors' },
  title: 'Remove Patient Names From Scans and Reports',
  description:
    'Strip identifiers from a scan, report or discharge summary before it is shared or taught from. The file never leaves the browser, so nothing is disclosed.',
};

export default function Page() {
  return (
    <AudiencePage
      eyebrow="For clinics, hospitals and practices"
      heading="Take the patient’s name off it before it goes anywhere"
      standfirst="A referral, a teaching slide, a second opinion, an insurance claim — every one of them starts with removing the identifiers, and every free tool that offers to help wants the scan uploaded first. That is the disclosure you were trying to avoid, performed in order to avoid it."
      tools={[
        {
          href: '/pdf/redact',
          name: 'Redact a report',
          why: 'Deletes the name, the hospital number and the date of birth from the text itself rather than covering them. Search the output afterwards to confirm.',
        },
        {
          href: '/image/metadata',
          name: 'Strip image metadata',
          why: 'A photograph taken on a ward carries the time, often the location and sometimes the device. None of that is visible in the picture and all of it travels with the file.',
        },
        {
          href: '/documents/metadata',
          name: 'Inspect a document’s properties',
          why: 'A discharge summary written from a template usually still names the author and the practice in its properties.',
        },
        {
          href: '/image/to-text',
          name: 'Read text off a scan',
          why: 'Pulls the typed content out of a scanned page so it can be quoted or searched, without the page being sent for processing.',
        },
        {
          href: '/pdf/compress',
          name: 'Make it small enough to send',
          why: 'Imaging exports are large, and most clinical systems and insurers cap what they will accept.',
        },
      ]}
      limits={[
        'It is not a medical device and produces nothing for diagnostic use. It handles documents, not clinical decisions.',
        'It does not read DICOM. Export to PDF or an image first, and be aware that export itself can carry metadata across.',
        'Removing what you select is all it does. It cannot recognise an identifier you did not mark, and a name burned into the pixels of a scan is part of the picture — crop or paint it out, do not rely on text redaction.',
        'Nothing here constitutes compliance with your jurisdiction’s patient data rules. It removes the obligation to upload; the rest of the obligation stays yours.',
      ]}
    >
      <p>
        Identifiable patient data has a property that makes it unlike almost any
        other sensitive file: once it has been sent somewhere it should not have
        gone, there is no version of putting it back. Deletion by the recipient
        is a promise, not a remedy, and the duty that was breached was breached
        at the moment of sending.
      </p>
      <p>
        Which is why the ordinary workflow is quietly alarming. To anonymise a
        scan for a teaching set, the usual route is to upload the identifiable
        version to a website nobody in the organisation has assessed, so that it
        can hand back a version with the identifiers removed. The unredacted
        file is the one that travels.
      </p>
      <p>
        Here the file does not travel at all. The page does the work in the tab
        that is already open, which you can confirm without taking
        anyone&rsquo;s word for it: turn off the wifi and try it. It keeps
        working, because there was never anything on the other end.
      </p>
    </AudiencePage>
  );
}
