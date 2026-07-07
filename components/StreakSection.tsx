import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';
import { Image, Text, View } from 'react-native';
import { create } from 'zustand';

import { daysBetween, todayDateString } from '@/lib/streak-freeze';
import { useAppTheme } from '@/lib/stores/theme';

// Mascot-style day tokens for the weekly grid.
const STREAK_TOKENS = {
  saved: require('@/assets/stash/streak/saved.webp'),
  today: require('@/assets/stash/streak/today.webp'),
  notSaved: require('@/assets/stash/streak/not-saved.webp'),
};

const WELCOME_TARGET_DAYS = 7;
// getUTCDay() index → label. Sunday is 0.
const WEEKDAY_ABBR = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

type DayState = 'saved' | 'today' | 'missed' | 'future';
interface DayCell {
  label: string;
  state: DayState;
}

interface StreakSectionProps {
  currentStreak: number;
  bestStreak: number;
  userId?: string | null;
  /** YYYY-MM-DD the user created their first moneybox. While today is within 7
   *  days of it, the card switches to the welcome-week grid: 7 days anchored to
   *  the creation date (creation day = day 1) with an "X of 7" counter. */
  welcomeStartDate?: string | null;
  /** YYYY-MM-DD dates the user saved on — drives the welcome grid tokens. */
  savedDates?: readonly string[];
}

const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

/* ── Date helpers (UTC, date-only) ──────────────────────────────── */
function ymdToUTC(ymd: string): Date {
  const [y, m, d] = ymd.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}
function addDaysYmd(ymd: string, n: number): string {
  const dt = ymdToUTC(ymd);
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}
function weekdayAbbr(ymd: string): string {
  return WEEKDAY_ABBR[ymdToUTC(ymd).getUTCDay()];
}
const EMPTY_WEEK: boolean[] = Array(7).fill(false);

function storageKey(userId?: string | null): string {
  return userId ? `stashbox_weekly_activity_${userId}` : 'stashbox_weekly_activity';
}

