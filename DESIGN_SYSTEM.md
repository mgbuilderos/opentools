# Operator v1 design system

Status: enforced in source and production prebuild  
Visual direction: classical, monochrome, compact, local-first utility software

## Hierarchy

The category drawer has two levels only:

1. Categories, ordered by the evidence prior in `lib/tools/catalog.ts`.
2. Equal task destinations.

A workspace is an implementation detail, not a stronger visual rank. If one
workspace implements multiple tasks, its `searchEntries` replace the workspace
card in the category view. Therefore Merge PDF, Extract PDF pages, Rotate PDF,
Delete PDF pages, and PDF watermark all use the same `ToolLinkCard` component.

## Typography

| Role | Size | Weight | Line height | Tracking |
| --- | ---: | ---: | ---: | ---: |
| Page title | 30–36 px | 600 | 1.1 | -0.04 em |
| Section title | 20–24 px | 600 | 1.2 | -0.03 em |
| Card/tool title | 14–16 px | 600 | 1.25 | -0.01 em |
| Body | 14–16 px | 400 | 1.5–1.75 | normal |
| Label | 12 px | 600 | 1.33 | normal |
| Eyebrow | 11 px | 600 | 16 px | 0.12 em uppercase |
| Data/code | contextual | 400–600 | contextual | tabular/monospace |

The product uses the operating-system sans stack and a system monospace stack.
No remote fonts may be added to local-processing routes.

## Surfaces and controls

- Tool content width: 64 rem maximum; app shell: 1,440 px maximum.
- Primary surface: one-pixel semantic border, card background, 14.4 px radius.
- Nested control: one-pixel input border, page background, 11.2 px radius.
- Important controls: 44 px minimum height.
- Spacing is based on a 4 px unit. Default surface padding is 16–24 px.
- Elevation is reserved for transient overlays. Ordinary tools use borders, not shadows.
- Buttons use the shared `Button`; task links use `ToolLinkCard`.
- Tool frames, headings, surfaces, receipts, and future charts use exports from
  `components/ui/tool-system.tsx` or the matching `ds-*` semantic class.

## Color and charts

The only foundation colors are background, foreground, card, muted, border,
input, destructive, and semantic success. Success intentionally resolves to the
foreground color so completion does not introduce decorative green. Focus uses
the foreground ring.

Charts use `--chart-1` through `--chart-5` and `--chart-grid`. Series are
distinguished by value, dash pattern, direct labels, and shape—not color alone.
Every chart must be wrapped in `ChartSurface`, have a visible title, an accessible
summary, tabular numerals, and a data-table alternative for decision-critical data.

## Motion

- Fast feedback: 140 ms.
- Standard state change: 220 ms.
- Drawer: 360 ms; scrim: 280 ms.
- Easing: `cubic-bezier(0.22, 1, 0.36, 1)`.
- Animate transform and opacity only for navigation surfaces.
- `prefers-reduced-motion` reduces all transitions to effectively instant.

## Tool anatomy

Every tool follows the same order:

1. Breadcrumb/eyebrow, title, one-sentence outcome, local-processing status.
2. Source/input surface.
3. Controls with explicit labels, units, defaults, and limits.
4. Primary action with loading, error, and cancellation state when relevant.
5. Validated output or preview.
6. Measured receipt: operation, duration, and up to three bounded metrics.
7. Download/copy action. Optional support appears only on download intent.
8. Capability and release-assurance limits.

No core result may be hidden behind signup, payment, delay, watermark, or a
support prompt.

## Production design gate

`npm run design:qc` checks the active version marker, required tokens and
primitives, equal category hierarchy, shared controls, monochrome utilities,
page-title hierarchy, focusable tool roots, receipt and chart contracts.

`npm run build` has a `prebuild` hook that runs this gate. `npm run qc` also runs
the gate explicitly. A production build stops when the design contract fails.
Human visual comparison, accessibility, responsive, cross-browser, and output
corpus review remain separate release requirements; automation does not approve
production by itself.
