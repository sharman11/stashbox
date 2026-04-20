import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ArrowRight,
  ChevronRight,
  Flame,
  Plus,
  Wallet,
  X,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
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

import AsyncStorage from '@react-native-async-storage/async-storage';

import { AnimatedNumber } from '@/components/AnimatedNumber';
import { DailyBonus } from '@/components/DailyBonus';
import { FactCarousel } from '@/components/FactCarousel';
import { HotlistLogo } from '@/components/HotlistLogo';
import { SpringPressable } from '@/components/SpringPressable';
import { StreakSection } from '@/components/StreakSection';
import { CURRENCIES, formatAmount, type CurrencyCode } from '@/lib/currency';
import type { Cell } from '@/lib/types';
import { useAvatarStore } from '@/lib/stores/avatar';
import { useMoneyboxesStore } from '@/lib/stores/moneyboxes';
import { useProfileStore } from '@/lib/stores/profile';
import { useSessionStore } from '@/lib/stores/session';

/* ── Chime palette ─────────────────────────────────────────────── */

const C = {
  heroTop: '#0B3D2E',
  heroMid: '#145A42',
  heroBot: '#1E7A5C',
  accent: '#1DB954',
  accentDark: '#166534',
  accentLight: '#E6F4EA',
  accentSoft: 'rgba(29,185,84,0.08)',
  pageBg: '#F5F7FA',
  surface: '#FFFFFF',
  textPrimary: '#0F1419',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textFaint: '#D1D5DB',
  border: '#F3F4F6',
};

