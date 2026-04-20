import { BookOpen, Lightbulb, TrendingUp } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, Text, View, useWindowDimensions } from 'react-native';

import { getDailyFacts } from '@/lib/money-facts';

const CARDS = [
  { Icon: Lightbulb, color: '#4338CA', bg: '#E0E7FF', cardBg: '#EEF2FF', label: 'DID YOU KNOW?' },
  { Icon: BookOpen, color: '#0F766E', bg: '#CCFBF1', cardBg: '#F0FDFA', label: 'SAVINGS TIP' },
  { Icon: TrendingUp, color: '#7E22CE', bg: '#E9D5FF', cardBg: '#F3E8FF', label: 'INSIGHT' },
];

const AUTO_SCROLL_MS = 5000;

export function FactCarousel() {
  const { width } = useWindowDimensions();
  const cardWidth = width - 48;
  const snapInterval = cardWidth + 10;
  const facts = getDailyFacts(3);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userScrolling = useRef(false);

  const scrollTo = (index: number) => {
    scrollRef.current?.scrollTo({ x: index * snapInterval, animated: true });
  };

  // Auto-scroll
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
    setActiveIndex(index);
  };

  const handleScrollBegin = () => {
    userScrolling.current = true;
  };

  const handleScrollEnd = () => {
    userScrolling.current = false;
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
        onScrollBeginDrag={handleScrollBegin}
        onScrollEndDrag={handleScrollEnd}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
      >
        {facts.map((fact, i) => {
          const card = CARDS[i % CARDS.length];

          return (
            <View
              key={i}
              style={{
                width: cardWidth, backgroundColor: card.cardBg, borderRadius: 14, padding: 14,
                flexDirection: 'row', alignItems: 'flex-start', gap: 10,
              }}
            >
              <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: card.bg, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                <card.Icon size={14} color={card.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 10, color: card.color, letterSpacing: 0.5 }}>
                  {card.label}
                </Text>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: '#4B5563', lineHeight: 18, marginTop: 3 }}>
                  {fact.fact}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Page dots */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 }}>
        {facts.map((_, i) => (
          <View
            key={i}
            style={{
              width: activeIndex === i ? 16 : 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: activeIndex === i ? CARDS[i % CARDS.length].cardBg : '#E5E7EB',
            }}
          />
        ))}
      </View>
    </View>
  );
}
