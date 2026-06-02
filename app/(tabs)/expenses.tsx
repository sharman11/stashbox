import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FolderTree,
  Plus,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BarChart, type BarDatum } from '@/components/charts/BarChart';
import { DonutChart, DonutLegend, type DonutSlice } from '@/components/charts/DonutChart';
import { CURRENCIES, formatAmount, type CurrencyCode } from '@/lib/currency';
import { exportTransactionsToCsv } from '@/lib/expenses/csv-export';
import { getCachedRates, getFxRates } from '@/lib/expenses/fx';
import { useExpenseBudgetsStore, progressForBudget } from '@/lib/stores/expense-budgets';
import { useExpenseCategoriesStore } from '@/lib/stores/expense-categories';
import {
  currentMonthAnchor,
  expensesByCategory,
  monthAnchorFor,
  monthlyTrend,
  totalsForMonth,
  useExpenseTransactionsStore,
} from '@/lib/stores/expense-transactions';
import { useProfileStore } from '@/lib/stores/profile';
import { useSessionStore } from '@/lib/stores/session';
import { useAppTheme } from '@/lib/stores/theme';
import type { ExpenseCategory, ExpenseTransaction } from '@/lib/types';

/* ──────────────────────────────────────────────────────────────────────
 * Expenses tab
 * ──────────────────────────────────────────────────────────────────── */

