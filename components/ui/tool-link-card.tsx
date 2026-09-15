import { ChevronRight, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export function ToolLinkCard({
  name,
  description,
  href,
  icon: Icon,
  compact = false,
  className,
}: {
  name: string;
  description: string;
  href: string;
  icon: LucideIcon;
  compact?: boolean;
  className?: string;
}) {
  return (
    <a
      href={href}
      aria-label={`${name}: ${description}`}
      data-design="tool-card"
      className={cn(
        'focus-ring group flex w-full items-center justify-between gap-3 rounded-lg border bg-card text-left transition-all duration-[var(--motion-standard)] ease-[var(--motion-ease)] hover:-translate-y-0.5 hover:border-foreground/30 hover:bg-muted/45 hover:shadow-xs active:translate-y-0 active:scale-[0.995] motion-reduce:transform-none motion-reduce:transition-none',
        compact ? 'min-h-[4.5rem] px-4 py-3' : 'min-h-24 p-4 sm:p-5',
        className,
      )}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          data-design="tool-icon"
          className="grid size-9 shrink-0 place-items-center rounded-lg border bg-muted/45 text-foreground transition-all duration-[var(--motion-standard)] ease-[var(--motion-ease)] group-hover:scale-105 group-hover:border-foreground/20 group-hover:bg-background group-hover:shadow-xs motion-reduce:transform-none"
        >
          <Icon className="size-4" strokeWidth={1.75} />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold tracking-[-0.01em] transition-colors duration-[var(--motion-fast)] group-hover:text-foreground">
            {name}
          </span>
          <span className="mt-1 block text-xs leading-5 text-muted-foreground transition-colors duration-[var(--motion-fast)] group-hover:text-foreground/80">
            {description}
          </span>
        </span>
      </span>
      <ChevronRight
        aria-hidden="true"
        className="size-4 shrink-0 text-muted-foreground transition-all duration-[var(--motion-standard)] ease-[var(--motion-ease)] group-hover:translate-x-1 group-hover:text-foreground motion-reduce:transform-none"
      />
    </a>
  );
}
