# The command bar

_Added 2026-09-26. Not deployed at the time of writing._

One text box on the home page. You type what you want done — "make this under
2MB and strip my name out of it" — and it answers with the tools that do it, in
order, or says that this site cannot.

It is read on the device. Not as a policy: every page here is served with
`Content-Security-Policy: connect-src 'none'` (`public/_headers`), and
`e2e/egress-proof.spec.ts` fails if a page opens a connection, so there is no
request to make. `lib/tools/local-source-policy.test.ts` now guards
`lib/command/` alongside `lib/tools`, which fails the build on a `fetch(`, a
`WebSocket`, or an `https://` literal anywhere in it.

## Why a box at all

The site has **1,367 live tool routes in 21 categories**. Someone who knows what
they want done and not what it is called here has to guess which category holds
it. Search Console on 2026-09-23 showed the shape of that problem from the other
side: the queries this site ranks for are tasks, and the pages are named after
tools.

The box collapses the catalogue to one entry point without removing anything:
the categories, the dropzone and the 1,367 pages are all still there, and every
answer the box gives is a link to one of them.

## What it is made of

| File | What it holds |
| --- | --- |
| `lib/command/catalogue.generated.ts` | Every live tool, as a name, an address, its match words and the kernel operation that runs it. Generated. |
| `lib/command/build-catalogue.ts` | How that file is built, out of the registries the pages themselves read. Node only, like `meta-inventory.ts`. |
| `lib/command/tokens.ts` | The one way words are cut up, on both sides of the match. |
| `lib/command/parse.ts` | Splits a sentence into one clause per job, and reads sizes, dimensions, direction and subject out of it. |
| `lib/command/lexicon.ts` | The bridges from how people talk to how the catalogue is written. |
| `lib/command/limits.ts` | What this site cannot do, and why, in three groups. |
| `lib/command/match.ts` | Ranks the catalogue against a clause. |
| `lib/command/plan.ts` | Assembles steps, chains them, and reports the gaps. |
| `components/command-bar.tsx` | The box. Imports the index on the first keystroke. |

Regenerate the index with:

```sh
npx tsx scripts/generate-command-index.mjs
```

`lib/command/catalogue.test.ts` fails when it drifts from the registries, the
same arrangement `lib/tools/browse.test.ts` has.

## The index, and why it is this small

Measured on this tree: **1,376 entries in 194 KB of JSON**, which the edge serves
as about **35 KB of Brotli** — roughly 25 bytes per tool. It is imported
dynamically on the first keystroke, so the home page itself carries none of it.

Three decisions got it there, each of which cost nothing in reach:

- **No descriptions, only their words.** A description is prose for the tool's own
  page. Keeping it here cost 96 KB for no extra reach: 632 of the entries are
  `/convert` pages whose description is their name with " in your browser."
  after it.
- **An alias that is another tool's name is not an alias.** A workbench declares
  its aliases as its operations' names, and `/batch` declares all 640 of the
  kernel's. Left in, the batch runner was the best match for "sha-256", and those
  aliases were 55 KB.
- **An operation's id is its address.** The stored `op` is `"<source> <input>
  <output>"`; the id is the last segment of the route. 16 KB, and
  `catalogue.test.ts` checks all 639 against the kernel manifest.

## How a sentence is read

There is no model. `parse.ts` knows conjunctions, sizes, dimensions, a
conversion's direction, and what kind of thing the sentence is about. Everything
else is ranking.

Ranking is by **inverse document frequency**, because counting matched words does
not work on this catalogue: `convert` is in 52% of the names and `to` in 50%,
since 632 pages are called "Convert X to Y". A word is worth what it narrows, so
`heic` (nine entries) all but settles a question and `browser` settles nothing.

Four things the plain version got wrong, each now a comment where it was fixed:

- **A number is not a word the catalogue must contain.** "5 miles to km" asked the
  index to account for `5` and the right page reached 0.56 coverage for not
  containing a five.