export default function ExpensesScreen() {
  const C = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const userId = useSessionStore((s) => s.userId);
  const profile = useProfileStore((s) => s.profile);
  const homeCurrency: CurrencyCode = profile?.defaultCurrency ?? 'USD';

  const categories = useExpenseCategoriesStore((s) => s.categories);
  const seedDefaults = useExpenseCategoriesStore((s) => s.seedDefaultsIfEmpty);
  const loadCategories = useExpenseCategoriesStore((s) => s.loadAll);

  const transactions = useExpenseTransactionsStore((s) => s.transactions);
  const loadTransactions = useExpenseTransactionsStore((s) => s.loadAll);
  const txnsLoading = useExpenseTransactionsStore((s) => s.loading);

  const budgets = useExpenseBudgetsStore((s) => s.budgets);
  const loadBudgets = useExpenseBudgetsStore((s) => s.loadAll);

  const [rates, setRates] = useState<Record<string, number>>(() => getCachedRates());
  const [periodAnchor, setPeriodAnchor] = useState<string>(currentMonthAnchor());

  // Initial load: hydrate stores + warm FX cache. seedDefaults is idempotent.
  useEffect(() => {
    if (!userId) return;
    (async () => {
      await Promise.all([loadCategories(userId), loadTransactions(userId), loadBudgets(userId)]);
      await seedDefaults(userId);
      const fresh = await getFxRates();
      setRates(fresh);
    })().catch(() => {
      /* fail silently — UI shows what it can with cached/empty data */
    });
  }, [userId, loadCategories, loadTransactions, loadBudgets, seedDefaults]);

  // ── derived ──
  const categoryMap = useMemo(() => {
    const map = new Map<string, ExpenseCategory>();
    for (const c of categories) map.set(c.id, c);
    return map;
  }, [categories]);

  const monthTotals = useMemo(
    () => totalsForMonth(transactions, periodAnchor, homeCurrency, rates),
    [transactions, periodAnchor, homeCurrency, rates],
  );

  const categoryBreakdown = useMemo(() => {
    const breakdown = expensesByCategory(transactions, periodAnchor, homeCurrency, rates);
    return breakdown.filter((b) => b.amountCents > 0);
  }, [transactions, periodAnchor, homeCurrency, rates]);

  const trend = useMemo(
    () => monthlyTrend(transactions, homeCurrency, rates, 6),
    [transactions, homeCurrency, rates],
  );

  const monthTxns = useMemo(() => {
    const prefix = periodAnchor.slice(0, 7);
    return transactions
      .filter((t) => t.occurredOn.startsWith(prefix))
      .slice(0, 30);
  }, [transactions, periodAnchor]);

  const overallBudget = useMemo(
    () => budgets.find((b) => b.categoryId === null && b.periodMonth === periodAnchor),
    [budgets, periodAnchor],
  );
  const overallProgress = useMemo(
    () => (overallBudget ? progressForBudget(overallBudget, transactions, rates) : null),
    [overallBudget, transactions, rates],
  );

  // ── handlers ──
  const goPrevMonth = () => setPeriodAnchor(shiftMonth(periodAnchor, -1));
  const goNextMonth = () => {
    const next = shiftMonth(periodAnchor, +1);
    if (next > currentMonthAnchor()) return; // don't allow future months
    setPeriodAnchor(next);
  };
  const onAdd = () => router.push('/expenses/edit');
  const onEdit = (id: string) => router.push({ pathname: '/expenses/edit', params: { id } });
  const onExport = async () => {
    if (!userId) return;
    try {
      await exportTransactionsToCsv(transactions, categoryMap);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('export failed', e);
    }
  };

  // ── render ──
  return (
    <View style={{ flex: 1, backgroundColor: C.pageBg }}>
      <StatusBar style={C.mode === 'dark' ? 'light' : 'dark'} />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View
          style={{
            paddingTop: insets.top + 12,
            paddingHorizontal: 20,
            paddingBottom: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text
            style={{
              fontFamily: 'DMSans_700Bold',
              fontSize: 24,
              color: C.textPrimary,
              letterSpacing: -0.4,
            }}
          >
            Expenses
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <HeaderIconButton onPress={() => router.push('/expenses/categories')}>
              <FolderTree size={20} color={C.textSecondary} />
            </HeaderIconButton>
            <HeaderIconButton onPress={() => router.push('/expenses/budgets')}>
              <Target size={20} color={C.textSecondary} />
            </HeaderIconButton>
            <HeaderIconButton onPress={onExport}>
              <Download size={20} color={C.textSecondary} />
            </HeaderIconButton>
          </View>
        </View>

        {/* ── Month selector ── */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            marginBottom: 12,
          }}
        >
          <Pressable onPress={goPrevMonth} hitSlop={12}>
            <ChevronLeft size={22} color={C.textSecondary} />
          </Pressable>
          <Text
            style={{
              fontFamily: 'DMSans_600SemiBold',
              fontSize: 16,
              color: C.textPrimary,
              minWidth: 140,
              textAlign: 'center',
            }}
          >
            {formatMonth(periodAnchor)}
          </Text>
          <Pressable
            onPress={goNextMonth}
            hitSlop={12}
            disabled={periodAnchor >= currentMonthAnchor()}
          >
            <ChevronRight
              size={22}
              color={periodAnchor >= currentMonthAnchor() ? C.borderLight : C.textSecondary}
            />
          </Pressable>
        </View>

        {/* ── Overview cards ── */}
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <OverviewCard
              icon={<TrendingUp size={18} color="#10B981" />}
              label="Income"
              amount={monthTotals.incomeCents / 100}
              currency={homeCurrency}
              tone="income"
            />
            <OverviewCard
              icon={<TrendingDown size={18} color="#EF4444" />}
              label="Expenses"
              amount={monthTotals.expenseCents / 100}
              currency={homeCurrency}
              tone="expense"
            />
          </View>
          <BalanceCard amount={monthTotals.balanceCents / 100} currency={homeCurrency} />
        </View>

        {/* ── Budget progress ── */}
        {overallProgress && (
          <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
            <BudgetProgressCard
              spent={overallProgress.spentCents / 100}
              limit={overallProgress.budget.limitCents / 100}
              ratio={overallProgress.ratio}
              status={overallProgress.status}
              currency={overallProgress.budget.currency}
              onPress={() => router.push('/expenses/budgets')}
            />
          </View>
        )}

        {/* ── Category donut ── */}
        <SectionHeader title="Where it went" actionLabel="Manage" onAction={() => router.push('/expenses/categories')} />
        {categoryBreakdown.length === 0 ? (
          <EmptyHint message="No expenses logged this month yet." />
        ) : (
          <View
            style={{
              backgroundColor: C.surface,
              marginHorizontal: 16,
              borderRadius: 16,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 16,
              borderWidth: 1,
              borderColor: C.border,
            }}
          >
            <DonutChart
              size={140}
              slices={categoryBreakdown.map<DonutSlice>((b) => ({
                key: b.categoryId ?? 'uncategorized',
                value: b.amountCents,
                color: categoryMap.get(b.categoryId ?? '')?.color ?? '#94A3B8',
              }))}
              centerLabel={
                <View style={{ alignItems: 'center' }}>
                  <Text
                    style={{
                      fontFamily: 'DMSans_400Regular',
                      fontSize: 10,
                      color: C.textMuted,
                      letterSpacing: 1,
                    }}
                  >
                    SPENT
                  </Text>
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    style={{
                      fontFamily: 'DMSans_700Bold',
                      fontSize: 16,
                      color: C.textPrimary,
                      maxWidth: 80,
                    }}
                  >
                    {formatAmount(monthTotals.expenseCents / 100, homeCurrency)}
                  </Text>
                </View>
              }
            />
            <View style={{ flex: 1 }}>
              <DonutLegend
                slices={categoryBreakdown.slice(0, 5).map((b) => {
                  const cat = b.categoryId ? categoryMap.get(b.categoryId) : null;
                  const pct =
                    monthTotals.expenseCents > 0
                      ? Math.round((b.amountCents / monthTotals.expenseCents) * 100)
                      : 0;
                  return {
                    key: b.categoryId ?? 'uncategorized',
                    label: cat ? `${cat.emoji} ${cat.name}` : 'Uncategorized',
                    sub: `${pct}%`,
                    value: b.amountCents,
                    color: cat?.color ?? '#94A3B8',
                  };
                })}
              />
            </View>
          </View>
        )}

        {/* ── Monthly trend ── */}
        <SectionHeader title="Last 6 months" />
        <View
          style={{
            backgroundColor: C.surface,
            marginHorizontal: 16,
            borderRadius: 16,
            padding: 12,
            borderWidth: 1,
            borderColor: C.border,
          }}
        >
          <BarChart
            width={width - 32 - 24}
            height={160}
            color={C.accent}
            data={trend.map<BarDatum>((b) => ({
              key: b.monthAnchor,
              label: shortMonthLabel(b.monthAnchor),
              value: b.expenseCents / 100,
              color: b.monthAnchor === periodAnchor ? C.accent : C.accentLight,
            }))}
            formatValue={(v) => formatAbbrev(v, homeCurrency)}
          />
        </View>

        {/* ── Transactions ── */}
        <SectionHeader title="Transactions" actionLabel="See all" onAction={() => {}} />
        {txnsLoading && monthTxns.length === 0 ? (
          <View style={{ paddingVertical: 24, alignItems: 'center' }}>
            <ActivityIndicator color={C.accent} />
          </View>
        ) : monthTxns.length === 0 ? (
          <EmptyHint message="Tap + to log your first transaction." />
        ) : (
          <View style={{ paddingHorizontal: 16, gap: 8 }}>
            {monthTxns.map((t) => (
              <TransactionRow
                key={t.id}
                txn={t}
                category={t.categoryId ? categoryMap.get(t.categoryId) ?? null : null}
                homeCurrency={homeCurrency}
                rates={rates}
                onPress={() => onEdit(t.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* ── Floating Action Button ──
       *  Sits 16px above the tab bar (tab bar height = 64 + insets.bottom),
       *  so it's clearly visible above the navigation, not tucked behind it.
       *  Pill shape with icon + label so the affordance is unmistakable. */}
      <Pressable
        onPress={onAdd}
        style={({ pressed }) => ({
          position: 'absolute',
          right: 20,
          bottom: 64 + insets.bottom + 16,
          paddingHorizontal: 20,
          height: 56,
          borderRadius: 28,
          backgroundColor: C.accent,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          shadowColor: C.accent,
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.35,
          shadowRadius: 18,
          elevation: 12,
          transform: [{ scale: pressed ? 0.96 : 1 }],
        })}
        accessibilityLabel="Add transaction"
      >
        <Plus size={22} color="#FFFFFF" strokeWidth={2.75} />
        <Text
          allowFontScaling={false}
          style={{
            fontFamily: 'DMSans_700Bold',
            fontSize: 15,
            color: '#FFFFFF',
            letterSpacing: 0.2,
          }}
        >
          Add
        </Text>
      </Pressable>
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────────────
 * Subcomponents
 * ──────────────────────────────────────────────────────────────────── */

function HeaderIconButton({
  children,
  onPress,
}: {
  children: React.ReactNode;
  onPress: () => void;
}) {
  const C = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: C.surface,
        borderWidth: 1,
        borderColor: C.border,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </Pressable>
  );
}

function OverviewCard({
  icon,
  label,
  amount,
  currency,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  amount: number;
  currency: CurrencyCode;
  tone: 'income' | 'expense';
}) {
  const C = useAppTheme();
  const color = tone === 'income' ? '#10B981' : '#EF4444';
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: C.surface,
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: C.border,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        {icon}
        <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: C.textMuted }}>
          {label}
        </Text>
      </View>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{
          fontFamily: 'DMSans_700Bold',
          fontSize: 22,
          color,
          letterSpacing: -0.4,
        }}
      >
        {formatAmount(amount, currency)}
      </Text>
    </View>
  );
}

function BalanceCard({ amount, currency }: { amount: number; currency: CurrencyCode }) {
  const C = useAppTheme();
  const positive = amount >= 0;
  return (
    <View
      style={{
        backgroundColor: positive ? C.accentLight : '#FEE2E2',
        borderRadius: 14,
        padding: 16,
        borderWidth: 1,
        borderColor: positive ? C.accent : '#FCA5A5',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <Wallet size={22} color={positive ? C.accentDark : '#DC2626'} />
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: 'DMSans_500Medium',
            fontSize: 12,
            color: positive ? C.accentDark : '#991B1B',
            letterSpacing: 0.4,
          }}
        >
          REMAINING
        </Text>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          style={{
            fontFamily: 'DMSans_700Bold',
            fontSize: 26,
            color: positive ? C.accentDark : '#991B1B',
            letterSpacing: -0.5,
          }}
        >
          {formatAmount(amount, currency)}
        </Text>
      </View>
    </View>
  );
}

function BudgetProgressCard({
  spent,
  limit,
  ratio,
  status,
  currency,
  onPress,
}: {
  spent: number;
  limit: number;
  ratio: number;
  status: 'ok' | 'warn' | 'exceeded';
  currency: CurrencyCode;
  onPress: () => void;
}) {
  const C = useAppTheme();
  const color = status === 'exceeded' ? '#DC2626' : status === 'warn' ? '#F59E0B' : C.accent;
  const widthPct = Math.min(1, ratio) * 100;
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: C.surface,
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: C.border,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: C.textPrimary }}>
          Monthly budget
        </Text>
        <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color }}>
          {Math.round(ratio * 100)}%
        </Text>
      </View>
      <View
        style={{
          height: 8,
          borderRadius: 4,
          backgroundColor: C.borderLight,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${widthPct}%`,
            height: '100%',
            backgroundColor: color,
            borderRadius: 4,
          }}
        />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: C.textSecondary }}>
          {formatAmount(spent, currency)} of {formatAmount(limit, currency)}
        </Text>
        {status === 'warn' && (
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: '#B45309' }}>
            Getting close
          </Text>
        )}
        {status === 'exceeded' && (
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: '#991B1B' }}>
            Over budget
          </Text>
        )}
      </View>
    </Pressable>
  );
}

function TransactionRow({
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
        <Text
          numberOfLines={1}
          style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: C.textMuted }}
        >
          {txn.note ? `${txn.note} · ${formatDay(txn.occurredOn)}` : formatDay(txn.occurredOn)}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text
          style={{
            fontFamily: 'DMSans_700Bold',
            fontSize: 15,
            color: isIncome ? '#10B981' : '#EF4444',
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

function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const C = useAppTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 22,
        paddingBottom: 8,
      }}
    >
      <Text
        style={{
          fontFamily: 'DMSans_700Bold',
          fontSize: 17,
          color: C.textPrimary,
          letterSpacing: -0.2,
        }}
      >
        {title}
      </Text>
      {actionLabel && onAction && (
        <Pressable onPress={onAction} hitSlop={6}>
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: C.accent }}>
            {actionLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function EmptyHint({ message }: { message: string }) {
  const C = useAppTheme();
  return (
    <View
      style={{
        marginHorizontal: 16,
        backgroundColor: C.surface,
        borderRadius: 14,
        padding: 24,
        borderWidth: 1,
        borderColor: C.border,
        borderStyle: 'dashed',
        alignItems: 'center',
      }}
    >
      <Text
        style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: C.textMuted, textAlign: 'center' }}
      >
        {message}
      </Text>
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────────────
 * Helpers
 * ──────────────────────────────────────────────────────────────────── */

function shiftMonth(anchor: string, delta: number): string {
  // anchor = YYYY-MM-01
  const [yStr, mStr] = anchor.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  const date = new Date(y, m - 1 + delta, 1);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}-01`;
}

function formatMonth(anchor: string): string {
  const [yStr, mStr] = anchor.split('-');
  const date = new Date(Number(yStr), Number(mStr) - 1, 1);
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function shortMonthLabel(anchor: string): string {
  const [yStr, mStr] = anchor.split('-');
  const date = new Date(Number(yStr), Number(mStr) - 1, 1);
  return date.toLocaleDateString(undefined, { month: 'short' });
}

function formatDay(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatAbbrev(amount: number, currency: CurrencyCode): string {
  const symbol = CURRENCIES[currency].symbol;
  if (amount >= 1000) return `${symbol}${(amount / 1000).toFixed(amount >= 10000 ? 0 : 1)}k`;
  return `${symbol}${Math.round(amount)}`;
}

// monthAnchorFor re-exported here for accidental dep introspection in dev.
export { monthAnchorFor };
