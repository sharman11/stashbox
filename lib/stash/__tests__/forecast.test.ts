import type { Cell, Moneybox } from '../../types';
import { forecastGoal, shortDate } from '../forecast';

function box(over: Partial<Moneybox>): Moneybox {
  return {
    id: 'b1',
    userId: 'u1',
    name: 'Vacation',
    icon: '✈️',
    stashSpot: null,
    theme: 'emerald' as Moneybox['theme'],
    currency: 'USD',
    goalAmount: 1000,
    targetDays: 100,
    gridRows: 10,
    gridCols: 10,
    status: 'active',
    linkedLoanId: null,
    createdAt: '2026-05-02',
    completedAt: null,
    milestonesTriggered: [],
    ...over,
  };
}

function cell(amount: number, filledAt: string | null): Cell {
  return {
    id: Math.random().toString(36).slice(2),
    moneyboxId: 'b1',
    row: 0,
    col: 0,
    amount,
    isFilled: filledAt !== null,
    filledAt,
  };
}

describe('forecastGoal', () => {
  it('marks a goal done when saved >= target', () => {
    const f = forecastGoal(box({ goalAmount: 100 }), [cell(100, '2026-05-10')], '2026-06-01');
    expect(f.done).toBe(true);
    expect(f.remaining).toBe(0);
    expect(f.onTrack).toBe(true);
  });

  it('has no projection before any saving', () => {
    const f = forecastGoal(box({}), [], '2026-06-01');
    expect(f.hasData).toBe(false);
    expect(f.projectedDate).toBeNull();
  });

  it('projects on-track when pace beats the target date', () => {
    // Created 2026-05-02, target 100 days → 2026-08-10. Saved $500 in 30 days
    // ($500 to go) → ~30 more days → ~Aug 1, before target. On track.
    const f = forecastGoal(box({ goalAmount: 1000, targetDays: 100 }), [cell(500, '2026-05-02')], '2026-06-01');
    expect(f.hasData).toBe(true);
    expect(f.projectedDate).not.toBeNull();
    expect(f.onTrack).toBe(true);
  });

  it('flags behind and suggests a weekly amount when pace is too slow', () => {
    // Saved only $50 in 30 days → ~570 more days to finish $950 → far past target.
    const f = forecastGoal(box({ goalAmount: 1000, targetDays: 100 }), [cell(50, '2026-05-02')], '2026-06-01');
    expect(f.onTrack).toBe(false);
    expect(f.weeklyNeeded).toBeGreaterThan(0);
  });
});

describe('shortDate', () => {
  it('formats as Mon D', () => {
    expect(shortDate('2026-08-14')).toBe('Aug 14');
  });
});
