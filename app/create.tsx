import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  AlertCircle,
  Calendar,
  Check,
  Palette,
  PiggyBank,
  Target,
  X,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { CustomAlert } from '@/components/CustomAlert';
import { SpringPressable } from '@/components/SpringPressable';

import {
  CURRENCY_LIST,
  calcAvgPerDay,
  formatAmount,
  getLargestNote,
  getNotes,
  getSmallestNote,
  validateGoalAndDays,
} from '@/lib/currency';
import type { CurrencyCode } from '@/lib/currency';
import { MAX_COLS, MIN_COLS, suggestCols } from '@/lib/grid';
import { useMoneyboxesStore } from '@/lib/stores/moneyboxes';
import { useProfileStore } from '@/lib/stores/profile';
import { useSessionStore } from '@/lib/stores/session';
import { THEMES } from '@/lib/theme';
import type { ThemeId } from '@/lib/types';
import { useAlert } from '@/lib/use-alert';

const C = {
  accent: '#1DB954',
  accentDark: '#166534',
  pageBg: '#F5F7FA',
  surface: '#FFFFFF',
  textPrimary: '#0F1419',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textFaint: '#D1D5DB',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
};

const THEME_OPTIONS = Object.values(THEMES);

const GOAL_TEMPLATES = [
  { icon: '✈️', label: 'Vacation' },
  { icon: '📱', label: 'New Phone' },
  { icon: '🎮', label: 'Gaming' },
  { icon: '🎁', label: 'Gift' },
  { icon: '🏥', label: 'Emergency' },
  { icon: '🎓', label: 'Education' },
  { icon: '🚗', label: 'Vehicle' },
  { icon: '🏠', label: 'Home' },
  { icon: '💍', label: 'Wedding' },
  { icon: '🎯', label: 'Custom' },
];

const QUICK_GOALS: Record<string, number[]> = {
  INR: [5000, 10000, 25000, 50000, 100000],
  USD: [100, 500, 1000, 2500, 5000],
  EUR: [100, 500, 1000, 2500, 5000],
  GBP: [100, 250, 500, 1000, 2500],
  DEFAULT: [100, 500, 1000, 5000, 10000],
};

const STEPS = [
  { icon: PiggyBank, label: 'Name' },
  { icon: Target, label: 'Goal' },
  { icon: Calendar, label: 'Timeline' },
  { icon: Palette, label: 'Theme' },
] as const;

/* ── Step indicator (Chime style) ──────────────────────────────── */

