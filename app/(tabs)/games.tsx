import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Play, Star } from 'lucide-react-native';
import { useEffect } from 'react';
import { Image, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SpringPressable } from '@/components/SpringPressable';

import { AD_UNIT_IDS } from '@/lib/ads';
import { BannerAd, BannerAdSize } from '@/lib/ads-placeholder';
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

  const footerBg = isDark ? C.surfaceElevated : '#FFFFFF';
  const titleColor = isDark ? palette.accent : palette.accentDark;

  return (
    <SpringPressable
      onPress={() => router.push(game.route)}
      haptic
      accessibilityLabel={`Play ${game.name}`}
      style={{
        borderRadius: 22,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: palette.ring,
        backgroundColor: footerBg,
        shadowColor: 'rgba(0,0,0,0.10)',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 1,
        shadowRadius: 18,
        elevation: 3,
      }}
    >
      {/* Header - full-width game image. The sticker carries its own
          themed background, so it sits edge to edge with no padding.
          zIndex lifts it (and the play button child) above the footer so
          the button can straddle the seam. */}
      <View style={{ width: '100%', aspectRatio: 1, zIndex: 2 }}>
        <Image
          source={game.image}
          resizeMode="cover"
          style={{ width: '100%', height: '100%' }}
        />

        {/* Play button floats over the bottom-right, straddling the seam
            between the image and the footer - the card's primary action. */}
        <View
          style={{
            position: 'absolute',
            bottom: -19,
            right: 14,
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: palette.accent,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 3,
            borderColor: footerBg,
            elevation: 4,
            shadowColor: 'rgba(0,0,0,0.25)',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 1,
            shadowRadius: 6,
          }}
        >
          <Play size={14} color="#FFFFFF" fill="#FFFFFF" />
        </View>
      </View>

      {/* Footer - score tag on top, game title underneath. */}
      <View
        style={{
          paddingHorizontal: 14,
          paddingVertical: 12,
          gap: 4,
        }}
      >
        {/* Score tag - star + best score, or NEW. */}
        {bestScore == null ? (
          <Text
            style={{
              fontFamily: 'DMSans_700Bold',
              fontSize: 10,
              color: palette.accent,
              letterSpacing: 0.6,
            }}
          >
            NEW
          </Text>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Star size={11} color={palette.accent} fill={palette.accent} />
            <Text
              style={{
                fontFamily: 'DMSans_600SemiBold',
                fontSize: 11,
                color: C.textSecondary,
                letterSpacing: 0.2,
              }}
              numberOfLines={1}
            >
              {bestScore.toLocaleString()}
            </Text>
          </View>
        )}

        <Text
          style={{
            fontFamily: 'DMSans_700Bold',
            fontSize: 15,
            color: titleColor,
            letterSpacing: -0.3,
          }}
          numberOfLines={1}
        >
          {game.name}
        </Text>
      </View>
    </SpringPressable>
  );
}
