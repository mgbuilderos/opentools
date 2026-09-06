import { ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

export function ToolLinkCard({
  name,
  description,
  href,
  compact = false,
  className,
}: {
  name: string;
  description: string;
  href: string;
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
      <span className="min-w-0">
        <span className="block text-sm font-semibold tracking-[-0.01em]">
          {name}
        </span>
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">
          {description}
        </span>
      </span>
      <ChevronRight
        aria-hidden="true"
        className="size-4 shrink-0 text-muted-foreground transition-transform duration-[var(--motion-fast)] ease-[var(--motion-ease)] group-hover:translate-x-0.5"
      />
    </a>
  );
}
