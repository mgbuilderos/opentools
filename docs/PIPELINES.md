# Pipelines and recipe links

Most real work is not one operation. It is: split the PDF, compress each page,
strip the metadata, zip the result. Every tool here ran one step at a time; the
pieces for chaining existed in `lib/pipeline/` but the only way to build a chain
was to append whichever operation the bench happened to have selected, with
whatever settings it happened to hold at that moment, and no way to change
either afterwards. This note records what chaining is now, and what a shared
link is allowed to contain.

## The chain

`lib/pipeline/chain.ts` holds one rule: whether operation B can take what
operation A produces. Text flows into a text input; files flow into a `file` or
`files` input; an operation that takes no input generates its own and can only
open a chain.

The rule lives alone because two callers need it for opposite reasons.
`validate` asks afterwards, to refuse a chain someone has built.
`lib/pipeline/suggest.ts` asks beforehand, so the editor offers only the
operations that can legally come next. If those two ever disagreed, the editor
would offer a step the validator then rejected, and the chain would be
unbuildable by the only route a person has to build it. `suggest.test.ts`
asserts the agreement directly: every candidate the picker offers is run through
`validate`, and must come back clean.

That filter is what makes the catalogue usable. Picking step 4 unaided from over
a thousand operations means guessing at shapes you cannot see; picking it from
the few hundred that can actually follow step 3 is an ordinary choice. The
editor says which number it is showing, so the filtering is visible rather than
mysterious.

## What a recipe link carries

A recipe link reopens the bench with someone else's **steps** already in place.
The recipient brings their own file. This is Pillar 3 of
`ORGANIC_GROWTH_PLAYBOOK_CORRECTED.md`, and it is content-free by construction.

`lib/pipeline/recipe.ts` encodes:

```
/batch?s1=document.pdf-split&s1.pages=1-3&s2=file-workbench.zip
```

Operation ids, their sources, and the values of parameters whose descriptor
declares `serialisable: true`. Nothing else, enforced two ways: `sanitisePipeline`
strips non-serialisable settings before encoding, and the encoder then iterates
the *descriptor's* declared parameters rather than the step's own keys, so a
value no descriptor declares cannot be written even if a caller passes it. A
refactor of either lock alone cannot open the door. `recipe.test.ts` asserts it
against a step whose parameters include a filename, a bank account number and an
API key.

**The pipeline name is not carried.** It is free text the sender typed, and
people name pipelines after what they are working on — "Novak contract
redaction", "mum's passport scans". The recipient gets a name derived from the
steps instead. The earlier implementation put the whole pipeline JSON, name and
all, into a query parameter; this is the substantive privacy change here, not a
formatting one.

A setting still on its default is left out and restored from the descriptor on
arrival, which keeps the link to the settings someone actually chose. The cost
is accepted and real: if a default changes, an older link follows the new one.

### Why it is spelled out

`?s1=document.pdf-split` rather than a compressed blob, for the reason
`lib/tools/recipe-link.ts` gives: a recipient is meant to read a link before
trusting it, and a URL nobody can read is not inspectable. It also ships no
compression, because `pako` is a new dependency, ADR-004 wants a licence review
first, and the playbook rules it out by name. Every id and source in the kernel
matches `[A-Za-z0-9-]+`, so nothing needs escaping to stay legible.

A link is capped at 24 steps and reports when it passes ~1,800 characters, where
URLs stop surviving the apps people paste them into. Past that, export JSON.

### Arriving

A link does not silently rewrite the bench. The steps are listed, with their
settings, next to the note that no file came with the link and none can; the
chain loads only when the recipient accepts it. Settings a link cannot carry are
named, because those steps run on their defaults. Answering the link clears its
keys from the address bar.

Anything unreadable refuses the **whole** link and says why — an operation this
version does not have, a gap in the step numbering, a chain the validator
rejects. A single tool's settings can be dropped one at a time and leave the
tool on a sane default, but silently running four of someone's five steps
produces a wrong result that looks right.

Links in the older whole-JSON format still open. Nothing writes that form any
more, and the name such a link carries is discarded rather than trusted.
