import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'OpenTools — Fast, private browser utilities',
    template: '%s · OpenTools',
  },
  description:
    'A focused workspace of fast browser utilities for PDFs, images, text, and structured data.',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

const themeScript = `
  try {
    const saved = localStorage.getItem('tools-theme');
    const dark = saved === 'dark' || (!saved && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
  } catch (_) {}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
