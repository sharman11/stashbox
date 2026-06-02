import * as Haptics from 'expo-haptics';
import { Coins } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import ConfettiCannon from 'react-native-confetti-cannon';

import { GameLayout } from '@/components/games/GameLayout';

import { useBadgesStore } from '@/lib/badges/store';
import { useScoresStore } from '@/lib/games/scores';
import { usePlayedStore } from '@/lib/games/played';
import { useMoneyboxesStore } from '@/lib/stores/moneyboxes';
import { getGame } from '@/lib/games/registry';
import { useAppTheme } from '@/lib/stores/theme';

// Per-game palette from the registry — cards match the game's icon art.
const PALETTE = getGame('memory-match')!.palette;

// Card-back palette tinted with the game's own color.
const CARD_BACK = PALETTE.accentDark;
const CARD_BACK_EDGE = PALETTE.accent;

/** 8 currency / saving themed icons → 16 cards (8 pairs). */
const CARD_ICONS = ['💰', '💵', '💎', '🪙', '🏦', '✈️', '🎁', '🐷'] as const;

interface Card {
  id: number;
  icon: string;
}

const PAIRS = CARD_ICONS.length;
const CARDS = PAIRS * 2;
const MISMATCH_FLIP_BACK_MS = 700;
const MATCH_LOCK_MS = 250;

function makeDeck(): Card[] {
  const pairs: string[] = [];
  for (const icon of CARD_ICONS) pairs.push(icon, icon);
  // Fisher–Yates shuffle.
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  return pairs.map((icon, id) => ({ id, icon }));
}

function fmtTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function MemoryMatchScreen() {
  const C = useAppTheme();
  const { width } = useWindowDimensions();
  const moneyboxes = useMoneyboxesStore((s) => s.moneyboxes);
  const cellsByMoneybox = useMoneyboxesStore((s) => s.cellsByMoneybox);
  const streaks = useMoneyboxesStore((s) => s.streaks);
  const submitScore = useScoresStore((s) => s.submit);
  const bestMap = useScoresStore((s) => s.best);
  const evaluateBadges = useBadgesStore((s) => s.evaluate);
  const markPlayed = usePlayedStore((s) => s.markPlayed);
  const playedSet = usePlayedStore((s) => s.played);
  const loadScores = useScoresStore((s) => s.load);

  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    loadScores();
    markPlayed('memory-match');
  }, [loadScores, markPlayed]);

  // Immutable deck. Card identity (faceUp / matched) lives in separate sets so
  // race conditions on `setDeck(prev => prev.map(...))` can't desync the board.
  const [deck, setDeck] = useState<Card[]>(() => makeDeck());
  const [matched, setMatched] = useState<Set<number>>(() => new Set());
  /** Card ids currently revealed and awaiting evaluation. Max length 2. */
  const [flipped, setFlipped] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [done, setDone] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds
  const [startedAt, setStartedAt] = useState<number | null>(null);

  // Refs guard against the in-flight race window where two timers and a tap
  // could overlap. lockRef = true means flips are temporarily blocked.
  const lockRef = useRef(false);

  const allMatched = matched.size === CARDS;

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
      // Read fresh - `bestMap` is the pre-submit snapshot via subscription.
      bestScores: useScoresStore.getState().best,
      played: playedSet,
    };
  }, [cellsByMoneybox, moneyboxes, streaks, playedSet]);

  // Elapsed timer - ticks once per second while playing.
  useEffect(() => {
    if (done || startedAt == null) return;
    const t = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [done, startedAt]);

  // Completion side-effects - fires exactly once when the board clears.
  const completionFiredRef = useRef(false);
  useEffect(() => {
    if (!allMatched || completionFiredRef.current) return;
    completionFiredRef.current = true;
    setDone(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    submitScore('memory-match', moves).then(() => evaluateBadges(buildSnapshot()));
  }, [allMatched, moves, submitScore, evaluateBadges, buildSnapshot]);

  const restart = useCallback(() => {
    setDeck(makeDeck());
    setMatched(new Set());
    setFlipped([]);
    setMoves(0);
    setDone(false);
    setElapsed(0);
    setStartedAt(null);
    lockRef.current = false;
    completionFiredRef.current = false;
  }, []);

  const flip = (cardId: number) => {
    if (done || lockRef.current) return;
    if (matched.has(cardId)) return;
    if (flipped.includes(cardId)) return; // double-tap on same card → no-op
    if (flipped.length >= 2) return; // third-card guard

    Haptics.selectionAsync();

    // Start the timer on the first flip of a fresh game.
    if (startedAt == null) setStartedAt(Date.now());

    const nextFlipped = [...flipped, cardId];
    setFlipped(nextFlipped);

    if (nextFlipped.length === 2) {
      setMoves((m) => m + 1);
      lockRef.current = true; // block any taps until evaluation completes

      const [aId, bId] = nextFlipped;
      const a = deck.find((c) => c.id === aId)!;
      const b = deck.find((c) => c.id === bId)!;

      if (a.icon === b.icon) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setTimeout(() => {
          setMatched((m) => {
            const next = new Set(m);
            next.add(aId);
            next.add(bId);
            return next;
          });
          setFlipped([]);
          lockRef.current = false;
        }, MATCH_LOCK_MS);
      } else {
        setTimeout(() => {
          setFlipped([]);
          lockRef.current = false;
        }, MISMATCH_FLIP_BACK_MS);
      }
    }
  };

  const boardSize = Math.min(width - 32, 380);
  const gap = 8;
  const best = bestMap['memory-match'];

  const matchedCount = matched.size;
  const pairsFound = matchedCount / 2;

  return (
    <GameLayout
      gameId="memory-match"
      title="Memory Match"
      scoreLabel="Moves"
      score={moves}
      secondary={
        best != null
          ? `Best ${best} · ${pairsFound}/${PAIRS} · ${fmtTime(elapsed)}`
          : `${pairsFound}/${PAIRS} pairs · ${fmtTime(elapsed)}`
      }
      onRestart={restart}
    >
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }}>
        <Text
          style={{
            fontFamily: 'DMSans_400Regular',
            fontSize: 12,
            color: C.textMuted,
            marginBottom: 12,
            textAlign: 'center',
          }}
        >
          Flip two cards · match all 8 pairs in as few moves as you can
        </Text>

        {/* Board - flex+gap layout, no margin math. */}
        <View
          style={{
            width: boardSize,
            backgroundColor: 'rgba(11,61,46,0.06)',
            borderRadius: 18,
            padding: gap,
            gap,
          }}
        >
          {[0, 1, 2, 3].map((rowIdx) => (
            <View key={rowIdx} style={{ flexDirection: 'row', gap }}>
              {deck.slice(rowIdx * 4, rowIdx * 4 + 4).map((card) => {
                const isMatched = matched.has(card.id);
                const isFlipped = flipped.includes(card.id);
                const showFace = isMatched || isFlipped;
                return (
                  <View key={card.id} style={{ flex: 1, aspectRatio: 1 }}>
                    <CardView
                      icon={card.icon}
                      showFace={showFace}
                      matched={isMatched}
                      onPress={() => flip(card.id)}
                    />
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        {done && (
          <>
            <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
              <ConfettiCannon
                count={140}
                origin={{ x: -10, y: 0 }}
                autoStart
                fadeOut
                explosionSpeed={350}
                fallSpeed={3000}
                colors={['#1DB954', '#4ADE80', '#86EFAC', '#FBBF24', '#FFFFFF']}
              />
            </View>
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
              <Text style={{ fontSize: 48 }}>🧠</Text>
              <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 22, color: C.textPrimary, marginTop: 8 }}>
                Cleared!
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
                {moves} moves · {fmtTime(elapsed)}
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
          </>
        )}
      </View>
    </GameLayout>
  );
}

interface CardViewProps {
  icon: string;
  showFace: boolean;
  matched: boolean;
  onPress: () => void;
}

/**
 * Card with a fake-3D flip animation done via two stacked faces and a synced
 * scaleX on each. Avoids actual rotateY (flaky on Android) but still reads as
 * a flip - and crucially, doesn't depend on conditional borders so the tile
 * never visually shifts when it goes from unmatched → matched.
 */
function CardView({ icon, showFace, matched, onPress }: CardViewProps) {
  const C = useAppTheme();
  const flipPhase = useSharedValue(0); // 0 = back, 1 = face
  const popScale = useSharedValue(1);
  const previousShowFace = useRef(showFace);

  // Drive the flip animation when face state changes.
  useEffect(() => {
    flipPhase.value = withTiming(showFace ? 1 : 0, {
      duration: 220,
      easing: Easing.inOut(Easing.quad),
    });
  }, [showFace, flipPhase]);

  // On match transition, do a small pop so the success is felt.
  useEffect(() => {
    if (matched) {
      popScale.value = withSequence(
        withTiming(1.08, { duration: 110, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 140, easing: Easing.inOut(Easing.quad) }),
      );
    }
  }, [matched, popScale]);

  // Track to make sure flipPhase resets to 0 on restart-game face-down too.
  useEffect(() => {
    previousShowFace.current = showFace;
  }, [showFace]);

  // Two stacked layers - back is visible while flipPhase < 0.5, face after.
  // We compress scaleX through the midpoint to fake a flip.
  const backStyle = useAnimatedStyle(() => {
    const s = flipPhase.value < 0.5 ? 1 - flipPhase.value * 2 : 0;
    return {
      opacity: flipPhase.value < 0.5 ? 1 : 0,
      transform: [{ scaleX: Math.max(0.001, s) }, { scale: popScale.value }],
    };
  });

  const faceStyle = useAnimatedStyle(() => {
    const s = flipPhase.value >= 0.5 ? (flipPhase.value - 0.5) * 2 : 0;
    return {
      opacity: flipPhase.value >= 0.5 ? 1 : 0,
      transform: [{ scaleX: Math.max(0.001, s) }, { scale: popScale.value }],
    };
  });

  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        borderRadius: 14,
        // Fixed border on every card - accent when matched, transparent
        // otherwise - so matching never shifts the card's content area.
        borderWidth: 2,
        borderColor: matched ? PALETTE.accent : 'transparent',
        overflow: 'hidden',
        backgroundColor: 'transparent',
        shadowColor: 'rgba(0,0,0,0.12)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      {/* Back face */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: CARD_BACK,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
          },
          backStyle,
        ]}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: 'rgba(255,255,255,0.08)',
            borderWidth: 1.5,
            borderColor: CARD_BACK_EDGE,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Coins size={18} color={PALETTE.accent} />
        </View>
      </Animated.View>

      {/* Face */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: matched ? PALETTE.bg : C.surface,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
          },
          faceStyle,
        ]}
      >
        <Text style={{ fontSize: 38 }}>{icon}</Text>
      </Animated.View>
    </Pressable>
  );
}

