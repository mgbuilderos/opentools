export interface ScienceField {
  id: string;
  label: string;
  type: 'number' | 'text' | 'textarea' | 'select';
  defaultValue: string;
  options?: readonly { value: string; label: string }[];
}

export interface ScienceOperation {
  id: string;
  name: string;
  description: string;
  fields: readonly ScienceField[];
  notice?: string;
  outputExtension?: string;
}

const number = (
  id: string,
  label: string,
  defaultValue: string,
): ScienceField => ({ id, label, type: 'number', defaultValue });
const text = (
  id: string,
  label: string,
  defaultValue: string,
): ScienceField => ({ id, label, type: 'text', defaultValue });
const area = (
  id: string,
  label: string,
  defaultValue: string,
): ScienceField => ({ id, label, type: 'textarea', defaultValue });
const select = (
  id: string,
  label: string,
  options: readonly { value: string; label: string }[],
): ScienceField => ({
  id,
  label,
  type: 'select',
  defaultValue: options[0]?.value ?? '',
  options,
});
const physicsNotice =
  'Uses the stated idealized formula and supplied SI-unit inputs. Check significant figures, uncertainty, conditions, and domain assumptions before laboratory or engineering use.';
const educationNotice =
  'Planning and grading aid only. Confirm the scale, rounding, attendance, and institutional rules that apply to you.';
const citationNotice =
  'Basic formatting aid only. Verify source-type, capitalization, italics, date, contributor, and access rules against the current required style guide.';
const citationFields = () => [
  text('author', 'Author', 'Example, Ada'),
  text('year', 'Year', '2026'),
  text('title', 'Title', 'Private browser tools'),
  text('source', 'Source / publisher', 'Example Press'),
  text('url', 'URL (optional)', 'https' + '://example.com/article'),
];

