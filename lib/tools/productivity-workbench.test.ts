import { describe, expect, it } from 'vitest';

import {
  PRODUCTIVITY_OPERATIONS,
  runProductivityOperation,
} from './productivity-workbench';

function defaults(id: string) {
  const operation = PRODUCTIVITY_OPERATIONS.find((item) => item.id === id);
  if (!operation) throw new Error(`Missing operation ${id}`);
  return Object.fromEntries(
    operation.fields.map((field) => [field.id, field.defaultValue]),
  );
}

describe('planning and productivity workbench', () => {
  it('publishes 18 unique operations whose defaults all run', () => {
    expect(PRODUCTIVITY_OPERATIONS).toHaveLength(18);
    expect(new Set(PRODUCTIVITY_OPERATIONS.map((item) => item.id)).size).toBe(
      18,
    );
    for (const operation of PRODUCTIVITY_OPERATIONS) {
      expect(
        runProductivityOperation(
          operation.id,
          defaults(operation.id),
          () => 0.25,
        ),
      ).not.toBe('');
    }
  });

  it('calculates current and longest habit streaks', () => {
    expect(
      runProductivityOperation('habit-streak-calculator', {
        dates: '2026-09-01\n2026-09-02\n2026-09-04\n2026-09-05\n2026-09-06',
        asOf: '2026-09-06',
      }),
    ).toContain('Current streak: 3 days');
  });

  it('ranks task and decision matrices transparently', () => {
    expect(
      runProductivityOperation('task-prioritization-matrix', {
        tasks: 'Critical | 10 | 10 | 2 | 10\nSmall | 2 | 2 | 1 | 5',
      }).split('\n')[0],
    ).toContain('Critical');
    expect(
      runProductivityOperation('weighted-scoring-matrix', {
        weights: '0.8,0.2',
        matrix: 'A | 10 | 0\nB | 5 | 10',
      }).split('\n')[0],
    ).toContain('A');
  });

  it('builds calendar-stable daily, weekly, monthly, and study schedules', () => {
    expect(
      runProductivityOperation('daily-planner', {
        start: '09:00',
        tasks: 'Focus | 90\nBreak | 30',
      }),
    ).toContain('09:00–10:30 · Focus');
    expect(
      runProductivityOperation('weekly-planner', {
        tasks: 'Friday | Review\nMonday | Plan',
      }).split('\n')[0],
    ).toBe('Monday');
    expect(
      runProductivityOperation('monthly-planner', {
        month: '2026-09',
        tasks: '2026-09-20 | Later\n2026-09-01 | First',
      }).split('\n')[0],
    ).toContain('2026-09-01');
    expect(
      runProductivityOperation('study-schedule-maker', {
        start: '2026-09-07',
        dailyHours: '2',
        topics: 'Algebra | 3',
      }),
    ).toContain('2026-09-08 · Algebra · 1.00h');
  });

  it('creates deterministic picks, balanced teams, brackets, and seats', () => {
    expect(
      runProductivityOperation(
        'random-picker',
        { items: 'A\nB\nC', count: '2' },
        () => 0,
      ).split('\n'),
    ).toHaveLength(2);
    const teams = runProductivityOperation(
      'team-generator',
      { items: 'A\nB\nC\nD\nE', teams: '2' },
      () => 0.5,
    );
    expect(teams).toContain('Team 1');
    expect(teams.match(/^- /gmu)).toHaveLength(5);
    expect(
      runProductivityOperation('tournament-bracket-maker', {
        items: 'A\nB\nC',
      }),
    ).toContain('BYE');
    expect(
      runProductivityOperation(
        'seating-chart-maker',
        { items: 'A\nB\nC\nD', columns: '2' },
        () => 0.5,
      ),
    ).toContain('Row 2:');
  });

  it('builds normalized grouped and plain checklists', () => {
    expect(
      runProductivityOperation('checklist-maker', {
        items: '- [x] Done before\nNext',
      }),
    ).toBe('- [ ] Done before\n- [ ] Next');
    expect(
      runProductivityOperation('packing-list-generator', {
        items: 'Tech: charger\nClothes: socks\nTech: cable',
      }),
    ).toContain('## Tech\n- [ ] charger\n- [ ] cable');
  });

  it('rejects invalid dates, dimensions, and scoring inputs', () => {
    expect(() =>
      runProductivityOperation('monthly-planner', {
        month: '2026-09',
        tasks: '2026-10-01 | Wrong month',
      }),
    ).toThrow('outside');
    expect(() =>
      runProductivityOperation('team-generator', {
        items: 'A\nB',
        teams: '3',
      }),
    ).toThrow('whole number');
    expect(() =>
      runProductivityOperation('weighted-scoring-matrix', {
        weights: '0,0',
        matrix: 'A | 1 | 2',
      }),
    ).toThrow('positive total');
  });
});
