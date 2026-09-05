import {
  ArrowRight,
  Braces,
  CalendarDays,
  Calculator,
  Database,
  FileKey2,
  FileStack,
  Image as ImageIcon,
  LockKeyhole,
  Search,
  Type,
  Workflow,
} from 'lucide-react';

import { AppShell } from '@/components/app-shell';
import { publicTools } from '@/lib/tools/catalog';

const toolIcons = {
  Text: Type,
  PDF: FileStack,
  Data: Database,
  Image: ImageIcon,
  Developer: Braces,
  File: FileKey2,
  Math: Calculator,
  Date: CalendarDays,
};

export function HomeWorkspace() {
  return (
    <AppShell currentToolId="">
      <section
        id="tool"
        className="min-w-0 px-4 py-8 sm:px-8 lg:px-12 lg:py-12"
      >
        <div className="mx-auto max-w-5xl">
          <div className="border-b pb-10">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Local-first utility workspace
            </p>
            <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">
              Small jobs. One private workspace.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Find the right tool, finish the task, and keep moving. Working
              canaries process content in your browser with no account or output
              gate. This candidate deliberately ships a small, testable set
              instead of thousands of placeholder pages.
            </p>
          </div>

          <section aria-labelledby="working-tools-heading" className="mt-8">
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

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {publicTools.map((tool) => {
                const Icon = toolIcons[tool.category];
                return (
                  <a
                    key={tool.id}
                    href={tool.href}
                    className="focus-ring group rounded-2xl border bg-card p-5 transition-colors hover:bg-muted/60 sm:p-6"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <span className="grid size-11 place-items-center rounded-xl border bg-muted">
                        <Icon aria-hidden="true" className="size-5" />
                      </span>
                      <span className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold">
                        <LockKeyhole aria-hidden="true" className="size-3" />
                        On-device
                      </span>
                    </div>
                    <h3 className="mt-8 text-xl font-semibold tracking-[-0.03em]">
                      {tool.name}
                    </h3>
                    <p className="mt-2 min-h-12 text-sm leading-6 text-muted-foreground">
                      {tool.shortDescription}
                    </p>
                    <span className="mt-6 flex items-center gap-2 text-sm font-semibold">
                      Open tool
                      <ArrowRight
                        aria-hidden="true"
                        className="size-4 transition-transform group-hover:translate-x-0.5"
                      />
                    </span>
                  </a>
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
