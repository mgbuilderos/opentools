'use client';

import { Check, Copy, Link2, Share2 } from 'lucide-react';
import { useEffect, useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  ASK_REQUESTS,
  askDefaults,
  askField,
  askSettingLines,
  buildAskLinkUrl,
  describeAskRequest,
  readAskCreatorState,
  sanitiseAskValues,
  type AskRequest,
} from '@/lib/tools/ask-link';
import type { RecipeValues } from '@/lib/tools/recipe-link';

/**
 * The sender's side of an ask link: pick what you need, copy one link, send it.
 *
 * WHAT THIS DELIBERATELY IS NOT. It is not a settings page for a tool, and it
 * is not an editor for a chain of steps. Both were easy to build from what
 * already exists here and both would be the wrong product: the person using
 * this is an HR manager or a college clerk who wants to stop typing *"photo,
 * 200 × 230 px, under 50 KB"* into a chat window twenty times a day. So there
 * is one list of the things you can ask for, a handful of controls that belong
 * to the one you picked, the sentence the other person will read, and one
 * button.
 *
 * WHY THE SENTENCE IS ABOVE THE BUTTON. The link is going to a stranger, and
 * the only way to be sure of what it says is to read it before sending. Both
 * halves are shown: the requirement in words, and every setting the URL
 * carries — because "this link contains only these settings" is a claim, and a
 * claim the reader cannot check is just a reassurance.
 *
 * WHY THERE IS NO FREE-TEXT FIELD. A box saying "what is this for?" is the
 * obvious next feature and it is the one thing that would break this: one typed
 * line carries a candidate's name, a case number or a phone number into a URL
 * that then gets forwarded. `lib/tools/ask-link.ts` refuses to encode anything
 * its definition does not declare, so a field added here would silently do
 * nothing — but it is not added, and `ask-link.test.ts` asserts the encoder
 * still refuses one.
 *
 * NOTHING HERE TOUCHES A FILE. This component builds a URL. It imports no
 * engine, no encoder and no worker, so the page stays small — the sender is not
 * the one doing the work.
 */

/**
 * A control's value as the form holds it: a string, because that is what an
 * `<input>` and a `<select>` give back, plus a boolean for a checkbox.
 *
 * Kept as typed rather than coerced on every keystroke so a half-finished
 * number ("12" on the way to "1200") is not rewritten under the person's
 * cursor, and so an empty box can mean "do not ask for this" rather than zero.
 */
type FormValues = Readonly<Record<string, string | boolean>>;

function toFormValues(request: AskRequest, values: RecipeValues): FormValues {
  const form: Record<string, string | boolean> = {};
  for (const control of request.controls) {
    const raw = values[control.param];
    form[control.param] =
      typeof raw === 'boolean' ? raw : raw === undefined ? '' : String(raw);
  }
  return form;
}

/**
 * The settings a link would carry, and the reason it cannot yet.
 *
 * An empty box is not an error — it means the sender is not asking for that
 * one, and the recipient's tool keeps its own default. A box with something in
 * it that the field would reject *is* an error, and it is named rather than
 * silently dropped: dropping it would produce a link that quietly asks for
 * less than the sender typed, which is the worst of the three outcomes.
 */
function readForm(
  request: AskRequest,
  form: FormValues,
): { values: RecipeValues; errors: Readonly<Record<string, string>> } {
  const values: Record<string, string | number | boolean> = {};
  const errors: Record<string, string> = {};

  for (const control of request.controls) {
    const field = askField(request, control.param);
    if (!field) continue;
    const raw = form[control.param];

    if (field.kind === 'flag') {
      values[field.param] = raw === true;
      continue;
    }
    if (typeof raw !== 'string' || raw.trim() === '') continue;

    if (field.kind === 'choice') {
      if (field.choices.some((choice) => choice.value === raw)) {
        values[field.param] = raw;
      } else {
        errors[field.param] = `Choose one of the listed options.`;
      }
      continue;
    }
    if (!/^\d+$/.test(raw.trim())) {
      errors[field.param] = 'Enter a whole number, or leave it empty.';
      continue;
    }
    const parsed = Number(raw.trim());
    if (parsed < field.min || parsed > field.max) {
      errors[field.param] =
        `Enter a number from ${field.min.toLocaleString('en')} to ${field.max.toLocaleString('en')}, or leave it empty.`;
      continue;
    }
    values[field.param] = parsed;
  }

  // Sanitised once more against the definition before anything is shown or
  // copied, so the preview, the settings list and the link cannot disagree.
  return { values: sanitiseAskValues(request, values), errors };
}

