import AsyncStorage from '@react-native-async-storage/async-storage';
import { Flame, Shield, Trophy, Zap } from 'lucide-react-native';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { create } from 'zustand';

import { useAppTheme } from '@/lib/stores/theme';

interface StreakSectionProps {
  currentStreak: number;
  bestStreak: number;
  userId?: string | null;
  /** Number of streak freezes the user can spend. Renders a shield chip when >0. */
  freezesAvailable?: number;
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
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

export function StreakSection({ currentStreak, bestStreak, userId, freezesAvailable = 0 }: StreakSectionProps) {
  const C = useAppTheme();
  const weeklyActivity = useWeeklyActivity(userId);
  const activeDays = weeklyActivity.filter(Boolean).length;
  const todayIndex = (new Date().getDay() + 6) % 7;
  const isNewBest = currentStreak > 0 && currentStreak >= bestStreak;
  // borderLight in dark mode (#1B2A24) sits one hue away from surface
  // (#162A22) - empty day circles vanish. A translucent white wash gives the
  // inactive cells real contrast without competing with the accent fill.
  const inactiveBg = C.mode === 'dark' ? 'rgba(255,255,255,0.10)' : C.borderLight;

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
      {/* Top row - streak number + best badge */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: currentStreak > 0 ? C.warnBg : inactiveBg,
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {currentStreak > 0 ? (
              <Flame size={20} color={C.warnText} />
            ) : (
              <Zap size={20} color={C.textFaint} />
            )}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
              <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 24, lineHeight: 36, color: C.textPrimary }}>
                {currentStreak}
              </Text>
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: C.textMuted }}>
                day{currentStreak !== 1 ? 's' : ''}
              </Text>
            </View>
            <Text
              numberOfLines={2}
              style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, lineHeight: 16, color: C.textMuted, marginTop: 1 }}
            >
              {currentStreak === 0
                ? 'Save today to start a streak'
                : isNewBest
                  ? 'Personal best!'
                  : `Best: ${bestStreak} days`}
            </Text>
          </View>
        </View>

        <View style={{ flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {/* Streak freeze chip - shown whenever the user has at least one. */}
          {freezesAvailable > 0 && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: C.accentLight,
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 12,
              }}
            >
              <Shield size={12} color={C.accent} />
              <Text
                allowFontScaling={false}
                style={{ fontFamily: 'DMSans_700Bold', fontSize: 11, color: C.accent }}
              >
                {freezesAvailable}
              </Text>
            </View>
          )}

          {/* Best badge */}
          {isNewBest && currentStreak > 1 && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: C.warnBg,
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 12,
              }}
            >
              <Trophy size={12} color={C.warnText} />
              <Text
                allowFontScaling={false}
                numberOfLines={1}
                style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 11, color: C.warnText }}
              >
                NEW BEST
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Weekly activity grid */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: 18,
          paddingHorizontal: 4,
        }}
      >
        {DAY_LABELS.map((label, i) => {
          const isActive = weeklyActivity[i];
          const isToday = i === todayIndex;
          return (
            <View key={i} style={{ alignItems: 'center', gap: 6, flex: 1 }}>
              <Text
                allowFontScaling={false}
                style={{
                  fontFamily: 'DMSans_500Medium',
                  fontSize: 11,
                  color: isToday ? C.textPrimary : C.textFaint,
                }}
              >
                {label}
              </Text>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: isActive ? C.accent : inactiveBg,
                  borderWidth: isToday && !isActive ? 2 : 0,
                  borderColor: C.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isActive && (
                  <Text
                    allowFontScaling={false}
                    style={{
                      fontSize: 12,
                      color: C.mode === 'dark' ? C.buttonPrimaryText : '#FFFFFF',
                      fontFamily: 'DMSans_700Bold',
                    }}
                  >
                    ✓
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Weekly progress bar */}
      <View style={{ marginTop: 14 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 6,
            gap: 8,
          }}
        >
          <Text
            allowFontScaling={false}
            numberOfLines={1}
            style={{ flex: 1, minWidth: 0, fontFamily: 'DMSans_500Medium', fontSize: 12, color: C.textMuted }}
          >
            This week
          </Text>
          <Text
            allowFontScaling={false}
            numberOfLines={1}
            style={{ flexShrink: 0, fontFamily: 'DMSans_600SemiBold', fontSize: 12, color: C.textPrimary }}
          >
            {activeDays}/7
          </Text>
        </View>
        <View style={{ backgroundColor: inactiveBg, height: 4, borderRadius: 2 }}>
          <View
            style={{
              backgroundColor: activeDays === 7 ? '#22C55E' : C.accent,
              height: 4,
              borderRadius: 2,
              width: `${(activeDays / 7) * 100}%`,
            }}
          />
        </View>
      </View>
    </View>
  );
}
