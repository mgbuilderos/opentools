import type { Metadata } from 'next';
import {
  ArrowRight,
  BookOpen,
  Cpu,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { getAllCategoryPillars } from '@/lib/seo/internal-linking-graph';
import { TOOL_CATALOG } from '@/lib/seo/tool-catalog-data';

const httpsScheme = ['https:', '//'].join('');
const httpsOrigin = `${httpsScheme}getopentools.com`;
const schemaContext = `${httpsScheme}schema.org`;

export const metadata: Metadata = {
  title: 'Tool Guides & Solution Playbooks — 100% Private In-Browser Utilities',
  description:
    'Comprehensive step-by-step guides, technical architectures, and FAQs for 1,000+ zero-egress browser tools across Developer, PDF, Video, Audio, and Finance.',
  alternates: {
    canonical: `${httpsOrigin}/guides`,
  },
  openGraph: {
    title: 'Tool Guides & Solution Playbooks | OpenTools',
    description:
      'Step-by-step guides, technical comparisons, and FAQs for 1,000+ zero-egress, client-side browser tools.',
    url: `${httpsOrigin}/guides`,
    siteName: 'OpenTools',
    type: 'website',
  },
};

export default function GuidesDirectoryPage() {
  const pillars = getAllCategoryPillars();
  const featuredTools = TOOL_CATALOG.filter(
    (t) => t.releaseWave === 'P0' || t.rank <= 5,
  ).slice(0, 18);

  const jsonLd = {
    '@context': schemaContext,
    '@type': 'CollectionPage',
    name: 'OpenTools In-Browser Tool Guides & Solutions',
    description:
      'Comprehensive step-by-step guides for 1,000+ zero-egress browser tools operating 100% client-side with zero server uploads.',
    url: `${httpsOrigin}/guides`,
    publisher: {
      '@type': 'Organization',
      name: 'OpenTools',
      url: httpsOrigin,
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: httpsOrigin,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Guides',
          item: `${httpsOrigin}/guides`,
        },
      ],
    },
  };

  return (
    <AppShell currentToolId="home">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-w-0 px-4 py-8 sm:px-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-6xl space-y-12">
          {/* Header */}
          <div className="space-y-4 text-center sm:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1 text-xs font-mono font-medium text-muted-foreground">
              <BookOpen className="h-3.5 w-3.5" />
              <span>1,000+ Solutions &amp; Technical Guides</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Tool Guides &amp; Privacy Playbooks
            </h1>
            <p className="max-w-3xl text-base text-muted-foreground sm:text-lg">
              Step-by-step tutorials, technical architecture diagrams, and
              direct answers for every in-browser tool in the OpenTools catalog.
              Zero server uploads, zero data egress.
            </p>
          </div>

          {/* Privacy Guarantee Banner */}
          <div className="grid gap-4 rounded-xl border bg-card p-6 sm:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="rounded-lg border bg-background p-2">
                <LockKeyhole className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">
                  100% In-Browser Privacy
                </h3>
                <p className="text-xs text-muted-foreground">
                  Zero cloud storage. Files are processed in device RAM and
                  revoked instantly.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-lg border bg-background p-2">
                <Cpu className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">
                  WASM &amp; Hardware Speed
                </h3>
                <p className="text-xs text-muted-foreground">
                  Native WebAssembly execution without network upload
                  bottlenecks.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-lg border bg-background p-2">
                <ShieldCheck className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">
                  Free Forever &amp; No Signup
                </h3>
                <p className="text-xs text-muted-foreground">
                  No paywalls, subscriptions, or forced account creation.
                </p>
              </div>
            </div>
          </div>

          {/* Category Pillar Hubs */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">
                  Explore Categories
                </h2>
                <p className="text-sm text-muted-foreground">
                  Discover dedicated solution hubs grouped by discipline and
                  workflow.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pillars.map((pillar) => (
                <a
                  key={pillar.slug}
                  href={pillar.href}
                  className="group rounded-xl border bg-card p-5 transition-colors hover:border-foreground/40 hover:bg-muted/30 block"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold group-hover:text-foreground">
                      {pillar.name}
                    </h3>
                    <span className="rounded-full border bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {pillar.toolCount} tools
                    </span>
                  </div>
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {pillar.description}
                  </p>
                  <div className="mt-4 flex items-center gap-1 text-xs font-medium text-foreground group-hover:underline">
                    <span>View Category Hub</span>
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* Featured Evergreen Guides */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">
                  Popular Tool Guides
                </h2>
                <p className="text-sm text-muted-foreground">
                  Most frequently consulted guides with step-by-step execution
                  workflows.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featuredTools.map((tool) => (
                <div
                  key={tool.slug}
                  className="flex flex-col justify-between rounded-xl border bg-card p-5 transition-colors hover:border-foreground/40"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        {tool.category}
                      </span>
                      <span className="rounded-full border bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                        {tool.executionMode === 'local-wasm'
                          ? 'WASM'
                          : 'JS API'}
                      </span>
                    </div>
                    <h3 className="mt-3 text-base font-semibold text-foreground">
                      {tool.name}
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground line-clamp-2">
                      In-browser {tool.name.toLowerCase()} with zero server
                      uploads and instant export.
                    </p>
                  </div>

                  <div className="mt-5 flex items-center gap-2 border-t pt-4">
                    <Button
                      nativeButton={false}
                      variant="outline"
                      size="sm"
                      render={
                        <a
                          href={`/guides/${tool.slug}`}
                          aria-label={`Read ${tool.name} technical guide`}
                          className="w-full text-xs text-center inline-flex items-center justify-center"
                        >
                          Read Guide
                        </a>
                      }
                      className="h-9 w-full text-xs"
                    >
                      Read Guide
                    </Button>
                    <Button
                      nativeButton={false}
                      size="sm"
                      render={
                        <a
                          href={tool.destinationUrl}
                          aria-label={`Open interactive ${tool.name} tool`}
                          className="w-full text-xs text-center inline-flex items-center justify-center gap-1"
                        >
                          Open Tool
                          <ArrowRight className="h-3 w-3" />
                        </a>
                      }
                      className="h-9 w-full text-xs"
                    >
                      Open Tool
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
