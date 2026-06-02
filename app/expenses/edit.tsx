import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Calendar, Check, ChevronDown, Trash2, X } from 'lucide-react-native';
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

import { CURRENCIES, type CurrencyCode } from '@/lib/currency';
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
              active={type === 'expense'}
              activeColor="#EF4444"
              onPress={() => setType('expense')}
            />
            <TypeButton
              label="Income"
              active={type === 'income'}
              activeColor="#10B981"
              onPress={() => setType('income')}
            />
          </View>

          {/* Amount + currency */}
          <View
            style={{
              backgroundColor: C.surface,
              borderRadius: 16,
              borderWidth: 1.5,
              borderColor: C.border,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <Pressable
              onPress={() => setShowCurrencyPicker((v) => !v)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingVertical: 6,
                paddingHorizontal: 10,
                backgroundColor: C.borderLight,
                borderRadius: 10,
              }}
            >
              <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: C.textPrimary }}>
                {CURRENCIES[currency].symbol} {currency}
              </Text>
              <ChevronDown size={14} color={C.textMuted} />
            </Pressable>
            <TextInput
              value={amountText}
              onChangeText={(v) => setAmountText(v.replace(/[^0-9.]/g, ''))}
              placeholder="0.00"
              placeholderTextColor={C.textMuted}
              keyboardType="decimal-pad"
              autoFocus={!editingId}
              style={{
                flex: 1,
                fontFamily: 'DMSans_700Bold',
                fontSize: 28,
                color: C.textPrimary,
                textAlign: 'right',
                padding: 0,
                letterSpacing: -0.5,
              }}
            />
          </View>

          {showCurrencyPicker && (
            <CurrencyPicker
              selected={currency}
              onChange={(c) => {
                setCurrency(c);
                setShowCurrencyPicker(false);
              }}
            />
          )}

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
                  onPress={() => setCategoryId(c.id)}
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
            <DateStepperButton label="−" onPress={goPrevDay} />
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
            <DateStepperButton label="+" onPress={goNextDay} disabled={occurredOn >= todayDate()} />
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
              placeholder="Dinner with friends"
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
          <Pressable
            onPress={onSave}
            disabled={!isValid || saving}
            style={({ pressed }) => ({
              backgroundColor: isValid ? C.buttonPrimaryBg : C.borderLight,
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
              transform: [{ scale: pressed && isValid ? 0.98 : 1 }],
            })}
          >
            {saving ? (
              <ActivityIndicator color={C.buttonPrimaryText} />
            ) : (
              <>
                <Check size={18} color={isValid ? C.buttonPrimaryText : C.textMuted} strokeWidth={2.5} />
                <Text
                  style={{
                    fontFamily: 'DMSans_700Bold',
                    fontSize: 16,
                    color: isValid ? C.buttonPrimaryText : C.textMuted,
                    letterSpacing: 0.2,
                  }}
                >
                  Save
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────────────
 * Subcomponents
 * ──────────────────────────────────────────────────────────────────── */

function TypeButton({
  label,
  active,
  activeColor,
  onPress,
}: {
  label: string;
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
      }}
    >
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

function CurrencyPicker({
  selected,
  onChange,
}: {
  selected: CurrencyCode;
  onChange: (c: CurrencyCode) => void;
}) {
  const C = useAppTheme();
  // Common currencies up top for quick pick; full list scrolls below.
  const common: CurrencyCode[] = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD', 'CAD', 'SGD'];
  const all = Object.keys(CURRENCIES) as CurrencyCode[];
  const ordered = [...common, ...all.filter((c) => !common.includes(c))];
  return (
    <View
      style={{
        marginTop: 8,
        backgroundColor: C.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: C.border,
        padding: 8,
        maxHeight: 240,
      }}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {ordered.map((code) => (
            <Pressable
              key={code}
              onPress={() => onChange(code)}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: selected === code ? C.accent : C.borderLight,
              }}
            >
              <Text
                style={{
                  fontFamily: 'DMSans_500Medium',
                  fontSize: 12,
                  color: selected === code ? '#FFFFFF' : C.textPrimary,
                }}
              >
                {CURRENCIES[code].symbol} {code}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
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
  label,
  onPress,
  disabled,
}: {
  label: string;
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
      <Text
        style={{
          fontFamily: 'DMSans_700Bold',
          fontSize: 18,
          color: disabled ? C.borderLight : C.textPrimary,
        }}
      >
        {label}
      </Text>
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
