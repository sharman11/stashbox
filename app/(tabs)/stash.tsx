import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ChevronRight,
  Plus,
  Trophy,
  Wallet,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AD_UNIT_IDS } from '@/lib/ads';
import { BannerAd, BannerAdSize } from '@/lib/ads-placeholder';
import { useAdsStore } from '@/lib/stores/ads';
import { useAppTheme } from '@/lib/stores/theme';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import { DailyBonus } from '@/components/DailyBonus';
import { FactCarousel } from '@/components/FactCarousel';
import { GoalForecastCard } from '@/components/stash/GoalForecastCard';
import { SpringPressable } from '@/components/SpringPressable';
import { StreakSection } from '@/components/StreakSection';
import { WelcomeWeekBanner } from '@/components/WelcomeWeekBanner';
import { CURRENCIES, formatAmount, type CurrencyCode } from '@/lib/currency';
import type { Cell } from '@/lib/types';
import { useMoneyboxesStore } from '@/lib/stores/moneyboxes';
import { useProfileStore } from '@/lib/stores/profile';
import { useSessionStore } from '@/lib/stores/session';

/* ── Stash Screen ──────────────────────────────────────────────────
 * Renamed from the old "Home" tab. Holds the active moneybox grid plus
 * a "Recent wins" preview that links to the full history view. The Home
 * tab is now a separate placeholder screen — we'll rebuild it later. */

