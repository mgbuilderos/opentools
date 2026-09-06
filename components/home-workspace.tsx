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
  const workingActions = publicTools.reduce(
    (total, tool) => total + (tool.searchEntries?.length ?? 1),
    0,
  );

  return (
    <AppShell currentToolId="">
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
              Find the right tool, finish the task, and keep moving. Working
              canaries process content in your browser with no account or output
              gate. This candidate deliberately ships a small, testable set
              instead of thousands of placeholder pages.
            </p>
          </div>

          <section aria-labelledby="working-tools-heading" className="mt-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2
                  id="working-tools-heading"
                  className="text-xl font-semibold tracking-[-0.03em]"
                >
                  Working tools
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Every listed route performs the advertised job; the research
                  backlog stays private.
                </p>
              </div>
              <span className="tabular rounded-full border px-3 py-1.5 text-xs font-semibold">
                {publicTools.length} workspaces · {workingActions} actions
              </span>
            </div>

            <nav
              aria-label="Tool categories"
              className="mt-5 grid grid-cols-2 overflow-hidden rounded-xl border bg-card sm:grid-cols-3 lg:grid-cols-6"
            >
              {toolGroups.map((group, index) => {
                const Icon = groupIcons[group.id];
                const tools = toolsForGroup(group);
                const operationCount = tools.reduce(
                  (total, tool) => total + (tool.searchEntries?.length ?? 1),
                  0,
                );
                return (
                  <a
                    key={group.id}
                    href={`#group-${group.id}`}
                    className="focus-ring group border-b border-r p-3 transition-colors hover:bg-muted sm:p-4"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <Icon aria-hidden="true" className="size-4" />
                      <span className="tabular text-[10px] text-muted-foreground">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                    </span>
                    <span className="mt-3 block text-xs font-semibold">
                      {group.name}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      {operationCount.toLocaleString()} working{' '}
                      {operationCount === 1 ? 'action' : 'actions'}
                    </span>
                  </a>
                );
              })}
            </nav>

            <div className="mt-5 space-y-4">
              {toolGroups.map((group, index) => {
                const Icon = groupIcons[group.id];
                const tools = toolsForGroup(group);
                const operationCount = tools.reduce(
                  (total, tool) => total + (tool.searchEntries?.length ?? 1),
                  0,
                );
                return (
                  <section
                    key={group.id}
                    aria-labelledby={`group-${group.id}`}
                    className={`scroll-mt-24 overflow-hidden rounded-2xl border ${
                      index % 2 === 0 ? 'bg-card' : 'bg-muted/30'
                    }`}
                  >
                    <div className="grid md:grid-cols-[220px_minmax(0,1fr)]">
                      <header className="border-b p-5 md:border-b-0 md:border-r md:p-6">
                        <div className="flex items-center justify-between">
                          <span className="grid size-10 place-items-center rounded-xl bg-foreground text-background">
                            <Icon aria-hidden="true" className="size-5" />
                          </span>
                          <span className="tabular text-3xl font-semibold tracking-[-0.06em] text-muted-foreground/50">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                        </div>
                        <div className="mt-5">
                          <h3
                            id={`group-${group.id}`}
                            className="text-lg font-semibold tracking-[-0.03em]"
                          >
                            {group.name}
                          </h3>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            {group.shortDescription}
                          </p>
                          <p className="tabular mt-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                            {operationCount.toLocaleString()} local actions
                          </p>
                        </div>
                      </header>
                      <div className="grid content-start gap-px bg-border sm:grid-cols-2">
                        {tools.map((tool) => (
                          <article key={tool.id} className="bg-background p-4">
                            <a
                              href={tool.href}
                              className="focus-ring group flex items-start justify-between gap-4 rounded-lg"
                            >
                              <span className="min-w-0">
                                <span className="block text-sm font-semibold">
                                  {tool.name}
                                </span>
                                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                                  {tool.shortDescription}
                                </span>
                              </span>
                              <ArrowRight
                                aria-hidden="true"
                                className="mt-0.5 size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
                              />
                            </a>
                            {tool.searchEntries?.length ? (
                              <div className="mt-3 flex flex-wrap gap-1.5 border-t pt-3">
                                {tool.searchEntries.slice(0, 3).map((entry) => (
                                  <a
                                    key={entry.id}
                                    href={entry.href}
                                    className="focus-ring rounded-md border bg-muted/50 px-2 py-1 text-[11px] font-medium hover:bg-muted"
                                  >
                                    {entry.name}
                                  </a>
                                ))}
                                {tool.searchEntries.length > 3 ? (
                                  <a
                                    href={tool.href}
                                    className="focus-ring rounded-md px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-muted"
                                  >
                                    +{tool.searchEntries.length - 3} more
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
                    </div>
                  </section>
                );
              })}
            </div>
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

          <footer className="mt-10 border-t py-6 text-xs leading-5 text-muted-foreground">
            Neutral working label · no approved public brand, analytics,
            account, or payment provider in this release candidate.
          </footer>
        </div>
      </section>
    </AppShell>
  );
}
