// Generated from `toolSubsectionsForGroup` -- see lib/tools/browse.ts for why,
// and browse.test.ts, which fails if this file drifts from the catalogue.
//
// Regenerate with `npx tsx scripts/generate-browse-data.mjs`.
import type { BrowseSection } from '../browse';

export const SECTIONS: readonly BrowseSection[] = [
  {
    id: 'calculators',
    title: 'Calculators & units',
    description: 'Percentages, arithmetic, formulas, and unit conversion.',
    destinations: [
      {
        id: 'percentage-calculator',
        name: 'Percentage calculator',
        description: 'Calculate percentages, ratios, and percentage change.',
        href: '/math/percentage-calculator',
        workspaceId: 'percentage-calculator',
      },
      {
        id: 'math-workbench:basic-calculator',
        name: 'Basic calculator',
        description:
          'Evaluate arithmetic with +, −, ×, ÷, %, powers, and parentheses.',
        href: '/math/workbench?tool=basic-calculator',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:fraction-calculator',
        name: 'Fraction calculator',
        description:
          'Add, subtract, multiply or divide two fractions written as whole-number numerators and denominators. The answer comes back reduced to its lowest terms.',
        href: '/math/workbench?tool=fraction-calculator',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:ratio-calculator',
        name: 'Ratio calculator',
        description:
          'Reduce a ratio of two whole numbers to its lowest terms, such as 12:18 down to 2:3. Handy for simplifying aspect ratios, mixes and scale drawings.',
        href: '/math/workbench?tool=ratio-calculator',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:proportion-calculator',
        name: 'Proportion calculator',
        description:
          'Solve a:b = c:x for the missing fourth value when you know the other three. Useful for scaling a recipe, a map distance or a mixing ratio up or down.',
        href: '/math/workbench?tool=proportion-calculator',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:average-calculator',
        name: 'Average calculator',
        description:
          'Work out the arithmetic mean of a list of numbers typed with commas, spaces or semicolons between them. The total is divided by how many values you entered.',
        href: '/math/workbench?tool=average-calculator',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:median-calculator',
        name: 'Median calculator',
        description:
          'Find the middle value of a list of numbers. The list is sorted first, and with an even count the two central values are averaged to give the median.',
        href: '/math/workbench?tool=median-calculator',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:mode-calculator',
        name: 'Mode calculator',
        description:
          'Find the most frequent value in a list of numbers separated by commas or spaces. Every value tied for the top count is listed, so a two-way tie shows both.',
        href: '/math/workbench?tool=mode-calculator',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:variance-calculator',
        name: 'Variance calculator',
        description:
          'Work out the population variance of a list of numbers: each value’s squared distance from the mean, averaged over every value, not over n − 1.',
        href: '/math/workbench?tool=variance-calculator',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:standard-deviation-calculator',
        name: 'Standard-deviation calculator',
        description:
          'Work out the population standard deviation of a list of numbers: the square root of a variance that divides the squared spread by n, not by n − 1.',
        href: '/math/workbench?tool=standard-deviation-calculator',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:probability-calculator',
        name: 'Probability calculator',
        description: 'Calculate favorable outcomes divided by total outcomes.',
        href: '/math/workbench?tool=probability-calculator',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:permutation-calculator',
        name: 'Permutation calculator',
        description:
          'Work out nPr, the number of ways to arrange r items chosen from n where order matters. Both must be whole numbers and r cannot be larger than n.',
        href: '/math/workbench?tool=permutation-calculator',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:combination-calculator',
        name: 'Combination calculator',
        description:
          'Work out nCr, the number of ways to choose r items from n when order does not matter. Both are whole numbers, and r cannot be larger than n.',
        href: '/math/workbench?tool=combination-calculator',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:prime-number-checker',
        name: 'Prime-number checker',
        description:
          'Check whether a whole number from 2 up to one trillion is prime. Trial division by odd divisors reports it as prime or not prime, with no factor list.',
        href: '/math/workbench?tool=prime-number-checker',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:prime-factorization',
        name: 'Prime factorization',
        description: 'Factor a positive safe integer up to one trillion.',
        href: '/math/workbench?tool=prime-factorization',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:gcd-calculator',
        name: 'GCD calculator',
        description:
          'Find the greatest common divisor of two whole numbers, the largest value that divides both exactly. Signs are ignored, so −48 and 18 give the same 6.',
        href: '/math/workbench?tool=gcd-calculator',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:lcm-calculator',
        name: 'LCM calculator',
        description:
          'Find the least common multiple of two whole numbers, the smallest value both divide into. Useful for adding fractions with different denominators.',
        href: '/math/workbench?tool=lcm-calculator',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:quadratic-equation-solver',
        name: 'Quadratic-equation solver',
        description:
          'Solve ax² + bx + c = 0 for both roots from the three coefficients. When the discriminant is negative the pair is given in a + bi complex form.',
        href: '/math/workbench?tool=quadratic-equation-solver',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:linear-equation-solver',
        name: 'Linear-equation solver',
        description:
          'Solve ax + b = 0 for the value of x from the two coefficients. a cannot be zero, since an equation without an x term has no single value to solve for.',
        href: '/math/workbench?tool=linear-equation-solver',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:logarithm-calculator',
        name: 'Logarithm calculator',
        description:
          'Work out the logarithm of x to any base you name, whether that is base 10, base 2 or e. x must be above zero and the base positive and not equal to 1.',
        href: '/math/workbench?tool=logarithm-calculator',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:exponent-calculator',
        name: 'Exponent calculator',
        description:
          'Raise a base to an exponent, including negative and fractional powers such as 2 to the 8 or 9 to the 0.5. Both boxes take any finite number.',
        href: '/math/workbench?tool=exponent-calculator',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:root-calculator',
        name: 'Root calculator',
        description: 'Calculate an nth root with real-number validation.',
        href: '/math/workbench?tool=root-calculator',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:scientific-calculator',
        name: 'Scientific calculator',
        description:
          'Apply a common scientific function with explicit degrees or radians.',
        href: '/math/workbench?tool=scientific-calculator',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:system-of-equations-solver',
        name: 'System-of-equations solver',
        description: 'Solve a 2×2 linear system a₁x+b₁y=c₁ and a₂x+b₂y=c₂.',
        href: '/math/workbench?tool=system-of-equations-solver',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:matrix-calculator',
        name: 'Matrix calculator',
        description: 'Add, subtract, or multiply bounded numeric matrices.',
        href: '/math/workbench?tool=matrix-calculator',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:determinant-calculator',
        name: 'Determinant calculator',
        description: 'Calculate a determinant for a square matrix up to 6×6.',
        href: '/math/workbench?tool=determinant-calculator',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:complex-number-calculator',
        name: 'Complex-number calculator',
        description:
          'Add, subtract, multiply, or divide a+bi coordinate pairs.',
        href: '/math/workbench?tool=complex-number-calculator',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:geometry-calculator',
        name: 'Geometry calculator',
        description: 'Calculate area and perimeter for a selected 2D shape.',
        href: '/math/workbench?tool=geometry-calculator',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:volume-calculator',
        name: 'Volume calculator',
        description: 'Calculate common solid volumes from explicit dimensions.',
        href: '/math/workbench?tool=volume-calculator',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:surface-area-calculator',
        name: 'Surface-area calculator',
        description: 'Calculate total surface area for common closed solids.',
        href: '/math/workbench?tool=surface-area-calculator',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:fuel-economy-converter',
        name: 'Fuel-economy converter',
        description:
          'Convert fuel economy between litres per 100 km, US MPG and imperial MPG. The two gallon sizes differ, so US and imperial figures are not the same.',
        href: '/math/workbench?tool=fuel-economy-converter',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:number-to-words',
        name: 'Number to words',
        description:
          'Spell a safe whole number up to 999,999,999,999 in English.',
        href: '/math/workbench?tool=number-to-words',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:words-to-number',
        name: 'Words to number',
        description:
          'Parse supported English whole-number words up to billions.',
        href: '/math/workbench?tool=words-to-number',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:significant-figures-calculator',
        name: 'Significant-figures calculator',
        description:
          'Round a finite non-zero number to 1–100 significant figures.',
        href: '/math/workbench?tool=significant-figures-calculator',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:margin-of-error-calculator',
        name: 'Margin-of-error calculator',
        description:
          'Calculate z × sample deviation ÷ √n with an explicit z score.',
        href: '/math/workbench?tool=margin-of-error-calculator',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:confidence-interval-calculator',
        name: 'Confidence-interval calculator',
        description:
          'Calculate a normal-approximation mean interval from mean, deviation, n, and z.',
        href: '/math/workbench?tool=confidence-interval-calculator',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:z-score-calculator',
        name: 'Z-score calculator',
        description:
          'Calculate (value − mean) ÷ population standard deviation.',
        href: '/math/workbench?tool=z-score-calculator',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:percentile-calculator',
        name: 'Percentile calculator',
        description:
          'Interpolate a requested percentile in a finite number list.',
        href: '/math/workbench?tool=percentile-calculator',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:correlation-calculator',
        name: 'Correlation calculator',
        description:
          'Calculate Pearson correlation for two equal-length lists.',
        href: '/math/workbench?tool=correlation-calculator',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:linear-regression-calculator',
        name: 'Linear-regression calculator',
        description: 'Fit the least-squares line y = intercept + slope × x.',
        href: '/math/workbench?tool=linear-regression-calculator',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:sample-size-calculator',
        name: 'Sample-size calculator',
        description:
          'Estimate a proportion sample size z²p(1−p)/e² before finite-population correction.',
        href: '/math/workbench?tool=sample-size-calculator',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:triangle-calculator',
        name: 'Triangle calculator',
        description: 'Calculate area from base and perpendicular height.',
        href: '/math/workbench?tool=triangle-calculator',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:circle-calculator',
        name: 'Circle calculator',
        description: 'Calculate area, circumference, and diameter from radius.',
        href: '/math/workbench?tool=circle-calculator',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:rectangle-calculator',
        name: 'Rectangle calculator',
        description:
          'Work out the area, perimeter and corner-to-corner diagonal of a rectangle from its length and width. Both must be zero or above, and any unit can be used.',
        href: '/math/workbench?tool=rectangle-calculator',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:polygon-calculator',
        name: 'Regular-polygon calculator',
        description:
          'Calculate perimeter and area from side count and side length.',
        href: '/math/workbench?tool=polygon-calculator',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:temperature-converter',
        name: 'Temperature converter',
        description:
          'Convert a temperature between Celsius, Fahrenheit and Kelvin. Values below absolute zero are rejected rather than converted into a negative Kelvin.',
        href: '/math/workbench?tool=temperature-converter',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:roman-numeral-converter',
        name: 'Roman-numeral converter',
        description:
          'Convert integers 1–3999 to Roman numerals or parse canonical Roman numerals.',
        href: '/math/workbench?tool=roman-numeral-converter',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:scientific-notation-converter',
        name: 'Scientific-notation converter',
        description: 'Show a finite number in normalized scientific notation.',
        href: '/math/workbench?tool=scientific-notation-converter',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:rounding-calculator',
        name: 'Rounding calculator',
        description:
          'Round a finite number to a chosen number of decimal places.',
        href: '/math/workbench?tool=rounding-calculator',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:random-number-generator',
        name: 'Random-number generator',
        description:
          'Generate up to 100 random whole numbers between a minimum and a maximum you set, with both ends of the range included in the possible results.',
        href: '/math/workbench?tool=random-number-generator',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:dice-roller',
        name: 'Dice roller',
        description:
          'Roll one to 100 dice with two to 1,000 sides each. Every individual roll is listed and then added up for a total, so d20 and d100 sets both work.',
        href: '/math/workbench?tool=dice-roller',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:coin-flipper',
        name: 'Coin flipper',
        description:
          'Flip one to 100 fair coins at once and see each result listed as heads or tails. Each flip is even odds and independent of the ones before it.',
        href: '/math/workbench?tool=coin-flipper',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:sequence-generator',
        name: 'Sequence generator',
        description:
          'Generate an arithmetic sequence from a starting value, a step and a term count of up to 1,000. The step can be negative or a decimal to count down.',
        href: '/math/workbench?tool=sequence-generator',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:distance-converter',
        name: 'Distance converter',
        description:
          'Convert a length between millimetres, centimetres, metres, kilometres, inches, feet, yards, miles and nautical miles, for travel legs or drawing dimensions.',
        href: '/math/workbench?tool=distance-converter',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:area-converter',
        name: 'Area converter',
        description:
          'Convert an area between square metres, square kilometres, square centimetres, hectares, acres, square feet, square inches and square miles for land or floors.',
        href: '/math/workbench?tool=area-converter',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:volume-converter',
        name: 'Volume converter',
        description:
          'Convert a volume between millilitres, litres, cubic metres, cubic centimetres, US fluid ounces, US cups, US gallons and cubic feet for tanks or drinks.',
        href: '/math/workbench?tool=volume-converter',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:mass-converter',
        name: 'Mass converter',
        description:
          'Convert a mass between milligrams, grams, kilograms, metric tonnes, ounces, pounds and stone, for recipe amounts, parcel weights or body weight.',
        href: '/math/workbench?tool=mass-converter',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:speed-converter',
        name: 'Speed converter',
        description:
          'Convert a speed between metres per second, kilometres per hour, miles per hour, knots and feet per second, for travel, running or wind figures.',
        href: '/math/workbench?tool=speed-converter',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:time-unit-converter',
        name: 'Time-unit converter',
        description:
          'Convert a duration between milliseconds, seconds, minutes, hours, days and weeks, for timeouts, run times and other elapsed spans given in the wrong unit.',
        href: '/math/workbench?tool=time-unit-converter',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:pressure-converter',
        name: 'Pressure converter',
        description: 'Convert pascals and common engineering pressure units.',
        href: '/math/workbench?tool=pressure-converter',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:energy-converter',
        name: 'Energy converter',
        description:
          'Convert energy between joules, kilojoules, watt-hours, kilowatt-hours, calories, kilocalories and BTU (IT), for food labels, bills and heating figures.',
        href: '/math/workbench?tool=energy-converter',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:power-converter',
        name: 'Power converter',
        description:
          'Convert power between watts, kilowatts, megawatts, mechanical horsepower and BTU per hour, for appliance ratings, engines and heating output.',
        href: '/math/workbench?tool=power-converter',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:force-converter',
        name: 'Force converter',
        description:
          'Convert a force between newtons, kilonewtons, dynes, kilogram-force and pound-force, for load ratings, spring values and physics homework answers.',
        href: '/math/workbench?tool=force-converter',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:torque-converter',
        name: 'Torque converter',
        description:
          'Convert torque between newton-metres, newton-centimetres, kilogram-force metres, pound-force feet and pound-force inches, for tightening specs.',
        href: '/math/workbench?tool=torque-converter',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:angle-converter',
        name: 'Angle converter',
        description:
          'Convert an angle between radians, degrees, gradians and turns, for trigonometry, CAD drawings and code that expects radians rather than degrees.',
        href: '/math/workbench?tool=angle-converter',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:frequency-converter',
        name: 'Frequency converter',
        description:
          'Convert a frequency between hertz, kilohertz, megahertz, gigahertz and revolutions per minute, for clock speeds, radio bands and motor ratings.',
        href: '/math/workbench?tool=frequency-converter',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:data-size-converter',
        name: 'Data-size converter',
        description:
          'Convert a file size between bytes, kilobytes, megabytes and gigabytes in powers of ten, and kibibytes, mebibytes and gibibytes in powers of two.',
        href: '/math/workbench?tool=data-size-converter',
        workspaceId: 'math-workbench',
      },
      {
        id: 'math-workbench:cooking-unit-converter',
        name: 'Cooking-unit converter',
        description:
          'Convert volume-only cooking measures without assuming ingredient density.',
        href: '/math/workbench?tool=cooking-unit-converter',
        workspaceId: 'math-workbench',
      },
    ],
  },
];
