import type { CurrencyCode } from './currency';

export type { CurrencyCode } from './currency';

export type MoneyboxStatus = 'active' | 'completed' | 'abandoned';
export type ThemeId = 'classic_gold' | 'candy_pop' | 'midnight';

export interface Profile {
  id: string;
  displayName: string | null;
  defaultCurrency: CurrencyCode;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  onboardingDone: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Moneybox {
  id: string;
  userId: string;
  name: string;
  theme: ThemeId;
  currency: CurrencyCode;
  goalAmount: number;
  targetDays: number;
  gridRows: number;
  gridCols: number;
  status: MoneyboxStatus;
  createdAt: string;
  completedAt: string | null;
}

export interface Cell {
  id: string;
  moneyboxId: string;
  row: number;
  col: number;
  amount: number;
  isFilled: boolean;
  filledAt: string | null;
}

export interface Reminder {
  id: string;
  moneyboxId: string;
  timeOfDay: string;
  daysOfWeek: number[];
  enabled: boolean;
  createdAt: string;
}

export interface DailySuggestion {
  id: string;
  moneyboxId: string;
  date: string;
  suggestedCellId: string | null;
  accepted: boolean;
  createdAt: string;
}

export interface Streak {
  moneyboxId: string;
  currentDays: number;
  bestDays: number;
  lastFilledDate: string | null;
}
