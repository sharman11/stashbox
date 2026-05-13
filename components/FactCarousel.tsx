import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { type FactType, getDailyFacts } from '@/lib/money-facts';
import { useProfileStore } from '@/lib/stores/profile';
import { useAppTheme } from '@/lib/stores/theme';

interface TypeStyle {
  /** Two-stop diagonal gradient. Darker shade goes bottom-right so the
   *  watermark emoji in the top-right reads against the brighter region. */
  gradient: [string, string];
  /** Caps-locked label rendered in the top-left pill. Kept short so it
   *  never wraps even at 1.5× system font scale. */
  label: string;
  /** Colour for the active dot under each card. Picks the first gradient
   *  stop so the dot visually echoes the card it belongs to. */
  dotColor: string;
}

const STYLES: Record<FactType, TypeStyle> = {
  hack:      { gradient: ['#6366F1', '#4338CA'], label: 'MONEY HACK',     dotColor: '#6366F1' },
  myth:      { gradient: ['#F97316', '#C2410C'], label: 'MYTH BUSTED',    dotColor: '#F97316' },
  challenge: { gradient: ['#10B981', '#047857'], label: 'CHALLENGE',      dotColor: '#10B981' },
  mind:      { gradient: ['#A855F7', '#7E22CE'], label: 'MIND TRICK',     dotColor: '#A855F7' },
  stat:      { gradient: ['#06B6D4', '#0E7490'], label: 'BY THE NUMBERS', dotColor: '#06B6D4' },
  story:     { gradient: ['#F59E0B', '#B45309'], label: 'STORY TIME',     dotColor: '#F59E0B' },
  quote:     { gradient: ['#475569', '#1E293B'], label: 'WORDS TO LIVE BY', dotColor: '#475569' },
};

const AUTO_SCROLL_MS = 6500;
const CARD_COUNT = 3;

export function FactCarousel() {
  const C = useAppTheme();
  const { width } = useWindowDimensions();
  const cardWidth = width - 48;
  const snapInterval = cardWidth + 12;
  // Pull the primary currency so tip amounts read native to the user's locale
  // — ₹100 for INR, $1 for USD, ¥150 for JPY, etc. Falls back to USD before
  // the profile is loaded, which is rare since the carousel only renders
  // after auth/onboarding.
  const primaryCurrency = useProfileStore((s) => s.profile?.defaultCurrency) ?? 'USD';

  const facts = getDailyFacts(CARD_COUNT, primaryCurrency);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userScrolling = useRef(false);

  const scrollTo = (index: number) => {
    scrollRef.current?.scrollTo({ x: index * snapInterval, animated: true });
  };

  // Auto-advance — pauses while the user is dragging so a manual scroll never
  // gets snatched mid-gesture by the timer.
  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (userScrolling.current) return;
      setActiveIndex((prev) => {
        const next = (prev + 1) % facts.length;
        scrollTo(next);
        return next;
      });
    }, AUTO_SCROLL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [facts.length, snapInterval]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / snapInterval);
    if (index !== activeIndex) setActiveIndex(index);
  };

  return (
    <View>
      <ScrollView
        ref={scrollRef}
        horizontal
        snapToInterval={snapInterval}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        onScrollBeginDrag={() => { userScrolling.current = true; }}
        onScrollEndDrag={() => { userScrolling.current = false; }}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
      >
        {facts.map((fact, i) => {
          const style = STYLES[fact.type];
          return (
            <Animated.View key={`${fact.type}-${i}`} entering={FadeIn.duration(360).delay(i * 70)}>
              <LinearGradient
                colors={style.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: cardWidth,
                  borderRadius: 22,
                  padding: 20,
                  minHeight: 168,
                  overflow: 'hidden',
                  justifyContent: 'space-between',
                  shadowColor: style.dotColor,
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.18,
                  shadowRadius: 18,
                  elevation: 4,
                }}
              >
                {/* Decorative oversized emoji watermark in the top-right.
                    Pulled outside the visible bounds so only ~half is
                    visible — gives the card depth without competing with
                    the hero emoji or the headline. */}
                <Text
                  pointerEvents="none"
                  allowFontScaling={false}
                  style={{
                    position: 'absolute',
                    right: -20,
                    top: -34,
                    fontSize: 150,
                    opacity: 0.14,
                    transform: [{ rotate: '14deg' }],
                  }}
                >
                  {fact.emoji}
                </Text>

                {/* Top row: type pill on the left, hero emoji on the right. */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.22)',
                      borderRadius: 999,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                    }}
                  >
                    <Text
                      allowFontScaling={false}
                      maxFontSizeMultiplier={1}
                      style={{
                        fontFamily: 'DMSans_700Bold',
                        fontSize: 9,
                        color: '#FFFFFF',
                        letterSpacing: 1.4,
                        includeFontPadding: false,
                      }}
                    >
                      {style.label}
                    </Text>
                  </View>
                  <Text
                    allowFontScaling={false}
                    style={{ fontSize: 30, includeFontPadding: false }}
                  >
                    {fact.emoji}
                  </Text>
                </View>

                {/* Bottom block: headline + body. Spacing controlled by the
                    parent's justifyContent: 'space-between'. */}
                <View>
                  <Text
                    maxFontSizeMultiplier={1.2}
                    numberOfLines={2}
                    style={{
                      fontFamily: 'DMSans_700Bold',
                      fontSize: 18,
                      lineHeight: 23,
                      color: '#FFFFFF',
                      letterSpacing: -0.3,
                      includeFontPadding: false,
                    }}
                  >
                    {fact.headline}
                  </Text>
                  <Text
                    maxFontSizeMultiplier={1.2}
                    numberOfLines={3}
                    style={{
                      fontFamily: 'DMSans_400Regular',
                      fontSize: 13,
                      lineHeight: 19,
                      color: 'rgba(255,255,255,0.92)',
                      marginTop: 6,
                      includeFontPadding: false,
                    }}
                  >
                    {fact.body}
                  </Text>
                </View>
              </LinearGradient>
            </Animated.View>
          );
        })}
      </ScrollView>

      {/* Page dots — active dot stretches into a pill and adopts the active
          card's accent so the dot row visually echoes the card on screen. */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 6,
          marginTop: 14,
        }}
      >
        {facts.map((fact, i) => {
          const active = activeIndex === i;
          return (
            <View
              key={`dot-${i}`}
              style={{
                width: active ? 18 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: active ? STYLES[fact.type].dotColor : C.borderLight,
              }}
            />
          );
        })}
      </View>
    </View>
  );
}
