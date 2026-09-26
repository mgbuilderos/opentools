import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  findForbiddenCompetitors,
  findUnsourcedPriceClaims,
} from '@/lib/policy/competitor-names';

const projectRoot = path.resolve(import.meta.dirname, '../..');
const guardedRoots = [
  path.join(projectRoot, 'lib/tools'),
  /*
    The command bar's whole claim is that a sentence typed into it does not leave
    the tab. That is a claim about this directory: it reads a generated index and
    computes, and the only URL it builds is a GitHub issue link somebody has to
    click. Guarding it here is what makes the claim checkable rather than stated.
  */
  path.join(projectRoot, 'lib/command'),
  path.join(projectRoot, 'workers'),
  path.join(projectRoot, 'components'),
  path.join(projectRoot, 'app'),
];
const forbiddenNetworkPrimitives = [
  /\bfetch\s*\(/u,
  /\bXMLHttpRequest\b/u,
  /\bWebSocket\s*\(/u,
  /\bEventSource\s*\(/u,
  /\bsendBeacon\s*\(/u,
  /\bRTCPeerConnection\b/u,
  /\bRTCDataChannel\b/u,
  /https?:\/\//u,
];

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const absolute = path.join(directory, entry);
    if (statSync(absolute).isDirectory()) return sourceFiles(absolute);
    if (!/\.(ts|tsx)$/u.test(entry) || entry.endsWith('.test.ts')) return [];
    return [absolute];
  });
}

describe('local tool source policy', () => {
  it('contains no direct network primitive or remote URL', () => {
    const guardedFiles = [
      ...guardedRoots.flatMap(sourceFiles),
      path.join(projectRoot, 'proxy.ts'),
    ];
    const violations = guardedFiles.flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      return forbiddenNetworkPrimitives
        .filter((pattern) => pattern.test(source))
        .map(
          (pattern) =>
            `${path.relative(projectRoot, file)} matched ${pattern.source}`,
        );
    });

    expect(violations).toEqual([]);
  });

  it('uses document navigation instead of client RSC fetching', () => {
    const clientFiles = [
      path.join(projectRoot, 'components'),
      path.join(projectRoot, 'app'),
    ].flatMap(sourceFiles);
    const violations = clientFiles
      .filter((file) => readFileSync(file, 'utf8').includes("'next/link'"))
      .map((file) => path.relative(projectRoot, file));

    expect(violations).toEqual([]);
  });

  it('does not present an unproved zero-upload result claim', () => {
    const guardedFiles = guardedRoots.flatMap(sourceFiles);
    const forbiddenReleaseClaims = [
      /Nothing (?:was|is) uploaded/iu,
      /0\s*(?:B|bytes?)\s+(?:of\s+)?(?:file\s+)?(?:data\s+)?uploaded/iu,
      /0\s+file bytes uploaded/iu,
    ];
    const violations = guardedFiles.flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      return forbiddenReleaseClaims
        .filter((pattern) => pattern.test(source))
        .map(
          (pattern) =>
            `${path.relative(projectRoot, file)} matched ${pattern.source}`,
        );
    });

    expect(violations).toEqual([]);
  });

  it('uses support language instead of donation language', () => {
    const interfaceFiles = [
      path.join(projectRoot, 'components'),
      path.join(projectRoot, 'app'),
    ].flatMap(sourceFiles);
    const violations = interfaceFiles
      .filter((file) =>
        /\bdonat(?:e|ion|ions|ing)\b/iu.test(readFileSync(file, 'utf8')),
      )
      .map((file) => path.relative(projectRoot, file));

    expect(violations).toEqual([]);
  });

  it('contains no forbidden competitor names in user-facing UI copy', () => {
    const interfaceFiles = [
      path.join(projectRoot, 'components'),
      path.join(projectRoot, 'app'),
    ].flatMap(sourceFiles);
    const violations = interfaceFiles.flatMap((file) =>
      findForbiddenCompetitors(
        readFileSync(file, 'utf8'),
        path.relative(projectRoot, file),
      ),
    );

    expect(violations).toEqual([]);
  });

  it('attributes no price to anybody but us', () => {
    /*
     * The companion to the name check, and the one that would have caught what
     * the name check missed. On 2026-09-25 four shipped tool pages named eight
     * companies and eight prices — none of which this repository has any
     * measurement of — and the nine-name list in force that day matched none of
     * them. A list of names can only forbid the companies somebody already
     * thought of; this forbids the construction.
     */
    const interfaceFiles = [
      path.join(projectRoot, 'components'),
      path.join(projectRoot, 'app'),
    ].flatMap(sourceFiles);

    const violations = interfaceFiles.flatMap((file) =>
      findUnsourcedPriceClaims(
        readFileSync(file, 'utf8'),
        path.relative(projectRoot, file),
      ),
    );

    expect(violations).toEqual([]);
  });

  it('marks every current result-download surface for the value receipt', () => {
    const downloadSurfaces = [
      'components/text-workbench-tool.tsx',
      'components/tool-workspace.tsx',
      'components/utility-tools.tsx',
      'components/structured-tools.tsx',
      'components/file-workbench-tool.tsx',
      'components/schema-workbench-tool.tsx',
      'components/pdf-merge-tool.tsx',
      'components/pdf-extract-tool.tsx',
      'components/images-to-pdf-tool.tsx',
      'components/image-optimize-tool.tsx',
    ];
    const missing = downloadSurfaces.filter(
      (relativePath) =>
        !readFileSync(path.join(projectRoot, relativePath), 'utf8').includes(
          'data-receipt-download',
        ),
    );

    expect(missing).toEqual([]);
  });

  it('keeps categories in navigation and equal task cards in the main workspace', () => {
    const shell = readFileSync(
      path.join(projectRoot, 'components/app-shell.tsx'),
      'utf8',
    );
    const home = readFileSync(
      path.join(projectRoot, 'components/home-workspace.tsx'),
      'utf8',
    );
    expect(shell).toContain('aria-label="Tool categories"');
    expect(shell).toContain('onCategorySelect(group.id)');
    expect(shell).not.toContain('<ToolLinkCard');
    // Was `toolDestinationsForGroup(selectedGroup)`, whose only remaining use
    // was a `_destinations` binding nothing read -- so this line passed on dead
    // code and would have passed a workspace rendering category links instead
    // of task cards. Assert the render it is actually about.
    expect(home).toContain('section.visibleDestinations.map(');
    expect(home).toContain('data-design="equal-tool-hierarchy"');
    expect(home).toContain('<ToolLinkCard');
    expect(shell).toContain('showModal()');
    expect(shell).toContain('contains(document.activeElement)');
  });

  it('leaves native downloads and other work accessible during optional support', () => {
    const source = readFileSync(
      path.join(projectRoot, 'components/completion-value-dialog.tsx'),
      'utf8',
    );
    expect(source).not.toContain('preventDefault()');
    expect(source).not.toContain('stopPropagation()');
    expect(source).not.toContain('showModal()');
    expect(source).not.toContain('.click()');
    expect(source).toContain('aria-modal="false"');
    expect(source).toContain('SUPPORT_PREFERENCE_KEY');
    expect(source).toContain('href="/support"');
    expect(source).toContain('rel="noopener noreferrer"');
  });

  /**
   * The milestone card is the second surface that can ask for money, and it
   * drifted precisely because no test named it. It opened a full-screen modal
   * out of the `tool-executed` handler — the same call that dispatches the
   * receipt's event — so on the fiftieth run it covered the page before the
   * person could click Save, and it ignored the preference the receipt
   * writes, asking people who had said "don't ask again". Both are checked
   * here, against the same rules the receipt is held to.
   */
  it('leaves the page usable during the milestone ask, and shares its budget', () => {
    const source = readFileSync(
      path.join(projectRoot, 'components/milestone-modal.tsx'),
      'utf8',
    );
    expect(source).not.toContain('preventDefault()');
    expect(source).not.toContain('stopPropagation()');
    expect(source).not.toContain('showModal()');
    expect(source).not.toContain('.click()');
    expect(source).toContain('aria-modal="false"');
    // A full-bleed backdrop is how the blocking version covered the page.
    expect(source).not.toContain('fixed inset-0');
    // Deciding on the completion event is what stole the receipt's moment.
    expect(source).not.toContain("'tool-executed'");
    expect(source).toContain('mayOfferSupport');
    expect(source).toContain('SUPPORT_PREFERENCE_KEY');
    expect(source).toContain('rel="noopener noreferrer"');
    /*
     * The deferring runs one way (owner decision, 2026-09-19): a milestone
     * yields to a recent receipt ask, and never costs the receipt one. The
     * receipt converts better, so writing `lastOffered` here would trade the
     * stronger surface for the weaker one. Being shown once ever is what
     * stops this card repeating, and that is the celebrated list. The single
     * permitted write records someone pressing "Don't ask again", which is an
     * instruction to both surfaces rather than a budget this one spent.
     */
    expect(source.match(/supportPreference\(/gu) ?? []).toHaveLength(1);
    expect(source).toContain('supportPreference(Date.now(), true)');
    // Lint was disabled for this whole file while it carried all of the above.
    expect(source).not.toContain('oxlint-disable');
  });

  it('keeps focus and success product chrome monochrome', () => {
    const styles = readFileSync(
      path.join(projectRoot, 'app/globals.css'),
      'utf8',
    );

    expect(styles).not.toMatch(/#175cd3|#78a9ff|#16794b|#55d89b/iu);
    expect(styles).toContain('--ring: #16a34a');
    expect(styles).toContain('--success: #16a34a');
    expect(styles).toContain('--ring: #22c55e');
    expect(styles).toContain('--success: #22c55e');
  });
});