export function AskLinkCreator() {
  const [request, setRequest] = useState<AskRequest>(ASK_REQUESTS[0]!);
  const [form, setForm] = useState<FormValues>(() =>
    toFormValues(ASK_REQUESTS[0]!, askDefaults(ASK_REQUESTS[0]!)),
  );
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [fallbackUrl, setFallbackUrl] = useState('');
  const [canShare, setCanShare] = useState(false);
  const formId = useId();

  /*
   * Opened from "Ask someone for this file" on a finished job, which carries
   * the request and its settings in the address bar — the same allowlisted
   * parameters an ask link carries, read back through the same definition. An
   * id nobody declared selects nothing and the page opens on its default.
   *
   * Runs once on mount because it reads the address bar, which is an external
   * system: the params are not kept as the source of truth, since every control
   * below stays editable and a URL that kept re-asserting them would fight the
   * person using the page.
   */
  /* oxlint-disable react/react-compiler -- both effects below read an external
     system: the address bar and a browser capability. Each runs once on mount,
     so the cascading render the rule warns about happens exactly once, before
     anybody has typed anything. Same exemption, same reason, as the arrival
     effect in components/image-optimize-tool.tsx. */
  useEffect(() => {
    const opened = readAskCreatorState(window.location.search);
    if (!opened) return;
    setRequest(opened.request);
    setForm(
      toFormValues(opened.request, {
        ...askDefaults(opened.request),
        ...opened.values,
      }),
    );
  }, []);

  /*
   * `navigator.share` exists in far fewer places than its presence suggests —
   * desktop Firefox has none, desktop Chrome has it only on Windows and
   * ChromeOS — and a share button that throws is worse than no share button.
   * Checked after mount rather than during render so the server-rendered HTML
   * and the first client render agree.
   */
  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && 'share' in navigator);
  }, []);
  /* oxlint-enable react/react-compiler */

  const chooseRequest = (next: AskRequest) => {
    setRequest(next);
    setForm(toFormValues(next, askDefaults(next)));
    setCopied(false);
    setShared(false);
    setFallbackUrl('');
  };

  const setValue = (param: string, value: string | boolean) => {
    setForm((current) => ({ ...current, [param]: value }));
    setCopied(false);
    setShared(false);
    setFallbackUrl('');
  };

  const { values, errors } = readForm(request, form);
  const problems = Object.keys(errors).length;
  const requirement = describeAskRequest(request, values);
  const settingLines = askSettingLines(request, values);

  const linkFor = () =>
    buildAskLinkUrl(request, values, window.location.origin);

  const copy = async () => {
    const url = linkFor();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setFallbackUrl('');
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      // Clipboard access is refused in more places than people expect — a
      // non-secure context, a locked-down browser, an embedded webview.
      // Showing the link is strictly better than reporting a failure: the
      // sender can still select it and send it by hand.
      setFallbackUrl(url);
    }
  };

  const share = async () => {
    const url = linkFor();
    try {
      await navigator.share({
        title: 'A file request',
        text: requirement,
        url,
      });
      setShared(true);
      window.setTimeout(() => setShared(false), 2400);
    } catch {
      // A dismissed share sheet and an unsupported one both land here, and
      // neither is an error worth reporting. Fall back to the clipboard.
      await copy();
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start">
      <div className="min-w-0 rounded-2xl border bg-card p-4 sm:p-5">
        <fieldset>
          <legend className="text-sm font-semibold">
            1. What do you need from them?
          </legend>
          <div className="mt-3 grid gap-2">
            {ASK_REQUESTS.map((candidate) => (
              <div
                key={candidate.id}
                className="focus-within:ring-ring/50 rounded-xl border p-3 focus-within:ring-2"
              >
                <label
                  htmlFor={`${formId}-request-${candidate.id}`}
                  className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold"
                >
                  <input
                    id={`${formId}-request-${candidate.id}`}
                    type="radio"
                    name={`${formId}-request`}
                    value={candidate.id}
                    checked={candidate.id === request.id}
                    aria-describedby={`${formId}-hint-${candidate.id}`}
                    onChange={() => chooseRequest(candidate)}
                    className="size-5 shrink-0 cursor-pointer accent-foreground"
                  />
                  {candidate.menuLabel}
                </label>
                <p
                  id={`${formId}-hint-${candidate.id}`}
                  className="pl-8 text-xs text-muted-foreground"
                >
                  {candidate.menuHint}
                </p>
              </div>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-6">
          <legend className="text-sm font-semibold">2. The details</legend>
          <p className="mt-1 text-xs text-muted-foreground">
            Leave anything empty that you do not want to ask for.
          </p>
          <div className="mt-3 grid gap-4">
            {request.controls.map((control) => {
              const field = askField(request, control.param);
              if (!field) return null;
              const inputId = `${formId}-${control.param}`;
              const errorId = `${inputId}-error`;
              const helpId = `${inputId}-help`;
              const message = errors[control.param];
              const described =
                [control.help ? helpId : '', message ? errorId : '']
                  .filter(Boolean)
                  .join(' ') || undefined;

              if (field.kind === 'flag') {
                return (
                  <div key={control.param}>
                    <label
                      htmlFor={inputId}
                      className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold"
                    >
                      <input
                        id={inputId}
                        type="checkbox"
                        checked={form[control.param] === true}
                        aria-describedby={described}
                        onChange={(event) =>
                          setValue(control.param, event.target.checked)
                        }
                        className="size-5 shrink-0 cursor-pointer accent-foreground"
                      />
                      {control.label}
                    </label>
                    {control.help ? (
                      <p
                        id={helpId}
                        className="mt-1 pl-8 text-xs text-muted-foreground"
                      >
                        {control.help}
                      </p>
                    ) : null}
                  </div>
                );
              }

              return (
                <div key={control.param}>
                  <label
                    htmlFor={inputId}
                    className="block text-xs font-semibold"
                  >
                    {control.label}
                  </label>
                  {field.kind === 'choice' ? (
                    <select
                      id={inputId}
                      value={String(form[control.param] ?? '')}
                      aria-describedby={described}
                      onChange={(event) =>
                        setValue(control.param, event.target.value)
                      }
                      className="focus-ring mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm"
                    >
                      <option value="">Not specified</option>
                      {field.choices.map((choice) => (
                        <option key={choice.value} value={choice.value}>
                          {choice.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id={inputId}
                      type="number"
                      inputMode="numeric"
                      min={field.min}
                      max={field.max}
                      step="1"
                      value={String(form[control.param] ?? '')}
                      aria-describedby={described}
                      aria-invalid={message ? true : undefined}
                      onChange={(event) =>
                        setValue(control.param, event.target.value)
                      }
                      className="focus-ring mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm"
                    />
                  )}
                  {control.help ? (
                    <p
                      id={helpId}
                      className="mt-1 text-xs text-muted-foreground"
                    >
                      {control.help}
                    </p>
                  ) : null}
                  {message ? (
                    <p
                      id={errorId}
                      className="mt-1 text-xs font-semibold text-destructive"
                    >
                      {message}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </fieldset>
      </div>

      <div className="min-w-0 rounded-2xl border bg-muted/40 p-4 sm:p-5">
        <h2 className="text-sm font-semibold">3. What they will see</h2>
        <p className="mt-3 rounded-xl border bg-background p-3 text-sm">
          <span className="block font-semibold">{request.headline}</span>
          <span className="mt-1 block text-muted-foreground">
            {requirement}
          </span>
        </p>

        {settingLines.length ? (
          <>
            <h3 className="mt-4 text-xs font-semibold">
              Everything the link contains
            </h3>
            <dl className="mt-2 grid gap-1 text-xs">
              {settingLines.map((line) => (
                <div key={line.label} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{line.label}</dt>
                  <dd className="tabular text-right font-semibold">
                    {line.value}
                  </dd>
                </div>
              ))}
            </dl>
          </>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            No settings yet, so the link would only say what kind of file you
            need.
          </p>
        )}

        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          This link contains only these settings. It does not contain a file,
          your name, or anything about the person you send it to.
        </p>

        {problems ? (
          <p
            role="alert"
            className="mt-4 text-xs font-semibold text-destructive"
          >
            Fix the {problems === 1 ? 'setting' : `${problems} settings`} marked
            above before copying the link.
          </p>
        ) : null}

        <div className="mt-4 grid gap-2">
          <Button
            type="button"
            className="h-11 w-full"
            disabled={problems > 0}
            onClick={() => void copy()}
          >
            {copied ? (
              <Check aria-hidden="true" />
            ) : (
              <Link2 aria-hidden="true" />
            )}
            {copied ? 'Request link copied' : 'Copy request link'}
          </Button>
          {canShare ? (
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full"
              disabled={problems > 0}
              onClick={() => void share()}
            >
              {shared ? (
                <Check aria-hidden="true" />
              ) : (
                <Share2 aria-hidden="true" />
              )}
              {shared ? 'Shared' : 'Share the request'}
            </Button>
          ) : null}
        </div>

        {fallbackUrl ? (
          <label className="mt-3 block text-xs font-semibold">
            Your browser blocked the clipboard. Copy this by hand:
            <span className="mt-2 flex items-start gap-2">
              <Copy
                aria-hidden="true"
                className="mt-3 size-3.5 shrink-0 text-muted-foreground"
              />
              <textarea
                readOnly
                rows={3}
                value={fallbackUrl}
                onFocus={(event) => event.currentTarget.select()}
                className="focus-ring w-full min-w-0 resize-none break-all rounded-xl border bg-background p-2 text-xs"
              />
            </span>
          </label>
        ) : null}
      </div>
    </div>
  );
}
