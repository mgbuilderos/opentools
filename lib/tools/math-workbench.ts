import {
  number as numberField,
  select as selectField,
  text as textField,
  type StandardField as MathField,
  type StandardFieldOption as MathFieldOption,
  type StandardOperation as MathOperation,
} from './workbench-helpers';

export type { MathField, MathFieldOption, MathOperation };

type UnitSystem = {
  id: string;
  name: string;
  description: string;
  units: Record<string, { label: string; factor: number }>;
};

const UNIT_SYSTEMS: readonly UnitSystem[] = [
  {
    id: 'distance-converter',
    name: 'Distance converter',
    description: 'Convert metric, imperial, and nautical distances.',
    units: {
      mm: { label: 'Millimetres', factor: 0.001 },
      cm: { label: 'Centimetres', factor: 0.01 },
      m: { label: 'Metres', factor: 1 },
      km: { label: 'Kilometres', factor: 1000 },
      in: { label: 'Inches', factor: 0.0254 },
      ft: { label: 'Feet', factor: 0.3048 },
      yd: { label: 'Yards', factor: 0.9144 },
      mi: { label: 'Miles', factor: 1609.344 },
      nmi: { label: 'Nautical miles', factor: 1852 },
    },
  },
  {
    id: 'area-converter',
    name: 'Area converter',
    description: 'Convert common metric and imperial areas.',
    units: {
      'm²': { label: 'Square metres', factor: 1 },
      'km²': { label: 'Square kilometres', factor: 1_000_000 },
      'cm²': { label: 'Square centimetres', factor: 0.0001 },
      ha: { label: 'Hectares', factor: 10_000 },
      acre: { label: 'Acres', factor: 4046.8564224 },
      'ft²': { label: 'Square feet', factor: 0.09290304 },
      'in²': { label: 'Square inches', factor: 0.00064516 },
      'mi²': { label: 'Square miles', factor: 2_589_988.110336 },
    },
  },
  {
    id: 'volume-converter',
    name: 'Volume converter',
    description: 'Convert metric and common liquid volumes.',
    units: {
      ml: { label: 'Millilitres', factor: 0.000001 },
      l: { label: 'Litres', factor: 0.001 },
      'm³': { label: 'Cubic metres', factor: 1 },
      'cm³': { label: 'Cubic centimetres', factor: 0.000001 },
      'floz-us': { label: 'US fluid ounces', factor: 0.0000295735295625 },
      'cup-us': { label: 'US cups', factor: 0.0002365882365 },
      'gal-us': { label: 'US gallons', factor: 0.003785411784 },
      'ft³': { label: 'Cubic feet', factor: 0.028316846592 },
    },
  },
  {
    id: 'mass-converter',
    name: 'Mass converter',
    description: 'Convert metric and imperial mass units.',
    units: {
      mg: { label: 'Milligrams', factor: 0.000001 },
      g: { label: 'Grams', factor: 0.001 },
      kg: { label: 'Kilograms', factor: 1 },
      tonne: { label: 'Metric tonnes', factor: 1000 },
      oz: { label: 'Ounces', factor: 0.028349523125 },
      lb: { label: 'Pounds', factor: 0.45359237 },
      stone: { label: 'Stone', factor: 6.35029318 },
    },
  },
  {
    id: 'speed-converter',
    name: 'Speed converter',
    description: 'Convert speed units using exact standard factors.',
    units: {
      'm/s': { label: 'Metres per second', factor: 1 },
      'km/h': { label: 'Kilometres per hour', factor: 1 / 3.6 },
      mph: { label: 'Miles per hour', factor: 0.44704 },
      knot: { label: 'Knots', factor: 0.5144444444444445 },
      'ft/s': { label: 'Feet per second', factor: 0.3048 },
    },
  },
  {
    id: 'time-unit-converter',
    name: 'Time-unit converter',
    description: 'Convert elapsed-time units.',
    units: {
      ms: { label: 'Milliseconds', factor: 0.001 },
      s: { label: 'Seconds', factor: 1 },
      min: { label: 'Minutes', factor: 60 },
      h: { label: 'Hours', factor: 3600 },
      day: { label: 'Days', factor: 86_400 },
      week: { label: 'Weeks', factor: 604_800 },
    },
  },
  {
    id: 'pressure-converter',
    name: 'Pressure converter',
    description: 'Convert pascals and common engineering pressure units.',
    units: {
      Pa: { label: 'Pascals', factor: 1 },
      kPa: { label: 'Kilopascals', factor: 1000 },
      MPa: { label: 'Megapascals', factor: 1_000_000 },
      bar: { label: 'Bar', factor: 100_000 },
      atm: { label: 'Atmospheres', factor: 101_325 },
      psi: { label: 'Pounds per square inch', factor: 6894.757293168 },
    },
  },
  {
    id: 'energy-converter',
    name: 'Energy converter',
    description: 'Convert joules, watt-hours, calories, and BTU.',
    units: {
      J: { label: 'Joules', factor: 1 },
      kJ: { label: 'Kilojoules', factor: 1000 },
      Wh: { label: 'Watt-hours', factor: 3600 },
      kWh: { label: 'Kilowatt-hours', factor: 3_600_000 },
      cal: { label: 'Calories', factor: 4.184 },
      kcal: { label: 'Kilocalories', factor: 4184 },
      BTU: { label: 'BTU (IT)', factor: 1055.05585262 },
    },
  },
  {
    id: 'power-converter',
    name: 'Power converter',
    description: 'Convert watts and common power units.',
    units: {
      W: { label: 'Watts', factor: 1 },
      kW: { label: 'Kilowatts', factor: 1000 },
      MW: { label: 'Megawatts', factor: 1_000_000 },
      hp: { label: 'Mechanical horsepower', factor: 745.6998715822702 },
      'BTU/h': { label: 'BTU per hour', factor: 0.2930710701722222 },
    },
  },
  {
    id: 'force-converter',
    name: 'Force converter',
    description: 'Convert newtons and common force units.',
    units: {
      N: { label: 'Newtons', factor: 1 },
      kN: { label: 'Kilonewtons', factor: 1000 },
      dyn: { label: 'Dynes', factor: 0.00001 },
      kgf: { label: 'Kilogram-force', factor: 9.80665 },
      lbf: { label: 'Pound-force', factor: 4.4482216152605 },
    },
  },
  {
    id: 'torque-converter',
    name: 'Torque converter',
    description: 'Convert newton-metres and common torque units.',
    units: {
      N·m: { label: 'Newton-metres', factor: 1 },
      N·cm: { label: 'Newton-centimetres', factor: 0.01 },
      kgf·m: { label: 'Kilogram-force metres', factor: 9.80665 },
      lbf·ft: { label: 'Pound-force feet', factor: 1.3558179483314 },
      lbf·in: { label: 'Pound-force inches', factor: 0.1129848290276167 },
    },
  },
  {
    id: 'angle-converter',
    name: 'Angle converter',
    description: 'Convert degrees, radians, gradians, and turns.',
    units: {
      rad: { label: 'Radians', factor: 1 },
      deg: { label: 'Degrees', factor: Math.PI / 180 },
      grad: { label: 'Gradians', factor: Math.PI / 200 },
      turn: { label: 'Turns', factor: Math.PI * 2 },
    },
  },
  {
    id: 'frequency-converter',
    name: 'Frequency converter',
    description: 'Convert hertz and common frequency scales.',
    units: {
      Hz: { label: 'Hertz', factor: 1 },
      kHz: { label: 'Kilohertz', factor: 1000 },
      MHz: { label: 'Megahertz', factor: 1_000_000 },
      GHz: { label: 'Gigahertz', factor: 1_000_000_000 },
      rpm: { label: 'Revolutions per minute', factor: 1 / 60 },
    },
  },
  {
    id: 'data-size-converter',
    name: 'Data-size converter',
    description: 'Convert decimal and binary byte units.',
    units: {
      B: { label: 'Bytes', factor: 1 },
      kB: { label: 'Kilobytes (10³)', factor: 1000 },
      MB: { label: 'Megabytes (10⁶)', factor: 1_000_000 },
      GB: { label: 'Gigabytes (10⁹)', factor: 1_000_000_000 },
      KiB: { label: 'Kibibytes (2¹⁰)', factor: 1024 },
      MiB: { label: 'Mebibytes (2²⁰)', factor: 1_048_576 },
      GiB: { label: 'Gibibytes (2³⁰)', factor: 1_073_741_824 },
    },
  },
  {
    id: 'cooking-unit-converter',
    name: 'Cooking-unit converter',
    description:
      'Convert volume-only cooking measures without assuming ingredient density.',
    units: {
      ml: { label: 'Millilitres', factor: 1 },
      tsp: { label: 'US teaspoons', factor: 4.92892159375 },
      tbsp: { label: 'US tablespoons', factor: 14.78676478125 },
      'cup-us': { label: 'US cups', factor: 236.5882365 },
      'floz-us': { label: 'US fluid ounces', factor: 29.5735295625 },
      l: { label: 'Litres', factor: 1000 },
    },
  },
] as const;

