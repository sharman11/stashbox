import { Pressable, Text, View } from 'react-native';

import { formatAmount, type CurrencyCode } from '@/lib/currency';
import { useAppTheme } from '@/lib/stores/theme';
import type { ExpenseCategory, ExpenseTransaction } from '@/lib/types';

/** One transaction line: category tile, name + note, signed amount. Income
 *  pops green; spending stays neutral — a wall of red reads as alarm. */
export function TransactionRow({
  txn,
  category,
  homeCurrency,
  rates,
  onPress,
}: {
  txn: ExpenseTransaction;
  category: ExpenseCategory | null;
  homeCurrency: CurrencyCode;
  rates: Record<string, number>;
  onPress: () => void;
}) {
  const C = useAppTheme();
  const isIncome = txn.type === 'income';
  const isForeign = txn.currency !== homeCurrency;
  const homeAmount = isForeign
    ? (txn.amountCents / 100) * (rates[homeCurrency] ?? 1) / (rates[txn.currency] ?? 1)
    : txn.amountCents / 100;
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: C.surface,
        borderRadius: 12,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderWidth: 1,
        borderColor: C.border,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: category ? `${category.color}22` : C.borderLight,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 20 }}>{category?.emoji ?? '💵'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text
          numberOfLines={1}
          style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: C.textPrimary }}
        >
          {category?.name ?? (isIncome ? 'Income' : 'Expense')}
        </Text>
        {txn.note ? (
          <Text
            numberOfLines={1}
            style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: C.textMuted, marginTop: 1 }}
          >
            {txn.note}
          </Text>
        ) : null}
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text
          style={{
            fontFamily: 'DMSans_700Bold',
            fontSize: 15,
            color: isIncome ? '#10B981' : C.textPrimary,
          }}
        >
          {isIncome ? '+' : '−'}
          {formatAmount(txn.amountCents / 100, txn.currency)}
        </Text>
        {isForeign && (
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: C.textMuted }}>
            ≈ {formatAmount(homeAmount, homeCurrency)}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

/** Day-group header label: Today / Yesterday / "Fri, Jul 4". */
export function dayLabel(date: string): string {
  const ymd = (dt: Date) =>
    `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  const now = new Date();
  if (date === ymd(now)) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date === ymd(yesterday)) return 'Yesterday';
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
