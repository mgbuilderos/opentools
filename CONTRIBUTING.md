# Contributing to OpenTools

Thanks for helping build private, local-first browser tools. Every contribution
must keep the core promise: **user data never leaves the browser.**

## Ground rules

1. **No network egress from tools.** No `fetch`, `XMLHttpRequest`,
   `WebSocket`, `sendBeacon`, remote scripts, or remote images in tool code.
   The local-source policy tests and the production CSP (`connect-src 'none'`)
   enforce this.
2. **No analytics, telemetry, ads, session replay, or third-party embeds** —
   anywhere in the app.
3. **No silent remote fallback.** If a browser cannot run a tool, show a clear
   error.
4. **Never gate a result** behind signup, payment, delay, or watermark. Support
   prompts stay optional and non-blocking.
5. **MIT-compatible dependencies only.** Check the license before adding a
   package; copyleft (GPL/AGPL) code cannot be bundled. Record it in
   `THIRD_PARTY_NOTICES.md` and run `npm run sbom`.
6. **Semantic design tokens only.** Use `bg-background`, `text-foreground`,
   `bg-success`, `border-border`, `text-muted-foreground`, etc. — no raw hex or
   arbitrary palette colors. `npm run design:qc` enforces this.

## Development

```bash
npm install
npm run dev        # local dev server
npm run test       # Vitest suite
npm run qc         # full quality gate — must pass before opening a PR
```

Requires Node.js >= 22.13.0.

## Adding a tool

1. Add or extend a manifest in `lib/tools/catalog.ts`.
2. Put pure logic in `lib/tools/` and heavy work in a Web Worker under
   `workers/`.
3. Add tests for valid, empty, malformed, oversized, and cancelled inputs.
4. Reuse the shared workbench components in `components/` and emit the
   completion receipt via `lib/completion.ts`.
5. Run `npm run qc`.

## Pull requests

- Keep PRs focused; one tool or fix per PR.
- Fill in the PR template's zero-egress checklist.
- Use [Conventional Commits](https://www.conventionalcommits.org/)
  (`feat(pdf): …`, `fix(image): …`).
- CI must be green.

## Security

Report privacy or security issues privately — see
[`.github/SECURITY.md`](.github/SECURITY.md). Do not open public issues for
them.

By contributing, you agree your contributions are licensed under the
[MIT License](LICENSE).
