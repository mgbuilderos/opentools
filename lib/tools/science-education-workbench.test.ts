import { describe, expect, it } from 'vitest';

import {
  runScienceOperation,
  SCIENCE_OPERATIONS,
} from './science-education-workbench';

function defaults(id: string) {
  const operation = SCIENCE_OPERATIONS.find((item) => item.id === id);
  if (!operation) throw new Error(`Missing operation ${id}`);
  return Object.fromEntries(
    operation.fields.map((field) => [field.id, field.defaultValue]),
  );
}

describe('science and education workbench', () => {
  it('publishes 48 unique operations whose defaults all run', () => {
    expect(SCIENCE_OPERATIONS).toHaveLength(48);
    expect(new Set(SCIENCE_OPERATIONS.map((item) => item.id)).size).toBe(48);
    for (const operation of SCIENCE_OPERATIONS) {
      expect(
        runScienceOperation(operation.id, defaults(operation.id)),
      ).not.toBe('');
    }
  });

  it('calculates mole count, dilution, and ideal pH', () => {
    expect(
      runScienceOperation('mole-calculator', {
        mass: '36.03',
        molarMass: '18.015',
      }),
    ).toContain('Moles: 2 mol');
    expect(
      runScienceOperation('solution-dilution-calculator', {
        c1: '1',
        v1: '100',
        c2: '0.25',
      }),
    ).toContain('400');
    expect(
      runScienceOperation('ph-calculator', { concentration: '0.001' }),
    ).toContain('pH: 3');
  });

  it('calculates decay from half-life and lambda forms', () => {
    expect(
      runScienceOperation('half-life-calculator', {
        initial: '100',
        elapsed: '10',
        halfLife: '5',
      }),
    ).toContain('Remaining: 25');
    expect(
      runScienceOperation('radioactive-decay-calculator', {
        initial: '100',
        lambda: String(Math.log(2) / 5),
        time: '10',
      }),
    ).toContain('Remaining: 25');
  });

  it('calculates electrical values and component codes', () => {
    expect(
      runScienceOperation('ohm-s-law-calculator', {
        voltage: '12',
        current: '2',
      }),
    ).toContain('Resistance: 6 Ω');
    expect(
      runScienceOperation('capacitor-code-calculator', { code: '104' }),
    ).toContain('Microfarads: 0.1 µF');
    expect(
      runScienceOperation('resistor-color-code', {
        first: '1',
        second: '0',
        multiplier: '2',
        tolerance: '5',
      }),
    ).toContain('Resistance: 1000 Ω');
  });

  it('calculates ideal motion and energy formulas', () => {
    expect(
      runScienceOperation('kinetic-energy-calculator', {
        mass: '10',
        velocity: '5',
      }),
    ).toContain('125 J');
    expect(
      runScienceOperation('free-fall-calculator', {
        height: '19.6133',
        gravity: '9.80665',
      }),
    ).toContain('Fall time: 2 s');
  });

  it('calculates wave, lens, sound, and astronomy results', () => {
    expect(
      runScienceOperation('wave-speed-calculator', {
        frequency: '440',
        wavelength: '0.7795454545454545',
      }),
    ).toContain('343');
    expect(
      runScienceOperation('lens-equation-calculator', {
        focal: '10',
        object: '30',
      }),
    ).toContain('Image distance: 15');
    expect(
      runScienceOperation('astronomy-unit-converter', {
        value: '1',
        from: 'au',
        to: 'km',
      }),
    ).toContain('149597870.7 km');
  });

  it('calculates grades, attendance, and weighted GPA explicitly', () => {
    expect(
      runScienceOperation('grade-calculator', {
        earned: '84',
        possible: '100',
      }),
    ).toContain('Simple band: B');
    expect(
      runScienceOperation('gpa-calculator', {
        items: 'A | 3 | 10\nB | 1 | 6',
      }),
    ).toContain('Credit-weighted GPA: 9');
    expect(
      runScienceOperation('attendance-percentage-calculator', {
        attended: '72',
        total: '90',
        target: '85',
      }),
    ).toContain('Consecutive attended sessions needed for 85%: 30');
  });

  it('builds bounded study, flashcard, and quiz materials', () => {
    expect(
      runScienceOperation('study-time-planner', {
        start: '2026-09-07',
        dailyHours: '2',
        topics: 'Algebra | 3',
      }),
    ).toContain('2026-09-08 · Algebra · 1h');
    expect(
      runScienceOperation('flashcard-maker', defaults('flashcard-maker')),
    ).toContain('## 2. Momentum');
    expect(
      runScienceOperation(
        'quiz-generator-workspace',
        defaults('quiz-generator-workspace'),
      ),
    ).toContain('# Answer key');
  });

  it('generates truth tables and exact set regions', () => {
    const table = runScienceOperation('truth-table-generator', {
      expression: 'A && !B',
    });
    expect(table.split('\n')).toHaveLength(6);
    expect(table).toContain('| T | F | T |');
    expect(
      runScienceOperation('set-calculator', {
        a: 'red, green, blue',
        b: 'green, gold, blue',
      }),
    ).toContain('Intersection: blue, green');
    expect(
      runScienceOperation('venn-diagram-data-builder', {
        a: '1,2,3,4',
        b: '3,4,5',
        c: '4,5,6',
      }),
    ).toContain('"abc"');
  });

  it('creates function tables and distribution summaries', () => {
    expect(
      runScienceOperation('function-table-generator', {
        a: '1',
        b: '0',
        c: '0',
        start: '-1',
        end: '1',
        step: '1',
      }),
    ).toBe('x,f(x)\n-1,1\n0,0\n1,1');
    expect(
      runScienceOperation('statistics-distribution-viewer', {
        values: '2,4,4,4,5,5,7,9',
      }),
    ).toContain('Population standard deviation: 2');
  });

  it('rejects invalid physical and expression boundaries', () => {
    expect(() =>
      runScienceOperation('led-resistor-calculator', {
        supply: '2',
        forward: '3',
        current: '20',
      }),
    ).toThrow('must exceed');
    expect(() =>
      runScienceOperation('truth-table-generator', {
        expression: 'A && (B',
      }),
    ).toThrow('parentheses');
    expect(() =>
      runScienceOperation('study-time-planner', {
        start: '2026-02-31',
        dailyHours: '2',
        topics: 'A | 1',
      }),
    ).toThrow('real calendar date');
  });
});