function getWeekId(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${weekNum}`;
}

// Live store so cell fills on the box detail screen instantly tick the day
// circle in the home-screen StreakSection. Without this, the component only
// re-read AsyncStorage on mount and went stale after a fill.
interface WeeklyActivityState {
  userId: string | null;
  days: boolean[];
  load: (userId?: string | null) => Promise<void>;
  markToday: (userId?: string | null) => Promise<void>;
}

const useWeeklyActivityStore = create<WeeklyActivityState>((set, get) => ({
  userId: null,
  days: EMPTY_WEEK,

  load: async (userId) => {
    set({ userId: userId ?? null });
    const stored = await AsyncStorage.getItem(storageKey(userId));
    if (!stored) {
      set({ days: EMPTY_WEEK });
      return;
    }
    try {
      const parsed = JSON.parse(stored) as { week: string; days: boolean[] };
      if (parsed.week === getWeekId()) set({ days: parsed.days });
      else set({ days: EMPTY_WEEK });
    } catch {
      set({ days: EMPTY_WEEK });
    }
  },

  markToday: async (userId) => {
    const currentWeek = getWeekId();
    const dayIndex = (new Date().getDay() + 6) % 7; // Monday = 0
    const current = get().days;
    // No-op if today is already marked - avoids needless re-renders.
    if (current[dayIndex]) return;
    const next = current.slice();
    next[dayIndex] = true;
    set({ days: next });
    await AsyncStorage.setItem(
      storageKey(userId),
      JSON.stringify({ week: currentWeek, days: next }),
    );
  },
}));

function useWeeklyActivity(userId?: string | null): boolean[] {
  const days = useWeeklyActivityStore((s) => s.days);
  const storedUserId = useWeeklyActivityStore((s) => s.userId);

  useEffect(() => {
    // First load, or user switched - rehydrate from AsyncStorage.
    if (storedUserId !== (userId ?? null)) {
      useWeeklyActivityStore.getState().load(userId);
    }
  }, [userId, storedUserId]);

  return days;
}

export async function markTodayActive(userId?: string | null): Promise<void> {
  // Make sure the store knows about this user before writing - a fresh app
  // launch can hit this before the StreakSection has mounted.
  if (useWeeklyActivityStore.getState().userId !== (userId ?? null)) {
    await useWeeklyActivityStore.getState().load(userId);
  }
  await useWeeklyActivityStore.getState().markToday(userId);
}

export function StreakSection({
  currentStreak,
  bestStreak,
  userId,
  welcomeStartDate = null,
  savedDates,
}: StreakSectionProps) {
  const C = useAppTheme();
  const weeklyActivity = useWeeklyActivity(userId);
  const todayIndex = (new Date().getDay() + 6) % 7;
  const isNewBest = currentStreak > 0 && currentStreak >= bestStreak;
  const today = todayDateString();

  // Welcome-week mode — for the first 7 days from the moneybox creation date the
  // grid is anchored to that date (creation day = day 1) and the corner shows
  // "X of 7" days saved instead of the running streak count.
  const welcomeElapsed = welcomeStartDate ? daysBetween(welcomeStartDate, today) : null;
  const inWelcomeWeek =
    welcomeElapsed !== null && welcomeElapsed >= 0 && welcomeElapsed < WELCOME_TARGET_DAYS;

  // Build the 7 day-cells for whichever mode we're in.
  let days: DayCell[];
  let savedCount = 0;
  if (inWelcomeWeek && welcomeStartDate) {
    const saved = new Set(savedDates ?? []);
    days = Array.from({ length: WELCOME_TARGET_DAYS }).map((_, i) => {
      const date = addDaysYmd(welcomeStartDate, i);
      const isSaved = saved.has(date);
      if (isSaved) savedCount += 1;
      const state: DayState = isSaved
        ? 'saved'
        : date === today
          ? 'today'
          : date > today
            ? 'future'
            : 'missed';
      return { label: weekdayAbbr(date), state };
    });
  } else {
    days = DAY_LABELS.map((label, i) => {
      const state: DayState = weeklyActivity[i]
        ? 'saved'
        : i === todayIndex
          ? 'today'
          : i > todayIndex
            ? 'future'
            : 'missed';
      return { label, state };
    });
  }

  return (
    <View
      style={{
        backgroundColor: C.surface,
        borderRadius: 16,
        padding: 18,
        shadowColor: 'rgba(0,0,0,0.12)',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 1,
        shadowRadius: 20,
        elevation: 2,
      }}
    >
      {/* Top row — label · "X of 7" (welcome) or count + New PB badge */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 10, letterSpacing: 1.2, color: C.textSecondary }}>
          {inWelcomeWeek ? 'WELCOME WEEK' : 'STREAK'}
        </Text>

        <View style={{ flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {inWelcomeWeek ? (
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
              <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 13, color: C.textPrimary }}>
                {savedCount}
              </Text>
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: C.textMuted }}>
                of {WELCOME_TARGET_DAYS}
              </Text>
            </View>
          ) : (
            <>
              {/* New PB — shown when the user beats their previous streak record. */}
              {isNewBest && currentStreak > 1 && (
                <View
                  style={{
                    backgroundColor: C.accentLight,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 999,
                  }}
                >
                  <Text
                    allowFontScaling={false}
                    numberOfLines={1}
                    style={{ fontFamily: 'DMSans_700Bold', fontSize: 11, color: C.accent }}
                  >
                    New PB
                  </Text>
                </View>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 13, color: C.textPrimary }}>
                  {currentStreak}
                </Text>
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: C.textMuted }}>
                  day{currentStreak !== 1 ? 's' : ''}
                </Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Day-token grid — Mon–Sun normally, or the 7-day welcome window */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: 18,
        }}
      >
        {days.map((d, i) => {
          const isToday = d.state === 'today';
          const token =
            d.state === 'saved'
              ? STREAK_TOKENS.saved
              : isToday
                ? STREAK_TOKENS.today
                : STREAK_TOKENS.notSaved;
          return (
            <View key={i} style={{ alignItems: 'center', gap: 6 }}>
              <Text
                allowFontScaling={false}
                style={{
                  fontFamily: isToday ? 'DMSans_700Bold' : 'DMSans_500Medium',
                  fontSize: 11,
                  // today = accent + bold; future days faded; past days muted.
                  color: isToday ? C.accent : d.state === 'future' ? C.textFaint : C.textMuted,
                }}
              >
                {d.label}
              </Text>
              <Image source={token} style={{ width: 32, height: 32 }} resizeMode="contain" />
            </View>
          );
        })}
      </View>
    </View>
  );
}
