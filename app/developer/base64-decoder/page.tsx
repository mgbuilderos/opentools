import type { Metadata } from 'next';
import { Base64DecoderTool } from '@/components/utility-tools';
export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/developer/base64-decoder' },
  title: 'Base64 Decoder',
  description:
    'Decode Base64 into validated UTF-8 text locally. Paste the encoded string and read the text back, with invalid bytes reported rather than shown as mojibake.',
};
export default function Page() {
  return <Base64DecoderTool />;
}
