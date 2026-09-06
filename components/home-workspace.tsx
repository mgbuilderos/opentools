'use client';

import {
  ArrowRight,
  Braces,
  BriefcaseBusiness,
  Calculator,
  FileStack,
  FileText,
  FlaskConical,
  Globe2,
  Image as ImageIcon,
  Landmark,
  LockKeyhole,
  Megaphone,
  QrCode,
  Search,
  Type,
  Workflow,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import {
  publicTools,
  toolGroups,
  toolsForGroup,
  type ToolGroup,
} from '@/lib/tools/catalog';

const groupIcons: Record<ToolGroup['id'], typeof FileStack> = {
  pdf: FileStack,
  images: ImageIcon,
  'text-data': Type,
  'developer-files': Braces,
  calculators: Calculator,
  'documents-office': FileText,
  'science-education': FlaskConical,
  'finance-business': BriefcaseBusiness,
  'web-seo': Globe2,
  'creator-social': Megaphone,
  'life-admin': Landmark,
  'qr-barcode': QrCode,
};

export function HomeWorkspace() {
  const [selectedGroupId, setSelectedGroupId] = useState<
    ToolGroup['id'] | undefined
  >();
  const workingActions = publicTools.reduce(
    (total, tool) => total + (tool.searchEntries?.length ?? 1),
    0,
  );
  const selectedGroup = toolGroups.find(
    (group) => group.id === selectedGroupId,
  );
  const visibleGroups = selectedGroup ? [selectedGroup] : toolGroups;

  useEffect(() => {
    const readCategory = () => {
      const candidate = new URLSearchParams(window.location.search).get(
        'category',
      );
      const valid = toolGroups.find((group) => group.id === candidate)?.id;
      setSelectedGroupId(valid);
    };
    readCategory();
    window.addEventListener('popstate', readCategory);
    return () => window.removeEventListener('popstate', readCategory);
  }, []);

  return (
    <AppShell currentToolId="" currentGroupId={selectedGroupId}>
      <section
        id="tool"
        tabIndex={-1}
        className="min-w-0 px-4 py-7 sm:px-8 lg:px-10 lg:py-9"
      >
        <div className="mx-auto max-w-5xl">
          <div className="border-b pb-7">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Local-first utility workspace
            </p>
            <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
              Small jobs. One private workspace.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Find the right tool, finish the task in this browser tab, and keep
              moving. No account and no output gate. Only working tools appear
              here—never placeholder pages.
            </p>
          </div>

          <section aria-labelledby="working-tools-heading" className="mt-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2
                  id="working-tools-heading"
                  className="text-xl font-semibold tracking-[-0.03em]"
                >
                  Popular tools first
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Merge PDF leads the evidence-weighted list. Every shown route
                  works; research-only ideas stay out of the interface.
                </p>
              </div>
              <span className="tabular rounded-full border px-3 py-1.5 text-xs font-semibold">
                {publicTools.length} workspaces · {workingActions} actions
              </span>
            </div>

            <section
              id="category-tools"
              aria-labelledby="category-tools-heading"
              className="scroll-mt-32 mt-5 lg:scroll-mt-24"
            >
              <header className="flex flex-col gap-4 border-y py-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {selectedGroup ? 'Selected category' : 'All categories'}
                  </p>
                  <h3
                    id="category-tools-heading"
                    className="mt-1 text-2xl font-semibold tracking-[-0.04em]"
                  >
                    {selectedGroup?.name ?? 'All working tool workspaces'}
                  </h3>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                    {selectedGroup?.shortDescription ??
                      'Ordered by broad task demand, then specialist use. Open the menu to focus one category.'}
                  </p>
                </div>
                {selectedGroup ? (
                  <a
                    href="/#category-tools"
                    className="focus-ring min-h-10 rounded-lg border px-3 py-2 text-center text-xs font-semibold hover:bg-muted"
                  >
                    Show all categories
                  </a>
                ) : null}
              </header>

              <div className="mt-5 space-y-5">
                {visibleGroups.map((group) => {
                  const Icon = groupIcons[group.id];
                  const groupTools = toolsForGroup(group);
                  const groupIndex = toolGroups.findIndex(
                    (candidate) => candidate.id === group.id,
                  );
                  const actionCount = groupTools.reduce(
                    (total, tool) => total + (tool.searchEntries?.length ?? 1),
                    0,
                  );

                  return (
                    <section
                      key={group.id}
                      aria-labelledby={`group-${group.id}`}
                      className="overflow-hidden rounded-xl border bg-card"
                    >
                      <header className="flex items-start justify-between gap-4 border-b p-4 sm:p-5">
                        <div className="flex min-w-0 items-start gap-3">
                          <span className="tabular mt-0.5 font-mono text-[11px] text-muted-foreground">
                            {String(groupIndex + 1).padStart(2, '0')}
                          </span>
                          <span className="grid size-9 shrink-0 place-items-center rounded-lg border bg-background">
                            <Icon aria-hidden="true" className="size-4" />
                          </span>
                          <div>
                            <h3
                              id={`group-${group.id}`}
                              className="text-base font-semibold tracking-[-0.02em]"
                            >
                              {group.name}
                            </h3>
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                              {group.shortDescription}
                            </p>
                          </div>
                        </div>
                        <span className="tabular shrink-0 rounded-md border px-2 py-1 font-mono text-[10px] text-muted-foreground">
                          {actionCount} actions
                        </span>
                      </header>

                      <div className="grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-3">
                        {groupTools.map((tool) => (
                          <article
                            key={tool.id}
                            className="bg-background p-4 sm:p-5"
                          >
                            <a
                              href={tool.href}
                              aria-label={`${tool.name}: ${tool.shortDescription}`}
                              className="focus-ring group flex min-h-20 items-start gap-3 rounded-lg"
                            >
                              <span className="min-w-0 flex-1">
                                <span className="flex items-start justify-between gap-3">
                                  <span className="text-sm font-semibold">
                                    {tool.name}
                                  </span>
                                  <ArrowRight
                                    aria-hidden="true"
                                    className="mt-0.5 size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
                                  />
                                </span>
                                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                                  {tool.shortDescription}
                                </span>
                              </span>
                            </a>
                            {tool.searchEntries?.length ? (
                              <div className="mt-3 flex flex-wrap gap-1.5 border-t pt-3">
                                {tool.searchEntries.slice(0, 5).map((entry) => (
                                  <a
                                    key={entry.id}
                                    href={entry.href}
                                    className="focus-ring rounded-md border bg-muted/50 px-2 py-1 text-[11px] font-medium hover:bg-muted"
                                  >
                                    {entry.name}
                                  </a>
                                ))}
                                {tool.searchEntries.length > 5 ? (
                                  <a
                                    href={tool.href}
                                    className="focus-ring rounded-md px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-muted"
                                  >
                                    +{tool.searchEntries.length - 5} more
                                  </a>
                                ) : null}
                              </div>
                            ) : (
                              <p className="mt-3 flex items-center gap-1.5 border-t pt-3 text-[11px] font-medium text-muted-foreground">
                                <LockKeyhole
                                  aria-hidden="true"
                                  className="size-3"
                                />
                                Focused single-purpose tool
                              </p>
                            )}
                          </article>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            </section>
          </section>

          <section className="mt-8 grid overflow-hidden rounded-2xl border bg-card md:grid-cols-3">
            <div className="border-b p-5 md:border-b-0 md:border-r sm:p-6">
              <Search aria-hidden="true" className="size-5" />
              <h2 className="mt-5 text-sm font-semibold">Search by the job</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Try “combine PDFs,” “compress image,” or “format JSON” in the
                search bar.
              </p>
            </div>
            <div className="border-b p-5 md:border-b-0 md:border-r sm:p-6">
              <Workflow aria-hidden="true" className="size-5" />
              <h2 className="mt-5 text-sm font-semibold">
                Continue without re-uploading
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Nearby-task links keep discovery moving; typed artifact handoff
                remains the next milestone.
              </p>
            </div>
            <div className="p-5 sm:p-6">
              <LockKeyhole aria-hidden="true" className="size-5" />
              <h2 className="mt-5 text-sm font-semibold">
                Trust is a test result
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Tool routes make no network calls by source policy; runtime
                egress certification remains pending.
              </p>
            </div>
          </section>
        </div>
      </section>
    </AppShell>
  );
}
