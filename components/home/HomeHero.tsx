import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Settings } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { GestureResponderEvent, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { FlatList, Image, ImageBackground, Text, View, useWindowDimensions, type ImageSourcePropType } from 'react-native';
import Animated, {
  FadeIn,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import Svg, { Defs, G, LinearGradient as SvgGradient, Line, Path, Polyline, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { AnimatedNumber } from '@/components/AnimatedNumber';
import { AvatarVisual } from '@/components/AvatarVisual';
import { SpringPressable } from '@/components/SpringPressable';
import { formatAmount } from '@/lib/currency';
import type { CurrencyCode } from '@/lib/currency';
import { convertCents, getCachedRates, getFxRates } from '@/lib/expenses/fx';
import { useAvatarStore } from '@/lib/stores/avatar';
import { useExpenseTransactionsStore } from '@/lib/stores/expense-transactions';
import { useLoansStore } from '@/lib/stores/loans';
import { useMoneyboxesStore } from '@/lib/stores/moneyboxes';
import { usePersonalizationStore, type HeroBackground } from '@/lib/stores/personalization';
import { useProfileStore } from '@/lib/stores/profile';
import { useAppTheme } from '@/lib/stores/theme';
import { getTheme } from '@/lib/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CHART_HEIGHT = 170;
const CHART_PAD_BOTTOM = 26;
const CHART_PAD_TOP = 12;

// Image-backed hero backgrounds. Any key present here renders as a full-bleed
// ImageBackground; anything else (i.e. 'default') falls back to the brand
// gradient. require() needs static literals, so these live at module scope.
const HERO_IMAGE_SOURCES: Partial<Record<HeroBackground, ImageSourcePropType>> = {
  'painted-frame': require('@/assets/home/hero-frame-bg.webp'),
  meadow: require('@/assets/home/hero-meadow-bg.webp'),
  'leaf-frame': require('@/assets/home/hero-leaf-frame-bg.webp'),
  'forest-peek': require('@/assets/home/hero-forest-peek-bg.webp'),
};

type HeroView = 'stash' | 'spend' | 'owe';

interface ViewMeta {
  key: HeroView;
  /** Past-tense verb used as the eyebrow noun. */
  verb: string;
  /** "Paid down" needs two words; everything else is single-word. */
  verbLong: string;
  /** Noun label shown in the bottom page nav — matches the tab names. */
  navLabel: string;
  deltaPolarity: 'positive_good' | 'positive_bad';
}

const VIEWS: readonly ViewMeta[] = [
  { key: 'stash', verb: 'Saved', verbLong: 'Saved', navLabel: 'Stash', deltaPolarity: 'positive_good' },
  { key: 'spend', verb: 'Spent', verbLong: 'Spent', navLabel: 'Expenses', deltaPolarity: 'positive_bad' },
  { key: 'owe', verb: 'Paid', verbLong: 'Paid down', navLabel: 'Loan', deltaPolarity: 'positive_good' },
];

type Range = 'week' | 'month' | '3months';

interface RangeMeta {
  key: Range;
  label: string;
  days: number;
}

const RANGES: readonly RangeMeta[] = [
  { key: 'week', label: 'Week', days: 7 },
  { key: 'month', label: 'Month', days: 30 },
  { key: '3months', label: '3M', days: 90 },
];

interface ChartSeries {
  id: string;
  color: string;
  values: number[];
  label?: string;
}

interface ViewData {
  series: ChartSeries[];
  big: number;
  prev: number;
  hasData: boolean;
}

function daysAgoYmd(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function buildWindow(days: number): string[] {
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) out.push(daysAgoYmd(i));
  return out;
}

function shortMonthDay(ymd: string): string {
  const [, m, d] = ymd.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const mi = Number(m) - 1;
  return `${months[mi] ?? ''} ${Number(d)}`;
}

/** Blend a #RRGGBB color toward white by `amt` (0–1) so chart lines read
 *  brighter/more luminous against the dark hero without getting thicker. */
function brighten(hex: string, amt = 0.3): string {
  const m = hex.replace('#', '');
  if (m.length !== 6) return hex;
  const mix = (c: number) => Math.round(c + (255 - c) * amt);
  const r = mix(parseInt(m.slice(0, 2), 16));
  const g = mix(parseInt(m.slice(2, 4), 16));
  const b = mix(parseInt(m.slice(4, 6), 16));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function niceCeil(n: number): number {
  if (n <= 0) return 0;
  const mag = Math.pow(10, Math.floor(Math.log10(n)));
  const norm = n / mag;
  if (norm <= 1) return 1 * mag;
  if (norm <= 2) return 2 * mag;
  if (norm <= 5) return 5 * mag;
  return 10 * mag;
}

function compactCurrency(n: number, currency: CurrencyCode): string {
  if (n >= 1000) {
    const k = n / 1000;
    return `${formatAmount(Math.round(k), currency).replace(/\.\d+$/, '')}K`.replace(/(\d)K/, (m, d) => `${d}K`);
  }
  return formatAmount(Math.round(n), currency);
}

// Use Reanimated's pre-wrapped Animated.FlatList instead of
// createAnimatedComponent(FlatList) — the latter can crash on initial mount
// in certain Expo SDK / Reanimated combinations.
const AnimatedFlatList = Animated.FlatList;

export function HomeHero() {
  const C = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { profile } = useProfileStore();
  const avatarId = useAvatarStore((s) => s.id);

  const moneyboxes = useMoneyboxesStore((s) => s.moneyboxes);
  const cellsByMoneybox = useMoneyboxesStore((s) => s.cellsByMoneybox);
  const loans = useLoansStore((s) => s.loans);
  const paymentsByLoan = useLoansStore((s) => s.paymentsByLoan);
  const transactions = useExpenseTransactionsStore((s) => s.transactions);

  // Personalization — user can opt into the painted-frame illustration as
  // their hero background instead of the default gradient + mascot.
  const heroBackground = usePersonalizationStore((s) => s.heroBackground);
  const hydratePersonalization = usePersonalizationStore((s) => s.hydrate);
  useEffect(() => {
    hydratePersonalization();
  }, [hydratePersonalization]);

  const displayCcy: CurrencyCode = profile?.defaultCurrency ?? 'USD';

  const [range, setRange] = useState<Range>('month');
  const [activeIdx, setActiveIdx] = useState(0);
  const [, setFxTick] = useState(0);

  useEffect(() => {
    let alive = true;
    getFxRates().then(() => {
      if (alive) setFxTick((t) => t + 1);
    });
    return () => {
      alive = false;
    };
  }, []);

  // ── Compute data for all 3 views in one pass; pages each consume their slice ──
  const { dataByView, window, days } = useMemo(() => {
    const rates = getCachedRates();
    const rangeMeta = RANGES.find((r) => r.key === range)!;
    const days = rangeMeta.days;
    const window = buildWindow(days);
    const prevWindow: string[] = [];
    for (let i = days * 2 - 1; i >= days; i--) prevWindow.push(daysAgoYmd(i));
    const prevSet = new Set(prevWindow);
    const curSet = new Set(window);

    // ── STASH ──
    const stashOut: ChartSeries[] = [];
    let stashBig = 0;
    let stashPrev = 0;
    for (const box of moneyboxes) {
      if (box.status !== 'active') continue;
      const boxTheme = getTheme(box.theme);
      const cells = cellsByMoneybox[box.id] ?? [];
      const dailyAdds = new Map<string, number>();
      let priorCumulative = 0;
      for (const c of cells) {
        if (!c.isFilled || !c.filledAt) continue;
        const ymd = c.filledAt.slice(0, 10);
        if (ymd < window[0]) {
          priorCumulative += c.amount;
        } else {
          dailyAdds.set(ymd, (dailyAdds.get(ymd) ?? 0) + c.amount);
        }
        const cents = convertCents(Math.round(c.amount * 100), box.currency, displayCcy, rates) / 100;
        if (curSet.has(ymd)) stashBig += cents;
        if (prevSet.has(ymd)) stashPrev += cents;
      }
      const values: number[] = new Array(days).fill(0);
      let running = priorCumulative;
      for (let i = 0; i < days; i++) {
        running += dailyAdds.get(window[i]) ?? 0;
        values[i] = convertCents(Math.round(running * 100), box.currency, displayCcy, rates) / 100;
      }
      stashOut.push({ id: box.id, color: boxTheme.accent, values, label: box.name });
    }
    const stashHasData = stashOut.some((s) => s.values.some((v) => v > 0));

    // ── SPEND ──
    const dailyIncome = new Array(days).fill(0);
    const dailyExpense = new Array(days).fill(0);
    let spendBig = 0;
    let spendPrev = 0;
    for (const t of transactions) {
      const ymd = t.occurredOn;
      const amount = convertCents(t.amountCents, t.currency, displayCcy, rates) / 100;
      const idx = window.indexOf(ymd);
      if (idx >= 0) {
        if (t.type === 'income') dailyIncome[idx] += amount;
        else dailyExpense[idx] += amount;
      }
      if (t.type === 'expense') {
        if (curSet.has(ymd)) spendBig += amount;
        if (prevSet.has(ymd)) spendPrev += amount;
      }
    }
    const incomeSeries: number[] = new Array(days).fill(0);
    const expenseSeries: number[] = new Array(days).fill(0);
    let ri = 0;
    let re = 0;
    for (let i = 0; i < days; i++) {
      ri += dailyIncome[i];
      re += dailyExpense[i];
      incomeSeries[i] = ri;
      expenseSeries[i] = re;
    }
    const spendSeries: ChartSeries[] = [
      { id: 'income', color: '#86EFAC', values: incomeSeries, label: 'Income' },
      { id: 'expense', color: '#FCA5A5', values: expenseSeries, label: 'Expense' },
    ];

    // ── OWE (paid down) ──
    const dailyRepaidCents = new Array(days).fill(0);
    let oweBig = 0;
    let owePrev = 0;
    for (const loan of loans) {
      const ps = paymentsByLoan[loan.id] ?? [];
      for (const p of ps) {
        const idx = window.indexOf(p.paymentDate);
        if (idx >= 0) dailyRepaidCents[idx] += p.principalCents;
        const principal = p.principalCents / 100;
        if (curSet.has(p.paymentDate)) oweBig += principal;
        if (prevSet.has(p.paymentDate)) owePrev += principal;
      }
    }
    const repaid: number[] = new Array(days).fill(0);
    let runningRepaid = 0;
    for (let i = 0; i < days; i++) {
      runningRepaid += dailyRepaidCents[i] / 100;
      repaid[i] = runningRepaid;
    }
    const oweSeries: ChartSeries[] = [
      { id: 'repaid', color: '#B2EEB8', values: repaid, label: 'Repaid' },
    ];

    const dataByView: Record<HeroView, ViewData> = {
      stash: { series: stashOut, big: stashBig, prev: stashPrev, hasData: stashHasData },
      spend: { series: spendSeries, big: spendBig, prev: spendPrev, hasData: ri > 0 || re > 0 },
      owe: { series: oweSeries, big: oweBig, prev: owePrev, hasData: runningRepaid > 0 },
    };

    return { dataByView, window, days };
  }, [range, moneyboxes, cellsByMoneybox, loans, paymentsByLoan, transactions, displayCcy]);

  // Y-axis shared per page (each page maxes against its own series).
  const yMaxByView: Record<HeroView, number> = {
    stash: niceCeil(dataByView.stash.series.reduce((m, s) => Math.max(m, ...s.values), 0)),
    spend: niceCeil(dataByView.spend.series.reduce((m, s) => Math.max(m, ...s.values), 0)),
    owe: niceCeil(dataByView.owe.series.reduce((m, s) => Math.max(m, ...s.values), 0)),
  };

  const datePositions =
    days <= 7 ? [0, Math.floor(days / 2), days - 1] : [0, Math.floor(days / 3), Math.floor((2 * days) / 3), days - 1];

  // ── Scroll position + programmatic page navigation ──
  const scrollX = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.value = e.contentOffset.x;
    },
  });
  const listRef = useRef<FlatList<ViewMeta> | null>(null);

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
    if (next !== activeIdx && next >= 0 && next < VIEWS.length) setActiveIdx(next);
  };

  const goTo = (idx: number) => {
    if (idx < 0 || idx >= VIEWS.length) return;
    listRef.current?.scrollToIndex({ index: idx, animated: true });
    setActiveIdx(idx);
  };

  const heroShellStyle = {
    paddingTop: insets.top + 12,
    paddingBottom: 18,
    overflow: 'hidden' as const,
  };

  const decorativeLayers =
    heroBackground === 'default' ? (
      <>
        {/* Painterly noise + vignette texture layer */}
        <View
          pointerEvents="none"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <Image
            source={require('@/assets/home/hero-texture.webp')}
            style={{ width: '100%', height: '100%', opacity: 0.3 }}
            resizeMode="cover"
          />
        </View>
        {/* Soft inner highlight on top-left */}
        <LinearGradient
          colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.7, y: 0.7 }}
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '60%',
            height: '50%',
          }}
        />
        {/* Mascot peek */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            bottom: -3,
            left: -5,
            width: 70,
            height: 78,
          }}
        >
          <Image
            source={require('@/assets/home/mascot-peek.webp')}
            style={{ width: '100%', height: '100%' }}
            resizeMode="contain"
          />
        </View>
      </>
    ) : null;

  const heroImageSource = HERO_IMAGE_SOURCES[heroBackground];
  const HeroShell = (heroImageSource
    ? ({ children }: { children: React.ReactNode }) => (
        <ImageBackground source={heroImageSource} resizeMode="cover" style={heroShellStyle}>
          {children}
        </ImageBackground>
      )
    : ({ children }: { children: React.ReactNode }) => (
        <LinearGradient
          colors={['#06291F', '#145A42', '#1A8A66', '#2A9B72']}
          locations={[0, 0.35, 0.75, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={heroShellStyle}
        >
          {children}
        </LinearGradient>
      ));

  return (
    <View style={{ backgroundColor: C.heroTop }}>
      <HeroShell>
        {decorativeLayers}

        {/* Option 3 — overall mute: a soft dark wash that calms the entire hero
         *  background (gradient, texture, or painted frame) so the chart and
         *  text sit on a quieter base. */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.15)',
          }}
        />

        {/* Top chrome */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
          }}
        >
          <SpringPressable
            onPress={() => router.push('/(tabs)/profile')}
            haptic
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.18)',
              overflow: 'hidden',
              backgroundColor: 'rgba(255,255,255,0.06)',
            }}
          >
            <AvatarVisual avatar={avatarId} size={36} />
          </SpringPressable>

          <SpringPressable
            onPress={() => router.push('/(tabs)/settings')}
            haptic
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.08)',
            }}
          >
            <Settings size={18} color="#FFFFFF" />
          </SpringPressable>
        </View>

        {/* Spacer — preserves the hero height the range filter used to take
         *  up (filter row was ~30px tall + 14px marginTop = ~44px). */}
        <View style={{ height: 44 }} />

        {/* Horizontal pager — 3 pages, one per view */}
        <AnimatedFlatList
          ref={listRef as never}
          horizontal
          pagingEnabled
          // Swipe is intentionally disabled — the floating pill switcher (the
          // ◀ NAVLABEL ▶ control below) is the only way to change views.
          // goTo()'s scrollToIndex still works while scrollEnabled is false.
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          data={VIEWS}
          keyExtractor={(item) => (item as ViewMeta).key}
          renderItem={({ item }) => {
            const meta = item as ViewMeta;
            const data = dataByView[meta.key];
            return (
              <HeroPage
                meta={meta}
                range={range}
                data={data}
                yMax={yMaxByView[meta.key]}
                window={window}
                days={days}
                datePositions={datePositions}
                screenWidth={screenWidth}
                displayCcy={displayCcy}
              />
            );
          }}
          onScroll={onScroll}
          onMomentumScrollEnd={onMomentumScrollEnd}
          scrollEventThrottle={16}
          decelerationRate="fast"
          snapToInterval={screenWidth}
          snapToAlignment="start"
        />

      </HeroShell>

      {/* Floating pill nav — sits half on the hero, half on the content
       *  below. Bridges the boundary like a chip handle. */}
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: -18,
          alignItems: 'center',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#FFFFFF',
            borderRadius: 999,
            paddingHorizontal: 14,
            paddingVertical: 9,
            gap: 14,
            shadowColor: '#000',
            shadowOpacity: 0.18,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: 6,
          }}
        >
          <SpringPressable
            onPress={() => goTo(activeIdx - 1)}
            disabled={activeIdx === 0}
            haptic
            style={{
              opacity: activeIdx === 0 ? 0.25 : 1,
              padding: 2,
            }}
          >
            <ChevronLeft size={16} color="#06291F" />
          </SpringPressable>
          <Text
            style={{
              fontFamily: 'DMSans_700Bold',
              fontSize: 11,
              color: '#06291F',
              letterSpacing: 1.2,
              minWidth: 72,
              textAlign: 'center',
            }}
          >
            {(VIEWS[activeIdx]?.navLabel ?? '').toUpperCase()}
          </Text>
          <SpringPressable
            onPress={() => goTo(activeIdx + 1)}
            disabled={activeIdx === VIEWS.length - 1}
            haptic
            style={{
              opacity: activeIdx === VIEWS.length - 1 ? 0.25 : 1,
              padding: 2,
            }}
          >
            <ChevronRight size={16} color="#06291F" />
          </SpringPressable>
        </View>
      </View>
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────────────
 * A single hero page — eyebrow + big number + delta + chart for one view
 * ──────────────────────────────────────────────────────────────────── */

