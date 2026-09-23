# Brief: write tool-page explainers for OpenTools

Paste everything below this line into Antigravity as the opening message.

---

## Who you are and what this repo is

You are writing the on-page explanatory content for **getopentools.com**, a
suite of ~1,300 browser tools that run entirely on the visitor's own machine.
No file, no text, and no setting ever leaves the browser. The site's
Content-Security-Policy sets `connect-src 'none'` on tool routes, which means
the browser itself refuses to let those pages make a network request. That is a
structural guarantee, not a promise, and it is the single most important fact
about this product.

Work in:

```
all-in-one-browser-tools-blueprint/apps/claude-milestone
```

Stack: a Next.js-compatible framework (`vinext`) on Cloudflare Workers,
TypeScript, Vitest, Playwright. Every route is prerendered to a static asset at
build time.

## The job

**508 live tool pages have no hand-written explainer.** They currently render
30–120 words of generic boilerplate, which is why they do not rank: an audit on
2026-09-21 measured two guides from unrelated categories and found **671 of 721
words, 93.1%, verbatim identical and in the same order**. Google had crawled all
of them and ranked none. Near-duplicate pages do not place, and they cannibalise
each other.

Your job is to write, for each of those 508 tools, an entry in one map:

```ts
// lib/seo/guide-content.ts  — the map starts at line 166
const GUIDE_DETAILS: Readonly<Record<string, GuideDetail>> = { ... }

export interface GuideDetail {
  directAnswer: string;      // 50–90 words
  leadParagraph: string;     // 130–220 words
  faqs: readonly GuideFaq[]; // 4–5 entries
}
export interface GuideFaq { question: string; answer: string }
```

The key is the tool's **slug**. 60 entries already exist — leave every one of
them exactly as it is.

That content is rendered by `components/tool-explainer.tsx`, which also emits
`FAQPage` JSON-LD. The FAQs are therefore what answer engines (Google's AI
Overviews, ChatGPT, Perplexity) read and quote. Write them to be quotable
standing alone, with no "as mentioned above".

## Get your worklist

```bash
node scripts/explainer-worklist.mjs --count            # how many are left
node scripts/explainer-worklist.mjs --batch 1 --size 40 # the first 40
```

TSV columns: `slug`, `id`, `name`, `category`, `rank`, `destinationUrl`.

The list is derived from the catalogue and from `DIFFERENTIATED_GUIDE_SLUGS`, so
it shrinks by itself as you commit. It is ordered by each tool's rank **within**
its category, so batch 1 is the strongest tool in fifteen different categories.
If you stop half way, every category is still covered at its top. Work
batch 1, 2, 3 … in order. 13 batches of 40.

## The one rule that matters

**Every factual sentence you write must be traceable to source you have read in
this repository.** Not to the tool's name, not to what a tool like this usually
does, not to a reasonable assumption.

For each tool, before writing a word:

1. Open the route file for its `destinationUrl` (e.g. `/developer/json-editor`
   → `app/developer/json-editor/page.tsx`).
2. Open the component it renders, and the engine module under `lib/tools/`
   that actually does the work.
3. **Open that engine's `.test.ts` file.** This is where the real material is.
   The tests state the exact limits, the exact error strings, the edge cases
   someone already hit, and the guarantees that are actually enforced. A limit
   you found in a test is a fact. A limit you inferred is a liability.

Harvest and use, in the visitor's own words:

- The real size limit and the exact message shown when it is exceeded
  (`"This candidate limits CSV files to 20 MB."`).
- The exact accepted file extensions and MIME types from the file picker.
- The exact error strings — quote them, so a person who hit one can search for
  it and land on your page. This is a real ranking channel.
- What the tool deliberately does **not** do, and why that is the right call.
- Defaults and what they mean.
- Genuine failure modes and browser differences.

If you cannot find the answer in source, do not write the sentence.

## Quality bar — one complete worked example

This is a real entry from the file. Match this density. Note how much of it is
specific quantities, literal quoted strings, and named refusals.

