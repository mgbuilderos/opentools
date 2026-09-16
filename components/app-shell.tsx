/* oxlint-disable */
'use client';

/* oxlint-disable jsx-a11y/prefer-tag-over-role -- A styled WAI-ARIA combobox requires a popup listbox; native select/datalist cannot provide this search-and-navigation interaction. */
/* oxlint-disable jsx-a11y/no-noninteractive-element-interactions -- The modal category drawer listens for Tab only to keep keyboard focus inside its active dialog boundary. */

import {
  Grid2X2,
  Menu,
  Moon,
  Search,
  Star,
  Sun,
  X,
  PanelLeftClose,
} from 'lucide-react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { groupIcons } from '@/components/category-icons';
import { CompletionValueDialog } from '@/components/completion-value-dialog';
import { SUPPORT_CONFIG } from '@/lib/support-config';
import {
  searchTools,
  toolDestinationsForGroup,
  toolGroups,
  type ToolGroup,
} from '@/lib/tools/catalog';
import { moveSearchSelection } from '@/lib/tools/search-navigation';
import { MilestoneModal } from './milestone-modal';
import { ReviewModal } from './review-modal';

export function AppShell({
  currentToolId,
  currentGroupId,
  children,
  onCategorySelect,
}: {
  currentToolId: string;
  currentGroupId?: ToolGroup['id'];
  children: ReactNode;
  onCategorySelect?: (groupId: ToolGroup['id']) => void;
}) {
  const searchRef = useRef<HTMLInputElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const mobileDialogRef = useRef<HTMLDialogElement>(null);
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [desktop, setDesktop] = useState(false);
  const [query, setQuery] = useState('');
  const [activeResultIndex, setActiveResultIndex] = useState(-1);
  const [isDark, setIsDark] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [domainLocked, setDomainLocked] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      if (
        host !== 'localhost' &&
        host !== '127.0.0.1' &&
        host !== 'getopentools.com'
      ) {
        setDomainLocked(true);
      }
    }
  }, []);

  useEffect(() => {
    const handleDownload = () => setReviewOpen(true);
    window.addEventListener('tool-downloaded', handleDownload);
    return () => window.removeEventListener('tool-downloaded', handleDownload);
  }, []);

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
    const media = window.matchMedia('(min-width: 1024px)');
    const sync = () => {
      setDesktop(media.matches);
      setSidebarOpen(false);
    };
    sync();
    media.addEventListener('change', sync);
    return () => {
      media.removeEventListener('change', sync);
      if (collapseTimer.current) clearTimeout(collapseTimer.current);
    };
  }, []);

  useEffect(() => {
    if (desktop || !sidebarOpen) return;
    const dialog = mobileDialogRef.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
    };
  }, [desktop, sidebarOpen]);

  const activeGroupId =
    currentGroupId ??
    toolGroups.find((group) => group.toolIds.includes(currentToolId))?.id;

  if (domainLocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4 text-center">
        <div>
          <h1 className="text-xl font-semibold mb-2 text-destructive">
            Unauthorized Domain
          </h1>
          <p className="text-muted-foreground">
            This tool is only authorized to run on getopentools.com.
          </p>
        </div>
      </div>
    );
  }
  const closeSidebar = () => {
    if (collapseTimer.current) clearTimeout(collapseTimer.current);
    setSidebarOpen(false);
    menuButtonRef.current?.focus();
  };
  const expandSidebar = () => {
    if (collapseTimer.current) clearTimeout(collapseTimer.current);
    setSidebarOpen(true);
  };
  const scheduleCollapse = () => {
    if (collapseTimer.current) clearTimeout(collapseTimer.current);
    collapseTimer.current = setTimeout(() => {
      if (!drawerRef.current?.contains(document.activeElement))
        setSidebarOpen(false);
    }, 450);
  };
  const categoryNavigation = (
    <nav aria-label="Tool categories" className="space-y-1 p-3">
      {toolGroups.map((group) => {
        const Icon = groupIcons[group.id];
        return (
          <a
            key={group.id}
            href={`/?category=${group.id}`}
            title={group.name}
            aria-current={group.id === activeGroupId ? 'page' : undefined}
            onClick={(event) => {
              if (
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
              )
                return;
              if (onCategorySelect) {
                event.preventDefault();
                onCategorySelect(group.id);
              }
              setSidebarOpen(false);
            }}
            className="category-link group focus-ring flex min-h-11 items-center gap-4 overflow-hidden rounded-lg px-3 text-sm font-medium text-muted-foreground transition-all duration-[var(--motion-standard)] ease-[var(--motion-ease)] hover:bg-muted/80 hover:text-foreground hover:translate-x-1 active:translate-x-0 active:scale-[0.98] aria-[current=page]:bg-foreground aria-[current=page]:text-background aria-[current=page]:hover:translate-x-0 motion-reduce:transform-none"
          >
            <Icon
              aria-hidden="true"
              className="size-5 shrink-0 transition-transform duration-[var(--motion-standard)] ease-[var(--motion-ease)] group-hover:scale-110 group-aria-[current=page]:scale-100 motion-reduce:transform-none"
            />
            <span className="category-label flex min-w-0 flex-1 items-center justify-between gap-2 whitespace-nowrap">
              {group.name}
              <span className="tabular text-xs opacity-60 transition-opacity duration-[var(--motion-standard)] group-hover:opacity-100">
                {toolDestinationsForGroup(group).length}
              </span>
            </span>
          </a>
        );
      })}
    </nav>
  );

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
      <CompletionValueDialog />
      <a
        href="#tool"
        className="focus-ring fixed left-3 top-3 z-[70] -translate-y-20 rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background focus:translate-y-0"
      >
        Skip to tool
      </a>

      <header className="sticky top-0 z-[60] border-b bg-background/95 backdrop-blur-xl">
        {/* Unified Trust & Privacy Ribbon */}
        <aside
          aria-label="Trust and privacy guarantees"
          className="border-b bg-muted/40 text-[11px] text-muted-foreground"
        >
          <div className="mx-auto flex h-7 max-w-[1440px] items-center overflow-hidden px-3 sm:px-6 lg:px-8">
            <div className="animate-ticker flex items-center gap-6 whitespace-nowrap select-none font-medium">
              {[0, 1].map((copyIndex) => (
                <div
                  key={copyIndex}
                  className="flex items-center gap-6 shrink-0"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <span aria-hidden="true">🔒</span>
                    <span>Your Files Never Leave Your Device</span>
                  </span>
                  <span className="opacity-40" aria-hidden="true">
                    ·
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span aria-hidden="true">🛡️</span>
                    <span>100% Private &amp; Offline-Ready</span>
                  </span>
                  <span className="opacity-40" aria-hidden="true">
                    ·
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span aria-hidden="true">⚡</span>
                    <span>Zero Server Uploads</span>
                  </span>
                  <span className="opacity-40" aria-hidden="true">
                    ·
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span aria-hidden="true">🚫</span>
                    <span>No Signups · No Paywalls · No Ads</span>
                  </span>
                  <span className="opacity-40" aria-hidden="true">
                    ·
                  </span>
                  <a
                    href={SUPPORT_CONFIG.githubRepoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
                  >
                    <span aria-hidden="true">⚖️</span>
                    <span>Free &amp; Open Source (MIT)</span>
                  </a>
                  <span className="opacity-40" aria-hidden="true">
                    ·
                  </span>
                  <a
                    href={SUPPORT_CONFIG.githubRepoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-foreground hover:underline"
                  >
                    <Star aria-hidden="true" className="size-3 fill-current" />
                    <span>Star on GitHub</span>
                  </a>
                  <span className="opacity-40" aria-hidden="true">
                    ·
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Unified Main Navigation Bar */}
        <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-2 px-3 sm:gap-4 sm:px-6 lg:px-8">
          <Button
            ref={menuButtonRef}
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-lg border"
            onClick={() => {
              if (sidebarOpen) closeSidebar();
              else {
                expandSidebar();
              }
            }}
            aria-label={
              sidebarOpen ? 'Close tool categories' : 'Open tool categories'
            }
            aria-controls={
              desktop ? 'tool-category-rail' : 'tool-category-drawer'
            }
            aria-expanded={sidebarOpen}
          >
            {sidebarOpen ? (
              <X aria-hidden="true" />
            ) : (
              <Menu aria-hidden="true" />
            )}
          </Button>
          <a
            href="/"
            className="group focus-ring flex shrink-0 items-center gap-2 rounded-lg transition-transform duration-[var(--motion-standard)] ease-[var(--motion-ease)] hover:scale-[1.02] active:scale-[0.98] motion-reduce:transform-none"
          >
            <span className="grid size-8 place-items-center rounded-lg bg-foreground text-background transition-transform duration-[var(--motion-standard)] ease-[var(--motion-ease)] group-hover:rotate-[-4deg] motion-reduce:transform-none">
              <Grid2X2 aria-hidden="true" className="size-4" />
            </span>
            <span className="hidden text-[15px] font-semibold tracking-[-0.02em] sm:inline">
              OpenTools
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
              className="focus-ring h-10 w-full rounded-xl border bg-muted/70 pl-10 pr-16 text-sm placeholder:text-muted-foreground transition-all duration-[var(--motion-standard)] ease-[var(--motion-ease)] hover:bg-muted/90 hover:border-foreground/30 focus:bg-background focus:border-foreground/40"
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
                      className="focus-ring group flex w-full items-center justify-between rounded-lg px-3 py-3 text-left transition-all duration-[var(--motion-fast)] ease-[var(--motion-ease)] hover:bg-muted hover:translate-x-1 aria-selected:bg-muted motion-reduce:transform-none"
                    >
                      <span>
                        <span className="block text-sm font-semibold transition-colors group-hover:text-foreground">
                          {tool.name}
                        </span>
                        <span className="block text-xs text-muted-foreground transition-colors group-hover:text-foreground/80">
                          {tool.shortDescription}
                        </span>
                      </span>
                      <span className="ml-4 rounded-full border px-2 py-1 text-[11px] font-medium transition-colors group-hover:border-foreground/30">
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

          <a
            href={SUPPORT_CONFIG.githubRepoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group focus-ring hidden h-9 items-center gap-1.5 rounded-lg border bg-muted/50 px-3 text-xs font-medium text-muted-foreground transition-all duration-[var(--motion-standard)] ease-[var(--motion-ease)] hover:-translate-y-px hover:border-foreground/30 hover:bg-muted hover:text-foreground active:translate-y-0 active:scale-[0.98] motion-reduce:transform-none md:inline-flex"
            aria-label="Star on GitHub"
          >
            <Star
              aria-hidden="true"
              className="size-3.5 fill-current transition-transform duration-[var(--motion-standard)] ease-[var(--motion-ease)] group-hover:scale-110 group-hover:rotate-12 motion-reduce:transform-none"
            />
            <span>Star on GitHub</span>
          </a>

          <Button
            variant="ghost"
            className="group hidden h-10 shrink-0 rounded-lg sm:flex items-center gap-2 text-sm font-medium text-muted-foreground transition-all duration-[var(--motion-standard)] ease-[var(--motion-ease)] hover:bg-muted hover:text-foreground active:scale-[0.98]"
            render={<a href="/guides" aria-label="Tool Guides and Solutions" />}
          >
            <span>Guides</span>
          </Button>

          <Button
            variant="ghost"
            className="group hidden h-10 shrink-0 rounded-lg sm:flex items-center gap-2 text-sm font-medium text-muted-foreground transition-all duration-[var(--motion-standard)] ease-[var(--motion-ease)] hover:bg-muted hover:text-foreground active:scale-[0.98]"
            render={
              <a href="/blog" aria-label="Engineering Blog and Playbooks" />
            }
          >
            <span>Blog</span>
          </Button>

          <Button
            variant="ghost"
            className="group hidden h-10 shrink-0 rounded-lg sm:flex items-center gap-2 text-sm font-medium text-muted-foreground transition-all duration-[var(--motion-standard)] ease-[var(--motion-ease)] hover:bg-muted hover:text-foreground active:scale-[0.98]"
            render={<a href="/support" />}
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75 duration-1000" />
              <span className="relative inline-flex size-2 rounded-full bg-success" />
            </span>
            <span>Support</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-lg transition-all duration-[var(--motion-standard)] ease-[var(--motion-ease)] hover:bg-muted active:scale-[0.95] [&_svg]:transition-transform [&_svg]:duration-[var(--motion-standard)] [&_svg]:ease-[var(--motion-ease)] hover:[&_svg]:rotate-45 motion-reduce:[&_svg]:transform-none"
            onClick={toggleTheme}
            aria-label={isDark ? 'Use light theme' : 'Use dark theme'}
          >
            {isDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
          </Button>
        </div>
      </header>

      {desktop ? (
        <aside
          ref={drawerRef}
          id="tool-category-rail"
          aria-label="Categories"
          onPointerEnter={(event) => {
            if (event.pointerType === 'mouse') expandSidebar();
          }}
          onPointerLeave={scheduleCollapse}
          onFocus={expandSidebar}
          onBlur={scheduleCollapse}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              closeSidebar();
            }
          }}
          data-expanded={sidebarOpen}
          className="category-rail fixed bottom-0 left-0 top-[84px] z-50 overflow-x-hidden overflow-y-auto border-r bg-background"
        >
          <div className="flex h-14 items-center gap-4 overflow-hidden px-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={closeSidebar}
              aria-label="Collapse categories"
              className="size-10 shrink-0"
            >
              <PanelLeftClose aria-hidden="true" className="size-5" />
            </Button>
            <span className="category-label whitespace-nowrap text-sm font-semibold">
              Categories
            </span>
          </div>
          {categoryNavigation}
        </aside>
      ) : (
        <dialog
          ref={mobileDialogRef}
          id="tool-category-drawer"
          aria-labelledby="category-menu-title"
          onCancel={() => closeSidebar()}
          className="category-mobile fixed bottom-0 left-0 top-0 m-0 h-dvh max-h-none w-[min(20rem,calc(100vw-2rem))] max-w-none overflow-y-auto border-r bg-background p-0 text-foreground backdrop:bg-black/25"
        >
          <div className="flex min-h-16 items-center justify-between border-b px-4">
            <h2 id="category-menu-title" className="text-sm font-semibold">
              Categories
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={closeSidebar}
              aria-label="Close categories"
            >
              <X aria-hidden="true" />
            </Button>
          </div>
          {categoryNavigation}
        </dialog>
      )}

      <main
        className="app-main mx-auto max-w-[1440px]"
        data-expanded={desktop && sidebarOpen}
        data-design-system="operator-v1"
      >
        {children}
      </main>

      <MilestoneModal />
      <ReviewModal isOpen={reviewOpen} onClose={() => setReviewOpen(false)} />
    </div>
  );
}