function StepIndicator({ current }: { current: number }) {
  return (
    <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
      {/* Icons row */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {STEPS.map((s, i) => {
          const done = i < current;
          const active = i === current;
          const Icon = s.icon;
          return (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 0 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: done ? C.accent : active ? C.surface : C.borderLight,
                  borderWidth: active ? 2 : 0,
                  borderColor: C.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {done ? (
                  <Check size={16} color="#FFFFFF" />
                ) : (
                  <Icon size={16} color={active ? C.accent : C.textFaint} />
                )}
              </View>
              {i < STEPS.length - 1 && (
                <View
                  style={{
                    flex: 1,
                    height: 2,
                    backgroundColor: i < current ? C.accent : C.borderLight,
                    marginHorizontal: 4,
                  }}
                />
              )}
            </View>
          );
        })}
      </View>
      {/* Labels row */}
      <View style={{ flexDirection: 'row', marginTop: 6 }}>
        {STEPS.map((s, i) => {
          const active = i === current;
          return (
            <Text
              key={i}
              style={{
                flex: 1,
                fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular',
                fontSize: 11,
                color: active ? C.textPrimary : C.textMuted,
                textAlign: i === 0 ? 'left' : i === STEPS.length - 1 ? 'right' : 'center',
              }}
            >
              {s.label}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

/* ── Create Screen ─────────────────────────────────────────────── */

export default function CreateScreen() {
  const router = useRouter();
  const { userId } = useSessionStore();
  const { profile } = useProfileStore();
  const { moneyboxes, create } = useMoneyboxesStore();

  const usedCurrencies = useMemo(
    () => new Set(moneyboxes.filter((b) => b.status === 'active').map((b) => b.currency)),
    [moneyboxes],
  );

  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>(profile?.defaultCurrency ?? 'INR');
  const [goalText, setGoalText] = useState('');
  const [daysText, setDaysText] = useState('');
  const [gridCols, setGridCols] = useState<number | null>(null);
  const [theme, setTheme] = useState<ThemeId>('classic_gold');
  const [saving, setSaving] = useState(false);
  const { alertConfig, showAlert, dismissAlert } = useAlert();

  const goal = Number(goalText.replace(/[^0-9]/g, '')) || 0;
  const days = Number(daysText.replace(/[^0-9]/g, '')) || 0;
  const suggestedCols = days > 0 ? suggestCols(days) : 5;
  const activeCols = gridCols ?? suggestedCols;
  const notes = useMemo(() => getNotes(currency), [currency]);
  const quickGoals = QUICK_GOALS[currency] ?? QUICK_GOALS.DEFAULT;

  const validation = useMemo(() => {
    if (!goal || !days) return null;
    return validateGoalAndDays(goal, days, currency);
  }, [goal, days, currency]);

  const onCreate = async () => {
    if (!userId || !validation?.valid) return;
    setSaving(true);
    try {
      const newBox = await create({
        userId,
        name: name.trim(),
        theme,
        currency,
        goalAmount: goal,
        targetDays: days,
        gridCols: activeCols,
        notes,
      });
      router.replace(`/box/${newBox.id}`);
    } catch (error: unknown) {
      showAlert('Error', error instanceof Error ? error.message : 'Failed', undefined, '⚠️');
    } finally {
      setSaving(false);
    }
  };

  const canNext0 = name.trim().length > 0;
  const canNext1 = goal > 0;
  const canNext2 = validation?.valid ?? false;

  return (
    <View style={{ flex: 1, backgroundColor: C.pageBg }}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Close button */}
        <View style={{ paddingHorizontal: 16, paddingTop: 56, paddingBottom: 8 }}>
          <SpringPressable
            onPress={() => router.back()}
            style={{ width: 36, justifyContent: 'center' }}
          >
            <X size={22} color={C.textPrimary} />
          </SpringPressable>
        </View>

        {/* Step indicator */}
        <StepIndicator current={step} />

        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}>
          {/* ═══════════════════════════════════════════ */}
          {/* Step 0: Name + Currency                     */}
          {/* ═══════════════════════════════════════════ */}
          {step === 0 && (
            <View style={{ gap: 20 }}>
              <View>
                <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 28, color: C.textPrimary }}>
                  What are you{'\n'}saving for?
                </Text>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: C.textSecondary, marginTop: 6 }}>
                  Give your moneybox a name
                </Text>
              </View>

              {/* Quick picks */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {GOAL_TEMPLATES.map((t) => {
                  const selected = name === t.label;
                  return (
                    <Pressable
                      key={t.label}
                      onPress={() => setName(t.label)}
                      style={{
                        backgroundColor: selected ? C.accent : C.surface,
                        borderRadius: 12,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        borderWidth: 1,
                        borderColor: selected ? C.accent : C.border,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Text style={{ fontSize: 16 }}>{t.icon}</Text>
                      <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: selected ? '#FFFFFF' : C.textPrimary }}>
                        {t.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Custom name input */}
              <View
                style={{
                  backgroundColor: C.surface,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: C.border,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                }}
              >
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: C.textMuted, marginBottom: 4 }}>
                  Custom name
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Or type your own..."
                  placeholderTextColor={C.textFaint}
                  style={{
                    fontSize: 16,
                    fontFamily: 'Inter_500Medium',
                    color: C.textPrimary,
                    padding: 0,
                  }}
                />
              </View>

              {/* Currency */}
              <View>
                <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: C.textMuted, letterSpacing: 0.5, marginBottom: 8 }}>
                  CURRENCY
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {CURRENCY_LIST.map((c) => {
                    const selected = currency === c.code;
                    const taken = usedCurrencies.has(c.code);
                    return (
                      <Pressable
                        key={c.code}
                        onPress={() => !taken && setCurrency(c.code)}
                        disabled={taken}
                        style={{
                          backgroundColor: selected ? C.accent : taken ? C.borderLight : C.surface,
                          borderRadius: 12,
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                          borderWidth: selected ? 0 : 1,
                          borderColor: C.border,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          opacity: taken ? 0.5 : 1,
                        }}
                      >
                        <Text style={{ fontSize: 16 }}>{c.flag}</Text>
                        <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: selected ? '#FFFFFF' : taken ? C.textMuted : C.textPrimary }}>
                          {c.code}{taken ? ' (active)' : ''}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Next */}
              <Pressable
                onPress={() => canNext0 ? setStep(1) : showAlert('Name required', 'Give your moneybox a name before continuing.', undefined, '✏️')}
                style={{
                  backgroundColor: canNext0 ? C.accent : C.borderLight,
                  borderRadius: 14,
                  paddingVertical: 16,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: canNext0 ? '#FFFFFF' : C.textFaint }}>
                  Next
                </Text>
              </Pressable>
            </View>
          )}

          {/* ═══════════════════════════════════════════ */}
          {/* Step 1: Goal amount                         */}
          {/* ═══════════════════════════════════════════ */}
          {step === 1 && (
            <View style={{ gap: 20 }}>
              <View>
                <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 28, color: C.textPrimary }}>
                  Set your goal
                </Text>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: C.textSecondary, marginTop: 6 }}>
                  How much do you want to save?
                </Text>
              </View>

              {/* Amount input */}
              <View
                style={{
                  backgroundColor: C.surface,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: C.border,
                  paddingHorizontal: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 24, color: C.textMuted }}>
                  {CURRENCY_LIST.find((c) => c.code === currency)?.symbol}
                </Text>
                <TextInput
                  value={goalText}
                  onChangeText={setGoalText}
                  placeholder="0"
                  keyboardType="number-pad"
                  placeholderTextColor={C.textFaint}
                  style={{ flex: 1, fontSize: 28, fontFamily: 'Inter_700Bold', color: C.textPrimary, paddingVertical: 14, paddingLeft: 8 }}
                  autoFocus
                />
              </View>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: C.textMuted, marginTop: -12 }}>
                Notes: {notes.map((n) => `${CURRENCY_LIST.find((c) => c.code === currency)?.symbol}${n}`).join(', ')}
              </Text>

              {/* Quick picks */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {quickGoals.map((q) => (
                  <Pressable
                    key={q}
                    onPress={() => setGoalText(String(q))}
                    style={{
                      backgroundColor: goal === q ? C.accent : C.surface,
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderWidth: 1,
                      borderColor: goal === q ? C.accent : C.border,
                    }}
                  >
                    <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: goal === q ? '#FFFFFF' : C.textPrimary }}>
                      {formatAmount(q, currency)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Pressable
                onPress={() => canNext1 ? setStep(2) : showAlert('Goal required', 'Enter how much you want to save.', undefined, '💰')}
                style={{
                  backgroundColor: canNext1 ? C.accent : C.borderLight,
                  borderRadius: 14,
                  paddingVertical: 16,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: canNext1 ? '#FFFFFF' : C.textFaint }}>
                  Next
                </Text>
              </Pressable>
            </View>
          )}

          {/* ═══════════════════════════════════════════ */}
          {/* Step 2: Days + validation                   */}
          {/* ═══════════════════════════════════════════ */}
          {step === 2 && (
            <View style={{ gap: 16 }}>
              <View>
                <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 28, color: C.textPrimary }}>
                  Choose your{'\n'}timeline
                </Text>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: C.textSecondary, marginTop: 6 }}>
                  1 cell = 1 day. You fill one cell each day.
                </Text>
              </View>

              <View
                style={{
                  backgroundColor: C.surface,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: C.border,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                }}
              >
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: C.textMuted, marginBottom: 4 }}>
                  Number of days
                </Text>
                <TextInput
                  value={daysText}
                  onChangeText={setDaysText}
                  placeholder="e.g. 100"
                  keyboardType="number-pad"
                  placeholderTextColor={C.textFaint}
                  style={{
                    fontSize: 20,
                    fontFamily: 'Inter_700Bold',
                    color: C.textPrimary,
                    padding: 0,
                  }}
                  autoFocus
                />
              </View>

              {/* Smart info card */}
              {goal > 0 && (
                <View style={{ backgroundColor: C.surface, borderRadius: 14, padding: 14, gap: 10, borderWidth: 1, borderColor: C.border }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: C.textMuted }}>Goal</Text>
                    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: C.textPrimary }}>{formatAmount(goal, currency)}</Text>
                  </View>
                  <View style={{ height: 0.5, backgroundColor: C.borderLight }} />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: C.textMuted }}>Fastest</Text>
                    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: C.accent }}>
                      {Math.ceil(goal / getLargestNote(currency))} days
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: C.textMuted }}>Slowest</Text>
                    <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: C.textSecondary }}>
                      {Math.floor(goal / getSmallestNote(currency))} days
                    </Text>
                  </View>
                </View>
              )}

              {/* Validation */}
              {validation && !validation.valid && (
                <View style={{ backgroundColor: '#FEF2F2', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                  <AlertCircle size={18} color="#EF4444" style={{ marginTop: 2 }} />
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: '#DC2626', flex: 1, lineHeight: 19 }}>
                    {validation.message}
                  </Text>
                </View>
              )}

              {validation?.valid && days > 0 && (
                <>
                  <View style={{ backgroundColor: '#E6F4EA', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                    <Check size={18} color={C.accent} style={{ marginTop: 2 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: C.accentDark }}>
                        Looks good!
                      </Text>
                      <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: C.textSecondary, marginTop: 2, lineHeight: 18 }}>
                        {days} days · ~{formatAmount(calcAvgPerDay(goal, days), currency)}/day · {Math.ceil(days / activeCols)}x{activeCols} grid
                      </Text>
                      <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: C.textMuted, marginTop: 4 }}>
                        {formatDate(new Date())} → {formatDate(addDays(new Date(), days))}
                      </Text>
                    </View>
                  </View>

                  {/* Column selector */}
                  <View>
                    <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: C.textMuted, letterSpacing: 0.5, marginBottom: 6 }}>
                      COLUMNS (auto: {suggestedCols})
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                      {Array.from({ length: MAX_COLS - MIN_COLS + 1 }, (_, i) => i + MIN_COLS).map((c) => {
                        const selected = activeCols === c;
                        const isSuggested = c === suggestedCols && gridCols === null;
                        return (
                          <Pressable
                            key={c}
                            onPress={() => setGridCols(c === suggestedCols ? null : c)}
                            style={{
                              backgroundColor: selected ? C.accent : C.surface,
                              borderRadius: 12,
                              paddingHorizontal: 14,
                              paddingVertical: 10,
                              borderWidth: 1,
                              borderColor: selected ? C.accent : C.border,
                              minWidth: 44,
                              alignItems: 'center',
                            }}
                          >
                            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: selected ? '#FFFFFF' : C.textPrimary }}>
                              {c}
                            </Text>
                            {isSuggested && (
                              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 9, color: selected ? 'rgba(255,255,255,0.7)' : C.textMuted, marginTop: 1 }}>
                                auto
                              </Text>
                            )}
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                </>
              )}

              <Pressable
                onPress={() => {
                  if (!days) { showAlert('Days required', 'Enter how many days you want to save for.', undefined, '📅'); return; }
                  if (!validation?.valid) { showAlert('Not possible', validation?.message ?? 'Check your inputs.', undefined, '⚠️'); return; }
                  setStep(3);
                }}
                style={{
                  backgroundColor: canNext2 ? C.accent : C.borderLight,
                  borderRadius: 14,
                  paddingVertical: 16,
                  alignItems: 'center',
                }}
                disabled={!canNext2}
              >
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: canNext2 ? '#FFFFFF' : C.textFaint }}>
                  Next
                </Text>
              </Pressable>
            </View>
          )}

          {/* ═══════════════════════════════════════════ */}
          {/* Step 3: Theme + confirm                     */}
          {/* ═══════════════════════════════════════════ */}
          {step === 3 && (
            <View style={{ gap: 16 }}>
              <View>
                <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 28, color: C.textPrimary }}>
                  Pick a look
                </Text>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: C.textSecondary, marginTop: 6 }}>
                  Choose a theme for your moneybox
                </Text>
              </View>

              <View style={{ gap: 8 }}>
                {THEME_OPTIONS.map((t) => {
                  const selected = theme === t.id;
                  return (
                    <Pressable
                      key={t.id}
                      onPress={() => setTheme(t.id)}
                      style={{
                        backgroundColor: C.surface,
                        borderRadius: 14,
                        padding: 14,
                        borderWidth: selected ? 2 : 1,
                        borderColor: selected ? C.accent : C.border,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        {selected && (
                          <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' }}>
                            <Check size={12} color="#FFFFFF" />
                          </View>
                        )}
                        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: C.textPrimary }}>{t.label}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {[t.heroGradientStart, t.accent, t.cellFilled].map((color, i) => (
                          <View key={i} style={{ backgroundColor: color, width: 18, height: 18, borderRadius: 9 }} />
                        ))}
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              {/* Summary */}
              <View style={{ backgroundColor: C.surface, borderRadius: 14, padding: 16, gap: 10, borderWidth: 1, borderColor: C.border }}>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: C.textPrimary, marginBottom: 2 }}>Summary</Text>
                {[
                  ['Name', name],
                  ['Goal', formatAmount(goal, currency)],
                  ['Duration', `${days} days`],
                  ['Avg/day', formatAmount(calcAvgPerDay(goal, days), currency)],
                  ['Grid', `${Math.ceil(days / activeCols)} x ${activeCols} (${days} cells)`],
                ].map(([label, value]) => (
                  <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: C.textMuted }}>{label}</Text>
                    <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: C.textPrimary }}>{value}</Text>
                  </View>
                ))}
              </View>

              {/* Create */}
              <Pressable
                onPress={onCreate}
                disabled={saving}
                style={{
                  backgroundColor: C.accent,
                  borderRadius: 14,
                  paddingVertical: 16,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#FFFFFF' }}>
                  {saving ? 'Creating...' : 'Create moneybox'}
                </Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      <CustomAlert config={alertConfig} onDismiss={dismissAlert} />
    </View>
  );
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
