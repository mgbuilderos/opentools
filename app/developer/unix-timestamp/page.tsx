import type { Metadata } from 'next';
import { TimestampTool } from '@/components/utility-tools';
export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Unix Timestamp Converter',
  description: 'Convert Unix timestamps and ISO dates locally.',
};
export default function Page() {
  return <TimestampTool />;
}