- **A word no tool contains is not free.** "Fix my grammar" is `fix` and
  `grammar`; there is no grammar checker here, and dropping the unknown word left
  `fix` alone and the subtitle workbench as the answer. An unknown word now stays
  in the denominator, so nothing can cover a sentence containing one — and
  `limits.ts` gets to answer instead.
- **The tool and the doing of it are the same word.** This site says "JSON
  formatter"; people type "format this json". `SAME_WORD` in `tokens.ts` is the
  thirty-odd agent nouns this catalogue actually uses, and `parse.test.ts` fails
  if a pair there is not a word some tool is really called.
- **Direction is not a word.** "png to webp" and "webp to png" are the same words
  and different pages, so the ordered pair is read on both sides — from the title,
  the abbreviation in brackets, and the slug, which is the only place `psi` appears
  on `/convert/psi-to-bar`.

## Saying no

This is the part that matters most, and the reason the module exists as much as
the matching does. A catalogue of 1,367 tools contains a Pig Latin translator, a
Morse translator, a Braille translator and a NATO one, so "translate this to
Spanish" has four confident matches and not one of them translates anything into
Spanish. Ranking cannot fix that. Only knowing what is absent can.

`limits.ts` holds three kinds of no:

- **`no-network`** — it would need a server: emailing it, putting it in Drive,
  fetching a URL, today's exchange rate, your IP address. This is the one class
  that will not change while `connect-src 'none'` is the point of the site.
- **`no-model`** — it would need a language model: translating, proofreading,
  paraphrasing, explaining, generating a picture.
- **`not-a-tool`** — a plain gap. These are the ones worth reporting, and the plan
  offers a prefilled `tool_request.yml` issue. Only the clause travels, only if
  the person clicks, and GitHub shows them the form before anything is filed.

A rule marked `decisive` answers even when the catalogue matched, because the
match is known to be wrong. Every other rule speaks only when nothing matched, so
it cannot hide a tool that exists.

Two tests keep that honest, and both earned their place by finding something:

- `limits.test.ts` runs every non-decisive phrase through the matcher and fails if
  one already had a confident answer. It found eight: "explain this" was being
  answered with the cron expression parser, "what does this mean" with the average
  calculator, and "make it sound" with the sound-intensity calculator. Each of
  those is a real match on a real word, and none of them is the thing being asked
  for; they are decisive refusals now.
- No decisive phrase may appear inside a tool's name. That found "to pound" — a
  pound is a unit of mass, and pounds per square inch a unit of pressure, both
  ratios fixed by definition — and a bare "bitcoin", which is a QR code generator
  here and needs no rate at all.

## Chaining

Where the steps are operations the kernel can run and the kinds line up, the plan
builds a `lib/pipeline` pipeline and hands it to `/batch?pipeline=…`, which the
pipeline editor already reads. Nothing new runs anything: the batch runner
validates the chain again, against the real kernel, before it starts.

`plan.test.ts` puts what the box builds through `deserialisePipeline` and
`validate` — the code the batch runner really uses — so a chain it would reject
cannot be offered as a button.

This is also how ten operations that have **no page at all** became reachable:
`pdfcrypt-decrypt` unlocks a PDF, `email-parse-mbox` reads a mailbox,
`finance-reconcile` checks a statement's totals, and each is indexed at
`/batch?tool=<id>` and handed over as a pipeline of one. Before this, "remove the
password from this pdf" was answered with the AES-GCM file encryptor: a different
thing, done backwards.

## What it does not do yet

- **It does not know what you dropped.** `components/smart-dropzone.tsx` detects a
  dropped file's kind and the plan accepts a `subject`, but the two are not wired
  together, because `detectInput` does not return the kind it matched. Until they
  are, "make this under 2MB" with no words about the file is answered for the kind
  that ranks first, and says so in a note rather than pretending otherwise.
- **It reads one language.** Every phrase in `lexicon.ts` and `limits.ts` is
  English.
- **It cannot resolve a pronoun across a sentence** beyond carrying the last
  subject forward. "Deduplicate this csv then sort it" works; "open the second one"
  does not.
- **A vague clause gets a vague answer.** "Count the rows" has no row counter to
  find, so it lands on a neighbouring spreadsheet tool with the alternatives beside
  it.
