import type { Metadata } from 'next';

import { JsonTool } from '@/components/structured-tools';

export const metadata: Metadata = {
  title: 'JSON Formatter and Validator',
  description:
    'Format, validate, minify, or sort JSON locally in your browser.',
};

export default function Page() {
  return <JsonTool />;
}
