import type { Metadata } from 'next';
import { BenchTool } from '@/components/bench/bench-tool';

export const revalidate = 86400;

/*
  The old title was "The Bench — Run Private Tools Over a Folder", on the URL
  /bench. Nobody searches for "bench". The page behind it does the one thing no
  hosted rival can offer at any price — point it at a folder of four thousand
  files and come back when it is done — and that sentence appeared nowhere,
  while the address was a word only we used.

  Both now say what the page does, in the words somebody with the problem would
  actually type. /bench keeps a permanent redirect here
  (lib/seo/removed-tool-redirects.ts).
*/
export const metadata: Metadata = {
  alternates: { canonical: '/batch' },
  title: 'Batch Process a Whole Folder of Files',
  description:
    'Point it at a folder of 4,000 files and come back in ten minutes. Compress, convert, rename or strip metadata across every file at once — no upload, no limits.',
};

export default function Page() {
  return <BenchTool />;
}
