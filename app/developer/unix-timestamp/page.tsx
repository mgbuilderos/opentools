import type { Metadata } from 'next';
import { TimestampTool } from '@/components/utility-tools';
export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/developer/unix-timestamp' },
  title: 'Unix Timestamp Converter',
  description:
    'Convert Unix timestamps and ISO dates locally. Paste an epoch number or an ISO 8601 date and read the other form, in seconds or milliseconds, in your browser.',
};
export default function Page() {
  return <TimestampTool />;
}
