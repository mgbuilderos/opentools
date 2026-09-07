# Design QA — Operator v1 equal task hierarchy

Date: 2026-09-07

## Solid-background-remover tranche check

- Rendered route: `http://localhost:3011/image/background-remover?tool=solid-background-remover`.
- The focused route uses the existing monochrome Operator v1 editor shell and
  labels the capability as a plain-color remover, not AI subject detection.
- The left drawer remains closed by default. Opening it reports 12 categories;
  selecting Images replaces that list with exactly eight equal-ranked actions.
  Solid background remover appears as its own card and links back to the focused
  route.
- Accessibility state exposes labeled image selection, crop and adjustment
  controls, a checked plain-background option, background color, tolerance and
  softness controls, PNG output by default, and a disabled JPEG option because
  JPEG cannot preserve transparency.
- The empty route and category drill-in were checked in the in-app browser. A
  real file-selection/output journey was not performed in this pass; the pixel
  transformation is covered by unit tests and the existing image pipeline's
  decoded-output tests.
- Full QC passed with 27 test files / 244 tests and a 36-route production build.

No actionable P0, P1 or P2 visual issue was found in this tranche.

## Images-to-PDF tranche check

- Rendered route: `http://localhost:3011/pdf/images-to-pdf`.
- The empty state, upload surface, header, privacy badge and footer use the
  existing monochrome Operator v1 contracts; no new color, font, radius or
  promotional pattern was introduced.
- The left drawer remains closed by default. Opening it reports 12 categories;
  selecting PDF replaces that list with exactly nine equal-ranked actions.
  Images to PDF appears third with the shared 36 px monochrome icon well.
- Job-language search for `jpg to pdf` returns the new working route as the sole
  result.
- Accessibility state exposes a labeled multi-file control, a separately labeled
  drop-zone button, semantic headings, and the existing keyboard-safe drawer.
- Full QC passed with 27 test files / 241 tests and a 35-route production build.

No actionable P0, P1 or P2 visual issue was found in this tranche.

## Current comparison target

- Source visual truth: `/var/folders/8m/vptdd2nn261fmf5g1f_p9_x80000gp/T/TemporaryItems/NSIRD_screencaptureui_lJY8lQ/Screenshot 2026-09-07 at 2.08.07 AM.png`
- Source pixels: 2940 × 1912, desktop screenshot including browser and Codex chrome.
- Implementation: `http://localhost:3011/pdf/page-tools`, PDF drawer open after selecting PDF.
- Implementation capture: 842 × 775 CSS pixels at device scale factor 1, recaptured in the Codex in-app browser after the icon pass.
- State: light theme, drawer open, PDF selected, empty PDF tool behind the scrim.
- Normalization: comparison focused on the app-owned 432 px drawer region. Browser/Codex chrome and the source screenshot’s larger density were excluded from hierarchy judgment.

## Current full-view comparison evidence

The source clearly exposes the defect: Merge PDF and Extract PDF pages are large
workspace cards, while Rotate, Reorder, Delete, Page numbers, Watermark and
Metadata are visually subordinate rows inside a “PDF page tools” parent. The
revised implementation removes the parent card from category navigation and
renders eight task destinations as identical bordered cards with the same title,
description, icon well, chevron, spacing, hover/focus behavior, and minimum height.

The category level remains separate and stronger, as intended. The tool canvas
behind the drawer, monochrome scrim, top bar, left origin, and closed-by-default
behavior are unchanged.

## Current focused-region comparison evidence

Both the supplied screenshot and the revised drawer capture were opened during
this QA pass. In the focused PDF list, card left/right padding, inter-card gaps,
title weight, description line height, border value, radius, and chevron position
are uniform. “PDF page tools” no longer appears as a competing destination.
The accessibility tree reports eight PDF links in the intended order and gives
each link its task name plus description. The rendered capture shows a quiet
36 px monochrome icon well on every task; Merge, Extract, Rotate, Reorder,
Delete, Page numbers, Watermark, and Metadata use distinct operation glyphs.

## Required fidelity surfaces — current pass

- Fonts and typography: system sans/mono stacks remain local. All task titles
  use 14 px/600 with -0.01 em tracking; descriptions use 12 px/20 px. Category
  and page hierarchy remain visibly distinct.
- Spacing and layout rhythm: every task card uses the same 72 px minimum height,
  16 px horizontal padding, 12 px vertical padding, 8 px list gap, and shared
  radius/border. The list scrolls without horizontal clipping.
- Colors and visual tokens: all hierarchy surfaces use semantic black, white,
  gray, border, focus, and foreground-success tokens. No green or decorative
  gradient was introduced.
- Image quality and assets: this state contains no raster imagery. Icons come
  from the existing Lucide set at a consistent 16 px optical size and 1.75 px
  stroke; no placeholder, emoji, or custom-drawn asset was added.
- Copy and content: task labels are direct and parallel. Descriptions explain the
  output rather than the implementation parent workspace.

## Current findings

No actionable P0, P1, or P2 issue remains for the requested equal hierarchy.

## Current comparison history

1. Source: mixed large workspace cards plus subordinate page-tool rows. P1
   hierarchy mismatch because equivalent jobs were presented unequally.
