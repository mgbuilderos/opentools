'use client';

import {
  ArrowRight,
  CircleSlash,
  CornerDownLeft,
  Layers,
  Search,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { CommandPlan } from '@/lib/command';
import type { SubjectKind } from '@/lib/command/types';

/*
  ONE BOX, INSTEAD OF KNOWING WHICH OF 1,362 PAGES TO OPEN.

  You type what you want done -- "make this under 2MB and strip my name out of
  it" -- and this says which tools do it, in order, with the ones it is not sure
  about beside them. Where the steps happen to be operations the batch runner can
  take, it offers to run the whole chain in one pass.

  WHY IT CAN PROMISE THE SENTENCE STAYS HERE. Not as a policy: this page is
  served with `Content-Security-Policy: connect-src 'none'` (`public/_headers`),
  so the tab cannot open a connection, and `e2e/egress-proof.spec.ts` fails if any
  page does. The whole catalogue is read from a generated index in
  `lib/command/`, and the matching is arithmetic over it. There is no request to
  make, which is why there is no request.

  WHY THE INDEX IS IMPORTED LATE. It is about 35 KB over the wire and the home
  page is the most visited page on the site -- see `lib/tools/browse.ts` for what
  happened the last time the whole catalogue was in this bundle. It is fetched on
  the first keystroke, by the people who are using the box.

  WHAT IT DOES NOT DO. There is no model here. It reads conjunctions, sizes,
  dimensions, a conversion's direction and what kind of file the sentence is
  about; it does not understand English. The interesting consequence is the
  refusals: a catalogue this size can look confident about anything, so
  `lib/command/limits.ts` holds the things this site cannot do -- a language
  translation, an email, a live rate -- and says so instead.
*/

type Module = typeof import('@/lib/command');

/** How long after a keystroke the answer is worked out. */
const SETTLE_MS = 140;

/** What the box says it is working on, when the dropzone has told it. */
const SUBJECT_LABEL: Readonly<Record<SubjectKind, string>> = {
  pdf: 'the PDF',
  image: 'the image',
  audio: 'the audio file',
  video: 'the video',
  table: 'the spreadsheet',
  text: 'the text file',
  archive: 'the archive',
};

export function CommandBar({ subject }: { subject?: SubjectKind } = {}) {
  const [query, setQuery] = useState('');
  const [plan, setPlan] = useState<CommandPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const commands = useRef<Module | null>(null);
  const pending = useRef<Promise<Module> | null>(null);

  /**
   * The index, fetched once, on the first sign that somebody is going to use it.
   * Called from focus as well as from typing, so it is usually already here by
   * the time the first word is finished.
   */
  const load = useCallback(() => {
    if (commands.current) return Promise.resolve(commands.current);
    pending.current ??= import('@/lib/command').then((loaded) => {
      commands.current = loaded;
      return loaded;
    });
    return pending.current;
  }, []);

  const answer = useCallback(
    (text: string) => {
      if (!text.trim()) {
        setPlan(null);
        return;
      }
      // What is on the dropzone answers "this" when the sentence does not.
      const options = subject ? { subject } : {};
      const ready = commands.current;
      if (ready) {
        setPlan(ready.plan(text, options));
        return;
      }
      setLoading(true);
      void load().then((loaded) => {
        setLoading(false);
        setPlan(loaded.plan(text, options));
      });
    },
    [load, subject],
  );

  /*
    Debounced, so a long sentence is not re-planned on every letter. The plan
    itself is a pass over the index; the delay is for the rendering.

    Nothing is cleared in here. An empty box is answered by not showing the last
    answer (`shown`, below) rather than by setting state from an effect body,
    which is `react-compiler/EffectSetState` and a real cascade rather than a
    warning to suppress -- the same note `home-workspace.tsx` carries. The useful
    side effect is that the previous answer stays put while the next sentence is
    being typed, instead of blinking out between keystrokes.
  */
  useEffect(() => {
    if (!query.trim()) return;
    // `answer` changes when the dropzone does, so dropping a file re-answers the
    // sentence already in the box rather than waiting for another keystroke.
    const timer = setTimeout(() => answer(query), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [query, answer]);

  const shown = query.trim() ? plan : null;
  const nothing = shown && !shown.steps.length && !shown.gaps.length;

  return (
    <section
      aria-labelledby="command-bar-heading"
      className="rounded-xl border bg-card p-5 sm:p-6"
    >
      <h2
        id="command-bar-heading"
        className="text-lg font-semibold tracking-tight"
      >
        Say what you need done
      </h2>
      <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
        In a sentence, in your own words. It is read here, on this device — the
        page is served with{' '}
        <code className="font-mono text-xs">connect-src &apos;none&apos;</code>,
        so there is nowhere for it to be sent.
      </p>

      <form
        aria-label="Describe the job"
        onSubmit={(event) => {
          event.preventDefault();
          answer(query);
        }}
        className="mt-4 flex flex-col gap-2 sm:flex-row"
      >
        <span className="relative flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground"
          />
          <input
            type="text"
            name="request"
            autoComplete="off"
            aria-label="What do you need done?"
            placeholder="make this under 2MB and strip my name out of it"
            value={query}
            onFocus={() => void load()}
            onChange={(event) => setQuery(event.target.value)}
            className="focus-ring h-11 w-full rounded-lg border bg-background pl-9 pr-3 text-sm transition-all duration-[var(--motion-standard)] ease-[var(--motion-ease)] hover:border-foreground/30 focus:border-foreground/50"
          />
        </span>
        <Button type="submit" size="lg" className="h-11 px-4">
          Work it out
          <CornerDownLeft aria-hidden="true" className="size-3.5" />
        </Button>
      </form>

      {subject ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Reading “this” as {SUBJECT_LABEL[subject]} below. It has not moved:
          answering only needed to know what kind of file it is.
        </p>
      ) : null}

      <div aria-live="polite" className="mt-4 empty:mt-0">
        {loading && !shown ? (
          <p className="text-sm text-muted-foreground">
            Reading the catalogue…
          </p>
        ) : null}

        {shown?.steps.length ? (
          <ol className="space-y-3">
            {shown.steps.map((step, index) => (
              <li
                key={`${step.href}-${step.clause}`}
                className="rounded-lg border bg-background p-4"
              >
                <p className="text-xs text-muted-foreground">
                  <span className="tabular font-mono">
                    Step {index + 1} of {shown.steps.length}
                  </span>{' '}
                  · “{step.clause}”
                </p>
                <a
                  href={step.href}
                  className="focus-ring group mt-2 inline-flex items-center gap-2 rounded text-base font-semibold tracking-tight underline underline-offset-4"
                >
                  {step.name}
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 transition-transform duration-[var(--motion-standard)] group-hover:translate-x-1 motion-reduce:transform-none"
                  />
                </a>
                {step.notes.map((note) => (
                  <p
                    key={note}
                    className="mt-2 text-sm leading-6 text-muted-foreground"
                  >
                    {note}
                  </p>
                ))}
                {step.alternatives.length ? (
                  <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    <span>Or:</span>
                    {step.alternatives.map((option) => (
                      <a
                        key={option.href}
                        href={option.href}
                        className="focus-ring rounded underline underline-offset-4 hover:text-foreground"
                      >
                        {option.name}
                      </a>
                    ))}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        ) : null}

        {shown?.chain ? (
          <a
            href={shown.chain.href}
            className="focus-ring mt-3 flex items-center justify-between gap-3 rounded-lg border border-foreground/30 bg-muted/30 p-4 transition-colors hover:bg-muted"
          >
            <span className="flex items-start gap-3">
              <Layers
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
              />
              <span>
                <span className="block text-sm font-semibold">
                  Run all {shown.chain.steps} steps in one pass
                </span>
                <span className="mt-0.5 block text-sm leading-6 text-muted-foreground">
                  Opens the batch runner with these steps already chained, ready
                  for your files or a whole folder.
                </span>
              </span>
            </span>
            <span className="shrink-0 rounded-lg border bg-background px-3 py-2 text-sm font-semibold">
              Open
            </span>
          </a>
        ) : shown?.chainBlocked ? (
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {shown.chainBlocked}
          </p>
        ) : null}

        {shown?.gaps.map((gap) => (
          <div
            key={gap.clause}
            className="mt-3 rounded-lg border border-dashed p-4"
          >
            <p className="flex items-start gap-2 text-sm font-semibold">
              <CircleSlash
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
              />
              <span>Nothing here does “{gap.clause}”</span>
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {gap.because}
            </p>
            {gap.unrecognised.length ? (
              <p className="mt-2 text-sm text-muted-foreground">
                No tool on this site mentions{' '}
                {gap.unrecognised.map((word, index) => (
                  <span key={word}>
                    {index > 0 ? ' or ' : ''}
                    <span className="font-mono text-xs text-foreground">
                      {word}
                    </span>
                  </span>
                ))}
                .
              </p>
            ) : null}
            <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              {gap.instead ? (
                <a
                  href={gap.instead.href}
                  className="focus-ring rounded font-semibold underline underline-offset-4"
                >
                  {gap.instead.label}
                </a>
              ) : null}
              {gap.instead?.note ? (
                <span className="text-muted-foreground">
                  {gap.instead.note}
                </span>
              ) : null}
              {gap.requestUrl ? (
                <a
                  href={gap.requestUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="focus-ring rounded underline underline-offset-4 hover:text-foreground"
                >
                  Ask for this tool on GitHub
                </a>
              ) : null}
            </p>
            {gap.requestUrl ? (
              <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                That link opens a form with your words already in it. Nothing is
                sent until you submit it there, and no file is ever part of it.
              </p>
            ) : null}
          </div>
        ))}

        {nothing ? (
          <p className="text-sm leading-6 text-muted-foreground">
            Nothing in that named a task. Try the thing and what to do to it.
          </p>
        ) : null}

        {shown && (shown.steps.length || shown.gaps.length) ? (
          <p className="mt-3 text-xs text-muted-foreground">
            {shown.searched.toLocaleString('en-US')} tools, read on this device.
            No request was made.
          </p>
        ) : null}
      </div>
    </section>
  );
}