```ts
  // lib/tools/structured.ts (parseCsvRows, csvToRecords, csvToJson),
  // lib/tools/structured.test.ts, components/structured-tools.tsx
  // (CsvToJsonTool, EditorPair) and app/data/csv-to-json/page.tsx
  'spreadsheet-and-data-csv-to-json': {
    directAnswer:
      'Paste a CSV into the box, or choose a .csv file of up to 20 MB, then press Convert to JSON. The first row becomes the keys, every later row becomes one object, and the result is a JSON array printed with two-space indentation that you can copy or download as converted.json. Every value arrives as a JSON string, because nothing here is read as a number, a date or a boolean.',
    leadParagraph:
      'This turns a comma-separated file into an array of JSON objects, one object per row, keyed by the header names in the first row. Values are carried through as text from parse to output — the page says so in its own footer, "Values remain strings by design" — so a postcode with a leading zero and a sixteen-digit account number come out with every character they went in with. The parser is strict rather than forgiving: every column needs a non-empty header, headers must be unique, and each row must carry exactly as many fields as there are headers, or the run stops and names the row. Fields are separated by commas only, so a semicolon-separated export reads as a single column and there is no setting to change the separator. The file picker accepts .csv up to 20 MB; the paste box has no character limit of its own, so a very large paste is bounded only by what the tab can hold.',
    faqs: [
      {
        question: 'Does it convert numbers, dates and true or false values?',
        answer:
          'No, and that is the point. Every cell becomes a JSON string, so 007 stays 007, a long account or order number keeps all of its digits, and a value such as 1-2 is not turned into a date. Type coercion is where a CSV quietly loses information, because a value that is too long to be held exactly as a number comes back changed; the JSON tools in the same file refuse an integer outside the exact range rather than round it, which is the same hazard seen from the other side. Cast the values yourself afterwards, column by column, where you can see what you are deciding.',
      },
      {
        question:
          'How does it handle quotes, commas and line breaks inside a field?',
        answer:
          'It follows the usual CSV quoting rules. A field that begins with a double quote is read as quoted and may hold commas and line breaks, and two double quotes inside it mean one literal double quote. A double quote that appears after other characters in the same field is kept as an ordinary character rather than opening a quoted section. An opening quote that is never closed stops the run with "CSV contains an unclosed quoted field." A test in this repository parses a file with a quoted comma, a doubled quote and a line break inside a field, and requires all three back intact.',
      },
      {
        question: 'Why was my file refused?',
        answer:
          'Three named checks reject a file. An empty cell anywhere in the first row gives "Every CSV column needs a header in the first row.", which usually means the export began with a title line or a blank column. Two identical headers give "CSV headers must be unique before conversion.", because a duplicate key would silently overwrite a column. A row with the wrong number of fields gives its row number and both counts, for example "Row 2 has 1 columns; expected 2." Nothing is padded or discarded to make a ragged file fit.',
      },
      {
        question: 'What happens to blank lines and to a byte-order mark?',
        answer:
          'A byte-order mark at the very start of the file is removed before parsing, and blank lines at the end of the file are dropped. A blank line in the middle is not: in a file with more than one column it counts as a row holding one empty field, and it is refused with the row number like any other short row. Delete the stray line and run it again.',
      },
      {
        question: 'What are the limits, and what does the download contain?',
        answer:
          'The file picker accepts .csv or text/csv and stops at 20 MB with "This candidate limits CSV files to 20 MB." The download button writes the JSON you see to a file named converted.json as UTF-8 JSON, and the result panel reports how many rows and columns were converted. The file is written from the page to your own disk; nothing is posted anywhere.',
      },
    ],
  },
```

Read three more from `lib/seo/guide-content.ts` before you start — pick ones in
categories you are about to write — then stop reading exemplars. The file is
209 KB; re-reading all of it for every batch is the single biggest waste in this
project and you do not need it.

## House style

- **British spelling.** "normalise", "colour", "organisation", "behaviour".
- **Plain, specific, unexcited.** Say what it does and what it refuses to do.
- **No marketing language.** Banned: "seamless", "effortless", "powerful",
  "unleash", "game-changing", "cutting-edge", "revolutionary", "simply",
  "just", "blazing fast", "in seconds", "world-class", "robust", "leverage".
