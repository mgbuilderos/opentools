import type { Metadata } from 'next';
import { Base64EncoderTool } from '@/components/utility-tools';
export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/developer/base64-encoder' },
  title: 'Base64 Encoder',
  description: 'Encode Unicode text as Base64 locally in your browser.',
};
export default function Page() {
  return <Base64EncoderTool />;
}
