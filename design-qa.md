# Design QA — left category drawer and fluid motion

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
