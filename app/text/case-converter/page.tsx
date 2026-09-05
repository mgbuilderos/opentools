import type { Metadata } from 'next';

import { ToolWorkspace } from '@/components/tool-workspace';

export const metadata: Metadata = {
  title: 'Text Case Converter',
  description:
    'Change text to sentence, title, upper, or lower case directly in your browser.',
};

export default function TextCaseConverterPage() {
  return <ToolWorkspace />;
}
