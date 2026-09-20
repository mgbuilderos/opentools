# The growth finding: every limit they sell is a limit we cannot have

2026-09-20. Written in answer to "think like a growth marketer — what more is
needed *in this tool* to make it more attractive to the user".

**This is not in `ORGANIC_GROWTH_PLAYBOOK.md`, and I checked before writing it.**
That playbook is about traffic and donations — extension listings, directory
submissions, the relief-moment ask, guide consolidation. This is a different
axis: what the tools themselves can do. Nothing here duplicates it.

## What the competition actually sells

I went looking for what the big free PDF sites put behind their paywall,
because that is the most honest available answer to "what do people pay for" —
it is what their own pricing team concluded people would pay for.

| | Free | Paid |
|---|---|---|
| **Smallpdf** | **2 tasks per day**, 5 MB file cap | ~$9–12/month: unlimited tasks, 5 GB files, **batch processing** |
| **iLovePDF** | 25 MB file cap, batch limited tool-by-tool | ~$4/month: size caps removed, **batch processing** unlocked |

Three things are gated, and they are the same three at both companies:

1. **Batch processing**
2. **File size**
3. **Number of jobs per day** — Smallpdf allows *two*

## Why this matters more than it looks

**Every one of those three limits exists because they pay for servers.**

Their cost scales with the megabytes uploaded, the files processed and the CPU
seconds burned. So they meter exactly those things. The paywall is not a
product decision, it is their cost structure showing through.

**Our cost does not scale with any of them.** The work happens on the visitor's
own laptop. A 2 GB file costs us precisely what a 2 KB file costs us: nothing.
The fiftieth file in a batch costs the same as the first. A user running two
hundred jobs in a day costs the same as one running two.

So we are not "the cheaper option". **We are structurally incapable of having
the limits they charge to remove.** That is a much stronger position than a
lower price, and it is not a marketing claim — it is arithmetic about where the
computation happens, and anyone can verify it by pulling out the network cable.

The line writes itself: *they charge per page because pages cost them money.
Your laptop doesn't charge you per page.*

## The problem: we are currently throwing this away

We do not exploit the one advantage we cannot lose. Most of our tools take
**one file at a time**, which voluntarily matches the limitation our
competitors charge to remove — while we have none of their costs.

Tools that already accept many files: PDF merge, images-to-PDF, Bates
numbering, archive, MP3 toolkit, file-to-HTML, exact-size, file workbench.

**Tools that take one file and should not:**

| Tool | The real job it is failing |
|---|---|
| `/image/optimize` | A photographer has a shoot, not a photo |
| `/image/metadata` | Stripping GPS from one holiday photo is rare; stripping it from a folder before publishing is the actual job |
| `/pdf/compress` | Compressing one PDF is a chore; compressing a case bundle is the work |
| `/documents/metadata` | Cleaning author details from a folder before it leaves the firm |
| `/image/svg` | Designers have icon sets, not icons |
| `/pdf/to-word` | Rarely one document |
| `/audio/convert` | Rarely one file |

Batch is also the cheapest feature on the list to build, because the engines are
already pure functions over bytes. What is missing is a loop, a progress
indicator, and a "download all as ZIP" — and we already have a ZIP writer.

### And we impose some caps of our own, for no reason

Found while auditing this:

- `/documents/metadata` refused files over 50 MB and **told the user "the
  browser limit is 50 MB"**. There is no such browser limit — it was a constant
  someone picked. Fixed in `c947d30`; the guard stays, honestly described.
- `/image/exact-size` caps at 20 files, `/pdf/images-to-pdf` at 40. Neither
  explains why. They may be sensible, but an unexplained cap on a site whose
  whole pitch is "no limits, because there is no server" is worth revisiting.
- `/image/editor`'s 64-megapixel ceiling is a **real** canvas limit and should
  stay exactly as it is.

## What to do about it, in order

1. **Add batch to the seven tools above.** Same engine, a loop, a progress
   readout, and one ZIP at the end. This is the single highest-value in-tool
   change available and it is mechanical work, which makes it a good fit for a
   second builder.
2. **Say it on the page.** A tool that quietly accepts 300 files is a feature
   nobody discovers. "No file limit, no daily limit, no queue — the work happens
   on your machine" belongs where the file picker is, on every tool.
3. **Remove or explain the arbitrary caps.**
4. **Show the arithmetic once, properly.** A short page comparing the three
   gated limits against ours, with the reason — their servers, your laptop.
   This is a comparison page that is *true*, which is rare in that genre, and
   it targets the exact query someone types when a free tool has just refused
   their file.

## The thing worth remembering

We have been competing on privacy, which is real and which the research on
professional use confirms is worth money. But privacy is a *reason to trust* a
tool. It is not a reason to *need* it today.

"Your 400 MB file works, and their 25 MB cap doesn't" is a reason to need it
today — and it happens to be the same fact, seen from the other side.
