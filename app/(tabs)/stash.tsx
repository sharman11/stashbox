import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ChevronLeft,
  ChevronRight,
  History,
  Plus,
  Settings,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  type ImageSourcePropType,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AD_UNIT_IDS } from '@/lib/ads';
import { BannerAd, BannerAdSize } from '@/lib/ads-placeholder';
import { useAdsStore } from '@/lib/stores/ads';
import { useAppTheme } from '@/lib/stores/theme';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import { AvatarVisual } from '@/components/AvatarVisual';
import { GoalForecastCard } from '@/components/stash/GoalForecastCard';
import { SpringPressable } from '@/components/SpringPressable';
import { StreakSection } from '@/components/StreakSection';
import { CURRENCIES, formatAmount, type CurrencyCode } from '@/lib/currency';
import type { Cell } from '@/lib/types';
import { useAvatarStore } from '@/lib/stores/avatar';
import { usePersonalizationStore, type StashHero } from '@/lib/stores/personalization';
import { useMoneyboxesStore } from '@/lib/stores/moneyboxes';
import { useProfileStore } from '@/lib/stores/profile';
import { useSessionStore } from '@/lib/stores/session';

/* ── Stash Screen ──────────────────────────────────────────────────
 * Renamed from the old "Home" tab. Holds the active moneybox grid plus
 * a "Recent wins" preview that links to the full history view. The Home
 * tab is now a separate placeholder screen — we'll rebuild it later. */

// Wide illustrated Stash hero backgrounds (3:2). `gradient` falls back to the
// brand LinearGradient.
// Themed empty-state background (treasure stash-box). Wide ~2.7:1 art with a
// calm left side for the title/subtitle/button overlay.
const EMPTY_BG = require('@/assets/stash/empty-bg.jpg');
const EMPTY_BG_RATIO = 2060 / 763;

// Recent-wins celebratory background (filled wooden box + confetti on purple).
const WINS_BG = require('@/assets/stash/wins-bg.jpg');

const STASH_HERO_SOURCES: Partial<Record<StashHero, ImageSourcePropType>> = {
  cozy: require('@/assets/stash/heroes/cozy.webp'),
  moneybox: require('@/assets/stash/heroes/moneybox.webp'),
  mascot: require('@/assets/stash/heroes/mascot.webp'),
  minimal: require('@/assets/stash/heroes/minimal.webp'),
};

