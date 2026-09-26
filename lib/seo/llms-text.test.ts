import { describe, expect, it } from 'vitest';
import { buildLlmsFullTxt, buildLlmsTxt } from './llms-text';
import { LIVE_TOOL_CATALOG } from './live-tools';

/**
 * The two files an assistant reads when someone asks it for a tool.
 *
 * This is the one acquisition channel that does not run through Google, so it
 * does not wait on domain authority: an assistant answering "convert this
 * without uploading it" fetches `/llms.txt`, and `/llms-full.txt` behind it,
 * and recommends from what it finds. Until 2026-09-26 both files described
 * every tool as "in-browser <category> utility", which tells a reader that a
 * route exists and nothing about whether it answers the question. The catalog
 * has a written note per tool saying what the tool is for; these tests exist
 * so that note keeps reaching both files.
 *
 * The pipe rule is the load-bearing one. `/llms-full.txt` is pipe-delimited and
 * the note is now a column in it, so a note containing a pipe would split into
 * a phantom field and silently corrupt every parse of that row.
 */
describe('llms.txt and llms-full.txt', () => {
  const FIELDS = 7;

  it('gives every tool a note that cannot break the pipe format', () => {
    const offenders = LIVE_TOOL_CATALOG.filter(
      (tool) =>
        !tool.notes.trim() ||
        tool.notes.includes('|') ||
        /[\r\n]/u.test(tool.notes),
    ).map((tool) => tool.id);
    expect(offenders).toEqual([]);
  });

  it('carries what each tool does, not a category restatement', () => {
    const rows = buildLlmsFullTxt()
      .split('\n')
      .filter((line) => line && !line.startsWith('#'));

    expect(rows).toHaveLength(LIVE_TOOL_CATALOG.length);
    for (const row of rows) {
      expect(row.split(' | ')).toHaveLength(FIELDS);
    }

    // Spot the whole catalog rather than a sample: a note dropped for one tool
    // is a tool an assistant stops recommending, and nothing else would notice.
    for (const tool of LIVE_TOOL_CATALOG) {
      const row = rows.find((line) => line.startsWith(`${tool.id} | `));
      expect(row, tool.id).toBeDefined();
      expect(row, tool.id).toContain(` | ${tool.notes}`);
    }
  });

  it('describes its featured tools in /llms.txt the same way', () => {
    const lines = buildLlmsTxt().split('\n');
    const featured = lines
      .slice(lines.indexOf('## Featured tools') + 1)
      .filter((line) => line.startsWith('- ['));

    expect(featured.length).toBeGreaterThan(0);
    for (const line of featured) {
      const tool = LIVE_TOOL_CATALOG.find((entry) =>
        line.startsWith(`- [${entry.name}](`),
      );
      expect(tool, line).toBeDefined();
      // The note itself, not the category dressed up as a description.
      expect(line, tool?.id).toContain(`: ${tool?.notes}`);
      expect(line, tool?.id).not.toContain('in-browser');
    }
  });
});