export const SCIENCE_OPERATIONS: readonly ScienceOperation[] = [
  {
    id: 'mole-calculator',
    name: 'Mole calculator',
    description: 'Calculate moles and particle count from mass and molar mass.',
    fields: [
      number('mass', 'Mass (g)', '18.015'),
      number('molarMass', 'Molar mass (g/mol)', '18.015'),
    ],
    notice: physicsNotice,
  },
  {
    id: 'solution-dilution-calculator',
    name: 'Solution dilution calculator',
    description: 'Solve V₂ from the ideal dilution relation C₁V₁ = C₂V₂.',
    fields: [
      number('c1', 'Initial concentration', '1'),
      number('v1', 'Initial volume', '100'),
      number('c2', 'Target concentration', '0.25'),
    ],
    notice: physicsNotice,
  },
  {
    id: 'ph-calculator',
    name: 'pH calculator',
    description: 'Calculate ideal pH and pOH from hydrogen-ion concentration.',
    fields: [number('concentration', '[H⁺] (mol/L)', '0.001')],
    notice:
      'Assumes ideal activity and pH + pOH = 14 at 25 °C. Not suitable for clinical, safety, or process-control decisions.',
  },
  {
    id: 'half-life-calculator',
    name: 'Half-life calculator',
    description: 'Calculate remaining quantity after elapsed half-lives.',
    fields: [
      number('initial', 'Initial quantity', '100'),
      number('elapsed', 'Elapsed time', '15'),
      number('halfLife', 'Half-life', '5'),
    ],
    notice: physicsNotice,
  },
  {
    id: 'radioactive-decay-calculator',
    name: 'Radioactive-decay calculator',
    description: 'Calculate N = N₀e^(−λt) from a supplied decay constant.',
    fields: [
      number('initial', 'Initial quantity', '100'),
      number('lambda', 'Decay constant (1/time)', '0.1386294361'),
      number('time', 'Elapsed time', '5'),
    ],
    notice: physicsNotice,
  },
  {
    id: 'ohm-s-law-calculator',
    name: 'Ohm’s-law calculator',
    description: 'Calculate resistance and power from voltage and current.',
    fields: [
      number('voltage', 'Voltage (V)', '12'),
      number('current', 'Current (A)', '2'),
    ],
    notice: physicsNotice,
  },
  {
    id: 'electric-power-calculator',
    name: 'Electric-power calculator',
    description:
      'Calculate DC power, resistance, and conductance from voltage/current.',
    fields: [
      number('voltage', 'Voltage (V)', '12'),
      number('current', 'Current (A)', '2'),
    ],
    notice: physicsNotice,
  },
  {
    id: 'resistor-color-code',
    name: 'Resistor color-code calculator',
    description: 'Decode a four-band resistor value and tolerance.',
    fields: [
      select('first', 'First digit', [
        { value: '1', label: 'Brown — 1' },
        { value: '2', label: 'Red — 2' },
        { value: '3', label: 'Orange — 3' },
        { value: '4', label: 'Yellow — 4' },
        { value: '5', label: 'Green — 5' },
        { value: '6', label: 'Blue — 6' },
        { value: '7', label: 'Violet — 7' },
        { value: '8', label: 'Grey — 8' },
        { value: '9', label: 'White — 9' },
        { value: '0', label: 'Black — 0' },
      ]),
      select('second', 'Second digit', [
        { value: '0', label: 'Black — 0' },
        { value: '1', label: 'Brown — 1' },
        { value: '2', label: 'Red — 2' },
        { value: '3', label: 'Orange — 3' },
        { value: '4', label: 'Yellow — 4' },
        { value: '5', label: 'Green — 5' },
        { value: '6', label: 'Blue — 6' },
        { value: '7', label: 'Violet — 7' },
        { value: '8', label: 'Grey — 8' },
        { value: '9', label: 'White — 9' },
      ]),
      select('multiplier', 'Multiplier', [
        { value: '0', label: 'Black ×1' },
        { value: '1', label: 'Brown ×10' },
        { value: '2', label: 'Red ×100' },
        { value: '3', label: 'Orange ×1k' },
        { value: '4', label: 'Yellow ×10k' },
        { value: '5', label: 'Green ×100k' },
        { value: '6', label: 'Blue ×1M' },
        { value: '-1', label: 'Gold ×0.1' },
        { value: '-2', label: 'Silver ×0.01' },
      ]),
      select('tolerance', 'Tolerance', [
        { value: '1', label: 'Brown ±1%' },
        { value: '2', label: 'Red ±2%' },
        { value: '0.5', label: 'Green ±0.5%' },
        { value: '0.25', label: 'Blue ±0.25%' },
        { value: '0.1', label: 'Violet ±0.1%' },
        { value: '5', label: 'Gold ±5%' },
        { value: '10', label: 'Silver ±10%' },
      ]),
    ],
    notice: physicsNotice,
  },
  {
    id: 'capacitor-code-calculator',
    name: 'Capacitor-code calculator',
    description:
      'Decode a three-digit EIA capacitance code into pF, nF, and µF.',
    fields: [text('code', 'Three-digit code', '104')],
    notice: physicsNotice,
  },
  {
    id: 'led-resistor-calculator',
    name: 'LED resistor calculator',
    description: 'Calculate a series resistor and its ideal dissipation.',
    fields: [
      number('supply', 'Supply voltage (V)', '5'),
      number('forward', 'LED forward voltage (V)', '2'),
      number('current', 'Target current (mA)', '20'),
    ],
    notice: physicsNotice,
  },
  {
    id: 'battery-runtime-calculator',
    name: 'Battery-runtime calculator',
    description:
      'Estimate ideal runtime from capacity, load current, and usable efficiency.',
    fields: [
      number('capacity', 'Capacity (mAh)', '3000'),
      number('current', 'Load current (mA)', '500'),
      number('efficiency', 'Usable capacity (%)', '85'),
    ],
    notice:
      'Ideal capacity/current estimate only. Real runtime varies with chemistry, temperature, age, discharge curve, conversion loss, and device behavior.',
  },
  {
    id: 'coulomb-s-law-calculator',
    name: 'Coulomb’s-law calculator',
    description:
      'Calculate electrostatic force magnitude between two point charges.',
    fields: [
      number('q1', 'Charge 1 (C)', '0.000001'),
      number('q2', 'Charge 2 (C)', '0.000002'),
      number('distance', 'Distance (m)', '0.1'),
    ],
    notice: physicsNotice,
  },
  {
    id: 'kinetic-energy-calculator',
    name: 'Kinetic-energy calculator',
    description: 'Calculate ½mv² in joules.',
    fields: [
      number('mass', 'Mass (kg)', '10'),
      number('velocity', 'Velocity (m/s)', '5'),
    ],
    notice: physicsNotice,
  },
  {
    id: 'potential-energy-calculator',
    name: 'Potential-energy calculator',
    description:
      'Calculate mgh in joules with explicit gravitational acceleration.',
    fields: [
      number('mass', 'Mass (kg)', '10'),
      number('height', 'Height (m)', '5'),
      number('gravity', 'Gravity (m/s²)', '9.80665'),
    ],
    notice: physicsNotice,
  },
  {
    id: 'projectile-motion-calculator',
    name: 'Projectile-motion calculator',
    description:
      'Calculate level-ground ideal flight time, range, and peak height.',
    fields: [
      number('speed', 'Launch speed (m/s)', '20'),
      number('angle', 'Launch angle (degrees)', '45'),
      number('gravity', 'Gravity (m/s²)', '9.80665'),
    ],
    notice:
      'Ideal level-ground model with no drag, wind, spin, or launch-height difference.',
  },
  {
    id: 'free-fall-calculator',
    name: 'Free-fall calculator',
    description: 'Calculate ideal fall time and impact speed from rest.',
    fields: [
      number('height', 'Height (m)', '20'),
      number('gravity', 'Gravity (m/s²)', '9.80665'),
    ],
    notice:
      'Ideal constant-gravity vacuum model; ignores drag and object shape.',
  },
  {
    id: 'momentum-calculator',
    name: 'Momentum calculator',
    description: 'Calculate linear momentum p = mv.',
    fields: [
      number('mass', 'Mass (kg)', '10'),
      number('velocity', 'Velocity (m/s)', '5'),
    ],
    notice: physicsNotice,
  },
  {
    id: 'density-calculator',
    name: 'Density calculator',
    description: 'Calculate density from mass and volume.',
    fields: [
      number('mass', 'Mass (kg)', '10'),
      number('volume', 'Volume (m³)', '2'),
    ],
    notice: physicsNotice,
  },
  {
    id: 'buoyancy-calculator',
    name: 'Buoyancy calculator',
    description: 'Calculate ideal Archimedean buoyant force ρVg.',
    fields: [
      number('density', 'Fluid density (kg/m³)', '1000'),
      number('volume', 'Displaced volume (m³)', '0.01'),
      number('gravity', 'Gravity (m/s²)', '9.80665'),
    ],
    notice: physicsNotice,
  },
  {
    id: 'reynolds-number-calculator',
    name: 'Reynolds-number calculator',
    description: 'Calculate Re = ρvL/μ from SI inputs.',
    fields: [
      number('density', 'Fluid density (kg/m³)', '1000'),
      number('velocity', 'Velocity (m/s)', '1'),
      number('length', 'Characteristic length (m)', '0.1'),
      number('viscosity', 'Dynamic viscosity (Pa·s)', '0.001'),
    ],
    notice: physicsNotice,
  },
  {
    id: 'wave-speed-calculator',
    name: 'Wave-speed calculator',
    description: 'Calculate wave speed v = fλ.',
    fields: [
      number('frequency', 'Frequency (Hz)', '440'),
      number('wavelength', 'Wavelength (m)', '0.779'),
    ],
    notice: physicsNotice,
  },
  {
    id: 'doppler-effect-calculator',
    name: 'Doppler-effect calculator',
    description:
      'Calculate classical observed frequency for collinear source/observer motion.',
    fields: [
      number('sourceFrequency', 'Source frequency (Hz)', '440'),
      number('waveSpeed', 'Wave speed (m/s)', '343'),
      number('observerSpeed', 'Observer speed toward source (m/s)', '0'),
      number('sourceSpeed', 'Source speed toward observer (m/s)', '10'),
    ],
    notice:
      'Classical collinear model f′ = f(v + vₒ)/(v − vₛ). Sign convention is stated in the field labels; not relativistic.',
  },
  {
    id: 'lens-equation-calculator',
    name: 'Thin-lens equation calculator',
    description:
      'Solve image distance and magnification from focal/object distances.',
    fields: [
      number('focal', 'Focal length', '10'),
      number('object', 'Object distance', '30'),
    ],
    notice:
      'Uses the thin-lens reciprocal relation with the supplied signed values. Confirm the sign convention for your course or optical system.',
  },
  {
    id: 'magnification-calculator',
    name: 'Magnification calculator',
    description: 'Calculate linear magnification from image and object size.',
    fields: [
      number('image', 'Image size', '20'),
      number('object', 'Object size', '5'),
    ],
    notice: physicsNotice,
  },
  {
    id: 'sound-intensity-calculator',
    name: 'Sound-intensity calculator',
    description:
      'Calculate intensity from acoustic power over area and level versus 10⁻¹² W/m².',
    fields: [
      number('power', 'Acoustic power (W)', '0.001'),
      number('area', 'Area (m²)', '1'),
    ],
    notice: physicsNotice,
  },
  {
    id: 'decibel-converter',
    name: 'Decibel/intensity converter',
    description: 'Convert sound intensity to dB SPL reference level or back.',
    fields: [
      select('mode', 'Conversion', [
        { value: 'intensity-to-db', label: 'Intensity to dB' },
        { value: 'db-to-intensity', label: 'dB to intensity' },
      ]),
      number('value', 'Value', '0.000001'),
    ],
    notice:
      'Uses intensity reference I₀ = 10⁻¹² W/m². This is not an exposure or hearing-safety assessment.',
  },
  {
    id: 'astronomy-unit-converter',
    name: 'Astronomy-unit converter',
    description:
      'Convert kilometres, AU, light-years, and parsecs using fixed constants.',
    fields: [
      number('value', 'Value', '1'),
      select('from', 'From', [
        { value: 'au', label: 'Astronomical unit' },
        { value: 'lightyear', label: 'Light-year' },
        { value: 'parsec', label: 'Parsec' },
        { value: 'km', label: 'Kilometre' },
      ]),
      select('to', 'To', [
        { value: 'km', label: 'Kilometre' },
        { value: 'au', label: 'Astronomical unit' },
        { value: 'lightyear', label: 'Light-year' },
        { value: 'parsec', label: 'Parsec' },
      ]),
    ],
    notice:
      'Fixed conversion constants are displayed with the result; precision is limited by JavaScript numbers.',
  },
  {
    id: 'planet-weight-calculator',
    name: 'Planet-weight calculator',
    description:
      'Calculate force from mass using a selected approximate surface gravity.',
    fields: [
      number('mass', 'Mass (kg)', '70'),
      select('planet', 'World', [
        { value: 'mercury', label: 'Mercury' },
        { value: 'venus', label: 'Venus' },
        { value: 'earth', label: 'Earth' },
        { value: 'moon', label: 'Moon' },
        { value: 'mars', label: 'Mars' },
        { value: 'jupiter', label: 'Jupiter' },
        { value: 'saturn', label: 'Saturn' },
        { value: 'uranus', label: 'Uranus' },
        { value: 'neptune', label: 'Neptune' },
      ]),
    ],
    notice:
      'Uses approximate mean surface gravity. “Weight” here is force in newtons, not mass.',
  },
  {
    id: 'grade-calculator',
    name: 'Grade calculator',
    description: 'Calculate earned percentage and a stated simple letter band.',
    fields: [
      number('earned', 'Points earned', '84'),
      number('possible', 'Points possible', '100'),
    ],
    notice: educationNotice,
  },
  {
    id: 'gpa-calculator',
    name: 'Credit-weighted GPA calculator',
    description:
      'Calculate GPA from course, credits, and supplied grade points.',
    fields: [
      area(
        'items',
        'course | credits | grade points',
        'Mathematics | 4 | 9\nPhysics | 3 | 8\nWriting | 2 | 10',
      ),
    ],
    notice: educationNotice,
  },
  {
    id: 'cgpa-calculator',
    name: 'CGPA calculator',
    description: 'Calculate cumulative GPA from period GPA and credits.',
    fields: [
      area(
        'items',
        'period | GPA | credits',
        'Semester 1 | 8.2 | 20\nSemester 2 | 8.8 | 22',
      ),
    ],
    notice: educationNotice,
  },
  {
    id: 'exam-score-calculator',
    name: 'Exam-score calculator',
    description:
      'Calculate score from correct, wrong, blank, marks, and penalty.',
    fields: [
      number('correct', 'Correct answers', '72'),
      number('wrong', 'Wrong answers', '18'),
      number('blank', 'Blank answers', '10'),
      number('marks', 'Marks per correct', '1'),
      number('penalty', 'Penalty per wrong', '0.25'),
    ],
    notice: educationNotice,
  },
  {
    id: 'weighted-grade-calculator',
    name: 'Weighted-grade calculator',
    description:
      'Calculate a weighted course percentage from component scores/weights.',
    fields: [
      area(
        'items',
        'component | score % | weight %',
        'Assignments | 88 | 30\nMidterm | 76 | 30\nFinal | 91 | 40',
      ),
    ],
    notice: educationNotice,
  },
  {
    id: 'attendance-percentage-calculator',
    name: 'Attendance-percentage calculator',
    description:
      'Calculate current attendance and sessions needed to reach a target.',
    fields: [
      number('attended', 'Sessions attended', '72'),
      number('total', 'Sessions held', '90'),
      number('target', 'Target attendance (%)', '85'),
    ],
    notice: educationNotice,
  },
  {
    id: 'study-time-planner',
    name: 'Study-time planner',
    description: 'Allocate topic hours sequentially across bounded study days.',
    fields: [
      text('start', 'Start date', '2026-09-07'),
      number('dailyHours', 'Available hours/day', '2'),
      area(
        'topics',
        'topic | required hours',
        'Algebra | 3\nPhysics | 2\nWriting | 1',
      ),
    ],
    notice: educationNotice,
    outputExtension: 'txt',
  },
  {
    id: 'flashcard-maker',
    name: 'Flashcard maker',
    description: 'Convert front/back lines into numbered Markdown flashcards.',
    fields: [
      area('items', 'front | back', 'Ohm’s law | V = IR\nMomentum | p = mv'),
    ],
    outputExtension: 'md',
  },
  {
    id: 'quiz-generator-workspace',
    name: 'Quiz generator workspace',
    description:
      'Turn supplied question/answer/distractor facts into a printable quiz.',
    fields: [
      area(
        'items',
        'question | correct answer | distractors separated by ;',
        'What is 2 + 2? | 4 | 3;5;6\nSI unit of force? | newton | joule;watt;pascal',
      ),
    ],
    notice:
      'This tool structures only the facts you provide; it does not verify question accuracy or invent content.',
    outputExtension: 'md',
  },
  {
    id: 'citation-generator',
    name: 'Citation generator',
    description: 'Format supplied citation facts in a selected basic style.',
    fields: [
      select('style', 'Style', [
        { value: 'apa', label: 'APA-like' },
        { value: 'mla', label: 'MLA-like' },
        { value: 'chicago', label: 'Chicago-like' },
      ]),
      ...citationFields(),
    ],
    notice: citationNotice,
  },
  {
    id: 'apa-citation-formatter',
    name: 'APA citation formatter',
    description: 'Format supplied facts in a basic APA-like pattern.',
    fields: citationFields(),
    notice: citationNotice,
  },
  {
    id: 'mla-citation-formatter',
    name: 'MLA citation formatter',
    description: 'Format supplied facts in a basic MLA-like pattern.',
    fields: citationFields(),
    notice: citationNotice,
  },
  {
    id: 'chicago-citation-formatter',
    name: 'Chicago citation formatter',
    description: 'Format supplied facts in a basic Chicago-like pattern.',
    fields: citationFields(),
    notice: citationNotice,
  },
  {
    id: 'bibtex-generator',
    name: 'BibTeX generator',
    description:
      'Generate one escaped BibTeX article entry from supplied facts.',
    fields: [text('key', 'Citation key', 'example2026'), ...citationFields()],
    notice: citationNotice,
    outputExtension: 'bib',
  },
  {
    id: 'unit-circle-viewer',
    name: 'Unit-circle value viewer',
    description: 'Calculate radians, sine, cosine, and tangent for an angle.',
    fields: [number('angle', 'Angle (degrees)', '45')],
  },
  {
    id: 'truth-table-generator',
    name: 'Truth-table generator',
    description:
      'Evaluate a bounded Boolean expression over all variable combinations.',
    fields: [text('expression', 'Expression', '(A && B) || !C')],
    notice:
      'Supports identifiers, !, &&, ||, ^, and parentheses for up to eight variables.',
    outputExtension: 'md',
  },
  {
    id: 'set-calculator',
    name: 'Set calculator',
    description:
      'Calculate union, intersection, differences, and symmetric difference.',
    fields: [
      area('a', 'Set A (comma/newline separated)', 'red, green, blue'),
      area('b', 'Set B (comma/newline separated)', 'green, gold, blue'),
    ],
  },
  {
    id: 'venn-diagram-data-builder',
    name: 'Venn-diagram data builder',
    description:
      'Calculate the seven exclusive regions for three supplied sets.',
    fields: [
      area('a', 'Set A', '1,2,3,4'),
      area('b', 'Set B', '3,4,5'),
      area('c', 'Set C', '4,5,6'),
    ],
    outputExtension: 'json',
  },
  {
    id: 'function-table-generator',
    name: 'Quadratic function-table generator',
    description: 'Generate f(x) = ax² + bx + c for a bounded x range.',
    fields: [
      number('a', 'a', '1'),
      number('b', 'b', '0'),
      number('c', 'c', '0'),
      number('start', 'Start x', '-3'),
      number('end', 'End x', '3'),
      number('step', 'Step', '1'),
    ],
    outputExtension: 'csv',
  },
  {
    id: 'statistics-distribution-viewer',
    name: 'Statistics-distribution viewer',
    description:
      'Summarize a finite numeric sample with quartiles and population deviation.',
    fields: [area('values', 'Numbers', '2, 4, 4, 4, 5, 5, 7, 9')],
    notice:
      'Uses linear-interpolated quartiles and population variance/deviation; confirm the convention required by your course.',
  },
] as const;