export default function StashScreen() {
  const C = useAppTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { userId } = useSessionStore();
  const { profile } = useProfileStore();
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
  // Mid-gesture setState was re-rendering the swipe-hint counter and making
  // the gesture feel rigid/laggy on lower-end Android devices.
  const onHeroMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / width);
      if (idx !== heroPage) setHeroPage(idx);
    },
    [width, heroPage],
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.pageBg }}>
      <StatusBar style="light" />
      <DailyBonus />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
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
        {/* CHIME HERO - left-aligned, no rounded bottom              */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <LinearGradient
          colors={[C.heroTop, C.heroMid, C.heroBot]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ paddingBottom: 52 }}
        >
          {/* ── Top bar: new-vault pill ── */}
          <Animated.View
            entering={FadeInDown.duration(300)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'flex-end',
              paddingHorizontal: 20,
              paddingTop: 56,
            }}
          >
            <SpringPressable
              onPress={() => router.push('/create')}
              haptic
              style={{
                minHeight: 36,
                backgroundColor: C.buttonPrimaryBg,
                borderRadius: 18,
                paddingHorizontal: 14,
                paddingVertical: 8,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                flexShrink: 0,
                flexGrow: 0,
                alignSelf: 'flex-start',
              }}
            >
              <Plus size={14} color={C.buttonPrimaryText} />
              <Text
                allowFontScaling={false}
                maxFontSizeMultiplier={1}
                style={{
                  fontFamily: 'DMSans_500Medium',
                  fontSize: 13,
                  color: C.buttonPrimaryText,
                  includeFontPadding: false,
                }}
              >
                StashBox
              </Text>
            </SpringPressable>
          </Animated.View>

          {/* ── Swipeable hero pages - one per currency ── */}
          {heroPages.length > 0 ? (
            <Animated.View entering={FadeInDown.duration(400).delay(80)}>
              <ScrollView
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
                {heroPages.map((page) => {
                  const ci = CURRENCIES[page.currency];
                  const vaultCount = page.vaults.length;
                  return (
                    <View
                      key={page.currency}
                      style={{ width, paddingHorizontal: 20, paddingTop: 28 }}
                    >
                      <Text
                        allowFontScaling={false}
                        maxFontSizeMultiplier={1}
                        numberOfLines={1}
                        style={{
                          fontFamily: 'DMSans_400Regular',
                          fontSize: 15,
                          color: 'rgba(255,255,255,0.6)',
                        }}
                      >
                        {ci.flag} {ci.code}{vaultCount > 1 ? ` · ${vaultCount} vaults` : ''}
                      </Text>
                      <AnimatedNumber
                        value={page.totalSaved}
                        formatter={(n) => formatAmount(n, page.currency)}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.7}
                        style={{
                          fontFamily: 'DMSans_700Bold',
                          fontSize: 40,
                          color: '#FFFFFF',
                          letterSpacing: -1,
                          marginTop: 4,
                        }}
                      />
                      {/* Secondary line */}
                      <View style={{ marginTop: 8 }}>
                        {page.todaySaved > 0 ? (
                          <Text
                            allowFontScaling={false}
                            maxFontSizeMultiplier={1}
                            numberOfLines={1}
                            style={{
                              fontFamily: 'DMSans_500Medium',
                              fontSize: 14,
                              color: '#4ADE80',
                            }}
                          >
                            {formatAmount(page.todaySaved, page.currency)} saved today
                          </Text>
                        ) : page.bestVaultStreak > 0 ? (
                          <Text
                            allowFontScaling={false}
                            maxFontSizeMultiplier={1}
                            numberOfLines={1}
                            style={{
                              fontFamily: 'DMSans_500Medium',
                              fontSize: 14,
                              color: '#4ADE80',
                            }}
                          >
                            {page.bestVaultStreak} day streak
                          </Text>
                        ) : (
                          <Text
                            allowFontScaling={false}
                            maxFontSizeMultiplier={1}
                            numberOfLines={1}
                            style={{
                              fontFamily: 'DMSans_500Medium',
                              fontSize: 14,
                              color: '#4ADE80',
                            }}
                          >
                            Total saved
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </ScrollView>

              {/* Swipe hint - next-currency preview makes the gesture self-evident */}
              {heroPages.length > 1 && (() => {
                const prev = heroPage > 0 ? heroPages[heroPage - 1] : null;
                const next =
                  heroPage < heroPages.length - 1 ? heroPages[heroPage + 1] : null;
                return (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingHorizontal: 20,
                      marginTop: 18,
                    }}
                  >
                    {/* Left peek */}
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      {prev ? (
                        <>
                          <Text allowFontScaling={false} style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>‹</Text>
                          <Text allowFontScaling={false} style={{ fontSize: 12, opacity: 0.5 }}>{CURRENCIES[prev.currency].flag}</Text>
                          <Text
                            allowFontScaling={false}
                            numberOfLines={1}
                            style={{
                              fontFamily: 'DMSans_500Medium',
                              fontSize: 11,
                              color: 'rgba(255,255,255,0.5)',
                              letterSpacing: 0.4,
                            }}
                          >
                            {CURRENCIES[prev.currency].code}
                          </Text>
                        </>
                      ) : null}
                    </View>

                    {/* Counter */}
                    <Text
                      allowFontScaling={false}
                      numberOfLines={1}
                      style={{
                        fontFamily: 'DMSans_500Medium',
                        fontSize: 11,
                        color: 'rgba(255,255,255,0.7)',
                        letterSpacing: 1,
                      }}
                    >
                      {heroPage + 1} / {heroPages.length}
                    </Text>

                    {/* Right peek */}
                    <View
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: 4,
                      }}
                    >
                      {next ? (
                        <>
                          <Text
                            allowFontScaling={false}
                            numberOfLines={1}
                            style={{
                              fontFamily: 'DMSans_500Medium',
                              fontSize: 11,
                              color: 'rgba(255,255,255,0.5)',
                              letterSpacing: 0.4,
                            }}
                          >
                            {CURRENCIES[next.currency].code}
                          </Text>
                          <Text allowFontScaling={false} style={{ fontSize: 12, opacity: 0.5 }}>{CURRENCIES[next.currency].flag}</Text>
                          <Text allowFontScaling={false} style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>›</Text>
                        </>
                      ) : null}
                    </View>
                  </View>
                );
              })()}
            </Animated.View>
          ) : (
            <Animated.View
              entering={FadeInDown.duration(400).delay(80)}
              style={{ paddingHorizontal: 20, paddingTop: 28 }}
            >
              <Text
                allowFontScaling={false}
                maxFontSizeMultiplier={1}
                numberOfLines={1}
                style={{
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 15,
                  color: 'rgba(255,255,255,0.6)',
                }}
              >
                {getGreeting()}
              </Text>
              <Text
                allowFontScaling={false}
                maxFontSizeMultiplier={1}
                numberOfLines={1}
                style={{
                  fontFamily: 'DMSans_700Bold',
                  fontSize: 34,
                  color: '#FFFFFF',
                  marginTop: 4,
                }}
              >
                Start saving
              </Text>
            </Animated.View>
          )}
        </LinearGradient>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* CONTENT - overlapping the gradient                         */}
        {/* ═══════════════════════════════════════════════════════════ */}

        {/* Loading state */}
        {loading && moneyboxes.length === 0 && (
          <View style={{ marginTop: 48, alignItems: 'center' }}>
            <ActivityIndicator color={C.accent} />
          </View>
        )}

        {/* ── Empty-state card - only when user has no active moneyboxes ── */}
        {!loading && active.length === 0 && (
          <View style={{ paddingHorizontal: 16, marginTop: -24 }}>
            <View
              style={{
                backgroundColor: C.surface,
                borderRadius: 16,
                padding: 20,
                shadowColor: 'rgba(0,0,0,0.12)',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 1,
                shadowRadius: 20,
                elevation: 2,
              }}
            >
              <View style={{ alignSelf: 'stretch', alignItems: 'center' }}>
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 18,
                    backgroundColor: C.accentLight,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                  }}
                >
                  <Wallet size={24} color={C.accent} />
                </View>
                <Text
                  allowFontScaling={false}
                  maxFontSizeMultiplier={1}
                  style={{
                    alignSelf: 'stretch',
                    textAlign: 'center',
                    fontFamily: 'DMSans_700Bold',
                    fontSize: 18,
                    lineHeight: 24,
                    color: C.textPrimary,
                    includeFontPadding: false,
                  }}
                >
                  Create your first vault
                </Text>
                <Text
                  allowFontScaling={false}
                  maxFontSizeMultiplier={1}
                  style={{
                    alignSelf: 'stretch',
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 13,
                    color: C.textSecondary,
                    textAlign: 'center',
                    marginTop: 6,
                    lineHeight: 19,
                    includeFontPadding: false,
                  }}
                >
                  Pick a goal, set a timeline, and save one cell each day.
                </Text>
              </View>

              <Pressable
                onPress={() => router.push('/create')}
                style={{
                  marginTop: 18,
                  backgroundColor: C.buttonPrimaryBg,
                  paddingVertical: 14,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Plus size={18} color={C.buttonPrimaryText} strokeWidth={3} />
                <Text
                  allowFontScaling={false}
                  numberOfLines={1}
                  style={{
                    color: C.buttonPrimaryText,
                    fontSize: 15,
                    fontFamily: 'DMSans_700Bold',
                  }}
                >
                  Create StashBox
                </Text>
              </Pressable>
            </View>
          </View>
        )}


        {/* ── Today checklist - vaults for active currency ── */}
        {activePageVaults.length > 0 && (
          <View
            style={{
              paddingHorizontal: 16,
              marginTop: -28,
            }}
          >
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
              {/* Header */}
              <View
                style={{
                  paddingHorizontal: 18,
                  paddingTop: 16,
                  paddingBottom: 10,
                }}
              >
                <Text
                  allowFontScaling={false}
                  maxFontSizeMultiplier={1}
                  numberOfLines={1}
                  style={{
                    fontFamily: 'DMSans_600SemiBold',
                    fontSize: 15,
                    color: C.textPrimary,
                  }}
                >
                  {activePageVaults.length === 1
                    ? 'Your StashBox'
                    : `Your ${activePageVaults.length} StashBoxes`}
                </Text>
              </View>

              {/* Vault rows */}
              {activePageVaults.map((data, i) => {
                const sug = suggestionsByVault[data.box.id];
                return (
                  <SpringPressable
                    key={data.box.id}
                    onPress={() => router.push(`/box/${data.box.id}`)}
                    haptic={!data.filledToday}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 18,
                      paddingVertical: 12,
                      gap: 12,
                      borderTopWidth: 0.5,
                      borderTopColor: C.border,
                    }}
                  >
                    {/* Vault icon + name (right-side "Save" / amount carries the status) */}
                    <Text style={{ fontSize: 22 }}>{data.box.icon || '💰'}</Text>
                    <Text
                      allowFontScaling={false}
                      maxFontSizeMultiplier={1}
                      style={{
                        flex: 1,
                        fontFamily: 'DMSans_500Medium',
                        fontSize: 14,
                        color: data.filledToday ? C.textMuted : C.textPrimary,
                      }}
                      numberOfLines={1}
                    >
                      {data.box.name}
                    </Text>

                    {/* Action / status */}
                    {data.filledToday ? (
                      <Text
                        allowFontScaling={false}
                        numberOfLines={1}
                        style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: C.textMuted }}
                      >
                        {formatAmount(data.saved, data.box.currency)}
                      </Text>
                    ) : (
                      <Text
                        allowFontScaling={false}
                        numberOfLines={1}
                        style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 13, color: C.accent }}
                      >
                        Save
                      </Text>
                    )}

                    <ChevronRight size={14} color={C.textFaint} />
                  </SpringPressable>
                );
              })}
            </View>
            <WelcomeWeekBanner
              startedAt={profile?.welcomeWeekStartedAt ?? null}
              complete={profile?.welcomeWeekComplete ?? true}
              bestStreakDays={Object.values(streaks).reduce(
                (max, s) => Math.max(max, s.bestDays),
                0,
              )}
            />
          </View>
        )}

        {/* ── Streak tracker - always visible ── */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(260)}
          style={{ paddingHorizontal: 16, marginTop: 20 }}
        >
          <StreakSection
            currentStreak={Object.values(streaks).reduce(
              (max, s) => Math.max(max, s.currentDays),
              0,
            )}
            bestStreak={Object.values(streaks).reduce(
              (max, s) => Math.max(max, s.bestDays),
              0,
            )}
            userId={userId}
            freezesAvailable={profile?.streakFreezesAvailable ?? 0}
          />
        </Animated.View>

        {/* ── Goal forecast (Stashbox+) ── */}
        <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
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
            <Animated.View
              entering={FadeInDown.duration(400).delay(340)}
              style={{ paddingHorizontal: 16, marginTop: 28 }}
            >
              <Pressable
                onPress={() => router.push('/(tabs)/history')}
                style={{
                  backgroundColor: C.surface,
                  borderRadius: 16,
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  borderWidth: 1,
                  borderColor: C.border,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    backgroundColor: '#E6F4EA',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Trophy size={20} color={C.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: 'DMSans_600SemiBold',
                      fontSize: 14,
                      color: C.textPrimary,
                    }}
                  >
                    {completed.length} win{completed.length === 1 ? '' : 's'} so far
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'DMSans_400Regular',
                      fontSize: 12,
                      color: C.textMuted,
                      marginTop: 2,
                    }}
                  >
                    {formatAmount(totalSaved, profile?.defaultCurrency ?? 'USD')} stashed in total
                  </Text>
                </View>
                <ChevronRight size={18} color={C.textMuted} />
              </Pressable>
            </Animated.View>
          );
        })()}

        {/* ── AdMob banner ── */}
        {adsReady && (
          <Animated.View
            entering={FadeInDown.duration(400).delay(360)}
            style={{ marginTop: 20 }}
          >
            <BannerAd
              unitId={AD_UNIT_IDS.BANNER}
              size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
            />
          </Animated.View>
        )}

        {/* ── Facts carousel ── */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(380)}
          style={{ paddingTop: 20 }}
        >
          <FactCarousel />
        </Animated.View>
      </ScrollView>

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
