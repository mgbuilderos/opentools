import { describe, expect, it } from 'vitest';

import { MATH_OPERATIONS, runMathOperation } from './math-workbench';

function defaults(id: string) {
  const operation = MATH_OPERATIONS.find((item) => item.id === id);
  if (!operation) throw new Error(`Missing operation ${id}`);
  return Object.fromEntries(
    operation.fields.map((field) => [field.id, field.defaultValue]),
  );
}

describe('math and unit workbench', () => {
  it('publishes unique operations and every default produces a finite result', () => {
    expect(MATH_OPERATIONS).toHaveLength(67);
    expect(new Set(MATH_OPERATIONS.map((item) => item.id)).size).toBe(67);
    for (const operation of MATH_OPERATIONS) {
      expect(
        runMathOperation(operation.id, defaults(operation.id), () => 0.25),
      ).not.toBe('');
    }
  });

  it('evaluates arithmetic without eval and observes conventional precedence', () => {
    expect(
      runMathOperation('basic-calculator', { expression: '2 + 3 * 4' }),
    ).toBe('14');
    expect(runMathOperation('basic-calculator', { expression: '-2^2' })).toBe(
      '-4',
    );
    expect(runMathOperation('basic-calculator', { expression: '2^3^2' })).toBe(
      '512',
    );
    expect(() =>
      runMathOperation('basic-calculator', { expression: '2 / 0' }),
    ).toThrow('Division by zero');
    expect(() =>
      runMathOperation('basic-calculator', {
        expression: 'globalThis.alert(1)',
      }),
    ).toThrow('unsupported token');
  });

  it('calculates and reduces fractions, ratios, and proportions', () => {
    expect(
      runMathOperation('fraction-calculator', {
        aNumerator: '1',
        aDenominator: '2',
        operator: 'add',
        bNumerator: '1',
        bDenominator: '3',
      }),
    ).toBe('5/6');
    expect(runMathOperation('ratio-calculator', { a: '12', b: '18' })).toBe(
      '2:3',
    );
    expect(
      runMathOperation('proportion-calculator', { a: '2', b: '3', c: '8' }),
    ).toBe('x = 12');
  });

  it('calculates common descriptive statistics', () => {
    expect(runMathOperation('average-calculator', { values: '1,2,3,4' })).toBe(
      '2.5',
    );
    expect(runMathOperation('median-calculator', { values: '4,1,3,2' })).toBe(
      '2.5',
    );
    expect(runMathOperation('mode-calculator', { values: '1,2,2,3' })).toBe(
      '2',
    );
    expect(runMathOperation('variance-calculator', { values: '1,2,3' })).toBe(
      '0.666666666667',
    );
  });

  it('handles probability and exact combinatorics', () => {
    expect(
      runMathOperation('probability-calculator', {
        favorable: '1',
        total: '4',
      }),
    ).toBe('0.25 (25%)');
    expect(runMathOperation('permutation-calculator', { n: '5', r: '2' })).toBe(
      '20',
    );
    expect(runMathOperation('combination-calculator', { n: '5', r: '2' })).toBe(
      '10',
    );
  });

  it('checks primes and integer relationships', () => {
    expect(runMathOperation('prime-number-checker', { value: '97' })).toContain(
      'is prime',
    );
    expect(runMathOperation('prime-factorization', { value: '360' })).toBe(
      '2 × 2 × 2 × 3 × 3 × 5',
    );
    expect(runMathOperation('gcd-calculator', { a: '48', b: '18' })).toBe('6');
    expect(runMathOperation('lcm-calculator', { a: '12', b: '18' })).toBe('36');
  });

  it('solves supported equations and real-number operations', () => {
    expect(
      runMathOperation('quadratic-equation-solver', {
        a: '1',
        b: '-3',
        c: '2',
      }),
    ).toBe('x₁ = 2\nx₂ = 1');
    expect(
      runMathOperation('linear-equation-solver', { a: '2', b: '-8' }),
    ).toBe('x = 4');
    expect(
      runMathOperation('logarithm-calculator', { value: '100', base: '10' }),
    ).toBe('2');
    expect(
      runMathOperation('root-calculator', { value: '-27', degree: '3' }),
    ).toBe('-3');
  });

  it('runs scientific, matrix, determinant, and complex calculations', () => {
    expect(
      runMathOperation('scientific-calculator', {
        function: 'sin',
        value: '30',
        angle: 'degrees',
      }),
    ).toBe('0.5');
    expect(
      runMathOperation('system-of-equations-solver', {
        a1: '2',
        b1: '1',
        c1: '5',
        a2: '1',
        b2: '-1',
        c2: '1',
      }),
    ).toBe('x = 2\ny = 1');
    expect(
      runMathOperation('matrix-calculator', {
        matrixA: '1 2; 3 4',
        matrixB: '5 6; 7 8',
        operator: 'multiply',
      }),
    ).toBe('19\t22\n43\t50');
    expect(
      runMathOperation('determinant-calculator', {
        matrix: '1 2; 3 4',
      }),
    ).toBe('-2');
    expect(
      runMathOperation('complex-number-calculator', {
        realA: '2',
        imagA: '3',
        realB: '4',
        imagB: '-1',
        operator: 'multiply',
      }),
    ).toBe('11 + 10i');
  });

  it('calculates geometry, fuel economy, and English number forms', () => {
    expect(
      runMathOperation('volume-calculator', {
        shape: 'cuboid',
        a: '5',
        b: '4',
        c: '3',
      }),
    ).toBe('Volume = 60');
    expect(
      runMathOperation('fuel-economy-converter', {
        value: '8',
        from: 'l100km',
        to: 'mpg-us',
      }),
    ).toBe('29.401822875 mpg-us');
    expect(runMathOperation('number-to-words', { value: '2026' })).toBe(
      'two thousand twenty-six',
    );
    expect(
      runMathOperation('words-to-number', {
        words: 'two thousand twenty-six',
      }),
    ).toBe('2026');
  });

  it('calculates transparent descriptive-statistics extensions', () => {
    expect(
      runMathOperation('z-score-calculator', {
        value: '85',
        mean: '80',
        deviation: '10',
      }),
    ).toBe('0.5');
    expect(
      runMathOperation('percentile-calculator', {
        values: '1,2,3,4,5',
        percentile: '75',
      }),
    ).toBe('4');
    expect(
      runMathOperation('correlation-calculator', {
        x: '1,2,3',
        y: '2,4,6',
      }),
    ).toBe('1');
    expect(
      runMathOperation('sample-size-calculator', {
        z: '1.96',
        proportion: '0.5',
        error: '0.05',
      }),
    ).toBe('385 observations');
  });

  it('calculates documented geometry outputs', () => {
    expect(
      runMathOperation('triangle-calculator', { base: '10', height: '6' }),
    ).toBe('Area = 30');
    expect(runMathOperation('circle-calculator', { radius: '1' })).toContain(
      'Diameter = 2',
    );
    expect(
      runMathOperation('rectangle-calculator', { length: '3', width: '4' }),
    ).toContain('Diagonal = 5');
  });

  it('converts linear units, temperature, and cooking volumes', () => {
    expect(
      runMathOperation('distance-converter', {
        value: '1',
        from: 'km',
        to: 'm',
      }),
    ).toBe('1000 m');
    expect(
      runMathOperation('data-size-converter', {
        value: '1',
        from: 'MiB',
        to: 'B',
      }),
    ).toBe('1048576 B');
    expect(
      runMathOperation('temperature-converter', {
        value: '0',
        from: 'C',
        to: 'F',
      }),
    ).toBe('32 °F');
    expect(
      runMathOperation('cooking-unit-converter', {
        value: '1',
        from: 'cup-us',
        to: 'ml',
      }),
    ).toBe('236.5882365 ml');
  });

  it('converts Roman numerals, notation, and rounding', () => {
    expect(runMathOperation('roman-numeral-converter', { value: '2026' })).toBe(
      'MMXXVI',
    );
    expect(
      runMathOperation('roman-numeral-converter', { value: 'MMXXVI' }),
    ).toBe('2026');
    expect(
      runMathOperation('scientific-notation-converter', { value: '12345' }),
    ).toBe('1.2345e+4');
    expect(
      runMathOperation('rounding-calculator', {
        value: '3.14159',
        places: '2',
      }),
    ).toBe('3.14');
  });

  it('bounds random generators and sequences', () => {
    expect(
      runMathOperation(
        'random-number-generator',
        { minimum: '2', maximum: '4', count: '3' },
        () => 0,
      ),
    ).toBe('2\n2\n2');
    expect(
      runMathOperation('dice-roller', { dice: '2', sides: '6' }, () => 0),
    ).toBe('1, 1\nTotal = 2');
    expect(runMathOperation('coin-flipper', { count: '2' }, () => 0.9)).toBe(
      'Tails\nTails',
    );
    expect(
      runMathOperation('sequence-generator', {
        start: '2',
        step: '3',
        count: '4',
      }),
    ).toBe('2, 5, 8, 11');
  });

  it('fails closed on impossible or ambiguous numeric inputs', () => {
    expect(() =>
      runMathOperation('temperature-converter', {
        value: '-1',
        from: 'K',
        to: 'C',
      }),
    ).toThrow('absolute zero');
    expect(() =>
      runMathOperation('fraction-calculator', {
        aNumerator: '1',
        aDenominator: '0',
        operator: 'add',
        bNumerator: '1',
        bDenominator: '2',
      }),
    ).toThrow('denominators');
    expect(() =>
      runMathOperation('roman-numeral-converter', { value: 'IIII' }),
    ).toThrow('canonical');
  });
});
