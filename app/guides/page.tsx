import type { Metadata } from 'next';
import {
  ArrowRight,
  BookOpen,
  Cpu,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getAllCategoryPillars } from '@/lib/seo/internal-linking-graph';
import { LIVE_TOOL_CATALOG } from '@/lib/seo/live-tools';

const httpsScheme = ['https:', '//'].join('');
const httpsOrigin = `${httpsScheme}getopentools.com`;
const schemaContext = `${httpsScheme}schema.org`;

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Tool Guides — every OpenTools utility, step by step',
  description:
    'Step-by-step guides and FAQs for every working OpenTools utility. Each tool runs in your browser tab; your files and inputs never touch a server.',
  alternates: {
    canonical: `${httpsOrigin}/guides`,
  },
  openGraph: {
    title: 'Tool Guides & Solution Playbooks | OpenTools',
    description:
      'Step-by-step guides, comparisons and FAQs for every working OpenTools utility.',
    url: `${httpsOrigin}/guides`,
    siteName: 'OpenTools',
    type: 'website',
  },
};

export default function GuidesDirectoryPage() {
  const pillars = getAllCategoryPillars();
  const featuredTools = LIVE_TOOL_CATALOG.filter(
    (t) => t.releaseWave === 'P0' || t.rank <= 5,
  ).slice(0, 18);
  const toolCount = LIVE_TOOL_CATALOG.length;

  const jsonLd = {
    '@context': schemaContext,
    '@type': 'CollectionPage',
    name: 'OpenTools In-Browser Tool Guides & Solutions',
    description:
      'Step-by-step guides for every OpenTools utility that runs in the browser tab, with no server upload.',
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
              <span>{toolCount} tool guides</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Tool Guides &amp; Privacy Playbooks
            </h1>
            <p className="max-w-3xl text-base text-muted-foreground sm:text-lg">
              Step-by-step tutorials, architecture diagrams and direct answers
              for every working tool in the OpenTools catalog. Each one runs in
              your browser tab; your files and inputs never touch a server.
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
                  Your file stays in the page
                </h3>
                <p className="text-xs text-muted-foreground">
                  Your file is read by the page you have open. It never touches
                  a server.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-lg border bg-background p-2">
                <Cpu className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">No upload to wait for</h3>
                <p className="text-xs text-muted-foreground">
                  The work starts as soon as you pick a file — there is no
                  transfer step.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-lg border bg-background p-2">
                <ShieldCheck className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Free, and no account</h3>
                <p className="text-xs text-muted-foreground">
                  No paywall, no subscription, no sign-up.
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
                  Every category that has working tools.
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
                      {pillar.toolCount}{' '}
                      {pillar.toolCount === 1 ? 'tool' : 'tools'}
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
                  Start here
                </h2>
                <p className="text-sm text-muted-foreground">
                  A cross-section of the catalog, with a step-by-step guide
                  each.
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
                      Run {tool.name.toLowerCase()} in your browser tab.
                    </p>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-2 border-t pt-4">
                    <a
                      href={`/guides/${tool.slug}`}
                      aria-label={`Read ${tool.name} technical guide`}
                      className={cn(
                        buttonVariants({ variant: 'outline', size: 'sm' }),
                        'h-9 w-full text-xs font-medium',
                      )}
                    >
                      Read Guide
                    </a>
                    <a
                      href={tool.destinationUrl}
                      aria-label={`Open interactive ${tool.name} tool`}
                      className={cn(
                        buttonVariants({ variant: 'default', size: 'sm' }),
                        'h-9 w-full text-xs font-medium gap-1',
                      )}
                    >
                      Open Tool
                      <ArrowRight className="h-3 w-3" />
                    </a>
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
