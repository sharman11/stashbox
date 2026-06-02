import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, type AppStateStatus, Pressable, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  ZoomIn,
  ZoomOut,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { GameLayout } from '@/components/games/GameLayout';

import { CURRENCIES, getNotes } from '@/lib/currency';
import type { CurrencyCode } from '@/lib/currency';
import { useBadgesStore } from '@/lib/badges/store';
import { useScoresStore } from '@/lib/games/scores';
import { usePlayedStore } from '@/lib/games/played';
import { useMoneyboxesStore } from '@/lib/stores/moneyboxes';
import { useProfileStore } from '@/lib/stores/profile';
import { getGame } from '@/lib/games/registry';
import { useAppTheme } from '@/lib/stores/theme';

// Per-game palette from the registry — board matches the game's icon art.
const PALETTE = getGame('whack-a-coin')!.palette;

// Whack-a-coin board — tinted with the game's coral identity for a carnival
// vibe. The gold coins pop hard against the coral surface.
const BOARD = {
  bg: PALETTE.accent,
  hole: PALETTE.accentDark,
  holeRim: '#F4897A',
  coin: '#FBBF24',
  coinRim: '#D97706',
  coinDark: '#7C2D12',
};

const ROUND_SECONDS = 60;
const HOLES = 9;
const MAX_CONCURRENT = 3;

interface ActiveCoin {
  /** Hole index 0..8 */
  hole: number;
  /** Note value to award when whacked. */
  value: number;
  /** Timestamp when this coin will disappear if not whacked. */
  expiresAt: number;
  /** Unique key so the React tree remounts and replays the entry animation. */
  key: number;
}

function pickValue(notes: readonly number[]): number {
  // Bias toward smaller notes so high-value pops feel like a treat.
  const weighted: number[] = [];
  notes.forEach((n, i) => {
    const weight = Math.max(1, notes.length - i);
    for (let k = 0; k < weight; k++) weighted.push(n);
  });
  return weighted[Math.floor(Math.random() * weighted.length)];
}

