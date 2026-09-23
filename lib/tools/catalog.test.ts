import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';

import {
  NAVIGATION_MAJOR_SECTIONS,
  publicTools,
  searchTools,
  toolDestinationsForGroup,
  toolGroups,
  toolSubsectionsForGroup,
  toolsForGroup,
} from './catalog';
import { groupIcons } from '@/components/category-icons';
import { isLiveToolUrl } from '../seo/live-tools';

describe('public canary catalog', () => {
  it('contains only complete, uniquely routed tools', () => {
    expect(publicTools.length).toBeGreaterThanOrEqual(33);
    const ids = new Set<string>();
    const routes = new Set<string>();

    for (const tool of publicTools) {
      expect(['public', 'canary']).toContain(tool.status);
      expect(tool.version).toMatch(/^\d+\.\d+\.\d+-(canary|public)$/);
      expect(tool.aliases.length).toBeGreaterThan(0);
      expect(tool.jobs.length).toBeGreaterThan(0);
      if (tool.status === 'canary')
        expect(tool.execution.offlineReady).toBe(false);
      expect(tool.href).toMatch(/^\//);
      expect(
        existsSync(
          path.join(
            import.meta.dirname,
            '../..',
            'app',
            tool.href.split('?')[0]!,
            'page.tsx',
          ),
        ),
      ).toBe(true);
      expect(ids.has(tool.id)).toBe(false);
      expect(routes.has(tool.href)).toBe(false);
      ids.add(tool.id);
      routes.add(tool.href);
    }
  });

  it('routes task language and aliases locally', () => {
    expect(searchTools('combine PDFs').map((tool) => tool.id)).toContain(
      'pdf-merge',
    );
    expect(searchTools('capitalize text').map((tool) => tool.id)).toContain(
      'text-case-converter',
    );
    expect(searchTools('mask aadhaar').map((tool) => tool.id)).toContain(
      'aadhaar-pan-masker',
    );
    expect(searchTools('pan masking').map((tool) => tool.id)).toContain(
      'aadhaar-pan-masker',
    );
    expect(searchTools('unknown future tool')).toEqual([]);
    expect(searchTools('compress image').map((tool) => tool.id)).toContain(
      'image-optimize',
    );
    expect(searchTools('resize image to kb').map((tool) => tool.id)).toContain(
      'image-exact-size',
    );
    expect(searchTools('validate json').map((tool) => tool.id)).toContain(
      'json-format',
    );
    expect(searchTools('split pdf').map((tool) => tool.id)).toContain(
      'pdf-extract',
    );
    expect(searchTools('jpg to pdf').map((tool) => tool.id)).toContain(
      'images-to-pdf',
    );
    expect(searchTools('rotate pdf')[0]?.href).toBe(
      '/pdf/page-tools?tool=rotate-pdf',
    );
    expect(searchTools('image cropper')[0]?.href).toBe(
      '/image/editor?tool=image-cropper',
    );
    expect(searchTools('background remover')[0]?.href).toBe(
      '/image/background-remover?tool=solid-background-remover',
    );
    expect(searchTools('base64 to text').map((tool) => tool.id)).toContain(
      'base64-decode',
    );
    expect(searchTools('sha256 file').map((tool) => tool.id)).toContain(
      'file-hash',
    );
    expect(searchTools('days between dates').map((tool) => tool.id)).toContain(
      'date-difference',
    );
    expect(searchTools('calculate age').map((tool) => tool.id)).toEqual([
      'age-calculator',
    ]);
    expect(searchTools('age').map((tool) => tool.id)).not.toContain(
      'pdf-extract',
    );
  });

  it('assigns every working tool to exactly one compact workspace', () => {
    // This assertion is the point of the test. It used to compute the list
    // below, discard it, and check only the group count -- so a tool could be
    // built, routed and shipped while appearing in no workspace at all, which
    // is exactly what happened to four of them.
    const assignedIds = toolGroups.flatMap((group) =>
      toolsForGroup(group).map((tool) => tool.id),
    );
    const assigned = new Set(assignedIds);

    // The six workbenches that used to be excused here -- Documents, Finance,
    // Science, Creator, Life admin and Planning -- have workspaces now. The
    // owner took that decision on 2026-09-20 after being shown that they, and
    // Video, accounted for 239 live destinations no menu path could reach.
    // There is no exception list any more: a tool in no workspace fails.
    const unassigned = publicTools
      .map((tool) => tool.id)
      .filter((id) => !assigned.has(id));
    expect(
      unassigned,
      `reachable by URL but listed in no workspace: ${unassigned.join(', ')}`,
    ).toEqual([]);

    const duplicated = assignedIds.filter(
      (id, i) => assignedIds.indexOf(id) !== i,
    );
    expect(duplicated, 'listed in more than one workspace').toEqual([]);

    expect(toolGroups).toHaveLength(17);
  });

  it('shows every workspace in the sidebar, with an icon', () => {
    // `video` was a complete group with a live tool, and the sidebar never
    // listed it, because the sidebar renders NAVIGATION_MAJOR_SECTIONS and
    // nothing required a group to appear there. Assigning a tool to a group it
    // could not be navigated to passed every gate for weeks.
    const navIds = NAVIGATION_MAJOR_SECTIONS.flatMap(
      (section) => section.groupCategoryIds,
    );
    const groupIds = toolGroups.map((group) => group.id);

    const missing = groupIds.filter((id) => !navIds.includes(id));
    expect(
      missing,
      `defined as a workspace but absent from the sidebar: ${missing.join(', ')}`,
    ).toEqual([]);

    const unknown = navIds.filter((id) => !groupIds.includes(id));
    expect(unknown, 'listed in the sidebar but not a workspace').toEqual([]);

    const repeated = navIds.filter((id, i) => navIds.indexOf(id) !== i);
    expect(repeated, 'listed in more than one sidebar section').toEqual([]);

    // A group with no icon renders `undefined` as a component and takes the
    // whole sidebar down on first paint.
    const iconless = groupIds.filter((id) => !groupIcons[id]);
    expect(iconless, 'workspace with no sidebar icon').toEqual([]);
  });

  it('leaves no destination reachable by search alone', () => {
    // The count the owner was shown on 2026-09-20: 677 destinations exist and
    // the sidebar reached 438 of them. Search found the rest; browsing did not.
    // 679 after the word cloud generator and ER-diagram-to-SQL converter;
    // 680 after PDF redaction, 682 after the two dedicated OCR destinations,
    // 683 when the PDF metadata viewer joined the PDF workspace, and 684 with
    // the whole-text Aadhaar and PAN masker in the India & life admin group,
    // beside the two single-number maskers it shares its engine with. 721 on
    // 2026-09-23, when the image studio's 34 tools were added: `/image` held
    // thirteen pages against `/pdf`'s nineteen, and image editing is the part
    // of this site a search engine cannot answer inside its own results.
    const everyDestination = publicTools.reduce(
      (total, tool) => total + (tool.searchEntries?.length || 1),
      0,
    );
    const navIds = new Set(
      NAVIGATION_MAJOR_SECTIONS.flatMap((section) => section.groupCategoryIds),
    );
    const reachable = toolGroups
      .filter((group) => navIds.has(group.id))
      .reduce(
        (total, group) => total + toolDestinationsForGroup(group).length,
        0,
      );

    expect(everyDestination).toBe(721);
    expect(reachable).toBe(everyDestination);
  });

  it('keeps the evidence-weighted launch order explicit', () => {
    // Order follows the sidebar's own four sections, so the list a visitor
    // scans and the list the home page tabs render are the same sequence.
    expect(toolGroups.map((group) => group.id)).toEqual([
      'pdf',
      'images',
      'audio',
      'video',
      'documents',
      'files',
      'text-data',
      'spreadsheets',
      'developer-files',
      'web-seo',
      'calculators',
      'dates',
      'finance',
      'science',
      'qr-barcode',
      'creator',
      'life-admin',
    ]);
    expect(toolsForGroup(toolGroups[0]!)[0]?.id).toBe('pdf-merge');

    // Every id that existed before the 2026-09-20 rebuild still resolves,
    // because `/?category=<id>` is a public URL and an unknown one silently
    // falls back to PDF rather than telling anyone it is wrong.
    for (const id of [
      'pdf',
      'images',
      'audio',
      'video',
      'text-data',
      'developer-files',
      'calculators',
      'qr-barcode',
      'web-seo',
    ]) {
      expect(
        toolGroups.some((group) => group.id === id),
        `category URL /?category=${id} no longer resolves`,
      ).toBe(true);
    }
  });

  it('gives every task in a selected category equal destination hierarchy', () => {
    const pdf = toolDestinationsForGroup(toolGroups[0]!);
    expect(pdf.map((destination) => destination.name)).toEqual([
      'Merge PDF',
      'Compress PDF',
      'PDF to Word',
      'OCR PDF',
      'PDF to Excel',
      'Sign and fill PDF',
      'Extract PDF pages',
      'Images to PDF',
      'Rotate PDF',
      'Reorder PDF pages',
      'Delete PDF pages',
      'PDF page numbers',
      'PDF watermark',
      'PDF metadata editor',
      'Bates numbering for PDFs',
      'Redact & Black Out PDF',
      'PDF metadata viewer and remover',
      'Compare PDF Documents Online',
    ]);
    expect(pdf).toHaveLength(18);
    expect(
      pdf.some((destination) => destination.name === 'PDF page tools'),
    ).toBe(false);
    expect(new Set(pdf.map((destination) => destination.href)).size).toBe(18);
  });

  it('puts every destination of a category into exactly one browse section', () => {
    /*
      A section is what a visitor actually clicks. A destination in none of
      them is registered, in the sitemap, linked from its siblings -- and
      absent from the page people browse from.

      Coverage, not a partition: `qr-barcode` puts all 28 of its destinations
      in both of its two sections, which is a separate question from this one
      and not changed here.

      That happened on 2026-09-23: the image studio's section ids were built
      from `operation.section` on one side and typed out on the other, and
      `convert` against `conversion` silently dropped all ten format
      converters. `browse.test.ts` compares the generated files against this
      same function, so it agreed with the mistake. This compares the sections
      against the destinations the group actually has.
    */
    for (const group of toolGroups) {
      const destinations = toolDestinationsForGroup(group).map((d) => d.id);
      const sectioned = new Set(
        toolSubsectionsForGroup(group).flatMap((section) =>
          section.destinations.map((d) => d.id),
        ),
      );
      const unreachable = destinations.filter((id) => !sectioned.has(id));
      expect(
        unreachable,
        `${group.id}: browsable nowhere on the category page`,
      ).toEqual([]);
    }
  });

  it('keeps operation-level search destinations explicit and unique', () => {
    const entries = publicTools.flatMap((tool) => tool.searchEntries ?? []);
    const destinations = entries.map((entry) => entry.href);

    expect(entries).toHaveLength(682);
    expect(new Set(destinations).size).toBe(entries.length);
    for (const entry of entries) {
      expect(entry.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(entry.name.length).toBeGreaterThan(2);
      expect(entry.description.length).toBeGreaterThan(8);
      /*
        Two shapes are legitimate, and the second one is the better of them.

        `<route>?tool=<id>` is a workbench face: one page, one title, the tool
        chosen by a query parameter. `<path>` on its own is a tool with an
        address of its own, which is what the image studio's 34 destinations
        are and what every one of these should eventually become — a query
        parameter cannot rank for the job it names.

        Both are then put through `isLiveToolUrl`, which is the gate every CTA
        and the smart dropzone check before offering a destination. That is
        strictly more than the shape check alone did: a well-formed href to a
        route that does not exist used to pass here.
      */
      expect(entry.href).toMatch(/^\/[a-z0-9/-]+(?:\?tool=[a-z0-9-]+)?$/);
      expect(isLiveToolUrl(entry.href), entry.href).toBe(true);
    }
  });
});
