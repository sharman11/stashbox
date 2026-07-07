import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ArrowRight,
  Check,
  ChevronLeft,
  Coins,
  Heart,
  Smile,
  Sparkles,
  User as UserIcon,
  Wallet,
  X,
} from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AvatarVisual } from '@/components/AvatarVisual';
import { MultiCurrencyPicker } from '@/components/MultiCurrencyPicker';
import { AVATARS, DEFAULT_AVATAR } from '@/lib/avatars';
import { CURRENCIES, formatAmount, type CurrencyCode } from '@/lib/currency';
import { detectLocaleCurrency } from '@/lib/locale-currency';
import {
  INCOME_SOURCES,
  ensureIncomeCategoryId,
  writeIncomeProfile,
} from '@/lib/expenses/income-profile';
import { useAppReadyStore } from '@/lib/stores/app-ready';
import { useAvatarStore } from '@/lib/stores/avatar';
import { useExpenseBudgetsStore } from '@/lib/stores/expense-budgets';
import { currentMonthAnchor, todayDate, useExpenseTransactionsStore } from '@/lib/stores/expense-transactions';
import { useProfileStore } from '@/lib/stores/profile';
import { useSessionStore } from '@/lib/stores/session';
import { useAppTheme } from '@/lib/stores/theme';

/* ──────────────────────────────────────────────────────────────────────
 * Constants
 * ──────────────────────────────────────────────────────────────────── */

const FREE_AVATARS = AVATARS.filter((a) => a.category === 'og');
const NAME_MAX = 48;

type StepId = 1 | 2 | 3 | 4 | 5;
const TOTAL_STEPS = 5;

interface StepMeta {
  id: StepId;
  label: string;
  Icon: typeof UserIcon;
}

// No goal step here on purpose: goal creation lives in the full /create flow
// (stash spot, timeline, theme, validation) which the home empty state leads
// new users into. A stripped-down duplicate in the stepper just diverges.
const STEPS: readonly StepMeta[] = [
  { id: 1, label: 'Your name', Icon: UserIcon },
  { id: 2, label: 'Pick avatar', Icon: Smile },
  { id: 3, label: 'Currency', Icon: Coins },
  { id: 4, label: 'Money picture', Icon: Wallet },
  { id: 5, label: "You're in!", Icon: Heart },
];

/* ──────────────────────────────────────────────────────────────────────
 * Screen
 * ──────────────────────────────────────────────────────────────────── */

