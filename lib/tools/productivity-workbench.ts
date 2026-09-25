export interface ProductivityField {
  id: string;
  label: string;
  type: 'number' | 'text' | 'textarea' | 'select';
  defaultValue: string;
  placeholder?: string;
  options?: readonly { value: string; label: string }[];
}

export interface ProductivityOperation {
  id: string;
  name: string;
  description: string;
  fields: readonly ProductivityField[];
}

const text = (
  id: string,
  label: string,
  defaultValue: string,
): ProductivityField => ({ id, label, type: 'text', defaultValue });
const area = (
  id: string,
  label: string,
  defaultValue: string,
): ProductivityField => ({ id, label, type: 'textarea', defaultValue });
const number = (
  id: string,
  label: string,
  defaultValue: string,
): ProductivityField => ({ id, label, type: 'number', defaultValue });
const names = () =>
  area('items', 'One item per line', 'Ada\nLin\nMina\nNoor\nRavi\nSara');

export const PRODUCTIVITY_OPERATIONS: readonly ProductivityOperation[] = [
  {
    id: 'habit-streak-calculator',
    name: 'Habit-streak calculator',
    description:
      'Calculate current and longest daily streaks from explicit completion dates and an as-of date.',
    fields: [
      area(
        'dates',
        'Completion dates',
        '2026-09-01\n2026-09-02\n2026-09-04\n2026-09-05\n2026-09-06',
      ),
      text('asOf', 'As-of date', '2026-09-06'),
    ],
  },
  {
    id: 'task-prioritization-matrix',
    name: 'Task-prioritization matrix',
    description:
      'Rank tasks by explicit impact, urgency, effort, and confidence scores.',
    fields: [
      area(
        'tasks',
        'task | impact | urgency | effort | confidence',
        'Fix checkout | 10 | 10 | 4 | 9\nPolish icons | 4 | 3 | 2 | 8\nWrite onboarding | 8 | 7 | 5 | 7',
      ),
    ],
  },
  {
    id: 'eisenhower-matrix',
    name: 'Eisenhower matrix',
    description:
      'Group tasks into do, schedule, delegate, and eliminate quadrants.',
    fields: [
      area(
        'tasks',
        'task | urgent yes/no | important yes/no',
        'Fix outage | yes | yes\nPlan roadmap | no | yes\nBook venue | yes | no\nReformat archive | no | no',
      ),
    ],
  },
  {
    id: 'daily-planner',
    name: 'Daily planner',
    description:
      'Lay out sequential time blocks from a starting time and task durations.',
    fields: [
      text('start', 'Day starts', '09:00'),
      area(
        'tasks',
        'task | minutes',
        'Deep work | 90\nEmail | 30\nLunch | 60\nReview | 45',
      ),
    ],
  },
  {
    id: 'weekly-planner',
    name: 'Weekly planner',
    description:
      'Paste lines of weekday and task separated by a pipe; tasks are grouped under Monday through Sunday in order, and days with nothing against them are dropped.',
    fields: [
      area(
        'tasks',
        'weekday | task',
        'Monday | Plan sprint\nWednesday | User interviews\nMonday | Team sync\nFriday | Review metrics',
      ),
    ],
  },
  {
    id: 'monthly-planner',
    name: 'Monthly planner',
    description: 'Validate and sort dated items within a selected month.',
    fields: [
      text('month', 'Month (YYYY-MM)', '2026-09'),
      area(
        'tasks',
        'date | task',
        '2026-09-03 | Launch\n2026-09-18 | Retrospective\n2026-09-10 | Customer call',
      ),
    ],
  },
  {
    id: 'goal-breakdown-tool',
    name: 'Goal-breakdown tool',
    description:
      'Turn a goal and ordered milestones into a numbered execution outline.',
    fields: [
      text('goal', 'Goal', 'Launch the private tools beta'),
      area(
        'milestones',
        'One milestone per line',
        'Validate the top jobs\nShip the canary\nMeasure completion\nInvite feedback',
      ),
    ],
  },
  {
    id: 'decision-matrix',
    name: 'Decision matrix',
    description:
      'Sum unweighted criterion scores for each option and rank them.',
    fields: [
      area(
        'matrix',
        'option | criterion scores',
        'Option A | 8 | 6 | 9\nOption B | 7 | 9 | 7\nOption C | 9 | 5 | 8',
      ),
    ],
  },
  {
    id: 'weighted-scoring-matrix',
    name: 'Weighted-scoring matrix',
    description:
      'Rank options by criterion scores and explicit comma-separated weights.',
    fields: [
      text('weights', 'Weights', '0.5,0.3,0.2'),
      area(
        'matrix',
        'option | criterion scores',
        'Option A | 8 | 6 | 9\nOption B | 7 | 9 | 7\nOption C | 9 | 5 | 8',
      ),
    ],
  },
  {
    id: 'random-picker',
    name: 'Random picker',
    description: 'Pick a bounded number of unique items without replacement.',
    fields: [names(), number('count', 'Items to pick', '1')],
  },
  {
    id: 'name-picker',
    name: 'Name picker',
    description: 'Pick one name from a local list using browser randomness.',
    fields: [names()],
  },
  {
    id: 'team-generator',
    name: 'Team generator',
    description: 'Shuffle names and distribute them across balanced teams.',
    fields: [names(), number('teams', 'Number of teams', '2')],
  },
  {
    id: 'tournament-bracket-maker',
    name: 'Tournament-bracket maker',
    description:
      'Seed entrants into a single-elimination first round with transparent byes.',
    fields: [names()],
  },
  {
    id: 'seating-chart-maker',
    name: 'Seating-chart maker',
    description: 'Shuffle names into a bounded row-by-column seating grid.',
    fields: [names(), number('columns', 'Seats per row', '3')],
  },
  {
    id: 'checklist-maker',
    name: 'Checklist maker',
    description: 'Normalize a list into a downloadable Markdown checklist.',
    fields: [
      area(
        'items',
        'One item per line',
        'Confirm scope\nRun tests\nPublish notes',
      ),
    ],
  },
  {
    id: 'packing-list-generator',
    name: 'Packing-list generator',
    description:
      'Group category:item entries into a compact Markdown packing checklist.',
    fields: [
      area(
        'items',
        'category: item',
        'Clothes: shirts\nClothes: socks\nDocuments: passport\nTech: charger',
      ),
    ],
  },
  {
    id: 'grocery-list-generator',
    name: 'Grocery-list generator',
    description:
      'Group aisle:item entries into a compact Markdown grocery checklist.',
    fields: [
      area(
        'items',
        'aisle: item',
        'Produce: apples\nProduce: spinach\nPantry: rice\nDairy: milk',
      ),
    ],
  },
  {
    id: 'study-schedule-maker',
    name: 'Study-schedule maker',
    description:
      'Allocate topic hours sequentially across days with a daily study limit.',
    fields: [
      text('start', 'Starting date', '2026-09-07'),
      number('dailyHours', 'Hours per day', '2'),
      area(
        'topics',
        'topic | hours',
        'Algebra | 3\nGeometry | 2\nStatistics | 3',
      ),
    ],
  },
] as const;

