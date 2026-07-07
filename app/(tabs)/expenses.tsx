import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FolderTree,
  Plus,
  Target,
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

import { AnimatedNumber } from '@/components/AnimatedNumber';
import { AvatarVisual } from '@/components/AvatarVisual';
import { BarChart, type BarDatum } from '@/components/charts/BarChart';
import { InsightsCard } from '@/components/expenses/InsightsCard';
import { MonthlyIncomeCard } from '@/components/expenses/MonthlyIncomeCard';
import { SurplusRouterCard } from '@/components/expenses/SurplusRouterCard';
import { TransactionRow, dayLabel } from '@/components/expenses/TransactionRow';
import { SpringPressable } from '@/components/SpringPressable';
import { useAvatarStore } from '@/lib/stores/avatar';
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
  const avatarId = useAvatarStore((s) => s.id);
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
  const [showAllCategories, setShowAllCategories] = useState(false);

  // Initial load: hydrate stores + warm FX cache. seedDefaults is idempotent.
  useEffect(() => {
    if (!userId) return;
    (async () => {
      await Promise.all([loadCategories(userId), loadTransactions(userId), loadBudgets(userId)]);
      await seedDefaults(userId);
      // Roll last month's budgets into a fresh month (standing intents).
      await useExpenseBudgetsStore.getState().ensureCurrentMonth(userId);
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

  // Months that existed for this account: from the signup month to now,
  // capped at 6. A month before the account existed is dead weight — no
  // bar, no tap target, no month-pill navigation.
  const accountStartAnchor = useMemo(
    () => (profile?.createdAt ? monthAnchorFor(profile.createdAt.slice(0, 10)) : null),
    [profile?.createdAt],
  );
  const monthsAvailable = useMemo(() => {
    if (!accountStartAnchor) return 6;
    const [sy, sm] = accountStartAnchor.split('-').map(Number);
    const [cy, cm] = currentMonthAnchor().split('-').map(Number);
    return Math.min(6, Math.max(1, (cy - sy) * 12 + (cm - sm) + 1));
  }, [accountStartAnchor]);

  const trend = useMemo(
    () => monthlyTrend(transactions, homeCurrency, rates, 6).slice(-monthsAvailable),
    [transactions, homeCurrency, rates, monthsAvailable],
  );

  // One-sentence conclusion for the trend chart: how the viewed month sits
  // against the 6-month average. Spending below average reads green.
  const trendSummary = useMemo(() => {
    const cur = trend.find((b) => b.monthAnchor === periodAnchor);
    const nonZero = trend.filter((b) => b.expenseCents > 0);
    if (!cur || cur.expenseCents === 0 || nonZero.length < 2) return null;
    const avg = nonZero.reduce((s, b) => s + b.expenseCents, 0) / nonZero.length;
    const diff = (cur.expenseCents - avg) / avg;
    const pct = Math.round(Math.abs(diff) * 100);
    const month = monthNameOf(periodAnchor);
    const span = `${monthsAvailable}-month`;
    if (pct < 3) {
      return { prefix: `${month} is `, highlight: 'right on', suffix: ` your ${span} average`, tone: 'neutral' as const };
    }
    return {
      prefix: `${month} is `,
      highlight: `${pct}% ${diff > 0 ? 'above' : 'below'}`,
      suffix: ` your ${span} average`,
      tone: diff > 0 ? ('bad' as const) : ('good' as const),
    };
  }, [trend, periodAnchor, monthsAvailable]);

  const { monthTxns, monthTxnCount } = useMemo(() => {
    const prefix = periodAnchor.slice(0, 7);
    const all = transactions.filter((t) => t.occurredOn.startsWith(prefix));
    // Render cap keeps the list light; the count keeps the truncation honest.
    return { monthTxns: all.slice(0, 30), monthTxnCount: all.length };
  }, [transactions, periodAnchor]);

  // Transactions grouped by day (newest first), each with the day's net in
  // home currency for the group header.
  const groupedTxns = useMemo(() => {
    const toHomeCents = (t: ExpenseTransaction) =>
      Math.round((t.amountCents * (rates[homeCurrency] ?? 1)) / (rates[t.currency] ?? 1));
    const sorted = [...monthTxns].sort((a, b) => b.occurredOn.localeCompare(a.occurredOn));
    const groups: { date: string; txns: ExpenseTransaction[]; netCents: number }[] = [];
    for (const t of sorted) {
      let g = groups[groups.length - 1];
      if (!g || g.date !== t.occurredOn) {
        g = { date: t.occurredOn, txns: [], netCents: 0 };
        groups.push(g);
      }
      g.txns.push(t);
      g.netCents += t.type === 'income' ? toHomeCents(t) : -toHomeCents(t);
    }
    return groups;
  }, [monthTxns, rates, homeCurrency]);


  const overallBudget = useMemo(
    () => budgets.find((b) => b.categoryId === null && b.periodMonth === periodAnchor),
    [budgets, periodAnchor],
  );
  const overallProgress = useMemo(
    () => (overallBudget ? progressForBudget(overallBudget, transactions, rates) : null),
    [overallBudget, transactions, rates],
  );

  // ── handlers ──
  const goPrevMonth = () => {
    const prev = shiftMonth(periodAnchor, -1);
    // Months before the account existed hold nothing — don't navigate there.
    if (accountStartAnchor && prev < accountStartAnchor) return;
    setPeriodAnchor(prev);
  };
  const goNextMonth = () => {
    const next = shiftMonth(periodAnchor, +1);
    if (next > currentMonthAnchor()) return; // don't allow future months
    setPeriodAnchor(next);
  };
  const atFirstMonth = accountStartAnchor !== null && periodAnchor <= accountStartAnchor;
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
      <StatusBar style="light" />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══════════════════════════════════════════════════════════ */}
        {/* HERO — same container/size as the Stash tab                 */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <View style={{ paddingBottom: 52, backgroundColor: C.heroTop }}>
          {/* Background gradient (absolute-fill wrapper, like Stash). */}
          <View
            pointerEvents="none"
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}
          >
            <LinearGradient
              colors={[C.heroTop, C.heroMid, C.heroBot]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={{ width: '100%', height: '100%' }}
            />
          </View>

          {/* Top bar: avatar (left) + actions (right) — matches Stash/Home. */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingTop: insets.top + 12,
            }}
          >
            <SpringPressable
              onPress={() => router.push('/(tabs)/profile')}
              haptic
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.18)',
                overflow: 'hidden',
                backgroundColor: 'rgba(255,255,255,0.06)',
              }}
            >
              <AvatarVisual avatar={avatarId} size={36} />
            </SpringPressable>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <HeroIconButton label="Manage categories" onPress={() => router.push('/expenses/categories')}>
                <FolderTree size={18} color="#FFFFFF" />
              </HeroIconButton>
              <HeroIconButton label="Budgets" onPress={() => router.push('/expenses/budgets')}>
                <Target size={18} color="#FFFFFF" />
              </HeroIconButton>
              <HeroIconButton label="Export CSV" onPress={onExport}>
                <Download size={18} color="#FFFFFF" />
              </HeroIconButton>
            </View>
          </View>

          {/* Eyebrow + big number — this month's spend, same treatment as the
           *  Stash "total saved" hero. */}
          <View style={{ paddingTop: 28, paddingHorizontal: 20, alignItems: 'center' }}>
            <Text
              allowFontScaling={false}
              maxFontSizeMultiplier={1}
              numberOfLines={1}
              style={{
                fontFamily: 'DMSans_500Medium',
                fontSize: 9,
                color: 'rgba(255,255,255,0.55)',
                letterSpacing: 0.8,
                marginBottom: 3,
                textAlign: 'center',
              }}
            >
              {/* "LEFT", not "SAVED" — "saved" is the stash concept (cash in
               *  boxes); this is simply income minus spending. */}
              {monthTotals.balanceCents >= 0 ? 'LEFT' : 'OVERSPENT'}
            </Text>
            <AnimatedNumber
              value={Math.abs(monthTotals.balanceCents) / 100}
              formatter={(n) => formatAmount(n, homeCurrency)}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.55}
              style={{
                fontFamily: 'DMSans_700Bold',
                fontSize: 40,
                // Overspent (negative) reads red; otherwise the calm white
                // headline like the Stash total.
                color: monthTotals.balanceCents >= 0 ? '#FFFFFF' : '#FCA5A5',
                letterSpacing: -1.2,
                lineHeight: 48,
                textAlign: 'center',
              }}
            />

            {/* Income · Spent stats — the two flows behind the "saved"
             *  headline. */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14 }}>
              <HeroStat
                label="INCOME"
                value={formatAmount(monthTotals.incomeCents / 100, homeCurrency)}
                color="#86EFAC"
              />
              <View style={{ width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.18)' }} />
              <HeroStat
                label="SPENT"
                value={formatAmount(monthTotals.expenseCents / 100, homeCurrency)}
                color="#FCA5A5"
              />
            </View>
          </View>

          {/* Floating month switcher — same pill as the Stash currency pill,
           *  half on the hero / half on the content below. */}
          <View
            pointerEvents="box-none"
            style={{ position: 'absolute', left: 0, right: 0, bottom: -14, alignItems: 'center' }}
          >
            <View
              style={{
                borderRadius: 999,
                shadowColor: '#000',
                shadowOpacity: 0.14,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 4 },
                elevation: 6,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderRadius: 999,
                  overflow: 'hidden',
                  paddingHorizontal: 6,
                  gap: 4,
                  backgroundColor: '#FFFFFF',
                }}
              >
                <SpringPressable
                  onPress={goPrevMonth}
                  disabled={atFirstMonth}
                  haptic
                  style={{ opacity: atFirstMonth ? 0.3 : 1, paddingVertical: 7, paddingHorizontal: 9 }}
                >
                  <ChevronLeft size={16} color="#06291F" />
                </SpringPressable>
                <Text
                  style={{
                    fontFamily: 'DMSans_700Bold',
                    fontSize: 11,
                    color: '#06291F',
                    letterSpacing: 0.6,
                    minWidth: 84,
                    textAlign: 'center',
                  }}
                >
                  {formatMonth(periodAnchor)}
                </Text>
                <SpringPressable
                  onPress={goNextMonth}
                  disabled={periodAnchor >= currentMonthAnchor()}
                  haptic
                  style={{
                    opacity: periodAnchor >= currentMonthAnchor() ? 0.3 : 1,
                    paddingVertical: 7,
                    paddingHorizontal: 9,
                  }}
                >
                  <ChevronRight size={16} color="#06291F" />
                </SpringPressable>
              </View>
            </View>
          </View>
        </View>

        {/* ── Where it went — the tab's core question, so it leads. The
         *  wrapper margin brings the hero → first-content gap to 38px
         *  (14 + the header's 24), matching Home and Stash. ── */}
        <View style={{ marginTop: 14 }}>
          <SectionHeader
            title="Where it went"
            actionLabel="Manage"
            onAction={() => router.push('/expenses/categories')}
          />
        </View>
        {categoryBreakdown.length === 0 ? (
          <EmptyHint
            message="Nothing logged this month yet. Tap to add your first expense."
            onPress={onAdd}
          />
        ) : (
          <View
            style={{
              backgroundColor: C.surface,
              marginHorizontal: 16,
              borderRadius: 16,
              padding: 16,
              gap: 16,
              borderWidth: 1,
              borderColor: C.border,
            }}
          >
            {/* Composition bar — every category's share in one glance. Same
             *  segmented-bar idiom as the Home Safe-to-Spend card; easier to
             *  compare than donut angles. */}
            <View
              style={{
                height: 12,
                borderRadius: 6,
                overflow: 'hidden',
                flexDirection: 'row',
                gap: 2,
                backgroundColor: C.borderLight,
              }}
            >
              {categoryBreakdown.map((b) => (
                <View
                  key={b.categoryId ?? 'uncategorized'}
                  style={{
                    width: `${Math.max(1, (b.amountCents / Math.max(1, monthTotals.expenseCents)) * 100)}%`,
                    backgroundColor: categoryMap.get(b.categoryId ?? '')?.color ?? '#94A3B8',
                  }}
                />
              ))}
            </View>

            {/* Ranked category rows — icon tile, name, amount, share bar.
             *  Tappable: drills into that category's transactions. */}
            <View style={{ gap: 14 }}>
              {(showAllCategories ? categoryBreakdown : categoryBreakdown.slice(0, 5)).map((b) => {
                const cat = b.categoryId ? categoryMap.get(b.categoryId) : null;
                const color = cat?.color ?? '#94A3B8';
                const pct =
                  monthTotals.expenseCents > 0
                    ? Math.round((b.amountCents / monthTotals.expenseCents) * 100)
                    : 0;
                return (
                  <Pressable
                    key={b.categoryId ?? 'uncategorized'}
                    disabled={!b.categoryId}
                    onPress={() =>
                      router.push({
                        pathname: '/expenses/transactions',
                        params: {
                          month: periodAnchor,
                          categoryId: b.categoryId ?? '',
                          categoryName: cat?.name ?? 'Category',
                        },
                      })
                    }
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 11,
                        backgroundColor: `${color}1F`,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 17 }}>{cat?.emoji ?? '💵'}</Text>
                    </View>
                    <View style={{ flex: 1, gap: 6 }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                        }}
                      >
                        <Text
                          numberOfLines={1}
                          style={{
                            flexShrink: 1,
                            fontFamily: 'DMSans_600SemiBold',
                            fontSize: 14,
                            color: C.textPrimary,
                          }}
                        >
                          {cat?.name ?? 'Uncategorized'}
                        </Text>
                        <Text
                          style={{
                            fontFamily: 'DMSans_700Bold',
                            fontSize: 14,
                            color: C.textPrimary,
                            letterSpacing: -0.2,
                          }}
                        >
                          {formatAmount(b.amountCents / 100, homeCurrency)}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View
                          style={{
                            flex: 1,
                            height: 5,
                            borderRadius: 3,
                            backgroundColor: C.borderLight,
                            overflow: 'hidden',
                          }}
                        >
                          <View
                            style={{
                              width: `${Math.max(1, pct)}%`,
                              height: '100%',
                              borderRadius: 3,
                              backgroundColor: color,
                            }}
                          />
                        </View>
                        <Text
                          style={{
                            fontFamily: 'DMSans_500Medium',
                            fontSize: 11,
                            color: C.textMuted,
                            minWidth: 32,
                            textAlign: 'right',
                          }}
                        >
                          {pct}%
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* Expander — nothing is silently hidden. */}
            {categoryBreakdown.length > 5 && (
              <Pressable
                onPress={() => setShowAllCategories((v) => !v)}
                hitSlop={6}
                style={{ alignItems: 'center', paddingTop: 2 }}
              >
                <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 13, color: C.accent }}>
                  {showAllCategories
                    ? 'Show less'
                    : `Show all ${categoryBreakdown.length} categories`}
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {/* ── Budget: progress when set, else a "create a monthly budget" CTA
         *  (the same dashed card used on the Home tab). ── */}
        <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
          {overallProgress ? (
            <BudgetProgressCard
              spent={overallProgress.spentCents / 100}
              limit={overallProgress.budget.limitCents / 100}
              ratio={overallProgress.ratio}
              status={overallProgress.status}
              currency={overallProgress.budget.currency}
              onPress={() => router.push('/expenses/budgets')}
            />
          ) : (
            <SpringPressable
              onPress={() => router.push('/expenses/budgets')}
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
              <Text
                style={{ flex: 1, fontFamily: 'DMSans_500Medium', fontSize: 13, color: C.textSecondary }}
              >
                Set a monthly budget to see what&apos;s safe to spend
              </Text>
              <ChevronRight size={16} color={C.textSecondary} />
            </SpringPressable>
          )}
        </View>

        {/* ── Monthly income nudge — new month, stored income profile, no
         *  income logged yet → one-tap log. Current month only. */}
        {periodAnchor === currentMonthAnchor() && (
          <MonthlyIncomeCard style={{ marginHorizontal: 16, marginTop: 12 }} />
        )}

        {/* ── Spending insights (Stashbox+) ──
         *  Spacing lives on the card itself: when it renders null there is no
         *  phantom margin pushing the next section around. */}
        <InsightsCard style={{ marginHorizontal: 16, marginTop: 12 }} />

        {/* ── Surplus router: send this month's leftover toward a savings goal.
         *  Only for the current month (a past month's "surplus" isn't actionable). */}
        {periodAnchor === currentMonthAnchor() && (
          <SurplusRouterCard
            surplusCents={monthTotals.balanceCents}
            currency={homeCurrency}
            style={{ marginHorizontal: 16, marginTop: 12 }}
          />
        )}

        {/* ── Monthly trend — only months the account has actually lived
         *  through. A brand-new user gets no row of dead pre-signup bars,
         *  and one month is not a trend, so the section waits for month 2. */}
        {monthsAvailable >= 2 && (
          <>
        <SectionHeader
          title={monthsAvailable < 6 ? `Last ${monthsAvailable} months` : 'Last 6 months'}
          meta="Tap a month to view it"
        />
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
            onBarPress={(key) => setPeriodAnchor(key)}
            selectedKey={periodAnchor}
            showAverage
          />
          {/* Takeaway — the chart's conclusion in one sentence. */}
          {trendSummary && (
            <Text
              style={{
                fontFamily: 'DMSans_500Medium',
                fontSize: 12,
                color: C.textSecondary,
                textAlign: 'center',
                paddingTop: 10,
                paddingHorizontal: 8,
              }}
            >
              {trendSummary.prefix}
              <Text
                style={{
                  fontFamily: 'DMSans_700Bold',
                  color: trendSummary.tone === 'good' ? '#16A34A' : trendSummary.tone === 'bad' ? '#DC2626' : C.textPrimary,
                }}
              >
                {trendSummary.highlight}
              </Text>
              {trendSummary.suffix}
            </Text>
          )}
        </View>
          </>
        )}

        {/* ── Transactions ── */}
        <SectionHeader
          title="Transactions"
          actionLabel={monthTxnCount > 0 ? `See all ${monthTxnCount}` : undefined}
          onAction={
            monthTxnCount > 0
              ? () =>
                  router.push({ pathname: '/expenses/transactions', params: { month: periodAnchor } })
              : undefined
          }
        />
        {txnsLoading && monthTxns.length === 0 ? (
          <View style={{ paddingVertical: 24, alignItems: 'center' }}>
            <ActivityIndicator color={C.accent} />
          </View>
        ) : monthTxns.length === 0 ? (
          <EmptyHint message="Nothing here yet. Tap to log a transaction." onPress={onAdd} />
        ) : (
          <View style={{ paddingHorizontal: 16, gap: 8 }}>
            {groupedTxns.map((g) => (
              <View key={g.date} style={{ gap: 8 }}>
                {/* Day header: label left, day net right. */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 4,
                    paddingTop: 8,
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
                    <Text
                      style={{
                        fontFamily: 'DMSans_500Medium',
                        fontSize: 12,
                        color: C.textMuted,
                      }}
                    >
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
                    onPress={() => onEdit(t.id)}
                  />
                ))}
              </View>
            ))}
            {monthTxnCount > monthTxns.length && (
              <Pressable
                onPress={() =>
                  router.push({ pathname: '/expenses/transactions', params: { month: periodAnchor } })
                }
                hitSlop={6}
                style={{ alignItems: 'center', paddingVertical: 10 }}
              >
                <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 13, color: C.accent }}>
                  View all {monthTxnCount} transactions
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>

      {/* Floating add button — centered, just above the tab bar. Matches the
       *  Stash tab's "+ StashBox" gradient pill exactly. */}
      <View
        pointerEvents="box-none"
        style={{ position: 'absolute', left: 0, right: 0, bottom: 16, alignItems: 'center' }}
      >
        <SpringPressable
          onPress={onAdd}
          haptic
          style={{
            borderRadius: 26,
            shadowColor: '#000',
            shadowOpacity: 0.2,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: 8,
          }}
        >
          <LinearGradient
            colors={[C.heroTop, C.heroMid, C.heroBot]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              borderRadius: 26,
              overflow: 'hidden',
              paddingHorizontal: 18,
              paddingVertical: 13,
            }}
          >
            <Plus size={18} color="#FFFFFF" />
            <Text
              allowFontScaling={false}
              maxFontSizeMultiplier={1}
              style={{
                fontFamily: 'DMSans_600SemiBold',
                fontSize: 14,
                color: '#FFFFFF',
                includeFontPadding: false,
              }}
            >
              Add
            </Text>
          </LinearGradient>
        </SpringPressable>
      </View>
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────────────
 * Subcomponents
 * ──────────────────────────────────────────────────────────────────── */

// White icon button for the dark hero top bar — matches Stash's history /
// settings buttons.
function HeroIconButton({
  children,
  onPress,
  label,
}: {
  children: React.ReactNode;
  onPress: () => void;
  label?: string;
}) {
  return (
    <SpringPressable
      onPress={onPress}
      haptic
      accessibilityLabel={label}
      style={{
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.08)',
      }}
    >
      {children}
    </SpringPressable>
  );
}

