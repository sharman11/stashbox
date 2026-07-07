import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  AlertCircle,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Lock,
  MapPin,
  Palette,
  PiggyBank,
  Search,
  Target,
  X,
} from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CurrencyPicker } from '@/components/CurrencyPicker';
import { CustomAlert } from '@/components/CustomAlert';
import { IconPicker } from '@/components/IconPicker';
import { SpringPressable } from '@/components/SpringPressable';
import { StashSpotPicker } from '@/components/StashSpotPicker';
import { DEFAULT_STASH_SPOT_ID, STASH_SPOTS, getStashSpot } from '@/lib/stash-spots';

import { AD_UNIT_IDS } from '@/lib/ads';
import { useAdsStore } from '@/lib/stores/ads';
import { useLimitsStore } from '@/lib/stores/limits';
import {
  InterstitialAd,
  AdEventType,
  RewardedAd,
  RewardedAdEventType,
} from '@/lib/ads-placeholder';
import { computeLimits, canCreate, maxForCurrency } from '@/lib/moneybox-limits';
import {
  CURRENCY_LIST,
  MAX_DAYS,
  MIN_DAYS,
  calcAvgPerDay,
  formatAmount,
  getMaxGoal,
  getMinGoal,
  getMinUnit,
  getPracticalMaxNote,
  getPracticalNotes,
  isValidAmount,
  roundToValidAmount,
  validateGoalAndDays,
} from '@/lib/currency';
import type { CurrencyCode } from '@/lib/currency';
import { MAX_COLS, MIN_COLS, suggestCols } from '@/lib/grid';
import { useMoneyboxesStore } from '@/lib/stores/moneyboxes';
import { useProfileStore } from '@/lib/stores/profile';
import { useSessionStore } from '@/lib/stores/session';
import { useAppTheme } from '@/lib/stores/theme';
import { THEMES } from '@/lib/theme';
import { getThemeLockState } from '@/lib/theme-unlocks';
import type { ThemeId } from '@/lib/types';
import { useAlert } from '@/lib/use-alert';

const createInterstitial = InterstitialAd.createForAdRequest(AD_UNIT_IDS.INTERSTITIAL);

const THEME_OPTIONS = Object.values(THEMES);

/** Vault name max length. Mirrors EditMoneyboxModal so users can't exceed
 *  the limit on create and then hit it on edit, and so downstream views
 *  (MoneyboxCard, home rows) all share the same truncation budget. */
const NAME_MAX = 40;

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
];

// Per-currency quick-pick goal presets. Each value is a multiple of the
// currency's smallest note AND <= maxGoal so it always passes validation.
const QUICK_GOALS: Record<string, number[]> = {
  USD: [100, 500, 1000, 2500, 5000],
  EUR: [100, 500, 1000, 2500, 5000],
  GBP: [100, 250, 500, 1000, 2500],
  INR: [5000, 10000, 25000, 50000, 100000],
  AED: [500, 1000, 2500, 5000, 20000],
  SAR: [500, 1000, 2500, 5000, 20000],
  SGD: [200, 500, 1000, 5000, 15000],
  AUD: [200, 500, 1000, 5000, 15000],
  CAD: [200, 500, 1000, 5000, 15000],
  JPY: [10000, 50000, 100000, 500000, 1000000],
  KRW: [100000, 500000, 1000000, 5000000, 15000000],
  IDR: [200000, 500000, 1000000, 5000000, 20000000],
  THB: [2000, 5000, 10000, 50000, 200000],
  PHP: [2000, 5000, 10000, 50000, 200000],
  MYR: [200, 500, 1000, 5000, 20000],
  BDT: [2000, 5000, 10000, 50000, 200000],
  PKR: [2000, 5000, 10000, 50000, 200000],
  LKR: [2000, 5000, 10000, 50000, 200000],
  NPR: [2000, 5000, 10000, 50000, 200000],
  NGN: [1000, 5000, 10000, 50000, 100000],
  KES: [2000, 5000, 10000, 50000, 200000],
  ZAR: [500, 1000, 2500, 10000, 50000],
  BRL: [200, 500, 1000, 5000, 20000],
  DEFAULT: [100, 500, 1000, 5000, 10000],
};

const STEPS = [
  { icon: PiggyBank, label: 'Name' },
  { icon: MapPin, label: 'Stash' },
  { icon: Target, label: 'Goal' },
  { icon: Calendar, label: 'Timeline' },
  { icon: Palette, label: 'Theme' },
] as const;

/* ── Step indicator (Chime style) ──────────────────────────────── */

