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
        'focus-ring group flex w-full items-center justify-between gap-3 rounded-lg border bg-card text-left transition-[background-color,border-color,transform] duration-[var(--motion-fast)] ease-[var(--motion-ease)] hover:-translate-y-px hover:border-foreground/35 hover:bg-muted/55 motion-reduce:transform-none',
        compact ? 'min-h-[4.5rem] px-4 py-3' : 'min-h-24 p-4 sm:p-5',
        className,
      )}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          data-design="tool-icon"
          className="grid size-9 shrink-0 place-items-center rounded-lg border bg-muted/45 text-foreground transition-colors duration-[var(--motion-fast)] ease-[var(--motion-ease)] group-hover:bg-background"
        >
          <Icon className="size-4" strokeWidth={1.75} />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold tracking-[-0.01em]">
            {name}
          </span>
          <span className="mt-1 block text-xs leading-5 text-muted-foreground">
            {description}
          </span>
        </span>
      </span>
      <ChevronRight
        aria-hidden="true"
        className="size-4 shrink-0 text-muted-foreground transition-transform duration-[var(--motion-fast)] ease-[var(--motion-ease)] group-hover:translate-x-0.5"
      />
    </a>
  );
}
