'use client';

import { useMemo, useState } from 'react';
import {
  TEXT_OPERATIONS,
  runTextOperation,
  type TextOperationId,
} from '@/lib/tools/text-workbench';

/**
 * One embeddable tool for any option-free operation in `TEXT_OPERATIONS`.
 *
 * WHY THIS IS GENERIC AND `EmbedTableConverter` IS NOT. The table converter has
 * a from/to pair that has to be chosen; these have nothing to choose. Every
 * operation here takes a string and returns a string, which is precisely the
 * shape ADR-019 §4 permits inside a frame, so the same textarea serves all of
 * them and registering the next one costs a line in
 * `lib/embed/embeddable-tools.ts` and a line in `EMBED_COMPONENTS` -- not a
 * component. 24 operations qualified when this was written; four are
 * registered, chosen for whether a site owner would actually host them.
 *
 * OPTION-FREE IS A HARD CONDITION, not a simplification. An operation with an
 * `optionKind` needs controls -- a find field, a separator, a sort direction --
 * and an embed with controls is a small application on somebody else's page
 * rather than the one-input-one-output thing the programme promises.
 * `lib/embed/embed-entry-point.test.ts` fails if a registered slug names an
 * operation that takes options.
 *
 * `runTextOperation` is the same function the site's own `/text/*` pages call,
 * so an embedded answer can never disagree with the answer on getopentools.com.
 * Nothing here fetches: `/embed/*` still sends `connect-src 'none'`, so a
 * network call would be refused by the browser even if one were written by
 * accident.
 */
export function EmbedTextOperation({
  operation,
}: {
  operation: TextOperationId;
}) {
  const definition = TEXT_OPERATIONS.find((item) => item.id === operation);
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);

  /*
   * An empty or half-typed box is the normal state of a free-text input, and
   * `runTextOperation` throws on empty by design. A thrown error must read as a
   * quiet line under the box, never as a blank screen inside somebody else's
   * page, where a React error boundary would look like their site broke.
   */
  const { output, summary, error } = useMemo(() => {
    if (!input.trim()) return { output: '', summary: '', error: '' };
    try {
      const result = runTextOperation(operation, input);
      return { output: result.output, summary: result.summary, error: '' };
    } catch (cause) {
      return {
        output: '',
        summary: '',
        error: cause instanceof Error ? cause.message : 'That did not work.',
      };
    }
  }, [input, operation]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* Clipboard writes are refused in some embedding contexts. The output is
         selectable, so a refusal costs the visitor a keystroke, not the tool. */
      setCopied(false);
    }
  };

  if (!definition) return null;

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{definition.inputLabel}</span>
        <textarea
          className="ds-input min-h-32 font-mono text-sm"
          onChange={(event) => setInput(event.target.value)}
          placeholder="Paste or type here"
          spellCheck={false}
          value={input}
        />
      </label>

      <div className="flex flex-col gap-1 text-sm">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-medium">{definition.outputLabel}</span>
          {summary ? (
            <span className="text-xs text-muted-foreground">{summary}</span>
          ) : null}
        </div>
        <output
          aria-live="polite"
          className="ds-surface min-h-16 whitespace-pre-wrap break-words p-3 font-mono text-sm"
        >
          {output || error || ' '}
        </output>
      </div>

      <button
        className="ds-button-secondary self-start text-sm"
        disabled={!output}
        onClick={copy}
        type="button"
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
