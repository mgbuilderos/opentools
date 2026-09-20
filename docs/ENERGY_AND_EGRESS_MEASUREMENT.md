# What in-browser processing actually saves

**Measured 2026-09-20 against `https://getopentools.com`, version
`4a48bea0-aebb-4d7d-a15a-2a44aa6acbeb`.** This document exists because the
question "does local processing save electricity?" deserved a number rather
than an assertion, and because the answer turned out to be more awkward than
the question implied.

## 1. What is measured, and holds

The egress proof (`e2e/egress-proof.spec.ts`) passed **6 of 6 against the
deployed site**, in Chromium and WebKit:

- the served policy forbids network connections
- every attempt to send data out is refused
- a real file goes through a real tool without leaving the device

So the file-data claim is not modelled, it is observed: **zero bytes of user
file data are put on the wire.** Re-run it with:

```
npx playwright test --config playwright.production.config.ts
```

## 2. What a tool page costs to load

Measured over the wire, compressed, first visit:

| Page | HTML | Assets | Total |
|---|---|---|---|
| `/pdf/merge` | 59 KB | 21 files, 1,348 KB | **1,407 KB** |
| `/image/optimize` | 61 KB | 20 files, 1,376 KB | **1,436 KB** |
| `/math/workbench` | 61 KB | 18 files, 1,339 KB | **1,400 KB** |

This is a cost on our side, paid once and then cached. A cloud tool pays a
comparable page cost *and* moves the file.

## 3. The energy question, answered honestly

A cloud tool moves the file up and the result back; we move neither. The
avoided transfer is therefore about twice the file size per operation.

Converting bytes to energy is where the honesty has to be applied. The best
peer-reviewed anchor is Aslan et al. 2018 (*Journal of Industrial Ecology*),
which puts internet transmission at **0.06 kWh/GB for 2015** and documents the
intensity roughly halving every two years. Extrapolated to 2026 that is about
**0.0013 kWh/GB** — an extrapolation, not a measurement. The same literature
review notes published estimates diverge by up to **four orders of magnitude**
(0.0064 to 136 kWh/GB), so any single number is a choice, not a fact.

Carrying both ends through:

| File | A cloud tool moves | Energy avoided |
|---|---|---|
| 1 MB | 2 MB | 0.003 – 0.12 Wh |
| 10 MB | 20 MB | 0.026 – 1.17 Wh |
| 25 MB | 50 MB | 0.065 – 2.93 Wh |

For scale, charging a phone is roughly 10–15 Wh.

At the site's measured traffic (1,597 real browser requests in the 24h to
2026-09-20), **if every one of them were a 10 MB operation** — which they are
not — the range would be 0.04–1.9 kWh/day, or 15–683 kWh/year.

## 4. The conclusion, which is not the one we wanted

**The saving is real and the headline is weak.** The low end of a defensible
range is a fraction of a phone charge per file, and the range spans 45x. Under
this repository's own rule — never claim a measured fact that a test does not
substantiate — an energy or carbon headline cannot ship. It would be the
easiest claim on the site to attack, on a site whose whole credibility rests on
claims that survive attack.

What survives attack is section 1: **the file never leaves the device, proven
against production, in two browsers, by a command anyone can run.** That is the
rarer claim and the defensible one. Energy belongs in a footnote, with the
range and the citation, or not at all.

## 5. Two defects found in the proof itself

1. **Fixed.** `SAME_ORIGIN` defaulted to `http://localhost:8788` while
   `playwright.production.config.ts` pointed the browser at the deployed site,
   so every real request scored as off-origin and the documented command failed
   4 of 6. The origin now comes from the config actually in use.
2. **Open.** `isOffOrigin` compares hosts with `String.includes`, so a host such
   as `getopentools.com.example.net` would be read as same-origin and a real
   exfiltration to it would not be counted. Not changed here: tightening the
   comparison changes the security semantics of a passing proof, and that should
   be a deliberate decision rather than a side effect of a measurement task.

## Sources

- Aslan et al. (2018), *Electricity Intensity of Internet Data Transmission:
  Untangling the Estimates*, Journal of Industrial Ecology.
  https://onlinelibrary.wiley.com/doi/10.1111/jiec.12630
- Coroama & Hilty (2014), *Assessing Internet energy intensity: A review of
  methods and results*, Environmental Impact Assessment Review.