- **No competitor names, ever.** A test enforces this and will fail your build:
  `lib/seo/live-tools.test.ts` scans every shipped `.ts`/`.tsx`/`.mjs` under
  `app/`, `components/`, `scripts/` and `workers/` for
  `smallpdf|ilovepdf|pdf24|tinypng|sejda|pdf2go|stirlingpdf|acrobat`. Owner
  decision, 2026-09-18. File-format references such as `xmlns:adobe` in SVG
  cleanup are specification names, not competitor mentions, and stay.
- **No em dashes in `directAnswer`.** They are fine in the lead paragraph.
- **No LaTeX, no markdown** inside these strings. Plain prose only.
- **Escape a backtick inside a TypeScript template literal as `` \` ``** or the
  build breaks. Prefer ordinary single-quoted strings; write an apostrophe as
  `\x27` where the surrounding quoting needs it, as the existing entries do.
- **Above each entry, leave a comment naming the files you read.** Every
  existing entry has one. It is how the next person checks your work:

  ```ts
  // lib/tools/structured.ts (parseCsvRows, csvToRecords, csvToJson),
  // lib/tools/structured.test.ts, components/structured-tools.tsx
  // (CsvToJsonTool, EditorPair) and app/data/csv-to-json/page.tsx
  ```

## Differentiation — the thing the whole exercise is for

Two entries in different categories must not read as the same page with the
nouns swapped. A test measures this: `lib/seo/guide-differentiation.test.ts`
computes pairwise Jaccard similarity over content words and **ratchets** — the
measured ceiling is currently **0.47**, down from 0.9925, and it may only fall.
If your batch pushes similarity up, the suite fails.

The way to stay under it is not synonyms. It is to write about facts that are
true of *this* tool and false of the others: its own limit, its own error
strings, its own format quirks, its own refusals.

## Workflow per batch

```bash
node scripts/explainer-worklist.mjs --batch N --size 40   # take the list
# ... read source + tests for each tool, write the 40 entries ...
npx oxfmt lib/seo/guide-content.ts
npx tsc --noEmit
npx vitest run lib/seo/
npm run qc                       # 8 checks
```

Then commit, staging **only** the content file, by explicit path:

```bash
git add lib/seo/guide-content.ts
git commit -m "content(seo): explainers for batch N tool pages"
```

**Read the exit code, not the summary line.** A push has already gone out here
on a run that printed "1605 passed" and exited 1.

## Ground rules for the repository

- Work on your own branch in your own worktree:
  `git worktree add ../antigravity-explainers -b antigravity/explainers origin/main`
- **`lib/seo/guide-content.ts` is yours alone** for the duration. It is 209 KB
  and every other lane has been told to stay off it. Do not edit anything else
  except to add the comment lines above your entries.
- **Never run `git checkout main`.** `main` is checked out in another worktree,
  so that command fails — and if it is the left side of a `||`, the fallback
  runs against your own branch instead. A `git reset --hard` in exactly that
  situation destroyed 17 commits here once. To publish: `git push origin
  HEAD:main` after `git fetch origin && git rebase origin/main`.
- **Never use bare `git stash` / `git stash pop`.** The stash stack is shared
  across ~38 worktrees and other agents are using it.
- **Paths containing `[tool]` are shell globs.** Quote them or a loop skips
  them silently.
- **Do not deploy.** Deploys are the owner's call. Push to `main` and stop.

## If you find a bug

You will. Reading engines against their tests surfaces real defects — the last
pass over 60 tools found more than 20, including a PDF-to-Word converter that
hard-codes A4 page size (`w:pgSz 11906x16838`) and an audio trimmer that decodes
32-bit integer PCM to silence.

Do **not** fix them. Write the honest limitation into the FAQ if a visitor would
hit it, and append a line to `EXPLAINER_DEFECTS.md` at the repo root:

```
<slug> | <file:line> | <what is wrong> | <how you know>
```

Fixing engine code from this lane would collide with the lanes that own it.

## Definition of done

`node scripts/explainer-worklist.mjs --count` prints `0`, `npm run qc` passes
8/8, the full suite passes with **exit code 0**, and every new entry has its
source-files comment above it.

## What is already handled — do not duplicate it

All 512 `/convert/` pages already have FAQ content, generated at build time from
the converter's own measured output by `PairQuestions` in
`components/math-workbench-tool.tsx`. They are excluded from the worklist.
Do not write entries for them.
