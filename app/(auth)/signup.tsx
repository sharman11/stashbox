import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ArrowRight,
  Check,
  ChevronLeft,
  Coins,
  GraduationCap,
  Heart,
  Smile,
  Sparkles,
  Target,
  User as UserIcon,
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
import { CURRENCIES, type CurrencyCode, getPracticalNotes } from '@/lib/currency';
import { suggestCols } from '@/lib/grid';
import { detectLocaleCurrency } from '@/lib/locale-currency';
import { useAppReadyStore } from '@/lib/stores/app-ready';
import { useAvatarStore } from '@/lib/stores/avatar';
import { useLoansStore } from '@/lib/stores/loans';
import { useMoneyboxesStore } from '@/lib/stores/moneyboxes';
import { useProfileStore } from '@/lib/stores/profile';
import { useSessionStore } from '@/lib/stores/session';
import { useAppTheme } from '@/lib/stores/theme';

/* ──────────────────────────────────────────────────────────────────────
 * Constants
 * ──────────────────────────────────────────────────────────────────── */

const FREE_AVATARS = AVATARS.filter((a) => a.category === 'og');
const NAME_MAX = 48;
const GOAL_NAME_MAX = 32;
const LOAN_NAME_MAX = 24;

type StepId = 1 | 2 | 3 | 4 | 5 | 6;
const TOTAL_STEPS = 6;

interface StepMeta {
  id: StepId;
  label: string;
  Icon: typeof UserIcon;
}

const STEPS: readonly StepMeta[] = [
  { id: 1, label: 'Your name', Icon: UserIcon },
  { id: 2, label: 'Pick avatar', Icon: Smile },
  { id: 3, label: 'Currency', Icon: Coins },
  { id: 4, label: 'First goal', Icon: Target },
  { id: 5, label: 'Loans', Icon: GraduationCap },
  { id: 6, label: "You're in!", Icon: Heart },
];

interface QuizOption {
  emoji: string;
  label: string;
  value: string;
}

const QUIZ_Q1: QuizOption[] = [
  { emoji: '🐇', label: 'Sprint saver', value: 'sprint' },
  { emoji: '🐢', label: 'Steady & slow', value: 'steady' },
  { emoji: '🎲', label: 'Whenever I feel like it', value: 'random' },
];

const QUIZ_Q2: QuizOption[] = [
  { emoji: '🎯', label: 'One big goal', value: 'focused' },
  { emoji: '🧺', label: 'Multiple small goals', value: 'multi' },
  { emoji: '🤷', label: 'Not sure yet', value: 'unsure' },
];

const PERSONALITY_MAP: Record<string, { type: string; emoji: string; desc: string }> = {
  'sprint-focused': { type: 'The Laser', emoji: '🎯', desc: 'You lock in hard and get it done fast.' },
  'sprint-multi': { type: 'The Juggler', emoji: '🤹', desc: 'Fast pace, many plates spinning. Impressive!' },
  'sprint-unsure': { type: 'The Sprinter', emoji: '🏃', desc: 'Quick bursts of saving energy. Channel it!' },
  'steady-focused': { type: 'The Builder', emoji: '🧱', desc: 'Brick by brick, you never miss a day.' },
  'steady-multi': { type: 'The Gardener', emoji: '🌱', desc: 'Patiently growing multiple savings at once.' },
  'steady-unsure': { type: 'The Turtle', emoji: '🐢', desc: 'Slow and steady wins the race.' },
  'random-focused': { type: 'The Wildcard', emoji: '🃏', desc: 'Unpredictable, but when you save, you save big.' },
  'random-multi': { type: 'The Explorer', emoji: '🧭', desc: 'Trying everything, saving everywhere.' },
  'random-unsure': { type: 'The Free Spirit', emoji: '🦋', desc: 'No plan needed. You save when it feels right.' },
};

