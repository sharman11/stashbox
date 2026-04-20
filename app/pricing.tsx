import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Check, Crown, Sparkles } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { SpringPressable } from '@/components/SpringPressable';

const C = {
  heroTop: '#0B3D2E',
  heroMid: '#145A42',
  heroBot: '#1E7A5C',
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
};

const FEATURES = [
  'Unlimited vaults per currency',
  'Priority support',
  'Custom themes',
  'Advanced statistics',
  'Export to CSV',
  'No ads',
];

type Plan = 'monthly' | 'yearly';

export default function PricingScreen() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<Plan>('yearly');

  const handleSubscribe = () => {
    Alert.alert(
      'Coming Soon',
      'Premium subscriptions will be available in a future update. Enjoy the free version for now!',
      [{ text: 'OK', onPress: () => router.replace('/') }],
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.pageBg }}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* ── Hero ── */}
        <LinearGradient
          colors={[C.heroTop, C.heroMid, C.heroBot]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ paddingBottom: 52, alignItems: 'center' }}
        >
          <View style={{ paddingTop: 60, alignItems: 'center' }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 20,
                backgroundColor: 'rgba(255,255,255,0.12)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Crown size={28} color="#FBBF24" />
            </View>
            <Text
              style={{
                fontFamily: 'Inter_700Bold',
                fontSize: 28,
                color: '#FFFFFF',
                marginTop: 16,
                textAlign: 'center',
              }}
            >
              Unlock Premium
            </Text>
            <Text
              style={{
                fontFamily: 'Inter_400Regular',
                fontSize: 15,
                color: 'rgba(255,255,255,0.6)',
                marginTop: 8,
                textAlign: 'center',
                paddingHorizontal: 32,
                lineHeight: 22,
              }}
            >
              Supercharge your savings journey with unlimited features
            </Text>
          </View>
        </LinearGradient>

        <View style={{ paddingHorizontal: 16, marginTop: -28 }}>
          {/* ── Plan cards ── */}
          <View style={{ gap: 12 }}>
            {/* Yearly — best value */}
            <SpringPressable
              onPress={() => setSelectedPlan('yearly')}
              style={{
                backgroundColor: C.surface,
                borderRadius: 16,
                padding: 18,
                borderWidth: selectedPlan === 'yearly' ? 2 : 1,
                borderColor: selectedPlan === 'yearly' ? C.accent : C.border,
                shadowColor: 'rgba(0,0,0,0.12)',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 1,
                shadowRadius: 20,
                elevation: 2,
              }}
            >
              {/* Best value badge */}
              <View
                style={{
                  position: 'absolute',
                  top: -10,
                  right: 16,
                  backgroundColor: C.accent,
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Sparkles size={10} color="#FFFFFF" />
                <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 10, color: '#FFFFFF' }}>
                  BEST VALUE
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View>
                  <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 18, color: C.textPrimary }}>
                    Yearly
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                    <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 32, color: C.textPrimary }}>
                      $9.99
                    </Text>
                    <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: C.textMuted }}>
                      /year
                    </Text>
                  </View>
                  <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: C.accent, marginTop: 4 }}>
                    $0.83/month — save 30%
                  </Text>
                </View>
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: selectedPlan === 'yearly' ? C.accent : C.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {selectedPlan === 'yearly' && <Check size={14} color="#FFFFFF" />}
                </View>
              </View>
            </SpringPressable>

            {/* Monthly */}
            <SpringPressable
              onPress={() => setSelectedPlan('monthly')}
              style={{
                backgroundColor: C.surface,
                borderRadius: 16,
                padding: 18,
                borderWidth: selectedPlan === 'monthly' ? 2 : 1,
                borderColor: selectedPlan === 'monthly' ? C.accent : C.border,
                shadowColor: 'rgba(0,0,0,0.12)',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 1,
                shadowRadius: 20,
                elevation: 2,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View>
                  <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 18, color: C.textPrimary }}>
                    Monthly
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                    <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 32, color: C.textPrimary }}>
                      $1
                    </Text>
                    <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: C.textMuted }}>
                      /month
                    </Text>
                  </View>
                </View>
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: selectedPlan === 'monthly' ? C.accent : C.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {selectedPlan === 'monthly' && <Check size={14} color="#FFFFFF" />}
                </View>
              </View>
            </SpringPressable>
          </View>

          {/* ── Features list ── */}
          <View style={{ marginTop: 28 }}>
            <Text
              style={{
                fontFamily: 'Inter_600SemiBold',
                fontSize: 18,
                color: C.textPrimary,
                marginBottom: 14,
              }}
            >
              What you get
            </Text>
            <View
              style={{
                backgroundColor: C.surface,
                borderRadius: 16,
                overflow: 'hidden',
                shadowColor: 'rgba(0,0,0,0.12)',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 1,
                shadowRadius: 20,
                elevation: 2,
              }}
            >
              {FEATURES.map((feature, i) => (
                <View
                  key={feature}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderTopWidth: i > 0 ? 0.5 : 0,
                    borderTopColor: '#F3F4F6',
                  }}
                >
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: C.accentLight,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Check size={12} color={C.accent} />
                  </View>
                  <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 15, color: C.textPrimary }}>
                    {feature}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── Subscribe button ── */}
          <Pressable
            onPress={handleSubscribe}
            style={{
              backgroundColor: C.accent,
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: 'center',
              marginTop: 28,
            }}
          >
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#FFFFFF' }}>
              {selectedPlan === 'yearly' ? 'Subscribe — $9.99/year' : 'Subscribe — $1/month'}
            </Text>
          </Pressable>

          {/* ── Skip ── */}
          <Pressable
            onPress={() => router.replace('/')}
            style={{ alignItems: 'center', marginTop: 16 }}
          >
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: C.textMuted }}>
              Maybe later
            </Text>
          </Pressable>

          {/* ── Legal ── */}
          <Text
            style={{
              fontFamily: 'Inter_400Regular',
              fontSize: 11,
              color: C.textFaint,
              textAlign: 'center',
              marginTop: 20,
              lineHeight: 16,
              paddingHorizontal: 16,
            }}
          >
            Payment will be charged to your Google Play account. Subscription
            automatically renews unless cancelled at least 24 hours before the end of the current
            period. See our privacy policy at optruvian.com/privacy.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
