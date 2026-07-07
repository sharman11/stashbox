import { useRouter } from 'expo-router';
import { ChevronRight, Wallet } from 'lucide-react-native';
import { Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { CardEyebrow, HomeCard } from '@/components/home/HomeCard';
import { SpringPressable } from '@/components/SpringPressable';
import { formatAmount } from '@/lib/currency';
import { useSafeToSpend, type SafeToSpend } from '@/lib/home/safe-to-spend';
import { useAppTheme } from '@/lib/stores/theme';

/**
 * "Safe to spend today" — daily discretionary allowance with a segmented spend
 * bar (each slice a category's share of the month's spend) over a tick ruler
 * scaled to the budget cap. Built on the shared HomeCard surface.
 */
export function SafeToSpendCard() {
  const router = useRouter();
  const C = useAppTheme();
  const s = useSafeToSpend();

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
            borderRadius: 18,
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
  const paceColor = s.pace === 'over' ? '#DC2626' : s.pace === 'fast' ? '#F59E0B' : '#16A34A';
  const paceLabel = s.pace === 'over' ? 'Over budget' : s.pace === 'fast' ? 'Spending fast' : 'On pace';

  return (
    <HomeCard onPress={() => router.push('/expenses/budgets' as never)} delay={100} padding={18} contentStyle={{ gap: 14 }}>
      <CardEyebrow
        label="SAFE TO SPEND TODAY"
        right={
          <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: paceColor + '18' }}>
            <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 10, color: paceColor }}>{paceLabel}</Text>
          </View>
        }
      />

      <View>
        <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 34, color: C.textPrimary, letterSpacing: -1 }}>
          {s.overBudget ? formatAmount(0, s.currency) : formatAmount(Math.round(s.safeTodayCents / 100), s.currency)}
        </Text>
        <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: dim, marginTop: 2 }}>
          {s.overBudget
            ? `${formatAmount(Math.round(Math.abs(s.remainingCents) / 100), s.currency)} over budget`
            : `${formatAmount(Math.round(s.remainingCents / 100), s.currency)} left · ${s.daysLeft} day${s.daysLeft === 1 ? '' : 's'}`}
        </Text>
        {!s.overBudget && s.reservedCents > 0 && (
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: dim, marginTop: 2, opacity: 0.8 }}>
            {formatAmount(Math.round(s.reservedCents / 100), s.currency)} set aside for upcoming payments
          </Text>
        )}
      </View>

      <SpendLimitBar data={s} />
    </HomeCard>
  );
}

/* ──────────────────────────────────────────────────────────────────────
 * Segmented spend bar.
 * ──────────────────────────────────────────────────────────────────── */

function SpendLimitBar({ data }: { data: SafeToSpend }) {
  const C = useAppTheme();
  const { segments, capCents, spentCents, overBudget, currency } = data;
  const denom = overBudget ? Math.max(1, spentCents) : Math.max(1, capCents);

  return (
    <View style={{ gap: 8 }}>
      <View
        style={{
          height: 14,
          borderRadius: 7,
          backgroundColor: C.borderLight,
          overflow: 'hidden',
          flexDirection: 'row',
          gap: 2,
        }}
      >
        {segments.map((seg, i) => (
          <View key={i} style={{ width: `${Math.max(0, (seg.cents / denom) * 100)}%`, backgroundColor: seg.color }} />
        ))}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 11, color: C.textMuted }}>
          {formatAmount(Math.round(spentCents / 100), currency)} spent
        </Text>
        <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 11, color: C.textMuted }}>
          {formatAmount(Math.round(capCents / 100), currency)} cap
        </Text>
      </View>
    </View>
  );
}