function unitFields(system: UnitSystem): readonly MathField[] {
  const options = Object.entries(system.units).map(([value, unit]) => ({
    value,
    label: unit.label,
  }));
  return [
    numberField('value', 'Value', '1'),
    selectField('from', 'From', options),
    {
      ...selectField('to', 'To', options),
      defaultValue: options[1]?.value ?? options[0]?.value ?? '',
    },
  ];
}

const fixedOperations: readonly MathOperation[] = [
  {
    id: 'basic-calculator',
    name: 'Basic calculator',
    description:
      'Evaluate arithmetic with +, −, ×, ÷, %, powers, and parentheses.',
    fields: [textField('expression', 'Expression', '(12 + 8) * 3')],
  },
  {
    id: 'fraction-calculator',
    name: 'Fraction calculator',
    description: 'Add, subtract, multiply, or divide two fractions.',
    fields: [
      numberField('aNumerator', 'First numerator', '1'),
      numberField('aDenominator', 'First denominator', '2'),
      selectField('operator', 'Operation', [
        { value: 'add', label: 'Add' },
        { value: 'subtract', label: 'Subtract' },
        { value: 'multiply', label: 'Multiply' },
        { value: 'divide', label: 'Divide' },
      ]),
      numberField('bNumerator', 'Second numerator', '1'),
      numberField('bDenominator', 'Second denominator', '3'),
    ],
  },
  {
    id: 'ratio-calculator',
    name: 'Ratio calculator',
    description: 'Reduce an integer ratio to lowest terms.',
    fields: [
      numberField('a', 'First value', '12'),
      numberField('b', 'Second value', '18'),
    ],
  },
  {
    id: 'proportion-calculator',
    name: 'Proportion calculator',
    description: 'Solve a:b = c:x.',
    fields: [
      numberField('a', 'a', '2'),
      numberField('b', 'b', '3'),
      numberField('c', 'c', '8'),
    ],
  },
  {
    id: 'average-calculator',
    name: 'Average calculator',
    description: 'Calculate the arithmetic mean of a number list.',
    fields: [textField('values', 'Numbers', '2, 4, 8')],
  },
  {
    id: 'median-calculator',
    name: 'Median calculator',
    description: 'Calculate the middle value of a number list.',
    fields: [textField('values', 'Numbers', '2, 4, 8')],
  },
  {
    id: 'mode-calculator',
    name: 'Mode calculator',
    description: 'Find every most-frequent value in a number list.',
    fields: [textField('values', 'Numbers', '2, 2, 4, 8')],
  },
  {
    id: 'variance-calculator',
    name: 'Variance calculator',
    description: 'Calculate population variance.',
    fields: [textField('values', 'Numbers', '2, 4, 8')],
  },
  {
    id: 'standard-deviation-calculator',
    name: 'Standard-deviation calculator',
    description: 'Calculate population standard deviation.',
    fields: [textField('values', 'Numbers', '2, 4, 8')],
  },
  {
    id: 'probability-calculator',
    name: 'Probability calculator',
    description: 'Calculate favorable outcomes divided by total outcomes.',
    fields: [
      numberField('favorable', 'Favorable outcomes', '1'),
      numberField('total', 'Total outcomes', '6'),
    ],
  },
  {
    id: 'permutation-calculator',
    name: 'Permutation calculator',
    description: 'Calculate nPr for whole numbers.',
    fields: [numberField('n', 'n', '5'), numberField('r', 'r', '2')],
  },
  {
    id: 'combination-calculator',
    name: 'Combination calculator',
    description: 'Calculate nCr for whole numbers.',
    fields: [numberField('n', 'n', '5'), numberField('r', 'r', '2')],
  },
  {
    id: 'prime-number-checker',
    name: 'Prime-number checker',
    description: 'Check a safe positive integer for primality.',
    fields: [numberField('value', 'Integer', '97')],
  },
  {
    id: 'prime-factorization',
    name: 'Prime factorization',
    description: 'Factor a positive safe integer up to one trillion.',
    fields: [numberField('value', 'Integer', '360')],
  },
  {
    id: 'gcd-calculator',
    name: 'GCD calculator',
    description: 'Find the greatest common divisor of two integers.',
    fields: [
      numberField('a', 'First integer', '48'),
      numberField('b', 'Second integer', '18'),
    ],
  },
  {
    id: 'lcm-calculator',
    name: 'LCM calculator',
    description: 'Find the least common multiple of two integers.',
    fields: [
      numberField('a', 'First integer', '12'),
      numberField('b', 'Second integer', '18'),
    ],
  },
  {
    id: 'quadratic-equation-solver',
    name: 'Quadratic-equation solver',
    description: 'Solve ax² + bx + c = 0, including complex roots.',
    fields: [
      numberField('a', 'a', '1'),
      numberField('b', 'b', '-3'),
      numberField('c', 'c', '2'),
    ],
  },
  {
    id: 'linear-equation-solver',
    name: 'Linear-equation solver',
    description: 'Solve ax + b = 0.',
    fields: [numberField('a', 'a', '2'), numberField('b', 'b', '-8')],
  },
  {
    id: 'logarithm-calculator',
    name: 'Logarithm calculator',
    description: 'Calculate log base b of x.',
    fields: [
      numberField('value', 'x', '100'),
      numberField('base', 'Base', '10'),
    ],
  },
  {
    id: 'exponent-calculator',
    name: 'Exponent calculator',
    description: 'Calculate base raised to an exponent.',
    fields: [
      numberField('base', 'Base', '2'),
      numberField('exponent', 'Exponent', '8'),
    ],
  },
  {
    id: 'root-calculator',
    name: 'Root calculator',
    description: 'Calculate an nth root with real-number validation.',
    fields: [
      numberField('value', 'Value', '27'),
      numberField('degree', 'Root degree', '3'),
    ],
  },
  {
    id: 'scientific-calculator',
    name: 'Scientific calculator',
    description:
      'Apply a common scientific function with explicit degrees or radians.',
    fields: [
      selectField('function', 'Function', [
        { value: 'sin', label: 'Sine' },
        { value: 'cos', label: 'Cosine' },
        { value: 'tan', label: 'Tangent' },
        { value: 'asin', label: 'Arc sine' },
        { value: 'acos', label: 'Arc cosine' },
        { value: 'atan', label: 'Arc tangent' },
        { value: 'ln', label: 'Natural logarithm' },
        { value: 'log10', label: 'Base-10 logarithm' },
        { value: 'sqrt', label: 'Square root' },
        { value: 'abs', label: 'Absolute value' },
      ]),
      numberField('value', 'Value', '30'),
      selectField('angle', 'Angle mode', [
        { value: 'degrees', label: 'Degrees' },
        { value: 'radians', label: 'Radians' },
      ]),
    ],
  },
  {
    id: 'system-of-equations-solver',
    name: 'System-of-equations solver',
    description: 'Solve a 2×2 linear system a₁x+b₁y=c₁ and a₂x+b₂y=c₂.',
    fields: [
      numberField('a1', 'a₁', '2'),
      numberField('b1', 'b₁', '1'),
      numberField('c1', 'c₁', '5'),
      numberField('a2', 'a₂', '1'),
      numberField('b2', 'b₂', '-1'),
      numberField('c2', 'c₂', '1'),
    ],
  },
  {
    id: 'matrix-calculator',
    name: 'Matrix calculator',
    description: 'Add, subtract, or multiply bounded numeric matrices.',
    fields: [
      textField('matrixA', 'Matrix A (rows separated by ;)', '1 2; 3 4'),
      textField('matrixB', 'Matrix B (rows separated by ;)', '5 6; 7 8'),
      selectField('operator', 'Operation', [
        { value: 'add', label: 'A + B' },
        { value: 'subtract', label: 'A − B' },
        { value: 'multiply', label: 'A × B' },
      ]),
    ],
  },
  {
    id: 'determinant-calculator',
    name: 'Determinant calculator',
    description: 'Calculate a determinant for a square matrix up to 6×6.',
    fields: [textField('matrix', 'Square matrix', '1 2; 3 4')],
  },
  {
    id: 'complex-number-calculator',
    name: 'Complex-number calculator',
    description: 'Add, subtract, multiply, or divide a+bi coordinate pairs.',
    fields: [
      numberField('realA', 'A real', '2'),
      numberField('imagA', 'A imaginary', '3'),
      numberField('realB', 'B real', '4'),
      numberField('imagB', 'B imaginary', '-1'),
      selectField('operator', 'Operation', [
        { value: 'add', label: 'Add' },
        { value: 'subtract', label: 'Subtract' },
        { value: 'multiply', label: 'Multiply' },
        { value: 'divide', label: 'Divide' },
      ]),
    ],
  },
  {
    id: 'geometry-calculator',
    name: 'Geometry calculator',
    description: 'Calculate area and perimeter for a selected 2D shape.',
    fields: [
      selectField('shape', 'Shape', [
        { value: 'rectangle', label: 'Rectangle' },
        { value: 'triangle', label: 'Right triangle' },
        { value: 'circle', label: 'Circle' },
      ]),
      numberField('a', 'Length / base / radius', '5'),
      numberField('b', 'Width / height', '4'),
    ],
  },
  {
    id: 'volume-calculator',
    name: 'Volume calculator',
    description: 'Calculate common solid volumes from explicit dimensions.',
    fields: [
      selectField('shape', 'Solid', [
        { value: 'cuboid', label: 'Rectangular prism' },
        { value: 'cylinder', label: 'Cylinder' },
        { value: 'sphere', label: 'Sphere' },
        { value: 'cone', label: 'Cone' },
      ]),
      numberField('a', 'Length / radius', '5'),
      numberField('b', 'Width / height', '4'),
      numberField('c', 'Height (rectangular prism)', '3'),
    ],
  },
  {
    id: 'surface-area-calculator',
    name: 'Surface-area calculator',
    description: 'Calculate total surface area for common closed solids.',
    fields: [
      selectField('shape', 'Solid', [
        { value: 'cuboid', label: 'Rectangular prism' },
        { value: 'cylinder', label: 'Cylinder' },
        { value: 'sphere', label: 'Sphere' },
      ]),
      numberField('a', 'Length / radius', '5'),
      numberField('b', 'Width / height', '4'),
      numberField('c', 'Height (rectangular prism)', '3'),
    ],
  },
  {
    id: 'fuel-economy-converter',
    name: 'Fuel-economy converter',
    description: 'Convert L/100 km, US MPG, and imperial MPG.',
    fields: [
      numberField('value', 'Fuel economy', '8'),
      selectField('from', 'From', [
        { value: 'l100km', label: 'L/100 km' },
        { value: 'mpg-us', label: 'US MPG' },
        { value: 'mpg-uk', label: 'Imperial MPG' },
      ]),
      {
        ...selectField('to', 'To', [
          { value: 'l100km', label: 'L/100 km' },
          { value: 'mpg-us', label: 'US MPG' },
          { value: 'mpg-uk', label: 'Imperial MPG' },
        ]),
        defaultValue: 'mpg-us',
      },
    ],
  },
  {
    id: 'number-to-words',
    name: 'Number to words',
    description: 'Spell a safe whole number up to 999,999,999,999 in English.',
    fields: [numberField('value', 'Whole number', '2026')],
  },
  {
    id: 'words-to-number',
    name: 'Words to number',
    description: 'Parse supported English whole-number words up to billions.',
    fields: [
      textField('words', 'English number words', 'two thousand twenty six'),
    ],
  },
  {
    id: 'significant-figures-calculator',
    name: 'Significant-figures calculator',
    description: 'Round a finite non-zero number to 1–100 significant figures.',
    fields: [
      numberField('value', 'Number', '12345.678'),
      numberField('figures', 'Significant figures', '4'),
    ],
  },
  {
    id: 'margin-of-error-calculator',
    name: 'Margin-of-error calculator',
    description:
      'Calculate z × sample deviation ÷ √n with an explicit z score.',
    fields: [
      numberField('deviation', 'Sample standard deviation', '12'),
      numberField('sample', 'Sample size', '100'),
      numberField('z', 'Critical z score', '1.96'),
    ],
  },
  {
    id: 'confidence-interval-calculator',
    name: 'Confidence-interval calculator',
    description:
      'Calculate a normal-approximation mean interval from mean, deviation, n, and z.',
    fields: [
      numberField('mean', 'Sample mean', '80'),
      numberField('deviation', 'Sample standard deviation', '12'),
      numberField('sample', 'Sample size', '100'),
      numberField('z', 'Critical z score', '1.96'),
    ],
  },
  {
    id: 'z-score-calculator',
    name: 'Z-score calculator',
    description: 'Calculate (value − mean) ÷ population standard deviation.',
    fields: [
      numberField('value', 'Value', '85'),
      numberField('mean', 'Mean', '80'),
      numberField('deviation', 'Population standard deviation', '10'),
    ],
  },
  {
    id: 'percentile-calculator',
    name: 'Percentile calculator',
    description: 'Interpolate a requested percentile in a finite number list.',
    fields: [
      textField('values', 'Numbers', '1, 2, 3, 4, 5'),
      numberField('percentile', 'Percentile (0–100)', '75'),
    ],
  },
  {
    id: 'correlation-calculator',
    name: 'Correlation calculator',
    description: 'Calculate Pearson correlation for two equal-length lists.',
    fields: [
      textField('x', 'X values', '1, 2, 3, 4'),
      textField('y', 'Y values', '2, 4, 5, 8'),
    ],
  },
  {
    id: 'linear-regression-calculator',
    name: 'Linear-regression calculator',
    description: 'Fit the least-squares line y = intercept + slope × x.',
    fields: [
      textField('x', 'X values', '1, 2, 3, 4'),
      textField('y', 'Y values', '2, 4, 5, 8'),
    ],
  },
  {
    id: 'sample-size-calculator',
    name: 'Sample-size calculator',
    description:
      'Estimate a proportion sample size z²p(1−p)/e² before finite-population correction.',
    fields: [
      numberField('z', 'Critical z score', '1.96'),
      numberField('proportion', 'Expected proportion (0–1)', '0.5'),
      numberField('error', 'Absolute margin (0–1)', '0.05'),
    ],
  },
  {
    id: 'triangle-calculator',
    name: 'Triangle calculator',
    description: 'Calculate area from base and perpendicular height.',
    fields: [
      numberField('base', 'Base', '10'),
      numberField('height', 'Height', '6'),
    ],
  },
  {
    id: 'circle-calculator',
    name: 'Circle calculator',
    description: 'Calculate area, circumference, and diameter from radius.',
    fields: [numberField('radius', 'Radius', '5')],
  },
  {
    id: 'rectangle-calculator',
    name: 'Rectangle calculator',
    description: 'Calculate area, perimeter, and diagonal.',
    fields: [
      numberField('length', 'Length', '8'),
      numberField('width', 'Width', '5'),
    ],
  },
  {
    id: 'polygon-calculator',
    name: 'Regular-polygon calculator',
    description:
      'Calculate perimeter and area from side count and side length.',
    fields: [
      numberField('sides', 'Number of sides', '6'),
      numberField('side', 'Side length', '4'),
    ],
  },
  {
    id: 'temperature-converter',
    name: 'Temperature converter',
    description: 'Convert Celsius, Fahrenheit, and Kelvin.',
    fields: [
      numberField('value', 'Temperature', '0'),
      selectField('from', 'From', [
        { value: 'C', label: 'Celsius' },
        { value: 'F', label: 'Fahrenheit' },
        { value: 'K', label: 'Kelvin' },
      ]),
      {
        ...selectField('to', 'To', [
          { value: 'C', label: 'Celsius' },
          { value: 'F', label: 'Fahrenheit' },
          { value: 'K', label: 'Kelvin' },
        ]),
        defaultValue: 'F',
      },
    ],
  },
  {
    id: 'roman-numeral-converter',
    name: 'Roman-numeral converter',
    description:
      'Convert integers 1–3999 to Roman numerals or parse canonical Roman numerals.',
    fields: [textField('value', 'Number or Roman numeral', '2026')],
  },
  {
    id: 'scientific-notation-converter',
    name: 'Scientific-notation converter',
    description: 'Show a finite number in normalized scientific notation.',
    fields: [numberField('value', 'Number', '12345')],
  },
  {
    id: 'rounding-calculator',
    name: 'Rounding calculator',
    description: 'Round a finite number to a chosen number of decimal places.',
    fields: [
      numberField('value', 'Number', '3.14159'),
      numberField('places', 'Decimal places', '2'),
    ],
  },
  {
    id: 'random-number-generator',
    name: 'Random-number generator',
    description: 'Generate random integers in an inclusive range.',
    fields: [
      numberField('minimum', 'Minimum', '1'),
      numberField('maximum', 'Maximum', '100'),
      numberField('count', 'How many', '1'),
    ],
  },
  {
    id: 'dice-roller',
    name: 'Dice roller',
    description: 'Roll one to 100 dice with two to 1,000 sides.',
    fields: [
      numberField('dice', 'Number of dice', '2'),
      numberField('sides', 'Sides per die', '6'),
    ],
  },
  {
    id: 'coin-flipper',
    name: 'Coin flipper',
    description: 'Flip one to 100 fair virtual coins.',
    fields: [numberField('count', 'Number of coins', '1')],
  },
  {
    id: 'sequence-generator',
    name: 'Sequence generator',
    description: 'Generate an arithmetic sequence.',
    fields: [
      numberField('start', 'Start', '1'),
      numberField('step', 'Step', '1'),
      numberField('count', 'Number of terms', '10'),
    ],
  },
] as const;