export default function WhackACoinScreen() {
  const C = useAppTheme();
  const { width } = useWindowDimensions();
  const profile = useProfileStore((s) => s.profile);
  const moneyboxes = useMoneyboxesStore((s) => s.moneyboxes);
  const cellsByMoneybox = useMoneyboxesStore((s) => s.cellsByMoneybox);
  const streaks = useMoneyboxesStore((s) => s.streaks);
  const submitScore = useScoresStore((s) => s.submit);
  const bestMap = useScoresStore((s) => s.best);
  const evaluateBadges = useBadgesStore((s) => s.evaluate);
  const markPlayed = usePlayedStore((s) => s.markPlayed);
  const playedSet = usePlayedStore((s) => s.played);
  const loadScores = useScoresStore((s) => s.load);

  const currency: CurrencyCode = profile?.defaultCurrency ?? 'USD';
  const symbol = CURRENCIES[currency].symbol;
  const notes = useMemo(() => getNotes(currency), [currency]);

  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    loadScores();
    markPlayed('whack-a-coin');
  }, [loadScores, markPlayed]);

  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [active, setActive] = useState<ActiveCoin[]>([]);
  const [over, setOver] = useState(false);
  const [lastGain, setLastGain] = useState(0);
  const [gainSeq, setGainSeq] = useState(0);
  // Pause the round when the OS backgrounds the app — without this, the
  // 60-second countdown keeps draining and active coins expire while the
  // user is in another app.
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s: AppStateStatus) => {
      setPaused(s !== 'active');
    });
    return () => sub.remove();
  }, []);

  const keySeq = useRef(0);
  // Refs power the spawn / countdown chains so they read live values without
  // re-subscribing - the original implementation rebuilt its spawn timer every
  // 200ms (timeLeft tick), which prevented coins from ever appearing.
  const overRef = useRef(false);
  const timeLeftRef = useRef(ROUND_SECONDS);
  const notesRef = useRef(notes);
  const scoreRef = useRef(0);
  // Mirror of `active` so the whack handler can find the target synchronously
  // (a setState updater callback only runs at commit time - reading via a ref
  // means a tap can resolve in one event tick).
  const activeRef = useRef<ActiveCoin[]>([]);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  const buildSnapshot = useCallback(() => {
    const totalCellsFilled = Object.values(cellsByMoneybox)
      .flat()
      .filter((c) => c.isFilled).length;
    let highestProgress = 0;
    let anyBoxCompleted = false;
    for (const box of moneyboxes) {
      if (box.status === 'completed') anyBoxCompleted = true;
      const cells = cellsByMoneybox[box.id] ?? [];
      const saved = cells.filter((c) => c.isFilled).reduce((s, c) => s + c.amount, 0);
      const pct = box.goalAmount > 0 ? saved / box.goalAmount : 0;
      if (pct > highestProgress) highestProgress = pct;
    }
    const bestEverStreak = Object.values(streaks).reduce((m, s) => Math.max(m, s.bestDays ?? 0), 0);
    const bestCurrentStreak = Object.values(streaks).reduce((m, s) => Math.max(m, s.currentDays ?? 0), 0);
    return {
      totalCellsFilled,
      highestProgress,
      anyBoxCompleted,
      bestCurrentStreak,
      bestEverStreak,
      // Read fresh - `bestMap` is the pre-submit snapshot.
      bestScores: useScoresStore.getState().best,
      played: playedSet,
    };
  }, [cellsByMoneybox, moneyboxes, streaks, playedSet]);

  const endRound = useCallback(() => {
    if (overRef.current) return;
    overRef.current = true;
    activeRef.current = [];
    setOver(true);
    setActive([]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    submitScore('whack-a-coin', scoreRef.current).then(() => evaluateBadges(buildSnapshot()));
  }, [submitScore, evaluateBadges, buildSnapshot]);

  // ── Self-paced spawn chain. Reads from refs so it never reschedules
  // mid-game - that was the original game-breaking bug. Effect re-runs only
  // when `over` flips, and now also when `paused` flips so backgrounding
  // halts the spawn chain cleanly.
  useEffect(() => {
    if (over || paused) return;
    // On resume after a long background, drop any leftover active coins so
    // the user doesn't return to an empty visible board (their `expiresAt`
    // is wall-clock so they're already stale). Spawn loop creates fresh
    // ones immediately on the next tick.
    if (activeRef.current.length > 0) {
      activeRef.current = [];
      setActive([]);
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tickSpawn = () => {
      if (cancelled || overRef.current) return;
      const elapsed = ROUND_SECONDS - timeLeftRef.current;
      const lifeMs = Math.max(700, 1600 - elapsed * 12);
      const spawnEveryMs = Math.max(380, 1100 - elapsed * 14);

      // Compute the next active list synchronously so activeRef and React
      // state stay perfectly in lockstep - the whack handler reads activeRef
      // to find the tapped coin, so any drift means missed scores.
      const prev = activeRef.current;
      if (prev.length < MAX_CONCURRENT) {
        const occupied = new Set(prev.map((p) => p.hole));
        const free: number[] = [];
        for (let i = 0; i < HOLES; i++) if (!occupied.has(i)) free.push(i);
        if (free.length > 0) {
          const holeIdx = free[Math.floor(Math.random() * free.length)];
          keySeq.current += 1;
          const next = [
            ...prev,
            {
              hole: holeIdx,
              value: pickValue(notesRef.current),
              expiresAt: Date.now() + lifeMs,
              key: keySeq.current,
            },
          ];
          activeRef.current = next;
          setActive(next);
        }
      }

      timer = setTimeout(tickSpawn, spawnEveryMs);
    };

    // Short initial delay so the first coin appears almost immediately and the
    // player gets feedback right after the round starts.
    timer = setTimeout(tickSpawn, 350);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [over, paused]);

  // ── Countdown + expire stale coins. Stable effect (deps: `over`, `paused`).
  useEffect(() => {
    if (over || paused) return;
    const t = setInterval(() => {
      const now = Date.now();
      const filtered = activeRef.current.filter((p) => p.expiresAt > now);
      if (filtered.length !== activeRef.current.length) {
        activeRef.current = filtered;
        setActive(filtered);
      }
      const next = Math.max(0, timeLeftRef.current - 0.2);
      timeLeftRef.current = next;
      setTimeLeft(next);
      if (next <= 0) {
        endRound();
      }
    }, 200);
    return () => clearInterval(t);
  }, [over, paused, endRound]);

  const whack = useCallback(
    (key: number) => {
      if (overRef.current) return;
      // Read synchronously from the ref - a setState updater callback only
      // runs at commit time, so the previous "find inside setActive" pattern
      // left `target` undefined and silently dropped every score.
      const target = activeRef.current.find((p) => p.key === key);
      if (!target) return;
      // Atomic remove: update the ref first so a rapid double-tap on the
      // same coin can't process twice.
      const next = activeRef.current.filter((p) => p.key !== key);
      activeRef.current = next;
      setActive(next);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const newScore = scoreRef.current + target.value;
      scoreRef.current = newScore;
      setScore(newScore);
      setLastGain(target.value);
      setGainSeq((s) => s + 1);
      // Persist mid-round so the hub reflects progress even if the player
      // bails before time runs out. submit no-ops if not a new best.
      submitScore('whack-a-coin', newScore);
    },
    [submitScore],
  );

  const restart = useCallback(() => {
    overRef.current = false;
    timeLeftRef.current = ROUND_SECONDS;
    scoreRef.current = 0;
    activeRef.current = [];
    setScore(0);
    setTimeLeft(ROUND_SECONDS);
    setActive([]);
    setOver(false);
    setLastGain(0);
    setGainSeq(0);
  }, []);

  const boardSize = Math.min(width - 32, 380);
  const gap = 12;
  const best = bestMap['whack-a-coin'];

  return (
    <GameLayout
      gameId="whack-a-coin"
      title="Whack-a-Coin"
      scoreLabel="Score"
      score={score}
      secondary={over ? `Best ${best ?? 0}` : `${Math.ceil(timeLeft)}s left`}
      onRestart={restart}
    >
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }}>
        {/* Big in-board score with floating "+N" feedback per whack. */}
        <View style={{ alignItems: 'center', marginBottom: 8, height: 64, justifyContent: 'center' }}>
          <Text
            style={{
              fontFamily: 'DMSans_500Medium',
              fontSize: 11,
              color: C.textMuted,
              letterSpacing: 1,
            }}
          >
            SCORE
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <ScorePulse value={score} pulseKey={gainSeq} />
            {lastGain > 0 && <FloatingGain key={gainSeq} amount={lastGain} symbol={symbol} />}
          </View>
        </View>

        <Text
          style={{
            fontFamily: 'DMSans_400Regular',
            fontSize: 12,
            color: C.textMuted,
            marginBottom: 12,
            textAlign: 'center',
          }}
        >
          Tap coins as they pop · 60 seconds · gets faster
        </Text>

        {/* Board - flex+gap layout, no margin math. */}
        <View
          style={{
            width: boardSize,
            height: boardSize,
            backgroundColor: BOARD.bg,
            borderRadius: 18,
            padding: gap,
            gap,
          }}
        >
          {[0, 1, 2].map((rowIdx) => (
            <View key={rowIdx} style={{ flex: 1, flexDirection: 'row', gap }}>
              {[0, 1, 2].map((colIdx) => {
                const holeIdx = rowIdx * 3 + colIdx;
                const coin = active.find((a) => a.hole === holeIdx);
                return (
                  <Hole
                    key={holeIdx}
                    coin={coin}
                    symbol={symbol}
                    onWhack={whack}
                    disabled={over}
                  />
                );
              })}
            </View>
          ))}
        </View>

        {paused && !over && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 16,
              right: 16,
              top: '50%',
              transform: [{ translateY: -30 }],
              backgroundColor: 'rgba(0,0,0,0.7)',
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: 'center',
            }}
          >
            <Text
              allowFontScaling={false}
              style={{ fontFamily: 'DMSans_700Bold', fontSize: 18, color: '#FFFFFF' }}
            >
              Paused
            </Text>
          </View>
        )}

        {over && (
          <Animated.View
            entering={FadeIn.duration(300)}
            style={{
              position: 'absolute',
              left: 16,
              right: 16,
              top: '50%',
              transform: [{ translateY: -100 }],
              backgroundColor: C.surface,
              borderRadius: 20,
              paddingVertical: 24,
              paddingHorizontal: 24,
              alignItems: 'center',
              shadowColor: 'rgba(0,0,0,0.25)',
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 1,
              shadowRadius: 32,
              elevation: 12,
            }}
          >
            <Text style={{ fontSize: 48 }}>🔨</Text>
            <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 22, color: C.textPrimary, marginTop: 8 }}>
              Time’s up
            </Text>
            <Text
              style={{
                fontFamily: 'DMSans_400Regular',
                fontSize: 14,
                color: C.textSecondary,
                marginTop: 4,
                textAlign: 'center',
              }}
            >
              You whacked {symbol}{score}
            </Text>
            <Pressable
              onPress={restart}
              style={{
                marginTop: 18,
                backgroundColor: C.buttonPrimaryBg,
                borderRadius: 14,
                paddingVertical: 14,
                paddingHorizontal: 36,
              }}
            >
              <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 15, color: C.buttonPrimaryText }}>
                Play again
              </Text>
            </Pressable>
          </Animated.View>
        )}
      </View>
    </GameLayout>
  );
}

