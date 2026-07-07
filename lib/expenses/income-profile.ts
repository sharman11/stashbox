import AsyncStorage from '@react-native-async-storage/async-storage';

import { useExpenseCategoriesStore } from '../stores/expense-categories';
import type { CurrencyCode } from '../currency';

/**
 * The "money picture" collected during signup: monthly income, its source,
 * and the currency. Written by the stepper, consumed by the monthly income
 * nudge (and future insights).
 */

const PROFILE_KEY = 'stashbox_income_profile';
const NUDGE_DISMISSED_KEY = 'stashbox_income_nudge_dismissed';

export interface IncomeProfile {
  monthlyIncomeCents: number | null;
  source: string | null;
  currency: CurrencyCode;
}

/** Income-source options (signup step + nudge card). `category` is the
 *  income category a logged income transaction is filed under — created on
 *  demand, since only "Salary" ships as a default. */
export const INCOME_SOURCES = [
  { emoji: '💼', label: 'Salary', value: 'salary', category: { name: 'Salary', emoji: '💼', color: '#10B981' } },
  { emoji: '🏪', label: 'Business', value: 'business', category: { name: 'Business', emoji: '🏪', color: '#3B82F6' } },
  { emoji: '💻', label: 'Freelance', value: 'freelance', category: { name: 'Freelance', emoji: '💻', color: '#8B5CF6' } },
  { emoji: '🎁', label: 'Family', value: 'family', category: { name: 'Family', emoji: '🎁', color: '#EC4899' } },
  { emoji: '💸', label: 'Other', value: 'other', category: { name: 'Other income', emoji: '💸', color: '#F59E0B' } },
] as const;

export type IncomeSourceValue = (typeof INCOME_SOURCES)[number]['value'];

export async function readIncomeProfile(): Promise<IncomeProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as IncomeProfile;
    if (!parsed || typeof parsed !== 'object' || !parsed.currency) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function writeIncomeProfile(profile: IncomeProfile): Promise<void> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

/**
 * Resolve (create if needed) the income category for a source value.
 * Returns null when the source is unknown or creation fails — callers log
 * the transaction uncategorized rather than blocking.
 */
export async function ensureIncomeCategoryId(
  userId: string,
  source: string | null,
): Promise<string | null> {
  const meta = INCOME_SOURCES.find((s) => s.value === source)?.category;
  if (!meta) return null;
  const store = useExpenseCategoriesStore.getState();
  await store.seedDefaultsIfEmpty(userId);

  const find = () =>
    useExpenseCategoriesStore
      .getState()
      .categories.find(
        (c) => c.type === 'income' && c.name.toLowerCase() === meta.name.toLowerCase(),
      )?.id ?? null;

  const existing = find();
  if (existing) return existing;
  try {
    await store.create({ userId, type: 'income', ...meta });
    return find();
  } catch {
    return null;
  }
}

/** Month ('YYYY-MM') the user dismissed the income nudge for, if any. */
export async function readNudgeDismissedMonth(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(NUDGE_DISMISSED_KEY);
  } catch {
    return null;
  }
}

export async function dismissNudgeForMonth(month: string): Promise<void> {
  await AsyncStorage.setItem(NUDGE_DISMISSED_KEY, month);
}