export default function SignupScreen() {
  const C = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const bottomInset = Math.max(insets.bottom, 16);
  const userId = useSessionStore((s) => s.userId);
  const isAnonymous = useSessionStore((s) => s.isAnonymous);
  const transitioning = useSessionStore((s) => s.transitioning);
  const { completeOnboarding, update } = useProfileStore();
  const setAvatar = useAvatarStore((s) => s.setAvatar);
  const profile = useProfileStore((s) => s.profile);

  // Account creation now happens in /(auth)/email-otp before the user
  // reaches this screen. The signup stepper is purely the post-auth
  // onboarding (name, avatar, currency, money picture, you're in).
  //
  // Pre-seed the name field if the user is resuming a previously-saved
  // partial profile.
  const seededName = useMemo(() => profile?.displayName ?? '', [profile?.displayName]);

  // ── stepper state ──
  const [step, setStep] = useState<StepId>(1);

  // ── Step 1: Name ──
  const [name, setName] = useState(seededName);

  // ── Step 2: Avatar ──
  const [avatarId, setAvatarId] = useState<string>(DEFAULT_AVATAR.id);

  // ── Step 3: Currency ──
  const localeDefault = useMemo(() => detectLocaleCurrency(), []);
  const [currencies, setCurrencies] = useState<CurrencyCode[]>([localeDefault]);
  const primaryCurrency = currencies[0] ?? localeDefault;

  // ── Step 4: Money picture (all optional) ──
  const [incomeSource, setIncomeSource] = useState<string | null>(null);
  const [incomeText, setIncomeText] = useState('');
  const [budgetText, setBudgetText] = useState('');

  // ── async ──
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── derived ──
  const trimmedName = name.trim();
  // First word for greetings ("Welcome, John!"); falls back to the full name
  // for single-word entries and to empty for blank.
  const displayFirst = trimmedName.split(/\s+/)[0] ?? '';
  const step1Valid = trimmedName.length > 0;

  // Money picture: everything optional; only persist what was given.
  const monthlyIncome = Number(incomeText.replace(/[^0-9.]/g, ''));
  const monthlyBudget = Number(budgetText.replace(/[^0-9.]/g, ''));

  // ── navigation ──
  const goNext = () => {
    setError(null);
    if (step < TOTAL_STEPS) setStep((step + 1) as StepId);
  };

  const onStep1Next = () => {
    if (!step1Valid) return;
    goNext();
  };

  // Finalize: persists name + avatar + currencies, plus the optional money
  // picture. Seeding errors are non-fatal — the user can retry from the UI.
  const onFinishOnboarding = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      if (trimmedName) await update({ displayName: trimmedName });
      await setAvatar(avatarId);
      await completeOnboarding({
        defaultCurrency: primaryCurrency,
        preferredCurrencies: currencies,
      });

      // Money picture → real features. The budget seeds this month's overall
      // cap, which lights up Safe-to-Spend on Home and the Expenses budget
      // card from day one. Income + source are stored for insights.
      if (monthlyBudget > 0 && userId) {
        try {
          await useExpenseBudgetsStore.getState().setBudget({
            userId,
            categoryId: null,
            periodMonth: currentMonthAnchor(),
            limitCents: Math.round(monthlyBudget * 100),
            currency: primaryCurrency,
          });
        } catch (e) {
          // Non-fatal: the user can set it later from the Budgets screen.
          // eslint-disable-next-line no-console
          console.warn('onboarding budget create failed', e);
        }
      }
      // Income shows up as a real transaction in the Expenses tab — telling
      // us your salary and then never seeing it anywhere is a broken promise.
      if (monthlyIncome > 0 && userId) {
        try {
          const categoryId = await ensureIncomeCategoryId(userId, incomeSource);
          await useExpenseTransactionsStore.getState().create({
            userId,
            type: 'income',
            amountCents: Math.round(monthlyIncome * 100),
            currency: primaryCurrency,
            categoryId,
            occurredOn: todayDate(),
            note: 'Monthly income',
          });
        } catch (e) {
          // Non-fatal: the user can log it manually.
          // eslint-disable-next-line no-console
          console.warn('onboarding income create failed', e);
        }
      }
      if (monthlyIncome > 0 || incomeSource) {
        // Powers the new-month income nudge on the Expenses tab.
        await writeIncomeProfile({
          monthlyIncomeCents: monthlyIncome > 0 ? Math.round(monthlyIncome * 100) : null,
          source: incomeSource,
          currency: primaryCurrency,
        });
      }

      router.replace('/');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not save profile');
    } finally {
      setSaving(false);
    }
  };

  const onBack = () => {
    if (step > 1) {
      setStep((step - 1) as StepId);
    }
  };

  // The user is authenticated by the time they reach this screen, and the
  // auth guard bounces them back here until onboardingDone flips. The X is
  // hidden — only the back chevron is shown, and only between steps.
  const showBack = step > 1;

  // Anonymous user landing here directly somehow — defensive redirect to
  // the email-OTP entry. The auth guard normally prevents this, but if the
  // restore lands them here, kick them back to the auth flow.
  if (!transitioning && (!userId || isAnonymous)) {
    return <Redirect href="/(auth)/email-otp" />;
  }
  // Onboarded already? Get them home.
  if (!transitioning && userId && !isAnonymous && profile?.onboardingDone) {
    return <Redirect href="/" />;
  }

  // ── render ──
  return (
    <View style={{ flex: 1, backgroundColor: C.pageBg }}>
      <StatusBar style={C.mode === 'dark' ? 'light' : 'dark'} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
        style={{ flex: 1 }}
      >
        {/* ── Top bar ── */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: insets.top + 8,
            paddingHorizontal: 20,
            paddingBottom: 4,
          }}
        >
          {showBack ? (
            <Pressable onPress={onBack} hitSlop={10} accessibilityLabel="Back">
              <ChevronLeft size={26} color={C.textPrimary} strokeWidth={2.25} />
            </Pressable>
          ) : (
            <View style={{ width: 26, height: 26 }} />
          )}

          <Text
            style={{
              fontFamily: 'DMSans_700Bold',
              fontSize: 18,
              color: C.accent,
              letterSpacing: -0.4,
            }}
          >
            stashbox
          </Text>

          <View style={{ width: 26, height: 26 }} />
        </View>

        {/* ── Stepper ── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 }}>
          <Stepper step={step} screenW={screenW} />
        </View>

        {/* ── Step bodies ── */}
        {step === 1 && (
          <NameStep
            name={name}
            onName={(v) => setName(v.slice(0, NAME_MAX))}
            error={error}
            isValid={step1Valid}
            onNext={onStep1Next}
            bottomInset={bottomInset}
          />
        )}

        {step === 2 && (
          <AvatarStep
            firstName={displayFirst}
            avatarId={avatarId}
            onPick={setAvatarId}
            error={error}
            onNext={goNext}
            screenW={screenW}
            bottomInset={bottomInset}
          />
        )}

        {step === 3 && (
          <CurrencyStep
            firstName={displayFirst}
            currencies={currencies}
            onChange={setCurrencies}
            error={error}
            onNext={goNext}
            bottomInset={bottomInset}
          />
        )}

        {step === 4 && (
          <MoneyStep
            currency={primaryCurrency}
            incomeSource={incomeSource}
            onIncomeSource={setIncomeSource}
            incomeText={incomeText}
            onIncomeText={(v) => setIncomeText(v.replace(/[^0-9.]/g, ''))}
            budgetText={budgetText}
            onBudgetText={(v) => setBudgetText(v.replace(/[^0-9.]/g, ''))}
            error={error}
            onNext={goNext}
            bottomInset={bottomInset}
          />
        )}

        {step === 5 && (
          <YoureInStep
            firstName={displayFirst}
            avatarId={avatarId}
            currency={primaryCurrency}
            monthlyIncome={monthlyIncome}
            monthlyBudget={monthlyBudget}
            incomeSource={incomeSource}
            error={error}
            saving={saving}
            onFinish={onFinishOnboarding}
            bottomInset={bottomInset}
          />
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────────────
 * Stepper — 5 circles + caption
 * ──────────────────────────────────────────────────────────────────── */

function Stepper({ step, screenW }: { step: StepId; screenW: number }) {
  const C = useAppTheme();
  const active = STEPS.find((s) => s.id === step) ?? STEPS[0];

  // Sizing: keep circles small enough that all fit comfortably on narrow phones.
  // Hide per-circle labels — we render just the active label below the row.
  const HORIZONTAL_PAD = 16;
  const usableW = screenW - HORIZONTAL_PAD * 2;
  const CIRCLE = 34;
  const totalCircleW = CIRCLE * STEPS.length;
  const connectorW = Math.max(8, (usableW - totalCircleW) / (STEPS.length - 1));

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
        {STEPS.map((item, i) => {
          const completed = step > item.id;
          const isActive = step === item.id;
          const circleBg = completed ? C.accent : isActive ? C.accentLight : C.borderLight;
          const iconColor = completed ? '#FFFFFF' : isActive ? C.accentDark : C.textMuted;

          return (
            <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={{
                  width: CIRCLE,
                  height: CIRCLE,
                  borderRadius: CIRCLE / 2,
                  backgroundColor: circleBg,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: isActive ? 2 : 0,
                  borderColor: isActive ? C.accent : 'transparent',
                }}
              >
                {completed ? (
                  <Check size={16} color="#FFFFFF" strokeWidth={2.6} />
                ) : (
                  <item.Icon size={16} color={iconColor} strokeWidth={2.2} />
                )}
              </View>
              {i < STEPS.length - 1 && (
                <View
                  style={{
                    width: connectorW,
                    height: 2,
                    backgroundColor: step > item.id ? C.accent : C.borderLight,
                  }}
                />
              )}
            </View>
          );
        })}
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 12,
          paddingHorizontal: 4,
        }}
      >
        <Text
          style={{
            fontFamily: 'DMSans_700Bold',
            fontSize: 16,
            color: C.textPrimary,
            letterSpacing: -0.2,
          }}
        >
          {active.label}
        </Text>
        <Text
          style={{
            fontFamily: 'DMSans_500Medium',
            fontSize: 11,
            color: C.textMuted,
            letterSpacing: 0.6,
          }}
        >
          STEP {step} OF {TOTAL_STEPS}
        </Text>
      </View>
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────────────
 * Step 1 — Basic Info
 * ──────────────────────────────────────────────────────────────────── */

interface NameStepProps {
  name: string;
  onName: (v: string) => void;
  error: string | null;
  isValid: boolean;
  onNext: () => void;
  bottomInset: number;
}

function NameStep(props: NameStepProps) {
  const C = useAppTheme();
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.h1, { color: C.textPrimary }]}>What should we call you?</Text>
        <Text style={[styles.sub, { color: C.textSecondary }]}>
          The name we&apos;ll use to greet you. You can change it later.
        </Text>

        {props.error && <ErrorBanner message={props.error} />}

        <View style={{ marginTop: 20 }}>
          <BoxInput
            label="Your name"
            value={props.name}
            onChangeText={props.onName}
            autoCapitalize="words"
            autoComplete="name"
            returnKeyType="done"
            autoFocus
          />
        </View>
      </ScrollView>

      <PrimaryFooter
        ctaLabel="Next"
        disabled={!props.isValid}
        onPress={props.onNext}
        bottomInset={props.bottomInset}
      />
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────────────
 * Step 2 — Avatar
 * ──────────────────────────────────────────────────────────────────── */