export const MATH_OPERATIONS: readonly MathOperation[] = [
  ...fixedOperations,
  ...UNIT_SYSTEMS.map((system) => ({
    id: system.id,
    name: system.name,
    description: system.description,
    fields: unitFields(system),
  })),
];

function numeric(values: Record<string, string>, key: string) {
  const value = Number(values[key]);
  if (!Number.isFinite(value))
    throw new Error(`Enter a finite number for ${key}.`);
  return value;
}

function integer(
  values: Record<string, string>,
  key: string,
  minimum?: number,
) {
  const value = numeric(values, key);
  if (
    !Number.isSafeInteger(value) ||
    (minimum !== undefined && value < minimum)
  )
    throw new Error(
      `${key} must be a safe whole number${minimum === undefined ? '' : ` of at least ${minimum}`}.`,
    );
  return value;
}

function format(value: number) {
  if (!Number.isFinite(value))
    throw new Error('The result is outside the finite number range.');
  if (Object.is(value, -0)) return '0';
  return Number(value.toPrecision(12)).toString();
}

function parseList(source: string) {
  const result = source
    .split(/[\s,;]+/gu)
    .filter(Boolean)
    .map(Number);
  if (!result.length || result.some((value) => !Number.isFinite(value)))
    throw new Error(
      'Enter a list of finite numbers separated by spaces or commas.',
    );
  if (result.length > 100_000)
    throw new Error('Number lists are limited to 100,000 values.');
  return result;
}

