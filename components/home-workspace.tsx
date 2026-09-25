'use client';

import { LockKeyhole, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { destinationIcon } from '@/components/category-icons';
import { SmartDropzone } from '@/components/smart-dropzone';
import { ToolLinkCard } from '@/components/ui/tool-link-card';
import { CATEGORY_LINKS } from '@/lib/seo/category-hubs';
import {
  INITIAL_GROUP_ID,
  INITIAL_SECTIONS,
  loadBrowseSections,
  type BrowseSection,
} from '@/lib/tools/browse';
import { NAV_GROUPS, type NavGroupId } from '@/lib/tools/navigation';

export function HomeWorkspace() {
  const [selectedGroupId, setSelectedGroupId] =
    useState<NavGroupId>(INITIAL_GROUP_ID);
  const [filter, setFilter] = useState('');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const selectedGroup =
    NAV_GROUPS.find((group) => group.id === selectedGroupId) ?? NAV_GROUPS[0]!;

  // The default category's cards are in the prerendered HTML, so they have to
  // be present at the very first client render or React discards the page and
  // rebuilds it. That one is imported statically; the rest are fetched when
  // opened and kept, so going back to a category is instant. See
  // lib/tools/browse.ts.
  //
  // Derived rather than stored, so the effect never calls setState in its own
  // body -- that is `react-compiler/EffectSetState`, and it is a real warning
  // here rather than one to suppress: seeding state from a prop-like constant
  // and then re-setting it in an effect is exactly the cascading render it
  // describes.
  const [fetched, setFetched] = useState<
    Partial<Record<NavGroupId, readonly BrowseSection[]>>
  >({});
  const subsections =
    selectedGroupId === INITIAL_GROUP_ID
      ? INITIAL_SECTIONS
      : fetched[selectedGroupId];
  const loadingGroupId = subsections ? null : selectedGroupId;

  useEffect(() => {
    if (selectedGroupId === INITIAL_GROUP_ID || fetched[selectedGroupId])
      return;
    let cancelled = false;
    void loadBrowseSections(selectedGroupId).then((sections) => {
      if (cancelled) return;
      setFetched((previous) => ({ ...previous, [selectedGroupId]: sections }));
    });
    return () => {
      cancelled = true;
    };
  }, [selectedGroupId, fetched]);

  const normalizedFilter = filter.trim().toLocaleLowerCase();

  const filteredSubsections = useMemo(() => {
    if (!subsections) return [];
    if (!normalizedFilter) {
      return subsections.map((section) => ({
        ...section,
        visibleDestinations: section.destinations,
      }));
    }
    return subsections
      .map((section) => ({
        ...section,
        visibleDestinations: section.destinations.filter((tool) =>
          `${tool.name} ${tool.description}`
            .toLocaleLowerCase()
            .includes(normalizedFilter),
        ),
      }))
      .filter((section) => section.visibleDestinations.length > 0);
  }, [subsections, normalizedFilter]);

  const totalVisibleCount = useMemo(
    () =>
      filteredSubsections.reduce(
        (sum, section) => sum + section.visibleDestinations.length,
        0,
      ),
    [filteredSubsections],
  );

  useEffect(() => {
    const readCategory = () => {
      const candidate = new URLSearchParams(window.location.search).get(
        'category',
      );
      setSelectedGroupId(
        NAV_GROUPS.find((group) => group.id === candidate)?.id ??
          INITIAL_GROUP_ID,
      );
      setFilter('');
    };
    readCategory();
    window.addEventListener('popstate', readCategory);
    return () => window.removeEventListener('popstate', readCategory);
  }, []);

  const selectCategory = (groupId: NavGroupId) => {
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
            <span className="flex items-center gap-2 rounded-full border bg-muted/30 px-3.5 py-2 text-sm text-foreground transition-all duration-[var(--motion-standard)] ease-[var(--motion-ease)] hover:bg-muted hover:border-foreground/30 select-none">
              <LockKeyhole
                aria-hidden="true"
                className="size-4 text-muted-foreground"
              />
              On-device tools
            </span>
          </div>

          {/* Smart Universal Auto-Detector Dropzone */}
          <div className="mt-8">
            <SmartDropzone />
          </div>

          {/*
            The crawlable twin of the category switcher in the top bar.

            That switcher calls `selectCategory`, which is
            `history.pushState('/?category=' + id)` — no navigation, no `href`,
            and therefore nothing for a crawler to follow. Measured 2026-09-25:
            this page carried 22 links to tool pages out of 1,335, and every
            tool outside /pdf sat four or more clicks from the front page.

            These 21 links are real `<a href>` in the prerendered HTML, one per
            category hub, so the whole catalogue is two clicks deep. The
            switcher stays exactly as it is: it is the faster way to browse for
            someone who is already here.
          */}
          <nav aria-label="Tool categories" className="mt-8">
            <h2 className="text-sm font-semibold text-foreground">
              Browse every category
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {CATEGORY_LINKS.map((category) => (
                <li key={category.route}>
                  <a
                    href={category.route}
                    className="focus-ring inline-flex min-h-9 items-center rounded-lg border bg-background px-3 text-sm font-medium transition-colors hover:border-foreground/30"
                  >
                    {category.name}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="my-6 flex flex-wrap items-center justify-between gap-4">
            <output className="text-sm text-muted-foreground">
              {loadingGroupId
                ? `${selectedGroup.destinationCount} tools · loading`
                : `${totalVisibleCount} ${totalVisibleCount === 1 ? 'tool' : 'tools'}${
                    filter
                      ? ` matching “${filter}”`
                      : ' · Choose a task to begin'
                  }`}
            </output>
            <div className="relative w-full sm:w-72">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground transition-colors"
              />
              <input
                type="search"
                aria-label={`Filter ${selectedGroup.name} tools`}
                placeholder="Find a tool in this category"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                className="focus-ring h-11 w-full rounded-lg border bg-background pl-9 pr-3 text-sm transition-all duration-[var(--motion-standard)] ease-[var(--motion-ease)] hover:border-foreground/30 focus:border-foreground/50"
              />
            </div>
          </div>
          <div data-design="equal-tool-hierarchy" className="space-y-10">
            {loadingGroupId
              ? null
              : filteredSubsections.map((section) => (
                  <div key={section.id} className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                      <div>
                        <h2 className="text-lg font-semibold tracking-tight text-foreground">
                          {section.title}
                        </h2>
                        <p className="text-xs text-muted-foreground">
                          {section.description}
                        </p>
                      </div>
                      <span className="tabular rounded-md border bg-muted/40 px-2 py-0.5 text-xs font-mono text-muted-foreground">
                        {section.visibleDestinations.length}{' '}
                        {section.visibleDestinations.length === 1
                          ? 'tool'
                          : 'tools'}
                      </span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {section.visibleDestinations.map((tool) => (
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
                  </div>
                ))}
          </div>
          {loadingGroupId ? (
            <div
              className="rounded-xl border border-dashed p-8"
              aria-live="polite"
            >
              <h2 className="text-lg font-semibold">
                Loading {selectedGroup.name}…
              </h2>
              <p className="mt-2 text-base text-muted-foreground">
                {selectedGroup.destinationCount} tools, fetched only when you
                open the category.
              </p>
            </div>
          ) : null}
          {!loadingGroupId && !totalVisibleCount ? (
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
          {/*
            The one differentiator this site has over every free competitor is
            that the file never leaves the tab — and until /proof existed it was
            asserted in this footer and nowhere else, with nothing to click. The
            four pages that carry the evidence now hang off it.
          */}
          <footer className="mt-12 flex flex-col gap-3 border-t pt-5 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <p>
              No account needed. Downloads are free. Files are processed in your
              browser.
            </p>
            <nav className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <a
                href="/proof"
                className="focus-ring font-semibold text-foreground underline underline-offset-4"
              >
                See the proof
              </a>
              <a
                href="/privacy"
                className="focus-ring underline underline-offset-4 hover:text-foreground"
              >
                Privacy
              </a>
              <a
                href="/security"
                className="focus-ring underline underline-offset-4 hover:text-foreground"
              >
                Security
              </a>
              <a
                href="/about"
                className="focus-ring underline underline-offset-4 hover:text-foreground"
              >
                About
              </a>
              {/*
                The comparison pages are reachable from here because an orphan
                page earns nothing: this footer is on the most-linked page on
                the site, so it is where their crawl path starts.
              */}
              <a
                href="/compare/browser-based-vs-cloud-file-tools"
                className="focus-ring underline underline-offset-4 hover:text-foreground"
              >
                In your browser vs in the cloud
              </a>
            </nav>
          </footer>
        </div>
      </section>
    </AppShell>
  );
}