function finite(
  values: Record<string, string>,
  key: string,
  minimum = -Number.MAX_VALUE,
  maximum = Number.MAX_VALUE,
) {
  const output = Number(values[key]);
  if (!Number.isFinite(output) || output < minimum || output > maximum)
    throw new Error(
      `${key} must be a finite number from ${minimum} to ${maximum}.`,
    );
  return output;
}
function positive(values: Record<string, string>, key: string) {
  return finite(values, key, Number.MIN_VALUE);
}
function format(value: number) {
  if (!Number.isFinite(value))
    throw new Error('The calculation did not produce a finite result.');
  return Number(value.toPrecision(12)).toString();
}
function pipeRows(value: string, columns: number, maximum = 10_000) {
  const lines = value
    .split(/\r?\n/gu)
    .map((item) => item.trim())
    .filter(Boolean);
  if (!lines.length || lines.length > maximum)
    throw new Error(`Enter from 1 to ${maximum.toLocaleString()} rows.`);
  return lines.map((line, index) => {
    const row = line.split('|').map((item) => item.trim());
    if (row.length !== columns || row.some((item) => !item))
      throw new Error(
        `Row ${index + 1} must have ${columns} non-empty pipe-separated fields.`,
      );
    return row;
  });
}
function strictDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value))
    throw new Error('Start date must use YYYY-MM-DD.');
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value)
    throw new Error('Start date is not a real calendar date.');
  return date;
}
function citation(style: string, values: Record<string, string>) {
  const author = values.author.trim();
  const year = values.year.trim();
  const title = values.title.trim();
  const source = values.source.trim();
  const url = values.url.trim();
  if (![author, year, title, source].every(Boolean))
    throw new Error('Author, year, title, and source are required.');
  if (url) {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error('Citation URL must be absolute.');
    }
    if (!['http:', 'https:'].includes(parsed.protocol))
      throw new Error('Citation URL must use HTTP or HTTPS.');
  }
  if (style === 'mla')
    return `${author}. “${title}.” ${source}, ${year}.${url ? ` ${url}.` : ''}`;
  if (style === 'chicago')
    return `${author}. “${title}.” ${source}, ${year}.${url ? ` ${url}.` : ''}`;
  return `${author}. (${year}). ${title}. ${source}.${url ? ` ${url}` : ''}`;
}
function items(value: string) {
  const output = value
    .split(/[,\n]/gu)
    .map((item) => item.trim())
    .filter(Boolean);
  if (output.length > 100_000)
    throw new Error('Set is limited to 100,000 supplied items.');
  return new Set(output);
}
function percentile(sorted: number[], p: number) {
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const fraction = index - lower;
  return (
    sorted[lower] +
    (sorted[Math.min(lower + 1, sorted.length - 1)] - sorted[lower]) * fraction
  );
}