function StepIndicator({ current }: { current: number }) {
  const C = useAppTheme();
  const ICON_SIZE = 28;
  const ICON_RADIUS = ICON_SIZE / 2;
  // 4px breathing room between the icon edge and the connector start/end.
  const CONNECTOR_GAP = ICON_RADIUS + 4;

  return (
    <View style={{ paddingHorizontal: 16, marginBottom: 18 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        {STEPS.map((s, i) => {
          const done = i < current;
          const active = i === current;
          const Icon = s.icon;
          const isLast = i === STEPS.length - 1;
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center' }}>
              {/* Icon track - circle is centered in the column; the connector
                  to the next step is an absolute bar so it doesn't push the
                  circle off-center. */}
              <View
                style={{
                  width: '100%',
                  height: ICON_SIZE,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {!isLast && (
                  <View
                    style={{
                      position: 'absolute',
                      top: ICON_RADIUS - 1,
                      left: '50%',
                      right: '-50%',
                      marginLeft: CONNECTOR_GAP,
                      marginRight: CONNECTOR_GAP,
                      height: 2,
                      backgroundColor: i < current ? C.accent : C.borderLight,
                    }}
                  />
                )}
                <View
                  style={{
                    width: ICON_SIZE,
                    height: ICON_SIZE,
                    borderRadius: ICON_RADIUS,
                    backgroundColor: done ? C.accent : active ? C.surface : C.borderLight,
                    borderWidth: active ? 2 : 0,
                    borderColor: C.accent,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {done ? (
                    <Check size={13} color="#FFFFFF" />
                  ) : (
                    <Icon size={13} color={active ? C.accent : C.textFaint} />
                  )}
                </View>
              </View>
              <Text
                numberOfLines={1}
                style={{
                  marginTop: 6,
                  fontFamily: active ? 'DMSans_600SemiBold' : 'DMSans_400Regular',
                  fontSize: 10,
                  color: active ? C.textPrimary : C.textMuted,
                  textAlign: 'center',
                  letterSpacing: 0.2,
                }}
              >
                {s.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/* ── Create Screen ─────────────────────────────────────────────── */

export default function CreateScreen() {
  const C = useAppTheme();
  const router = useRouter();
  // Optional deep-link params: may pre-fill the name/goal. All optional.
  const params = useLocalSearchParams<{ name?: string; goal?: string }>();
  const { userId } = useSessionStore();
  const { profile } = useProfileStore();
  const { moneyboxes, create } = useMoneyboxesStore();

  const bonusCurrency = useLimitsStore((s) => s.bonusCurrency);
  const grantBonus = useLimitsStore((s) => s.grantBonus);

  const limits = useMemo(
    () => computeLimits(moneyboxes, bonusCurrency),
    [moneyboxes, bonusCurrency],
  );

  // Drives theme-lock gating (silver = 1+, gold = 2+).
  const completedBoxes = useMemo(
    () => moneyboxes.filter((b) => b.status === 'completed').length,
    [moneyboxes],
  );

  const [unlockInFlight, setUnlockInFlight] = useState<CurrencyCode | null>(null);

  const [step, setStep] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [name, setName] = useState(params.name ? String(params.name).slice(0, NAME_MAX) : '');
  const [icon, setIcon] = useState<string>('💰');
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [stashSpotId, setStashSpotId] = useState<string>(DEFAULT_STASH_SPOT_ID);
  const [stashPickerOpen, setStashPickerOpen] = useState(false);
  const [currency, setCurrencyRaw] = useState<CurrencyCode>(profile?.defaultCurrency ?? 'USD');
  const [currencyPickerOpen, setCurrencyPickerOpen] = useState(false);
  const [goalText, setGoalText] = useState(params.goal ? String(params.goal).replace(/[^0-9]/g, '') : '');
  const [daysText, setDaysText] = useState('');
  const [showAdvancedTimeline, setShowAdvancedTimeline] = useState(false);

  const setCurrency = (code: CurrencyCode) => {
    setCurrencyRaw(code);
    setGoalText('');
    setDaysText('');
    setGridCols(null);
  };

  /** Run a rewarded ad and resolve true if EARNED_REWARD fires. */
  const playRewardedAd = () =>
    new Promise<boolean>((resolve) => {
      const ad = RewardedAd.createForAdRequest(AD_UNIT_IDS.REWARDED);
      let earned = false;
      const unsubLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
        try { ad.show(); } catch { resolve(false); }
      });
      const unsubEarned = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        earned = true;
      });
      const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
        unsubLoaded();
        unsubEarned();
        unsubClosed();
        unsubError();
        resolve(earned);
      });
      const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => {
        unsubLoaded();
        unsubEarned();
        unsubClosed();
        unsubError();
        resolve(false);
      });
      try { ad.load(); } catch { resolve(false); }
    });

  /**
   * Tap handler for currency pills. Only hard-blocks on MAX/FULL states;
   * "Watch ad" / "Switch" states simply select the currency - the ad gate
   * is deferred to the Next button so the user can fill out the name first.
   */
  const handleCurrencyTap = (code: CurrencyCode) => {
    const check = canCreate(limits, code);

    if (check.allowed || check.reason === 'NEED_UNLOCK' || check.reason === 'OTHER_CURRENCY_HAS_BONUS') {
      setCurrency(code);
      return;
    }

    if (check.reason === 'MAX_CURRENCIES') {
      showAlert(
        'Max 3 currencies',
        'You can use up to 3 different currencies. Abandon a stashbox to free up a currency slot.',
        undefined,
        '🚫',
      );
      return;
    }

    if (check.reason === 'CURRENCY_FULL') {
      showAlert(
        `${code} is full`,
        'This currency already has its 2 moneyboxes. Abandon one to create a new moneybox here.',
        undefined,
        '🚫',
      );
      return;
    }
  };

  /**
   * Before leaving step 0, ensure the selected currency is actually creatable.
   * If it requires an ad (NEED_UNLOCK) or a bonus switch, show the ad popup
   * here. Returns true if the user can proceed to step 1.
   */
  const ensureCurrencyUnlocked = (): Promise<boolean> =>
    new Promise((resolve) => {
      const check = canCreate(limits, currency);

      if (check.allowed) {
        resolve(true);
        return;
      }

      if (check.reason === 'MAX_CURRENCIES') {
        showAlert(
          'Max 3 currencies',
          'Pick a different currency - you already have stashboxes in 3 currencies.',
          [{ text: 'OK', onPress: () => resolve(false) }],
          '🚫',
        );
        return;
      }

      if (check.reason === 'CURRENCY_FULL') {
        showAlert(
          `${currency} is full`,
          'This currency already has its 2 moneyboxes. Abandon one to create a new moneybox here.',
          [{ text: 'OK', onPress: () => resolve(false) }],
          '🚫',
        );
        return;
      }

      if (check.reason === 'NEED_UNLOCK') {
        showAlert(
          `Unlock 2nd ${currency} moneybox?`,
          `Watch a short ad to unlock an extra moneybox for ${currency}.`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            {
              text: 'Watch ad',
              onPress: async () => {
                if (!userId) {
                  resolve(false);
                  return;
                }
                setUnlockInFlight(currency);
                const earned = await playRewardedAd();
                setUnlockInFlight(null);
                if (earned) {
                  await grantBonus(currency, userId);
                  resolve(true);
                } else {
                  showAlert(
                    'Ad not completed',
                    'Watch the full ad to unlock the bonus slot.',
                    [{ text: 'OK', onPress: () => resolve(false) }],
                    'ℹ️',
                  );
                }
              },
            },
          ],
          '🎁',
        );
        return;
      }

      if (check.reason === 'OTHER_CURRENCY_HAS_BONUS') {
        showAlert(
          `Move bonus to ${currency}?`,
          `The bonus slot is on ${check.currentBonus}. Watch a short ad to move it to ${currency} instead.`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            {
              text: 'Watch ad',
              onPress: async () => {
                if (!userId) {
                  resolve(false);
                  return;
                }
                setUnlockInFlight(currency);
                const earned = await playRewardedAd();
                setUnlockInFlight(null);
                if (earned) {
                  await grantBonus(currency, userId);
                  resolve(true);
                } else {
                  showAlert(
                    'Ad not completed',
                    'Watch the full ad to switch the bonus slot.',
                    [{ text: 'OK', onPress: () => resolve(false) }],
                    'ℹ️',
                  );
                }
              },
            },
          ],
          '🔄',
        );
        return;
      }

      resolve(false);
    });
  const [gridCols, setGridCols] = useState<number | null>(null);
  const [theme, setTheme] = useState<ThemeId>('classic_gold');
  const [saving, setSaving] = useState(false);
  const { alertConfig, showAlert, dismissAlert } = useAlert();
  const interstitialReady = useRef(false);

  const adsReady = useAdsStore((s) => s.ready);

  useEffect(() => {
    // Wait for the SDK to finish initializing before requesting ads.
    if (!adsReady) return;

    const unsubLoaded = createInterstitial.addAdEventListener(AdEventType.LOADED, () => {
      interstitialReady.current = true;
    });
    const unsubClosed = createInterstitial.addAdEventListener(AdEventType.CLOSED, () => {
      interstitialReady.current = false;
      // Reload so the ad is ready if the user creates another box.
      try { createInterstitial.load(); } catch { /* ignore */ }
    });
    const unsubError = createInterstitial.addAdEventListener(AdEventType.ERROR, () => {
      interstitialReady.current = false;
      // Retry after transient failure.
      setTimeout(() => {
        try { createInterstitial.load(); } catch { /* ignore */ }
      }, 5000);
    });

    try { createInterstitial.load(); } catch { /* ignore initial load failure */ }

    return () => {
      unsubLoaded();
      unsubClosed();
      unsubError();
    };
  }, [adsReady]);

  const goal = Number(goalText.replace(/[^0-9]/g, '')) || 0;
  const days = Number(daysText.replace(/[^0-9]/g, '')) || 0;
  const suggestedCols = days > 0 ? suggestCols(days) : 5;
  const activeCols = gridCols ?? suggestedCols;
  // Use practical notes only (capped at the largest commonly-carried bill) so
  // generated grids never demand a ₹2000 / ¥10000 / $100 the user doesn't have.
  const notes = useMemo(() => getPracticalNotes(currency), [currency]);
  const maxGoal = useMemo(() => getMaxGoal(currency), [currency]);
  const minGoal = useMemo(() => getMinGoal(currency), [currency]);
  const practicalMax = useMemo(() => getPracticalMaxNote(currency), [currency]);
  const quickGoals = QUICK_GOALS[currency] ?? QUICK_GOALS.DEFAULT;

  // Currencies the user has opted into + any currencies that have moneyboxes
  // (active or completed) so users see relevant ones up top; the rest live in
  // the searchable picker behind "All".
  const preferredCurrencyCodes = useMemo<CurrencyCode[]>(() => {
    const set = new Set<CurrencyCode>(profile?.preferredCurrencies ?? []);
    for (const m of moneyboxes) set.add(m.currency);
    if (set.size === 0) set.add('USD');
    return Array.from(set);
  }, [profile?.preferredCurrencies, moneyboxes]);

  const preferredCurrencies = useMemo(
    () => preferredCurrencyCodes.map((code) => CURRENCY_LIST.find((c) => c.code === code)!).filter(Boolean),
    [preferredCurrencyCodes],
  );

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
        icon,
        stashSpot: stashSpotId,
        theme,
        currency,
        goalAmount: goal,
        targetDays: days,
        gridCols: activeCols,
        notes,
      });
      if (interstitialReady.current) {
        try {
          createInterstitial.show();
        } catch {
          // Showing failed (expired, not loaded, etc.) - continue without blocking.
        }
      }
      router.replace(`/box/${newBox.id}`);
    } catch (error: unknown) {
      showAlert('Error', error instanceof Error ? error.message : 'Failed', undefined, '⚠️');
    } finally {
      setSaving(false);
    }
  };

  const canNext0 = name.trim().length > 0;
  const goalValid = isValidAmount(goal, currency);
  const goalInRange = goal >= minGoal && goal <= maxGoal;
  const canNext1 = goalValid && goalInRange;
  const canNext2 = validation?.valid ?? false;
  const minUnit = getMinUnit(currency);
  const suggestedRoundedGoal = goal > 0 ? roundToValidAmount(goal, currency) : 0;
  const currencyAllowed = canCreate(limits, currency).allowed;

  return (
    <View style={{ flex: 1, backgroundColor: C.pageBg }}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Header: back (when not on step 0) + close */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 56,
            paddingBottom: 8,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {step > 0 ? (
            <SpringPressable
              onPress={() => setStep((step - 1) as 0 | 1 | 2 | 3 | 4)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingVertical: 6,
                paddingRight: 8,
              }}
            >
              <ChevronLeft size={20} color={C.textPrimary} />
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: C.textPrimary }}>
                Back
              </Text>
            </SpringPressable>
          ) : (
            <View style={{ width: 36 }} />
          )}
          <SpringPressable
            onPress={() => router.back()}
            style={{
              width: 36,
              height: 36,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={22} color={C.textPrimary} />
          </SpringPressable>
        </View>

        {/* Step indicator */}
        <StepIndicator current={step} />

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
          // Keep tapping currency pills / preset cards working while the
          // name field has the keyboard up. Without "handled", the first
          // tap is consumed by the keyboard dismiss.
          keyboardShouldPersistTaps="handled"
        >
          {/* ═══════════════════════════════════════════ */}
          {/* Step 0: Name + Currency                     */}
          {/* ═══════════════════════════════════════════ */}
          {step === 0 && (
            <View style={{ gap: 18 }}>
              <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 26, color: C.textPrimary }}>
                Name your moneybox
              </Text>

              {/* Quick picks — small pill chips in a horizontal scroll at the
                  top. Tap one to fill both the name and icon in a single tap. */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ gap: 8, paddingRight: 4 }}
              >
                {GOAL_TEMPLATES.map((t) => {
                    const selected = name === t.label;
                    return (
                      <Pressable
                        key={t.label}
                        onPress={() => {
                          setName(t.label);
                          setIcon(t.icon);
                        }}
                        style={{
                          backgroundColor: selected ? C.buttonPrimaryBg : C.surface,
                          borderRadius: 999,
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          borderWidth: 1,
                          borderColor: selected ? C.buttonPrimaryBg : C.border,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                        }}
                      >
                        <Text style={{ fontSize: 14 }}>{t.icon}</Text>
                        <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: selected ? C.buttonPrimaryText : C.textPrimary }}>
                          {t.label}
                        </Text>
                      </Pressable>
                    );
                  })}
              </ScrollView>

              {/* Name input — tap the icon tile to change the emoji. */}
              <View>
                <View
                  style={{
                    backgroundColor: C.surface,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: C.border,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <Pressable
                    onPress={() => setIconPickerOpen(true)}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      backgroundColor: C.borderLight,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 24 }}>{icon}</Text>
                  </Pressable>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: C.textMuted, marginBottom: 2 }}>
                      Name · tap icon to change
                    </Text>
                    <TextInput
                      value={name}
                      // Defensive slice in addition to maxLength — Android
                      // autofill / IME paste can occasionally bypass maxLength.
                      onChangeText={(v) => setName(v.slice(0, NAME_MAX))}
                      placeholder="Name your stashbox"
                      placeholderTextColor={C.textFaint}
                      maxLength={NAME_MAX}
                      style={{
                        fontSize: 16,
                        fontFamily: 'DMSans_500Medium',
                        color: C.textPrimary,
                        padding: 0,
                      }}
                    />
                  </View>
                </View>
                {name.length > 0 && (
                  <Text
                    style={{
                      fontFamily: 'DMSans_400Regular',
                      fontSize: 11,
                      color: name.length >= NAME_MAX ? '#EF4444' : C.textMuted,
                      marginTop: 4,
                      textAlign: 'right',
                    }}
                  >
                    {name.length}/{NAME_MAX}
                  </Text>
                )}
              </View>

              {/* Currency — pick one for this stashbox. The slot meter shows
                  the "up to 3 currencies" budget; quick chips cover the user's
                  currencies, and "All" opens the searchable picker. */}
              <View>
                <Text
                  style={{
                    fontFamily: 'DMSans_500Medium',
                    fontSize: 11,
                    color: C.textMuted,
                    letterSpacing: 0.5,
                    marginBottom: 10,
                  }}
                >
                  CURRENCY
                </Text>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ gap: 8, paddingRight: 4 }}
                >
                  {preferredCurrencies.map((c) => (
                    <CurrencyPill
                      key={c.code}
                      code={c.code}
                      flag={c.flag}
                      selected={currency === c.code}
                      limits={limits}
                      unlockInFlight={unlockInFlight}
                      onPress={handleCurrencyTap}
                    />
                  ))}
                  <SpringPressable
                    onPress={() => setCurrencyPickerOpen(true)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderWidth: 1,
                      borderColor: C.border,
                      borderStyle: 'dashed',
                    }}
                  >
                    <Search size={13} color={C.accent} />
                    <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: C.accent }}>
                      All
                    </Text>
                  </SpringPressable>
                </ScrollView>
              </View>

            </View>
          )}

          {/* ═══════════════════════════════════════════ */}
          {/* Step 1: Stash spot - answers "where IS the money?" */}
          {/* ═══════════════════════════════════════════ */}
          {step === 1 && (
            <View style={{ gap: 16 }}>
              <View>
                <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 26, color: C.textPrimary }}>
                  Where will the cash live?
                </Text>
                <Text
                  style={{
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 14,
                    color: C.textSecondary,
                    marginTop: 6,
                    lineHeight: 20,
                  }}
                >
                  Stashbox tracks. You stash. Pick a real spot you&apos;ll go back to every time.
                </Text>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {STASH_SPOTS.map((spot) => {
                  const selected = spot.id === stashSpotId;
                  return (
                    <Pressable
                      key={spot.id}
                      onPress={() => setStashSpotId(spot.id)}
                      style={{
                        width: '31.5%',
                        backgroundColor: C.surface,
                        borderRadius: 14,
                        paddingVertical: 14,
                        paddingHorizontal: 6,
                        borderWidth: selected ? 2 : 1,
                        borderColor: selected ? C.accent : C.border,
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Text style={{ fontSize: 28 }}>{spot.emoji}</Text>
                      <Text
                        style={{
                          fontFamily: 'DMSans_500Medium',
                          fontSize: 11,
                          color: C.textPrimary,
                          textAlign: 'center',
                        }}
                        numberOfLines={1}
                      >
                        {spot.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Tip for the selected spot */}
              {(() => {
                const tip = getStashSpot(stashSpotId)?.tip;
                if (!tip) return null;
                return (
                  <View
                    style={{
                      backgroundColor: C.accentLight,
                      borderRadius: 14,
                      padding: 14,
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      gap: 10,
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>💡</Text>
                    <Text
                      style={{
                        flex: 1,
                        fontFamily: 'DMSans_500Medium',
                        fontSize: 13,
                        color: C.accentDark,
                        lineHeight: 19,
                      }}
                    >
                      {tip}
                    </Text>
                  </View>
                );
              })()}
            </View>
          )}

          {/* ═══════════════════════════════════════════ */}
          {/* Step 2: Goal amount                         */}
          {/* ═══════════════════════════════════════════ */}
          {step === 2 && (
            <View style={{ gap: 18 }}>
              <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 26, color: C.textPrimary }}>
                How much to save?
              </Text>

              {/* Amount input */}
              <View
                style={{
                  backgroundColor: C.surface,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: goal > 0 && !goalValid ? '#FCA5A5' : C.border,
                  paddingHorizontal: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 24, color: C.textMuted }}>
                  {CURRENCY_LIST.find((c) => c.code === currency)?.symbol}
                </Text>
                <TextInput
                  value={goalText}
                  onChangeText={(v) => setGoalText(v.replace(/[^0-9]/g, ''))}
                  onBlur={() => {
                    if (goal > 0 && !goalValid) {
                      setGoalText(String(suggestedRoundedGoal));
                    }
                  }}
                  placeholder="0"
                  keyboardType="number-pad"
                  placeholderTextColor={C.textFaint}
                  style={{ flex: 1, fontSize: 28, fontFamily: 'DMSans_700Bold', color: C.textPrimary, paddingVertical: 14, paddingLeft: 8 }}
                  autoFocus
                />
                {goalText.length > 0 && (
                  <Pressable
                    onPress={() => setGoalText('')}
                    hitSlop={10}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: C.borderLight,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <X size={14} color={C.textMuted} />
                  </Pressable>
                )}
              </View>

              {/* Cap helper - always visible so users see the range upfront */}
              <Text
                style={{
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 11,
                  color: C.textMuted,
                  marginTop: -10,
                }}
              >
                {formatAmount(minGoal, currency)} – {formatAmount(maxGoal, currency)} · biggest cell {formatAmount(practicalMax, currency)}
              </Text>

              {/* Out-of-range validation (over the cap or below the floor) */}
              {goal > 0 && !goalInRange && (
                <View
                  style={{
                    backgroundColor: '#FEF2F2',
                    borderRadius: 14,
                    padding: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <AlertCircle size={16} color="#EF4444" />
                  <Text
                    style={{
                      fontFamily: 'DMSans_400Regular',
                      fontSize: 12,
                      color: '#DC2626',
                      flex: 1,
                      lineHeight: 18,
                    }}
                  >
                    {goal > maxGoal
                      ? `Stashbox tops out at ${formatAmount(maxGoal, currency)} per moneybox.`
                      : `Aim for at least ${formatAmount(minGoal, currency)}.`}
                  </Text>
                  <Pressable
                    onPress={() => setGoalText(String(goal > maxGoal ? maxGoal : minGoal))}
                  >
                    <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 12, color: '#DC2626' }}>
                      Use {formatAmount(goal > maxGoal ? maxGoal : minGoal, currency)}
                    </Text>
                  </Pressable>
                </View>
              )}

              {/* Multiple-of-min-unit validation */}
              {goal > 0 && goalInRange && !goalValid && (
                <View style={{ backgroundColor: '#FEF2F2', borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <AlertCircle size={16} color="#EF4444" />
                  <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#DC2626', flex: 1, lineHeight: 18 }}>
                    Enter a multiple of {formatAmount(minUnit, currency)}.
                  </Text>
                  <Pressable onPress={() => setGoalText(String(suggestedRoundedGoal))}>
                    <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 12, color: '#DC2626' }}>
                      Round to {formatAmount(suggestedRoundedGoal, currency)}
                    </Text>
                  </Pressable>
                </View>
              )}

              {/* Quick goal presets */}
              <View>
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 11, color: C.textMuted, letterSpacing: 0.5, marginBottom: 8 }}>
                  COMMON GOALS
                </Text>
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
                        // Cap pill width so JPY 1,000,000 doesn't blow out
                        // the row and force the next pill onto a new line
                        // by itself.
                        maxWidth: '48%',
                      }}
                    >
                      <Text
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        adjustsFontSizeToFit
                        minimumFontScale={0.85}
                        style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: goal === q ? '#FFFFFF' : C.textPrimary }}
                      >
                        {formatAmount(q, currency)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

            </View>
          )}

          {/* ═══════════════════════════════════════════ */}
          {/* Step 3: Days + validation                   */}
          {/* ═══════════════════════════════════════════ */}
          {step === 3 && (
            <View style={{ gap: 18 }}>
              <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 26, color: C.textPrimary }}>
                Over how many days?
              </Text>

              <View
                style={{
                  backgroundColor: C.surface,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: validation && !validation.valid ? '#FCA5A5' : C.border,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                }}
              >
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: C.textMuted, marginBottom: 4 }}>
                  Days · 1 cell = 1 day
                </Text>
                <TextInput
                  value={daysText}
                  // Clamp on each keystroke so a stray "2000" can't even
                  // momentarily produce a 2000-cell grid in the validation pass.
                  onChangeText={(v) => {
                    const digits = v.replace(/[^0-9]/g, '');
                    if (digits === '') {
                      setDaysText('');
                      return;
                    }
                    const n = Math.min(MAX_DAYS, Number(digits));
                    setDaysText(String(n));
                  }}
                  placeholder="e.g. 100"
                  keyboardType="number-pad"
                  placeholderTextColor={C.textFaint}
                  maxLength={String(MAX_DAYS).length}
                  style={{
                    fontSize: 22,
                    fontFamily: 'DMSans_700Bold',
                    color: C.textPrimary,
                    padding: 0,
                  }}
                  autoFocus
                />
              </View>

              <Text
                style={{
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 11,
                  color: C.textMuted,
                  marginTop: -10,
                }}
              >
                {MIN_DAYS}–{MAX_DAYS} days · longer goals split better across multiple moneyboxes
              </Text>

              {/* Single-line confirm or validation message */}
              {validation && !validation.valid && (
                <View
                  style={{
                    backgroundColor: '#FEF2F2',
                    borderRadius: 12,
                    padding: 12,
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: 8,
                  }}
                >
                  <AlertCircle size={16} color="#EF4444" style={{ marginTop: 1 }} />
                  <Text
                    style={{
                      fontFamily: 'DMSans_400Regular',
                      fontSize: 13,
                      color: '#DC2626',
                      flex: 1,
                      lineHeight: 18,
                    }}
                  >
                    {validation.message}
                  </Text>
                </View>
              )}

              {validation?.valid && days > 0 && (
                <Text
                  style={{
                    fontFamily: 'DMSans_500Medium',
                    fontSize: 13,
                    color: C.textSecondary,
                    lineHeight: 19,
                  }}
                >
                  ~<Text style={{ fontFamily: 'DMSans_700Bold', color: C.accent }}>
                    {formatAmount(calcAvgPerDay(goal, days), currency)}
                  </Text>
                  /day · {formatDate(new Date())} → {formatDate(addDays(new Date(), days))}
                </Text>
              )}

              {/* Advanced - hidden by default; column tuning is niche */}
              {validation?.valid && days > 0 && (
                <View>
                  <SpringPressable
                    onPress={() => setShowAdvancedTimeline((v) => !v)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  >
                    <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: C.accent }}>
                      {showAdvancedTimeline ? 'Hide grid layout' : 'Customize grid layout'}
                    </Text>
                    {showAdvancedTimeline ? (
                      <ChevronUp size={12} color={C.accent} />
                    ) : (
                      <ChevronDown size={12} color={C.accent} />
                    )}
                  </SpringPressable>

                  {showAdvancedTimeline && (
                    <View style={{ marginTop: 10 }}>
                      <Text
                        style={{
                          fontFamily: 'DMSans_400Regular',
                          fontSize: 11,
                          color: C.textMuted,
                          marginBottom: 6,
                        }}
                      >
                        Columns · auto picks {suggestedCols} ({Math.ceil(days / activeCols)}×{activeCols})
                      </Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                        {Array.from({ length: MAX_COLS - MIN_COLS + 1 }, (_, i) => i + MIN_COLS).map((c) => {
                          const selected = activeCols === c;
                          return (
                            <Pressable
                              key={c}
                              onPress={() => setGridCols(c === suggestedCols ? null : c)}
                              style={{
                                backgroundColor: selected ? C.buttonPrimaryBg : C.surface,
                                borderRadius: 10,
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                borderWidth: 1,
                                borderColor: selected ? C.buttonPrimaryBg : C.border,
                                minWidth: 38,
                                alignItems: 'center',
                              }}
                            >
                              <Text
                                style={{
                                  fontFamily: 'DMSans_600SemiBold',
                                  fontSize: 13,
                                  color: selected ? C.buttonPrimaryText : C.textPrimary,
                                }}
                              >
                                {c}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {/* ═══════════════════════════════════════════ */}
          {/* Step 4: Theme + confirm                     */}
          {/* ═══════════════════════════════════════════ */}
          {step === 4 && (
            <View style={{ gap: 18 }}>
              <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 26, color: C.textPrimary }}>
                Pick a look
              </Text>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {THEME_OPTIONS.map((t) => {
                  const lock = getThemeLockState(t.id, completedBoxes);
                  return (
                    <View key={t.id} style={{ width: '48%', flexGrow: 1 }}>
                      <ThemeCard
                        theme={t}
                        selected={theme === t.id}
                        unlocked={lock.unlocked}
                        requirementLabel={lock.requirementLabel}
                        onPress={() => {
                          if (lock.unlocked) setTheme(t.id);
                        }}
                      />
                    </View>
                  );
                })}
              </View>

              {/* Summary - name + goal + days only */}
              <View
                style={{
                  backgroundColor: C.surface,
                  borderRadius: 14,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: C.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <Text style={{ fontSize: 28 }}>{icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: 'DMSans_600SemiBold',
                      fontSize: 15,
                      color: C.textPrimary,
                    }}
                    numberOfLines={1}
                  >
                    {name || 'Your stashbox'}
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'DMSans_400Regular',
                      fontSize: 12,
                      color: C.textMuted,
                      marginTop: 2,
                    }}
                  >
                    {formatAmount(goal, currency)} · {days} days
                  </Text>
                </View>
              </View>

            </View>
          )}
        </ScrollView>

        {/* Fixed bottom button */}
        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 36, backgroundColor: C.pageBg }}>
          {step === 0 && (
            <Pressable
              onPress={async () => {
                if (!canNext0) {
                  showAlert('Name required', 'Give your stashbox a name before continuing.', undefined, '✏️');
                  return;
                }
                const unlocked = await ensureCurrencyUnlocked();
                if (unlocked) setStep(1);
              }}
              style={{
                backgroundColor: canNext0 ? C.buttonPrimaryBg : C.borderLight,
                borderRadius: 14,
                paddingVertical: 16,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 16, color: canNext0 ? C.buttonPrimaryText : C.textFaint }}>
                Next
              </Text>
            </Pressable>
          )}
          {step === 1 && (
            <Pressable
              onPress={() => setStep(2)}
              style={{
                backgroundColor: C.buttonPrimaryBg,
                borderRadius: 14,
                paddingVertical: 16,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 16, color: C.buttonPrimaryText }}>
                Next
              </Text>
            </Pressable>
          )}
          {step === 2 && (
            <Pressable
              onPress={() => {
                if (goal <= 0) {
                  showAlert('Goal required', 'Enter how much you want to save.', undefined, '💰');
                  return;
                }
                if (goal > maxGoal) {
                  showAlert(
                    'Too big for one stashbox',
                    `Stashbox tops out at ${formatAmount(maxGoal, currency)} per moneybox. Split larger goals across multiple boxes, or use a bank account.`,
                    undefined,
                    '🚫',
                  );
                  return;
                }
                if (goal < minGoal) {
                  showAlert(
                    'Too small to track',
                    `Aim for at least ${formatAmount(minGoal, currency)} - anything smaller isn't worth a whole moneybox.`,
                    undefined,
                    'ℹ️',
                  );
                  return;
                }
                if (!goalValid) {
                  showAlert(
                    'Invalid amount',
                    `${formatAmount(goal, currency)} isn't a valid ${currency} amount. Use a multiple of ${formatAmount(minUnit, currency)}.`,
                    undefined,
                    '⚠️',
                  );
                  return;
                }
                setStep(3);
              }}
              style={{
                backgroundColor: canNext1 ? C.buttonPrimaryBg : C.borderLight,
                borderRadius: 14,
                paddingVertical: 16,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 16, color: canNext1 ? C.buttonPrimaryText : C.textFaint }}>
                Next
              </Text>
            </Pressable>
          )}
          {step === 3 && (
            <Pressable
              onPress={() => {
                if (!days) { showAlert('Days required', 'Enter how many days you want to save for.', undefined, '📅'); return; }
                if (!validation?.valid) { showAlert('Not possible', validation?.message ?? 'Check your inputs.', undefined, '⚠️'); return; }
                setStep(4);
              }}
              style={{
                backgroundColor: canNext2 ? C.buttonPrimaryBg : C.borderLight,
                borderRadius: 14,
                paddingVertical: 16,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 16, color: canNext2 ? C.buttonPrimaryText : C.textFaint }}>
                Next
              </Text>
            </Pressable>
          )}
          {step === 4 && (
            <>
              <Pressable
                onPress={onCreate}
                disabled={saving || !currencyAllowed}
                style={{
                  backgroundColor: currencyAllowed ? C.buttonPrimaryBg : C.borderLight,
                  borderRadius: 14,
                  paddingVertical: 16,
                  alignItems: 'center',
                }}
              >
                <Text
                  allowFontScaling={false}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                  style={{
                    fontFamily: 'DMSans_600SemiBold',
                    fontSize: 16,
                    color: currencyAllowed ? C.buttonPrimaryText : C.textFaint,
                  }}
                >
                  {saving
                    ? 'Creating...'
                    : currencyAllowed
                      ? 'Create stashbox'
                      : 'Limit reached for this currency'}
                </Text>
              </Pressable>
              {!currencyAllowed && (
                <Text
                  style={{
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 12,
                    color: C.textMuted,
                    textAlign: 'center',
                    marginTop: 8,
                  }}
                >
                  Go back and pick a different currency, or watch an ad to unlock.
                </Text>
              )}
            </>
          )}
        </View>
      </KeyboardAvoidingView>
      <CustomAlert config={alertConfig} onDismiss={dismissAlert} />
      <IconPicker
        visible={iconPickerOpen}
        current={icon}
        onSelect={(emoji) => {
          setIcon(emoji);
          setIconPickerOpen(false);
        }}
        onCancel={() => setIconPickerOpen(false)}
      />
      <StashSpotPicker
        visible={stashPickerOpen}
        current={stashSpotId}
        onSelect={(id) => {
          setStashSpotId(id);
          setStashPickerOpen(false);
        }}
        onCancel={() => setStashPickerOpen(false)}
      />
      <CurrencyPicker
        visible={currencyPickerOpen}
        current={currency}
        limits={limits}
        onSelect={(code) => {
          // Reuse the same tap logic as the inline chips: selects the currency
          // (ad-gated currencies are selected here and the ad fires on Next).
          handleCurrencyTap(code);
          setCurrencyPickerOpen(false);
        }}
        onCancel={() => setCurrencyPickerOpen(false)}
      />
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

interface CurrencyPillProps {
  code: CurrencyCode;
  flag: string;
  selected: boolean;
  limits: ReturnType<typeof computeLimits>;
  unlockInFlight: CurrencyCode | null;
  onPress: (code: CurrencyCode) => void;
}

function CurrencyPill({ code, flag, selected, limits, unlockInFlight, onPress }: CurrencyPillProps) {
  const C = useAppTheme();
  const check = canCreate(limits, code);
  const count = limits.countPerCurrency.get(code) ?? 0;
  const max = maxForCurrency(limits, code);
  const isBonus = limits.bonusCurrency === code;
  const disabled = !check.allowed && check.reason === 'MAX_CURRENCIES';

  let statusTag = '';
  if (unlockInFlight === code) statusTag = 'Loading…';
  else if (check.allowed) {
    if (count > 0) statusTag = `${count}/${max}`;
  } else if (check.reason === 'NEED_UNLOCK') statusTag = 'Watch ad';
  else if (check.reason === 'OTHER_CURRENCY_HAS_BONUS') statusTag = 'Switch';
  else if (check.reason === 'CURRENCY_FULL') statusTag = 'Full';
  else if (check.reason === 'MAX_CURRENCIES') statusTag = 'Max';

  return (
    <Pressable
      onPress={() => onPress(code)}
      disabled={disabled}
      style={{
        backgroundColor: selected ? C.buttonPrimaryBg : disabled ? C.borderLight : C.surface,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderWidth: selected ? 0 : 1,
        borderColor: isBonus && !selected ? C.accent : C.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <Text allowFontScaling={false} style={{ fontSize: 16 }}>{flag}</Text>
      <Text
        allowFontScaling={false}
        numberOfLines={1}
        style={{
          fontFamily: 'DMSans_600SemiBold',
          fontSize: 13,
          color: selected ? C.buttonPrimaryText : disabled ? C.textMuted : C.textPrimary,
        }}
      >
        {code}
      </Text>
      {isBonus && !selected && <Text allowFontScaling={false} style={{ fontSize: 11 }}>⭐</Text>}
      {statusTag ? (
        <Text
          allowFontScaling={false}
          numberOfLines={1}
          style={{
            fontFamily: 'DMSans_500Medium',
            fontSize: 10,
            color: selected ? C.buttonPrimaryText : C.textMuted,
            marginLeft: 2,
            opacity: selected ? 0.7 : 1,
          }}
        >
          · {statusTag}
        </Text>
      ) : null}
    </Pressable>
  );
}

/* ── Theme card with rich preview ─────────────────────────────── */

type ThemePalette = (typeof THEMES)[ThemeId];

interface ThemeCardProps {
  theme: ThemePalette;
  selected: boolean;
  unlocked: boolean;
  requirementLabel: string | null;
  onPress: () => void;
}

function ThemeCard({ theme: t, selected, unlocked, requirementLabel, onPress }: ThemeCardProps) {
  const C = useAppTheme();
  const gradientColors: readonly [string, string, ...string[]] = t.heroGradientMid
    ? [t.heroGradientStart, t.heroGradientMid, t.heroGradientEnd]
    : [t.heroGradientStart, t.heroGradientEnd];

  // Decoration emojis sprinkled in the gradient (only when the theme has them).
  const decorationEmojis = t.decoration?.emojis ?? [];
  const decorationSpots: { left: `${number}%`; top: number; size: number; emoji: string; opacity: number }[] =
    decorationEmojis.length > 0
      ? [
          { left: '12%', top: 10, size: 14, emoji: decorationEmojis[0]!, opacity: 0.85 },
          { left: '32%', top: 32, size: 18, emoji: decorationEmojis[1 % decorationEmojis.length]!, opacity: 0.7 },
          { left: '54%', top: 8, size: 16, emoji: decorationEmojis[2 % decorationEmojis.length]!, opacity: 0.75 },
          { left: '74%', top: 30, size: 12, emoji: decorationEmojis[3 % decorationEmojis.length]!, opacity: 0.85 },
        ]
      : [];

  return (
    <Pressable
      onPress={onPress}
      disabled={!unlocked}
      style={{
        backgroundColor: t.surface,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? C.accent : C.border,
        opacity: unlocked ? 1 : 0.55,
        shadowColor: 'rgba(0,0,0,0.08)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 14,
        elevation: 2,
      }}
    >
      {/* Hero gradient preview with decoration emojis */}
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ height: 72, position: 'relative' }}
      >
        {/* Lock badge — replaces the selected check when the theme is gated. */}
        {!unlocked && (
          <View
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: 'rgba(0,0,0,0.55)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Lock size={12} color="#FFFFFF" />
          </View>
        )}
        {decorationSpots.map((d, i) => (
          <Text
            key={i}
            style={{
              position: 'absolute',
              left: d.left,
              top: d.top,
              fontSize: d.size,
              opacity: d.opacity,
            }}
          >
            {d.emoji}
          </Text>
        ))}

        {/* Selected check badge */}
        {selected && unlocked && (
          <View
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: '#FFFFFF',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: 'rgba(0,0,0,0.2)',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 1,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <Check size={14} color={C.accent} />
          </View>
        )}

        {/* "100%" stamp on the gradient - feels like a real progress hero */}
        <Text
          style={{
            position: 'absolute',
            right: 14,
            bottom: 8,
            fontFamily: 'DMSans_700Bold',
            fontSize: 11,
            color: t.textOnHero,
            opacity: 0.6,
            letterSpacing: 0.5,
          }}
        >
          PREVIEW
        </Text>
      </LinearGradient>

      {/* Bottom content row: theme name + sub-line.
       *  Unlocked themes show their tagline; locked themes show the unlock
       *  requirement. Both states have a sub-line so card heights match in
       *  the 2-column grid without empty space under unlocked themes. */}
      <View style={{ paddingHorizontal: 12, paddingVertical: 10 }}>
        <Text
          style={{
            fontFamily: 'DMSans_600SemiBold',
            fontSize: 15,
            color: t.textPrimary,
          }}
          numberOfLines={1}
        >
          {t.label}
        </Text>
        <Text
          style={{
            fontFamily: 'DMSans_500Medium',
            fontSize: 11,
            color: t.textSecondary,
            marginTop: 2,
          }}
          numberOfLines={1}
        >
          {!unlocked && requirementLabel ? requirementLabel : t.tagline ?? ''}
        </Text>
      </View>
    </Pressable>
  );
}
