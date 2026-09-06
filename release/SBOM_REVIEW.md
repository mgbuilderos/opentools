# Software bill of materials review

Generated: 2026-09-06  
Artifact: `sbom.cdx.json`  
Status: engineering inventory complete; qualified license approval open

## Reproduce

From `apps/web`:

```text
npm run sbom
npm audit --audit-level=moderate
```

`npm run sbom` invokes the checked-in `scripts/generate-sbom.mjs`, which asks npm for a package-lock-based CycloneDX 1.5 document. The checked-in artifact currently contains 428 components and 429 dependency-graph nodes. Every component has package version and declared license metadata. The 2026-09-06 npm audit reported zero known vulnerabilities at moderate-or-higher severity.

## What this proves

- The exact locked JavaScript dependency graph can be inventoried reproducibly.
- Direct, development, optional and transitive packages are visible to review.
- Package-declared license identifiers are present in the machine-readable artifact.

It does **not** prove that every package is shipped in the final deployment, that every package declaration is correct, that every required notice is present, or that legal obligations have been approved.

## Open release work

Before public distribution, a qualified reviewer must:

1. Filter the graph against the exact deployment archive and distinguish runtime, build-only, optional and platform-specific components.
2. Collect and verify the applicable license texts, notices, source-offer requirements and attribution for shipped components.
3. Review the graph entries carrying LGPL-3.0-or-later, MPL-2.0, CC-BY-4.0 and compound license expressions, including platform-specific image binaries.
4. Review non-package assets, worker bundles and generated output independently; package metadata does not cover all artifacts.
5. Select and approve the first-party source license and reconcile it with `THIRD_PARTY_NOTICES.md`.
6. Re-run the SBOM, audit and artifact comparison for the exact public-release commit.

Until those actions are signed off, WC-003 remains a blocker and this file must not be represented as legal clearance.