function entries(value: string, maximum = 10_000) {
  const result = value
    .split(/\r?\n/gu)
    .map((item) => item.trim())
    .filter(Boolean);
  if (!result.length) throw new Error('Enter at least one non-empty item.');
  if (result.length > maximum)
    throw new Error(
      `This tool accepts at most ${maximum.toLocaleString('en-US')} items.`,
    );
  return result;
}

function positiveInteger(
  values: Record<string, string>,
  key: string,
  maximum: number,
) {
  const result = Number(values[key]);
  if (!Number.isSafeInteger(result) || result < 1 || result > maximum)
    throw new Error(`${key} must be a whole number from 1 to ${maximum}.`);
  return result;
}

function finite(value: string, label: string) {
  const result = Number(value);
  if (!Number.isFinite(result))
    throw new Error(`${label} must be a finite number.`);
  return result;
}

function dateOnly(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value.trim());
  if (!match) throw new Error('Dates must use YYYY-MM-DD.');
  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
  if (date.toISOString().slice(0, 10) !== value.trim())
    throw new Error(`Invalid date: ${value}.`);
  return date.getTime() / 86_400_000;
}

function dateFromDay(value: number) {
  return new Date(value * 86_400_000).toISOString().slice(0, 10);
}

function pipeRows(value: string, minimumColumns: number) {
  return entries(value).map((line, index) => {
    const row = line.split('|').map((item) => item.trim());
    if (row.length < minimumColumns || row.some((item) => !item))
      throw new Error(
        `Line ${index + 1} needs at least ${minimumColumns} non-empty pipe-separated fields.`,
      );
    return row;
  });
}

