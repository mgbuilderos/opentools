import type { Metadata } from 'next';

import { JsonTool } from '@/components/structured-tools';

export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/data/json' },
  title: 'JSON Formatter and Validator',
  description:
    'Format, validate, minify, or sort JSON locally in your browser.',
};

export default function Page() {
  return <JsonTool />;
}
