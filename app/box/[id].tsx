import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, ChevronRight, Flame, Pencil, Zap } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import ConfettiCannon from 'react-native-confetti-cannon';

import { CustomAlert } from '@/components/CustomAlert';
import { DragCoin } from '@/components/DragCoin';
import { EditMoneyboxModal } from '@/components/EditMoneyboxModal';
import { MilestoneOverlay } from '@/components/MilestoneOverlay';
import type { MilestoneKind } from '@/components/MilestoneOverlay';
import { MilestoneToast } from '@/components/MilestoneToast';
import { PayoffBoosterCard } from '@/components/loans/PayoffBoosterCard';
import { MoneyboxGrid } from '@/components/MoneyboxGrid';
import { ProgressBar } from '@/components/ProgressBar';
import { ProgressRing } from '@/components/ProgressRing';
import { ShareCard } from '@/components/ShareCard';
import { SpringPressable } from '@/components/SpringPressable';
import { markTodayActive } from '@/components/StreakSection';
import { ThemeBackground } from '@/components/ThemeBackground';
import { AD_UNIT_IDS, INTERSTITIAL_EVERY } from '@/lib/ads';
import {
  BannerAd,
  BannerAdSize,
  InterstitialAd,
  AdEventType,
  RewardedAd,
  RewardedAdEventType,
} from '@/lib/ads-placeholder';
import { useAdsStore } from '@/lib/stores/ads';
import { formatAmount } from '@/lib/currency';
import { useAlert } from '@/lib/use-alert';
import { useMoneyboxesStore } from '@/lib/stores/moneyboxes';
import { useProfileStore } from '@/lib/stores/profile';
import { useSessionStore } from '@/lib/stores/session';
import { useSoundEffect } from '@/lib/use-sound';
import { getStashSpot } from '@/lib/stash-spots';
import { getTheme } from '@/lib/theme';
import type { Cell } from '@/lib/types';

const interstitial = InterstitialAd.createForAdRequest(AD_UNIT_IDS.INTERSTITIAL);

const MILESTONES = [25, 50, 75, 100] as const;
type Milestone = (typeof MILESTONES)[number];
type SmallMilestone = 25 | 50 | 75;