function gcd(a: number, b: number) {
  let left = Math.abs(a);
  let right = Math.abs(b);
  while (right) [left, right] = [right, left % right];
  return left;
}

function factorialRatio(n: number, r: number) {
  let result = 1;
  for (let value = n - r + 1; value <= n; value += 1) {
    result *= value;
    if (!Number.isSafeInteger(result))
      throw new Error(
        'The exact integer result exceeds JavaScript’s safe range.',
      );
  }
  return result;
}

function tokens(expression: string) {
  if (!expression.trim() || expression.length > 200)
    throw new Error('Enter an expression up to 200 characters.');
  const result = [];
  let rest = expression;
  while (rest.length) {
    const whitespace = /^\s+/u.exec(rest);
    if (whitespace) {
      rest = rest.slice(whitespace[0].length);
      continue;
    }
    const match = /^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|^[()+\-*/%^]/iu.exec(
      rest,
    );
    if (!match)
      throw new Error('The expression contains an unsupported token.');
    result.push(match[0]);
    rest = rest.slice(match[0].length);
  }
  return result;
}

function evaluate(expression: string) {
  const input = tokens(expression);
  let index = 0;
  const peek = () => input[index];
  const take = () => input[index++];
  const primary = (): number => {
    if (peek() === '(') {
      take();
      const value = addSubtract();
      if (take() !== ')') throw new Error('Parentheses are not balanced.');
      return value;
    }
    const value = Number(take());
    if (!Number.isFinite(value))
      throw new Error('Enter a valid finite number.');
    return value;
  };
  const power = (): number => {
    const left = primary();
    return peek() === '^' ? (take(), left ** unary()) : left;
  };
  const unary = (): number =>
    peek() === '+'
      ? (take(), unary())
      : peek() === '-'
        ? (take(), -unary())
        : power();
  const multiplyDivide = (): number => {
    let value = unary();
    while (['*', '/', '%'].includes(peek())) {
      const operator = take();
      const right = unary();
      if ((operator === '/' || operator === '%') && right === 0)
        throw new Error('Division by zero is not defined.');
      value =
        operator === '*'
          ? value * right
          : operator === '/'
            ? value / right
            : value % right;
    }
    return value;
  };
  const addSubtract = (): number => {
    let value = multiplyDivide();
    while (peek() === '+' || peek() === '-') {
      const operator = take();
      const right = multiplyDivide();
      value = operator === '+' ? value + right : value - right;
    }
    return value;
  };
  const value = addSubtract();
  if (index !== input.length)
    throw new Error('The expression could not be fully evaluated.');
  if (!Number.isFinite(value))
    throw new Error('The result is outside the finite number range.');
  return value;
}

