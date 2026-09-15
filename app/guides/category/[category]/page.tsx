import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  ArrowRight,
  BookOpen,
  Cpu,
  LockKeyhole,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import {
  getAllCategoryPillars,
  getCategoryBySlug,
  getCategoryPillar,
} from '@/lib/seo/internal-linking-graph';
import { getToolsByCategory } from '@/lib/seo/tool-catalog-data';

interface CategoryPageProps {
  params: Promise<{ category: string }>;
}

const httpsOrigin = ['https:', '//', 'getopentools.com'].join('');

export async function generateStaticParams() {
  return getAllCategoryPillars().map((p) => ({ category: p.slug }));
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { category: categorySlug } = await params;
  const categoryName = getCategoryBySlug(categorySlug);
  if (!categoryName) return { title: 'Category Not Found' };

  const pillar = getCategoryPillar(categoryName);
  if (!pillar) return { title: 'Category Not Found' };

  const title = `${categoryName} Tools — Free In-Browser ${categoryName} Utilities`;
  const description = pillar.description;

  return {
    title,
    description,
    alternates: {
      canonical: `${httpsOrigin}/guides/category/${categorySlug}`,
    },
    openGraph: {
      title,
      description,
      url: `${httpsOrigin}/guides/category/${categorySlug}`,
      siteName: 'OpenTools',
      type: 'website',
    },
  };
}

export default async function CategoryPillarPage({
  params,
}: CategoryPageProps) {
  const { category: categorySlug } = await params;
  const categoryName = getCategoryBySlug(categorySlug);
  if (!categoryName) notFound();

  const pillar = getCategoryPillar(categoryName);
  if (!pillar) notFound();

  const tools = getToolsByCategory(categoryName);

  const jsonLd = {
    '@context': ['https:', '//schema.org'].join(''),
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: `${categoryName} In-Browser Tools & Guides`,
        description: pillar.description,
        url: `${httpsOrigin}/guides/category/${categorySlug}`,
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: tools.length,
          itemListElement: tools.map((tool, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: tool.name,
            url: `${httpsOrigin}/guides/${tool.slug}`,
          })),
        },
      },
      {
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
          {
            '@type': 'ListItem',
            position: 3,
            name: categoryName,
            item: `${httpsOrigin}/guides/category/${categorySlug}`,
          },
        ],
      },
    ],
  };

  return (
    <AppShell currentToolId="home">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article
        id="tool"
        tabIndex={-1}
        className="min-w-0 px-4 py-7 sm:px-8 lg:px-10 lg:py-9"
      >
        <div className="mx-auto max-w-5xl">
          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <li>
                <a href="/" className="hover:text-foreground">
                  Home
                </a>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <span className="hover:text-foreground">Guides</span>
              </li>
              <li aria-hidden="true">/</li>
              <li className="font-medium text-foreground">{categoryName}</li>
            </ol>
          </nav>

          {/* Header */}
          <header className="border-b pb-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold">
                <ShieldCheck
                  aria-hidden="true"
                  className="size-3.5 text-success"
                />
                Zero Cloud Egress
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted px-3 py-1 text-xs font-mono text-muted-foreground">
                {tools.length} Local Tools
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                100% Free Forever
              </span>
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              {categoryName} Utilities &amp; Operator Guides
            </h1>
            <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
              {pillar.description}
            </p>

            {/* Direct Answer Box */}
            <div className="mt-6 rounded-xl border bg-card p-5">
              <p className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                Quick Summary / Direct Answer
              </p>
              <p className="mt-2 text-sm leading-6 font-medium">
                OpenTools provides {tools.length} in-browser{' '}
                {categoryName.toLowerCase()} utilities that execute 100% locally
                on your computer via client-side WebAssembly and modern browser
                APIs. No files are uploaded to any server, there are no
                subscriptions or paywalls, and all tools run with zero network
                egress.
              </p>
            </div>
          </header>

          {/* Specifications Grid */}
          <section aria-labelledby="category-specs" className="mt-8">
            <h2 id="category-specs" className="sr-only">
              Category Specifications
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border bg-card p-4">
                <p className="text-xs font-medium text-muted-foreground">
                  Available Utilities
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold">
                  <Cpu aria-hidden="true" className="size-4" />
                  {tools.length} Operations
                </p>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <p className="text-xs font-medium text-muted-foreground">
                  Server Upload
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold">
                  <ShieldCheck
                    aria-hidden="true"
                    className="size-4 text-success"
                  />
                  0 Bytes Egress
                </p>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <p className="text-xs font-medium text-muted-foreground">
                  Execution Model
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold">
                  <Zap aria-hidden="true" className="size-4 text-success" />
                  Device RAM
                </p>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <p className="text-xs font-medium text-muted-foreground">
                  Cost
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold">
                  <LockKeyhole aria-hidden="true" className="size-4" />
                  $0 / Free Forever
                </p>
              </div>
            </div>
          </section>

          {/* Tool Cluster Directory */}
          <section className="mt-12">
            <h2 className="text-xl font-semibold tracking-[-0.03em] sm:text-2xl">
              All {categoryName} Utilities &amp; Tutorials
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Explore step-by-step technical guides or jump straight into the
              live interactive tool tab.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {tools.map((tool) => (
                <div
                  key={tool.slug}
                  className="flex flex-col justify-between rounded-xl border bg-card p-5"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        #{tool.rank} in {categoryName}
                      </span>
                      <span className="rounded-full border bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                        {tool.executionMode}
                      </span>
                    </div>
                    <h3 className="mt-3 text-base font-semibold text-foreground">
                      {tool.name}
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {tool.notes ||
                        `Client-side ${tool.name.toLowerCase()} executed locally in device memory with zero server upload.`}
                    </p>
                  </div>

                  <div className="mt-5 flex items-center gap-2 border-t pt-4">
                    <Button
                      nativeButton={false}
                      variant="outline"
                      render={
                        <a
                          href={`/guides/${tool.slug}`}
                          className="inline-flex items-center gap-1.5"
                          aria-label={`Read ${tool.name} guide`}
                        />
                      }
                      className="h-9 text-xs"
                    >
                      <BookOpen aria-hidden="true" className="size-3.5" />
                      Read Guide
                    </Button>
                    <Button
                      nativeButton={false}
                      render={
                        <a
                          href={tool.destinationUrl}
                          className="inline-flex items-center gap-1.5"
                          aria-label={`Launch ${tool.name} workbench`}
                        />
                      }
                      className="h-9 text-xs font-semibold"
                    >
                      Launch Tool
                      <ArrowRight aria-hidden="true" className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Footer Navigation */}
          <footer className="mt-12 rounded-2xl border bg-card p-6 text-center sm:p-8">
            <h2 className="text-xl font-semibold tracking-[-0.03em]">
              Explore Other Tool Categories
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
              Discover over 1,000 free, zero-egress browser utilities across all
              computing domains.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {getAllCategoryPillars()
                .filter((p) => p.slug !== categorySlug)
                .slice(0, 8)
                .map((p) => (
                  <a
                    key={p.slug}
                    href={p.href}
                    className="focus-ring rounded-lg border bg-muted/50 px-3 py-1.5 text-xs font-medium hover:bg-muted"
                  >
                    {p.name}
                  </a>
                ))}
            </div>
          </footer>
        </div>
      </article>
    </AppShell>
  );
}