interface AvatarStepProps {
  firstName: string;
  avatarId: string;
  onPick: (id: string) => void;
  error: string | null;
  onNext: () => void;
  screenW: number;
  bottomInset: number;
}

function AvatarStep(props: AvatarStepProps) {
  const C = useAppTheme();
  const GRID_PADDING = 24;
  const GRID_GAP = 10;
  const COLS = 5;
  const tileSize = Math.floor(
    (props.screenW - GRID_PADDING * 2 - GRID_GAP * (COLS - 1)) / COLS,
  );
  const ringWidth = 3;
  const innerSize = tileSize - ringWidth * 2;
  const selectedAvatar =
    FREE_AVATARS.find((a) => a.id === props.avatarId) ?? FREE_AVATARS[0];

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: GRID_PADDING,
          paddingTop: 16,
          paddingBottom: 16,
        }}
      >
        {props.error && <ErrorBanner message={props.error} />}

        <View style={{ alignItems: 'center', marginBottom: 18 }}>
          <AvatarVisual avatar={selectedAvatar} size={104} />
          <Text style={[styles.h2, { color: C.textPrimary, marginTop: 14 }]}>
            {props.firstName ? `Welcome, ${props.firstName}!` : 'Pick your look'}
          </Text>
          <Text
            style={{
              fontFamily: 'DMSans_400Regular',
              fontSize: 14,
              color: C.textSecondary,
              marginTop: 6,
              textAlign: 'center',
              lineHeight: 19,
            }}
          >
            Pick an avatar. You can change it any time.
          </Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            columnGap: GRID_GAP,
            rowGap: GRID_GAP,
          }}
        >
          {FREE_AVATARS.map((a) => {
            const selected = props.avatarId === a.id;
            return (
              <Pressable
                key={a.id}
                onPress={() => props.onPick(a.id)}
                hitSlop={4}
                style={{
                  width: tileSize,
                  height: tileSize,
                  borderRadius: tileSize / 2,
                  borderWidth: ringWidth,
                  borderColor: selected ? C.accent : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AvatarVisual avatar={a} size={innerSize} />
              </Pressable>
            );
          })}
        </View>

        <View
          style={{
            marginTop: 22,
            backgroundColor: C.accentLight,
            borderRadius: 14,
            padding: 14,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: 'rgba(255,255,255,0.6)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={18} color={C.accentDark} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: 'DMSans_600SemiBold',
                fontSize: 13,
                color: C.accentDark,
                marginBottom: 2,
              }}
            >
              More avatars to unlock
            </Text>
            <Text
              style={{
                fontFamily: 'DMSans_400Regular',
                fontSize: 12,
                color: C.textSecondary,
                lineHeight: 16,
              }}
            >
              Earn new looks by playing games, hitting streaks, and finishing moneyboxes.
            </Text>
          </View>
        </View>
      </ScrollView>

      <PrimaryFooter
        ctaLabel="Continue"
        onPress={props.onNext}
        bottomInset={props.bottomInset}
      />
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────────────
 * Step 3 — Currency
 * ──────────────────────────────────────────────────────────────────── */

interface CurrencyStepProps {
  firstName: string;
  currencies: CurrencyCode[];
  onChange: (v: CurrencyCode[]) => void;
  error: string | null;
  onNext: () => void;
  bottomInset: number;
}

function CurrencyStep(props: CurrencyStepProps) {
  const C = useAppTheme();
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16 }}
      >
        <Text style={[styles.h2, { color: C.textPrimary }]}>
          {props.firstName ? `What do you save in, ${props.firstName}?` : 'Pick your currencies'}
        </Text>
        <Text style={[styles.sub, { color: C.textSecondary }]}>
          Up to 3 currencies. The first one is your default.
        </Text>

        {props.error && <ErrorBanner message={props.error} />}

        <View style={{ marginTop: 18 }}>
          <MultiCurrencyPicker selected={props.currencies} onChange={props.onChange} />
        </View>
      </ScrollView>

      <PrimaryFooter
        ctaLabel="Continue"
        disabled={props.currencies.length === 0}
        onPress={props.onNext}
        bottomInset={props.bottomInset}
      />
    </View>
  );
}


