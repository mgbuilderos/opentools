import {
  ArrowRight,
  Braces,
  Calculator,
  FileStack,
  Image as ImageIcon,
  LockKeyhole,
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
};

export function HomeWorkspace() {
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
                {publicTools.length} working tools
              </span>
            </div>

            <div className="mt-4 grid items-start gap-3 lg:grid-cols-2">
              {toolGroups.map((group) => {
                const Icon = groupIcons[group.id];
                const tools = toolsForGroup(group);
                return (
                  <section
                    key={group.id}
                    aria-labelledby={`group-${group.id}`}
                    className="overflow-hidden rounded-xl border bg-card"
                  >
                    <div className="flex items-start justify-between gap-4 border-b bg-muted/40 px-4 py-3.5">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="grid size-8 shrink-0 place-items-center rounded-lg border bg-background">
                          <Icon aria-hidden="true" className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <h3
                            id={`group-${group.id}`}
                            className="text-sm font-semibold"
                          >
                            {group.name}
                          </h3>
                          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                            {group.shortDescription}
                          </p>
                        </div>
                      </div>
                      <span className="tabular shrink-0 rounded-full border bg-background px-2 py-1 text-[11px] font-semibold">
                        {tools.length}
                      </span>
                    </div>
                    <div className="divide-y">
                      {tools.map((tool) => (
                        <a
                          key={tool.id}
                          href={tool.href}
                          className="focus-ring group flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-muted/55"
                        >
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold">
                              {tool.name}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                              {tool.shortDescription}
                            </span>
                          </span>
                          <span className="flex shrink-0 items-center gap-2 text-xs font-semibold">
                            <LockKeyhole
                              aria-hidden="true"
                              className="size-3"
                            />
                            <ArrowRight
                              aria-hidden="true"
                              className="size-3.5 transition-transform group-hover:translate-x-0.5"
                            />
                          </span>
                        </a>
                      ))}
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
