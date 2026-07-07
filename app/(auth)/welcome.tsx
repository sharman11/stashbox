import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import {
  FlatList,
  Image,
  type ImageSourcePropType,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SpringPressable } from '@/components/SpringPressable';
import { useProfileStore } from '@/lib/stores/profile';
import { useSessionStore } from '@/lib/stores/session';
import { useAppTheme } from '@/lib/stores/theme';

// Reanimated's pre-wrapped FlatList (see HomeHero for why not
// createAnimatedComponent).
const AnimatedFlatList = Animated.FlatList;

interface Slide {
  key: string;
  image: ImageSourcePropType;
  headline: string;
  subhead: string;
}

const SLIDES: Slide[] = [
  {
    key: 'track',
    image: require('@/assets/welcome/slide-1-track.webp'),
    headline: 'Know your stash',
    subhead: "Cash hidden at home is easy to lose track of. This is where you don't.",
  },
  {
    key: 'anywhere',
    image: require('@/assets/welcome/slide-2-anywhere.webp'),
    headline: 'Stash it anywhere',
    subhead: "Rice jar, sock drawer, behind the books. Log it here, you'll remember.",
  },
  {
    key: 'goal',
    image: require('@/assets/welcome/slide-3-goal.webp'),
    headline: 'Saving for something?',
    subhead: 'Set the target and every stash you log moves you closer.',
  },
  {
    key: 'streak',
    image: require('@/assets/welcome/slide-4-daily.webp'),
    headline: 'Make it a daily thing',
    subhead: 'Drop in a little each day. Your streak does the cheering for you.',
  },
];

export default function WelcomeScreen() {
  const C = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  // Hero takes ~55% of screen but never drops below 420 (so the artwork has
  // breathing room on short devices). Computed in pixels because RN treats
  // percentage heights of a parent without an explicit `height` as 0 — that
  // bug was making slides 2-4 render with invisible images.
  const heroHeight = Math.max(420, Math.round(height * 0.55));
  const userId = useSessionStore((s) => s.userId);
  const isAnonymous = useSessionStore((s) => s.isAnonymous);
  const transitioning = useSessionStore((s) => s.transitioning);
  const profile = useProfileStore((s) => s.profile);
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);

  // Continuous scroll position — drives the morphing pagination dots.
  const scrollX = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.value = e.contentOffset.x;
    },
  });

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== index) setIndex(next);
  };

  const goTo = (i: number) => {
    listRef.current?.scrollToIndex({ index: i, animated: true });
    setIndex(i);
  };

  // Self-redirect for logged-in users who get routed here by a stale restore
  // on cold start. Synchronous — closes the splash-exit race window.
  if (!transitioning && userId && !isAnonymous && profile?.onboardingDone) {
    return <Redirect href="/" />;
  }
  if (!transitioning && userId && !isAnonymous && profile && !profile.onboardingDone) {
    return <Redirect href="/(auth)/signup" />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.pageBg }}>
      <StatusBar style="dark" />

      <AnimatedFlatList
        ref={listRef as never}
        data={SLIDES}
        keyExtractor={(s) => (s as Slide).key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={onMomentumScrollEnd}
        renderItem={({ item }) => (
          <SlideView slide={item as Slide} width={width} heroHeight={heroHeight} />
        )}
        style={{ flex: 1 }}
      />

      {/* Pagination dots — morph with the swipe (same pattern as the home
       *  hero pager) and are tappable to jump to a slide. */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          paddingTop: 4,
          paddingBottom: 16,
        }}
      >
        {SLIDES.map((s, i) => (
          <Pressable key={s.key} onPress={() => goTo(i)} hitSlop={8} style={{ padding: 4 }}>
            <WelcomeDot index={i} scrollX={scrollX} pageWidth={width} accent={C.accent} />
          </Pressable>
        ))}
      </View>

      {/* CTA — one button. There's no separate "log in" path any more:
       *  email OTP handles both new and returning users behind the scenes. */}
      <View
        style={{
          paddingHorizontal: 24,
          paddingBottom: Math.max(insets.bottom, 16) + 8,
        }}
      >
        <SpringPressable
          onPress={() => router.push('/(auth)/email-otp')}
          haptic
          style={{
            borderRadius: 14,
            shadowColor: C.heroBot,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.35,
            shadowRadius: 20,
            elevation: 8,
          }}
        >
          <LinearGradient
            colors={[C.heroTop, C.heroMid, C.heroBot]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              allowFontScaling={false}
              maxFontSizeMultiplier={1}
              numberOfLines={1}
              style={{
                fontFamily: 'DMSans_600SemiBold',
                fontSize: 16,
                color: '#FFFFFF',
                includeFontPadding: false,
                letterSpacing: 0.2,
              }}
            >
              Continue with email
            </Text>
          </LinearGradient>
        </SpringPressable>

        {/* What happens next — removes the "is this a password signup?"
         *  hesitation at the commitment moment. */}
        <Text
          allowFontScaling={false}
          style={{
            fontFamily: 'DMSans_400Regular',
            fontSize: 12,
            color: C.textMuted,
            textAlign: 'center',
            marginTop: 10,
          }}
        >
          No password. We&apos;ll email you a code.
        </Text>
      </View>
    </View>
  );
}

/** Pagination dot that stretches into a pill as its page becomes active —
 *  interpolated from the live scroll offset, same as the home hero pager. */
function WelcomeDot({
  index,
  scrollX,
  pageWidth,
  accent,
}: {
  index: number;
  scrollX: ReturnType<typeof useSharedValue<number>>;
  pageWidth: number;
  accent: string;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const distance = Math.abs(scrollX.value / pageWidth - index);
    const clamped = Math.min(1, distance);
    return {
      width: interpolate(clamped, [0, 1], [22, 8]),
      opacity: interpolate(clamped, [0, 1], [1, 0.3]),
    };
  });

  return (
    <Animated.View
      style={[
        {
          height: 8,
          borderRadius: 4,
          backgroundColor: accent,
        },
        animatedStyle,
      ]}
    />
  );
}

interface SlideViewProps {
  slide: Slide;
  width: number;
  heroHeight: number;
}

function SlideView({ slide, width, heroHeight }: SlideViewProps) {
  const C = useAppTheme();
  return (
    <View style={{ width }}>
      {/* Hero: image fills edge to edge from top of screen */}
      <View
        style={{
          height: heroHeight,
          backgroundColor: C.pageBg,
          overflow: 'hidden',
        }}
      >
        <Image
          source={slide.image}
          resizeMode="cover"
          style={{ flex: 1, width: '100%' }}
        />
      </View>

      {/* Copy block */}
      <View style={{ paddingHorizontal: 28, paddingTop: 32 }}>
        <Text
          allowFontScaling={false}
          maxFontSizeMultiplier={1}
          style={{
            fontFamily: 'DMSans_700Bold',
            fontSize: 26,
            lineHeight: 32,
            color: C.textPrimary,
            letterSpacing: -0.4,
            includeFontPadding: false,
          }}
        >
          {slide.headline}
        </Text>
        <Text
          allowFontScaling={false}
          maxFontSizeMultiplier={1}
          style={{
            fontFamily: 'DMSans_400Regular',
            fontSize: 15,
            lineHeight: 22,
            color: C.textSecondary,
            marginTop: 12,
            includeFontPadding: false,
          }}
        >
          {slide.subhead}
        </Text>
      </View>
    </View>
  );
}