interface HoleProps {
  coin: ActiveCoin | undefined;
  symbol: string;
  onWhack: (key: number) => void;
  disabled: boolean;
}

/** Whole-hole tap target. The original implementation only made the (smaller)
 *  coin tappable - players tapping the visible rim got no response. */
function Hole({ coin, symbol, onWhack, disabled }: HoleProps) {
  const handlePress = () => {
    if (disabled || !coin) return;
    onWhack(coin.key);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={{
        flex: 1,
        aspectRatio: 1,
        borderRadius: 999,
        backgroundColor: BOARD.hole,
        borderWidth: 3,
        borderColor: BOARD.holeRim,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {coin && (
        <Animated.View
          key={coin.key}
          entering={ZoomIn.duration(140)}
          exiting={ZoomOut.duration(120)}
          style={{
            width: '82%',
            height: '82%',
            borderRadius: 999,
            backgroundColor: BOARD.coin,
            borderWidth: 3,
            borderColor: BOARD.coinRim,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          pointerEvents="none"
        >
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.5}
            allowFontScaling={false}
            style={{
              fontFamily: 'DMSans_700Bold',
              fontSize: 18,
              color: BOARD.coinDark,
              letterSpacing: -0.3,
              paddingHorizontal: 4,
              textAlign: 'center',
            }}
          >
            {symbol}
            {coin.value}
          </Text>
        </Animated.View>
      )}
    </Pressable>
  );
}

/** Big animated score number that briefly pulses each time it ticks up. */
function ScorePulse({ value, pulseKey }: { value: number; pulseKey: number }) {
  const C = useAppTheme();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (pulseKey === 0) return;
    scale.value = withSequence(
      withTiming(1.18, { duration: 120, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 160, easing: Easing.inOut(Easing.quad) }),
    );
  }, [pulseKey, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.Text
      style={[
        {
          fontFamily: 'DMSans_700Bold',
          fontSize: 36,
          color: C.textPrimary,
          letterSpacing: -0.5,
        },
        animatedStyle,
      ]}
    >
      {value}
    </Animated.Text>
  );
}

/** "+₹N" text that floats up and fades. Remounts on every whack via key. */
function FloatingGain({ amount, symbol }: { amount: number; symbol: string }) {
  const offset = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withSequence(
      withTiming(1, { duration: 80 }),
      withTiming(1, { duration: 400 }),
      withTiming(0, { duration: 320 }),
    );
    offset.value = withTiming(-22, { duration: 800, easing: Easing.out(Easing.quad) });
  }, [offset, opacity]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.Text
      style={[
        {
          fontFamily: 'DMSans_700Bold',
          fontSize: 16,
          color: PALETTE.accentDark,
          letterSpacing: -0.2,
        },
        style,
      ]}
    >
      +{symbol}{amount}
    </Animated.Text>
  );
}
