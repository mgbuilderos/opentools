## Summary

<!-- What changed and why. Link the issue: Closes #123 -->

## Type

- [ ] Bug fix
- [ ] New tool / operation
- [ ] Improvement to an existing tool
- [ ] Docs / tooling

## Zero-egress checklist

- [ ] No new `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, `EventSource`, or remote `<script>`/`<img>` in tool code.
- [ ] No analytics, telemetry, tracking, or third-party embeds.
- [ ] No remote fallback — failure is shown to the user, not silently sent to a server.
- [ ] New dependencies (if any) are MIT-compatible and listed in `THIRD_PARTY_NOTICES.md`; SBOM regenerated with `npm run sbom`.
- [ ] Any one-time model/asset download is disclosed in the UI and carries no user data.

## Quality checklist

- [ ] `npm run qc` passes locally.
- [ ] Tests cover empty, malformed, oversized, and cancelled inputs for new operations.
- [ ] UI uses semantic Tailwind tokens (`bg-background`, `text-foreground`, `border-border`, …) — `npm run design:qc` passes.
- [ ] Keyboard and screen-reader accessible.

## Screenshots / verification

<!-- Before/after, or the exact steps you ran. -->
