import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Check, ChevronLeft, Plus, Trash2 } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CURRENCIES, formatAmount, type CurrencyCode } from '@/lib/currency';
import { getCachedRates, getFxRates } from '@/lib/expenses/fx';
import {
  progressForBudget,
  useExpenseBudgetsStore,
} from '@/lib/stores/expense-budgets';
import { useExpenseCategoriesStore } from '@/lib/stores/expense-categories';
import {
  currentMonthAnchor,
  useExpenseTransactionsStore,
} from '@/lib/stores/expense-transactions';
import { useProfileStore } from '@/lib/stores/profile';
import { useSessionStore } from '@/lib/stores/session';
import { useAppTheme } from '@/lib/stores/theme';
import type { ExpenseCategory } from '@/lib/types';

/**
 * Monthly budget management.
 *
 * Always operates on the current month (we don't expose past-month editing —
 * keeps the UI simple, and historical data is preserved in the rows).
 * Lets the user set:
 *   1. Overall cap (optional)
 *   2. Per-category caps (one per expense category)
 *
 * Each row shows live progress (spent / limit, % ring color, status text).
 */
export default function BudgetsScreen() {
  const C = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userId = useSessionStore((s) => s.userId);
  const profile = useProfileStore((s) => s.profile);
  const homeCurrency: CurrencyCode = profile?.defaultCurrency ?? 'USD';

  const categories = useExpenseCategoriesStore((s) => s.categories);
  const seedDefaultCategories = useExpenseCategoriesStore((s) => s.seedDefaultsIfEmpty);
  const transactions = useExpenseTransactionsStore((s) => s.transactions);
  const budgets = useExpenseBudgetsStore((s) => s.budgets);
  const setBudget = useExpenseBudgetsStore((s) => s.setBudget);
  const removeBudget = useExpenseBudgetsStore((s) => s.remove);

  const [rates, setRates] = useState<Record<string, number>>(() => getCachedRates());

  useEffect(() => {
    getFxRates().then(setRates).catch(() => undefined);
  }, []);

  // Ensure the starter-pack categories exist so the user can set budgets
  // immediately (and add their own via the button below).
  useEffect(() => {
    if (userId) seedDefaultCategories(userId).catch(() => undefined);
  }, [userId, seedDefaultCategories]);

  const period = currentMonthAnchor();

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === 'expense'),
    [categories],
  );

  const overallBudget = useMemo(
    () => budgets.find((b) => b.categoryId === null && b.periodMonth === period),
    [budgets, period],
  );

  const categoryBudgetById = useMemo(() => {
    const map = new Map<string, ReturnType<typeof byCategory>>();
    function byCategory(catId: string) {
      return budgets.find((b) => b.categoryId === catId && b.periodMonth === period);
    }
    for (const c of expenseCategories) {
      const b = byCategory(c.id);
      if (b) map.set(c.id, b);
    }
    return map;
  }, [budgets, period, expenseCategories]);

  const overallProgress = useMemo(
    () => (overallBudget ? progressForBudget(overallBudget, transactions, rates) : null),
    [overallBudget, transactions, rates],
  );

  const onSetBudget = async (categoryId: string | null, amount: number) => {
    if (!userId) return;
    if (amount <= 0) {
      // 0 = remove
      const existing = budgets.find(
        (b) => b.categoryId === categoryId && b.periodMonth === period,
      );
      if (existing) await removeBudget(existing.id);
      return;
    }
    await setBudget({
      userId,
      categoryId,
      periodMonth: period,
      limitCents: Math.round(amount * 100),
      currency: homeCurrency,
    });
  };

  const onRemove = (categoryId: string | null) => {
    const existing = budgets.find(
      (b) => b.categoryId === categoryId && b.periodMonth === period,
    );
    if (!existing) return;
    Alert.alert('Remove this budget?', 'You can always set it again later.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          removeBudget(existing.id).catch(() => undefined);
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.pageBg }}>
      <StatusBar style={C.mode === 'dark' ? 'light' : 'dark'} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Top bar */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: insets.top + 8,
            paddingHorizontal: 20,
            paddingBottom: 12,
          }}
        >
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <ChevronLeft size={26} color={C.textPrimary} strokeWidth={2.25} />
          </Pressable>
          <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 16, color: C.textPrimary }}>
            Budgets
          </Text>
          <View style={{ width: 26, height: 26 }} />
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 32 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Text
            style={{
              fontFamily: 'DMSans_400Regular',
              fontSize: 13,
              color: C.textSecondary,
              marginBottom: 16,
              lineHeight: 18,
              paddingHorizontal: 4,
            }}
          >
            Set spending caps for {formatMonth(period)}. We&apos;ll warn you at 80% and
            change the color when you&apos;re over.
          </Text>

          {/* Overall */}
          <SectionLabel>Overall cap</SectionLabel>
          <BudgetRow
            label="All expenses combined"
            emoji="💸"
            color={C.accent}
            currency={overallBudget?.currency ?? homeCurrency}
            currentLimit={overallBudget ? overallBudget.limitCents / 100 : 0}
            spent={overallProgress ? overallProgress.spentCents / 100 : 0}
            ratio={overallProgress?.ratio ?? 0}
            onSave={(amt) => onSetBudget(null, amt)}
            onRemove={overallBudget ? () => onRemove(null) : undefined}
          />

          {/* Per-category */}
          <SectionLabel>By category</SectionLabel>
          <View style={{ gap: 10 }}>
            {expenseCategories.map((cat) => (
              <CategoryBudgetRow
                key={cat.id}
                cat={cat}
                budget={categoryBudgetById.get(cat.id) ?? null}
                homeCurrency={homeCurrency}
                transactions={transactions}
                rates={rates}
                onSave={(amt) => onSetBudget(cat.id, amt)}
                onRemove={() => onRemove(cat.id)}
              />
            ))}

            {/* Add a custom category (opens the categories manager) */}
            <Pressable
              onPress={() => router.push('/expenses/categories')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                paddingVertical: 14,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: C.border,
                borderStyle: 'dashed',
                backgroundColor: C.surface,
              }}
            >
              <Plus size={16} color={C.accent} strokeWidth={2.5} />
              <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: C.accent }}>
                Add custom category
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────────────
 * Subcomponents
 * ──────────────────────────────────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  const C = useAppTheme();
  return (
    <Text
      style={{
        fontFamily: 'DMSans_500Medium',
        fontSize: 12,
        color: C.textMuted,
        letterSpacing: 0.5,
        marginTop: 18,
        marginBottom: 8,
        paddingHorizontal: 4,
      }}
    >
      {String(children).toUpperCase()}
    </Text>
  );
}

