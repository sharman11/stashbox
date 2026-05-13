import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Play, Star } from 'lucide-react-native';
import { useEffect } from 'react';
import { Image, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SpringPressable } from '@/components/SpringPressable';

import { AD_UNIT_IDS } from '@/lib/ads';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { GAMES } from '@/lib/games/registry';
import type { GameMeta } from '@/lib/games/registry';
import { useScoresStore } from '@/lib/games/scores';
import { useAdsStore } from '@/lib/stores/ads';
import { useAppTheme } from '@/lib/stores/theme';

export default function GamesScreen() {
  const C = useAppTheme();
  const insets = useSafeAreaInsets();
  const best = useScoresStore((s) => s.best);
  const loadScores = useScoresStore((s) => s.load);
  const adsReady = useAdsStore((s) => s.ready);

  useEffect(() => {
    loadScores();
  }, [loadScores]);

  return (
    <View style={{ flex: 1, backgroundColor: C.pageBg }}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <LinearGradient
          colors={[C.heroTop, C.heroMid, C.heroBot]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{
            paddingHorizontal: 24,
            paddingTop: insets.top + 16,
            paddingBottom: 56,
          }}
        >
          <Text
            style={{
              fontFamily: 'DMSans_500Medium',
              fontSize: 12,
              color: 'rgba(255,255,255,0.55)',
              letterSpacing: 1,
            }}
          >
            GAMES
          </Text>
          <Text
            style={{
              fontFamily: 'DMSans_700Bold',
              fontSize: 28,
              color: '#FFFFFF',
              marginTop: 6,
              letterSpacing: -0.3,
            }}
          >
            Play, earn badges
          </Text>
          <Text
            style={{
              fontFamily: 'DMSans_400Regular',
              fontSize: 14,
              color: 'rgba(255,255,255,0.7)',
              marginTop: 6,
              lineHeight: 20,
            }}
          >
            Coin-themed mini-games. Unlock badges as you climb.
          </Text>
        </LinearGradient>

        <View
          style={{
            paddingHorizontal: 16,
            marginTop: -36,
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          {GAMES.map((g) => (
            <View key={g.id} style={{ width: '48%', flexGrow: 1 }}>
              <GameCard game={g} bestScore={best[g.id]} />
            </View>
          ))}
        </View>

        {adsReady && (
          <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
            <BannerAd
              unitId={AD_UNIT_IDS.BANNER}
              size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

interface GameCardProps {
  game: GameMeta;
  bestScore: number | null;
}

function GameCard({ game, bestScore }: GameCardProps) {
  const C = useAppTheme();
  const router = useRouter();
  const palette = game.palette;
  const isDark = C.mode === 'dark';

  // Dark mode collapses the per-game pastel-on-white gradient into a flat
  // elevated surface - the brand color shows through on the title, play
  // button, and ring instead of as a card-wide tint.
  const gradientColors: readonly [string, string] = isDark
    ? [C.surfaceElevated, C.surface]
    : [palette.bg, '#FFFFFF'];
  const newChipBg = isDark ? C.surface : '#FFFFFF';
  const newChipText = isDark ? palette.accent : palette.accentDark;
  const titleColor = isDark ? palette.accent : palette.accentDark;

  return (
    <SpringPressable
      onPress={() => router.push(game.route)}
      haptic
      style={{
        borderRadius: 22,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: palette.ring,
        shadowColor: 'rgba(0,0,0,0.10)',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 1,
        shadowRadius: 18,
        elevation: 3,
      }}
    >
      {/* Subtle gradient - pastel-on-white in light mode, flat elevated
          surface in dark mode. The brand color carries the per-game identity
          via the title, play button, and ring instead. */}
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{
          aspectRatio: 0.78,
          paddingHorizontal: 16,
          paddingVertical: 18,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Top - score chip / NEW badge */}
        <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'flex-end' }}>
          {bestScore == null ? (
            <View
              style={{
                backgroundColor: newChipBg,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: palette.ring,
              }}
            >
              <Text
                style={{
                  fontFamily: 'DMSans_700Bold',
                  fontSize: 10,
                  color: newChipText,
                  letterSpacing: 0.6,
                }}
              >
                NEW
              </Text>
            </View>
          ) : (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: palette.accent,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 999,
              }}
            >
              <Star size={11} color="#FFFFFF" fill="#FFFFFF" />
              <Text
                style={{
                  fontFamily: 'DMSans_700Bold',
                  fontSize: 11,
                  color: '#FFFFFF',
                  letterSpacing: 0.2,
                }}
                numberOfLines={1}
              >
                {bestScore.toLocaleString()}
              </Text>
            </View>
          )}
        </View>

        {/* Logo - floats on the gradient with generous breathing room.
            No pedestal; whitespace does the framing. */}
        <Image
          source={game.image}
          resizeMode="contain"
          style={{ width: 44, height: 44 }}
        />

        {/* Title centered - focal element of the card. */}
        <Text
          style={{
            fontFamily: 'DMSans_700Bold',
            fontSize: 17,
            color: titleColor,
            letterSpacing: -0.3,
            textAlign: 'center',
          }}
          numberOfLines={1}
        >
          {game.name}
        </Text>

        {/* Play button alone at the bottom - the action is self-evident. */}
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: palette.accent,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Play size={14} color="#FFFFFF" fill="#FFFFFF" />
        </View>
      </LinearGradient>
    </SpringPressable>
  );
}