/* ──────────────────────────────────────────────────────────────────────
 * Step 4 — Money picture (skippable)
 *
 * Monthly income, its source, and a monthly spending cap. Everything is
 * optional (asking for income during onboarding is high-friction, so we
 * never require it). The cap becomes the real overall budget for this
 * month, which powers Safe-to-Spend on Home immediately.
 * ──────────────────────────────────────────────────────────────────── */

interface MoneyStepProps {
  currency: CurrencyCode;
  incomeSource: string | null;
  onIncomeSource: (v: string | null) => void;
  incomeText: string;
  onIncomeText: (v: string) => void;
  budgetText: string;
  onBudgetText: (v: string) => void;
  error: string | null;
  onNext: () => void;
  bottomInset: number;
}

function MoneyStep(props: MoneyStepProps) {
  const C = useAppTheme();
  const symbol = CURRENCIES[props.currency].symbol;
  const income = Number(props.incomeText.replace(/[^0-9.]/g, '')) || 0;
  const budget = Number(props.budgetText.replace(/[^0-9.]/g, '')) || 0;
  const filled = income > 0 || budget > 0 || props.incomeSource !== null;
  const suggested = income > 0 ? Math.round(income * 0.8) : 0;
  const overIncome = income > 0 && budget > income;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32 }}
      >
        <Text style={[styles.h2, { color: C.textPrimary }]}>Your money picture</Text>
        <Text style={[styles.sub, { color: C.textSecondary }]}>
          Sets your monthly budget so we can show what&apos;s safe to spend. Optional, and it
          stays private to you.
        </Text>

        {props.error && <ErrorBanner message={props.error} />}

        {/* Income source */}
        <Text style={[styles.sectionTag, { color: C.textMuted, marginTop: 22 }]}>
          WHERE DOES YOUR MONEY COME FROM?
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {INCOME_SOURCES.map((s) => {
            const selected = props.incomeSource === s.value;
            return (
              <Pressable
                key={s.value}
                onPress={() => props.onIncomeSource(selected ? null : s.value)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 999,
                  backgroundColor: selected ? C.accentLight : C.surface,
                  borderWidth: 1.5,
                  borderColor: selected ? C.accent : C.border,
                }}
              >
                <Text style={{ fontSize: 15 }}>{s.emoji}</Text>
                <Text
                  style={{
                    fontFamily: selected ? 'DMSans_600SemiBold' : 'DMSans_500Medium',
                    fontSize: 13,
                    color: selected ? C.accentDark : C.textPrimary,
                  }}
                >
                  {s.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Amounts */}
        <View style={{ marginTop: 22, gap: 12 }}>
          <BoxInput
            label={`Monthly income (${symbol})`}
            value={props.incomeText}
            onChangeText={props.onIncomeText}
            keyboardType="decimal-pad"
            leadingIcon={
              <Text
                style={{
                  fontFamily: 'DMSans_700Bold',
                  fontSize: 16,
                  color: C.textMuted,
                  minWidth: 18,
                }}
              >
                {symbol}
              </Text>
            }
          />
          <BoxInput
            label={`Monthly spending budget (${symbol})`}
            value={props.budgetText}
            onChangeText={props.onBudgetText}
            keyboardType="decimal-pad"
            leadingIcon={<Wallet size={18} color={C.textMuted} />}
          />
        </View>

        {/* Budget helper: one-tap 80%-of-income suggestion. */}
        {suggested > 0 && budget === 0 && (
          <Pressable
            onPress={() => props.onBudgetText(String(suggested))}
            style={{
              alignSelf: 'flex-start',
              marginTop: 10,
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 999,
              backgroundColor: C.accentLight,
            }}
          >
            <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 12, color: C.accentDark }}>
              Suggest {formatAmount(suggested, props.currency)} (80% of income)
            </Text>
          </Pressable>
        )}

        {overIncome && (
          <Text
            style={{
              fontFamily: 'DMSans_500Medium',
              fontSize: 12,
              color: '#B45309',
              marginTop: 10,
              marginLeft: 4,
              lineHeight: 16,
            }}
          >
            That budget is more than your income. Doable, but worth a second look.
          </Text>
        )}

        <Text
          style={{
            fontFamily: 'DMSans_400Regular',
            fontSize: 12,
            color: C.textMuted,
            marginTop: 12,
            marginLeft: 4,
            lineHeight: 16,
          }}
        >
          The budget becomes this month&apos;s spending cap. Change it any time under
          Expenses.
        </Text>
      </ScrollView>

      <PrimaryFooter
        ctaLabel={filled ? 'Continue' : 'Skip for now'}
        onPress={props.onNext}
        bottomInset={props.bottomInset}
      />
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────────────
 * Step 5 — You're in! Celebration + proof of what was just set up.
 * No quiz: the old personality questions fed nothing but a profile card.
 * Showing the wiring ("here's what we set up") is worth more than a
 * sticker — it answers "did any of that actually do something?"
 * ──────────────────────────────────────────────────────────────────── */

interface YoureInStepProps {
  firstName: string;
  avatarId: string;
  currency: CurrencyCode;
  monthlyIncome: number;
  monthlyBudget: number;
  incomeSource: string | null;
  error: string | null;
  saving: boolean;
  onFinish: () => void;
  bottomInset: number;
}

function YoureInStep(props: YoureInStepProps) {
  const C = useAppTheme();
  const avatar = FREE_AVATARS.find((a) => a.id === props.avatarId) ?? FREE_AVATARS[0];
  const sourceMeta = INCOME_SOURCES.find((s) => s.value === props.incomeSource);

  const setupRows: { emoji: string; text: string }[] = [
    {
      emoji: CURRENCIES[props.currency].flag,
      text: `${props.currency} set as your currency`,
    },
  ];
  if (props.monthlyIncome > 0) {
    setupRows.push({
      emoji: sourceMeta?.emoji ?? '💵',
      text: `${formatAmount(props.monthlyIncome, props.currency)} monthly income logged${sourceMeta ? ` as ${sourceMeta.label}` : ''}`,
    });
  }
  if (props.monthlyBudget > 0) {
    setupRows.push({
      emoji: '💰',
      text: `${formatAmount(props.monthlyBudget, props.currency)} monthly budget set`,
    });
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 }}
      >
        {props.error && <ErrorBanner message={props.error} />}

        <View style={{ alignItems: 'center' }}>
          <AvatarVisual avatar={avatar} size={104} />
          <Text
            style={{
              fontFamily: 'DMSans_500Medium',
              fontSize: 12,
              color: C.accentDark,
              letterSpacing: 1,
              marginTop: 20,
            }}
          >
            {props.firstName ? `${props.firstName.toUpperCase()}, ` : ''}YOU&apos;RE IN
          </Text>
          <Text
            style={{
              fontFamily: 'DMSans_700Bold',
              fontSize: 30,
              lineHeight: 38,
              color: C.textPrimary,
              textAlign: 'center',
              marginTop: 6,
              letterSpacing: -0.4,
            }}
          >
            Ready to stash 🎉
          </Text>
        </View>

        {/* Proof of setup — every onboarding answer maps to something real. */}
        <View
          style={{
            marginTop: 28,
            backgroundColor: C.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: C.border,
            padding: 16,
            gap: 12,
          }}
        >
          <Text
            style={{
              fontFamily: 'DMSans_500Medium',
              fontSize: 11,
              color: C.textMuted,
              letterSpacing: 0.6,
            }}
          >
            HERE&apos;S WHAT WE SET UP
          </Text>
          {setupRows.map((row) => (
            <View key={row.text} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  backgroundColor: C.accentLight,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 15 }}>{row.emoji}</Text>
              </View>
              <Text
                style={{
                  flex: 1,
                  fontFamily: 'DMSans_500Medium',
                  fontSize: 14,
                  color: C.textPrimary,
                  lineHeight: 19,
                }}
              >
                {row.text}
              </Text>
              <Check size={16} color={C.accent} strokeWidth={2.5} />
            </View>
          ))}
          {props.monthlyIncome <= 0 && props.monthlyBudget <= 0 && (
            <Text
              style={{
                fontFamily: 'DMSans_400Regular',
                fontSize: 12,
                color: C.textMuted,
                lineHeight: 17,
              }}
            >
              You can set a budget and log income any time from the Expenses tab.
            </Text>
          )}
        </View>
      </ScrollView>

      <PrimaryFooter
        ctaLabel={props.saving ? '' : 'Start saving'}
        loading={props.saving}
        disabled={props.saving}
        onPress={props.onFinish}
        bottomInset={props.bottomInset}
      />
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────────────
 * Reusable bits
 * ──────────────────────────────────────────────────────────────────── */

