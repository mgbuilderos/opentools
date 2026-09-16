'use client';

import { useMemo, useState } from 'react';
import {
  ArrowRight,
  ExternalLink,
  Lock,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  getAllTemplates,
  type TemplateCategory,
} from '@/lib/templates/templates-data';

const CATEGORIES: readonly (TemplateCategory | 'All')[] = [
  'All',
  'Notion Workspaces',
  'Google Sheets & Models',
  'Legal & Business',
  'Developer Runbooks',
];

export default function TemplatesCatalogPage() {
  const [activeCategory, setActiveCategory] =
    useState<(typeof CATEGORIES)[number]>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const allTemplates = useMemo(() => getAllTemplates(), []);

  const filteredTemplates = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    return allTemplates.filter((item) => {
      const matchCat =
        activeCategory === 'All' || item.category === activeCategory;
      const matchSearch =
        !query ||
        `${item.title} ${item.description} ${item.keywords.join(' ')} ${item.targetAudience}`
          .toLocaleLowerCase()
          .includes(query);
      return matchCat && matchSearch;
    });
  }, [allTemplates, activeCategory, searchQuery]);

  return (
    <AppShell currentToolId="home">
      <div className="min-w-0 px-4 py-8 sm:px-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-6xl space-y-10">
          {/* Header Section */}
          <header className="space-y-4 border-b pb-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border bg-muted px-2.5 py-0.5 font-mono text-[11px] font-medium text-foreground">
                Open-Source Vault
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                <ShieldCheck
                  aria-hidden="true"
                  className="size-3.5 text-success"
                />
                100% Free · No Email Required
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                <Lock
                  aria-hidden="true"
                  className="size-3.5 text-muted-foreground"
                />
                Zero Server Uploads
              </span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Free Templates &amp; Operating Systems
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Production-grade Notion workspaces, Google Sheets financial
              models, on-device legal agreement builders, and engineering
              runbooks. Duplicate or download with one click.
            </p>
          </header>

          {/* Search & Category Filter Controls */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Category Pills */}
              <div className="flex flex-wrap items-center gap-2">
                {CATEGORIES.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                    className={`focus-ring rounded-lg border px-3.5 py-2 text-xs font-semibold transition-all duration-[var(--motion-standard)] ease-[var(--motion-ease)] ${
                      activeCategory === category
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-72">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search templates & models..."
                  aria-label="Search templates"
                  className="focus-ring h-11 w-full rounded-lg border bg-background pl-9 pr-3 text-sm transition-colors hover:border-foreground/30 focus:border-foreground/50"
                />
              </div>
            </div>

            <output className="block text-xs text-muted-foreground">
              Showing {filteredTemplates.length}{' '}
              {filteredTemplates.length === 1 ? 'template' : 'templates'}
              {searchQuery ? ` matching “${searchQuery}”` : ''}
            </output>
          </div>

          {/* Template Cards Grid */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((template) => (
              <div
                key={template.slug}
                className="group flex flex-col justify-between rounded-2xl border bg-card p-6 shadow-sm transition-all duration-[var(--motion-standard)] ease-[var(--motion-ease)] hover:-translate-y-1 hover:border-foreground/30 hover:shadow-md"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {template.format}
                    </span>
                    <span className="rounded-full border bg-muted/60 px-2.5 py-0.5 text-[10px] font-semibold text-foreground">
                      {template.badge}
                    </span>
                  </div>

                  <div>
                    <h2 className="text-lg font-bold tracking-tight text-foreground group-hover:underline">
                      <a href={`/templates/${template.slug}`}>
                        {template.title}
                      </a>
                    </h2>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground line-clamp-3">
                      {template.description}
                    </p>
                  </div>

                  <div className="space-y-1.5 border-t pt-3 text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      Key Highlights:
                    </span>
                    <ul className="space-y-1 list-disc pl-4">
                      {template.features.slice(0, 2).map((feat, fIdx) => (
                        <li key={fIdx} className="line-clamp-1">
                          {feat}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-6 space-y-3 border-t pt-4">
                  <div className="flex items-center justify-between gap-2">
                    <a
                      href={`/templates/${template.slug}`}
                      aria-label={`Open ${template.title}`}
                      className={cn(
                        buttonVariants({ variant: 'default', size: 'sm' }),
                        'h-9 px-4 text-xs font-semibold gap-1.5',
                      )}
                    >
                      View Details
                      <ArrowRight className="size-3.5" />
                    </a>

                    {template.duplicateUrl ? (
                      <a
                        href={template.duplicateUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
                        aria-label={`Duplicate ${template.title}`}
                      >
                        Duplicate
                        <ExternalLink className="size-3" />
                      </a>
                    ) : null}
                  </div>

                  <div className="text-[11px] text-muted-foreground">
                    <span>Target: </span>
                    <span className="font-medium text-foreground">
                      {template.targetAudience}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!filteredTemplates.length ? (
            <div className="rounded-2xl border border-dashed p-10 text-center space-y-3">
              <h3 className="text-base font-semibold text-foreground">
                No templates found
              </h3>
              <p className="text-xs text-muted-foreground">
                Try searching for another keyword or select a different
                category.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setActiveCategory('All');
                  setSearchQuery('');
                }}
              >
                Reset Filters
              </Button>
            </div>
          ) : null}

          {/* Bottom Synergy Box */}
          <div className="rounded-2xl border bg-muted/40 p-8 text-center space-y-4">
            <h3 className="text-xl font-bold text-foreground">
              Need to process files or format data?
            </h3>
            <p className="max-w-xl mx-auto text-sm text-muted-foreground">
              OpenTools gives you over 30+ on-device converters, PDF page tools,
              and code visualizers with 100% local execution and zero uploads.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                href="/pdf/merge"
                className={cn(
                  buttonVariants({ variant: 'default', size: 'sm' }),
                  'h-10 px-5 text-xs font-semibold',
                )}
              >
                PDF Suite
              </a>
              <a
                href="/developer/advanced"
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'h-10 px-5 text-xs font-semibold',
                )}
              >
                Developer Workbenches
              </a>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
