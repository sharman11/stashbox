import { X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { SpringPressable } from '@/components/SpringPressable';
import { formatAmount } from '@/lib/currency';
import {
  INCOME_SOURCES,
  dismissNudgeForMonth,
  ensureIncomeCategoryId,
  readIncomeProfile,
  readNudgeDismissedMonth,
  type IncomeProfile,
} from '@/lib/expenses/income-profile';
import { todayDate, useExpenseTransactionsStore } from '@/lib/stores/expense-transactions';
import { useSessionStore } from '@/lib/stores/session';
import { useAppTheme } from '@/lib/stores/theme';

/**
 * New-month income nudge. The signup money picture stores the user's monthly
 * income; when a month starts with no income logged, offer to log it in one
 * tap. Suggest-don't-automate: we never fabricate transactions silently.
 */
export function MonthlyIncomeCard({ style }: { style?: StyleProp<ViewStyle> }) {
  const C = useAppTheme();
  const userId = useSessionStore((s) => s.userId);
  const transactions = useExpenseTransactionsStore((s) => s.transactions);
  const createTxn = useExpenseTransactionsStore((s) => s.create);

  const [profile, setProfile] = useState<IncomeProfile | null>(null);
  const [dismissedMonth, setDismissedMonth] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [logging, setLogging] = useState(false);

  useEffect(() => {
    Promise.all([readIncomeProfile(), readNudgeDismissedMonth()]).then(([p, d]) => {
      setProfile(p);
      setDismissedMonth(d);
      setHydrated(true);
    });
  }, []);

  const monthKey = todayDate().slice(0, 7);
  const hasIncomeThisMonth = transactions.some(
    (t) => t.type === 'income' && t.occurredOn.startsWith(monthKey),
  );

  if (
    !hydrated ||
    !userId ||
    !profile?.monthlyIncomeCents ||
    profile.monthlyIncomeCents <= 0 ||
    hasIncomeThisMonth ||
    dismissedMonth === monthKey
  ) {
    return null;
  }

  const sourceMeta = INCOME_SOURCES.find((s) => s.value === profile.source);
  const amountLabel = formatAmount(profile.monthlyIncomeCents / 100, profile.currency);

  const onLog = async () => {
    if (logging) return;
    setLogging(true);
    try {
      const categoryId = await ensureIncomeCategoryId(userId, profile.source);
      await createTxn({
        userId,
        type: 'income',
        amountCents: profile.monthlyIncomeCents!,
        currency: profile.currency,
        categoryId,
        occurredOn: todayDate(),
        note: 'Monthly income',
      });
      // hasIncomeThisMonth flips via the store — the card hides itself.
    } catch {
      // Leave the card up so the user can retry.
    } finally {
      setLogging(false);
    }
  };

  const onDismiss = () => {
    setDismissedMonth(monthKey);
    dismissNudgeForMonth(monthKey).catch(() => undefined);
  };

  return (
    <View
      style={[
        {
          backgroundColor: C.surface,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: C.border,
          padding: 16,
          gap: 12,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            backgroundColor: C.accentLight,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 17 }}>{sourceMeta?.emoji ?? '💵'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 15, color: C.textPrimary }}>
            New month, no income logged yet
          </Text>
          <Text
            style={{
              fontFamily: 'DMSans_400Regular',
              fontSize: 12,
              color: C.textSecondary,
              marginTop: 2,
              lineHeight: 17,
            }}
          >
            Log your usual {amountLabel}
            {sourceMeta ? ` ${sourceMeta.label.toLowerCase()}` : ''} in one tap.
          </Text>
        </View>
        <Pressable onPress={onDismiss} hitSlop={8} accessibilityLabel="Dismiss for this month">
          <X size={16} color={C.textFaint} />
        </Pressable>
      </View>

      <SpringPressable
        onPress={onLog}
        disabled={logging}
        haptic
        style={{
          backgroundColor: C.accent,
          borderRadius: 12,
          paddingVertical: 12,
          alignItems: 'center',
        }}
      >
        {logging ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: '#FFFFFF' }}>
            Log {amountLabel} income
          </Text>
        )}
      </SpringPressable>
    </View>
  );
}