interface BoxInputProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: 'default' | 'email-address' | 'decimal-pad';
  autoCapitalize?: 'none' | 'words' | 'sentences';
  autoComplete?:
    | 'email'
    | 'password'
    | 'password-new'
    | 'given-name'
    | 'family-name'
    | 'name';
  secureTextEntry?: boolean;
  returnKeyType?: 'done' | 'next';
  autoFocus?: boolean;
  leadingIcon?: React.ReactNode;
  trailing?: React.ReactNode;
  errored?: boolean;
}

function BoxInput(props: BoxInputProps) {
  const C = useAppTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = props.errored ? '#EF4444' : focused ? C.accent : C.border;

  // Defer autoFocus until the splash has exited. If the screen mounts behind
  // the splash overlay (cold boot landing on a persisted auth route), a raw
  // autoFocus would open the soft keyboard beneath the splash and Android
  // shows the keyboard briefly as the splash fades. On warm navigation
  // splashExited is already true so the effect focuses immediately.
  const inputRef = useRef<TextInput>(null);
  const splashExited = useAppReadyStore((s) => s.splashExited);
  useEffect(() => {
    if (!props.autoFocus) return;
    if (!splashExited) return;
    inputRef.current?.focus();
  }, [props.autoFocus, splashExited]);

  return (
    <View
      style={{
        backgroundColor: C.surface,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor,
        paddingHorizontal: 14,
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      }}
    >
      {props.leadingIcon}
      <TextInput
        ref={inputRef}
        value={props.value}
        onChangeText={props.onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={props.label}
        placeholderTextColor={C.textMuted}
        keyboardType={props.keyboardType}
        autoCapitalize={props.autoCapitalize}
        autoComplete={props.autoComplete}
        secureTextEntry={props.secureTextEntry}
        returnKeyType={props.returnKeyType}
        style={{
          flex: 1,
          fontSize: 16,
          fontFamily: 'DMSans_500Medium',
          color: C.textPrimary,
          padding: 0,
        }}
      />
      {props.trailing}
    </View>
  );
}

function ErrorBanner({ message }: { message: string }) {
  const C = useAppTheme();
  return (
    <View
      style={{
        backgroundColor: C.errorBg,
        borderRadius: 12,
        padding: 12,
        marginTop: 16,
        borderWidth: 1,
        borderColor: C.errorBg,
      }}
    >
      <Text
        numberOfLines={4}
        ellipsizeMode="tail"
        selectable
        style={{
          fontFamily: 'DMSans_500Medium',
          fontSize: 13,
          lineHeight: 18,
          color: C.errorText,
        }}
      >
        {message}
      </Text>
    </View>
  );
}

function HintText({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <Text
      style={{
        fontFamily: 'DMSans_400Regular',
        fontSize: 12,
        color,
        marginTop: 10,
        marginLeft: 4,
      }}
    >
      {children}
    </Text>
  );
}

interface PrimaryFooterProps {
  ctaLabel: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  bottomInset: number;
}

function PrimaryFooter(props: PrimaryFooterProps) {
  const C = useAppTheme();
  return (
    <View
      style={{
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: props.bottomInset + 8,
        backgroundColor: C.pageBg,
      }}
    >
      <Pressable
        onPress={props.onPress}
        disabled={props.disabled}
        style={({ pressed }) => ({
          borderRadius: 16,
          transform: [{ scale: pressed && !props.disabled ? 0.98 : 1 }],
          shadowColor: props.disabled ? 'transparent' : C.heroTop,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.25,
          shadowRadius: 20,
          elevation: props.disabled ? 0 : 6,
        })}
      >
        {/* Brand gradient when actionable — matches the welcome and OTP CTAs
         *  the user just came through. */}
        <LinearGradient
          colors={
            props.disabled
              ? [C.borderLight, C.borderLight, C.borderLight]
              : [C.heroTop, C.heroMid, C.heroBot]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{
            borderRadius: 16,
            overflow: 'hidden',
            paddingVertical: 18,
            paddingHorizontal: 24,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          {props.loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text
                allowFontScaling={false}
                style={{
                  fontFamily: 'DMSans_700Bold',
                  fontSize: 16,
                  color: props.disabled ? C.textMuted : '#FFFFFF',
                  letterSpacing: 0.2,
                }}
              >
                {props.ctaLabel}
              </Text>
              {!props.disabled && <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.5} />}
            </>
          )}
        </LinearGradient>
      </Pressable>
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────────────
 * Styles
 * ──────────────────────────────────────────────────────────────────── */

const styles = {
  h1: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 28,
    letterSpacing: -0.5,
  } as const,
  h2: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 24,
    letterSpacing: -0.4,
  } as const,
  sub: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    marginTop: 6,
    lineHeight: 21,
  } as const,
  sectionTag: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    letterSpacing: 0.5,
    marginBottom: 8,
  } as const,
};