type BooleanToken = string;
function booleanRpn(expression: string) {
  const source = expression.trim();
  if (!source || source.length > 10_000)
    throw new Error('Enter a Boolean expression up to 10,000 characters.');
  const tokens = source.match(/&&|\|\||[!^()]|[A-Za-z][A-Za-z0-9_]*/gu);
  if (
    !tokens ||
    tokens.join('').toLocaleLowerCase() !==
      source.replace(/\s+/gu, '').toLocaleLowerCase()
  )
    throw new Error('Expression contains unsupported syntax.');
  const precedence: Record<string, number> = {
    '!': 4,
    '&&': 3,
    '^': 2,
    '||': 1,
  };
  const output: BooleanToken[] = [];
  const operators: string[] = [];
  for (const token of tokens) {
    if (/^[A-Za-z]/u.test(token)) output.push(token);
    else if (token === '(') operators.push(token);
    else if (token === ')') {
      while (operators.length && operators.at(-1) !== '(')
        output.push(operators.pop()!);
      if (operators.pop() !== '(')
        throw new Error('Expression has unmatched parentheses.');
    } else {
      while (
        operators.length &&
        operators.at(-1) !== '(' &&
        (precedence[operators.at(-1)!] > precedence[token] ||
          (token !== '!' &&
            precedence[operators.at(-1)!] === precedence[token]))
      )
        output.push(operators.pop()!);
      operators.push(token);
    }
  }
  while (operators.length) {
    const token = operators.pop()!;
    if (token === '(') throw new Error('Expression has unmatched parentheses.');
    output.push(token);
  }
  const variables = [
    ...new Set(tokens.filter((token) => /^[A-Za-z]/u.test(token))),
  ].toSorted();
  if (!variables.length || variables.length > 8)
    throw new Error('Use from one to eight variables.');
  return { output, variables };
}
function evalBoolean(rpn: string[], values: Record<string, boolean>) {
  const stack: boolean[] = [];
  for (const token of rpn) {
    if (/^[A-Za-z]/u.test(token)) stack.push(values[token]);
    else if (token === '!') {
      if (!stack.length) throw new Error('NOT is missing an operand.');
      stack.push(!stack.pop());
    } else {
      const right = stack.pop();
      const left = stack.pop();
      if (left === undefined || right === undefined)
        throw new Error(`${token} is missing an operand.`);
      stack.push(
        token === '&&'
          ? left && right
          : token === '||'
            ? left || right
            : left !== right,
      );
    }
  }
  if (stack.length !== 1)
    throw new Error('Expression has adjacent or missing operators.');
  return stack[0];
}