function shuffle<T>(items: T[], random: () => number) {
  const output = [...items];
  for (let index = output.length - 1; index > 0; index -= 1) {
    const target = Math.floor(
      Math.min(Math.max(random(), 0), 0.999999999999) * (index + 1),
    );
    [output[index], output[target]] = [output[target], output[index]];
  }
  return output;
}

function parseTime(value: string) {
  const match = /^(\d{2}):(\d{2})$/u.exec(value.trim());
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59)
    throw new Error('Time must use valid 24-hour HH:MM form.');
  return Number(match[1]) * 60 + Number(match[2]);
}

function clock(value: number) {
  const normalized = ((value % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
}

function groupedChecklist(value: string) {
  const groups = new Map<string, string[]>();
  entries(value).forEach((line, index) => {
    const separator = line.indexOf(':');
    if (separator < 1 || !line.slice(separator + 1).trim())
      throw new Error(`Line ${index + 1} must use category: item.`);
    const category = line.slice(0, separator).trim();
    const item = line.slice(separator + 1).trim();
    groups.set(category, [...(groups.get(category) ?? []), item]);
  });
  return [...groups]
    .map(
      ([category, items]) =>
        `## ${category}\n${items.map((item) => `- [ ] ${item}`).join('\n')}`,
    )
    .join('\n\n');
}

export function runProductivityOperation(
  operationId: string,
  values: Record<string, string>,
  random: () => number = Math.random,
) {
  switch (operationId) {
    case 'habit-streak-calculator': {
      const days = [...new Set(entries(values.dates).map(dateOnly))].sort(
        (a, b) => a - b,
      );
      const asOf = dateOnly(values.asOf);
      if (days.some((day) => day > asOf))
        throw new Error('Completion dates cannot be after the as-of date.');
      let longest = 1;
      let run = 1;
      for (let index = 1; index < days.length; index += 1) {
        run = days[index] === days[index - 1] + 1 ? run + 1 : 1;
        longest = Math.max(longest, run);
      }
      let current = 0;
      const set = new Set(days);
      for (let day = asOf; set.has(day); day -= 1) current += 1;
      return `Current streak: ${current} days\nLongest streak: ${longest} days\nUnique completion days: ${days.length}`;
    }
    case 'task-prioritization-matrix': {
      const rows = pipeRows(values.tasks, 5)
        .map(([task, impact, urgency, effort, confidence]) => {
          const score =
            (finite(impact, 'Impact') *
              finite(urgency, 'Urgency') *
              finite(confidence, 'Confidence')) /
            Math.max(finite(effort, 'Effort'), 0.1);
          return { task, score };
        })
        .sort((a, b) => b.score - a.score);
      return rows
        .map(
          (row, index) => `${index + 1}. ${row.task} · ${row.score.toFixed(2)}`,
        )
        .join('\n');
    }
    case 'eisenhower-matrix': {
      const groups: Record<string, string[]> = {
        'DO NOW': [],
        SCHEDULE: [],
        DELEGATE: [],
        ELIMINATE: [],
      };
      for (const [task, urgentRaw, importantRaw] of pipeRows(values.tasks, 3)) {
        const urgent = /^y(?:es)?$/iu.test(urgentRaw);
        const important = /^y(?:es)?$/iu.test(importantRaw);
        if (
          (!urgent && !/^n(?:o)?$/iu.test(urgentRaw)) ||
          (!important && !/^n(?:o)?$/iu.test(importantRaw))
        )
          throw new Error('Urgent and important fields must be yes or no.');
        groups[
          urgent
            ? important
              ? 'DO NOW'
              : 'DELEGATE'
            : important
              ? 'SCHEDULE'
              : 'ELIMINATE'
        ].push(task);
      }
      return Object.entries(groups)
        .map(
          ([name, tasks]) =>
            `${name}\n${tasks.map((task) => `- ${task}`).join('\n') || '- (none)'}`,
        )
        .join('\n\n');
    }
    case 'daily-planner': {
      let cursor = parseTime(values.start);
      return pipeRows(values.tasks, 2)
        .map(([task, duration], index) => {
          const minutes = Number(duration);
          if (!Number.isSafeInteger(minutes) || minutes < 1 || minutes > 1440)
            throw new Error(
              `Task ${index + 1} duration must be 1–1,440 minutes.`,
            );
          const start = cursor;
          cursor += minutes;
          return `${clock(start)}–${clock(cursor)} · ${task}`;
        })
        .join('\n');
    }
    case 'weekly-planner': {
      const order = [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ];
      const groups = new Map(order.map((day) => [day, [] as string[]]));
      for (const [rawDay, task] of pipeRows(values.tasks, 2)) {
        const day = order.find(
          (item) => item.toLocaleLowerCase() === rawDay.toLocaleLowerCase(),
        );
        if (!day) throw new Error(`Unsupported weekday: ${rawDay}.`);
        groups.get(day)?.push(task);
      }
      return order
        .filter((day) => groups.get(day)?.length)
        .map(
          (day) =>
            `${day}\n${groups
              .get(day)
              ?.map((task) => `- ${task}`)
              .join('\n')}`,
        )
        .join('\n\n');
    }
    case 'monthly-planner': {
      if (!/^\d{4}-\d{2}$/u.test(values.month))
        throw new Error('Month must use YYYY-MM.');
      const rows = pipeRows(values.tasks, 2)
        .map(([date, task]) => ({ day: dateOnly(date), date, task }))
        .filter((item) => {
          if (!item.date.startsWith(`${values.month}-`))
            throw new Error(`${item.date} is outside ${values.month}.`);
          return true;
        })
        .sort((a, b) => a.day - b.day);
      return rows.map((item) => `${item.date} · ${item.task}`).join('\n');
    }
    case 'goal-breakdown-tool': {
      const goal = values.goal.trim();
      if (!goal) throw new Error('Enter a goal.');
      return `GOAL\n${goal}\n\nMILESTONES\n${entries(values.milestones, 100)
        .map((item, index) => `${index + 1}. ${item}`)
        .join(
          '\n',
        )}\n\nNEXT ACTION\nStart milestone 1 with one concrete, calendar-sized action.`;
    }
    case 'decision-matrix': {
      const rows = pipeRows(values.matrix, 2)
        .map(([option, ...scores]) => ({
          option,
          score: scores.reduce((sum, item) => sum + finite(item, 'Score'), 0),
        }))
        .sort((a, b) => b.score - a.score);
      return rows
        .map(
          (row, index) =>
            `${index + 1}. ${row.option} · ${row.score.toFixed(2)}`,
        )
        .join('\n');
    }
    case 'weighted-scoring-matrix': {
      const weights = values.weights
        .split(',')
        .map((item) => finite(item, 'Weight'));
      if (
        !weights.length ||
        weights.some((weight) => weight < 0) ||
        weights.reduce((sum, weight) => sum + weight, 0) <= 0
      )
        throw new Error('Use non-negative weights with a positive total.');
      const rows = pipeRows(values.matrix, weights.length + 1)
        .map(([option, ...scores]) => {
          if (scores.length !== weights.length)
            throw new Error(`${option} must have ${weights.length} scores.`);
          return {
            option,
            score:
              scores.reduce(
                (sum, item, index) =>
                  sum + finite(item, 'Score') * weights[index],
                0,
              ) / weights.reduce((sum, weight) => sum + weight, 0),
          };
        })
        .sort((a, b) => b.score - a.score);
      return rows
        .map(
          (row, index) =>
            `${index + 1}. ${row.option} · ${row.score.toFixed(3)}`,
        )
        .join('\n');
    }
    case 'random-picker': {
      const items = entries(values.items);
      const count = positiveInteger(values, 'count', items.length);
      return shuffle(items, random).slice(0, count).join('\n');
    }
    case 'name-picker':
      return shuffle(entries(values.items), random)[0];
    case 'team-generator': {
      const items = shuffle(entries(values.items), random);
      const count = positiveInteger(values, 'teams', items.length);
      const teams = Array.from({ length: count }, () => [] as string[]);
      items.forEach((item, index) => teams[index % count].push(item));
      return teams
        .map(
          (team, index) =>
            `Team ${index + 1}\n${team.map((item) => `- ${item}`).join('\n')}`,
        )
        .join('\n\n');
    }
    case 'tournament-bracket-maker': {
      const items = entries(values.items, 256);
      if (items.length < 2) throw new Error('Enter at least two entrants.');
      const size = 2 ** Math.ceil(Math.log2(items.length));
      const seeded = [
        ...items,
        ...Array.from({ length: size - items.length }, () => 'BYE'),
      ];
      const pairs = Array.from({ length: size / 2 }, (_, index) => [
        seeded[index],
        seeded[size - 1 - index],
      ]);
      return `Round 1 · ${size}-slot bracket\n${pairs.map((pair, index) => `${index + 1}. ${pair[0]} vs ${pair[1]}`).join('\n')}`;
    }
    case 'seating-chart-maker': {
      const items = shuffle(entries(values.items, 1_000), random);
      const columns = positiveInteger(values, 'columns', 50);
      return Array.from(
        { length: Math.ceil(items.length / columns) },
        (_, row) =>
          `Row ${row + 1}: ${items
            .slice(row * columns, (row + 1) * columns)
            .map((item, column) => `[${column + 1}] ${item}`)
            .join(' · ')}`,
      ).join('\n');
    }
    case 'checklist-maker':
      return entries(values.items)
        .map(
          (item) => `- [ ] ${item.replace(/^[-*]\s*(?:\[[ xX]\]\s*)?/u, '')}`,
        )
        .join('\n');
    case 'packing-list-generator':
    case 'grocery-list-generator':
      return groupedChecklist(values.items);
    case 'study-schedule-maker': {
      let day = dateOnly(values.start);
      const dailyHours = finite(values.dailyHours, 'Daily hours');
      if (dailyHours <= 0 || dailyHours > 24)
        throw new Error('Daily hours must be above 0 and at most 24.');
      let remainingToday = dailyHours;
      const output: string[] = [];
      for (const [topic, rawHours] of pipeRows(values.topics, 2)) {
        let hours = finite(rawHours, 'Topic hours');
        if (hours <= 0 || hours > 10_000)
          throw new Error('Topic hours must be positive and bounded.');
        while (hours > 0) {
          const allocation = Math.min(hours, remainingToday);
          output.push(
            `${dateFromDay(day)} · ${topic} · ${allocation.toFixed(2)}h`,
          );
          hours -= allocation;
          remainingToday -= allocation;
          if (remainingToday < 1e-9 && hours > 0) {
            day += 1;
            remainingToday = dailyHours;
          }
        }
        if (remainingToday < 1e-9) {
          day += 1;
          remainingToday = dailyHours;
        }
      }
      return output.join('\n');
    }
    default:
      throw new Error('Choose a supported productivity operation.');
  }
}