/* ── Home Screen ───────────────────────────────────────────────── */

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { userId } = useSessionStore();
  const { profile } = useProfileStore();
  const avatarEmoji = useAvatarStore((s) => s.emoji);
  const { moneyboxes, streaks, loading, loadAll, cellsByMoneybox, loadCells } =
    useMoneyboxesStore();

  useEffect(() => {
    if (userId) loadAll(userId);
  }, [userId, loadAll]);

  useEffect(() => {
    moneyboxes.forEach((b) => {
      if (!cellsByMoneybox[b.id]) loadCells(b.id);
    });
  }, [moneyboxes, cellsByMoneybox, loadCells]);

  const active = moneyboxes.filter((b) => b.status === 'active');
  // 1 vault per currency — create screen enforces this via disabled currency pills
  const today = new Date().toISOString().split('T')[0];
  const [refreshing, setRefreshing] = useState(false);
  // Ad banner: dismissed for current session, reappears on next app launch
  const [adDismissed, setAdDismissed] = useState(false);

  useEffect(() => {
    const checkAd = async () => {
      const dismissed = await AsyncStorage.getItem('stashbox_ad_dismissed');
      if (dismissed) {
        // Was dismissed in a prior session — clear the flag so it shows again
        await AsyncStorage.removeItem('stashbox_ad_dismissed');
      }
    };
    checkAd();
  }, []);

  const dismissAd = async () => {
    setAdDismissed(true);
    await AsyncStorage.setItem('stashbox_ad_dismissed', 'true');
  };
  const bestStreak = useMemo(
    () => Math.max(0, ...Object.values(streaks).map((s) => s.currentDays)),
    [streaks],
  );

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
  const defaultCurrency = profile?.defaultCurrency ?? 'INR';

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

  const onHeroScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / width);
      setHeroPage(idx);
    },
    [width],
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.pageBg }}>
      <StatusBar style="light" />
      <DailyBonus />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FFF"
            colors={[C.accent]}
          />
        }
      >
        {/* ═══════════════════════════════════════════════════════════ */}
        {/* CHIME HERO — left-aligned, no rounded bottom              */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <LinearGradient
          colors={[C.heroTop, C.heroMid, C.heroBot]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ paddingBottom: 52 }}
        >
          {/* ── Top bar: bell … streak / new-vault pill ── */}
          <Animated.View
            entering={FadeInDown.duration(300)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingTop: 56,
            }}
          >
            {/* Left — avatar */}
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: 'rgba(255,255,255,0.12)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 17 }}>{avatarEmoji}</Text>
            </View>

            {/* Right — streak + premium pill */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View
                  style={{
                    height: 36,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    backgroundColor: 'rgba(251,191,36,0.15)',
                    paddingHorizontal: 12,
                    borderRadius: 18,
                  }}
                >
                  <Flame size={14} color="#FBBF24" />
                  <Text
                    style={{
                      fontFamily: 'Inter_700Bold',
                      fontSize: 13,
                      color: '#FBBF24',
                    }}
                  >
                    {bestStreak}
                  </Text>
                </View>
              <SpringPressable
                onPress={() => router.push('/create')}
                haptic
                style={{
                  height: 36,
                  backgroundColor: C.accent,
                  borderRadius: 18,
                  paddingHorizontal: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                }}
              >
                <Plus size={14} color="#FFFFFF" />
                <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 13, color: '#FFFFFF' }}>
                  Moneybox
                </Text>
              </SpringPressable>
            </View>
          </Animated.View>

          {/* ── Swipeable hero pages — one per currency ── */}
          {heroPages.length > 0 ? (
            <Animated.View entering={FadeInDown.duration(400).delay(80)}>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={onHeroScroll}
                scrollEventThrottle={16}
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
                        style={{
                          fontFamily: 'Inter_400Regular',
                          fontSize: 15,
                          color: 'rgba(255,255,255,0.6)',
                        }}
                      >
                        {ci.flag} {ci.code}{vaultCount > 1 ? ` · ${vaultCount} vaults` : ''}
                      </Text>
                      <AnimatedNumber
                        value={page.totalSaved}
                        formatter={(n) => formatAmount(n, page.currency)}
                        style={{
                          fontFamily: 'Inter_700Bold',
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
                            style={{
                              fontFamily: 'Inter_500Medium',
                              fontSize: 14,
                              color: '#4ADE80',
                            }}
                          >
                            {formatAmount(page.todaySaved, page.currency)} saved today
                          </Text>
                        ) : page.bestVaultStreak > 0 ? (
                          <Text
                            style={{
                              fontFamily: 'Inter_500Medium',
                              fontSize: 14,
                              color: '#4ADE80',
                            }}
                          >
                            {page.bestVaultStreak} day streak
                          </Text>
                        ) : (
                          <Text
                            style={{
                              fontFamily: 'Inter_500Medium',
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

              {/* Page dots */}
              {heroPages.length > 1 && (
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: 6,
                    marginTop: 16,
                  }}
                >
                  {heroPages.map((_, i) => (
                    <View
                      key={i}
                      style={{
                        width: heroPage === i ? 16 : 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor:
                          heroPage === i ? '#FFFFFF' : 'rgba(255,255,255,0.25)',
                      }}
                    />
                  ))}
                </View>
              )}
            </Animated.View>
          ) : (
            <Animated.View
              entering={FadeInDown.duration(400).delay(80)}
              style={{ paddingHorizontal: 20, paddingTop: 28 }}
            >
              <Text
                style={{
                  fontFamily: 'Inter_400Regular',
                  fontSize: 15,
                  color: 'rgba(255,255,255,0.6)',
                }}
              >
                {getGreeting()}
              </Text>
              <Text
                style={{
                  fontFamily: 'Inter_700Bold',
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
        {/* CONTENT — overlapping the gradient                         */}
        {/* ═══════════════════════════════════════════════════════════ */}

        {/* Loading state */}
        {loading && moneyboxes.length === 0 && (
          <View style={{ marginTop: 48, alignItems: 'center' }}>
            <ActivityIndicator color={C.accent} />
          </View>
        )}

        {/* Empty state */}
        {!loading && active.length === 0 && (
          <Animated.View
            entering={FadeInDown.duration(400).delay(200)}
            style={{ paddingHorizontal: 16, marginTop: -24 }}
          >
            <SpringPressable
              onPress={() => router.push('/create')}
              style={{
                alignItems: 'center',
                backgroundColor: C.surface,
                borderRadius: 16,
                paddingVertical: 36,
                paddingHorizontal: 24,
                shadowColor: 'rgba(0,0,0,0.12)',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 1,
                shadowRadius: 20,
                elevation: 2,
              }}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 18,
                  backgroundColor: C.accentLight,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 14,
                }}
              >
                <Wallet size={24} color={C.accent} />
              </View>
              <Text
                style={{
                  fontFamily: 'Inter_700Bold',
                  fontSize: 18,
                  color: C.textPrimary,
                }}
              >
                Create your first vault
              </Text>
              <Text
                style={{
                  fontFamily: 'Inter_400Regular',
                  fontSize: 13,
                  color: C.textSecondary,
                  textAlign: 'center',
                  marginTop: 6,
                  lineHeight: 19,
                }}
              >
                Pick a goal, set a timeline, and save one cell each day.
              </Text>
            </SpringPressable>
          </Animated.View>
        )}


        {/* ── Today checklist — vaults for active currency ── */}
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
                  style={{
                    fontFamily: 'Inter_600SemiBold',
                    fontSize: 15,
                    color: C.textPrimary,
                  }}
                >
                  Today
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
                    {/* Status indicator */}
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: data.filledToday ? '#22C55E' : C.border,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {data.filledToday ? (
                        <Text style={{ color: '#FFF', fontSize: 12, fontFamily: 'Inter_700Bold' }}>✓</Text>
                      ) : (
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.accent }} />
                      )}
                    </View>

                    {/* Vault name */}
                    <Text
                      style={{
                        flex: 1,
                        fontFamily: 'Inter_500Medium',
                        fontSize: 14,
                        color: data.filledToday ? C.textMuted : C.textPrimary,
                      }}
                      numberOfLines={1}
                    >
                      {data.box.name}
                    </Text>

                    {/* Action / status */}
                    {data.filledToday ? (
                      <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: C.textMuted }}>
                        {formatAmount(data.saved, data.box.currency)}
                      </Text>
                    ) : (
                      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: C.accent }}>
                        Save
                      </Text>
                    )}

                    <ChevronRight size={14} color={C.textFaint} />
                  </SpringPressable>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Streak tracker — always visible ── */}
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
          />
        </Animated.View>

        {/* ── Hotlist Jobs ad banner ── */}
        {!adDismissed && (
          <Animated.View
            entering={FadeInDown.duration(400).delay(340)}
            style={{ paddingHorizontal: 16, marginTop: 20 }}
          >
            <Pressable
              onPress={() => Linking.openURL('https://www.hotlist-jobs.com')}
              style={{
                backgroundColor: '#0F172A',
                borderRadius: 14,
                paddingVertical: 14,
                paddingHorizontal: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
            >
              {/* Logo */}
              <HotlistLogo size={24} />

              {/* Text */}
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#FFFFFF' }}>
                  Fresh tech jobs, daily
                </Text>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 1 }}>
                  hotlist-jobs.com
                </Text>
              </View>

              {/* Dismiss */}
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  dismissAd();
                }}
                hitSlop={10}
                style={{ padding: 4 }}
              >
                <X size={16} color="rgba(255,255,255,0.4)" />
              </Pressable>
            </Pressable>
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
