'use client';

/* oxlint-disable jsx-a11y/prefer-tag-over-role -- A styled WAI-ARIA combobox requires a popup listbox; native select/datalist cannot provide this search-and-navigation interaction. */
/* oxlint-disable jsx-a11y/no-noninteractive-element-interactions -- The modal category drawer listens for Tab only to keep keyboard focus inside its active dialog boundary. */

import {
  ArrowLeft,
  Braces,
  BriefcaseBusiness,
  Calculator,
  ChevronRight,
  FileText,
  FlaskConical,
  FileStack,
  Grid2X2,
  Globe2,
  Image as ImageIcon,
  Landmark,
  Menu,
  Moon,
  Megaphone,
  QrCode,
  Search,
  Sun,
  Type,
  X,
} from 'lucide-react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { CompletionValueDialog } from '@/components/completion-value-dialog';
import {
  searchTools,
  toolGroups,
  toolsForGroup,
  type ToolGroup,
} from '@/lib/tools/catalog';
import { moveSearchSelection } from '@/lib/tools/search-navigation';

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

export function AppShell({
  currentToolId,
  currentGroupId,
  children,
}: {
  currentToolId: string;
  currentGroupId?: ToolGroup['id'];
  children: ReactNode;
}) {
  const searchRef = useRef<HTMLInputElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const firstCategoryRef = useRef<HTMLButtonElement>(null);
  const drawerBackRef = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState('');
  const [activeResultIndex, setActiveResultIndex] = useState(-1);
  const [isDark, setIsDark] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [drawerGroupId, setDrawerGroupId] = useState<ToolGroup['id']>();
  const results = useMemo(() => searchTools(query), [query]);
  const searchOpen = query.length > 0;
  const activeResult =
    activeResultIndex >= 0 ? results[activeResultIndex] : undefined;

  useEffect(() => {
    const themeFrame = requestAnimationFrame(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });

    const focusSearch = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      if (
        (event.key === '/' && !isTyping) ||
        (event.key.toLocaleLowerCase() === 'k' &&
          (event.metaKey || event.ctrlKey))
      ) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };

    window.addEventListener('keydown', focusSearch);
    return () => {
      cancelAnimationFrame(themeFrame);
      window.removeEventListener('keydown', focusSearch);
    };
  }, []);

  useEffect(() => {
    if (!sidebarOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusFrame = requestAnimationFrame(() => {
      if (drawerGroupId) drawerBackRef.current?.focus();
      else firstCategoryRef.current?.focus();
    });
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setSidebarOpen(false);
      setDrawerGroupId(undefined);
      menuButtonRef.current?.focus();
    };

    window.addEventListener('keydown', closeOnEscape);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [drawerGroupId, sidebarOpen]);

  const activeGroupId =
    currentGroupId ??
    toolGroups.find((group) => group.toolIds.includes(currentToolId))?.id;
  const drawerGroup = toolGroups.find((group) => group.id === drawerGroupId);

  const closeSidebar = () => {
    setSidebarOpen(false);
    setDrawerGroupId(undefined);
    menuButtonRef.current?.focus();
  };

  const toggleTheme = () => {
    const next = !isDark;
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('tools-theme', next ? 'dark' : 'light');
    } catch {
      // Storage can be unavailable in hardened/private browsing contexts.
    }
    setIsDark(next);
  };

  const handleSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape' && searchOpen) {
      event.preventDefault();
      setQuery('');
      setActiveResultIndex(-1);
      return;
    }

    if (!results.length) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveResultIndex((current) =>
        moveSearchSelection(current, results.length, 'next'),
      );
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveResultIndex((current) =>
        moveSearchSelection(current, results.length, 'previous'),
      );
    } else if (event.key === 'Enter' && activeResult) {
      event.preventDefault();
      window.location.assign(activeResult.href);
    }
  };

  const handleDrawerKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Tab') return;
    const focusable = Array.from(
      drawerRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      ) ?? [],
    );
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <CompletionValueDialog />
      <a
        href="#tool"
        className="focus-ring fixed left-3 top-3 z-[70] -translate-y-20 rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background focus:translate-y-0"
      >
        Skip to tool
      </a>

      <header className="sticky top-0 z-[60] border-b bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-2 px-3 sm:gap-4 sm:px-6 lg:px-8">
          <a
            href="/"
            className="focus-ring flex shrink-0 items-center gap-2 rounded-lg"
          >
            <span className="grid size-8 place-items-center rounded-lg bg-foreground text-background">
              <Grid2X2 aria-hidden="true" className="size-4" />
            </span>
            <span className="hidden text-[15px] font-semibold tracking-[-0.02em] sm:inline">
              Tools
            </span>
          </a>

          <div className="relative mx-auto w-full max-w-xl">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              ref={searchRef}
              type="search"
              role="combobox"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveResultIndex(-1);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder="What do you need to do?"
              aria-label="Search tools"
              aria-autocomplete="list"
              aria-controls="tool-search-results"
              aria-expanded={searchOpen}
              aria-activedescendant={
                activeResult
                  ? `tool-search-result-${activeResult.resultId ?? activeResult.id}`
                  : undefined
              }
              className="focus-ring h-11 w-full rounded-xl border bg-muted/70 pl-10 pr-16 text-sm placeholder:text-muted-foreground"
            />
            <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border bg-background px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground sm:block">
              ⌘K
            </kbd>
            {query ? (
              <div
                id="tool-search-results"
                role="listbox"
                aria-label="Matching tools"
                className="absolute inset-x-0 top-[calc(100%+8px)] rounded-xl border bg-popover p-2 shadow-[0_18px_50px_rgb(0_0_0/10%)]"
              >
                {results.length ? (
                  results.map((tool, index) => (
                    <a
                      key={tool.resultId ?? tool.id}
                      id={`tool-search-result-${tool.resultId ?? tool.id}`}
                      href={tool.href}
                      role="option"
                      aria-selected={activeResultIndex === index}
                      onFocus={() => setActiveResultIndex(index)}
                      onMouseEnter={() => setActiveResultIndex(index)}
                      className="focus-ring flex w-full items-center justify-between rounded-lg px-3 py-3 text-left hover:bg-muted aria-selected:bg-muted"
                    >
                      <span>
                        <span className="block text-sm font-semibold">
                          {tool.name}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {tool.shortDescription}
                        </span>
                      </span>
                      <span className="ml-4 rounded-full border px-2 py-1 text-[11px] font-medium">
                        On-device
                      </span>
                    </a>
                  ))
                ) : (
                  <div className="px-3 py-4">
                    <p className="text-sm font-medium">
                      No working tool matches yet.
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Only tested canary tools appear in this preview.
                    </p>
                  </div>
                )}
              </div>
            ) : null}
            <p className="sr-only" aria-live="polite">
              {query
                ? `${results.length} working ${results.length === 1 ? 'tool' : 'tools'} found.`
                : ''}
            </p>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 shrink-0 rounded-lg"
            onClick={toggleTheme}
            aria-label={isDark ? 'Use light theme' : 'Use dark theme'}
          >
            {isDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
          </Button>
          <Button
            ref={menuButtonRef}
            variant="ghost"
            size="icon"
            className="h-11 w-11 shrink-0 rounded-lg border"
            onClick={() => {
              if (sidebarOpen) closeSidebar();
              else {
                setDrawerGroupId(undefined);
                setSidebarOpen(true);
              }
            }}
            aria-label={
              sidebarOpen ? 'Close tool categories' : 'Open tool categories'
            }
            aria-controls="tool-category-drawer"
            aria-expanded={sidebarOpen}
          >
            {sidebarOpen ? (
              <X aria-hidden="true" />
            ) : (
              <Menu aria-hidden="true" />
            )}
          </Button>
        </div>
      </header>

      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={closeSidebar}
        className={`fixed inset-x-0 bottom-0 top-16 z-40 bg-foreground/18 backdrop-blur-[2px] transition-opacity duration-200 ${
          sidebarOpen
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        ref={drawerRef}
        id="tool-category-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tool-category-drawer-title"
        aria-hidden={!sidebarOpen}
        inert={!sidebarOpen}
        tabIndex={-1}
        onKeyDown={handleDrawerKeyDown}
        className={`fixed bottom-0 right-0 top-16 z-50 w-[min(28rem,calc(100vw-1rem))] overflow-y-auto border-l bg-background shadow-[-18px_0_50px_rgb(0_0_0/12%)] transition-transform duration-200 ease-out ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b px-5 py-5">
          {drawerGroup ? (
            <div className="flex min-w-0 items-start gap-3">
              <Button
                ref={drawerBackRef}
                variant="ghost"
                size="icon"
                className="size-10 shrink-0 rounded-lg border"
                onClick={() => setDrawerGroupId(undefined)}
                aria-label="Back to all categories"
              >
                <ArrowLeft aria-hidden="true" />
              </Button>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Category
                </p>
                <h2
                  id="tool-category-drawer-title"
                  className="mt-1 truncate text-base font-semibold"
                >
                  {drawerGroup.name}
                </h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {drawerGroup.shortDescription}
                </p>
              </div>
            </div>
          ) : (
            <div>
              <p
                id="tool-category-drawer-title"
                className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
              >
                Tool groups
              </p>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">
                Select a category to open its tools and subtools.
              </p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-10 shrink-0 rounded-lg border"
            onClick={closeSidebar}
            aria-label="Close tool categories"
          >
            <X aria-hidden="true" />
          </Button>
        </div>

        {drawerGroup ? (
          <nav
            aria-label={`${drawerGroup.name} tools`}
            className="space-y-3 p-3"
          >
            {toolsForGroup(drawerGroup).map((tool) => (
              <section
                key={tool.id}
                aria-labelledby={`drawer-tool-${tool.id}`}
                className="overflow-hidden rounded-lg border"
              >
                <a
                  href={tool.href}
                  className="focus-ring group flex min-h-14 items-center justify-between gap-3 bg-card px-4 py-3"
                >
                  <span className="min-w-0">
                    <span
                      id={`drawer-tool-${tool.id}`}
                      className="block text-sm font-semibold"
                    >
                      {tool.name}
                    </span>
                    <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                      {tool.shortDescription}
                    </span>
                  </span>
                  <ChevronRight
                    aria-hidden="true"
                    className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
                  />
                </a>
                {tool.searchEntries?.length ? (
                  <div className="border-t bg-background p-2">
                    {tool.searchEntries.map((entry) => (
                      <a
                        key={entry.id}
                        href={entry.href}
                        className="focus-ring flex min-h-10 items-center justify-between gap-3 rounded-md px-2.5 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <span>{entry.name}</span>
                        <ChevronRight
                          aria-hidden="true"
                          className="size-3.5 shrink-0"
                        />
                      </a>
                    ))}
                  </div>
                ) : null}
              </section>
            ))}
          </nav>
        ) : (
          <nav aria-label="Tool categories" className="space-y-1 p-3">
            {toolGroups.map((group, index) => {
              const Icon = groupIcons[group.id];
              const active = group.id === activeGroupId;
              const actionCount = toolsForGroup(group).reduce(
                (total, tool) => total + (tool.searchEntries?.length ?? 1),
                0,
              );
              return (
                <button
                  ref={index === 0 ? firstCategoryRef : undefined}
                  key={group.id}
                  type="button"
                  onClick={() => setDrawerGroupId(group.id)}
                  aria-label={`Open ${group.name}, ${actionCount} working actions`}
                  className={`focus-ring group flex min-h-12 w-full items-center justify-between gap-3 rounded-lg px-3 text-left text-sm font-semibold transition-colors ${
                    active
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="tabular w-5 shrink-0 font-mono text-[10px] opacity-60">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <Icon aria-hidden="true" className="size-4 shrink-0" />
                    <span className="truncate">{group.name}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span
                      className={`tabular rounded-md border px-1.5 py-0.5 font-mono text-[10px] ${
                        active
                          ? 'border-background/25 text-background'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {actionCount}
                    </span>
                    <ChevronRight aria-hidden="true" className="size-4" />
                  </span>
                </button>
              );
            })}
          </nav>
        )}
      </aside>

      <main className="mx-auto max-w-[1440px]">{children}</main>
    </div>
  );
}