interface BudgetRowProps {
  label: string;
  emoji: string;
  color: string;
  currency: CurrencyCode;
  currentLimit: number;
  spent: number;
  ratio: number;
  onSave: (amount: number) => void;
  onRemove?: () => void;
}

function BudgetRow(props: BudgetRowProps) {
  const C = useAppTheme();
  const [text, setText] = useState<string>(
    props.currentLimit > 0 ? props.currentLimit.toString() : '',
  );

  const [justSaved, setJustSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
    },
    [],
  );

  // Silent save (used by onBlur) — returns whether a valid value was committed.
  const commit = (): boolean => {
    const v = Number(text.replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(v)) return false;
    props.onSave(v);
    return true;
  };

  // Explicit Save-button press: commit, then flash a "Saved" confirmation.
  const handleSavePress = () => {
    if (!commit()) return;
    setJustSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setJustSaved(false), 1600);
  };

  const status =
    props.currentLimit === 0
      ? 'unset'
      : props.ratio >= 1
        ? 'exceeded'
        : props.ratio >= 0.8
          ? 'warn'
          : 'ok';
  const statusColor =
    status === 'exceeded' ? '#DC2626' : status === 'warn' ? '#F59E0B' : props.color;

  return (
    <View
      style={{
        backgroundColor: C.surface,
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: C.border,
        gap: 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: `${props.color}22`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 20 }}>{props.emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={1}
            style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 15, color: C.textPrimary }}
          >
            {props.label}
          </Text>
          {props.currentLimit > 0 && (
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: C.textMuted }}>
              {formatAmount(props.spent, props.currency)} of{' '}
              {formatAmount(props.currentLimit, props.currency)}
            </Text>
          )}
        </View>
        {props.onRemove && (
          <Pressable onPress={props.onRemove} hitSlop={6}>
            <Trash2 size={16} color="#94A3B8" />
          </Pressable>
        )}
      </View>

      {/* Limit input */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: C.pageBg,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: C.border,
            paddingHorizontal: 12,
            paddingVertical: 8,
            gap: 6,
          }}
        >
          <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: C.textMuted }}>
            {CURRENCIES[props.currency].symbol}
          </Text>
          <TextInput
            value={text}
            onChangeText={(v) => setText(v.replace(/[^0-9.]/g, ''))}
            onBlur={commit}
            placeholder="0"
            placeholderTextColor={C.textMuted}
            keyboardType="decimal-pad"
            style={{
              flex: 1,
              fontFamily: 'DMSans_600SemiBold',
              fontSize: 15,
              color: C.textPrimary,
              padding: 0,
            }}
          />
        </View>
        <Pressable
          onPress={handleSavePress}
          disabled={justSaved}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            minWidth: 78,
            backgroundColor: justSaved ? '#16A34A' : C.accent,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 10,
          }}
        >
          {justSaved && <Check size={14} color="#FFFFFF" strokeWidth={2.5} />}
          <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 13, color: '#FFFFFF' }}>
            {justSaved ? 'Saved' : 'Save'}
          </Text>
        </Pressable>
      </View>

      {/* Progress bar */}
      {props.currentLimit > 0 && (
        <View>
          <View
            style={{
              height: 6,
              borderRadius: 3,
              backgroundColor: C.borderLight,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                width: `${Math.min(1, props.ratio) * 100}%`,
                height: '100%',
                backgroundColor: statusColor,
              }}
            />
          </View>
          {status === 'warn' && (
            <Text
              style={{
                marginTop: 4,
                fontFamily: 'DMSans_500Medium',
                fontSize: 11,
                color: '#B45309',
              }}
            >
              {Math.round(props.ratio * 100)}% — getting close
            </Text>
          )}
          {status === 'exceeded' && (
            <Text
              style={{
                marginTop: 4,
                fontFamily: 'DMSans_500Medium',
                fontSize: 11,
                color: '#991B1B',
              }}
            >
              {Math.round(props.ratio * 100)}% — over budget
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

function CategoryBudgetRow({
  cat,
  budget,
  homeCurrency,
  transactions,
  rates,
  onSave,
  onRemove,
}: {
  cat: ExpenseCategory;
  budget: import('@/lib/types').ExpenseBudget | null;
  homeCurrency: CurrencyCode;
  transactions: readonly import('@/lib/types').ExpenseTransaction[];
  rates: Record<string, number>;
  onSave: (amount: number) => void;
  onRemove: () => void;
}) {
  const progress = budget ? progressForBudget(budget, transactions, rates) : null;
  return (
    <BudgetRow
      label={cat.name}
      emoji={cat.emoji}
      color={cat.color}
      currency={budget?.currency ?? homeCurrency}
      currentLimit={budget ? budget.limitCents / 100 : 0}
      spent={progress ? progress.spentCents / 100 : 0}
      ratio={progress?.ratio ?? 0}
      onSave={onSave}
      onRemove={budget ? onRemove : undefined}
    />
  );
}

function formatMonth(anchor: string): string {
  const [yStr, mStr] = anchor.split('-');
  return new Date(Number(yStr), Number(mStr) - 1, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}
