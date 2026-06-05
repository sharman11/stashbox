import { useRouter } from 'expo-router';
import { ChevronRight, Sparkles } from 'lucide-react-native';
import { useEffect, useMemo } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SpringPressable } from '@/components/SpringPressable';
import { computeLoanSuggestions } from '@/lib/loans/suggestions';
import { useLoansStore } from '@/lib/stores/loans';
import { useMoneyboxesStore } from '@/lib/stores/moneyboxes';
import { useSessionStore } from '@/lib/stores/session';
import { useAppTheme } from '@/lib/stores/theme';

/**
 * "Ways to pay off faster" — a small panel of hard-coded, data-driven loan
 * suggestions (start a Payoff Booster, round up, apply a surplus). Each routes
 * into an existing flow pre-filled. Renders nothing when there's nothing useful
 * to suggest. Reuses the loans-tab card styling (no new design).
 */
export function LoanSuggestionsCard() {
  const C = useAppTheme();
  const router = useRouter();
  const userId = useSessionStore((s) => s.userId);
  const loans = useLoansStore((s) => s.loans);
  const moneyboxes = useMoneyboxesStore((s) => s.moneyboxes);
  const loadBoxes = useMoneyboxesStore((s) => s.loadAll);

  // Need moneyboxes to know which loans already have a booster vault.
  useEffect(() => {
    if (userId) loadBoxes(userId);
  }, [userId, loadBoxes]);

  const boostedLoanIds = useMemo(() => {
    const set = new Set<string>();
    for (const b of moneyboxes) {
      if (b.status === 'active' && b.linkedLoanId) set.add(b.linkedLoanId);
    }
    return set;
  }, [moneyboxes]);

  const suggestions = useMemo(
    () => computeLoanSuggestions({ loans, boostedLoanIds }),
    [loans, boostedLoanIds],
  );

  if (suggestions.length === 0) return null;

  return (
    <Animated.View
      entering={FadeInDown.duration(400)}
      style={{
        backgroundColor: C.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: C.borderLight,
        padding: 16,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <Sparkles size={13} color={C.accent} />
        <Text
          style={{
            fontFamily: 'DMSans_600SemiBold',
            fontSize: 10,
            letterSpacing: 1.2,
            color: C.textSecondary,
          }}
        >
          WAYS TO PAY OFF FASTER
        </Text>
      </View>

      {suggestions.map((s, i) => (
        <SpringPressable
          key={s.id}
          haptic
          onPress={() => router.push(s.route as never)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingVertical: 12,
            borderTopWidth: i === 0 ? 0 : 1,
            borderTopColor: C.borderLight,
          }}
        >
          <Text style={{ fontSize: 20 }}>{s.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text
              style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: C.textPrimary }}
              numberOfLines={2}
            >
              {s.title}
            </Text>
            <Text
              style={{
                fontFamily: 'DMSans_400Regular',
                fontSize: 12,
                color: C.textMuted,
                marginTop: 2,
                lineHeight: 17,
              }}
            >
              {s.detail}
            </Text>
            <Text
              style={{
                fontFamily: 'DMSans_600SemiBold',
                fontSize: 12,
                color: C.accent,
                marginTop: 6,
              }}
            >
              {s.ctaLabel} →
            </Text>
          </View>
          <ChevronRight size={18} color={C.textFaint} />
        </SpringPressable>
      ))}
    </Animated.View>
  );
}