type Step6Sub = 'quiz' | 'reveal';

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
  const createMoneybox = useMoneyboxesStore((s) => s.create);
  const createLoan = useLoansStore((s) => s.create);
  const profile = useProfileStore((s) => s.profile);

  // Account creation now happens in /(auth)/email-otp before the user
  // reaches this screen. The signup stepper is purely the post-auth
  // onboarding (name, avatar, currency, goal, loans, you're in).
  //
  // Pre-seed the name field if the user is resuming a previously-saved
  // partial profile.
  const seededName = useMemo(() => profile?.displayName ?? '', [profile?.displayName]);

  // ── stepper state ──
  const [step, setStep] = useState<StepId>(1);
  const [step6Sub, setStep6Sub] = useState<Step6Sub>('quiz');

  // ── Step 1: Name ──
  const [name, setName] = useState(seededName);

  // ── Step 2: Avatar ──
  const [avatarId, setAvatarId] = useState<string>(DEFAULT_AVATAR.id);

  // ── Step 3: Currency ──
  const localeDefault = useMemo(() => detectLocaleCurrency(), []);
  const [currencies, setCurrencies] = useState<CurrencyCode[]>([localeDefault]);
  const primaryCurrency = currencies[0] ?? localeDefault;

  // ── Step 4: Goal ──
  const [goalName, setGoalName] = useState('');
  const [goalAmountText, setGoalAmountText] = useState('');

  // ── Step 5: Loans ──
  const [loanNickname, setLoanNickname] = useState('');
  const [loanBalanceText, setLoanBalanceText] = useState('');
  const [loanMonthlyText, setLoanMonthlyText] = useState('');

  // ── Step 6: Quiz ──
  const [q1, setQ1] = useState<string | null>(null);
  const [q2, setQ2] = useState<string | null>(null);

  // ── async ──
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── derived ──
  const trimmedName = name.trim();
  // First word for greetings ("Welcome, John!"); falls back to the full name
  // for single-word entries and to empty for blank.
  const displayFirst = trimmedName.split(/\s+/)[0] ?? '';
  const step1Valid = trimmedName.length > 0;
  const personality =
    q1 && q2 ? PERSONALITY_MAP[`${q1}-${q2}`] ?? PERSONALITY_MAP['steady-unsure'] : null;

  // Goal: a partial fill counts as a "skip" — only create if both name AND amount
  // are present and valid. Either of those missing → quietly skip.
  const goalAmount = Number(goalAmountText.replace(/[^0-9.]/g, ''));
  const goalReady = goalName.trim().length > 0 && goalAmount > 0;

  // Loan: same rule — must have nickname + balance + monthly.
  const loanBalance = Number(loanBalanceText.replace(/[^0-9.]/g, ''));
  const loanMonthly = Number(loanMonthlyText.replace(/[^0-9.]/g, ''));
  const loanReady =
    loanNickname.trim().length > 0 && loanBalance > 0 && loanMonthly > 0;

  // ── navigation ──
  const goNext = () => {
    setError(null);
    if (step < TOTAL_STEPS) setStep((step + 1) as StepId);
  };

  const onStep1Next = () => {
    if (!step1Valid) return;
    goNext();
  };

  const onStep6QuizNext = () => {
    if (!personality) return;
    setStep6Sub('reveal');
  };

  // Finalize: persists name + avatar + currencies + personality, plus the
  // optional moneybox and loan. Errors from moneybox/loan creation are
  // surfaced but don't block onboardingDone — the user can retry from the UI.
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
      if (personality) {
        await AsyncStorage.setItem('stashbox_personality', JSON.stringify(personality));
      }

      if (goalReady && userId) {
        try {
          const targetDays = 30;
          await createMoneybox({
            userId,
            name: goalName.trim(),
            icon: '💰',
            stashSpot: null,
            theme: 'classic_gold',
            currency: primaryCurrency,
            goalAmount,
            targetDays,
            gridCols: suggestCols(targetDays),
            notes: getPracticalNotes(primaryCurrency),
          });
        } catch (e) {
          // Non-fatal: log and continue to home.
          // eslint-disable-next-line no-console
          console.warn('moneybox create failed', e);
        }
      }

      if (loanReady && userId) {
        try {
          await createLoan({
            userId,
            nickname: loanNickname.trim(),
            loanType: 'private',
            servicer: null,
            originalPrincipalCents: Math.round(loanBalance * 100),
            currentBalanceCents: Math.round(loanBalance * 100),
            aprBps: 600,
            aprType: 'fixed',
            termMonthsRemaining: 120,
            monthlyPaymentCents: Math.round(loanMonthly * 100),
            dueDayOfMonth: 1,
            autopayOn: false,
            repaymentPlan: 'standard',
            reminderEnabled: false,
          });
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn('loan create failed', e);
        }
      }

      router.replace('/');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not save profile');
    } finally {
      setSaving(false);
    }
  };

  const onBack = () => {
    if (step === 6 && step6Sub === 'reveal') {
      setStep6Sub('quiz');
      return;
    }
    if (step > 1) {
      setStep((step - 1) as StepId);
    }
  };

  // The user is authenticated by the time they reach this screen, and the
  // auth guard bounces them back here until onboardingDone flips. The X is
  // hidden — only the back chevron is shown, and only between steps.
  const showBack = step > 1 || (step === 6 && step6Sub === 'reveal');

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
          <GoalStep
            currency={primaryCurrency}
            goalName={goalName}
            goalAmountText={goalAmountText}
            onGoalName={(v) => setGoalName(v.slice(0, GOAL_NAME_MAX))}
            onGoalAmountText={setGoalAmountText}
            error={error}
            onNext={goNext}
            bottomInset={bottomInset}
          />
        )}

        {step === 5 && (
          <LoansStep
            currency={primaryCurrency}
            nickname={loanNickname}
            balanceText={loanBalanceText}
            monthlyText={loanMonthlyText}
            onNickname={(v) => setLoanNickname(v.slice(0, LOAN_NAME_MAX))}
            onBalance={setLoanBalanceText}
            onMonthly={setLoanMonthlyText}
            error={error}
            onNext={goNext}
            bottomInset={bottomInset}
          />
        )}

        {step === 6 && (
          <YoureInStep
            sub={step6Sub}
            firstName={displayFirst}
            q1={q1}
            q2={q2}
            onPickQ1={setQ1}
            onPickQ2={setQ2}
            personality={personality}
            error={error}
            saving={saving}
            onQuizNext={onStep6QuizNext}
            onFinish={onFinishOnboarding}
            bottomInset={bottomInset}
          />
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────────────
 * Stepper — 7 circles + caption
 * ──────────────────────────────────────────────────────────────────── */

function Stepper({ step, screenW }: { step: StepId; screenW: number }) {
  const C = useAppTheme();
  const active = STEPS.find((s) => s.id === step) ?? STEPS[0];

  // Sizing: keep circles small enough that 7 fit comfortably on narrow phones.
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
 * Step 3 — Avatar
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
 * Step 4 — Currency
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
 * Step 5 — Saving goal (skippable)
 * ──────────────────────────────────────────────────────────────────── */

interface GoalStepProps {
  currency: CurrencyCode;
  goalName: string;
  goalAmountText: string;
  onGoalName: (v: string) => void;
  onGoalAmountText: (v: string) => void;
  error: string | null;
  onNext: () => void;
  bottomInset: number;
}

function GoalStep(props: GoalStepProps) {
  const C = useAppTheme();
  const symbol = CURRENCIES[props.currency].symbol;
  const filled = props.goalName.trim().length > 0 || props.goalAmountText.trim().length > 0;
  const ctaLabel = filled ? 'Continue' : 'Skip for now';

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32 }}
      >
        <Text style={[styles.h2, { color: C.textPrimary }]}>
          What are you saving for?
        </Text>
        <Text style={[styles.sub, { color: C.textSecondary }]}>
          Set your first stashbox — a goal, a target, and away you go. Optional.
        </Text>

        {props.error && <ErrorBanner message={props.error} />}

        <View style={{ marginTop: 20, gap: 12 }}>
          <BoxInput
            label="Goal name (e.g. Vacation fund)"
            value={props.goalName}
            onChangeText={props.onGoalName}
            autoCapitalize="sentences"
            leadingIcon={<Target size={18} color={C.textMuted} />}
          />
          <BoxInput
            label={`Target amount (${symbol})`}
            value={props.goalAmountText}
            onChangeText={(v) => props.onGoalAmountText(v.replace(/[^0-9.]/g, ''))}
            keyboardType="default"
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
        </View>

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
          We&apos;ll create a moneybox with sensible defaults (30 days, daily fills).
          Tweak everything from the moneybox screen later.
        </Text>
      </ScrollView>

      <PrimaryFooter
        ctaLabel={ctaLabel}
        onPress={props.onNext}
        bottomInset={props.bottomInset}
      />
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────────────
 * Step 6 — Loans (skippable)
 * ──────────────────────────────────────────────────────────────────── */

interface LoansStepProps {
  currency: CurrencyCode;
  nickname: string;
  balanceText: string;
  monthlyText: string;
  onNickname: (v: string) => void;
  onBalance: (v: string) => void;
  onMonthly: (v: string) => void;
  error: string | null;
  onNext: () => void;
  bottomInset: number;
}

function LoansStep(props: LoansStepProps) {
  const C = useAppTheme();
  const symbol = CURRENCIES[props.currency].symbol;
  const filled =
    props.nickname.trim().length > 0 ||
    props.balanceText.trim().length > 0 ||
    props.monthlyText.trim().length > 0;
  const ctaLabel = filled ? 'Continue' : 'Skip for now';

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32 }}
      >
        <Text style={[styles.h2, { color: C.textPrimary }]}>
          Tracking a student loan?
        </Text>
        <Text style={[styles.sub, { color: C.textSecondary }]}>
          We&apos;ll show your payoff timeline alongside your stash. Optional — you can add later.
        </Text>

        {props.error && <ErrorBanner message={props.error} />}

        <View style={{ marginTop: 20, gap: 12 }}>
          <BoxInput
            label="Loan nickname (e.g. Sallie Mae)"
            value={props.nickname}
            onChangeText={props.onNickname}
            autoCapitalize="words"
            leadingIcon={<GraduationCap size={18} color={C.textMuted} />}
          />
          <BoxInput
            label={`Current balance (${symbol})`}
            value={props.balanceText}
            onChangeText={(v) => props.onBalance(v.replace(/[^0-9.]/g, ''))}
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
            label={`Monthly payment (${symbol})`}
            value={props.monthlyText}
            onChangeText={(v) => props.onMonthly(v.replace(/[^0-9.]/g, ''))}
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
        </View>

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
          Defaults to private loan, 6% APR, 10-year standard plan. Edit anything later
          from the loan detail screen.
        </Text>
      </ScrollView>

      <PrimaryFooter
        ctaLabel={ctaLabel}
        onPress={props.onNext}
        bottomInset={props.bottomInset}
      />
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────────────
 * Step 7 — You're in! (quiz → reveal → Start saving)
 * ──────────────────────────────────────────────────────────────────── */

interface YoureInStepProps {
  sub: Step6Sub;
  firstName: string;
  q1: string | null;
  q2: string | null;
  onPickQ1: (v: string) => void;
  onPickQ2: (v: string) => void;
  personality: { type: string; emoji: string; desc: string } | null;
  error: string | null;
  saving: boolean;
  onQuizNext: () => void;
  onFinish: () => void;
  bottomInset: number;
}

function YoureInStep(props: YoureInStepProps) {
  const C = useAppTheme();

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16 }}
      >
        {props.error && <ErrorBanner message={props.error} />}

        {props.sub === 'quiz' && (
          <>
            <Text style={[styles.h2, { color: C.textPrimary }]}>One last thing…</Text>
            <Text style={[styles.sub, { color: C.textSecondary }]}>
              What kind of saver are you? Two quick taps.
            </Text>

            <Text style={[styles.sectionTag, { color: C.textMuted, marginTop: 22 }]}>
              HOW DO YOU LIKE TO SAVE?
            </Text>
            <View style={{ gap: 8 }}>
              {QUIZ_Q1.map((opt) => (
                <QuizRow
                  key={opt.value}
                  option={opt}
                  selected={props.q1 === opt.value}
                  onPress={() => props.onPickQ1(opt.value)}
                />
              ))}
            </View>

            <Text style={[styles.sectionTag, { color: C.textMuted, marginTop: 22 }]}>
              HOW MANY GOALS AT ONCE?
            </Text>
            <View style={{ gap: 8 }}>
              {QUIZ_Q2.map((opt) => (
                <QuizRow
                  key={opt.value}
                  option={opt}
                  selected={props.q2 === opt.value}
                  onPress={() => props.onPickQ2(opt.value)}
                />
              ))}
            </View>
          </>
        )}

        {props.sub === 'reveal' && props.personality && (
          <RevealView firstName={props.firstName} personality={props.personality} />
        )}
      </ScrollView>

      {props.sub === 'quiz' ? (
        <PrimaryFooter
          ctaLabel={props.personality ? 'See my result' : 'Pick both options'}
          disabled={!props.personality}
          onPress={props.onQuizNext}
          bottomInset={props.bottomInset}
        />
      ) : (
        <PrimaryFooter
          ctaLabel={props.saving ? '' : 'Start saving'}
          loading={props.saving}
          disabled={props.saving}
          onPress={props.onFinish}
          bottomInset={props.bottomInset}
        />
      )}
    </View>
  );
}

