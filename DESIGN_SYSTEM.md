# OpenTools Operator v1 Design System

## 1. System Overview & Design Ethos

OpenTools is built as the **Center of Excellence for 100% Private, Zero-Egress In-Browser Utilities**. The **Operator v1 Design System** provides a strict, cohesive, distraction-free visual language tailored for technical operators, developers, creators, researchers, and power users.

### Core Tenets
1. **Monochrome Precision**: High-contrast, monochromatic palette prioritizing functional clarity over decorative excess.
2. **Zero-Egress Transparency**: Privacy and execution invariants (WASM, Web Workers, Device RAM, 0 Bytes Egress) are visibly celebrated and verifiable.
3. **Deterministic Predictability**: Strict typography hierarchy, standard 2-column card action grids, and uniform button weighting across all views (Home, Workbenches, Guides, Blog, Vault/Templates, Support, and Roadmap).
4. **Instant Usability**: High-speed, client-side execution with responsive keyboard accessibility and focus rings.

---

## 2. Color Palette & Token Scale

The palette uses CSS variables mapped to Tailwind utility tokens, ensuring seamless transitions between Light and Dark themes with WCAG AAA contrast ratios.

### Color Tokens

| Token | Light Mode (Hex / HSL) | Dark Mode (Hex / HSL) | Usage |
| :--- | :--- | :--- | :--- |
| `bg-background` | `#FFFFFF` (Pure White) | `#000000` (Pure Black) | Canvas / App shell background |
| `bg-card` | `#FFFFFF` | `#090D16` / `#0C0F17` | Cards, tool panels, interactive containers |
| `bg-muted` | `#F1F5F9` (Slate 100) | `#1E293B` (Slate 800) | Badges, pills, secondary surfaces |
| `text-foreground` | `#0F172A` (Slate 900) | `#FFFFFF` (Pure White) | Headings, primary text, active states |
| `text-muted-foreground` | `#64748B` (Slate 500) | `#94A3B8` (Slate 400) | Descriptions, metadata, timestamps |
| `border-border` | `#E2E8F0` (Slate 200) | `#1E293B` (Slate 800) | Structural card borders, dividers |
| `text-success` / `bg-success` | `#10B981` (Emerald 500) | `#34D399` (Emerald 400) | 0 Bytes Egress badges, verified states |
| `text-warning` | `#F59E0B` (Amber 500) | `#FBBF24` (Amber 400) | Notice alerts, advisory notes |
| `text-destructive` | `#EF4444` (Red 500) | `#F87171` (Red 400) | Form errors, destructive actions |

---

## 3. Typography Hierarchy

OpenTools utilizes a two-tier typography architecture:
- **UI Sans-Serif** (`Inter`, `-apple-system`, `system-ui`): For all structural headings, body text, and prose.
- **Monospace** (`JetBrains Mono`, `SF Mono`, `ui-monospace`): For execution mode badges, metrics, formulas, code, timestamps, and audit output.

### Heading & Body Scale

| Element | Class Name | Line Height / Weight | Context / Usage |
| :--- | :--- | :--- | :--- |
| **Page H1** | `text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl` | Tight / Bold (700) | Page titles (Hero sections, Blog directory, Guides, Vault) |
| **Section H2** | `text-2xl font-bold tracking-tight sm:text-3xl` | Tight / Bold (700) | Main section dividers, featured article titles |
| **Card H3** | `text-base font-semibold leading-snug text-foreground` | Snug / SemiBold (600) | Individual utility cards, blog post cards, template items |
| **Lead Paragraph** | `text-base leading-7 text-muted-foreground sm:text-lg` | Leading-7 / Normal (400) | Hero subtitles, intro copy |
| **Body Copy** | `text-sm text-foreground` | Leading-6 / Normal (400) | Workbench instructions, guide explanations, dialog copy |
| **Card Description** | `text-xs leading-5 text-muted-foreground line-clamp-3` | Leading-5 / Normal (400) | Summary descriptions in catalog and guide grids |
| **Badge / Tag** | `font-mono text-[10px] uppercase tracking-wider` | Monospace / Medium (500) | Category identifiers, WASM/JS badges, reading times |

---