interface HeroPageProps {
  meta: ViewMeta;
  range: Range;
  data: ViewData;
  yMax: number;
  window: readonly string[];
  days: number;
  datePositions: readonly number[];
  screenWidth: number;
  displayCcy: CurrencyCode;
}

function HeroPage({ meta, range, data, yMax, window, days, datePositions, screenWidth, displayCcy }: HeroPageProps) {
  const { series, big, prev, hasData } = data;

  // When the user scrubs the chart, the hero header becomes a live readout
  // of the touched date instead of the period summary.
  const [cursorIdx, setCursorIdx] = useState<number | null>(null);
  const scrubbing = cursorIdx !== null;

  const deltaRaw = big - prev;
  const showDelta = !scrubbing && Math.abs(deltaRaw) >= 1 && prev > 0;
  const isGoodDirection = meta.deltaPolarity === 'positive_good' ? deltaRaw > 0 : deltaRaw < 0;
  const deltaSign = deltaRaw > 0 ? 'up' : 'down';

  const periodName = range === 'week' ? 'week' : range === 'month' ? 'month' : '3 months';
  const periodSuffix = range === 'week' ? 'this week' : range === 'month' ? 'this month' : 'past 3 months';

  const deltaLabelText = (() => {
    if (meta.key === 'spend') return deltaSign === 'up' ? `more than last ${periodName}` : `less than last ${periodName}`;
    return deltaSign === 'up' ? `ahead of last ${periodName}` : `behind last ${periodName}`;
  })();

  // Aggregate value across all series at the cursor index (for multi-series
  // views like Stash, this is the sum of all moneybox balances on that day).
  const cursorValue = (() => {
    if (!scrubbing) return 0;
    return series.reduce((sum, s) => sum + (s.values[cursorIdx] ?? 0), 0);
  })();
  const cursorDate = scrubbing ? shortMonthDay(window[cursorIdx] ?? '') : '';

  // Eyebrow swaps to "Saved May 15" while scrubbing; big number swaps to the
  // cursor's aggregate value.
  const heroLabel = scrubbing
    ? `${meta.verbLong} ${cursorDate}`
    : `${meta.verbLong} ${periodSuffix}`;
  const displayValue = scrubbing ? cursorValue : big;

  return (
    <View style={{ width: screenWidth }}>
      {/* Eyebrow + big number + delta */}
      <Animated.View
        entering={FadeIn.duration(200)}
        style={{ paddingHorizontal: 20, alignItems: 'center', marginTop: 14 }}
      >
        <Text
          style={{
            fontFamily: 'DMSans_500Medium',
            fontSize: 9,
            color: 'rgba(255,255,255,0.55)',
            letterSpacing: 0.8,
            marginBottom: 3,
            textAlign: 'center',
          }}
        >
          {heroLabel.toUpperCase()}
        </Text>
        <AnimatedNumber
          value={Math.round(displayValue)}
          formatter={(n) => formatAmount(n, displayCcy)}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.55}
          style={{
            fontFamily: 'DMSans_700Bold',
            fontSize: 40,
            color: '#FFFFFF',
            letterSpacing: -1.2,
            lineHeight: 48,
            textAlign: 'center',
          }}
        />
        {showDelta && (
          <Animated.View
            entering={FadeIn.duration(300).delay(80)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              alignSelf: 'center',
              gap: 6,
              marginTop: 8,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 999,
              backgroundColor: 'rgba(255,255,255,0.10)',
            }}
          >
            {deltaSign === 'up' ? (
              <ArrowUp size={14} color={isGoodDirection ? '#86EFAC' : '#FCA5A5'} />
            ) : (
              <ArrowDown size={14} color={isGoodDirection ? '#86EFAC' : '#FCA5A5'} />
            )}
            <Text
              style={{
                fontFamily: 'DMSans_500Medium',
                fontSize: 13,
                color: isGoodDirection ? '#86EFAC' : '#FCA5A5',
              }}
            >
              <Text style={{ fontFamily: 'DMSans_600SemiBold' }}>
                {formatAmount(Math.round(Math.abs(deltaRaw)), displayCcy)}
              </Text>
              {`  ${deltaLabelText}`}
            </Text>
          </Animated.View>
        )}
      </Animated.View>

      {/* Legend (only when >1 series) */}
      {series.length > 1 && hasData && (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 12,
            marginTop: 12,
            paddingHorizontal: 16,
          }}
        >
          {series.map((s) => (
            <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: brighten(s.color) }} />
              <Text
                numberOfLines={1}
                style={{
                  fontFamily: 'DMSans_500Medium',
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.75)',
                }}
              >
                {s.label}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Chart */}
      <View style={{ marginTop: 14 }}>
        <InteractiveChart
          series={series}
          window={window}
          yMax={yMax}
          chartOuterWidth={screenWidth}
          displayCcy={displayCcy}
          datePositions={datePositions}
          singleSeriesFill={meta.key === 'owe'}
          onCursorChange={setCursorIdx}
        />
      </View>
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────────────
 * Page dot — animates width + opacity based on scroll position
 * ──────────────────────────────────────────────────────────────────── */

