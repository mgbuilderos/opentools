'use client';

import { LockKeyhole, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { destinationIcon } from '@/components/category-icons';
import { ToolLinkCard } from '@/components/ui/tool-link-card';
import {
  toolDestinationsForGroup,
  toolGroups,
  type ToolGroup,
} from '@/lib/tools/catalog';

export function HomeWorkspace() {
  const [selectedGroupId, setSelectedGroupId] =
    useState<ToolGroup['id']>('pdf');
  const [filter, setFilter] = useState('');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const selectedGroup =
    toolGroups.find((group) => group.id === selectedGroupId) ?? toolGroups[0];
  const destinations = useMemo(
    () => toolDestinationsForGroup(selectedGroup),
    [selectedGroup],
  );
  const visible = destinations.filter((tool) =>
    `${tool.name} ${tool.description}`
      .toLocaleLowerCase()
      .includes(filter.trim().toLocaleLowerCase()),
  );

  useEffect(() => {
    const readCategory = () => {
      const candidate = new URLSearchParams(window.location.search).get(
        'category',
      );
      setSelectedGroupId(
        toolGroups.find((group) => group.id === candidate)?.id ?? 'pdf',
      );
      setFilter('');
    };
    readCategory();
    window.addEventListener('popstate', readCategory);
    return () => window.removeEventListener('popstate', readCategory);
  }, []);

  const selectCategory = (groupId: ToolGroup['id']) => {
    setSelectedGroupId(groupId);
    setFilter('');
    if (groupId !== selectedGroupId)
      window.history.pushState(null, '', `/?category=${groupId}`);
    requestAnimationFrame(() => {
      headingRef.current?.focus();
      headingRef.current?.scrollIntoView({ block: 'start' });
    });
  };

  return (
    <AppShell
      currentToolId="home"
      currentGroupId={selectedGroup.id}
      onCategorySelect={selectCategory}
    >
      <section
        id="tool"
        tabIndex={-1}
        className="focus-ring min-h-[calc(100vh-4rem)] px-5 py-8 sm:px-8 lg:px-12 lg:py-12"
      >
        <div className="mx-auto max-w-6xl">
          <p className="text-sm text-muted-foreground">Your everyday toolkit</p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-5 border-b pb-7">
            <div>
              <h1
                ref={headingRef}
                tabIndex={-1}
                className="focus-ring scroll-mt-24 rounded text-3xl font-semibold tracking-[-0.04em] sm:text-4xl"
              >
                {selectedGroup.name} tools
              </h1>
              <p className="mt-3 max-w-xl text-base leading-7 text-muted-foreground">
                {selectedGroup.shortDescription}
              </p>
            </div>
            <span className="flex items-center gap-2 rounded-full border px-3 py-2 text-sm">
              <LockKeyhole aria-hidden="true" className="size-4" />
              On-device tools
            </span>
          </div>
          <div className="my-6 flex flex-wrap items-center justify-between gap-4">
            <output className="text-sm text-muted-foreground">
              {visible.length} {visible.length === 1 ? 'tool' : 'tools'}
              {filter ? ` matching “${filter}”` : ' · Choose a task to begin'}
            </output>
            <div className="relative w-full sm:w-72">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground"
              />
              <input
                type="search"
                aria-label={`Filter ${selectedGroup.name} tools`}
                placeholder="Find a tool in this category"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                className="focus-ring h-11 w-full rounded-lg border bg-background pl-9 pr-3 text-sm"
              />
            </div>
          </div>
          <div
            data-design="equal-tool-hierarchy"
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
          >
            {visible.map((tool) => (
              <ToolLinkCard
                key={tool.id}
                name={tool.name}
                description={tool.description}
                href={tool.href}
                icon={destinationIcon(tool, selectedGroup.id)}
                className="min-h-36 items-start [&>span]:items-start [&>span>span:last-child>span:first-child]:text-base [&>span>span:last-child>span:last-child]:text-sm"
              />
            ))}
          </div>
          {!visible.length ? (
            <div className="rounded-xl border border-dashed p-8">
              <h2 className="text-lg font-semibold">
                No matching tool in {selectedGroup.name}
              </h2>
              <p className="mt-2 text-base text-muted-foreground">
                Try a shorter name, or search all tools in the top bar.
              </p>
              <button
                type="button"
                onClick={() => setFilter('')}
                className="focus-ring mt-4 min-h-11 rounded-lg border px-4 text-sm font-semibold"
              >
                Clear filter
              </button>
            </div>
          ) : null}
          <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t pt-5 text-sm text-muted-foreground">
            <p>No account needed. Downloads are free.</p>
            <p>Files are processed in your browser.</p>
          </footer>
        </div>
      </section>
    </AppShell>
  );
}