export function runScienceOperation(
  operationId: string,
  values: Record<string, string>,
): string {
  switch (operationId) {
    case 'mole-calculator': {
      const moles = positive(values, 'mass') / positive(values, 'molarMass');
      return `Moles: ${format(moles)} mol\nParticles: ${format(moles * 6.02214076e23)}`;
    }
    case 'solution-dilution-calculator':
      return `Required final volume: ${format((positive(values, 'c1') * positive(values, 'v1')) / positive(values, 'c2'))} (same volume unit as V₁)`;
    case 'ph-calculator': {
      const concentration = positive(values, 'concentration');
      const ph = -Math.log10(concentration);
      return `pH: ${format(ph)}\npOH at 25 °C: ${format(14 - ph)}`;
    }
    case 'half-life-calculator': {
      const initial = finite(values, 'initial', 0);
      const elapsed = finite(values, 'elapsed', 0);
      const halfLife = positive(values, 'halfLife');
      return `Remaining: ${format(initial * 0.5 ** (elapsed / halfLife))}\nElapsed half-lives: ${format(elapsed / halfLife)}`;
    }
    case 'radioactive-decay-calculator':
      return `Remaining: ${format(finite(values, 'initial', 0) * Math.exp(-finite(values, 'lambda', 0) * finite(values, 'time', 0)))}`;
    case 'ohm-s-law-calculator':
    case 'electric-power-calculator': {
      const voltage = finite(values, 'voltage');
      const current = positive(values, 'current');
      return `Resistance: ${format(voltage / current)} Ω\nPower: ${format(voltage * current)} W\nConductance: ${format(current / voltage)} S`;
    }
    case 'resistor-color-code': {
      const resistance =
        Number(`${values.first}${values.second}`) *
        10 ** Number(values.multiplier);
      return `Resistance: ${format(resistance)} Ω\nTolerance: ±${values.tolerance}%\nRange: ${format(resistance * (1 - Number(values.tolerance) / 100))}–${format(resistance * (1 + Number(values.tolerance) / 100))} Ω`;
    }
    case 'capacitor-code-calculator': {
      const match = /^(\d)(\d)(\d)$/u.exec(values.code.trim());
      if (!match) throw new Error('Use exactly three decimal digits.');
      const pf = Number(`${match[1]}${match[2]}`) * 10 ** Number(match[3]);
      return `Picofarads: ${format(pf)} pF\nNanofarads: ${format(pf / 1000)} nF\nMicrofarads: ${format(pf / 1_000_000)} µF`;
    }
    case 'led-resistor-calculator': {
      const supply = finite(values, 'supply');
      const forward = finite(values, 'forward', 0);
      const current = positive(values, 'current') / 1000;
      if (supply <= forward)
        throw new Error('Supply voltage must exceed forward voltage.');
      const resistance = (supply - forward) / current;
      return `Ideal resistance: ${format(resistance)} Ω\nResistor dissipation: ${format(current ** 2 * resistance)} W`;
    }
    case 'battery-runtime-calculator':
      return `Ideal runtime: ${format((positive(values, 'capacity') * finite(values, 'efficiency', 0, 100)) / 100 / positive(values, 'current'))} hours`;
    case 'coulomb-s-law-calculator':
      return `Force magnitude: ${format((8.9875517923e9 * Math.abs(finite(values, 'q1') * finite(values, 'q2'))) / positive(values, 'distance') ** 2)} N`;
    case 'kinetic-energy-calculator':
      return `Kinetic energy: ${format(0.5 * finite(values, 'mass', 0) * finite(values, 'velocity') ** 2)} J`;
    case 'potential-energy-calculator':
      return `Potential energy: ${format(finite(values, 'mass', 0) * finite(values, 'height') * positive(values, 'gravity'))} J`;
    case 'projectile-motion-calculator': {
      const speed = finite(values, 'speed', 0);
      const angle = (finite(values, 'angle', -90, 90) * Math.PI) / 180;
      const gravity = positive(values, 'gravity');
      return `Flight time: ${format((2 * speed * Math.sin(angle)) / gravity)} s\nRange: ${format((speed ** 2 * Math.sin(2 * angle)) / gravity)} m\nMaximum height: ${format((speed ** 2 * Math.sin(angle) ** 2) / (2 * gravity))} m`;
    }
    case 'free-fall-calculator': {
      const height = finite(values, 'height', 0);
      const gravity = positive(values, 'gravity');
      return `Fall time: ${format(Math.sqrt((2 * height) / gravity))} s\nImpact speed: ${format(Math.sqrt(2 * gravity * height))} m/s`;
    }
    case 'momentum-calculator':
      return `Momentum: ${format(finite(values, 'mass', 0) * finite(values, 'velocity'))} kg·m/s`;
    case 'density-calculator':
      return `Density: ${format(finite(values, 'mass', 0) / positive(values, 'volume'))} kg/m³`;
    case 'buoyancy-calculator':
      return `Buoyant force: ${format(finite(values, 'density', 0) * finite(values, 'volume', 0) * positive(values, 'gravity'))} N`;
    case 'reynolds-number-calculator':
      return `Reynolds number: ${format((finite(values, 'density', 0) * finite(values, 'velocity', 0) * finite(values, 'length', 0)) / positive(values, 'viscosity'))}`;
    case 'wave-speed-calculator':
      return `Wave speed: ${format(finite(values, 'frequency', 0) * finite(values, 'wavelength', 0))} m/s`;
    case 'doppler-effect-calculator': {
      const frequency = finite(values, 'sourceFrequency', 0);
      const waveSpeed = positive(values, 'waveSpeed');
      const observer = finite(values, 'observerSpeed');
      const source = finite(values, 'sourceSpeed');
      if (waveSpeed - source <= 0 || waveSpeed + observer < 0)
        throw new Error(
          'Speeds make the classical denominator/numerator non-positive.',
        );
      return `Observed frequency: ${format((frequency * (waveSpeed + observer)) / (waveSpeed - source))} Hz`;
    }
    case 'lens-equation-calculator': {
      const focal = finite(values, 'focal');
      const object = finite(values, 'object');
      const denominator = 1 / focal - 1 / object;
      if (denominator === 0)
        throw new Error(
          'Image distance is infinite for these supplied values.',
        );
      const image = 1 / denominator;
      return `Image distance: ${format(image)}\nMagnification (−dᵢ/dₒ): ${format(-image / object)}`;
    }
    case 'magnification-calculator':
      return `Magnification: ${format(finite(values, 'image') / positive(values, 'object'))}×`;
    case 'sound-intensity-calculator': {
      const intensity = positive(values, 'power') / positive(values, 'area');
      return `Intensity: ${format(intensity)} W/m²\nLevel: ${format(10 * Math.log10(intensity / 1e-12))} dB re 10⁻¹² W/m²`;
    }
    case 'decibel-converter': {
      const input = finite(values, 'value');
      return values.mode === 'intensity-to-db'
        ? `Level: ${format(10 * Math.log10(positive(values, 'value') / 1e-12))} dB re 10⁻¹² W/m²`
        : `Intensity: ${format(1e-12 * 10 ** (input / 10))} W/m²`;
    }
    case 'astronomy-unit-converter': {
      const km: Record<string, number> = {
        km: 1,
        au: 149_597_870.7,
        lightyear: 9_460_730_472_580.8,
        parsec: 30_856_775_814_913.672,
      };
      const output =
        (finite(values, 'value') * km[values.from]) / km[values.to];
      return `Result: ${format(output)} ${values.to}\nConstants: 1 AU = 149597870.7 km; 1 light-year = 9460730472580.8 km; 1 parsec = 30856775814913.672 km`;
    }
    case 'planet-weight-calculator': {
      const gravity: Record<string, number> = {
        mercury: 3.7,
        venus: 8.87,
        earth: 9.80665,
        moon: 1.62,
        mars: 3.71,
        jupiter: 24.79,
        saturn: 10.44,
        uranus: 8.69,
        neptune: 11.15,
      };
      return `Weight force: ${format(finite(values, 'mass', 0) * gravity[values.planet])} N\nGravity used: ${gravity[values.planet]} m/s²`;
    }
    case 'grade-calculator': {
      const percentage =
        (finite(values, 'earned', 0) / positive(values, 'possible')) * 100;
      const grade =
        percentage >= 90
          ? 'A'
          : percentage >= 80
            ? 'B'
            : percentage >= 70
              ? 'C'
              : percentage >= 60
                ? 'D'
                : 'F';
      return `Percentage: ${format(percentage)}%\nSimple band: ${grade} (A≥90, B≥80, C≥70, D≥60)`;
    }
    case 'gpa-calculator': {
      let credits = 0;
      let points = 0;
      const rows = pipeRows(values.items, 3);
      for (const [, rawCredits, rawGrade] of rows) {
        const credit = Number(rawCredits);
        const grade = Number(rawGrade);
        if (
          !Number.isFinite(credit) ||
          credit <= 0 ||
          !Number.isFinite(grade) ||
          grade < 0
        )
          throw new Error(
            'Credits must be positive and grade points non-negative.',
          );
        credits += credit;
        points += credit * grade;
      }
      return `Credit-weighted GPA: ${format(points / credits)}\nCredits: ${format(credits)}`;
    }
    case 'cgpa-calculator': {
      let credits = 0;
      let points = 0;
      for (const [, rawGpa, rawCredits] of pipeRows(values.items, 3)) {
        const gpa = Number(rawGpa);
        const credit = Number(rawCredits);
        if (
          !Number.isFinite(gpa) ||
          gpa < 0 ||
          !Number.isFinite(credit) ||
          credit <= 0
        )
          throw new Error('GPA must be non-negative and credits positive.');
        credits += credit;
        points += gpa * credit;
      }
      return `CGPA: ${format(points / credits)}\nCredits: ${format(credits)}`;
    }
    case 'exam-score-calculator': {
      const correct = finite(values, 'correct', 0);
      const wrong = finite(values, 'wrong', 0);
      const blank = finite(values, 'blank', 0);
      const score =
        correct * finite(values, 'marks', 0) -
        wrong * finite(values, 'penalty', 0);
      return `Score: ${format(score)}\nQuestions: ${format(correct + wrong + blank)}\nAttempted: ${format(correct + wrong)}`;
    }
    case 'weighted-grade-calculator': {
      let totalWeight = 0;
      let weighted = 0;
      for (const [, rawScore, rawWeight] of pipeRows(values.items, 3)) {
        const score = Number(rawScore);
        const weight = Number(rawWeight);
        if (
          !Number.isFinite(score) ||
          score < 0 ||
          !Number.isFinite(weight) ||
          weight < 0
        )
          throw new Error('Scores and weights must be non-negative.');
        weighted += score * weight;
        totalWeight += weight;
      }
      if (totalWeight <= 0) throw new Error('Total weight must be positive.');
      return `Weighted grade: ${format(weighted / totalWeight)}%\nSupplied weight total: ${format(totalWeight)}%`;
    }
    case 'attendance-percentage-calculator': {
      const attended = finite(values, 'attended', 0);
      const total = finite(values, 'total', Number.MIN_VALUE);
      const target = finite(values, 'target', 0, 100);
      if (attended > total)
        throw new Error('Attended sessions cannot exceed total sessions.');
      const current = (attended / total) * 100;
      const needed =
        target >= 100
          ? Infinity
          : Math.max(
              0,
              Math.ceil(
                ((target / 100) * total - attended) / (1 - target / 100),
              ),
            );
      return `Current attendance: ${format(current)}%\nConsecutive attended sessions needed for ${target}%: ${Number.isFinite(needed) ? needed : 'not finite at a 100% target'}`;
    }
    case 'study-time-planner': {
      const date = strictDate(values.start);
      const daily = positive(values, 'dailyHours');
      const output: string[] = [];
      let dayHours = 0;
      for (const [topic, rawHours] of pipeRows(values.topics, 2)) {
        let remaining = Number(rawHours);
        if (!Number.isFinite(remaining) || remaining <= 0)
          throw new Error(`Study hours for ${topic} must be positive.`);
        while (remaining > 0) {
          const available = daily - dayHours;
          const scheduled = Math.min(available, remaining);
          output.push(
            `${date.toISOString().slice(0, 10)} · ${topic} · ${format(scheduled)}h`,
          );
          dayHours += scheduled;
          remaining -= scheduled;
          if (dayHours >= daily - Number.EPSILON) {
            date.setUTCDate(date.getUTCDate() + 1);
            dayHours = 0;
          }
          if (output.length > 10_000)
            throw new Error('Schedule is limited to 10,000 blocks.');
        }
      }
      return output.join('\n');
    }
    case 'flashcard-maker':
      return pipeRows(values.items, 2)
        .map(([front, back], index) => `## ${index + 1}. ${front}\n\n${back}`)
        .join('\n\n');
    case 'quiz-generator-workspace': {
      const rows = pipeRows(values.items, 3, 500);
      const questions = rows.map(
        ([question, answer, rawDistractors], index) => {
          const choices = [
            answer,
            ...rawDistractors
              .split(';')
              .map((item) => item.trim())
              .filter(Boolean),
          ];
          if (choices.length < 2 || new Set(choices).size !== choices.length)
            throw new Error(
              `Question ${index + 1} needs distinct answer choices.`,
            );
          return `${index + 1}. ${question}\n${choices.map((choice, choiceIndex) => `   ${String.fromCharCode(65 + choiceIndex)}. ${choice}`).join('\n')}`;
        },
      );
      return `# Quiz\n\n${questions.join('\n\n')}\n\n# Answer key\n\n${rows.map(([, answer], index) => `${index + 1}. ${answer}`).join('\n')}`;
    }
    case 'citation-generator':
      return citation(values.style, values);
    case 'apa-citation-formatter':
      return citation('apa', values);
    case 'mla-citation-formatter':
      return citation('mla', values);
    case 'chicago-citation-formatter':
      return citation('chicago', values);
    case 'bibtex-generator': {
      if (!/^[A-Za-z0-9:_-]+$/u.test(values.key))
        throw new Error(
          'Citation key may use letters, digits, colon, underscore, and hyphen.',
        );
      const escape = (value: string) => value.replace(/[{}]/gu, '');
      return `@article{${values.key},\n  author = {${escape(values.author)}},\n  title = {${escape(values.title)}},\n  year = {${escape(values.year)}},\n  journal = {${escape(values.source)}}${values.url.trim() ? `,\n  url = {${escape(values.url)}}` : ''}\n}`;
    }
    case 'unit-circle-viewer': {
      const degrees = finite(values, 'angle');
      const radians = (degrees * Math.PI) / 180;
      const cosine =
        Math.abs(Math.cos(radians)) < 1e-14 ? 0 : Math.cos(radians);
      const sine = Math.abs(Math.sin(radians)) < 1e-14 ? 0 : Math.sin(radians);
      return `Radians: ${format(radians)}\nsin: ${format(sine)}\ncos: ${format(cosine)}\ntan: ${Math.abs(cosine) < 1e-14 ? 'undefined' : format(sine / cosine)}`;
    }
    case 'truth-table-generator': {
      const parsed = booleanRpn(values.expression);
      const rows = Array.from(
        { length: 2 ** parsed.variables.length },
        (_, row) => {
          const variables = Object.fromEntries(
            parsed.variables.map((variable, index) => [
              variable,
              Boolean(row & (1 << (parsed.variables.length - index - 1))),
            ]),
          );
          return `| ${parsed.variables.map((variable) => (variables[variable] ? 'T' : 'F')).join(' | ')} | ${evalBoolean(parsed.output, variables) ? 'T' : 'F'} |`;
        },
      );
      return `| ${parsed.variables.join(' | ')} | Result |\n| ${parsed.variables.map(() => '---').join(' | ')} | --- |\n${rows.join('\n')}`;
    }
    case 'set-calculator': {
      const a = items(values.a);
      const b = items(values.b);
      const list = (set: Set<string>) => [...set].toSorted().join(', ') || '∅';
      return `Union: ${list(new Set([...a, ...b]))}\nIntersection: ${list(new Set([...a].filter((item) => b.has(item))))}\nA − B: ${list(new Set([...a].filter((item) => !b.has(item))))}\nB − A: ${list(new Set([...b].filter((item) => !a.has(item))))}\nSymmetric difference: ${list(new Set([...a, ...b].filter((item) => a.has(item) !== b.has(item))))}`;
    }
    case 'venn-diagram-data-builder': {
      const a = items(values.a);
      const b = items(values.b);
      const c = items(values.c);
      const universe = new Set([...a, ...b, ...c]);
      const regions: Record<string, string[]> = {
        aOnly: [],
        bOnly: [],
        cOnly: [],
        abOnly: [],
        acOnly: [],
        bcOnly: [],
        abc: [],
      };
      for (const item of universe) {
        const key = a.has(item)
          ? b.has(item)
            ? c.has(item)
              ? 'abc'
              : 'abOnly'
            : c.has(item)
              ? 'acOnly'
              : 'aOnly'
          : b.has(item)
            ? c.has(item)
              ? 'bcOnly'
              : 'bOnly'
            : 'cOnly';
        regions[key].push(item);
      }
      return JSON.stringify(
        Object.fromEntries(
          Object.entries(regions).map(([key, value]) => [
            key,
            { count: value.length, items: value.toSorted() },
          ]),
        ),
        null,
        2,
      );
    }
    case 'function-table-generator': {
      const a = finite(values, 'a');
      const b = finite(values, 'b');
      const c = finite(values, 'c');
      const start = finite(values, 'start');
      const end = finite(values, 'end');
      const step = positive(values, 'step');
      if (end < start || Math.ceil((end - start) / step) > 10_000)
        throw new Error(
          'Range must be ascending and contain at most 10,001 rows.',
        );
      const rows = ['x,f(x)'];
      for (let x = start; x <= end + step * 1e-12; x += step)
        rows.push(`${format(x)},${format(a * x ** 2 + b * x + c)}`);
      return rows.join('\n');
    }
    case 'statistics-distribution-viewer': {
      const numbers = values.values
        .split(/[\s,]+/u)
        .filter(Boolean)
        .map(Number);
      if (
        !numbers.length ||
        numbers.length > 100_000 ||
        numbers.some((item) => !Number.isFinite(item))
      )
        throw new Error('Enter from 1 to 100,000 finite numbers.');
      const sorted = numbers.toSorted((a, b) => a - b);
      const mean =
        numbers.reduce((sum, item) => sum + item, 0) / numbers.length;
      const variance =
        numbers.reduce((sum, item) => sum + (item - mean) ** 2, 0) /
        numbers.length;
      return `Count: ${numbers.length}\nMinimum: ${format(sorted[0])}\nQ1: ${format(percentile(sorted, 0.25))}\nMedian: ${format(percentile(sorted, 0.5))}\nQ3: ${format(percentile(sorted, 0.75))}\nMaximum: ${format(sorted.at(-1)!)}\nMean: ${format(mean)}\nPopulation variance: ${format(variance)}\nPopulation standard deviation: ${format(Math.sqrt(variance))}`;
    }
    default:
      throw new Error('Choose a supported science or education operation.');
  }
}
