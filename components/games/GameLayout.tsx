import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, RotateCcw } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SpringPressable } from '@/components/SpringPressable';

import { AD_UNIT_IDS } from '@/lib/ads';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { useAdsStore } from '@/lib/stores/ads';
import { useAppTheme } from '@/lib/stores/theme';

interface GameLayoutProps {
  /** Game name shown in the header. */
  title: string;
  /** Live score label (e.g. "Score" or "Time"). */
  scoreLabel: string;
  /** Live score value. */
  score: number | string;
  /** Optional secondary chip rendered next to the score (e.g. "Best 240"). */
  secondary?: string | null;
  /** Called when the user taps the restart icon. */
  onRestart: () => void;
  /** Game body - board, controls, overlays. */
  children: ReactNode;
}

/**
 * Shared chrome for every mini-game: back button, title, score badge, restart.
 * Body slot is unconstrained so each game renders its own board however it likes.
 */
export function GameLayout({ title, scoreLabel, score, secondary, onRestart, children }: GameLayoutProps) {
  const C = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const adsReady = useAdsStore((s) => s.ready);

  return (
    <View style={{ flex: 1, backgroundColor: C.pageBg }}>
      <StatusBar style="light" />

      {/* Hero header */}
      <View
        style={{
          backgroundColor: C.heroTop,
          paddingTop: insets.top + 12,
          paddingHorizontal: 16,
          paddingBottom: 18,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <SpringPressable
            onPress={() => router.back()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(255,255,255,0.12)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChevronLeft size={20} color="#FFFFFF" />
          </SpringPressable>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: 'DMSans_700Bold',
                fontSize: 18,
                color: '#FFFFFF',
                letterSpacing: -0.2,
              }}
              numberOfLines={1}
            >
              {title}
            </Text>
            <Text
              style={{
                fontFamily: 'DMSans_500Medium',
                fontSize: 11,
                color: 'rgba(255,255,255,0.7)',
                letterSpacing: 0.5,
                marginTop: 2,
              }}
            >
              {scoreLabel.toUpperCase()} · {score}
              {secondary ? ` · ${secondary}` : ''}
            </Text>
          </View>

          <SpringPressable
            onPress={onRestart}
            haptic
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: C.accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <RotateCcw size={18} color="#FFFFFF" />
          </SpringPressable>
        </View>
      </View>

      <View style={{ flex: 1 }}>{children}</View>

      {/* Ad slot - pinned above the system inset. */}
      {adsReady && (
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: Math.max(insets.bottom, 8),
            backgroundColor: C.pageBg,
          }}
        >
          <BannerAd
            unitId={AD_UNIT_IDS.BANNER}
            size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          />
        </View>
      )}
    </View>
  );
}
