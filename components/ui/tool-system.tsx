import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function ToolPage({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-design="tool-page"
      className={cn('ds-page', className)}
      {...props}
    />
  );
}

export function ToolHeading({
  eyebrow,
  title,
  description,
  aside,
}: {
  eyebrow: string;
  title: string;
  description: string;
  aside?: ReactNode;
}) {
  return (
    <header
      data-design="tool-heading"
      className="flex flex-col justify-between gap-5 border-b pb-8 sm:flex-row sm:items-start"
    >
      <div>
        <p className="ds-eyebrow">{eyebrow}</p>
        <h1 className="ds-title mt-3">{title}</h1>
        <p className="ds-description mt-3">{description}</p>
      </div>
      {aside}
    </header>
  );
}

export function ToolSurface({
  className,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <section
      data-design="tool-surface"
      className={cn('ds-surface', className)}
      {...props}
    />
  );
}

export function ToolSurfaceHeader({
  className,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <header
      data-design="surface-header"
      className={cn('ds-surface-header', className)}
      {...props}
    />
  );
}

export function ToolReceipt({
  className,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <section
      data-design="tool-receipt"
      className={cn('ds-receipt', className)}
      {...props}
    />
  );
}

export function ChartSurface({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <figure
      data-design="chart"
      className={cn('ds-chart p-4 sm:p-5', className)}
    >
      <figcaption>
        <p className="text-sm font-semibold">{title}</p>
        {description ? (
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </figcaption>
      <div
        className="mt-4"
        role="img"
        aria-label={description ? `${title}. ${description}` : title}
      >
        {children}
      </div>
    </figure>
  );
}
