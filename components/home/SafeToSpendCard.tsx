import { useRouter } from 'expo-router';
import { ChevronRight, Wallet } from 'lucide-react-native';
import { Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SpringPressable } from '@/components/SpringPressable';
import { formatAmount } from '@/lib/currency';
import { useSafeToSpend } from '@/lib/home/safe-to-spend';
import { useAppTheme } from '@/lib/stores/theme';

/**
 * "Safe to spend today" — the daily-glance number. Shows a per-day allowance
 * derived from the overall monthly budget. When no budget exists, it becomes a
 * one-line prompt to set one (discovery + activation).
 */
export function SafeToSpendCard() {
  const router = useRouter();
  const C = useAppTheme();
  const s = useSafeToSpend();

  // No budget yet → gentle prompt to unlock the feature.
  if (!s.available) {
    return (
      <Animated.View entering={FadeInDown.duration(400).delay(100)}>
        <SpringPressable
          onPress={() => router.push('/expenses/budgets' as never)}
          haptic
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            backgroundColor: C.surfaceElevated,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: C.border,
            borderStyle: 'dashed',
            padding: 14,
          }}
        >
          <Wallet size={18} color={C.textSecondary} />
          <Text style={{ flex: 1, fontFamily: 'DMSans_500Medium', fontSize: 13, color: C.textSecondary }}>
            Set a monthly budget to see what's safe to spend
          </Text>
          <ChevronRight size={16} color={C.textSecondary} />
        </SpringPressable>
      </Animated.View>
    );
  }

  const dim = C.textSecondary;
  const paceColor = s.pace === 'over' ? '#DC2626' : s.pace === 'fast' ? '#B45309' : C.accent;
  const paceLabel = s.pace === 'over' ? 'Over budget' : s.pace === 'fast' ? 'Spending fast' : 'On pace';

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(100)}>
      <SpringPressable
        onPress={() => router.push('/expenses/budgets' as never)}
        haptic
        style={{
          backgroundColor: C.surfaceElevated,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: C.border,
          padding: 18,
          gap: 12,
          shadowColor: '#0F1419',
          shadowOpacity: 0.04,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 2 },
          elevation: 1,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Wallet size={13} color={dim} />
            <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 10, letterSpacing: 1.2, color: dim }}>
              SAFE TO SPEND TODAY
            </Text>
          </View>
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 999,
              backgroundColor: paceColor + '18',
            }}
          >
            <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 10, color: paceColor }}>
              {paceLabel}
            </Text>
          </View>
        </View>

        <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 34, color: C.textPrimary, letterSpacing: -1 }}>
          {s.overBudget ? formatAmount(0, s.currency) : formatAmount(Math.round(s.safeTodayCents / 100), s.currency)}
        </Text>

        <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: dim }}>
          {s.overBudget
            ? `${formatAmount(Math.round(Math.abs(s.remainingCents) / 100), s.currency)} over budget this month`
            : `${formatAmount(Math.round(s.remainingCents / 100), s.currency)} left · ${s.daysLeft} day${s.daysLeft === 1 ? '' : 's'} to go`}
        </Text>
      </SpringPressable>
    </Animated.View>
  );
}
