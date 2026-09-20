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
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  getAllCategoryPillars,
  getCategoryBySlug,
  getCategoryPillar,
} from '@/lib/seo/internal-linking-graph';
import { getLiveToolsByCategory } from '@/lib/seo/live-tools';

export const revalidate = 86400;

interface CategoryPageProps {
  params: Promise<{ category: string }>;
}

const httpsOrigin = ['https:', '//', 'getopentools.com'].join('');

/** A slug outside `generateStaticParams` is a 404, not a render. Without this,
 * any unknown URL -- a typo, a stale link, a crawler probing -- starts a React
 * render on a Worker with a 10ms CPU budget. */
export const dynamicParams = false;

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

  const tools = getLiveToolsByCategory(categoryName);
  if (tools.length === 0) notFound();
  const toolWord = tools.length === 1 ? 'tool' : 'tools';

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
                Never uploaded
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted px-3 py-1 text-xs font-mono text-muted-foreground">
                {tools.length} {toolWord}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                Free, no account
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
                OpenTools has {tools.length} working{' '}
                {categoryName.toLowerCase()} {toolWord}. Each one runs in your
                own browser tab, so your files and inputs never touch a server.
                There is no account and no paywall.
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
                  Working tools
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold">
                  <Cpu aria-hidden="true" className="size-4" />
                  {tools.length}
                </p>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <p className="text-xs font-medium text-muted-foreground">
                  Server upload
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold">
                  <ShieldCheck
                    aria-hidden="true"
                    className="size-4 text-success"
                  />
                  None
                </p>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <p className="text-xs font-medium text-muted-foreground">
                  Runs on
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold">
                  <Zap aria-hidden="true" className="size-4 text-success" />
                  Your browser
                </p>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <p className="text-xs font-medium text-muted-foreground">
                  Cost
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold">
                  <LockKeyhole aria-hidden="true" className="size-4" />
                  Free, no paywall
                </p>
              </div>
            </div>
          </section>

          {/* Tool Cluster Directory */}
          <section className="mt-12">
            <h2 className="text-xl font-semibold tracking-[-0.03em] sm:text-2xl">
              All {categoryName} tools
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Read the guide, or open the tool straight away.
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
                        {categoryName}
                      </span>
                      <span className="rounded-full border bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                        {tool.executionMode}
                      </span>
                    </div>
                    <h3 className="mt-3 text-base font-semibold text-foreground">
                      {tool.name}
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Run {tool.name.toLowerCase()} in your browser tab.
                    </p>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-2 border-t pt-4">
                    <a
                      href={`/guides/${tool.slug}`}
                      aria-label={`Read ${tool.name} guide`}
                      className={cn(
                        buttonVariants({ variant: 'outline', size: 'sm' }),
                        'h-9 w-full text-xs font-medium gap-1.5',
                      )}
                    >
                      <BookOpen aria-hidden="true" className="size-3.5" />
                      Read Guide
                    </a>
                    <a
                      href={tool.destinationUrl}
                      aria-label={`Launch ${tool.name} workbench`}
                      className={cn(
                        buttonVariants({ variant: 'default', size: 'sm' }),
                        'h-9 w-full text-xs font-semibold gap-1.5',
                      )}
                    >
                      Launch Tool
                      <ArrowRight aria-hidden="true" className="size-3.5" />
                    </a>
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
              Every other category that still has working tools.
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