export default function StashScreen() {
  const C = useAppTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { userId } = useSessionStore();
  const { profile } = useProfileStore();
  const avatarId = useAvatarStore((s) => s.id);
  const insets = useSafeAreaInsets();
  const stashHero = usePersonalizationStore((s) => s.stashHero);
  const hydratePersonalization = usePersonalizationStore((s) => s.hydrate);
  useEffect(() => {
    hydratePersonalization();
  }, [hydratePersonalization]);
  const heroImage = STASH_HERO_SOURCES[stashHero];
  const grantMonthlyFreezeIfDue = useProfileStore((s) => s.grantMonthlyFreezeIfDue);
  const completeWelcomeWeek = useProfileStore((s) => s.completeWelcomeWeek);
  const adsReady = useAdsStore((s) => s.ready);
  const { moneyboxes, streaks, loading, loadAll, cellsByMoneybox, loadCells } =
    useMoneyboxesStore();

  useEffect(() => {
    if (userId) loadAll(userId);
  }, [userId, loadAll]);

  // Monthly streak-freeze auto-grant. Idempotent — checks the YYYY-MM stamp on
  // the profile and only writes when the calendar month has changed.
  useEffect(() => {
    if (profile) void grantMonthlyFreezeIfDue();
  }, [profile, grantMonthlyFreezeIfDue]);

  // Welcome-week auto-complete after 7 calendar days, even if the user never
  // hit a 7-day streak. Avoids the banner sticking around forever for users
  // who saved sporadically.
  useEffect(() => {
    if (!profile || profile.welcomeWeekComplete || !profile.welcomeWeekStartedAt) return;
    const started = new Date(profile.welcomeWeekStartedAt).getTime();
    if (Number.isNaN(started)) return;
    const elapsedDays = Math.floor((Date.now() - started) / 86400000);
    if (elapsedDays >= 7) void completeWelcomeWeek();
  }, [profile, completeWelcomeWeek]);

  useEffect(() => {
    moneyboxes.forEach((b) => {
      if (!cellsByMoneybox[b.id]) loadCells(b.id);
    });
  }, [moneyboxes, cellsByMoneybox, loadCells]);

  const maxCurrentStreak = Object.values(streaks).reduce((m, s) => Math.max(m, s.currentDays), 0);
  const maxBestStreak = Object.values(streaks).reduce((m, s) => Math.max(m, s.bestDays), 0);

  // Welcome-week anchor: the earliest moneybox creation date (YYYY-MM-DD), plus
  // every date the user has saved on — feeds the streak card's first-week grid.
  const welcomeStartDate = useMemo(() => {
    const dates = moneyboxes.map((b) => b.createdAt.slice(0, 10)).filter(Boolean);
    return dates.length ? dates.sort()[0] : null;
  }, [moneyboxes]);
  const savedDates = useMemo(() => {
    const set = new Set<string>();
    for (const cells of Object.values(cellsByMoneybox)) {
      for (const c of cells) {
        if (c.isFilled && c.filledAt) set.add(c.filledAt.slice(0, 10));
      }
    }
    return Array.from(set);
  }, [cellsByMoneybox]);

  const active = moneyboxes.filter((b) => b.status === 'active');
  // 1 vault per currency - create screen enforces this via disabled currency pills
  const today = new Date().toISOString().split('T')[0];
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    if (!userId) return;
    setRefreshing(true);
    await loadAll(userId, true);
    setRefreshing(false);
  }, [userId, loadAll]);

  const boxData = active.map((box) => {
    const cells = cellsByMoneybox[box.id] ?? [];
    const saved = cells.filter((c) => c.isFilled).reduce((s, c) => s + c.amount, 0);
    const pct = box.goalAmount > 0 ? Math.min(1, saved / box.goalAmount) : 0;
    const filled = cells.filter((c) => c.isFilled).length;
    const daysLeft = box.targetDays - filled;
    const filledToday =
      cells.filter((c) => c.isFilled && c.filledAt?.startsWith(today)).length > 0;
    return { box, cells, saved, pct, filled, daysLeft, filledToday };
  });

  // Per-vault suggestion (pick a random unfilled cell, biased toward smaller amounts)
  const suggestionsByVault = useMemo(() => {
    const map: Record<string, Cell | null> = {};
    for (const d of boxData) {
      const unfilled = d.cells.filter((c) => !c.isFilled);
      if (unfilled.length === 0) { map[d.box.id] = null; continue; }
      const sorted = [...unfilled].sort((a, b) => a.amount - b.amount);
      const cutoff = Math.ceil(sorted.length * 0.5);
      const pool = Math.random() < 0.7 ? sorted.slice(0, cutoff) : sorted.slice(cutoff);
      map[d.box.id] = pool[Math.floor(Math.random() * pool.length)] ?? sorted[0];
    }
    return map;
  }, [boxData]);

  /* ── Per-currency hero pages ─────────────────────────────────── */
  const [heroPage, setHeroPage] = useState(0);
  const defaultCurrency = profile?.defaultCurrency ?? 'USD';

  // Group vaults by currency → one hero page per currency
  const heroPages = useMemo(() => {
    const grouped: Record<string, typeof boxData> = {};
    for (const d of boxData) {
      const c = d.box.currency;
      if (!grouped[c]) grouped[c] = [];
      grouped[c].push(d);
    }
    // Sort: default currency first, then alphabetically
    const currencies = Object.keys(grouped).sort((a, b) => {
      if (a === defaultCurrency) return -1;
      if (b === defaultCurrency) return 1;
      return a.localeCompare(b);
    }) as CurrencyCode[];

    return currencies.map((currency) => {
      const vaults = grouped[currency];
      const totalSaved = vaults.reduce((s, d) => s + d.saved, 0);
      const todaySaved = vaults.reduce(
        (s, d) =>
          s +
          d.cells
            .filter((cell) => cell.isFilled && cell.filledAt?.startsWith(today))
            .reduce((sum, cell) => sum + cell.amount, 0),
        0,
      );
      const bestVaultStreak = Math.max(0, ...vaults.map((d) => streaks[d.box.id]?.currentDays ?? 0));
      return { currency, vaults, totalSaved, todaySaved, bestVaultStreak };
    });
  }, [boxData, defaultCurrency, today, streaks]);

  // Vaults for the currently active hero page
  const activePageVaults = heroPages[heroPage]?.vaults ?? [];

  // Update heroPage only when the swipe settles, not on every scroll frame.
  const onHeroMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / width);
      if (idx !== heroPage) setHeroPage(idx);
    },
    [width, heroPage],
  );

  // Programmatic currency switch from the arrow control.
  const heroScrollRef = useRef<ScrollView>(null);
  const goToHeroPage = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= heroPages.length) return;
      heroScrollRef.current?.scrollTo({ x: idx * width, animated: true });
      setHeroPage(idx);
    },
    [heroPages.length, width],
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.pageBg }}>
      {/* Status bar text stays white — the top of the screen is the dark hero. */}
      <StatusBar style="light" />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 96 }}
        refreshControl={
          // iOS uses tintColor; Android uses colors[]. Green is visible
          // against both the dark hero gradient (when refreshing from top)
          // and the page bg (when refreshing scrolled-down).
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.accent}
            colors={[C.accent]}
          />
        }
      >
        {/* ═══════════════════════════════════════════════════════════ */}
        {/* HERO — brand gradient, or a chosen illustrated background    */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {/* Dark-green base so there's never a blank flash while a chosen hero
         *  image decodes — the image fades in over it. */}
        <View
          style={{ paddingBottom: 88, backgroundColor: C.heroTop }}
        >
          {/* Background layer: an absolute-fill wrapper (sizes reliably from the
           *  insets + clips), with the image/gradient filling it at 100%. The
           *  wrapper is what keeps the image from expanding to its intrinsic
           *  pixel size and taking over the whole screen. */}
          <View
            pointerEvents="none"
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}
          >
            {heroImage ? (
              <Image
                source={heroImage}
                resizeMode="cover"
                fadeDuration={0}
                style={{ width: '100%', height: '100%' }}
              />
            ) : (
              <LinearGradient
                colors={[C.heroTop, C.heroMid, C.heroBot]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={{ width: '100%', height: '100%' }}
              />
            )}
          </View>

          {/* ── Top bar: profile · settings (positioned exactly like Home) ── */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingTop: insets.top + 12,
            }}
          >
            {/* Profile avatar — matches the Home hero. */}
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

            {/* Right cluster — history · settings. */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <SpringPressable
                onPress={() => router.push('/(tabs)/history')}
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
                <History size={18} color="#FFFFFF" />
              </SpringPressable>

              {/* Settings gear — matches the Home hero. */}
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
          </View>

          {/* ── Currency arrow switcher + swipeable amount pages ── */}
          {heroPages.length > 0 ? (
            <View>
              <ScrollView
                ref={heroScrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={onHeroMomentumEnd}
                decelerationRate="fast"
                snapToInterval={width}
                snapToAlignment="start"
                disableIntervalMomentum
                overScrollMode="never"
              >
                {heroPages.map((page) => (
                    <View
                      key={page.currency}
                      style={{ width, paddingHorizontal: 20, paddingTop: 36, alignItems: 'center' }}
                    >
                      {/* Eyebrow + number — matches the Home hero exactly. */}
                      <Text
                        allowFontScaling={false}
                        maxFontSizeMultiplier={1}
                        numberOfLines={1}
                        style={{
                          fontFamily: 'DMSans_500Medium',
                          fontSize: 9,
                          color: 'rgba(255,255,255,0.55)',
                          letterSpacing: 0.8,
                          marginBottom: 3,
                          textAlign: 'center',
                        }}
                      >
                        {(page.todaySaved > 0
                          ? `${formatAmount(page.todaySaved, page.currency)} saved today`
                          : 'Total saved'
                        ).toUpperCase()}
                      </Text>
                      <AnimatedNumber
                        value={page.totalSaved}
                        formatter={(n) => formatAmount(n, page.currency)}
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
                    </View>
                  ))}
              </ScrollView>
            </View>
          ) : (
            <View
              style={{ paddingHorizontal: 20, paddingTop: 36, alignItems: 'center' }}
            >
              {/* Eyebrow + headline — same format as the currency hero. */}
              <Text
                allowFontScaling={false}
                maxFontSizeMultiplier={1}
                numberOfLines={1}
                style={{
                  fontFamily: 'DMSans_500Medium',
                  fontSize: 9,
                  color: 'rgba(255,255,255,0.55)',
                  letterSpacing: 0.8,
                  marginBottom: 3,
                  textAlign: 'center',
                }}
              >
                {getGreeting().toUpperCase()}
              </Text>
              <Text
                allowFontScaling={false}
                maxFontSizeMultiplier={1}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
                style={{
                  fontFamily: 'DMSans_700Bold',
                  fontSize: 40,
                  color: '#FFFFFF',
                  letterSpacing: -1.2,
                  lineHeight: 48,
                  textAlign: 'center',
                }}
              >
                Start saving
              </Text>
            </View>
          )}

          {/* Floating currency switcher — identical to the Home hero pill,
           *  sits half on the hero, half on the content below. Shows the
           *  currency always; arrows appear only with multiple currencies. */}
          {heroPages.length > 0 && (() => {
            const active = heroPages[heroPage] ?? heroPages[0];
            const ci = CURRENCIES[active.currency];
            const multi = heroPages.length > 1;
            const atStart = heroPage <= 0;
            const atEnd = heroPage >= heroPages.length - 1;
            return (
              <View
                pointerEvents="box-none"
                style={{ position: 'absolute', left: 0, right: 0, bottom: -14, alignItems: 'center' }}
              >
                <View
                  style={{
                    borderRadius: 999,
                    shadowColor: '#000',
                    shadowOpacity: 0.14,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 6,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      borderRadius: 999,
                      overflow: 'hidden',
                      paddingHorizontal: 6,
                      gap: 4,
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    {multi && (
                      <SpringPressable
                        onPress={() => goToHeroPage(heroPage - 1)}
                        disabled={atStart}
                        haptic
                        style={{ opacity: atStart ? 0.3 : 1, paddingVertical: 7, paddingHorizontal: 9 }}
                      >
                        <ChevronLeft size={16} color="#06291F" />
                      </SpringPressable>
                    )}
                    <Text
                      style={{
                        fontFamily: 'DMSans_700Bold',
                        fontSize: 11,
                        color: '#06291F',
                        letterSpacing: 1.2,
                        minWidth: 52,
                        textAlign: 'center',
                        paddingHorizontal: multi ? 0 : 12,
                        paddingVertical: multi ? 0 : 9,
                      }}
                    >
                      {ci.flag} {ci.code}
                    </Text>
                    {multi && (
                      <SpringPressable
                        onPress={() => goToHeroPage(heroPage + 1)}
                        disabled={atEnd}
                        haptic
                        style={{ opacity: atEnd ? 0.3 : 1, paddingVertical: 7, paddingHorizontal: 9 }}
                      >
                        <ChevronRight size={16} color="#06291F" />
                      </SpringPressable>
                    )}
                  </View>
                </View>
              </View>
            );
          })()}
        </View>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* CONTENT - overlapping the gradient                         */}
        {/* ═══════════════════════════════════════════════════════════ */}

        {/* Loading state */}
        {loading && moneyboxes.length === 0 && (
          <View style={{ marginTop: 48, alignItems: 'center' }}>
            <ActivityIndicator color={C.accent} />
          </View>
        )}

        {/* ── Empty state — themed treasure-box background with the title,
         *  subtitle and create button overlaid on its calm left side. Text
         *  colors are fixed (not theme-aware) since they sit on a fixed-tone
         *  illustration in both light and dark mode. ── */}
        {!loading && active.length === 0 && (
          <View
            style={{
              marginTop: 24,
              marginHorizontal: 16,
              borderRadius: 18,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: C.borderLight,
            }}
          >
            <ImageBackground
              source={EMPTY_BG}
              resizeMode="cover"
              style={{ width: '100%', aspectRatio: EMPTY_BG_RATIO, justifyContent: 'center' }}
            >
              <View style={{ maxWidth: '60%', paddingLeft: 18, paddingRight: 8, gap: 6 }}>
                <Text
                  style={{
                    fontFamily: 'DMSans_700Bold',
                    fontSize: 17,
                    lineHeight: 21,
                    color: '#3D2914',
                  }}
                >
                  Start your first{'\n'}StashBox
                </Text>
                <SpringPressable
                  onPress={() => router.push('/create')}
                  haptic
                  style={{
                    alignSelf: 'flex-start',
                    marginTop: 3,
                    borderRadius: 999,
                    shadowColor: '#000',
                    shadowOpacity: 0.18,
                    shadowRadius: 6,
                    shadowOffset: { width: 0, height: 2 },
                    elevation: 4,
                  }}
                >
                  <LinearGradient
                    colors={['#F9A24A', '#F2872E', '#E8740F']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      borderRadius: 999,
                      overflow: 'hidden',
                      paddingHorizontal: 28,
                      paddingVertical: 6.5,
                    }}
                  >
                    <Text
                      allowFontScaling={false}
                      style={{
                        fontFamily: 'DMSans_600SemiBold',
                        fontSize: 11,
                        color: '#FFFFFF',
                        includeFontPadding: false,
                      }}
                    >
                      Create
                    </Text>
                  </LinearGradient>
                </SpringPressable>
              </View>
            </ImageBackground>
          </View>
        )}


        {/* ── Vaults — horizontal circle row (Add + each vault) ── */}
        {activePageVaults.length > 0 && (
          <View style={{ marginTop: 38 }}>
            {/* Card container around the header + circle row. */}
            <View
              style={{
                marginHorizontal: 16,
                backgroundColor: C.surface,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: C.border,
                paddingTop: 16,
                paddingBottom: 18,
              }}
            >
            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 16,
                marginBottom: 14,
              }}
            >
              <Text
                allowFontScaling={false}
                maxFontSizeMultiplier={1}
                style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 10, letterSpacing: 1.2, color: C.textSecondary }}
              >
                {(activePageVaults.length === 1 ? 'Your StashBox' : 'Your StashBoxes').toUpperCase()}
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 18 }}
            >
              {/* Add — dashed rounded-rectangle "new vault" affordance. */}
              <SpringPressable onPress={() => router.push('/create')} haptic style={{ alignItems: 'center', width: 60 }}>
                <View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 15,
                    borderWidth: 2,
                    borderStyle: 'dashed',
                    borderColor: C.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Plus size={22} color={C.accent} />
                </View>
                <Text
                  numberOfLines={1}
                  style={{ marginTop: 6, fontFamily: 'DMSans_500Medium', fontSize: 11, color: C.textSecondary }}
                >
                  Add
                </Text>
              </SpringPressable>

              {/* Vault circles */}
              {activePageVaults.map((data) => (
                <SpringPressable
                  key={data.box.id}
                  onPress={() => router.push(`/box/${data.box.id}`)}
                  haptic
                  style={{ alignItems: 'center', width: 60 }}
                >
                  <View
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 15,
                      backgroundColor: C.accentLight,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 24 }}>{data.box.icon || '💰'}</Text>
                    {/* Green nudge dot when nothing's been saved here today. */}
                    {!data.filledToday && (
                      <View
                        style={{
                          position: 'absolute',
                          top: 1,
                          right: 1,
                          width: 11,
                          height: 11,
                          borderRadius: 6,
                          backgroundColor: C.accent,
                          borderWidth: 2,
                          borderColor: C.pageBg,
                        }}
                      />
                    )}
                  </View>
                  <Text
                    numberOfLines={1}
                    style={{
                      marginTop: 6,
                      maxWidth: 60,
                      textAlign: 'center',
                      fontFamily: 'DMSans_500Medium',
                      fontSize: 11,
                      color: C.textPrimary,
                    }}
                  >
                    {data.box.name}
                  </Text>
                </SpringPressable>
              ))}
            </ScrollView>
            </View>
          </View>
        )}

        {/* ── Streak tracker - always visible. First week shows the merged-in
         *  "Day X of 7" welcome arc; afterwards the standard weekly grid. ── */}
        <View
          style={{ paddingHorizontal: 16, marginTop: 12 }}
        >
          <StreakSection
            currentStreak={maxCurrentStreak}
            bestStreak={maxBestStreak}
            userId={userId}
            welcomeStartDate={welcomeStartDate}
            savedDates={savedDates}
          />
        </View>

        {/* ── Goal forecast (Stashbox+) ── */}
        <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
          <GoalForecastCard />
        </View>

        {/* ── Recent wins — preview of completed moneyboxes ──
         *  This is the merged-in slice of the old History tab. We show a
         *  one-row summary plus a "See all" link that opens /history for
         *  the full list. History is hidden from the tab bar but still
         *  reachable as a route. */}
        {(() => {
          const completed = moneyboxes
            .filter((b) => b.status === 'completed')
            .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
          if (completed.length === 0) return null;
          const totalSaved = completed.reduce((s, b) => s + b.goalAmount, 0);
          return (
            <View
              style={{ paddingHorizontal: 16, marginTop: 12 }}
            >
              <Pressable
                onPress={() => router.push('/(tabs)/history')}
                style={{ borderRadius: 18, overflow: 'hidden' }}
              >
                <ImageBackground
                  source={WINS_BG}
                  resizeMode="cover"
                  style={{ width: '100%', height: 110, justifyContent: 'center' }}
                >
                  {/* Light text — sits on the dark purple art. */}
                  <View style={{ maxWidth: '58%', paddingLeft: 18, paddingRight: 8, gap: 3 }}>
                    <Text
                      style={{ fontFamily: 'DMSans_700Bold', fontSize: 19, lineHeight: 23, color: '#FFFFFF' }}
                    >
                      {completed.length} win{completed.length === 1 ? '' : 's'} so far
                    </Text>
                    <Text
                      style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: 'rgba(255,255,255,0.82)' }}
                    >
                      {formatAmount(totalSaved, profile?.defaultCurrency ?? 'USD')} stashed in total
                    </Text>
                  </View>
                </ImageBackground>
              </Pressable>
            </View>
          );
        })()}

        {/* ── AdMob banner ── */}
        {adsReady && (
          <View
            style={{ marginTop: 12 }}
          >
            <BannerAd
              unitId={AD_UNIT_IDS.BANNER}
              size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
            />
          </View>
        )}
      </ScrollView>

      {/* Floating new-vault button — centered, just above the bottom tab bar. */}
      <View
        pointerEvents="box-none"
        style={{ position: 'absolute', left: 0, right: 0, bottom: 16, alignItems: 'center' }}
      >
        <SpringPressable
          onPress={() => router.push('/create')}
          haptic
          style={{
            borderRadius: 26,
            shadowColor: '#000',
            shadowOpacity: 0.2,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: 8,
          }}
        >
          <LinearGradient
            colors={[C.heroTop, C.heroMid, C.heroBot]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              borderRadius: 26,
              overflow: 'hidden',
              paddingHorizontal: 18,
              paddingVertical: 13,
            }}
          >
            <Plus size={18} color="#FFFFFF" />
            <Text
              allowFontScaling={false}
              maxFontSizeMultiplier={1}
              style={{
                fontFamily: 'DMSans_600SemiBold',
                fontSize: 14,
                color: '#FFFFFF',
                includeFontPadding: false,
              }}
            >
              StashBox
            </Text>
          </LinearGradient>
        </SpringPressable>
      </View>
    </View>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────── */

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
