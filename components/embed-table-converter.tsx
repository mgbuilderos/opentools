'use client';

import { useMemo, useState } from 'react';
import { TABLE_FORMAT_LABELS, TABLE_FORMATS } from '@/lib/embed/table-formats';
import { convertTable } from '@/lib/tools/notation/table';
import type { TableFormat } from '@/lib/tools/notation/table/types';

const SAMPLE = 'Region,Units,Revenue\nNorth,1204,48160\nSouth,982,39280';

/**
 * The embeddable table converter: paste a table in one notation, read it back
 * in another.
 *
 * It is a deliberately smaller thing than `/latex/table-generator`, which this
 * links back to. The hub has tabs, related tools, site navigation and the LaTeX
 * option set; an embed has one input, one output and no way to wander off. A
 * visitor who wants the options follows the attribution link, which is exactly
 * the traffic the programme exists to earn.
 *
 * Conversion is `convertTable` from `lib/tools/notation/table` -- the same
 * parser and emitter the site's own pages use, so an embedded result can never
 * disagree with the result on getopentools.com. Nothing here fetches: the CSP
 * on `/embed/*` still sends `connect-src 'none'`, so a network call would be
 * refused by the browser even if one were written by accident.
 */
export function EmbedTableConverter() {
  const [input, setInput] = useState(SAMPLE);
  const [from, setFrom] = useState<TableFormat | 'auto'>('auto');
  const [to, setTo] = useState<TableFormat>('latex');
  const [copied, setCopied] = useState(false);

  /*
   * A malformed paste is the normal case, not the exception -- the input is a
   * free-text box and half of what lands in it mid-edit is a partial table. A
   * thrown parse error must read as a message in the output box, never as a
   * blank screen inside somebody else's page, where a React error boundary
   * would look like their site broke.
   */
  const { output, error } = useMemo(() => {
    if (!input.trim()) return { output: '', error: '' };
    try {
      return { output: convertTable(input, from, to), error: '' };
    } catch (cause) {
      return {
        output: '',
        error:
          cause instanceof Error
            ? cause.message
            : 'That does not parse as a table yet.',
      };
    }
  }, [input, from, to]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access is refused in some embedding contexts and by Safari
      // without a user gesture it recognises. The text is selectable in the
      // box either way, so a failed copy needs no alarm -- just no false
      // "Copied" claim.
      setCopied(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="ds-field-label">From</span>
          <select
            className="ds-control w-auto"
            value={from}
            onChange={(event) =>
              setFrom(event.target.value as TableFormat | 'auto')
            }
          >
            <option value="auto">Detect automatically</option>
            {TABLE_FORMATS.map((format) => (
              <option key={format} value={format}>
                {TABLE_FORMAT_LABELS[format]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="ds-field-label">To</span>
          <select
            className="ds-control w-auto"
            value={to}
            onChange={(event) => setTo(event.target.value as TableFormat)}
          >
            {TABLE_FORMATS.map((format) => (
              <option key={format} value={format}>
                {TABLE_FORMAT_LABELS[format]}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={copy}
          disabled={!output}
          className="ds-control w-auto rounded-lg font-medium disabled:opacity-50"
        >
          {copied ? 'Copied' : 'Copy result'}
        </button>
      </div>

      <div className="grid flex-1 gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="ds-field-label">Your table</span>
          <textarea
            className="ds-control min-h-[12rem] flex-1 resize-none py-2 font-[family-name:var(--font-system-mono)] text-xs"
            value={input}
            spellCheck={false}
            onChange={(event) => setInput(event.target.value)}
            aria-label="Table to convert"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="ds-field-label">
            {TABLE_FORMAT_LABELS[to]} output
          </span>
          <textarea
            className="ds-control min-h-[12rem] flex-1 resize-none py-2 font-[family-name:var(--font-system-mono)] text-xs"
            value={error || output}
            readOnly
            spellCheck={false}
            aria-label={`${TABLE_FORMAT_LABELS[to]} output`}
          />
        </label>
      </div>
    </div>
  );
}
