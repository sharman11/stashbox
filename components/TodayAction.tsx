import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowRight, Check, Target } from 'lucide-react-native';
import { useEffect, useMemo } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { SpringPressable } from '@/components/SpringPressable';
import { formatAmount } from '@/lib/currency';
import type { Cell, CurrencyCode, Moneybox } from '@/lib/types';

interface TodayActionProps {
  moneybox: Moneybox;
  cells: Cell[];
  totalSaved: number;
  currency: CurrencyCode;
}

function PulsingRing({ size, children }: { size: number; children: React.ReactNode }) {
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [pulseScale]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const radius = (size - 8) / 2;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[pulseStyle, { position: 'absolute' }]}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2} cy={size / 2} r={radius}
            stroke="#FFFFFF" strokeWidth={2} fill="none" opacity={0.2}
          />
        </Svg>
      </Animated.View>
      <Svg width={size - 10} height={size - 10} style={{ position: 'absolute' }}>
        <Circle
          cx={(size - 10) / 2} cy={(size - 10) / 2} r={(size - 18) / 2}
          stroke="#FFFFFF" strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.6}
        />
      </Svg>
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </View>
    </View>
  );
}

function DoneCheckmark() {
  const scale = useSharedValue(0);
  useEffect(() => {
    scale.value = withSpring(1, { damping: 8, stiffness: 200 });
  }, [scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[style, {
      width: 52, height: 52, borderRadius: 26,
      backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
      borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
    }]}>
      <Check size={26} color="#FFFFFF" strokeWidth={3} />
    </Animated.View>
  );
}

export function TodayAction({ moneybox, cells, totalSaved, currency }: TodayActionProps) {
  const router = useRouter();
  const today = new Date().toISOString().split('T')[0];

  const { savedToday, suggestion } = useMemo(() => {
    const filledToday = cells.filter((c) => c.isFilled && c.filledAt?.startsWith(today));
    const unfilled = cells.filter((c) => !c.isFilled);
    const sorted = [...unfilled].sort((a, b) => a.amount - b.amount);
    const cutoff = Math.ceil(sorted.length * 0.5);
    const pool = Math.random() < 0.7 ? sorted.slice(0, cutoff) : sorted.slice(cutoff);
    const pick = pool[Math.floor(Math.random() * pool.length)] ?? sorted[0] ?? null;
    return { savedToday: filledToday.length > 0, suggestion: pick };
  }, [cells, today]);

  if (savedToday) {
    return (
      <SpringPressable
        onPress={() => router.push(`/box/${moneybox.id}`)}
        style={{ borderRadius: 20, overflow: 'hidden' }}
      >
        <LinearGradient
          colors={['#22C55E', '#16A34A']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ padding: 20, alignItems: 'center' }}
        >
          <DoneCheckmark />
          <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 16, color: '#FFFFFF', marginTop: 10 }}>
            Saved today
          </Text>
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
            {moneybox.name} - tap to view grid
          </Text>
        </LinearGradient>
      </SpringPressable>
    );
  }

  if (!suggestion) return null;

  return (
    <View style={{ borderRadius: 20, overflow: 'hidden' }}>
      <LinearGradient
        colors={['#1DB954', '#6366F1']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ paddingTop: 20, paddingBottom: 16 }}
      >
        {/* Total saved - small, top of card */}
        {totalSaved > 0 && (
          <View style={{ alignItems: 'center', marginBottom: 4 }}>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.5 }}>
              TOTAL SAVED: {formatAmount(totalSaved, currency)}
            </Text>
          </View>
        )}

        {/* Ring + amount */}
        <View style={{ alignItems: 'center' }}>
          <PulsingRing size={90}>
            <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 20, color: '#FFFFFF' }}>
              {formatAmount(suggestion.amount, moneybox.currency)}
            </Text>
          </PulsingRing>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
            <Target size={11} color="rgba(255,255,255,0.5)" />
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
              {moneybox.name}
            </Text>
          </View>
        </View>

        {/* Save button */}
        <View style={{ paddingHorizontal: 16, marginTop: 14 }}>
          <SpringPressable
            onPress={() => router.push(`/box/${moneybox.id}`)}
            haptic
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 14, paddingVertical: 13,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
              borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
            }}
          >
            <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 15, color: '#FFFFFF' }}>Save now</Text>
            <ArrowRight size={16} color="#FFFFFF" />
          </SpringPressable>
        </View>
      </LinearGradient>
    </View>
  );
}