## 4. Button & CTA Hierarchy

A strictly disciplined button hierarchy guarantees that primary conversion actions always take visual precedence.

### Hierarchy Classes

```tsx
// Primary CTA: Solid Black in Light Mode / Solid White in Dark Mode
buttonVariants({ variant: 'default', size: 'sm' })
// Output classes: bg-primary text-primary-foreground hover:bg-primary/90

// Secondary Action: Clean 1px Outline with subtle hover
buttonVariants({ variant: 'outline', size: 'sm' })
// Output classes: border border-input bg-background hover:bg-muted hover:text-accent-foreground

// Tertiary / Subtle Action: Ghost button
buttonVariants({ variant: 'ghost', size: 'sm' })
// Output classes: hover:bg-accent hover:text-accent-foreground
```

### Button Usage Rules
1. **Read Article / View Details**: Always renders with `variant: 'default'` (solid black) to establish strong visual anchor.
2. **Open Tool / Launch Workbench**: In Guide & Blog directories, pairs with the primary CTA in a balanced 2-column grid.
3. **Execute / Run Locally**: Workbench execution triggers use `variant: 'default'` with prominent full-width or dedicated action bar layout.

---

## 5. Card & Grid Layout Specifications

All directory cards across Guides, Blog, and Open-Source Vault/Templates follow a uniform grid structure:

```tsx
<article className="flex flex-col justify-between rounded-xl border bg-card p-5 transition-colors hover:border-foreground/40">
  {/* Header: Category Badge + Execution Metadata */}
  <div>
    <div className="flex items-center justify-between gap-2 mb-2">
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {category}
      </span>
      <span className="rounded-full border bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
        {metadata}
      </span>
    </div>

    {/* Title & Description */}
    <h3 className="text-base font-semibold leading-snug text-foreground">
      <a href={slugHref} className="hover:underline">{title}</a>
    </h3>
    <p className="mt-2 text-xs leading-5 text-muted-foreground line-clamp-3">
      {summary}
    </p>
  </div>

  {/* Card Action Row: 2-Column Equal Grid */}
  <div className="mt-5 grid grid-cols-2 gap-2 border-t pt-4">
    <a
      href={primaryHref}
      className={cn(buttonVariants({ variant: 'default', size: 'sm' }), 'h-9 w-full text-xs font-semibold gap-1')}
    >
      {primaryLabel}
      <ArrowRight className="size-3" />
    </a>
    <a
      href={secondaryHref}
      className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'h-9 w-full text-xs font-medium')}
    >
      {secondaryLabel}
    </a>
  </div>
</article>
```

---

## 6. Zero-Egress Invariants & Audit UI

Every utility on OpenTools adheres to strict privacy and execution invariants:

- **Zero Cloud Egress**: 100% of user data, uploaded files, and calculated parameters are processed exclusively in client-side RAM, Web Workers, or WebAssembly instances.
- **Client-Side Verification**: Built-in cryptographic hashing (SHA-256) and deterministic verification ensure local execution integrity.
- **Audit Terminal**: Interactive audit terminal enables users to inspect memory allocation, execution duration, and cryptographic receipts in real time.
- **No Telemetry / No Tracking**: No third-party analytics trackers, cookies, or cloud payload relays.

---

## 7. Quality Control & Continuous Verification

All additions to OpenTools must pass 8 automated quality control gates before deployment:
1. **Type Check**: `npm run typecheck` (`tsc --noEmit`) — Zero TypeScript errors.
2. **Formatting**: `npm run format:check` (`prettier --check`) — 100% compliant formatting.
3. **Linting**: `npm run lint` (`oxlint` / `eslint`) — Clean static analysis.
4. **Unit Test Suite**: `npm test` (`vitest run`) — 34 test suites, 315+ tests 100% passing.
5. **Operation QC**: `lib/tools/all-operations-qc.test.ts` — Validates all 595 workbench operations run without runtime failures.
6. **Catalog QC**: `lib/tools/catalog.test.ts` — Validates all 645 search destinations are unique and resolve to working operations.
7. **Production Build**: `npm run build` — Next.js static / SSR bundle generation.
8. **Deployment Gate**: Cloudflare Workers deployment via OpenNext.
