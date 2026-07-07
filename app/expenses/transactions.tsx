import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TransactionRow, dayLabel } from '@/components/expenses/TransactionRow';
import { formatAmount, type CurrencyCode } from '@/lib/currency';
import { getCachedRates } from '@/lib/expenses/fx';
import { useExpenseCategoriesStore } from '@/lib/stores/expense-categories';
import { useExpenseTransactionsStore } from '@/lib/stores/expense-transactions';
import { useProfileStore } from '@/lib/stores/profile';
import { useAppTheme } from '@/lib/stores/theme';
import type { ExpenseCategory, ExpenseTransaction } from '@/lib/types';

interface DayGroup {
  date: string;
  txns: ExpenseTransaction[];
  netCents: number;
}

/**
 * Full transaction list for one month — everything, not the tab's 30-row
 * preview. Doubles as the category drill-down target: pass `categoryId`
 * (+ `categoryName` for the title) to filter to a single category.
 */
export default function TransactionsScreen() {
  const C = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const params = useLocalSearchParams<{
    month?: string;
    categoryId?: string;
    categoryName?: string;
  }>();
  const month = typeof params.month === 'string' && /^\d{4}-\d{2}/.test(params.month)
    ? params.month.slice(0, 7)
    : new Date().toISOString().slice(0, 7);
  const categoryId = typeof params.categoryId === 'string' ? params.categoryId : null;

  const profile = useProfileStore((s) => s.profile);
  const homeCurrency: CurrencyCode = profile?.defaultCurrency ?? 'USD';
  const transactions = useExpenseTransactionsStore((s) => s.transactions);
  const categories = useExpenseCategoriesStore((s) => s.categories);
  const [rates] = useState<Record<string, number>>(() => getCachedRates());

  const categoryMap = useMemo(() => {
    const map = new Map<string, ExpenseCategory>();
    for (const c of categories) map.set(c.id, c);
    return map;
  }, [categories]);

  const groups = useMemo<DayGroup[]>(() => {
    const toHomeCents = (t: ExpenseTransaction) =>
      Math.round((t.amountCents * (rates[homeCurrency] ?? 1)) / (rates[t.currency] ?? 1));
    const filtered = transactions
      .filter((t) => t.occurredOn.startsWith(month))
      .filter((t) => (categoryId ? t.categoryId === categoryId : true))
      .sort((a, b) => b.occurredOn.localeCompare(a.occurredOn));
    const out: DayGroup[] = [];
    for (const t of filtered) {
      let g = out[out.length - 1];
      if (!g || g.date !== t.occurredOn) {
        g = { date: t.occurredOn, txns: [], netCents: 0 };
        out.push(g);
      }
      g.txns.push(t);
      g.netCents += t.type === 'income' ? toHomeCents(t) : -toHomeCents(t);
    }
    return out;
  }, [transactions, month, categoryId, rates, homeCurrency]);

  const total = groups.reduce((s, g) => s + g.txns.length, 0);
  const monthLabel = (() => {
    const [y, m] = month.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  })();
  const title = categoryId
    ? (typeof params.categoryName === 'string' && params.categoryName) ||
      categoryMap.get(categoryId)?.name ||
      'Category'
    : 'Transactions';

  return (
    <View style={{ flex: 1, backgroundColor: C.pageBg }}>
      <StatusBar style={C.mode === 'dark' ? 'light' : 'dark'} />

      {/* Top bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: insets.top + 8,
          paddingHorizontal: 20,
          paddingBottom: 8,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Back">
          <ChevronLeft size={26} color={C.textPrimary} strokeWidth={2.25} />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 16, color: C.textPrimary }}>
            {title}
          </Text>
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: C.textMuted, marginTop: 1 }}>
            {monthLabel} · {total} transaction{total === 1 ? '' : 's'}
          </Text>
        </View>
        <View style={{ width: 26, height: 26 }} />
      </View>

      <FlatList
        data={groups}
        keyExtractor={(g) => g.date}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View
            style={{
              marginTop: 24,
              backgroundColor: C.surface,
              borderRadius: 14,
              padding: 24,
              borderWidth: 1,
              borderColor: C.border,
              borderStyle: 'dashed',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: C.textMuted }}>
              Nothing here for {monthLabel}.
            </Text>
          </View>
        }
        renderItem={({ item: g }) => (
          <View style={{ gap: 8 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 4,
                paddingTop: 14,
              }}
            >
              <Text
                style={{
                  fontFamily: 'DMSans_600SemiBold',
                  fontSize: 12,
                  color: C.textMuted,
                  letterSpacing: 0.3,
                }}
              >
                {dayLabel(g.date)}
              </Text>
              {g.netCents !== 0 && (
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: C.textMuted }}>
                  {g.netCents > 0 ? '+' : '−'}
                  {formatAmount(Math.abs(g.netCents) / 100, homeCurrency)}
                </Text>
              )}
            </View>
            {g.txns.map((t) => (
              <TransactionRow
                key={t.id}
                txn={t}
                category={t.categoryId ? categoryMap.get(t.categoryId) ?? null : null}
                homeCurrency={homeCurrency}
                rates={rates}
                onPress={() => router.push({ pathname: '/expenses/edit', params: { id: t.id } })}
              />
            ))}
          </View>
        )}
      />
    </View>
  );
}
