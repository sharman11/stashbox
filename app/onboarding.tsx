import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { CURRENCY_LIST } from '@/lib/currency';
import type { CurrencyCode } from '@/lib/currency';
import { useProfileStore } from '@/lib/stores/profile';

const C = {
  accent: '#1DB954',
  accentDark: '#166534',
  accentLight: '#E6F4EA',
  pageBg: '#F5F7FA',
  surface: '#FFFFFF',
  textPrimary: '#0F1419',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textFaint: '#D1D5DB',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
};

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

const STEPS = ['Welcome', 'Currency', 'Quiz', 'Result'];

export default function OnboardingScreen() {
  const router = useRouter();
  const { completeOnboarding, update } = useProfileStore();
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [currency, setCurrency] = useState<CurrencyCode>('INR');
  const [q1, setQ1] = useState<string | null>(null);
  const [q2, setQ2] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const personality = q1 && q2 ? PERSONALITY_MAP[`${q1}-${q2}`] ?? PERSONALITY_MAP['steady-unsure'] : null;

  const onFinish = async () => {
    setSaving(true);
    await update({ defaultCurrency: currency });
    await completeOnboarding({ defaultCurrency: currency });
    if (personality) {
      await AsyncStorage.setItem('stashbox_personality', JSON.stringify(personality));
    }
    setSaving(false);
    router.replace('/');
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.pageBg }}>
      <StatusBar style="dark" />

      {/* Step dots */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 24, paddingTop: 60, gap: 4 }}>
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

      {/* Step 0: Welcome */}
      {step === 0 && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <View
            style={{
              backgroundColor: C.accentLight,
              width: 80,
              height: 80,
              borderRadius: 24,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 40 }}>💰</Text>
          </View>
          <Text
            style={{
              fontFamily: 'Inter_700Bold',
              fontSize: 28,
              color: C.textPrimary,
              textAlign: 'center',
              marginTop: 24,
            }}
          >
            Welcome to{'\n'}Stashbox
          </Text>
          <Text
            style={{
              fontFamily: 'Inter_400Regular',
              fontSize: 15,
              color: C.textSecondary,
              textAlign: 'center',
              marginTop: 10,
              lineHeight: 22,
            }}
          >
            Set a savings goal, tap cells each day, and watch your grid fill up.
          </Text>
          <Pressable
            onPress={() => setStep(1)}
            style={{
              backgroundColor: C.accent,
              borderRadius: 14,
              paddingHorizontal: 40,
              paddingVertical: 16,
              marginTop: 48,
            }}
          >
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#FFFFFF' }}>
              Get started
            </Text>
          </Pressable>
        </View>
      )}

      {/* Step 1: Currency */}
      {step === 1 && (
        <ScrollView contentContainerStyle={{ padding: 24, flexGrow: 1 }}>
          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 28, color: C.textPrimary }}>
            Choose your{'\n'}currency
          </Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: C.textSecondary, marginTop: 6 }}>
            You can change this anytime in settings.
          </Text>
          <View style={{ marginTop: 18, gap: 8 }}>
            {CURRENCY_LIST.map((c) => {
              const selected = currency === c.code;
              return (
                <Pressable
                  key={c.code}
                  onPress={() => setCurrency(c.code)}
                  style={{
                    backgroundColor: C.surface,
                    borderRadius: 14,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderWidth: selected ? 2 : 1,
                    borderColor: selected ? C.accent : C.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Text style={{ fontSize: 20 }}>{c.flag}</Text>
                    <View>
                      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: C.textPrimary }}>{c.code}</Text>
                      <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: C.textMuted }}>{c.label}</Text>
                    </View>
                  </View>
                  {selected && (
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
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
            })}
          </View>
          <Pressable
            onPress={() => setStep(2)}
            style={{
              backgroundColor: C.accent,
              borderRadius: 14,
              paddingVertical: 16,
              marginTop: 24,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#FFFFFF' }}>Next</Text>
          </Pressable>
        </ScrollView>
      )}

      {/* Step 2: Personality quiz */}
      {step === 2 && (
        <ScrollView contentContainerStyle={{ padding: 24, flexGrow: 1 }}>
          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 28, color: C.textPrimary }}>
            What kind of{'\n'}saver are you?
          </Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: C.textSecondary, marginTop: 6 }}>
            Quick quiz — no wrong answers!
          </Text>

          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: C.textMuted, letterSpacing: 0.5, marginTop: 24, marginBottom: 8 }}>
            HOW DO YOU LIKE TO SAVE?
          </Text>
          <View style={{ gap: 8 }}>
            {QUIZ_Q1.map((opt) => {
              const selected = q1 === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setQ1(opt.value)}
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
                  <Text style={{ fontSize: 20 }}>{opt.emoji}</Text>
                  <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: C.textPrimary, flex: 1 }}>{opt.label}</Text>
                  {selected && (
                    <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={12} color="#FFFFFF" />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: C.textMuted, letterSpacing: 0.5, marginTop: 24, marginBottom: 8 }}>
            HOW MANY GOALS AT ONCE?
          </Text>
          <View style={{ gap: 8 }}>
            {QUIZ_Q2.map((opt) => {
              const selected = q2 === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setQ2(opt.value)}
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
                  <Text style={{ fontSize: 20 }}>{opt.emoji}</Text>
                  <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: C.textPrimary, flex: 1 }}>{opt.label}</Text>
                  {selected && (
                    <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={12} color="#FFFFFF" />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={() => q1 && q2 ? setStep(3) : undefined}
            disabled={!q1 || !q2}
            style={{
              backgroundColor: q1 && q2 ? C.accent : C.borderLight,
              borderRadius: 14,
              paddingVertical: 16,
              marginTop: 24,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: q1 && q2 ? '#FFFFFF' : C.textFaint }}>
              See my result
            </Text>
          </Pressable>
        </ScrollView>
      )}

      {/* Step 3: Result */}
      {step === 3 && personality && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <View
            style={{
              backgroundColor: C.accentLight,
              width: 80,
              height: 80,
              borderRadius: 24,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 40 }}>{personality.emoji}</Text>
          </View>
          <Text
            style={{
              fontFamily: 'Inter_700Bold',
              fontSize: 28,
              color: C.textPrimary,
              textAlign: 'center',
              marginTop: 20,
            }}
          >
            You're {personality.type}
          </Text>
          <Text
            style={{
              fontFamily: 'Inter_400Regular',
              fontSize: 15,
              color: C.textSecondary,
              textAlign: 'center',
              marginTop: 8,
              lineHeight: 22,
            }}
          >
            {personality.desc}
          </Text>
          <Pressable
            onPress={onFinish}
            disabled={saving}
            style={{
              backgroundColor: C.accent,
              borderRadius: 14,
              paddingHorizontal: 40,
              paddingVertical: 16,
              marginTop: 36,
            }}
          >
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#FFFFFF' }}>
              {saving ? 'Setting up...' : 'Start saving!'}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