2. Fix: introduced `toolDestinationsForGroup` and the shared `ToolLinkCard`;
   category views now replace multi-operation workspace cards with their task
   destinations.
3. Post-fix capture: eight equal PDF cards rendered in the in-app browser; the
   accessibility tree confirmed unique working destinations and correct order.
4. Icon refinement: each equal card received the shared monochrome icon well.
   The recapture preserved hierarchy, spacing, labeling, focus semantics, and
   PDF-only category content; no new P0/P1/P2 issue was introduced.

## Current implementation checklist

- [x] Equalize standalone and shared-workbench task destinations.
- [x] Remove parent-workspace hierarchy from category drill-ins.
- [x] Add reusable tool-card, page, heading, surface, receipt, and chart contracts.
- [x] Add one consistent task icon treatment without creating a second hierarchy.
- [x] Add typography, spacing, surface, motion, and monochrome chart tokens.
- [x] Add a blocking automated design gate to prebuild and full QC.
- [x] Pass visual, accessibility-tree, design-gate, lint, type, unit, and build checks.

## Current follow-up polish

Formal 320 px, dark-mode, assistive-technology, and cross-browser capture remains
part of the independent production release gate; it does not block this scoped
local hierarchy correction.

final result: passed

---

# Prior comparison — left category drawer and fluid motion

Date: 2026-09-06

## Comparison target

- Source visual truth: `/var/folders/8m/vptdd2nn261fmf5g1f_p9_x80000gp/T/TemporaryItems/NSIRD_screencaptureui_fnX06O/Screenshot 2026-09-06 at 6.41.26 PM.png`
- Source role: placement and navigation-orientation reference only. Its green palette, permanent rail, promotional controls, typography, and page content are explicitly excluded by the product brief.
- Implementation screenshot path/URL: `http://localhost:3011/`, captured in the Codex in-app browser with the PDF drill-in open.
- Source pixels: 2940 × 1912 desktop screenshot including browser chrome.
- Implementation capture: 842 × 775 pixels at an 842 × 775 CSS viewport and device scale factor 1.
- Density normalization: no pixel-perfect scale comparison was attempted because the source is a different product and viewport. The comparison was normalized to the requested layout relationship: left-origin navigation, header trigger alignment, drawer edge, content occlusion, and hierarchy.
- State: light theme, drawer open, PDF category selected.

## Full-view comparison evidence

The reference establishes left-origin navigation and a menu control at the left side of the application toolbar. The implementation now places the menu trigger before the product mark and anchors the off-canvas panel to the left edge. Unlike the reference's permanent rail, the implementation remains closed by default and overlays the canvas only when requested, preserving the accepted compact-shell requirement.

The drawer uses a right border and right-cast neutral shadow, matching its left-edge origin. The page behind it remains visible through a restrained monochrome scrim. No green accent, social control, repository link, or support promotion was introduced.

## Focused region comparison evidence

The focused header/drawer region was inspected in two rendered states: the 12-group list and the PDF drill-in. The trigger, panel edge, close control, Back control, group counts, workspace cards, and chevrons align consistently. Text remains readable without collision or clipping at the checked viewport.

The drawer transform is `translateX(-100%) → 0` over 360 ms with a smooth `cubic-bezier(0.22, 1, 0.36, 1)` curve. The scrim fades over 280 ms. Both transitions use transform/opacity only and are disabled under `prefers-reduced-motion`.

## Required fidelity surfaces

- Fonts and typography: existing system stack, weights, line heights, tracking, truncation, and hierarchy are unchanged. No new font request or text-wrap regression was observed.
- Spacing and layout rhythm: the 44 px trigger moved before the mark without changing header height; drawer width, padding, radii, and vertical rhythm remain consistent. Left anchoring, right border, and right-cast shadow are internally coherent.
- Colors and visual tokens: strict black, white, and neutral gray treatment is preserved. The reference's green branding is intentionally excluded.
- Image quality and assets: there are no raster assets in this shell state. Existing Lucide icons remain sharp and consistent; no placeholder, emoji, custom SVG, or CSS-drawn icon was added.
- Copy and content: category, action-count, workspace, privacy, and support language are unchanged. Only placement and motion changed.

## Findings

No actionable P0, P1, or P2 mismatch was found for the requested left-side placement and fluid drawer motion.

## Open questions

- The 360 ms duration intentionally exceeds the earlier 120–180 ms direct-transition guideline because the latest user instruction asks for slower, fluid motion. It should be calibrated with first-party usability feedback if users perceive it as delayed.
- Formal mobile, screen-reader, high-contrast, and cross-browser motion testing remains part of the separate release-QC gate.

## Implementation checklist

- [x] Move menu trigger to the left side of the header.
- [x] Anchor the drawer left and reverse its closed transform.
- [x] Mirror border and shadow direction.
- [x] Use transform/opacity-only eased motion.
- [x] Honor reduced-motion preferences.
- [x] Preserve the grouped default view and category drill-in.
- [x] Verify group and PDF drill-in states in the in-app browser.
- [x] Pass unit, type, lint, and production-build checks.

## Follow-up polish

No P3 change is required for this scoped update.

## Comparison history

This was the first comparison pass. It found no P0/P1/P2 issue, so no visual correction loop was required.

final result: passed