function RevealView({
  firstName,
  personality,
}: {
  firstName: string;
  personality: { type: string; emoji: string; desc: string };
}) {
  const C = useAppTheme();
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 24 }}>
      <View
        style={{
          backgroundColor: C.accentLight,
          width: 104,
          height: 104,
          borderRadius: 30,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 56 }}>{personality.emoji}</Text>
      </View>
      <Text
        style={{
          fontFamily: 'DMSans_500Medium',
          fontSize: 12,
          color: C.accentDark,
          letterSpacing: 1,
          marginTop: 24,
        }}
      >
        {firstName ? `${firstName.toUpperCase()}, YOU'RE` : "YOU'RE"}
      </Text>
      <Text
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        style={{
          fontFamily: 'DMSans_700Bold',
          fontSize: 32,
          lineHeight: 40,
          color: C.textPrimary,
          textAlign: 'center',
          marginTop: 6,
          paddingHorizontal: 16,
          letterSpacing: -0.4,
        }}
      >
        {personality.type}
      </Text>
      <Text
        style={{
          fontFamily: 'DMSans_400Regular',
          fontSize: 15,
          color: C.textSecondary,
          textAlign: 'center',
          marginTop: 10,
          lineHeight: 22,
          paddingHorizontal: 8,
        }}
      >
        {personality.desc}
      </Text>
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
  keyboardType?: 'default' | 'email-address';
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
          shadowColor: C.buttonPrimaryBg,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: props.disabled ? 0 : 0.25,
          shadowRadius: 20,
          elevation: props.disabled ? 0 : 6,
        })}
      >
        <View
          style={{
            backgroundColor: props.disabled ? C.borderLight : C.buttonPrimaryBg,
            borderRadius: 16,
            paddingVertical: 18,
            paddingHorizontal: 24,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          {props.loading ? (
            <ActivityIndicator color={C.buttonPrimaryText} />
          ) : (
            <>
              <Text
                allowFontScaling={false}
                style={{
                  fontFamily: 'DMSans_700Bold',
                  fontSize: 16,
                  color: props.disabled ? C.textMuted : C.buttonPrimaryText,
                  letterSpacing: 0.2,
                }}
              >
                {props.ctaLabel}
              </Text>
              {!props.disabled && (
                <ArrowRight size={18} color={C.buttonPrimaryText} strokeWidth={2.5} />
              )}
            </>
          )}
        </View>
      </Pressable>
    </View>
  );
}

interface QuizRowProps {
  option: QuizOption;
  selected: boolean;
  onPress: () => void;
}

function QuizRow({ option, selected, onPress }: QuizRowProps) {
  const C = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: C.surface,
        borderRadius: 14,
        padding: 14,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? C.accent : C.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <Text style={{ fontSize: 20 }}>{option.emoji}</Text>
      <Text
        style={{
          fontFamily: 'DMSans_500Medium',
          fontSize: 14,
          color: C.textPrimary,
          flex: 1,
        }}
      >
        {option.label}
      </Text>
      {selected && (
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: C.accent,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Check size={12} color="#FFFFFF" />
        </View>
      )}
    </Pressable>
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