const ROMAN_VALUES: readonly [number, string][] = [
  [1000, 'M'],
  [900, 'CM'],
  [500, 'D'],
  [400, 'CD'],
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
];

function toRoman(value: number) {
  if (!Number.isInteger(value) || value < 1 || value > 3999)
    throw new Error('Roman numerals support integers from 1 to 3999.');
  let remainder = value;
  let output = '';
  for (const [amount, numeral] of ROMAN_VALUES)
    while (remainder >= amount) {
      output += numeral;
      remainder -= amount;
    }
  return output;
}

function fromRoman(source: string) {
  const input = source.toLocaleUpperCase().trim();
  if (!/^[IVXLCDM]+$/u.test(input))
    throw new Error(
      'Enter an integer or a Roman numeral using I, V, X, L, C, D, and M.',
    );
  let index = 0;
  let total = 0;
  for (const [amount, numeral] of ROMAN_VALUES)
    while (input.slice(index, index + numeral.length) === numeral) {
      total += amount;
      index += numeral.length;
    }
  if (index !== input.length || toRoman(total) !== input)
    throw new Error('Enter a canonical Roman numeral from I to MMMCMXCIX.');
  return total;
}

function convertTemperature(value: number, from: string, to: string) {
  const kelvin =
    from === 'K'
      ? value
      : from === 'C'
        ? value + 273.15
        : (value - 32) * (5 / 9) + 273.15;
  if (kelvin < 0) throw new Error('Temperature cannot be below absolute zero.');
  return to === 'K'
    ? kelvin
    : to === 'C'
      ? kelvin - 273.15
      : (kelvin - 273.15) * (9 / 5) + 32;
}

function parseMatrix(source: string) {
  const rows = source
    .trim()
    .split(/\s*;\s*|\r?\n/gu)
    .filter(Boolean)
    .map((row) =>
      row
        .split(/[\s,]+/gu)
        .filter(Boolean)
        .map(Number),
    );
  if (
    !rows.length ||
    !rows[0].length ||
    rows.length > 6 ||
    rows[0].length > 6 ||
    rows.some(
      (row) =>
        row.length !== rows[0].length ||
        row.some((value) => !Number.isFinite(value)),
    )
  )
    throw new Error(
      'Enter a rectangular finite-number matrix up to 6×6; separate rows with semicolons.',
    );
  return rows;
}

function matrixText(matrix: number[][]) {
  return matrix.map((row) => row.map(format).join('\t')).join('\n');
}

function determinant(matrix: number[][]): number {
  if (matrix.length === 1) return matrix[0][0];
  if (matrix.length === 2)
    return matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
  return matrix[0].reduce((total, value, column) => {
    const minor = matrix
      .slice(1)
      .map((row) => row.filter((_, index) => index !== column));
    return total + (column % 2 ? -1 : 1) * value * determinant(minor);
  }, 0);
}

const SMALL_WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
] as const;

const TENS_WORDS = [
  '',
  '',
  'twenty',
  'thirty',
  'forty',
  'fifty',
  'sixty',
  'seventy',
  'eighty',
  'ninety',
] as const;

function underThousand(value: number) {
  const words: string[] = [];
  let remainder = value;
  if (remainder >= 100) {
    words.push(SMALL_WORDS[Math.floor(remainder / 100)], 'hundred');
    remainder %= 100;
  }
  if (remainder >= 20) {
    const ones = remainder % 10;
    words.push(
      `${TENS_WORDS[Math.floor(remainder / 10)]}${ones ? `-${SMALL_WORDS[ones]}` : ''}`,
    );
  } else if (remainder) words.push(SMALL_WORDS[remainder]);
  return words.join(' ');
}

function numberToWords(value: number) {
  if (!Number.isSafeInteger(value) || Math.abs(value) > 999_999_999_999)
    throw new Error(
      'Use a safe whole number from -999,999,999,999 to 999,999,999,999.',
    );
  if (value === 0) return 'zero';
  const sign = value < 0 ? 'minus ' : '';
  let remainder = Math.abs(value);
  const groups: Array<[number, string]> = [
    [1_000_000_000, 'billion'],
    [1_000_000, 'million'],
    [1000, 'thousand'],
    [1, ''],
  ];
  const words: string[] = [];
  for (const [amount, label] of groups) {
    const part = Math.floor(remainder / amount);
    if (part) words.push(underThousand(part), label);
    remainder %= amount;
  }
  return `${sign}${words.filter(Boolean).join(' ')}`;
}

function wordsToNumber(source: string) {
  const small = new Map<string, number>(
    SMALL_WORDS.map((word, index) => [word, index]),
  );
  for (let index = 2; index < TENS_WORDS.length; index += 1)
    small.set(TENS_WORDS[index], index * 10);
  const scales = new Map([
    ['thousand', 1000],
    ['million', 1_000_000],
    ['billion', 1_000_000_000],
  ]);
  const tokens = source
    .toLocaleLowerCase('en-US')
    .replaceAll('-', ' ')
    .split(/\s+/gu)
    .filter((token) => token && token !== 'and');
  if (!tokens.length || tokens.length > 100)
    throw new Error('Enter supported English whole-number words.');
  let sign = 1;
  if (tokens[0] === 'minus' || tokens[0] === 'negative') {
    sign = -1;
    tokens.shift();
  }
  let total = 0;
  let group = 0;
  let previousScale = Number.POSITIVE_INFINITY;
  for (const token of tokens) {
    const amount = small.get(token);
    if (amount !== undefined) group += amount;
    else if (token === 'hundred') {
      if (group < 1 || group > 9)
        throw new Error('“Hundred” must follow one through nine.');
      group *= 100;
    } else if (scales.has(token)) {
      const scale = scales.get(token) as number;
      if (!group || scale >= previousScale)
        throw new Error('Number scales must be non-zero and descending.');
      total += group * scale;
      group = 0;
      previousScale = scale;
    } else throw new Error(`Unsupported number word: ${token}.`);
  }
  const result = sign * (total + group);
  if (!Number.isSafeInteger(result))
    throw new Error('The parsed result exceeds the safe integer range.');
  return result;
}

