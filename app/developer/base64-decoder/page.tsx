import type { Metadata } from 'next';
import { Base64DecoderTool } from '@/components/utility-tools';
export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Base64 Decoder',
  description: 'Decode Base64 into validated UTF-8 text locally.',
};
export default function Page() {
  return <Base64DecoderTool />;
}
