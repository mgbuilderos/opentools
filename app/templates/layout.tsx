import type { Metadata } from 'next';

/**
 * `app/templates/page.tsx` is a client component, so it cannot export
 * `metadata` itself. Without this the catalogue inherited the root title and
 * description and -- until 2026-09-23 -- the root canonical, which pointed it
 * at the home page. `/templates/[slug]` sets its own canonical in
 * `generateMetadata`, so nothing below inherits this one.
 */
export const metadata: Metadata = {
  alternates: { canonical: '/templates' },
  title: 'Free Templates — Notion, Sheets, Legal & Runbooks',
  description:
    'Download free Notion workspaces, Google Sheets models, legal documents, and developer runbooks. No signup, no email, no paywall.',
};

export default function TemplatesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