// One stat under the hero's big number (Income / Remaining).
function HeroStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={{ alignItems: 'center', paddingHorizontal: 20 }}>
      <Text
        allowFontScaling={false}
        style={{
          fontFamily: 'DMSans_500Medium',
          fontSize: 9,
          color: 'rgba(255,255,255,0.55)',
          letterSpacing: 0.8,
          marginBottom: 3,
        }}
      >
        {label}
      </Text>
      <Text
        allowFontScaling={false}
        numberOfLines={1}
        style={{ fontFamily: 'DMSans_700Bold', fontSize: 16, color, letterSpacing: -0.3 }}
      >
        {value}
      </Text>
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

function SectionHeader({
  title,
  actionLabel,
  onAction,
  meta,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Muted right-aligned info text (count, hint) when there is no action. */
  meta?: string;
}) {
  const C = useAppTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 10,
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
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={6}>
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: C.accent }}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : meta ? (
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: C.textMuted }}>
          {meta}
        </Text>
      ) : null}
    </View>
  );
}

function EmptyHint({ message, onPress }: { message: string; onPress?: () => void }) {
  const C = useAppTheme();
  const content = (
    <Text
      style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: C.textMuted, textAlign: 'center' }}
    >
      {message}
    </Text>
  );
  const boxStyle = {
    marginHorizontal: 16,
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 24,
    borderWidth: 1,
    borderColor: C.border,
    borderStyle: 'dashed' as const,
    alignItems: 'center' as const,
  };
  // Empty states that lead somewhere are tappable, not dead ends.
  if (onPress) {
    return (
      <SpringPressable onPress={onPress} haptic style={boxStyle}>
        {content}
      </SpringPressable>
    );
  }
  return <View style={boxStyle}>{content}</View>;
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

function monthNameOf(anchor: string): string {
  const [yStr, mStr] = anchor.split('-');
  const date = new Date(Number(yStr), Number(mStr) - 1, 1);
  return date.toLocaleDateString(undefined, { month: 'long' });
}
function formatAbbrev(amount: number, currency: CurrencyCode): string {
  const symbol = CURRENCIES[currency].symbol;
  if (amount >= 1000) return `${symbol}${(amount / 1000).toFixed(amount >= 10000 ? 0 : 1)}k`;
  return `${symbol}${Math.round(amount)}`;
}

// monthAnchorFor re-exported here for accidental dep introspection in dev.
export { monthAnchorFor };
