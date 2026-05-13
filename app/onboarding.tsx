import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Check, ChevronLeft } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
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
import type { CurrencyCode } from '@/lib/currency';
import { detectLocaleCurrency } from '@/lib/locale-currency';
import { useAvatarStore } from '@/lib/stores/avatar';
import { useProfileStore } from '@/lib/stores/profile';
import { useAppTheme } from '@/lib/stores/theme';

const FREE_AVATARS = AVATARS.filter((a) => a.category === 'og');

const NAME_MAX = 24;

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

const STEPS = ['Hello', 'Avatar', 'Currency', 'Style', 'Result'];

export default function OnboardingScreen() {
  const C = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 16);
  const { width: screenW } = useWindowDimensions();
  const { completeOnboarding, update } = useProfileStore();
  const setAvatar = useAvatarStore((s) => s.setAvatar);

  // Avatar grid sizing: 5 columns × 2 rows of circular tiles. Compute the
  // tile size from the screen width so it scales cleanly on every device
  // and the selection ring never shifts the layout.
  const AVATAR_GRID_PADDING = 24;
  const AVATAR_GRID_GAP = 10;
  const AVATAR_COLS = 5;
  const avatarTileSize = Math.floor(
    (screenW - AVATAR_GRID_PADDING * 2 - AVATAR_GRID_GAP * (AVATAR_COLS - 1)) / AVATAR_COLS,
  );
  const [step, setStep] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [name, setName] = useState('');
  const [avatarId, setAvatarId] = useState<string>(DEFAULT_AVATAR.id);
  const localeDefault = useMemo(() => detectLocaleCurrency(), []);
  const [currencies, setCurrencies] = useState<CurrencyCode[]>([localeDefault]);
  const currency = currencies[0];
  const [q1, setQ1] = useState<string | null>(null);
  const [q2, setQ2] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const trimmedName = name.trim();
  const personality = q1 && q2 ? PERSONALITY_MAP[`${q1}-${q2}`] ?? PERSONALITY_MAP['steady-unsure'] : null;
  const firstName = trimmedName ? trimmedName.split(' ')[0] : '';

  const onFinish = async () => {
    setSaving(true);
    if (trimmedName) {
      await update({ displayName: trimmedName });
    }
    await setAvatar(avatarId);
    await completeOnboarding({
      defaultCurrency: currency,
      preferredCurrencies: currencies,
    });
    if (personality) {
      await AsyncStorage.setItem('stashbox_personality', JSON.stringify(personality));
    }
    setSaving(false);
    router.replace('/');
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.pageBg }}>
      <StatusBar style={C.mode === 'dark' ? 'light' : 'dark'} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
        style={{ flex: 1 }}
      >
        {/* Step dots + back. Back is hidden on step 0 (nothing to return to)
            and step 4 (personality reveal — going back would let the user
            re-take the quiz, which is fine but the original flow doesn't
            anticipate it; safer to lock it in). */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 24,
            paddingTop: insets.top + 16,
            gap: 8,
          }}
        >
          {step > 0 && step < 4 && !saving ? (
            <Pressable
              onPress={() => setStep((step - 1) as 0 | 1 | 2 | 3)}
              hitSlop={12}
              accessibilityLabel="Back to previous step"
              style={{
                width: 28,
                height: 28,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ChevronLeft size={22} color={C.textSecondary} />
            </Pressable>
          ) : (
            <View style={{ width: 28, height: 28 }} />
          )}
          <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
            {STEPS.map((_, i) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: i <= step ? C.accent : C.borderLight,
                }}
              />
            ))}
          </View>
        </View>

        {/* ─────────────────────────────────────────────────────── */}
        {/* Step 0: Welcome + name                                  */}
        {/* ─────────────────────────────────────────────────────── */}
        {step === 0 && (
          <View style={{ flex: 1, paddingHorizontal: 24 }}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
              automaticallyAdjustKeyboardInsets
              contentContainerStyle={{ paddingTop: 48, paddingBottom: bottomInset }}
            >
              <View style={{ alignItems: 'center' }}>
                <View
                  style={{
                    backgroundColor: C.accentLight,
                    width: 76,
                    height: 76,
                    borderRadius: 22,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 36 }}>👋</Text>
                </View>
                <Text
                  style={{
                    fontFamily: 'DMSans_700Bold',
                    fontSize: 28,
                    color: C.textPrimary,
                    textAlign: 'center',
                    marginTop: 20,
                  }}
                >
                  Welcome to Stashbox
                </Text>
                <Text
                  style={{
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 14,
                    color: C.textSecondary,
                    textAlign: 'center',
                    marginTop: 6,
                    lineHeight: 20,
                  }}
                >
                  What should we call you?
                </Text>
              </View>

              <View
                style={{
                  marginTop: 28,
                  backgroundColor: C.surface,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: C.border,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                }}
              >
                <TextInput
                  value={name}
                  onChangeText={(v) => setName(v.slice(0, NAME_MAX))}
                  placeholder="Your name"
                  placeholderTextColor={C.textFaint}
                  maxLength={NAME_MAX}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="done"
                  style={{
                    fontFamily: 'DMSans_500Medium',
                    fontSize: 18,
                    color: C.textPrimary,
                    padding: 0,
                    textAlign: 'center',
                  }}
                />
              </View>
              <Text
                style={{
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 11,
                  color: C.textMuted,
                  textAlign: 'center',
                  marginTop: 8,
                }}
              >
                We&apos;ll only use this to greet you.
              </Text>

              <Pressable
                onPress={() => trimmedName && setStep(1)}
                disabled={!trimmedName}
                style={{
                  backgroundColor: trimmedName ? C.buttonPrimaryBg : C.borderLight,
                  borderRadius: 14,
                  paddingVertical: 16,
                  alignItems: 'center',
                  marginTop: 32,
                }}
              >
                <Text
                  allowFontScaling={false}
                  numberOfLines={1}
                  style={{
                    fontFamily: 'DMSans_600SemiBold',
                    fontSize: 16,
                    color: trimmedName ? C.buttonPrimaryText : C.textFaint,
                  }}
                >
                  Continue
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        )}

        {/* ─────────────────────────────────────────────────────── */}
        {/* Step 1: Avatar (free OG emoji avatars)                  */}
        {/* ─────────────────────────────────────────────────────── */}
        {step === 1 && (() => {
          const selectedAvatar = FREE_AVATARS.find((a) => a.id === avatarId) ?? FREE_AVATARS[0];
          const ringWidth = 3;
          const innerSize = avatarTileSize - ringWidth * 2;
          return (
            <View style={{ flex: 1 }}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: AVATAR_GRID_PADDING, paddingTop: 16, paddingBottom: 16 }}
              >
                {/* Hero preview */}
                <View style={{ alignItems: 'center', marginTop: 8, marginBottom: 20 }}>
                  <AvatarVisual avatar={selectedAvatar} size={104} />
                  <Text
                    style={{
                      fontFamily: 'DMSans_700Bold',
                      fontSize: 22,
                      color: C.textPrimary,
                      marginTop: 14,
                      textAlign: 'center',
                    }}
                  >
                    {firstName ? `Looking good, ${firstName}` : 'Pick your avatar'}
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'DMSans_400Regular',
                      fontSize: 13,
                      color: C.textSecondary,
                      marginTop: 4,
                      textAlign: 'center',
                      lineHeight: 18,
                    }}
                  >
                    Tap any face below to make it yours.
                  </Text>
                </View>

                {/* Grid */}
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    columnGap: AVATAR_GRID_GAP,
                    rowGap: AVATAR_GRID_GAP,
                  }}
                >
                  {FREE_AVATARS.map((a) => {
                    const selected = avatarId === a.id;
                    return (
                      <Pressable
                        key={a.id}
                        onPress={() => setAvatarId(a.id)}
                        hitSlop={4}
                        style={{
                          width: avatarTileSize,
                          height: avatarTileSize,
                          borderRadius: avatarTileSize / 2,
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

                {/* Unlock hint */}
                <View
                  style={{
                    marginTop: 24,
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
                    <Text style={{ fontSize: 18 }}>🔓</Text>
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
              <View
                style={{
                  paddingHorizontal: AVATAR_GRID_PADDING,
                  paddingBottom: bottomInset,
                  paddingTop: 8,
                  backgroundColor: C.pageBg,
                }}
              >
                <Pressable
                  onPress={() => setStep(2)}
                  style={{
                    backgroundColor: C.buttonPrimaryBg,
                    borderRadius: 14,
                    paddingVertical: 16,
                    alignItems: 'center',
                  }}
                >
                  <Text
                    allowFontScaling={false}
                    numberOfLines={1}
                    style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 16, color: C.buttonPrimaryText }}
                  >
                    Next
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })()}

        {/* ─────────────────────────────────────────────────────── */}
        {/* Step 2: Currency                                        */}
        {/* ─────────────────────────────────────────────────────── */}
        {step === 2 && (
          <View style={{ flex: 1 }}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 }}
            >
              <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 26, color: C.textPrimary }}>
                {firstName ? `Hi ${firstName},` : 'Pick your currencies'}
              </Text>
              <Text
                style={{
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 14,
                  color: C.textSecondary,
                  marginTop: 4,
                  lineHeight: 20,
                }}
              >
                {firstName
                  ? 'Pick the currencies you save in. Up to 3.'
                  : 'Save in any currency you like - up to 3.'}
              </Text>
              <View style={{ marginTop: 18 }}>
                <MultiCurrencyPicker selected={currencies} onChange={setCurrencies} />
              </View>
            </ScrollView>
            <View
              style={{
                paddingHorizontal: 24,
                paddingBottom: bottomInset,
                paddingTop: 8,
                backgroundColor: C.pageBg,
              }}
            >
              <Pressable
                onPress={() => setStep(3)}
                style={{
                  backgroundColor: C.buttonPrimaryBg,
                  borderRadius: 14,
                  paddingVertical: 16,
                  alignItems: 'center',
                }}
              >
                <Text
                  allowFontScaling={false}
                  numberOfLines={1}
                  style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 16, color: C.buttonPrimaryText }}
                >
                  Next
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ─────────────────────────────────────────────────────── */}
        {/* Step 3: Quiz + inline personality reveal                */}
        {/* ─────────────────────────────────────────────────────── */}
        {step === 3 && (
          <View style={{ flex: 1 }}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 }}
            >
              <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 26, color: C.textPrimary }}>
                Your saving style
              </Text>
              <Text
                style={{
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 14,
                  color: C.textSecondary,
                  marginTop: 4,
                }}
              >
                Two quick taps. No wrong answers.
              </Text>

              <Text
                style={{
                  fontFamily: 'DMSans_500Medium',
                  fontSize: 12,
                  color: C.textMuted,
                  letterSpacing: 0.5,
                  marginTop: 22,
                  marginBottom: 8,
                }}
              >
                HOW DO YOU LIKE TO SAVE?
              </Text>
              <View style={{ gap: 8 }}>
                {QUIZ_Q1.map((opt) => (
                  <QuizRow
                    key={opt.value}
                    option={opt}
                    selected={q1 === opt.value}
                    onPress={() => setQ1(opt.value)}
                  />
                ))}
              </View>

              <Text
                style={{
                  fontFamily: 'DMSans_500Medium',
                  fontSize: 12,
                  color: C.textMuted,
                  letterSpacing: 0.5,
                  marginTop: 22,
                  marginBottom: 8,
                }}
              >
                HOW MANY GOALS AT ONCE?
              </Text>
              <View style={{ gap: 8 }}>
                {QUIZ_Q2.map((opt) => (
                  <QuizRow
                    key={opt.value}
                    option={opt}
                    selected={q2 === opt.value}
                    onPress={() => setQ2(opt.value)}
                  />
                ))}
              </View>

            </ScrollView>
            <View
              style={{
                paddingHorizontal: 24,
                paddingBottom: bottomInset,
                paddingTop: 8,
                backgroundColor: C.pageBg,
              }}
            >
              <Pressable
                onPress={() => personality && setStep(4)}
                disabled={!personality}
                style={{
                  backgroundColor: personality ? C.buttonPrimaryBg : C.borderLight,
                  borderRadius: 14,
                  paddingVertical: 16,
                  alignItems: 'center',
                }}
              >
                <Text
                  allowFontScaling={false}
                  numberOfLines={1}
                  style={{
                    fontFamily: 'DMSans_600SemiBold',
                    fontSize: 16,
                    color: personality ? C.buttonPrimaryText : C.textFaint,
                  }}
                >
                  {personality ? 'See my result' : 'Pick both options'}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ─────────────────────────────────────────────────────── */}
        {/* Step 4: Personality reveal                              */}
        {/* ─────────────────────────────────────────────────────── */}
        {step === 4 && personality && (
          <View style={{ flex: 1, paddingHorizontal: 24 }}>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <View
                style={{
                  backgroundColor: C.accentLight,
                  width: 96,
                  height: 96,
                  borderRadius: 28,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 52 }}>{personality.emoji}</Text>
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
            <Pressable
              onPress={onFinish}
              disabled={saving}
              style={{
                backgroundColor: C.buttonPrimaryBg,
                borderRadius: 14,
                paddingVertical: 16,
                alignItems: 'center',
                marginBottom: bottomInset,
              }}
            >
              <Text
                allowFontScaling={false}
                numberOfLines={1}
                style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 16, color: C.buttonPrimaryText }}
              >
                {saving ? 'Setting up…' : 'Start saving'}
              </Text>
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
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
