'use client';

/* oxlint-disable jsx-a11y/prefer-tag-over-role -- A styled WAI-ARIA combobox requires a popup listbox; native select/datalist cannot provide this search-and-navigation interaction. */

import {
  CheckCircle2,
  Braces,
  BriefcaseBusiness,
  CalendarDays,
  Calculator,
  Database,
  FileKey2,
  FileText,
  FlaskConical,
  FileStack,
  Grid2X2,
  Globe2,
  Image as ImageIcon,
  Landmark,
  Moon,
  Megaphone,
  QrCode,
  Search,
  Sun,
  Type,
} from 'lucide-react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { searchTools, toolGroups, toolsForGroup } from '@/lib/tools/catalog';
import { moveSearchSelection } from '@/lib/tools/search-navigation';

const categoryIcons = {
  Text: Type,
  PDF: FileStack,
  Data: Database,
  Image: ImageIcon,
  Developer: Braces,
  File: FileKey2,
  Math: Calculator,
  Date: CalendarDays,
  Web: Globe2,
  Creator: Megaphone,
  Document: FileText,
  Science: FlaskConical,
  Finance: BriefcaseBusiness,
  'Life Admin': Landmark,
  'QR & Barcode': QrCode,
};

export function AppShell({
  currentToolId,
  children,
}: {
  currentToolId: string;
  children: ReactNode;
}) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [activeResultIndex, setActiveResultIndex] = useState(-1);
  const [isDark, setIsDark] = useState(false);
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

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#tool"
        className="focus-ring fixed left-3 top-3 z-50 -translate-y-20 rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background focus:translate-y-0"
      >
        Skip to tool
      </a>

      <header className="sticky top-0 z-40 border-b bg-background/92 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-4 px-4 sm:px-6 lg:px-8">
          <a
            href="/"
            className="focus-ring flex shrink-0 items-center gap-2 rounded-lg"
          >
            <span className="grid size-8 place-items-center rounded-lg bg-foreground text-background">
              <Grid2X2 aria-hidden="true" className="size-4" />
            </span>
            <span className="text-[15px] font-semibold tracking-[-0.02em]">
              Tools
            </span>
            <span className="hidden rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground sm:inline">
              Preview
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
            className="h-11 w-11 rounded-xl"
            onClick={toggleTheme}
            aria-label={isDark ? 'Use light theme' : 'Use dark theme'}
          >
            {isDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
          </Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1440px] grid-cols-1 lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="hidden min-h-[calc(100vh-64px)] border-r px-5 py-8 lg:block">
          <nav aria-label="Working tools">
            <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Tool workspaces
            </p>
            <div className="mt-4 space-y-5">
              {toolGroups.map((group) => (
                <section key={group.id} aria-labelledby={`nav-${group.id}`}>
                  <h2
                    id={`nav-${group.id}`}
                    className="px-2 text-[11px] font-semibold text-foreground"
                  >
                    {group.name}
                  </h2>
                  <div className="mt-1 space-y-0.5">
                    {toolsForGroup(group).map((tool) => {
                      const active = tool.id === currentToolId;
                      const Icon = categoryIcons[tool.category];
                      return (
                        <a
                          key={tool.id}
                          href={tool.href}
                          aria-label={tool.name}
                          aria-current={active ? 'page' : undefined}
                          className={`focus-ring flex items-center gap-2 rounded-lg px-2 py-2 text-[13px] font-medium ${
                            active
                              ? 'bg-foreground text-background'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          }`}
                        >
                          <Icon
                            aria-hidden="true"
                            className="size-3.5 shrink-0"
                          />
                          <span className="truncate">
                            {tool.name.replace(' converter', '')}
                          </span>
                        </a>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>

            <p className="mt-8 px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Release-candidate status
            </p>
            <div className="mt-3 space-y-2 px-2 text-xs text-muted-foreground">
              <p className="flex items-center gap-2">
                <CheckCircle2
                  aria-hidden="true"
                  className="size-4 text-success"
                />
                Manifest shell
              </p>
              <p className="flex items-center gap-2">
                <CheckCircle2
                  aria-hidden="true"
                  className="size-4 text-success"
                />
                Local text/data engines
              </p>
              <p className="flex items-center gap-2">
                <CheckCircle2
                  aria-hidden="true"
                  className="size-4 text-success"
                />
                PDF worker + image pipeline
              </p>
            </div>
          </nav>
        </aside>

        {children}
      </main>
    </div>
  );
}
