import { describe, expect, it } from 'vitest';

import { CONVERSION_PAIRS } from './conversion-pairs';
import {
  FILE_FORMATS,
  FORMAT_PAIRS,
  PAIRS_ANSWERED_ELSEWHERE,
  formatFacts,
  formatHubPair,
  formatPairById,
  formatPairIndex,
} from './format-pairs';
import { LIVE_TOOL_ROUTES, routedToolIdsForPrefix } from './live-tools';

describe('file-format conversion pairs', () => {
  it('generates every ordered pair the formats support', () => {
    const formats = FILE_FORMATS.length;
    const possible = formats * (formats - 1);

    expect(formats).toBeGreaterThanOrEqual(11);
    expect(FORMAT_PAIRS).toHaveLength(
      possible - Object.keys(PAIRS_ANSWERED_ELSEWHERE).length,
    );
  });

  it('adds a whole row and column of pages per format, not one page', () => {
    // The point of one parser and one emitter per format: the twelfth format
    // would cost two functions and earn twenty-two pages. This is the number
    // that has to stay true, or somebody has started writing pairs by hand
    // again.
    for (const format of FILE_FORMATS) {
      const touching = FORMAT_PAIRS.filter(
        (pair) => pair.from === format.id || pair.to === format.id,
      );
      const elsewhere = Object.keys(PAIRS_ANSWERED_ELSEWHERE).filter((id) =>
        id.split('-to-').includes(format.id),
      );
      expect(touching.length, `${format.id} takes part in too few pairs`).toBe(
        2 * (FILE_FORMATS.length - 1) - elsewhere.length,
      );
    }
  });

  it('generates no pair a live page already answers', () => {
    for (const [id, route] of Object.entries(PAIRS_ANSWERED_ELSEWHERE)) {
      expect(formatPairById(id), `${id} duplicates ${route}`).toBeUndefined();
      // If that page is ever removed, the conversion stops being answered at
      // all -- so this fails rather than leaving a hole nobody notices.
      expect(LIVE_TOOL_ROUTES, `${route} is no longer live`).toContain(route);
    }
  });

  it('never collides with a unit pair on the same route', () => {
    const units = new Set(CONVERSION_PAIRS.map((pair) => pair.id));
    const collisions = FORMAT_PAIRS.filter((pair) => units.has(pair.id));
    expect(collisions.map((pair) => pair.id)).toEqual([]);
  });

  it('gives every page a slug, title and description of its own', () => {
    const slugs = FORMAT_PAIRS.map((pair) => pair.id);
    const titles = FORMAT_PAIRS.map((pair) => pair.title);
    const descriptions = FORMAT_PAIRS.map(
      (pair) => formatFacts(pair).description,
    );

    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descriptions).size).toBe(descriptions.length);

    for (const pair of FORMAT_PAIRS) {
      expect(pair.id, `${pair.id} is not a from-to slug`).toMatch(
        /^[a-z0-9]+-to-[a-z0-9]+$/u,
      );
      expect(pair.title).toContain(pair.fromName);
      expect(pair.title).toContain(pair.toName);
    }
  });

  it('shows real output on every page, produced by the converter', () => {
    // The whole defence against this being another near-template family: the
    // sample and the result are the tool's own bytes, not prose about it.
    for (const pair of FORMAT_PAIRS) {
      const facts = formatFacts(pair);
      expect(facts.sample.trim(), `${pair.id} sample`).not.toBe('');
      expect(facts.output.trim(), `${pair.id} output`).not.toBe('');
      expect(facts.output, `${pair.id} did not convert`).not.toBe(facts.sample);
      expect(facts.measured).toMatch(/\d+ lines/u);
      expect(facts.extension).toMatch(/^[a-z]+$/u);
    }
  });

  it('carries the ampersand through every conversion it claims', () => {
    // `R&D` is the fixture cell that found the LaTeX parser splitting on an
    // escaped `\&`. A conversion that silently drops or splits it is a wrong
    // answer, not a formatting difference.
    for (const pair of FORMAT_PAIRS) {
      const { output } = formatFacts(pair);
      expect(
        /R(?:&|\\&|&amp;)D/u.test(output),
        `${pair.id} lost the ampersand: ${output.slice(0, 120)}`,
      ).toBe(true);
    }
  });

  it('offers a route for every combination the two selects can make', () => {
    // Picking two formats navigates; a combination with nowhere to go would
    // leave the page describing a conversion it is no longer doing.
    const facts = formatFacts(FORMAT_PAIRS[0]!);
    for (const from of FILE_FORMATS) {
      for (const to of FILE_FORMATS) {
        if (from.id === to.id) continue;
        expect(
          facts.routes[`${from.id}|${to.id}`],
          `no page for ${from.id} to ${to.id}`,
        ).toBeTruthy();
      }
    }
  });

  it('registers every pair as a live tool route', () => {
    const routed = routedToolIdsForPrefix('/convert')?.map(({ id }) => id);
    for (const pair of FORMAT_PAIRS) {
      expect(routed, `${pair.id} is not routed`).toContain(pair.id);
      expect(LIVE_TOOL_ROUTES).toContain(`/convert/${pair.id}`);
    }
    expect(LIVE_TOOL_ROUTES).toContain('/convert/formats');
  });

  it('indexes every pair on the hub, so none is reachable only by URL', () => {
    const index = formatPairIndex();
    expect(index).toHaveLength(FORMAT_PAIRS.length);
    expect(new Set(index.map((entry) => entry.href)).size).toBe(index.length);

    // The hub opens on a conversion answered elsewhere on purpose, so its
    // worked example is not a second copy of any pair page's own.
    const hub = formatHubPair();
    expect(PAIRS_ANSWERED_ELSEWHERE[`${hub.from}-to-${hub.to}`]).toBeTruthy();
  });
});
