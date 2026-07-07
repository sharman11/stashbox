import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Trash2,
  X,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CurrencyPicker } from '@/components/CurrencyPicker';
import { SpringPressable } from '@/components/SpringPressable';
import { CURRENCIES, formatAmount, groupDigits, type CurrencyCode } from '@/lib/currency';
import { useExpenseCategoriesStore } from '@/lib/stores/expense-categories';
import {
  todayDate,
  useExpenseTransactionsStore,
} from '@/lib/stores/expense-transactions';
import { useProfileStore } from '@/lib/stores/profile';
import { useSessionStore } from '@/lib/stores/session';
import { useAppTheme } from '@/lib/stores/theme';
import type { ExpenseCategory, TransactionType } from '@/lib/types';

/**
 * Add / edit transaction modal.
 *
 * Quick-log UX target: a returning user can enter an expense in 4 taps:
 *   1. Open (tap +)            → modal opens, amount field focused
 *   2. Type amount             → digits-only soft keyboard
 *   3. Tap category chip       → category set
 *   4. Tap Save                → close
 * Currency, date, and note default to sensible values that rarely need touching.
 */

export default function EditTransactionScreen() {
  const C = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const userId = useSessionStore((s) => s.userId);
  const profile = useProfileStore((s) => s.profile);
  const homeCurrency: CurrencyCode = profile?.defaultCurrency ?? 'USD';

  const params = useLocalSearchParams<{ id?: string }>();
  const editingId = typeof params.id === 'string' ? params.id : null;

  const categories = useExpenseCategoriesStore((s) => s.categories);
  const transactions = useExpenseTransactionsStore((s) => s.transactions);
  const createTxn = useExpenseTransactionsStore((s) => s.create);
  const updateTxn = useExpenseTransactionsStore((s) => s.update);
  const removeTxn = useExpenseTransactionsStore((s) => s.remove);

  const existing = useMemo(
    () => (editingId ? transactions.find((t) => t.id === editingId) ?? null : null),
    [editingId, transactions],
  );

  // Form state
  const [type, setType] = useState<TransactionType>(existing?.type ?? 'expense');
  const [amountText, setAmountText] = useState<string>(
    existing ? (existing.amountCents / 100).toString() : '',
  );
  const [currency, setCurrency] = useState<CurrencyCode>(existing?.currency ?? homeCurrency);
  const [categoryId, setCategoryId] = useState<string | null>(existing?.categoryId ?? null);
  const [occurredOn, setOccurredOn] = useState<string>(existing?.occurredOn ?? todayDate());
  const [note, setNote] = useState<string>(existing?.note ?? '');
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-pick the first matching-type category if user hasn't chosen one
  // (only on add; edit respects whatever is stored). This matters because the
  // type toggle should "just work" for the empty-form case.
  useEffect(() => {
    if (editingId) return;
    if (categoryId) {
      const cat = categories.find((c) => c.id === categoryId);
      if (cat && cat.type !== type) setCategoryId(null);
    }
  }, [editingId, type, categoryId, categories]);

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.type === type),
    [categories, type],
  );

  // Currencies pinned to the top of the picker sheet: home currency plus the
  // user's preferred set (and, when editing, the stored currency).
  const pinnedCurrencies = useMemo<CurrencyCode[]>(() => {
    const set = new Set<CurrencyCode>([homeCurrency, ...(profile?.preferredCurrencies ?? [])]);
    if (existing) set.add(existing.currency);
    return Array.from(set);
  }, [homeCurrency, profile?.preferredCurrencies, existing]);

  const lightTap = () => {
    if (Platform.OS === 'web') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
      /* haptics unavailable */
    });
  };

  const switchType = (t: TransactionType) => {
    if (t !== type) lightTap();
    setType(t);
  };

  const amount = Number(amountText.replace(/[^0-9.]/g, ''));
  const isValid = amount > 0 && Number.isFinite(amount);

  // ── handlers ──
  const onSave = async () => {
    if (!isValid || !userId || saving) return;
    setSaving(true);
    setError(null);
    try {
      const amountCents = Math.round(amount * 100);
      if (editingId) {
        await updateTxn(editingId, {
          type,
          amountCents,
          currency,
          categoryId,
          occurredOn,
          note: note.trim() || null,
        });
      } else {
        await createTxn({
          userId,
          type,
          amountCents,
          currency,
          categoryId,
          occurredOn,
          note: note.trim() || null,
        });
      }
      router.back();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not save transaction');
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!editingId) return;
    setSaving(true);
    setError(null);
    try {
      await removeTxn(editingId);
      router.back();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not delete');
      setSaving(false);
    }
  };

  const goPrevDay = () => setOccurredOn(shiftDay(occurredOn, -1));
  const goNextDay = () => {
    const next = shiftDay(occurredOn, +1);
    if (next > todayDate()) return;
    setOccurredOn(next);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.pageBg }}>
      <StatusBar style={C.mode === 'dark' ? 'light' : 'dark'} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
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
            paddingBottom: 8,
          }}
        >
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <X size={24} color={C.textPrimary} strokeWidth={2.25} />
          </Pressable>
          <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 16, color: C.textPrimary }}>
            {editingId ? 'Edit transaction' : 'New transaction'}
          </Text>
          {editingId ? (
            <Pressable onPress={onDelete} hitSlop={10} disabled={saving}>
              <Trash2 size={22} color="#DC2626" strokeWidth={2.25} />
            </Pressable>
          ) : (
            <View style={{ width: 24, height: 24 }} />
          )}
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {/* Type toggle */}
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: C.borderLight,
              borderRadius: 12,
              padding: 4,
              marginBottom: 18,
            }}
          >
            <TypeButton
              label="Expense"
              icon={TrendingDown}
              active={type === 'expense'}
              activeColor="#EF4444"
              onPress={() => switchType('expense')}
            />
            <TypeButton
              label="Income"
              icon={TrendingUp}
              active={type === 'income'}
              activeColor="#10B981"
              onPress={() => switchType('income')}
            />
          </View>

          {/* Amount — the hero of the screen. Big, centered, tinted by type
           *  (red out / green in) so the direction of money is unmissable
           *  while typing. Currency pill sits just beneath. */}
          <View style={{ alignItems: 'center', paddingVertical: 10 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Text
                style={{
                  fontFamily: 'DMSans_700Bold',
                  fontSize: 30,
                  color: C.textMuted,
                  letterSpacing: -0.5,
                }}
              >
                {CURRENCIES[currency].symbol}
              </Text>
              <TextInput
                value={groupDigits(amountText)}
                onChangeText={(v) => setAmountText(v.replace(/[^0-9.]/g, ''))}
                placeholder="0"
                placeholderTextColor={C.textFaint}
                keyboardType="decimal-pad"
                autoFocus={!editingId}
                style={{
                  fontFamily: 'DMSans_700Bold',
                  fontSize: 48,
                  color: type === 'expense' ? '#EF4444' : '#10B981',
                  letterSpacing: -1.5,
                  padding: 0,
                  minWidth: 40,
                  textAlign: 'center',
                }}
              />
            </View>

            <SpringPressable
              onPress={() => setShowCurrencyPicker(true)}
              haptic
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                marginTop: 6,
                paddingVertical: 6,
                paddingHorizontal: 12,
                backgroundColor: C.borderLight,
                borderRadius: 999,
              }}
            >
              <Text allowFontScaling={false} style={{ fontSize: 13 }}>
                {CURRENCIES[currency].flag}
              </Text>
              <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 13, color: C.textPrimary }}>
                {currency}
              </Text>
              <ChevronDown size={13} color={C.textMuted} />
            </SpringPressable>
          </View>

          {/* Category chips */}
          <SectionLabel>Category</SectionLabel>
          {filteredCategories.length === 0 ? (
            <Text
              style={{
                fontFamily: 'DMSans_400Regular',
                fontSize: 13,
                color: C.textMuted,
                paddingHorizontal: 4,
              }}
            >
              No {type} categories yet. Add some from the Categories screen.
            </Text>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {filteredCategories.map((c) => (
                <CategoryChip
                  key={c.id}
                  cat={c}
                  selected={categoryId === c.id}
                  onPress={() => {
                    lightTap();
                    setCategoryId(c.id);
                  }}
                />
              ))}
            </View>
          )}

          {/* Date stepper */}
          <SectionLabel>Date</SectionLabel>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: C.surface,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: C.border,
              padding: 4,
            }}
          >
            <DateStepperButton icon={ChevronLeft} onPress={goPrevDay} />
            <View style={{ flex: 1, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
              <Calendar size={16} color={C.textSecondary} />
              <Text
                style={{
                  fontFamily: 'DMSans_600SemiBold',
                  fontSize: 14,
                  color: C.textPrimary,
                }}
              >
                {formatDate(occurredOn)}
              </Text>
            </View>
            <DateStepperButton icon={ChevronRight} onPress={goNextDay} disabled={occurredOn >= todayDate()} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <QuickDateButton label="Today" onPress={() => setOccurredOn(todayDate())} active={occurredOn === todayDate()} />
            <QuickDateButton
              label="Yesterday"
              onPress={() => setOccurredOn(shiftDay(todayDate(), -1))}
              active={occurredOn === shiftDay(todayDate(), -1)}
            />
          </View>

          {/* Note */}
          <SectionLabel>Note (optional)</SectionLabel>
          <View
            style={{
              backgroundColor: C.surface,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: C.border,
              paddingHorizontal: 14,
              paddingVertical: 10,
            }}
          >
            <TextInput
              value={note}
              onChangeText={(v) => setNote(v.slice(0, 200))}
              placeholder={type === 'expense' ? 'Dinner with friends' : 'July salary'}
              placeholderTextColor={C.textMuted}
              multiline
              style={{
                fontFamily: 'DMSans_500Medium',
                fontSize: 15,
                color: C.textPrimary,
                minHeight: 44,
                padding: 0,
              }}
            />
          </View>

          {error && (
            <Text
              style={{
                fontFamily: 'DMSans_500Medium',
                fontSize: 13,
                color: '#DC2626',
                marginTop: 12,
              }}
            >
              {error}
            </Text>
          )}
        </ScrollView>

        {/* Save button */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: insets.bottom + 12,
            borderTopWidth: 1,
            borderTopColor: C.border,
            backgroundColor: C.pageBg,
          }}
        >
          <SpringPressable
            onPress={onSave}
            disabled={!isValid || saving}
            haptic
            style={{
              borderRadius: 16,
              shadowColor: isValid ? C.heroTop : 'transparent',
              shadowOpacity: 0.3,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 6 },
              elevation: isValid ? 4 : 0,
            }}
          >
            {/* Brand gradient when actionable; flat track while disabled. */}
            <LinearGradient
              colors={
                isValid
                  ? [C.heroTop, C.heroMid, C.heroBot]
                  : [C.borderLight, C.borderLight, C.borderLight]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={{
                borderRadius: 16,
                overflow: 'hidden',
                paddingVertical: 16,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                  style={{
                    fontFamily: 'DMSans_700Bold',
                    fontSize: 16,
                    color: isValid ? '#FFFFFF' : C.textMuted,
                    letterSpacing: 0.2,
                  }}
                >
                  {(editingId ? 'Save changes' : type === 'expense' ? 'Log expense' : 'Log income') +
                    (isValid ? ` · ${formatAmount(amount, currency)}` : '')}
                </Text>
              )}
            </LinearGradient>
          </SpringPressable>
        </View>
      </KeyboardAvoidingView>

      <CurrencyPicker
        visible={showCurrencyPicker}
        current={currency}
        pinned={pinnedCurrencies}
        onSelect={(c) => {
          setCurrency(c);
          setShowCurrencyPicker(false);
        }}
        onCancel={() => setShowCurrencyPicker(false)}
      />
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────────────
 * Subcomponents
 * ──────────────────────────────────────────────────────────────────── */

function TypeButton({
  label,
  icon: Icon,
  active,
  activeColor,
  onPress,
}: {
  label: string;
  icon: typeof TrendingDown;
  active: boolean;
  activeColor: string;
  onPress: () => void;
}) {
  const C = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        backgroundColor: active ? C.surface : 'transparent',
        borderRadius: 9,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 6,
        // Active segment lifts slightly off the track, like a real control.
        shadowColor: active ? '#000' : 'transparent',
        shadowOpacity: 0.08,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: active ? 2 : 0,
      }}
    >
      <Icon size={15} color={active ? activeColor : C.textMuted} strokeWidth={2.5} />
      <Text
        style={{
          fontFamily: 'DMSans_600SemiBold',
          fontSize: 14,
          color: active ? activeColor : C.textMuted,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function CategoryChip({
  cat,
  selected,
  onPress,
}: {
  cat: ExpenseCategory;
  selected: boolean;
  onPress: () => void;
}) {
  const C = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: selected ? `${cat.color}22` : C.surface,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? cat.color : C.border,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <Text style={{ fontSize: 16 }}>{cat.emoji}</Text>
      <Text
        style={{
          fontFamily: selected ? 'DMSans_600SemiBold' : 'DMSans_500Medium',
          fontSize: 13,
          color: selected ? cat.color : C.textPrimary,
        }}
      >
        {cat.name}
      </Text>
    </Pressable>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  const C = useAppTheme();
  return (
    <Text
      style={{
        fontFamily: 'DMSans_500Medium',
        fontSize: 12,
        color: C.textMuted,
        letterSpacing: 0.5,
        marginTop: 20,
        marginBottom: 8,
      }}
    >
      {String(children).toUpperCase()}
    </Text>
  );
}

function DateStepperButton({
  icon: Icon,
  onPress,
  disabled,
}: {
  icon: typeof ChevronLeft;
  onPress: () => void;
  disabled?: boolean;
}) {
  const C = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: disabled ? 'transparent' : C.borderLight,
      }}
    >
      <Icon size={18} color={disabled ? C.borderLight : C.textPrimary} strokeWidth={2.25} />
    </Pressable>
  );
}

function QuickDateButton({
  label,
  onPress,
  active,
}: {
  label: string;
  onPress: () => void;
  active: boolean;
}) {
  const C = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: active ? C.accentLight : C.surface,
        borderWidth: 1,
        borderColor: active ? C.accent : C.border,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 6,
      }}
    >
      <Text
        style={{
          fontFamily: 'DMSans_500Medium',
          fontSize: 12,
          color: active ? C.accentDark : C.textSecondary,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/* ──────────────────────────────────────────────────────────────────────
 * Helpers
 * ──────────────────────────────────────────────────────────────────── */

function shiftDay(date: string, delta: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(y, m - 1, d + delta);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