interface PageDotProps {
  index: number;
  scrollX: ReturnType<typeof useSharedValue<number>>;
  pageWidth: number;
}

function PageDot({ index, scrollX, pageWidth }: PageDotProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const distance = Math.abs(scrollX.value / pageWidth - index);
    const clamped = Math.min(1, distance);
    const width = interpolate(clamped, [0, 1], [22, 7]);
    const opacity = interpolate(clamped, [0, 1], [0.95, 0.35]);
    return {
      width,
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        {
          height: 7,
          borderRadius: 4,
          backgroundColor: '#FFFFFF',
        },
        animatedStyle,
      ]}
    />
  );
}

/* ──────────────────────────────────────────────────────────────────────
 * Range filter — Week / Month / 3M
 * ──────────────────────────────────────────────────────────────────── */

interface RangeFilterProps {
  range: Range;
  onChange: (r: Range) => void;
}

function RangeFilter({ range, onChange }: RangeFilterProps) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {RANGES.map((r) => {
        const active = r.key === range;
        return (
          <SpringPressable
            key={r.key}
            onPress={() => onChange(r.key)}
            haptic
            style={{
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: active ? 'rgba(255,255,255,0.95)' : 'transparent',
              borderWidth: 1,
              borderColor: active ? 'rgba(255,255,255,0)' : 'rgba(255,255,255,0.16)',
            }}
          >
            <Text
              style={{
                fontFamily: active ? 'DMSans_600SemiBold' : 'DMSans_500Medium',
                fontSize: 12,
                color: active ? '#06291F' : 'rgba(255,255,255,0.7)',
                letterSpacing: 0.2,
              }}
            >
              {r.label}
            </Text>
          </SpringPressable>
        );
      })}
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────────────
 * Interactive chart — multi-series with touch scrubber + callout
 * ──────────────────────────────────────────────────────────────────── */

