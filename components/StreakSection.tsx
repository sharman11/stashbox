import AsyncStorage from '@react-native-async-storage/async-storage';
import { Flame, Trophy, Zap } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

interface StreakSectionProps {
  currentStreak: number;
  bestStreak: number;
  userId?: string | null;
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function storageKey(userId?: string | null): string {
  return userId ? `stashbox_weekly_activity_${userId}` : 'stashbox_weekly_activity';
}

const C = {
  accent: '#1DB954',
  surface: '#FFFFFF',
  textPrimary: '#0F1419',
  textMuted: '#9CA3AF',
  textFaint: '#D1D5DB',
  border: '#F3F4F6',
};

function useWeeklyActivity(userId?: string | null): boolean[] {
  const [activity, setActivity] = useState<boolean[]>(Array(7).fill(false));

  useEffect(() => {
    loadActivity();
  }, [userId]);

  const loadActivity = async () => {
    const stored = await AsyncStorage.getItem(storageKey(userId));
    if (!stored) {
      setActivity(Array(7).fill(false));
      return;
    }
    try {
      const parsed = JSON.parse(stored) as { week: string; days: boolean[] };
      const currentWeek = getWeekId();
      if (parsed.week === currentWeek) {
        setActivity(parsed.days);
      } else {
        setActivity(Array(7).fill(false));
      }
    } catch {
      setActivity(Array(7).fill(false));
    }
  };

  return activity;
}

function getWeekId(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${weekNum}`;
}

export async function markTodayActive(userId?: string | null): Promise<void> {
  const key = storageKey(userId);
  const currentWeek = getWeekId();
  const dayIndex = (new Date().getDay() + 6) % 7; // Monday = 0
  const stored = await AsyncStorage.getItem(key);
  let days = Array(7).fill(false);

  if (stored) {
    try {
      const parsed = JSON.parse(stored) as { week: string; days: boolean[] };
      if (parsed.week === currentWeek) days = parsed.days;
    } catch { /* fresh week */ }
  }

  days[dayIndex] = true;
  await AsyncStorage.setItem(key, JSON.stringify({ week: currentWeek, days }));
}

export function StreakSection({ currentStreak, bestStreak, userId }: StreakSectionProps) {
  const weeklyActivity = useWeeklyActivity(userId);
  const activeDays = weeklyActivity.filter(Boolean).length;
  const todayIndex = (new Date().getDay() + 6) % 7;
  const isNewBest = currentStreak > 0 && currentStreak >= bestStreak;

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
      {/* Top row — streak number + best badge */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: currentStreak > 0 ? '#FEF3C7' : C.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {currentStreak > 0 ? (
              <Flame size={20} color="#F59E0B" />
            ) : (
              <Zap size={20} color={C.textFaint} />
            )}
          </View>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
              <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 24, color: C.textPrimary }}>
                {currentStreak}
              </Text>
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: C.textMuted }}>
                day{currentStreak !== 1 ? 's' : ''}
              </Text>
            </View>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: C.textMuted, marginTop: 1 }}>
              {currentStreak === 0
                ? 'Save today to start a streak'
                : isNewBest
                  ? 'Personal best!'
                  : `Best: ${bestStreak} days`}
            </Text>
          </View>
        </View>

        {/* Best badge */}
        {isNewBest && currentStreak > 1 && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: '#FEF3C7',
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 12,
            }}
          >
            <Trophy size={12} color="#F59E0B" />
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#B45309' }}>
              NEW BEST
            </Text>
          </View>
        )}
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
                style={{
                  fontFamily: 'Inter_500Medium',
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
                  backgroundColor: isActive ? C.accent : C.border,
                  borderWidth: isToday && !isActive ? 2 : 0,
                  borderColor: C.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isActive && (
                  <Text style={{ fontSize: 12, color: '#FFFFFF', fontFamily: 'Inter_700Bold' }}>
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
          }}
        >
          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: C.textMuted }}>
            This week
          </Text>
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: C.textPrimary }}>
            {activeDays}/7
          </Text>
        </View>
        <View style={{ backgroundColor: C.border, height: 4, borderRadius: 2 }}>
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
