'use client';

import { CircleSlash, ListOrdered } from 'lucide-react';
import { useToolUi } from '@/components/locale-edition-provider';

import type { PracticeBrief } from '@/lib/practice-briefs';

/**
 * The two lists a professional reads before trusting a tool with a client
 * file: what it does on this job, and what it will not do.
 *
 * It renders directly under the page heading and above the controls, because
 * the second list is the one that decides whether the file gets opened here at
 * all, and a limitation discovered after the deadline is worse than a tool
 * that was never used. The heading and standfirst are NOT rendered here — each
 * host page already owns its `<h1>`, and a second one would tell a reader and
 * a crawler two different things about what the page is.
 *
 * Deliberately static: no state, no effects, no controls. It sits between a
 * heading and a dropzone, and anything interactive here would compete with the
 * tool for the first click.
 */
export function PracticeBriefPanel({ brief }: { brief: PracticeBrief }) {
  const t = useToolUi();
  const stepsId = `${brief.id}-steps`;
  const limitsId = `${brief.id}-limits`;

  return (
    <div className="mt-6 grid gap-3 lg:grid-cols-2">
      <section
        aria-labelledby={stepsId}
        className="rounded-2xl border bg-muted/55 p-4 sm:p-5"
      >
        <h2
          id={stepsId}
          className="flex items-center gap-2 text-sm font-semibold"
        >
          <ListOrdered aria-hidden="true" className="size-4" />
          {t.briefStepsHeading}
        </h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
          {brief.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <section
        aria-labelledby={limitsId}
        className="rounded-2xl border bg-muted/55 p-4 sm:p-5"
      >
        <h2
          id={limitsId}
          className="flex items-center gap-2 text-sm font-semibold"
        >
          <CircleSlash aria-hidden="true" className="size-4" />
          {t.briefLimitsHeading}
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
          {brief.limits.map((limit) => (
            <li key={limit}>{limit}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
