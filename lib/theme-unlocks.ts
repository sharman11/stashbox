import type { ThemeId } from './types';

/**
 * Themes that require progression to unlock. Only listed themes are gated;
 * everything else is free at install.
 *
 * Lock criterion is "completed moneyboxes" (status === 'completed').
 * Abandoned boxes do not count — only real completions move the unlock
 * counter, so the reward feels earned.
 */
const THEME_LOCK_RULES: Partial<Record<ThemeId, { completedBoxes: number; label: string }>> = {
  silver: { completedBoxes: 1, label: 'Finish 1 box to unlock' },
  gold: { completedBoxes: 2, label: 'Finish 2 boxes to unlock' },
};

export interface ThemeLockState {
  /** True when the user can select this theme. */
  unlocked: boolean;
  /** Short human-readable requirement, e.g. "Complete 1 moneybox". null if always free. */
  requirementLabel: string | null;
}

export function getThemeLockState(themeId: ThemeId, completedBoxes: number): ThemeLockState {
  const rule = THEME_LOCK_RULES[themeId];
  if (!rule) return { unlocked: true, requirementLabel: null };
  return {
    unlocked: completedBoxes >= rule.completedBoxes,
    requirementLabel: rule.label,
  };
}

/** Helper: is the theme gated at all (has a lock rule)? */
export function isThemeGated(themeId: ThemeId): boolean {
  return THEME_LOCK_RULES[themeId] != null;
}
