# File to HTML converter — `/web/file-to-html`

Images in, two things out: an **email package** (a ZIP holding `index.html`,
`README.txt` and the images as separate files) and a **standalone web page**
(one HTML file with the images embedded as `data:` URIs).

They differ because email and the web disagree about embedded images. Gmail,
Outlook, Apple Mail and Yahoo strip or block `data:` URIs, so an email has to
point at hosted files; a web page is easier to hand around as a single file.
The ZIP's `README.txt` says this to whoever opens it.

Built by Antigravity (`b9952db`). Hardened here (`0cd6f74`) and registered into
the catalogue (`ad7a8a9`) — it shipped linked from nowhere.

## The rule this tool lives by

**Its output is code, and the code leaves the machine.** It is pasted into
Mailchimp and sent to a list, or uploaded and served. That makes it different
from every other tool on the site, where the output is a file the user opens
themselves.

So the question is never "could the user hurt themselves here" — they type
their own inputs. It is "what reaches the artefact that travels". A legitimate
`&` in a tracking URL breaks a page exactly as thoroughly as a deliberate
`<script>` does, and both are this tool's problem.

Everything user-supplied is escaped, validated, or refused by name:

| Field                      | Reaches                   | Treatment                                           |
| -------------------------- | ------------------------- | --------------------------------------------------- |
| Title, preheader, alt text | HTML text                 | `escapeHtml`                                        |
| Image path prefix          | `src="…"` attribute       | `escapeHtml`; `..` stripped for the ZIP folder      |
| Link URL                   | `href="…"` attribute      | parsed, limited to http/https/mailto, then escaped  |
| Background colours         | `<style>` and `style="…"` | validated against a colour syntax, else the default |
| Max width                  | CSS lengths               | coerced to a finite number                          |
| Filename                   | ZIP path and `src`        | non-`[\w.-]` replaced, duplicates numbered apart    |

Two notes on why those are the treatments they are.

**Colours are validated, not escaped.** A stylesheet is not an HTML context.
Escaping `#fff;}</style><script>` leaves the nonsense in the file; it would
still have closed the block. A colour field should contain a colour.

**Links are parsed but not rewritten.** `new URL(…).href` normalises, and the
normalised string differs from what was typed — a bare domain comes back with a
trailing slash. A campaign link that no longer matches the one in the
spreadsheet is a support question nobody needs. So the parse decides _whether_
the link is written; what gets written is the string the user typed, escaped.

A link that is refused is **named on the page**. A link that vanishes silently
is found by the recipient, not the sender.

## What was wrong, and how it was found

Six defects, none covered by the ten tests the tool arrived with — those tested
the happy path. All six were found by running the code against adversarial
input, not by reading it.

1. **`encodeURI` re-encoded `%`.** `?utm_content=spring%20sale` went out as
   `spring%2520sale` and led nowhere. Email marketing is the stated use case
   and UTM parameters are how it is measured, so this is the one that would
   have cost real money.
2. **`encodeURI` was also the only check**, and it leaves `javascript:` alone.
3. **The image path prefix broke out of the `src` attribute** — `"><script>`
   put a live script tag in the downloaded file.
4. **Either colour field closed the `<style>` block**, in both outputs.
5. **Two files named `logo.png` were written to one ZIP path** and given one
   `src`, so the second image silently stood in for the first.
6. **`Math.max(320, NaN)` is `NaN`**, which shipped as `max-width: NaNpx`.

**None of this ever executed in our own page.** The preview iframe carries
`sandbox="allow-same-origin"` with **no** `allow-scripts`, so scripts do not
run in it. `allow-same-origin` is needed — the preview swaps in `blob:` URLs
from the parent, which an opaque-origin iframe cannot read — and it is safe
only for as long as `allow-scripts` stays off. **Do not add it.**

## The golden file

`lib/tools/html/__fixtures__/golden-email-package.zip` is a package checked once
by tools that are not ours, then committed.

- Python's `zipfile` — CRC of every entry, no path climbing out of the
  extraction directory, each stored image byte-identical to its source.
- Python's `html.parser` — both outputs parse; **zero `<script>` elements**
  despite markup in the title, the alt text and the image path; the title
  decodes back to exactly `Spring <Sale> & "Savings"`; one `<a>` for three
  images, because the `javascript:` link was refused.

The committed bytes are what makes that verdict portable: `converter.test.ts`
compares against them on any machine, with no Python installed. This is the
same discipline as `lib/tools/video/__fixtures__` — see `docs/VIDEO_SPIKE.md`.

**Regenerating it is not a formatting step.** If the output changes, the new
bytes have not been approved by anything. Re-run the outside checks above
before committing a replacement, and say in the commit message what approved
it.

## How a PDF becomes HTML

The PDF never reaches `convertFilesToHtml`, which refuses anything that is not
an image. `components/file-to-html-tool.tsx` spots the PDF first and calls
`renderPdfToSlices`, which rasterises each page to a PNG at `scale = 2` and
hands those in as ordinary images named `<file>_page_<n>.png`. So a 200x100pt
page becomes a 400x200px image.

That also means the PDF path **only exists in a browser** — it needs a canvas.
It cannot be covered by a unit test, which is part of why it went untested.

## Known gaps

- **The PDF path is thin, but it does work.** It had no test of any kind when
  it arrived -- no unit test, no e2e test, no fixture -- while the page title,
  the meta description and the file picker all promised multi-page PDFs. It is
  covered now (`e2e/file-to-html.spec.ts`), and the claim holds: a two-page PDF
  comes out as two PNGs, one per page, in order.
  What is still thin is everything around the happy path. An encrypted PDF, a
  PDF with no pages, and a very large PDF are all untested, and a page is
  rasterised at `scale = 2` with no cap, so a big document will produce big
  canvases.
- **The preview pairs images by position.** The email template emits exactly
  one `src` per slice, in order; a test pins that. A second `src` in the
  template would silently pair the wrong image with the wrong row.