export default function MoneyboxDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    moneyboxes,
    cellsByMoneybox,
    streaks,
    fillHistory,
    loadCells,
    loadStreak,
    fillCell,
    unfillLastCell,
    abandonMoneybox,
    renameMoneybox,
    setTheme: setBoxTheme,
    setIcon: setBoxIcon,
    setStashSpot: setBoxStashSpot,
    persistMilestones,
  } = useMoneyboxesStore();
  const { userId } = useSessionStore();
  const { profile } = useProfileStore();
  const playCoinDrop = useSoundEffect('coin');
  const playComplete = useSoundEffect('complete');
  const { alertConfig, showAlert, dismissAlert } = useAlert();

  const [activeToast, setActiveToast] = useState<SmallMilestone | null>(null);
  const [userMilestone, setUserMilestone] = useState<MilestoneKind | null>(null);
  const [showCompletionFX, setShowCompletionFX] = useState(false);
  const [filling, setFilling] = useState(false);
  const [editAdLoading, setEditAdLoading] = useState(false);
  const [rowCelebration, setRowCelebration] = useState<number | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const milestoneQueue = useRef<Milestone[]>([]);
  const fillCount = useRef(0);
  const interstitialReady = useRef(false);
  // If we hit an eligible fill before the ad finished loading, remember it
  // and show the ad as soon as it's ready.
  const pendingShow = useRef(false);
  const adsReady = useAdsStore((s) => s.ready);

  useEffect(() => {
    if (!adsReady) return;
    const unsubLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
      interstitialReady.current = true;
      // Deferred show - user hit the threshold while ad was still loading
      if (pendingShow.current) {
        pendingShow.current = false;
        try { interstitial.show(); } catch { /* ignore */ }
      }
    });
    const unsubClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      interstitialReady.current = false;
      try { interstitial.load(); } catch { /* ignore */ }
    });
    const unsubError = interstitial.addAdEventListener(AdEventType.ERROR, () => {
      interstitialReady.current = false;
      pendingShow.current = false;
      // Retry the load after a short delay so we recover from transient issues.
      setTimeout(() => {
        try { interstitial.load(); } catch { /* ignore */ }
      }, 5000);
    });

    try { interstitial.load(); } catch { /* ignore initial load failure */ }

    return () => {
      unsubLoaded();
      unsubClosed();
      unsubError();
    };
  }, [adsReady]);

  const moneybox = moneyboxes.find((b) => b.id === id);
  const cells = id ? cellsByMoneybox[id] ?? [] : [];
  const streak = id ? streaks[id] : undefined;

  useEffect(() => {
    if (id && !cellsByMoneybox[id]) loadCells(id);
    if (id && !streaks[id]) loadStreak(id);
  }, [id, cellsByMoneybox, streaks, loadCells, loadStreak]);

  const { saved, pct, unfilled, filledCount, daysSinceCreation, daysAhead } = useMemo(() => {
    if (!moneybox) {
      return {
        saved: 0,
        pct: 0,
        unfilled: [] as Cell[],
        filledCount: 0,
        daysSinceCreation: 1,
        daysAhead: 0,
      };
    }
    const filledCells = cells.filter((c) => c.isFilled);
    const unfilledCells = cells.filter((c) => !c.isFilled);
    const savedAmt = filledCells.reduce((s, c) => s + c.amount, 0);
    const days = Math.max(
      1,
      Math.floor((Date.now() - new Date(moneybox.createdAt).getTime()) / 86400000),
    );
    const expected = Math.min(days, moneybox.targetDays);
    return {
      saved: savedAmt,
      pct: moneybox.goalAmount > 0 ? Math.min(1, savedAmt / moneybox.goalAmount) : 0,
      unfilled: unfilledCells,
      filledCount: filledCells.length,
      daysSinceCreation: days,
      daysAhead: filledCells.length - expected,
    };
  }, [moneybox, cells]);

  const triggeredSet = useMemo(
    () => new Set(moneybox?.milestonesTriggered ?? []),
    [moneybox?.milestonesTriggered],
  );

  const savedRef = useRef(saved);
  savedRef.current = saved;
  const triggeredRef = useRef(triggeredSet);
  triggeredRef.current = triggeredSet;

  // Queue-driven milestone dispatcher for 25/50/75 toasts.
  // 100 is intentionally skipped here - the goal-complete screen (banner +
  // ShareCard + confetti + sound) is the celebration for completion, driven
  // off the isCompleted transition below.
  const showNextMilestone = useCallback(() => {
    if (activeToast !== null) return;
    let next = milestoneQueue.current.shift();
    while (next === 100) next = milestoneQueue.current.shift();
    if (next === undefined) return;
    setActiveToast(next);
  }, [activeToast]);

  useEffect(() => {
    showNextMilestone();
  }, [showNextMilestone]);

  // Next cell in grid reading order (left-to-right, top-to-bottom) - this is
  // a tracker, not an actual savings app, so following the grid sequence gives
  // a predictable "today's slot" ritual instead of a random pick.
  const suggestion = useMemo(() => {
    if (unfilled.length === 0) return null;
    return [...unfilled].sort((a, b) => (a.row - b.row) || (a.col - b.col))[0];
  }, [unfilled]);

  // How many days ahead of "today" the next unfilled cell represents.
  //   0  → today's slot        (normal case)
  //   1  → tomorrow's slot     (user already did today, saving ahead)
  //   >1 → further ahead       (saving even more in advance)
  //  <0  → catching up         (missed earlier days; treat as "today")
  const suggestionDayOffset = filledCount + 1 - daysSinceCreation;

  const isCompleted = moneybox?.status === 'completed';
  const isAbandoned = moneybox?.status === 'abandoned';
  const isReadOnly = isCompleted || isAbandoned;

  // Fire confetti + completion sound exactly once - when the vault transitions
  // from active → completed during this session. Revisiting an already-completed
  // vault does NOT retrigger, because the ref initializes to the current value.
  const wasCompletedRef = useRef<boolean>(!!isCompleted);
  useEffect(() => {
    if (!wasCompletedRef.current && isCompleted) {
      setShowCompletionFX(true);
      if (profile?.soundEnabled) playComplete();
    }
    wasCompletedRef.current = !!isCompleted;
  }, [isCompleted, profile?.soundEnabled, playComplete]);

  const undoStack = id ? fillHistory[id] ?? [] : [];
  const undoableCellId = undoStack.at(-1) ?? null;
  const undoCount = undoStack.length;

  const handleUndo = useCallback(async () => {
    if (!id) return;
    const result = await unfillLastCell(id);
    if (!result.success && result.error && result.error !== 'Nothing to undo' && result.error !== 'Busy') {
      showAlert('Undo failed', 'Check your connection and try again.', undefined, '⚠️');
    }
    // Milestones are intentionally NOT reverted - they're permanent achievements.
  }, [id, unfillLastCell, showAlert]);

  const handleTap = useCallback(
    (cell: Cell) => {
      if (!moneybox || !id || isReadOnly) return;

      // Tapping the most-recent filled cell undoes that save. After the undo,
      // the previous fill becomes the new undo target so users can keep
      // undoing back through their fill history.
      if (cell.isFilled) {
        if (cell.id !== undoableCellId) return;
        showAlert(
          'Undo this save?',
          `Take back ${formatAmount(cell.amount, moneybox.currency)}? Tap again to keep undoing earlier saves.`,
          [
            { text: 'Keep it', style: 'cancel' },
            { text: 'Undo', style: 'destructive', onPress: handleUndo },
          ],
          '↩️',
        );
        return;
      }

      showAlert(
        dropConfirmTitle(suggestionDayOffset),
        `Drop ${formatAmount(cell.amount, moneybox.currency)} into your moneybox?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Save it', onPress: () => confirmFill(cell) },
        ],
        '💰',
      );
    },
    [moneybox, id, isReadOnly, showAlert, undoableCellId, handleUndo, suggestionDayOffset],
  );

  const confirmFill = useCallback(
    async (cell: Cell) => {
      if (!moneybox || !id) return;
      // Guard against stale state: even if handleTap was called before status
      // flipped, stop here if the moneybox is no longer active.
      if (moneybox.status !== 'active') return;
      setFilling(true);

      if (profile?.soundEnabled) playCoinDrop();

      const result = await fillCell(cell.id, id);
      setFilling(false);

      if (result.success) {
        markTodayActive(userId);
        fillCount.current += 1;
        if (fillCount.current % INTERSTITIAL_EVERY === 0) {
          if (interstitialReady.current) {
            try {
              interstitial.show();
            } catch {
              // Show failed - skip silently, cell fill succeeded.
            }
          } else {
            // Ad not loaded yet - queue so the LOADED listener shows it.
            pendingShow.current = true;
          }
        }

        // Welcome-arc celebration: prefer day-10 if both unlocked in the
        // same fill (impossible normally but guarded). Goal-completion (100)
        // takes priority and is handled by the milestone queue below.
        if (!result.completed) {
          if (result.unlockedDayTen) {
            setUserMilestone('day-10');
          } else if (result.unlockedDaySeven) {
            setUserMilestone('day-7');
          }
        }
      }

      if (!result.success) {
        if (
          result.error &&
          result.error !== 'Already filling this cell' &&
          result.error !== 'Cell already filled'
        ) {
          showAlert('Save failed', 'Check your connection and try again.', undefined, '⚠️');
        }
        return;
      }

      const previousSaved = savedRef.current;
      const currentSaved = previousSaved + cell.amount;
      const goal = moneybox.goalAmount;
      // Use floor so near-threshold fills (e.g. 99.6%) don't round up and fire
      // a milestone before it's actually reached - particularly important for
      // 100%, which would otherwise celebrate completion while cells remain.
      const newPct = Math.floor((currentSaved / goal) * 100);
      const prevPct = Math.floor((previousSaved / goal) * 100);

      // Queue every milestone the fill just crossed (e.g., 20→60 fires 25 AND 50).
      // `triggeredRef` is the backend-backed set, so reloading/cross-device state
      // never re-fires the same milestone.
      const alreadyTriggered = triggeredRef.current;
      const crossed: Milestone[] = [];
      for (const m of MILESTONES) {
        // 100 has an extra safeguard: require every cell filled. The store
        // flips moneybox.status to 'completed' in that case, so we use it as
        // the source of truth rather than trusting float arithmetic.
        if (m === 100) {
          const allFilled = result.completed === true;
          if (allFilled && !alreadyTriggered.has(100)) crossed.push(100);
          continue;
        }
        if (newPct >= m && prevPct < m && !alreadyTriggered.has(m)) {
          crossed.push(m);
        }
      }

      if (crossed.length > 0) {
        milestoneQueue.current.push(...crossed);
        showNextMilestone();
        const merged = [...alreadyTriggered, ...crossed];
        void persistMilestones(id, merged);
      }
    },
    [moneybox, id, fillCell, profile?.soundEnabled, playCoinDrop, userId, persistMilestones, showNextMilestone],
  );

  const theme = getTheme(moneybox?.theme ?? 'classic_gold');

  /** Run a rewarded ad and resolve true if the user earned the reward. */
  const playRewardedAd = useCallback(
    () =>
      new Promise<boolean>((resolve) => {
        const ad = RewardedAd.createForAdRequest(AD_UNIT_IDS.REWARDED);
        let earned = false;
        const unsubLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
          try { ad.show(); } catch { resolve(false); }
        });
        const unsubEarned = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
          earned = true;
        });
        const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
          unsubLoaded(); unsubEarned(); unsubClosed(); unsubError();
          resolve(earned);
        });
        const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => {
          unsubLoaded(); unsubEarned(); unsubClosed(); unsubError();
          resolve(false);
        });
        try { ad.load(); } catch { resolve(false); }
      }),
    [],
  );

  const openEdit = useCallback(() => {
    if (isReadOnly || editAdLoading) return;
    showAlert(
      'Watch ad to edit?',
      'Editing name or theme is supported by a short ad. Watch one to continue.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Watch ad',
          onPress: async () => {
            setEditAdLoading(true);
            const earned = await playRewardedAd();
            setEditAdLoading(false);
            if (earned) {
              setEditOpen(true);
            } else {
              showAlert(
                'Ad not completed',
                'Watch the full ad to unlock editing.',
                undefined,
                'ℹ️',
              );
            }
          },
        },
      ],
      '✏️',
    );
  }, [isReadOnly, editAdLoading, playRewardedAd, showAlert]);

  if (!moneybox) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }
  const hapticsEnabled = profile?.hapticsEnabled ?? true;
  const daysLeft = moneybox.targetDays - filledCount;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar style="light" />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* ── Compact gradient header ── */}
        <LinearGradient
          colors={
            theme.heroGradientMid
              ? [theme.heroGradientStart, theme.heroGradientMid, theme.heroGradientEnd]
              : [theme.heroGradientStart, theme.heroGradientEnd]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ paddingBottom: 48, overflow: 'hidden' }}
        >
          {/* Themed animated decorations - only inside the hero */}
          <ThemeBackground
            decoration={theme.decoration}
            seed={(moneybox.id.charCodeAt(0) || 0) + (moneybox.id.charCodeAt(1) || 0)}
          />
          {/* Back + vault name + edit */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 56, gap: 10 }}>
            <SpringPressable
              onPress={() => router.back()}
              style={{ justifyContent: 'center' }}
            >
              <ChevronLeft size={22} color={theme.textOnHero} />
            </SpringPressable>
            <Text style={{ fontSize: 18 }}>{moneybox.icon || '💰'}</Text>
            <Text
              style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 16, color: theme.textOnHero, flex: 1 }}
              numberOfLines={1}
            >
              {moneybox.name}
            </Text>
            {!isReadOnly && (
              <SpringPressable
                onPress={openEdit}
                disabled={editAdLoading}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: 'rgba(255,255,255,0.18)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {editAdLoading ? (
                  <ActivityIndicator size="small" color={theme.textOnHero} />
                ) : (
                  <Pencil size={15} color={theme.textOnHero} />
                )}
              </SpringPressable>
            )}
          </View>

          {/* Centered stats */}
          <View style={{ alignItems: 'center', paddingTop: 16, paddingBottom: 4, alignSelf: 'stretch', paddingHorizontal: 20 }}>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
              style={{ fontFamily: 'DMSans_700Bold', fontSize: 32, color: theme.textOnHero, marginTop: 4 }}
            >
              {formatAmount(saved, moneybox.currency)}
            </Text>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: theme.textOnHeroSecondary, marginTop: 4 }}
            >
              of {formatAmount(moneybox.goalAmount, moneybox.currency)}
              {!isCompleted && daysLeft > 0 ? ` · ${daysLeft}d left` : ''}
            </Text>

            {/* Stash spot chip - reminds the user where the actual cash lives */}
            {(() => {
              const spot = getStashSpot(moneybox.stashSpot);
              if (!spot) return null;
              return (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    marginTop: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 999,
                    backgroundColor: 'rgba(255,255,255,0.16)',
                  }}
                >
                  <Text style={{ fontSize: 12 }}>{spot.emoji}</Text>
                  <Text
                    style={{
                      fontFamily: 'DMSans_500Medium',
                      fontSize: 11,
                      color: theme.textOnHero,
                      letterSpacing: 0.3,
                    }}
                  >
                    Stashed in {spot.label.toLowerCase()}
                  </Text>
                </View>
              );
            })()}

            {/* Progress bar */}
            <View style={{ width: '72%', marginTop: 16 }}>
              <ProgressBar
                progress={pct}
                color={theme.accent}
                completeColor={theme.success}
                isComplete={isCompleted}
              />
              <Text
                style={{
                  fontFamily: 'DMSans_600SemiBold',
                  fontSize: 13,
                  color: theme.textOnHero,
                  textAlign: 'center',
                  marginTop: 8,
                  letterSpacing: 0.3,
                }}
              >
                {Math.round(pct * 100)}%
              </Text>
            </View>

            {/* Days ahead/behind */}
            {!isCompleted && filledCount > 0 && (
              <View
                style={{
                  marginTop: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 3,
                  borderRadius: 12,
                  backgroundColor:
                    daysAhead > 0 ? 'rgba(34,197,94,0.2)' : daysAhead < 0 ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.12)',
                }}
              >
                <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 11, color: theme.textOnHero }}>
                  {daysAhead > 0
                    ? `${daysAhead}d ahead`
                    : daysAhead < 0
                      ? `${Math.abs(daysAhead)}d behind`
                      : 'On track'}
                </Text>
              </View>
            )}
            {filling && (
              <ActivityIndicator size="small" color={theme.textOnHero} style={{ marginTop: 8 }} />
            )}
          </View>
        </LinearGradient>

        {/* ── Content ── */}
        <View style={{ paddingHorizontal: 16, marginTop: -24 }}>
          {/* Completed */}
          {isCompleted && (
            <>
              <View
                style={{
                  backgroundColor: theme.successBg,
                  borderRadius: 16,
                  padding: 20,
                  alignItems: 'center',
                  marginBottom: 16,
                }}
              >
                <Text style={{ fontSize: 32 }}>🏆</Text>
                <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 18, color: theme.textPrimary, marginTop: 8 }}>
                  Goal complete!
                </Text>
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: theme.textSecondary, marginTop: 4, textAlign: 'center' }}>
                  You saved {formatAmount(moneybox.goalAmount, moneybox.currency)} - every cell filled.
                </Text>
              </View>
              {/* If this was a "Payoff Booster" vault, suggest applying it to the
               *  linked loan (renders nothing otherwise). */}
              <PayoffBoosterCard moneybox={moneybox} savedMajor={saved} />
              <View style={{ alignItems: 'center', marginBottom: 16 }}>
                <ShareCard
                  moneybox={moneybox}
                  savedAmount={saved}
                  filledCells={filledCount}
                  totalCells={cells.length}
                  onCreateNew={() => router.push('/create')}
                />
              </View>
            </>
          )}

          {/* Abandoned banner - read-only notice */}
          {isAbandoned && (
            <View
              style={{
                backgroundColor: 'rgba(107, 114, 128, 0.08)',
                borderRadius: 16,
                padding: 20,
                alignItems: 'center',
                marginBottom: 16,
                borderWidth: 1,
                borderColor: 'rgba(107, 114, 128, 0.2)',
              }}
            >
              <Text style={{ fontSize: 28 }}>🗑️</Text>
              <Text
                style={{
                  fontFamily: 'DMSans_700Bold',
                  fontSize: 16,
                  color: theme.textSecondary,
                  marginTop: 8,
                  letterSpacing: 0.5,
                }}
              >
                ABANDONED
              </Text>
              <Text
                style={{
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 13,
                  color: theme.textMuted,
                  marginTop: 6,
                  textAlign: 'center',
                  lineHeight: 19,
                }}
              >
                This moneybox has been abandoned and can no longer be updated.
              </Text>
            </View>
          )}

          {/* Streak + nudge card */}
          {!isCompleted && (
            <View
              style={{
                backgroundColor: theme.surface,
                borderRadius: 16,
                overflow: 'hidden',
                marginBottom: 12,
                shadowColor: theme.shadowColor,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 1,
                shadowRadius: 20,
                elevation: 2,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {streak && streak.currentDays > 0 ? (
                    <Flame size={16} color="#F59E0B" />
                  ) : (
                    <Zap size={16} color={theme.textMuted} />
                  )}
                  <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: theme.textPrimary }}>
                    {streak?.currentDays ?? 0} day streak
                  </Text>
                  {streak && streak.bestDays > streak.currentDays && (
                    <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: theme.textMuted }}>
                      · Best {streak.bestDays}
                    </Text>
                  )}
                </View>
              </View>
              {suggestion && (
                <>
                  <View style={{ height: 0.5, backgroundColor: theme.borderLight, marginHorizontal: 16 }} />
                  <View style={{ backgroundColor: theme.accentSoft, paddingHorizontal: 16, paddingVertical: 10 }}>
                    {(() => {
                      const { lead, trail } = suggestionLabel(suggestionDayOffset);
                      return (
                        <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: theme.accent }}>
                          {lead}
                          <Text style={{ fontFamily: 'DMSans_700Bold' }}>
                            {formatAmount(suggestion.amount, moneybox.currency)}
                          </Text>
                          {trail}
                        </Text>
                      );
                    })()}
                  </View>
                </>
              )}
            </View>
          )}

          {/* Drag coin - only on active moneyboxes */}
          {!isReadOnly && suggestion && (
            <DragCoin
              hapticsEnabled={hapticsEnabled}
              onDrop={() => { if (suggestion) confirmFill(suggestion); }}
            />
          )}

          {/* Undo affordance - visible whenever there's a fill to undo */}
          {!isReadOnly && undoableCellId && (
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4, marginBottom: 4 }}>
              <Pressable
                onPress={() => {
                  const cell = cells.find((c) => c.id === undoableCellId);
                  if (cell) handleTap(cell);
                }}
                hitSlop={8}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: theme.accentSoft,
                }}
              >
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: theme.accent }}>
                  ↩︎ Undo last save
                  {undoCount > 1 ? ` (${undoCount} available)` : ''}
                </Text>
              </Pressable>
            </View>
          )}

          {/* Grid - muted when abandoned so read-only state is visually clear */}
          <View style={{ marginTop: 4, opacity: isAbandoned ? 0.55 : 1 }}>
            <MoneyboxGrid
              cells={cells}
              rows={moneybox.gridRows}
              cols={moneybox.gridCols}
              theme={theme}
              hapticsEnabled={hapticsEnabled}
              onTap={handleTap}
              undoableCellId={isReadOnly ? null : undoableCellId}
              onRowComplete={(rowIdx) => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setRowCelebration(rowIdx);
                setTimeout(() => setRowCelebration(null), 2000);
              }}
            />
          </View>

          {/* Danger zone */}
          {!isReadOnly && (
            <View style={{ marginTop: 32 }}>
              <Text
                style={{
                  fontFamily: 'DMSans_500Medium',
                  fontSize: 12,
                  color: theme.textMuted,
                  letterSpacing: 0.5,
                  marginBottom: 8,
                }}
              >
                DANGER ZONE
              </Text>
              {/* AdMob banner */}
              {adsReady && (
                <View style={{ marginBottom: 16 }}>
                  <BannerAd
                    unitId={AD_UNIT_IDS.BANNER}
                    size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
                  />
                </View>
              )}

              <View
                style={{
                  backgroundColor: theme.surface,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: 'rgba(239,68,68,0.2)',
                  overflow: 'hidden',
                }}
              >
                <SpringPressable
                  onPress={() => {
                    // Build a message that names what the user is throwing
                    // away. Vague copy ("All progress will be lost") doesn't
                    // give them enough to make a real choice.
                    const formattedSaved = formatAmount(saved, moneybox.currency);
                    const abandonMessage =
                      filledCount === 0
                        ? 'Your setup will be removed. This can’t be undone.'
                        : filledCount === 1
                          ? `You’ll lose 1 saved cell (${formattedSaved}). This can’t be undone.`
                          : `You’ll lose ${filledCount} saved cells totalling ${formattedSaved}. This can’t be undone.`;
                    showAlert('Abandon stashbox?', abandonMessage, [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Abandon',
                        style: 'destructive',
                        onPress: () => {
                          // Order of operations to avoid the Android crash:
                          // 1. Wait for the destructive Modal's fade-out
                          //    animation to fully complete (~300ms). Tearing
                          //    down the detail screen while the native Modal
                          //    is still attached crashes the UI thread.
                          // 2. Navigate to home FIRST, so the detail screen
                          //    unmounts before the optimistic store mutation
                          //    lands and forces a re-render with
                          //    status='abandoned'.
                          // 3. Fire abandonMoneybox in the background and
                          //    swallow any error - the home screen will pick
                          //    up the new status on its next render.
                          const targetId = moneybox.id;
                          setTimeout(() => {
                            router.replace('/(tabs)');
                            abandonMoneybox(targetId).catch(() => {});
                          }, 320);
                        },
                      },
                    ], '🗑️');
                  }}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View>
                    <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: '#EF4444' }}>
                      Abandon this moneybox
                    </Text>
                    <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: theme.textMuted, marginTop: 2 }}>
                      All progress will be lost
                    </Text>
                  </View>
                  <ChevronRight size={16} color="rgba(239,68,68,0.4)" />
                </SpringPressable>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Row celebration */}
      {rowCelebration !== null && (
        <View style={{
          position: 'absolute', left: 24, right: 24, bottom: 40,
          backgroundColor: theme.accentLight, borderRadius: 12, padding: 10,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
          shadowColor: 'rgba(0,0,0,0.12)', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 4,
        }}>
          <Text style={{ fontSize: 16 }}>🎉</Text>
          <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 13, color: theme.accent }}>
            Row {rowCelebration + 1} complete!
          </Text>
        </View>
      )}

      <MilestoneToast
        milestone={activeToast}
        hapticsEnabled={hapticsEnabled}
        onDismiss={() => setActiveToast(null)}
      />
      {showCompletionFX && (
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <ConfettiCannon
            count={200}
            origin={{ x: -10, y: 0 }}
            autoStart
            fadeOut
            explosionSpeed={350}
            fallSpeed={3000}
            colors={['#1DB954', '#4ADE80', '#86EFAC', '#FFFFFF', '#FBBF24']}
            onAnimationEnd={() => setShowCompletionFX(false)}
          />
        </View>
      )}
      <EditMoneyboxModal
        visible={editOpen}
        moneybox={moneybox}
        onCancel={() => setEditOpen(false)}
        onSave={async (patch) => {
          if (patch.name !== moneybox.name) {
            await renameMoneybox(moneybox.id, patch.name);
          }
          if (patch.icon !== (moneybox.icon || '💰')) {
            await setBoxIcon(moneybox.id, patch.icon);
          }
          if (patch.stashSpot !== moneybox.stashSpot) {
            await setBoxStashSpot(moneybox.id, patch.stashSpot);
          }
          if (patch.theme !== moneybox.theme) {
            await setBoxTheme(moneybox.id, patch.theme);
          }
          setEditOpen(false);
        }}
      />
      <CustomAlert config={alertConfig} onDismiss={dismissAlert} />
      <MilestoneOverlay
        milestone={userMilestone}
        onDismiss={() => setUserMilestone(null)}
      />
    </View>
  );
}

/**
 * Copy for the "save next cell" hint, context-aware by how many days ahead of
 * today the next unfilled cell represents. Negative offsets (catch-up) and 0
 * both surface as "today" so users aren't shamed for being behind.
 */
function suggestionLabel(dayOffset: number): { lead: string; trail: string } {
  if (dayOffset <= 0) return { lead: 'Save ', trail: ' today' };
  if (dayOffset === 1) return { lead: 'Save tomorrow’s ', trail: ' early' };
  return { lead: 'Save ', trail: ` · ${dayOffset} days ahead` };
}

function dropConfirmTitle(dayOffset: number): string {
  if (dayOffset <= 0) return 'Save today?';
  if (dayOffset === 1) return 'Save tomorrow’s cell early?';
  return `Save ${dayOffset} days ahead?`;
}