function pairedLists(values: Record<string, string>) {
  const x = parseList(values.x);
  const y = parseList(values.y);
  if (x.length !== y.length || x.length < 2)
    throw new Error(
      'X and Y must contain the same number of at least two values.',
    );
  return { x, y };
}

function regression(values: Record<string, string>) {
  const { x, y } = pairedLists(values);
  const meanX = x.reduce((sum, value) => sum + value, 0) / x.length;
  const meanY = y.reduce((sum, value) => sum + value, 0) / y.length;
  const covariance = x.reduce(
    (sum, value, index) => sum + (value - meanX) * (y[index] - meanY),
    0,
  );
  const spreadX = x.reduce((sum, value) => sum + (value - meanX) ** 2, 0);
  const spreadY = y.reduce((sum, value) => sum + (value - meanY) ** 2, 0);
  if (!spreadX) throw new Error('X values must not all be identical.');
  return {
    slope: covariance / spreadX,
    intercept: meanY - (covariance / spreadX) * meanX,
    correlation: spreadY ? covariance / Math.sqrt(spreadX * spreadY) : 0,
  };
}

export function runMathOperation(
  operationId: string,
  values: Record<string, string>,
  random: () => number = Math.random,
) {
  const system = UNIT_SYSTEMS.find((item) => item.id === operationId);
  if (system) {
    const value = numeric(values, 'value');
    const from = system.units[values.from];
    const to = system.units[values.to];
    if (!from || !to)
      throw new Error('Choose supported input and output units.');
    return `${format((value * from.factor) / to.factor)} ${values.to}`;
  }

  switch (operationId) {
    case 'basic-calculator':
      return format(evaluate(values.expression ?? ''));
    case 'fraction-calculator': {
      const an = integer(values, 'aNumerator');
      const ad = integer(values, 'aDenominator');
      const bn = integer(values, 'bNumerator');
      const bd = integer(values, 'bDenominator');
      if (!ad || !bd) throw new Error('Fraction denominators cannot be zero.');
      let numerator: number;
      let denominator: number;
      if (values.operator === 'add') {
        numerator = an * bd + bn * ad;
        denominator = ad * bd;
      } else if (values.operator === 'subtract') {
        numerator = an * bd - bn * ad;
        denominator = ad * bd;
      } else if (values.operator === 'multiply') {
        numerator = an * bn;
        denominator = ad * bd;
      } else {
        if (!bn) throw new Error('Cannot divide by a zero fraction.');
        numerator = an * bd;
        denominator = ad * bn;
      }
      const divisor = gcd(numerator, denominator);
      const sign = denominator < 0 ? -1 : 1;
      return `${(numerator / divisor) * sign}/${Math.abs(denominator / divisor)}`;
    }
    case 'ratio-calculator': {
      const a = integer(values, 'a');
      const b = integer(values, 'b');
      if (!a && !b)
        throw new Error('At least one ratio value must be non-zero.');
      const divisor = gcd(a, b);
      return `${a / divisor}:${b / divisor}`;
    }
    case 'proportion-calculator': {
      const a = numeric(values, 'a');
      const b = numeric(values, 'b');
      const c = numeric(values, 'c');
      if (!a) throw new Error('a cannot be zero.');
      return `x = ${format((b * c) / a)}`;
    }
    case 'average-calculator': {
      const list = parseList(values.values);
      return format(list.reduce((sum, value) => sum + value, 0) / list.length);
    }
    case 'median-calculator': {
      const list = parseList(values.values).toSorted((a, b) => a - b);
      const middle = Math.floor(list.length / 2);
      return format(
        list.length % 2 ? list[middle] : (list[middle - 1] + list[middle]) / 2,
      );
    }
    case 'mode-calculator': {
      const list = parseList(values.values);
      const counts = new Map<number, number>();
      for (const value of list) counts.set(value, (counts.get(value) ?? 0) + 1);
      const maximum = Math.max(...counts.values());
      return [...counts.entries()]
        .filter(([, count]) => count === maximum)
        .map(([value]) => format(value))
        .join(', ');
    }
    case 'variance-calculator':
    case 'standard-deviation-calculator': {
      const list = parseList(values.values);
      const mean = list.reduce((sum, value) => sum + value, 0) / list.length;
      const variance =
        list.reduce((sum, value) => sum + (value - mean) ** 2, 0) / list.length;
      return format(
        operationId === 'variance-calculator' ? variance : Math.sqrt(variance),
      );
    }
    case 'probability-calculator': {
      const favorable = numeric(values, 'favorable');
      const total = numeric(values, 'total');
      if (total <= 0 || favorable < 0 || favorable > total)
        throw new Error('Use 0 ≤ favorable outcomes ≤ a positive total.');
      return `${format(favorable / total)} (${format((favorable / total) * 100)}%)`;
    }
    case 'permutation-calculator':
    case 'combination-calculator': {
      const n = integer(values, 'n', 0);
      const r = integer(values, 'r', 0);
      if (r > n) throw new Error('r cannot exceed n.');
      const permutations = factorialRatio(n, r);
      if (operationId === 'permutation-calculator') return String(permutations);
      const divisor = factorialRatio(r, r);
      return String(permutations / divisor);
    }
    case 'prime-number-checker': {
      const value = integer(values, 'value', 2);
      if (value > 1_000_000_000_000)
        throw new Error('Prime checks are limited to one trillion.');
      let prime = true;
      if (value % 2 === 0) prime = value === 2;
      else
        for (let divisor = 3; divisor * divisor <= value; divisor += 2)
          if (value % divisor === 0) {
            prime = false;
            break;
          }
      return prime ? `${value} is prime.` : `${value} is not prime.`;
    }
    case 'prime-factorization': {
      let value = integer(values, 'value', 2);
      if (value > 1_000_000_000_000)
        throw new Error('Factorization is limited to one trillion.');
      const factors: number[] = [];
      for (
        let divisor = 2;
        divisor * divisor <= value;
        divisor += divisor === 2 ? 1 : 2
      )
        while (value % divisor === 0) {
          factors.push(divisor);
          value /= divisor;
        }
      if (value > 1) factors.push(value);
      return factors.join(' × ');
    }
    case 'gcd-calculator':
      return String(gcd(integer(values, 'a'), integer(values, 'b')));
    case 'lcm-calculator': {
      const a = integer(values, 'a');
      const b = integer(values, 'b');
      const result = a === 0 || b === 0 ? 0 : Math.abs((a / gcd(a, b)) * b);
      if (!Number.isSafeInteger(result))
        throw new Error('The exact LCM exceeds JavaScript’s safe range.');
      return String(result);
    }
    case 'quadratic-equation-solver': {
      const a = numeric(values, 'a');
      const b = numeric(values, 'b');
      const c = numeric(values, 'c');
      if (!a) throw new Error('a cannot be zero for a quadratic equation.');
      const discriminant = b ** 2 - 4 * a * c;
      if (discriminant >= 0)
        return `x₁ = ${format((-b + Math.sqrt(discriminant)) / (2 * a))}\nx₂ = ${format((-b - Math.sqrt(discriminant)) / (2 * a))}`;
      const real = -b / (2 * a);
      const imaginary = Math.sqrt(-discriminant) / Math.abs(2 * a);
      return `x₁ = ${format(real)} + ${format(imaginary)}i\nx₂ = ${format(real)} - ${format(imaginary)}i`;
    }
    case 'linear-equation-solver': {
      const a = numeric(values, 'a');
      if (!a) throw new Error('a cannot be zero.');
      return `x = ${format(-numeric(values, 'b') / a)}`;
    }
    case 'logarithm-calculator': {
      const value = numeric(values, 'value');
      const base = numeric(values, 'base');
      if (value <= 0 || base <= 0 || base === 1)
        throw new Error('Use x > 0 and a positive base other than 1.');
      return format(Math.log(value) / Math.log(base));
    }
    case 'exponent-calculator':
      return format(numeric(values, 'base') ** numeric(values, 'exponent'));
    case 'root-calculator': {
      const value = numeric(values, 'value');
      const degree = numeric(values, 'degree');
      if (!degree) throw new Error('Root degree cannot be zero.');
      if (
        value < 0 &&
        (!Number.isInteger(degree) || Math.abs(degree % 2) !== 1)
      )
        throw new Error(
          'A negative value requires an odd whole-number root degree.',
        );
      return format(
        value < 0 ? -(Math.abs(value) ** (1 / degree)) : value ** (1 / degree),
      );
    }
    case 'scientific-calculator': {
      const input = numeric(values, 'value');
      const angleInput =
        values.angle === 'degrees' ? (input * Math.PI) / 180 : input;
      const functions: Record<string, () => number> = {
        sin: () => Math.sin(angleInput),
        cos: () => Math.cos(angleInput),
        tan: () => Math.tan(angleInput),
        asin: () =>
          (Math.asin(input) * (values.angle === 'degrees' ? 180 : 1)) /
          (values.angle === 'degrees' ? Math.PI : 1),
        acos: () =>
          (Math.acos(input) * (values.angle === 'degrees' ? 180 : 1)) /
          (values.angle === 'degrees' ? Math.PI : 1),
        atan: () =>
          (Math.atan(input) * (values.angle === 'degrees' ? 180 : 1)) /
          (values.angle === 'degrees' ? Math.PI : 1),
        ln: () => Math.log(input),
        log10: () => Math.log10(input),
        sqrt: () => Math.sqrt(input),
        abs: () => Math.abs(input),
      };
      const operation = functions[values.function];
      if (!operation)
        throw new Error('Choose a supported scientific function.');
      return format(operation());
    }
    case 'system-of-equations-solver': {
      const a1 = numeric(values, 'a1');
      const b1 = numeric(values, 'b1');
      const c1 = numeric(values, 'c1');
      const a2 = numeric(values, 'a2');
      const b2 = numeric(values, 'b2');
      const c2 = numeric(values, 'c2');
      const divisor = a1 * b2 - a2 * b1;
      if (!divisor) throw new Error('The system has no unique solution.');
      return `x = ${format((c1 * b2 - c2 * b1) / divisor)}\ny = ${format((a1 * c2 - a2 * c1) / divisor)}`;
    }
    case 'matrix-calculator': {
      const a = parseMatrix(values.matrixA);
      const b = parseMatrix(values.matrixB);
      if (values.operator === 'multiply') {
        if (a[0].length !== b.length)
          throw new Error('A columns must equal B rows for multiplication.');
        return matrixText(
          a.map((row) =>
            b[0].map((_, column) =>
              row.reduce(
                (sum, value, index) => sum + value * b[index][column],
                0,
              ),
            ),
          ),
        );
      }
      if (a.length !== b.length || a[0].length !== b[0].length)
        throw new Error(
          'Matrices must have equal dimensions for addition or subtraction.',
        );
      const direction = values.operator === 'subtract' ? -1 : 1;
      return matrixText(
        a.map((row, rowIndex) =>
          row.map((value, column) => value + direction * b[rowIndex][column]),
        ),
      );
    }
    case 'determinant-calculator': {
      const matrix = parseMatrix(values.matrix);
      if (matrix.length !== matrix[0].length)
        throw new Error('A determinant requires a square matrix.');
      return format(determinant(matrix));
    }
    case 'complex-number-calculator': {
      const ar = numeric(values, 'realA');
      const ai = numeric(values, 'imagA');
      const br = numeric(values, 'realB');
      const bi = numeric(values, 'imagB');
      let real: number;
      let imaginary: number;
      if (values.operator === 'add') [real, imaginary] = [ar + br, ai + bi];
      else if (values.operator === 'subtract')
        [real, imaginary] = [ar - br, ai - bi];
      else if (values.operator === 'multiply')
        [real, imaginary] = [ar * br - ai * bi, ar * bi + ai * br];
      else {
        const divisor = br ** 2 + bi ** 2;
        if (!divisor) throw new Error('Cannot divide by 0 + 0i.');
        [real, imaginary] = [
          (ar * br + ai * bi) / divisor,
          (ai * br - ar * bi) / divisor,
        ];
      }
      return `${format(real)} ${imaginary < 0 ? '−' : '+'} ${format(Math.abs(imaginary))}i`;
    }
    case 'geometry-calculator': {
      const a = numeric(values, 'a');
      const b = numeric(values, 'b');
      if (a < 0 || b < 0) throw new Error('Dimensions cannot be negative.');
      if (values.shape === 'circle')
        return `Area = ${format(Math.PI * a ** 2)}\nPerimeter = ${format(2 * Math.PI * a)}`;
      if (values.shape === 'triangle')
        return `Area = ${format((a * b) / 2)}\nPerimeter = ${format(a + b + Math.hypot(a, b))}`;
      return `Area = ${format(a * b)}\nPerimeter = ${format(2 * (a + b))}`;
    }
    case 'volume-calculator': {
      const a = numeric(values, 'a');
      const b = numeric(values, 'b');
      const c = numeric(values, 'c');
      if ([a, b, c].some((value) => value < 0))
        throw new Error('Dimensions cannot be negative.');
      const result =
        values.shape === 'sphere'
          ? (4 / 3) * Math.PI * a ** 3
          : values.shape === 'cylinder'
            ? Math.PI * a ** 2 * b
            : values.shape === 'cone'
              ? (Math.PI * a ** 2 * b) / 3
              : a * b * c;
      return `Volume = ${format(result)}`;
    }
    case 'surface-area-calculator': {
      const a = numeric(values, 'a');
      const b = numeric(values, 'b');
      const c = numeric(values, 'c');
      if ([a, b, c].some((value) => value < 0))
        throw new Error('Dimensions cannot be negative.');
      const result =
        values.shape === 'sphere'
          ? 4 * Math.PI * a ** 2
          : values.shape === 'cylinder'
            ? 2 * Math.PI * a * (a + b)
            : 2 * (a * b + a * c + b * c);
      return `Surface area = ${format(result)}`;
    }
    case 'fuel-economy-converter': {
      const input = numeric(values, 'value');
      if (input <= 0) throw new Error('Fuel economy must be positive.');
      const litresPerHundred =
        values.from === 'l100km'
          ? input
          : values.from === 'mpg-us'
            ? 235.214583 / input
            : 282.480936 / input;
      const output =
        values.to === 'l100km'
          ? litresPerHundred
          : values.to === 'mpg-us'
            ? 235.214583 / litresPerHundred
            : 282.480936 / litresPerHundred;
      return `${format(output)} ${values.to}`;
    }
    case 'number-to-words':
      return numberToWords(integer(values, 'value'));
    case 'words-to-number':
      return String(wordsToNumber(values.words ?? ''));
    case 'significant-figures-calculator': {
      const value = numeric(values, 'value');
      const figures = integer(values, 'figures', 1);
      if (figures > 100)
        throw new Error('Use from 1 to 100 significant figures.');
      return value.toPrecision(figures);
    }
    case 'margin-of-error-calculator': {
      const deviation = numeric(values, 'deviation');
      const sample = integer(values, 'sample', 1);
      const z = numeric(values, 'z');
      if (deviation < 0 || z <= 0)
        throw new Error(
          'Deviation must be non-negative and z must be positive.',
        );
      return format((z * deviation) / Math.sqrt(sample));
    }
    case 'confidence-interval-calculator': {
      const mean = numeric(values, 'mean');
      const deviation = numeric(values, 'deviation');
      const sample = integer(values, 'sample', 1);
      const z = numeric(values, 'z');
      if (deviation < 0 || z <= 0)
        throw new Error(
          'Deviation must be non-negative and z must be positive.',
        );
      const margin = (z * deviation) / Math.sqrt(sample);
      return `${format(mean - margin)} to ${format(mean + margin)}\nMargin = ${format(margin)}`;
    }
    case 'z-score-calculator': {
      const deviation = numeric(values, 'deviation');
      if (deviation <= 0)
        throw new Error('Standard deviation must be positive.');
      return format(
        (numeric(values, 'value') - numeric(values, 'mean')) / deviation,
      );
    }
    case 'percentile-calculator': {
      const list = parseList(values.values).toSorted((a, b) => a - b);
      const percentile = numeric(values, 'percentile');
      if (percentile < 0 || percentile > 100)
        throw new Error('Percentile must be from 0 to 100.');
      const position = ((list.length - 1) * percentile) / 100;
      const lower = Math.floor(position);
      const remainder = position - lower;
      return format(
        list[lower] +
          ((list[lower + 1] ?? list[lower]) - list[lower]) * remainder,
      );
    }
    case 'correlation-calculator':
      return format(regression(values).correlation);
    case 'linear-regression-calculator': {
      const result = regression(values);
      return `y = ${format(result.intercept)} + ${format(result.slope)}x\nPearson r = ${format(result.correlation)}`;
    }
    case 'sample-size-calculator': {
      const z = numeric(values, 'z');
      const proportion = numeric(values, 'proportion');
      const error = numeric(values, 'error');
      if (
        z <= 0 ||
        proportion <= 0 ||
        proportion >= 1 ||
        error <= 0 ||
        error >= 1
      )
        throw new Error(
          'Use z > 0 and proportions/margins strictly between 0 and 1.',
        );
      return `${Math.ceil((z ** 2 * proportion * (1 - proportion)) / error ** 2)} observations`;
    }
    case 'triangle-calculator': {
      const base = numeric(values, 'base');
      const height = numeric(values, 'height');
      if (base < 0 || height < 0)
        throw new Error('Dimensions cannot be negative.');
      return `Area = ${format((base * height) / 2)}`;
    }
    case 'circle-calculator': {
      const radius = numeric(values, 'radius');
      if (radius < 0) throw new Error('Radius cannot be negative.');
      return `Area = ${format(Math.PI * radius ** 2)}\nCircumference = ${format(2 * Math.PI * radius)}\nDiameter = ${format(2 * radius)}`;
    }
    case 'rectangle-calculator': {
      const length = numeric(values, 'length');
      const width = numeric(values, 'width');
      if (length < 0 || width < 0)
        throw new Error('Dimensions cannot be negative.');
      return `Area = ${format(length * width)}\nPerimeter = ${format(2 * (length + width))}\nDiagonal = ${format(Math.hypot(length, width))}`;
    }
    case 'polygon-calculator': {
      const sides = integer(values, 'sides', 3);
      const side = numeric(values, 'side');
      if (side < 0) throw new Error('Side length cannot be negative.');
      return `Perimeter = ${format(sides * side)}\nArea = ${format((sides * side ** 2) / (4 * Math.tan(Math.PI / sides)))}`;
    }
    case 'temperature-converter':
      return `${format(convertTemperature(numeric(values, 'value'), values.from, values.to))} °${values.to}`;
    case 'roman-numeral-converter': {
      const source = values.value?.trim() ?? '';
      return /^\d+$/u.test(source)
        ? toRoman(Number(source))
        : String(fromRoman(source));
    }
    case 'scientific-notation-converter': {
      const [mantissa, exponent] = numeric(values, 'value')
        .toExponential(10)
        .split('e');
      return `${mantissa.replace(/\.?0+$/u, '')}e${exponent}`;
    }
    case 'rounding-calculator': {
      const places = integer(values, 'places');
      if (places < 0 || places > 100)
        throw new Error('Decimal places must be from 0 to 100.');
      return numeric(values, 'value').toFixed(places);
    }
    case 'random-number-generator': {
      const minimum = integer(values, 'minimum');
      const maximum = integer(values, 'maximum');
      const count = integer(values, 'count', 1);
      if (maximum < minimum)
        throw new Error('Maximum must be at least the minimum.');
      if (count > 100) throw new Error('Generate at most 100 numbers at once.');
      return Array.from({ length: count }, () =>
        String(minimum + Math.floor(random() * (maximum - minimum + 1))),
      ).join('\n');
    }
    case 'dice-roller': {
      const dice = integer(values, 'dice', 1);
      const sides = integer(values, 'sides', 2);
      if (dice > 100 || sides > 1000)
        throw new Error('Use at most 100 dice and 1,000 sides.');
      const rolls = Array.from(
        { length: dice },
        () => 1 + Math.floor(random() * sides),
      );
      return `${rolls.join(', ')}\nTotal = ${rolls.reduce((sum, value) => sum + value, 0)}`;
    }
    case 'coin-flipper': {
      const count = integer(values, 'count', 1);
      if (count > 100) throw new Error('Flip at most 100 coins.');
      return Array.from({ length: count }, () =>
        random() < 0.5 ? 'Heads' : 'Tails',
      ).join('\n');
    }
    case 'sequence-generator': {
      const start = numeric(values, 'start');
      const step = numeric(values, 'step');
      const count = integer(values, 'count', 1);
      if (count > 1000) throw new Error('Generate at most 1,000 terms.');
      return Array.from({ length: count }, (_, index) =>
        format(start + step * index),
      ).join(', ');
    }
    default:
      throw new Error('Choose a supported math operation.');
  }
}
