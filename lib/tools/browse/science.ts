// Generated from `toolSubsectionsForGroup` -- see lib/tools/browse.ts for why,
// and browse.test.ts, which fails if this file drifts from the catalogue.
import type { BrowseSection } from '../browse';

export const SECTIONS: readonly BrowseSection[] = [
  {
    id: 'science',
    title: 'Science & learning',
    description: 'Physics, chemistry, statistics, and study tools.',
    destinations: [
      {
        id: 'science-education-workbench:mole-calculator',
        name: 'Mole calculator',
        description:
          'Calculate moles and particle count from mass and molar mass.',
        href: '/science/workbench?tool=mole-calculator',
        workspaceId: 'science-education-workbench',
      },
      {
        id: 'science-education-workbench:solution-dilution-calculator',
        name: 'Solution dilution calculator',
        description: 'Solve V₂ from the ideal dilution relation C₁V₁ = C₂V₂.',
        href: '/science/workbench?tool=solution-dilution-calculator',
        workspaceId: 'science-education-workbench',
      },
      {
        id: 'science-education-workbench:ph-calculator',
        name: 'pH calculator',
        description:
          'Calculate ideal pH and pOH from hydrogen-ion concentration.',
        href: '/science/workbench?tool=ph-calculator',
        workspaceId: 'science-education-workbench',
      },
      {
        id: 'science-education-workbench:half-life-calculator',
        name: 'Half-life calculator',
        description: 'Calculate remaining quantity after elapsed half-lives.',
        href: '/science/workbench?tool=half-life-calculator',
        workspaceId: 'science-education-workbench',
      },
      {
        id: 'science-education-workbench:radioactive-decay-calculator',
        name: 'Radioactive-decay calculator',
        description: 'Calculate N = N₀e^(−λt) from a supplied decay constant.',
        href: '/science/workbench?tool=radioactive-decay-calculator',
        workspaceId: 'science-education-workbench',
      },
      {
        id: 'science-education-workbench:ohm-s-law-calculator',
        name: 'Ohm’s-law calculator',
        description: 'Calculate resistance and power from voltage and current.',
        href: '/science/workbench?tool=ohm-s-law-calculator',
        workspaceId: 'science-education-workbench',
      },
      {
        id: 'science-education-workbench:electric-power-calculator',
        name: 'Electric-power calculator',
        description:
          'Calculate DC power, resistance, and conductance from voltage/current.',
        href: '/science/workbench?tool=electric-power-calculator',
        workspaceId: 'science-education-workbench',
      },
      {
        id: 'science-education-workbench:resistor-color-code',
        name: 'Resistor color-code calculator',
        description: 'Decode a four-band resistor value and tolerance.',
        href: '/science/workbench?tool=resistor-color-code',
        workspaceId: 'science-education-workbench',
      },
      {
        id: 'science-education-workbench:capacitor-code-calculator',
        name: 'Capacitor-code calculator',
        description:
          'Decode a three-digit EIA capacitance code into pF, nF, and µF.',
        href: '/science/workbench?tool=capacitor-code-calculator',
        workspaceId: 'science-education-workbench',
      },
      {
        id: 'science-education-workbench:led-resistor-calculator',
        name: 'LED resistor calculator',
        description: 'Calculate a series resistor and its ideal dissipation.',
        href: '/science/workbench?tool=led-resistor-calculator',
        workspaceId: 'science-education-workbench',
      },
      {
        id: 'science-education-workbench:battery-runtime-calculator',
        name: 'Battery-runtime calculator',
        description:
          'Estimate ideal runtime from capacity, load current, and usable efficiency.',
        href: '/science/workbench?tool=battery-runtime-calculator',
        workspaceId: 'science-education-workbench',
      },
      {
        id: 'science-education-workbench:coulomb-s-law-calculator',
        name: 'Coulomb’s-law calculator',
        description:
          'Calculate electrostatic force magnitude between two point charges.',
        href: '/science/workbench?tool=coulomb-s-law-calculator',
        workspaceId: 'science-education-workbench',
      },
      {
        id: 'science-education-workbench:kinetic-energy-calculator',
        name: 'Kinetic-energy calculator',
        description: 'Calculate ½mv² in joules.',
        href: '/science/workbench?tool=kinetic-energy-calculator',
        workspaceId: 'science-education-workbench',
      },
      {
        id: 'science-education-workbench:potential-energy-calculator',
        name: 'Potential-energy calculator',
        description:
          'Calculate mgh in joules with explicit gravitational acceleration.',
        href: '/science/workbench?tool=potential-energy-calculator',
        workspaceId: 'science-education-workbench',
      },
      {
        id: 'science-education-workbench:projectile-motion-calculator',
        name: 'Projectile-motion calculator',
        description:
          'Calculate level-ground ideal flight time, range, and peak height.',
        href: '/science/workbench?tool=projectile-motion-calculator',
        workspaceId: 'science-education-workbench',
      },
      {
        id: 'science-education-workbench:free-fall-calculator',
        name: 'Free-fall calculator',
        description: 'Calculate ideal fall time and impact speed from rest.',
        href: '/science/workbench?tool=free-fall-calculator',
        workspaceId: 'science-education-workbench',
      },
      {
        id: 'science-education-workbench:momentum-calculator',
        name: 'Momentum calculator',
        description: 'Calculate linear momentum p = mv.',
        href: '/science/workbench?tool=momentum-calculator',
        workspaceId: 'science-education-workbench',
      },
      {
        id: 'science-education-workbench:density-calculator',
        name: 'Density calculator',
        description: 'Calculate density from mass and volume.',
        href: '/science/workbench?tool=density-calculator',
        workspaceId: 'science-education-workbench',
      },
      {
        id: 'science-education-workbench:buoyancy-calculator',
        name: 'Buoyancy calculator',
        description: 'Calculate ideal Archimedean buoyant force ρVg.',
        href: '/science/workbench?tool=buoyancy-calculator',
        workspaceId: 'science-education-workbench',
      },
      {
        id: 'science-education-workbench:reynolds-number-calculator',
        name: 'Reynolds-number calculator',
        description: 'Calculate Re = ρvL/μ from SI inputs.',
        href: '/science/workbench?tool=reynolds-number-calculator',
        workspaceId: 'science-education-workbench',
      },
      {
        id: 'science-education-workbench:wave-speed-calculator',
        name: 'Wave-speed calculator',
        description: 'Calculate wave speed v = fλ.',
        href: '/science/workbench?tool=wave-speed-calculator',
        workspaceId: 'science-education-workbench',
      },
      {
        id: 'science-education-workbench:doppler-effect-calculator',
        name: 'Doppler-effect calculator',
        description:
          'Calculate classical observed frequency for collinear source/observer motion.',
        href: '/science/workbench?tool=doppler-effect-calculator',
        workspaceId: 'science-education-workbench',
      },
      {
        id: 'science-education-workbench:lens-equation-calculator',
        name: 'Thin-lens equation calculator',
        description:
          'Solve image distance and magnification from focal/object distances.',
        href: '/science/workbench?tool=lens-equation-calculator',
        workspaceId: 'science-education-workbench',
      },
      {
        id: 'science-education-workbench:magnification-calculator',
        name: 'Magnification calculator',
        description:
          'Calculate linear magnification from image and object size.',
        href: '/science/workbench?tool=magnification-calculator',
        workspaceId: 'science-education-workbench',
      },
      {
        id: 'science-education-workbench:sound-intensity-calculator',
        name: 'Sound-intensity calculator',
        description:
          'Calculate intensity from acoustic power over area and level versus 10⁻¹² W/m².',
        href: '/science/workbench?tool=sound-intensity-calculator',
        workspaceId: 'science-education-workbench',
      },
      {
        id: 'science-education-workbench:decibel-converter',
        name: 'Decibel/intensity converter',
        description:
          'Convert sound intensity to dB SPL reference level or back.',
        href: '/science/workbench?tool=decibel-converter',
        workspaceId: 'science-education-workbench',
      },
      {
        id: 'science-education-workbench:astronomy-unit-converter',
        name: 'Astronomy-unit converter',
        description:
          'Convert kilometres, AU, light-years, and parsecs using fixed constants.',
        href: '/science/workbench?tool=astronomy-unit-converter',
        workspaceId: 'science-education-workbench',
      },
      {
        id: 'science-education-workbench:planet-weight-calculator',
        name: 'Planet-weight calculator',
        description:
          'Calculate force from mass using a selected approximate surface gravity.',
        href: '/science/workbench?tool=planet-weight-calculator',
        workspaceId: 'science-education-workbench',
      },
      {
        id: 'science-education-workbench:grade-calculator',
        name: 'Grade calculator',
        description:
          'Calculate earned percentage and a stated simple letter band.',
        href: '/science/workbench?tool=grade-calculator',
        workspaceId: 'science-education-workbench',
      },
      {
        id: 'science-education-workbench:gpa-calculator',
        name: 'Credit-weighted GPA calculator',
        description:
          'Calculate GPA from course, credits, and supplied grade points.',
        href: '/science/workbench?tool=gpa-calculator',
        workspaceId: 'science-education-workbench',
      },
      {
        id: 'science-education-workbench:cgpa-calculator',
        name: 'CGPA calculator',
        description: 'Calculate cumulative GPA from period GPA and credits.',
        href: '/science/workbench?tool=cgpa-calculator',
        workspaceId: 'science-education-workbench',
      },
      {
        id: 'science-education-workbench:exam-score-calculator',
        name: 'Exam-score calculator',
        description:
          'Calculate score from correct, wrong, blank, marks, and penalty.',
        href: '/science/workbench?tool=exam-score-calculator',
        workspaceId: 'science-education-workbench',
      },
      {
        id: 'science-education-workbench:weighted-grade-calculator',
        name: 'Weighted-grade calculator',
        description:
          'Calculate a weighted course percentage from component scores/weights.',
        href: '/science/workbench?tool=weighted-grade-calculator',
        workspaceId: 'science-education-workbench',
      },
      {
        id: 'science-education-workbench:attendance-percentage-calculator',
        name: 'Attendance-percentage calculator',
        description:
          'Calculate current attendance and sessions needed to reach a target.',
        href: '/science/workbench?tool=attendance-percentage-calculator',
        workspaceId: 'science-education-workbench',
      },
      {
        id: 'science-education-workbench:study-time-planner',
        name: 'Study-time planner',
        description:
          'Allocate topic hours sequentially across bounded study days.',
        href: '/science/workbench?tool=study-time-planner',
        workspaceId: 'science-education-workbench',
      },
      {
        id: 'science-education-workbench:flashcard-maker',
        name: 'Flashcard maker',
        description:
          'Convert front/back lines into numbered Markdown flashcards.',
        href: '/science/workbench?tool=flashcard-maker',
        workspaceId: 'science-education-workbench',
      },
      {
        id: 'science-education-workbench:quiz-generator-workspace',
        name: 'Quiz generator workspace',
        description:
          'Turn supplied question/answer/distractor facts into a printable quiz.',
        href: '/science/workbench?tool=quiz-generator-workspace',
        workspaceId: 'science-education-workbench',
      },
      {
        id: 'science-education-workbench:citation-generator',
        name: 'Citation generator',
        description:
          'Format supplied citation facts in a selected basic style.',
        href: '/science/workbench?tool=citation-generator',
        workspaceId: 'science-education-workbench',
      },
      {
        id: 'science-education-workbench:apa-citation-formatter',
        name: 'APA citation formatter',
        description: 'Format supplied facts in a basic APA-like pattern.',
        href: '/science/workbench?tool=apa-citation-formatter',
        workspaceId: 'science-education-workbench',
      },
      {
        id: 'science-education-workbench:mla-citation-formatter',
        name: 'MLA citation formatter',
        description: 'Format supplied facts in a basic MLA-like pattern.',
        href: '/science/workbench?tool=mla-citation-formatter',
        workspaceId: 'science-education-workbench',
      },
      {
        id: 'science-education-workbench:chicago-citation-formatter',
        name: 'Chicago citation formatter',
        description: 'Format supplied facts in a basic Chicago-like pattern.',
        href: '/science/workbench?tool=chicago-citation-formatter',
        workspaceId: 'science-education-workbench',
      },
      {
        id: 'science-education-workbench:bibtex-generator',
        name: 'BibTeX generator',
        description:
          'Generate one escaped BibTeX article entry from supplied facts.',
        href: '/science/workbench?tool=bibtex-generator',
        workspaceId: 'science-education-workbench',
      },
      {
        id: 'science-education-workbench:unit-circle-viewer',
        name: 'Unit-circle value viewer',
        description:
          'Calculate radians, sine, cosine, and tangent for an angle.',
        href: '/science/workbench?tool=unit-circle-viewer',
        workspaceId: 'science-education-workbench',
      },
      {
        id: 'science-education-workbench:truth-table-generator',
        name: 'Truth-table generator',
        description:
          'Evaluate a bounded Boolean expression over all variable combinations.',
        href: '/science/workbench?tool=truth-table-generator',
        workspaceId: 'science-education-workbench',
      },
      {
        id: 'science-education-workbench:set-calculator',
        name: 'Set calculator',
        description:
          'Calculate union, intersection, differences, and symmetric difference.',
        href: '/science/workbench?tool=set-calculator',
        workspaceId: 'science-education-workbench',
      },
      {
        id: 'science-education-workbench:venn-diagram-data-builder',
        name: 'Venn-diagram data builder',
        description:
          'Calculate the seven exclusive regions for three supplied sets.',
        href: '/science/workbench?tool=venn-diagram-data-builder',
        workspaceId: 'science-education-workbench',
      },
      {
        id: 'science-education-workbench:function-table-generator',
        name: 'Quadratic function-table generator',
        description: 'Generate f(x) = ax² + bx + c for a bounded x range.',
        href: '/science/workbench?tool=function-table-generator',
        workspaceId: 'science-education-workbench',
      },
      {
        id: 'science-education-workbench:statistics-distribution-viewer',
        name: 'Statistics-distribution viewer',
        description:
          'Summarize a finite numeric sample with quartiles and population deviation.',
        href: '/science/workbench?tool=statistics-distribution-viewer',
        workspaceId: 'science-education-workbench',
      },
      {
        id: 'science-education-workbench:bmi-calculator',
        name: 'BMI calculator',
        description:
          'Calculate Body Mass Index and Ponderal Index from weight and height.',
        href: '/science/workbench?tool=bmi-calculator',
        workspaceId: 'science-education-workbench',
      },
      {
        id: 'science-education-workbench:bmr-calculator',
        name: 'BMR calculator',
        description:
          'Calculate Basal Metabolic Rate using Mifflin-St Jeor and Revised Harris-Benedict formulas.',
        href: '/science/workbench?tool=bmr-calculator',
        workspaceId: 'science-education-workbench',
      },
      {
        id: 'science-education-workbench:tdee-calculator',
        name: 'TDEE calculator',
        description:
          'Estimate Total Daily Energy Expenditure from BMR (Mifflin-St Jeor) and an activity multiplier.',
        href: '/science/workbench?tool=tdee-calculator',
        workspaceId: 'science-education-workbench',
      },
      {
        id: 'science-education-workbench:ideal-weight-calculator',
        name: 'Ideal body weight calculator',
        description:
          'Calculate ideal body weight estimates using the Devine, Robinson, Miller and Hamwi formulas.',
        href: '/science/workbench?tool=ideal-weight-calculator',
        workspaceId: 'science-education-workbench',
      },
    ],
  },
];
