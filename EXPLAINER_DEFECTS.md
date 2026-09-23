# Defects found while writing tool-page explainers

Writing an explainer means reading a tool's engine against its own tests and
running it. That surfaces bugs. They are recorded here rather than fixed,
because the lanes that own those engines would collide with a fix from the
content lane.

Each explainer states the honest behaviour where a visitor would hit it, so the
page is true today even while the defect stands.

Found 2026-09-23 across 60 tools (wave 3). Format:
`tool | file | what is wrong | how it is known`.

## Silent wrong answers — a visitor gets a confident, incorrect result

| Tool | Where | What is wrong | Evidence |
|---|---|---|---|
| robots.txt tester | `lib/tools/web-workbench.ts` | All matching groups are pooled, including `*`, instead of the most specific one winning. `User-agent: *` / `Disallow: /admin` plus `User-agent: Googlebot` / `Allow: /` reports `/admin/page` as **Blocked** for Googlebot. | Parser re-run in isolation |
| robots.txt tester | same | `User-agent:` with no value yields agent `''`, and `requestedAgent.includes('')` is always true, so that group applies to every crawler. | Re-run |
| Birthday countdown | `lib/tools/date-workbench.ts` | The "Count from" box opens on a fixed date, `2026-09-06`, not today. A visitor who does not change it counts from the wrong day. | Default read from source |
| YouTube Tag Workspace | `lib/tools/creator-workbench.ts:919` | `tags()` splits on `/[\s,]+/u` while its own description says "comma/newline-separated". The shipped default `'privacy tools, browser tools, …'` returns `privacy, tools, browser`. Video tags are phrases, so most real input is mangled. | Executed |
| JSON Editor | `lib/tools/structured.ts` (editor path) | `12345678901234567890` → `12345678901234567000`, no warning. The sibling `transformJson` refuses this exact case by name via `assertJsonNumbersAreSafe`; the editor path has no such guard. | Executed |
| JSON Editor | same | `{"d":1E400}` → `{"d": null}` — the value disappears. | Executed |
| Average calculator | `lib/tools/math-workbench.ts` | `parseList` splits on commas, so a pasted `1,000` parses as `1` and `0`. Any column with thousands separators gives a wrong mean. | Executed |
| Compound interest | `lib/tools/finance-workbench.ts` | A blank rate box returns "Future value = starting amount, Growth: 0" rather than an error, because `Number('')` is 0 and passes `finite()`. | Executed |
| Indian phone formatter | `lib/tools/life-admin-workbench.ts` | Leading-zero stripping and the `[6-9]\d{9}` test run independently, so an 11-digit landline `080…` becomes `8026001234`, passes, and is reformatted as a mobile. | Re-run |
| JSON path tester | `lib/tools/developer-workbench.ts` | Existence uses `token in current`, which reaches `Object.prototype`. `$.constructor` and `$.toString` "resolve"; `$.users.length` returns a value not in the document. | Re-run |
| Audio trimmer | `lib/tools/creator-workbench.ts` ~L1063–1081 | `decodePcmWav` branches for 16/8/24 bit only and sets `val = 0` otherwise, while the `audioFormat !== 1` guard lets 32-bit **integer** PCM through — so it decodes to silence with no error. `/audio/convert` is unaffected: `lib/tools/audio/wav.ts` `readSamples` has a width whitelist and refuses by name. | Both paths read |
| HTML to Markdown | `lib/tools/document-workbench.ts` | Deletes text after a bare `<`: `a < b > c end` → `a  c end`. Also decodes entities unconditionally, so deliberately escaped markup comes back live. | Executed |
| CSV deduplicator | `lib/tools/spreadsheet-workbench.ts` | Key-column field defaults to `'score'`, a sample-data column, so any real CSV fails with `Unknown column: score.` until the box is cleared. | Executed |
| Ratio calculator | `lib/tools/math-workbench.ts` | `gcd` takes absolute values but the division keeps each sign, so `-12, -18` gives `-2:-3` instead of `2:3`. | Re-run |
| Canonical URL builder | `lib/tools/web-workbench.ts` | `required()` is called inside `absoluteUrl`'s `try`, so a blank box and a >200,000-character URL both report "URL must be an absolute HTTP(S) URL." The length message is unreachable. | Read + run |

## Wrong file written to disk

`SpreadsheetOperation` declares no `outputExtension`, so the shared download
helper saves CSV and XML output as `.txt` with `text/plain`. Affects at least
`csv-column-selector`, `csv-deduplicator`, `csv-merger`, `csv-sorter`,
`csv-filter`, `csv-column-renamer` and `sitemap-generator`
(`sitemap-generator.txt`). QR operations do set it, so the pattern is
intentional elsewhere.

## Messages a visitor cannot act on

- The shared `finite()` / `positive()` helpers interpolate raw bounds and the
  internal field id: `halfLife must be a finite number from 5e-324 to
  1.7976931348623157e+308.` Affects SIP, pH, ideal weight, CAGR, decay,
  compound interest, dilution and every other caller.
- No singular form: "1 complete years", "1 days", "1 URLs", "1 characters",
  "1 unique tags".
- Case slips mid-sentence: "Enter an ifsc first.", "Enter a pin code first.",
  "content must be at most 8000 characters."
- SERP errors say "URL" while the field is labelled "Display URL"; compound
  interest gives two differently worded messages for the same frequency field.

## Description does not match behaviour

- Instagram caption formatter's description (`creator-workbench.ts:98`,
  mirrored in `browse/creator.ts:169`) promises characters, words **and
  hashtags**; `countReport` reports characters and words only.
- YouTube description template inserts a bar with
  `values.chapters.replace(/^(\S+)\s+/gmu, '$1 | ')`, so a line already in the
  sibling Chapter Generator's `00:00 | Intro` form becomes `00:00 | | Intro`
  and fails validation.
- CSV column renamer reports rename-line numbers after `.filter(Boolean)`, so
  the number does not match the box; a duplicate old-name rename is silently
  dropped by `Object.fromEntries`.
- Recurring Deposit compounds monthly at rate ÷ 12, sharing the SIP code path.
  Indian banks conventionally compound RDs quarterly, so it will not match a
  bank quote.
- Markdown to HTML double-spaces fenced code blocks, and inline backticks do
  not protect their contents — a backticked link becomes a real anchor inside
  the code element.
- Email QR writes spaces as `+` via `URLSearchParams.toString()`; RFC 6068 does
  not define `+` as a space, so some mail apps show literal plus signs. The
  neighbouring SMS case correctly uses `encodeURIComponent`.
- PIN code validator is `/^[1-9]\d{5}$/` on shape alone: it admits a leading 9
  (Army Postal Service series in the real numbering plan) and strips spaces but
  not hyphens, so `5 6 0 0 3 8` matches while `560-038` does not.
- Image editor applies the flip in the picture's own axes **before** the
  rotation, so after a quarter turn "Flip H" mirrors the visible result
  top-to-bottom.

## No test coverage at all

`sms-qr-code`, `phone-qr-code`, `instagram-caption-formatter` and
`youtube-title-length-checker` have no test of their own. Everything written
about them came from executing the engine, not from a pinned test.