interface InteractiveChartProps {
  series: readonly ChartSeries[];
  window: readonly string[];
  yMax: number;
  chartOuterWidth: number;
  displayCcy: CurrencyCode;
  datePositions: readonly number[];
  singleSeriesFill: boolean;
  /** Notified when the user is scrubbing across the chart, so the parent
   *  (hero header) can swap its big-number + eyebrow to the touched date. */
  onCursorChange?: (idx: number | null) => void;
}

function InteractiveChart({
  series,
  window: dateWindow,
  yMax,
  chartOuterWidth,
  displayCcy,
  datePositions,
  singleSeriesFill,
  onCursorChange,
}: InteractiveChartProps) {
  const [cursorIdx, setCursorIdx] = useState<number | null>(null);
  const lastTouchTs = useRef(0);
  const days = series[0]?.values.length ?? 0;
  const usableH = CHART_HEIGHT - CHART_PAD_TOP - CHART_PAD_BOTTOM;
  const chartLeftPad = 0;
  const chartInnerWidth = chartOuterWidth;

  const toY = (v: number): number => {
    if (yMax <= 0) return CHART_PAD_TOP + usableH;
    const clamped = Math.max(0, Math.min(yMax, v));
    return CHART_PAD_TOP + (1 - clamped / yMax) * usableH;
  };
  const toX = (i: number): number => {
    if (days < 2) return chartLeftPad;
    return chartLeftPad + (i / (days - 1)) * chartInnerWidth;
  };

  const indexFromTouch = (locationX: number): number => {
    if (days === 0) return 0;
    const relative = locationX - chartLeftPad;
    const t = chartInnerWidth > 0 ? relative / chartInnerWidth : 0;
    const raw = Math.round(t * (days - 1));
    return Math.max(0, Math.min(days - 1, raw));
  };

  const updateCursor = (idx: number | null) => {
    setCursorIdx(idx);
    onCursorChange?.(idx);
  };

  // The chart only claims the gesture once the user is actively dragging
  // (not on initial touch) — this lets quick horizontal swipes from inside
  // the chart still page the parent FlatList.
  const handleMove = (e: GestureResponderEvent) => {
    const now = Date.now();
    if (now - lastTouchTs.current < 12) return;
    lastTouchTs.current = now;
    updateCursor(indexFromTouch(e.nativeEvent.locationX));
  };

  const handleEnd = () => updateCursor(null);

  const cursorActive = cursorIdx !== null;
  const cIdx = cursorIdx ?? days - 1;
  const cX = toX(cIdx);

  const seriesPoints = series.map((s) =>
    s.values.length > 1 ? s.values.map((v, i) => `${toX(i).toFixed(2)},${toY(v).toFixed(2)}`).join(' ') : '',
  );

  const areaPath = (() => {
    if (!singleSeriesFill) return '';
    const s = series[0];
    if (!s || s.values.length < 2) return '';
    const top = s.values
      .map((v, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(2)} ${toY(v).toFixed(2)}`)
      .join(' ');
    const firstX = toX(0);
    const lastX = toX(s.values.length - 1);
    const bottomY = CHART_PAD_TOP + usableH;
    return `${top} L ${lastX.toFixed(2)} ${bottomY} L ${firstX.toFixed(2)} ${bottomY} Z`;
  })();

  return (
    <View
      onMoveShouldSetResponder={() => true}
      onResponderMove={handleMove}
      onResponderRelease={handleEnd}
      onResponderTerminate={handleEnd}
      style={{ width: chartOuterWidth, height: CHART_HEIGHT }}
    >
      <Svg width={chartOuterWidth} height={CHART_HEIGHT}>
        <Defs>
          <SvgGradient id="loanArea" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={brighten('#B2EEB8')} stopOpacity={0.28} />
            <Stop offset="0.6" stopColor={brighten('#7DF3C2')} stopOpacity={0.08} />
            <Stop offset="1" stopColor={brighten('#7DF3C2')} stopOpacity={0} />
          </SvgGradient>
        </Defs>

        {areaPath && <Path d={areaPath} fill="url(#loanArea)" />}

        {series.map((s, sIdx) => {
          const pts = seriesPoints[sIdx];
          if (!pts) return null;
          return (
            <G key={s.id}>
              <Polyline
                points={pts}
                fill="none"
                stroke={brighten(s.color)}
                strokeOpacity={0.22}
                strokeWidth={6}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <Polyline
                points={pts}
                fill="none"
                stroke={brighten(s.color)}
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </G>
          );
        })}

        {!cursorActive && series.length > 0 && seriesPoints[0] && (
          <G>
            {series.map((s) => {
              const last = s.values[s.values.length - 1];
              const lx = toX(s.values.length - 1);
              const ly = toY(last ?? 0);
              return (
                <G key={`endpt-${s.id}`}>
                  <Path
                    d={`M ${lx} ${ly} m -8 0 a 8 8 0 1 0 16 0 a 8 8 0 1 0 -16 0`}
                    fill={brighten(s.color)}
                    fillOpacity={0.18}
                  />
                  <Path
                    d={`M ${lx} ${ly} m -3.5 0 a 3.5 3.5 0 1 0 7 0 a 3.5 3.5 0 1 0 -7 0`}
                    fill={brighten(s.color)}
                  />
                </G>
              );
            })}
          </G>
        )}

        {cursorActive && (
          <G>
            <Line
              x1={cX}
              y1={CHART_PAD_TOP}
              x2={cX}
              y2={CHART_PAD_TOP + usableH}
              stroke="rgba(255,255,255,0.35)"
              strokeWidth={1}
              strokeDasharray="2 3"
            />
            {series.map((s) => {
              const v = s.values[cIdx] ?? 0;
              const y = toY(v);
              return (
                <G key={`cur-${s.id}`}>
                  <Path
                    d={`M ${cX} ${y} m -7 0 a 7 7 0 1 0 14 0 a 7 7 0 1 0 -14 0`}
                    fill={brighten(s.color)}
                    fillOpacity={0.25}
                  />
                  <Path
                    d={`M ${cX} ${y} m -3.5 0 a 3.5 3.5 0 1 0 7 0 a 3.5 3.5 0 1 0 -7 0`}
                    fill={brighten(s.color)}
                  />
                </G>
              );
            })}

          </G>
        )}

      </Svg>
    </View>
  );
}
