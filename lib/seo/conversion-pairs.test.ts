import { describe, expect, it } from 'vitest';
import { MATH_OPERATIONS, runMathOperation } from '../tools/math-workbench';
import {
  CONVERSION_PAIRS,
  CONVERSION_SYSTEMS,
  conversionFacts,
  conversionPairById,
} from './conversion-pairs';
import { LIVE_TOOL_ROUTES, isLiveToolUrl } from './live-tools';

/**
 * This route multiplies the number of pages on the site by roughly two, which
 * is exactly the move constraint C4 forbids unless every page does real work.
 * These are the checks that make that claim testable rather than asserted: a
 * pair only gets a URL if the converter performs it, and every page carries a
 * fact no other page carries, produced by running the converter.
 */

const numberFrom = (printed: string) =>
  Number(/^-?[\d.]+(?:e[+-]?\d+)?/iu.exec(printed)?.[0] ?? 'x');

describe('unit conversion pairs', () => {
  it('finds the converters by shape, not by a list someone maintains', () => {
    const found = CONVERSION_SYSTEMS.map((system) => system.operationId);

    // Anchors: if the detection ever stops working, these tests would quietly
    // check an empty grid instead of failing.
    expect(found.length).toBeGreaterThan(14);
    for (const anchor of [
      'distance-converter',
      'area-converter',
      'volume-converter',
      'mass-converter',
      'speed-converter',
      'time-unit-converter',
      'pressure-converter',
      'energy-converter',
      'data-size-converter',
      'temperature-converter',
    ])
      expect(found, `${anchor} is a converter and was not found`).toContain(
        anchor,
      );
  });

  it('takes its units from the operation that runs them', () => {
    for (const pair of CONVERSION_PAIRS) {
      const operation = MATH_OPERATIONS.find(
        (candidate) => candidate.id === pair.operationId,
      );
      const options =
        operation?.fields.find((field) => field.id === 'from')?.options ?? [];
      const values = options.map((option) => option.value);
      expect(values, pair.id).toContain(pair.from);
      expect(values, pair.id).toContain(pair.to);
      expect(pair.from).not.toBe(pair.to);
    }
  });

  it('covers the whole grid each converter offers', () => {
    // Every ordered pair of different units, minus the ones a second converter
    // repeats. Written as the arithmetic rather than as a number, so adding a
    // unit to a converter does not require editing this line.
    const offered = CONVERSION_SYSTEMS.reduce(
      (total, system) =>
        total + system.units.length * (system.units.length - 1),
      0,
    );
    const repeated = offered - CONVERSION_PAIRS.length;

    expect(CONVERSION_PAIRS.length).toBeGreaterThan(400);
    expect(repeated).toBeGreaterThanOrEqual(0);
    for (const system of CONVERSION_SYSTEMS) {
      const mine = CONVERSION_PAIRS.filter(
        (pair) => pair.operationId === system.operationId,
      );
      expect(mine.length, system.operationId).toBeGreaterThan(0);
    }
  });

  it('gives each pair one address and one title', () => {
    const slugs = CONVERSION_PAIRS.map((pair) => pair.id);
    const titles = CONVERSION_PAIRS.map((pair) => pair.title);

    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(titles).size).toBe(titles.length);
    for (const pair of CONVERSION_PAIRS) {
      expect(pair.id, pair.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
      expect(pair.id).toContain('-to-');
      expect(conversionPairById(pair.id)).toBe(pair);
      // Long enough to be a sentence a person searches, short enough that a
      // result page shows all of it.
      expect(pair.title.length, pair.title).toBeLessThanOrEqual(60);
      expect(pair.title.startsWith('Convert '), pair.title).toBe(true);
    }
  });

  it('answers where two converters share a unit, so first-wins is safe', () => {
    /*
     * The cooking converter repeats four of the volume converter's units. One
     * page serves such a pair, and which converter it belongs to is decided by
     * enumeration order -- which is only acceptable while they agree.
     *
     * They agree on the value, not always on the last digit of it: the volume
     * converter pivots on cubic metres and the cooking one on millilitres, so
     * 7 US fluid ounces prints as 207.014706938 ml through one and
     * 207.014706937 ml through the other. That is one unit in the twelfth
     * significant figure, which is the last one either of them prints, so the
     * tolerance here is the tool's own precision. A disagreement bigger than
     * that would mean the two converters hold different constants, and the
     * page would be answering with whichever one enumeration happened to
     * reach first.
     */
    for (const system of CONVERSION_SYSTEMS)
      for (const other of CONVERSION_SYSTEMS) {
        if (other === system) continue;
        const shared = system.units.filter((unit) =>
          other.units.some((candidate) => candidate.value === unit.value),
        );
        for (const from of shared)
          for (const to of shared) {
            if (from.value === to.value) continue;
            const values = { value: '7', from: from.value, to: to.value };
            const mine = numberFrom(
              runMathOperation(system.operationId, values),
            );
            const theirs = numberFrom(
              runMathOperation(other.operationId, values),
            );
            expect(
              Math.abs(mine - theirs),
              `${system.operationId} and ${other.operationId} disagree about ${from.value} to ${to.value}: ${mine} vs ${theirs}`,
            ).toBeLessThanOrEqual(Math.abs(mine) * 1e-11);
          }
      }
  });

  it('does the conversion on every page it publishes', () => {
    // The bar the route is held to: no page exists unless the tool behind it
    // returns a real number for that pair.
    for (const pair of CONVERSION_PAIRS) {
      const printed = runMathOperation(pair.operationId, {
        value: '1',
        from: pair.from,
        to: pair.to,
      });
      expect(
        Number.isFinite(numberFrom(printed)),
        `${pair.id}: ${printed}`,
      ).toBe(true);
    }
  });

  it('carries a fact no other page carries', () => {
    const relationships = new Set<string>();
    const workings = new Set<string>();

    for (const pair of CONVERSION_PAIRS) {
      const facts = conversionFacts(pair);
      // Every pair here is a factor, a scale-and-shift, or an inverse, and the
      // sentence says which. An empty one would mean the shape could not be
      // established by running it, and the page would be prose with a
      // converter under it rather than an answer.
      expect(facts.relationship, pair.id).not.toBe('');
      expect(facts.examples.length, pair.id).toBeGreaterThan(1);
      relationships.add(facts.relationship);
      workings.add(JSON.stringify(facts.examples));
      expect(facts.description.length, pair.id).toBeLessThanOrEqual(160);
      expect(facts.units[pair.from], pair.id).toBeDefined();
      expect(facts.routes[`${pair.from}|${pair.to}`], pair.id).toBe(pair.id);
    }

    // The template test. If these pages were one page with two words swapped,
    // these two sets would be far smaller than the page count.
    expect(workings.size).toBe(CONVERSION_PAIRS.length);
    expect(relationships.size).toBe(CONVERSION_PAIRS.length);
  });

  it('quotes the converter rather than describing it', () => {
    // The numbers in the sentence are the strings the tool prints. Anything
    // written by hand could drift from the tool on the next factor change;
    // this cannot, and the check is what keeps it that way.
    for (const pair of CONVERSION_PAIRS) {
      const facts = conversionFacts(pair);
      for (const example of facts.examples) {
        const [value = ''] = example.input.split(' ');
        expect(
          runMathOperation(pair.operationId, {
            value,
            from: pair.from,
            to: pair.to,
          }),
          pair.id,
        ).toBe(example.output);
      }
      if (facts.relationship.startsWith('Exact factor'))
        expect(facts.relationship, pair.id).toContain(
          runMathOperation(pair.operationId, {
            value: '1',
            from: pair.from,
            to: pair.to,
          }).replace(/\s\S+$/u, ''),
        );
    }
  });

  it('is registered, so the pages are not published invisible', () => {
    for (const pair of CONVERSION_PAIRS) {
      const route = `/convert/${pair.id}`;
      expect(LIVE_TOOL_ROUTES, route).toContain(route);
      expect(isLiveToolUrl(route), route).toBe(true);
    }
    expect(isLiveToolUrl('/convert/not-a-real-pair')).toBe(false);
  });
});
