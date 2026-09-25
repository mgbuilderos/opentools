// Generated from `toolSubsectionsForGroup` -- see lib/tools/browse.ts for why,
// and browse.test.ts, which fails if this file drifts from the catalogue.
//
// Regenerate with `npx tsx scripts/generate-browse-data.mjs`.
import type { BrowseSection } from '../browse';

export const SECTIONS: readonly BrowseSection[] = [
  {
    id: 'dates',
    title: 'Dates & planning',
    description: 'Date maths, age, timesheets, schedules, and checklists.',
    destinations: [
      {
        id: 'date-difference',
        name: 'Date difference calculator',
        description: 'Count exact calendar days between two dates.',
        href: '/date/date-difference',
        workspaceId: 'date-difference',
      },
      {
        id: 'age-calculator',
        name: 'Age calculator',
        description: 'Calculate calendar age and total elapsed days.',
        href: '/date/age-calculator',
        workspaceId: 'age-calculator',
      },
      {
        id: 'date-workbench:add-days-to-date',
        name: 'Add days to date',
        description: 'Add calendar days with UTC-stable date arithmetic.',
        href: '/date/workbench?tool=add-days-to-date',
        workspaceId: 'date-workbench',
      },
      {
        id: 'date-workbench:subtract-days-from-date',
        name: 'Subtract days from date',
        description: 'Subtract calendar days with UTC-stable date arithmetic.',
        href: '/date/workbench?tool=subtract-days-from-date',
        workspaceId: 'date-workbench',
      },
      {
        id: 'date-workbench:business-days-calculator',
        name: 'Business-days calculator',
        description:
          'Count Monday–Friday dates, excluding the start and including the end.',
        href: '/date/workbench?tool=business-days-calculator',
        workspaceId: 'date-workbench',
      },
      {
        id: 'date-workbench:workday-calculator',
        name: 'Workday calculator',
        description:
          'Add or subtract weekdays; public holidays are not included.',
        href: '/date/workbench?tool=workday-calculator',
        workspaceId: 'date-workbench',
      },
      {
        id: 'date-workbench:birthday-countdown',
        name: 'Birthday countdown',
        description:
          'Count calendar days to the next month/day; Feb 29 uses Feb 28 in non-leap years.',
        href: '/date/workbench?tool=birthday-countdown',
        workspaceId: 'date-workbench',
      },
      {
        id: 'date-workbench:anniversary-calculator',
        name: 'Anniversary calculator',
        description:
          'Count complete years and remaining days; Feb 29 uses Feb 28 when needed.',
        href: '/date/workbench?tool=anniversary-calculator',
        workspaceId: 'date-workbench',
      },
      {
        id: 'date-workbench:week-number-calculator',
        name: 'ISO week-number calculator',
        description:
          'Turn a calendar date into its ISO-8601 week, returned as YYYY-Www. The week year can differ from the date’s own year in early January and late December.',
        href: '/date/workbench?tool=week-number-calculator',
        workspaceId: 'date-workbench',
      },
      {
        id: 'date-workbench:day-of-year-calculator',
        name: 'Day-of-year calculator',
        description:
          'Enter a date from year 0100 to 9999 and get its ordinal position in that year, where 1 January is day 1 and 31 December is 365, or 366 in a leap year.',
        href: '/date/workbench?tool=day-of-year-calculator',
        workspaceId: 'date-workbench',
      },
      {
        id: 'date-workbench:leap-year-checker',
        name: 'Leap-year checker',
        description:
          'Enter a year from 1 to 9999 to see whether it is a leap year under the Gregorian rule: divisible by 4, except century years, unless divisible by 400.',
        href: '/date/workbench?tool=leap-year-checker',
        workspaceId: 'date-workbench',
      },
      {
        id: 'date-workbench:iso-date-formatter',
        name: 'ISO date formatter',
        description:
          'Validate an ISO timestamp with an explicit offset and normalize it to UTC.',
        href: '/date/workbench?tool=iso-date-formatter',
        workspaceId: 'date-workbench',
      },
      {
        id: 'date-workbench:timezone-converter',
        name: 'Timezone converter',
        description:
          'Format one absolute timestamp in a selected IANA time zone.',
        href: '/date/workbench?tool=timezone-converter',
        workspaceId: 'date-workbench',
      },
      {
        id: 'date-workbench:world-clock',
        name: 'World clock',
        description:
          'Show one absolute instant in a comma-separated list of IANA time zones.',
        href: '/date/workbench?tool=world-clock',
        workspaceId: 'date-workbench',
      },
      {
        id: 'date-workbench:meeting-time-planner',
        name: 'Meeting-time planner',
        description:
          'Compare one proposed instant across multiple IANA time zones.',
        href: '/date/workbench?tool=meeting-time-planner',
        workspaceId: 'date-workbench',
      },
      {
        id: 'date-workbench:duration-calculator',
        name: 'Duration calculator',
        description:
          'Calculate elapsed time between two timestamps with explicit offsets.',
        href: '/date/workbench?tool=duration-calculator',
        workspaceId: 'date-workbench',
      },
      {
        id: 'date-workbench:hours-calculator',
        name: 'Hours calculator',
        description:
          'Calculate hours between two 24-hour times, allowing overnight spans.',
        href: '/date/workbench?tool=hours-calculator',
        workspaceId: 'date-workbench',
      },
      {
        id: 'date-workbench:timesheet-calculator',
        name: 'Timesheet calculator',
        description:
          'Add HH:MM-HH:MM shifts with optional break minutes after a slash.',
        href: '/date/workbench?tool=timesheet-calculator',
        workspaceId: 'date-workbench',
      },
      {
        id: 'productivity-workbench:habit-streak-calculator',
        name: 'Habit-streak calculator',
        description:
          'Calculate current and longest daily streaks from explicit completion dates and an as-of date.',
        href: '/productivity/workbench?tool=habit-streak-calculator',
        workspaceId: 'productivity-workbench',
      },
      {
        id: 'productivity-workbench:task-prioritization-matrix',
        name: 'Task-prioritization matrix',
        description:
          'Rank tasks by explicit impact, urgency, effort, and confidence scores.',
        href: '/productivity/workbench?tool=task-prioritization-matrix',
        workspaceId: 'productivity-workbench',
      },
      {
        id: 'productivity-workbench:eisenhower-matrix',
        name: 'Eisenhower matrix',
        description:
          'Group tasks into do, schedule, delegate, and eliminate quadrants.',
        href: '/productivity/workbench?tool=eisenhower-matrix',
        workspaceId: 'productivity-workbench',
      },
      {
        id: 'productivity-workbench:daily-planner',
        name: 'Daily planner',
        description:
          'Lay out sequential time blocks from a starting time and task durations.',
        href: '/productivity/workbench?tool=daily-planner',
        workspaceId: 'productivity-workbench',
      },
      {
        id: 'productivity-workbench:weekly-planner',
        name: 'Weekly planner',
        description:
          'Paste lines of weekday and task separated by a pipe; tasks are grouped under Monday through Sunday in order, and days with nothing against them are dropped.',
        href: '/productivity/workbench?tool=weekly-planner',
        workspaceId: 'productivity-workbench',
      },
      {
        id: 'productivity-workbench:monthly-planner',
        name: 'Monthly planner',
        description: 'Validate and sort dated items within a selected month.',
        href: '/productivity/workbench?tool=monthly-planner',
        workspaceId: 'productivity-workbench',
      },
      {
        id: 'productivity-workbench:goal-breakdown-tool',
        name: 'Goal-breakdown tool',
        description:
          'Turn a goal and ordered milestones into a numbered execution outline.',
        href: '/productivity/workbench?tool=goal-breakdown-tool',
        workspaceId: 'productivity-workbench',
      },
      {
        id: 'productivity-workbench:decision-matrix',
        name: 'Decision matrix',
        description:
          'Sum unweighted criterion scores for each option and rank them.',
        href: '/productivity/workbench?tool=decision-matrix',
        workspaceId: 'productivity-workbench',
      },
      {
        id: 'productivity-workbench:weighted-scoring-matrix',
        name: 'Weighted-scoring matrix',
        description:
          'Rank options by criterion scores and explicit comma-separated weights.',
        href: '/productivity/workbench?tool=weighted-scoring-matrix',
        workspaceId: 'productivity-workbench',
      },
      {
        id: 'productivity-workbench:random-picker',
        name: 'Random picker',
        description:
          'Pick a bounded number of unique items without replacement.',
        href: '/productivity/workbench?tool=random-picker',
        workspaceId: 'productivity-workbench',
      },
      {
        id: 'productivity-workbench:name-picker',
        name: 'Name picker',
        description:
          'Pick one name from a local list using browser randomness.',
        href: '/productivity/workbench?tool=name-picker',
        workspaceId: 'productivity-workbench',
      },
      {
        id: 'productivity-workbench:team-generator',
        name: 'Team generator',
        description: 'Shuffle names and distribute them across balanced teams.',
        href: '/productivity/workbench?tool=team-generator',
        workspaceId: 'productivity-workbench',
      },
      {
        id: 'productivity-workbench:tournament-bracket-maker',
        name: 'Tournament-bracket maker',
        description:
          'Seed entrants into a single-elimination first round with transparent byes.',
        href: '/productivity/workbench?tool=tournament-bracket-maker',
        workspaceId: 'productivity-workbench',
      },
      {
        id: 'productivity-workbench:seating-chart-maker',
        name: 'Seating-chart maker',
        description: 'Shuffle names into a bounded row-by-column seating grid.',
        href: '/productivity/workbench?tool=seating-chart-maker',
        workspaceId: 'productivity-workbench',
      },
      {
        id: 'productivity-workbench:checklist-maker',
        name: 'Checklist maker',
        description: 'Normalize a list into a downloadable Markdown checklist.',
        href: '/productivity/workbench?tool=checklist-maker',
        workspaceId: 'productivity-workbench',
      },
      {
        id: 'productivity-workbench:packing-list-generator',
        name: 'Packing-list generator',
        description:
          'Group category:item entries into a compact Markdown packing checklist.',
        href: '/productivity/workbench?tool=packing-list-generator',
        workspaceId: 'productivity-workbench',
      },
      {
        id: 'productivity-workbench:grocery-list-generator',
        name: 'Grocery-list generator',
        description:
          'Group aisle:item entries into a compact Markdown grocery checklist.',
        href: '/productivity/workbench?tool=grocery-list-generator',
        workspaceId: 'productivity-workbench',
      },
      {
        id: 'productivity-workbench:study-schedule-maker',
        name: 'Study-schedule maker',
        description:
          'Allocate topic hours sequentially across days with a daily study limit.',
        href: '/productivity/workbench?tool=study-schedule-maker',
        workspaceId: 'productivity-workbench',
      },
    ],
  },
];
