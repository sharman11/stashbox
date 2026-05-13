import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, type AppStateStatus, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeIn, runOnJS } from 'react-native-reanimated';

import { GameLayout } from '@/components/games/GameLayout';

import { CURRENCIES, getNotes } from '@/lib/currency';
import type { CurrencyCode } from '@/lib/currency';
import { useBadgesStore } from '@/lib/badges/store';
import { useScoresStore } from '@/lib/games/scores';
import { usePlayedStore } from '@/lib/games/played';
import { useMoneyboxesStore } from '@/lib/stores/moneyboxes';
import { useProfileStore } from '@/lib/stores/profile';
import { useAppTheme } from '@/lib/stores/theme';

// Snake board palette - intentionally dark green in both modes; the snake
// itself reads against it the same way regardless of app theme.
const BOARD = {
  bg: '#0B3D2E',
  cellEmpty: 'rgba(255,255,255,0.04)',
  snakeHead: '#FBBF24',
  snakeBody: '#1DB954',
  snakeHeadDark: '#166534',
  food: '#FFFFFF',
};

const GRID = 20;
const START_TICK_MS = 200;
const MIN_TICK_MS = 80;
const SPEEDUP_PER_LENGTH = 4; // ms shaved per body segment beyond the start length

interface Point {
  x: number;
  y: number;
}

type Direction = 'up' | 'down' | 'left' | 'right';

const DIR_VECTORS: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITE: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

function randomFood(snake: Point[]): Point {
  const taken = new Set(snake.map((p) => `${p.x},${p.y}`));
  // Bounded - board is 20×20 = 400 cells; snake max length is 400, so as long
  // as there's at least one empty cell we'll find it within the loop.
  for (let attempt = 0; attempt < 1000; attempt++) {
    const p = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
    if (!taken.has(`${p.x},${p.y}`)) return p;
  }
  // Defensive fallback - scan the grid linearly for the first empty cell.
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      if (!taken.has(`${x},${y}`)) return { x, y };
    }
  }
  return { x: 0, y: 0 };
}

function pickFoodValue(notes: readonly number[]): number {
  // Skew toward smaller notes (food appears more often in 10/20 territory than 500).
  const weighted: number[] = [];
  notes.forEach((n, i) => {
    const weight = Math.max(1, notes.length - i);
    for (let k = 0; k < weight; k++) weighted.push(n);
  });
  return weighted[Math.floor(Math.random() * weighted.length)];
}

function makeInitialSnake(): Point[] {
  const mid = Math.floor(GRID / 2);
  return [
    { x: mid, y: mid },
    { x: mid - 1, y: mid },
    { x: mid - 2, y: mid },
  ];
}

export default function SnakeScreen() {
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
    markPlayed('snake');
  }, [loadScores, markPlayed]);

  const [snake, setSnake] = useState<Point[]>(makeInitialSnake);
  const [direction, setDirection] = useState<Direction>('right');
  const [food, setFood] = useState<Point>(() => randomFood(makeInitialSnake()));
  const [foodValue, setFoodValue] = useState<number>(() => pickFoodValue(notes));
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);
  // Pause when the OS backgrounds the app. Without this the tick chain keeps
  // firing while the user is in another app and they come back to "GAME OVER".
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s: AppStateStatus) => {
      // 'inactive' fires on iOS during multi-task switcher; 'background' is
      // the canonical "user left". Treat both as paused so we don't keep
      // running the loop while the OS has hidden the app.
      setPaused(s !== 'active');
    });
    return () => sub.remove();
  }, []);

  // ── Refs as the source of truth for the tick loop ───────────────────────
  // The tick reads these every frame so a single self-paced setTimeout chain
  // can run without resetting whenever a state setter fires (which would
  // otherwise happen 3× on every food-eat and ruin the speed).
  const snakeRef = useRef(snake);
  const foodRef = useRef(food);
  const foodValueRef = useRef(foodValue);
  const scoreRef = useRef(0);
  const overRef = useRef(false);
  const dirRef = useRef<Direction>('right');
  const queuedRef = useRef<Direction | null>(null);
  const notesRef = useRef(notes);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  const buildSnapshot = useCallback(() => {
    const totalCellsFilled = Object.values(cellsByMoneybox).flat().filter((c) => c.isFilled).length;
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
      // Read fresh from store so this run's just-submitted best is included.
      bestScores: useScoresStore.getState().best,
      played: playedSet,
    };
  }, [cellsByMoneybox, moneyboxes, streaks, playedSet]);

  const queueDirection = useCallback((d: Direction) => {
    if (overRef.current) return;
    if (d === dirRef.current || d === OPPOSITE[dirRef.current]) return;
    queuedRef.current = d;
  }, []);

  const endGame = useCallback(
    async (finalScore: number) => {
      if (overRef.current) return;
      overRef.current = true;
      setOver(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      await submitScore('snake', finalScore);
      await evaluateBadges(buildSnapshot());
    },
    [submitScore, evaluateBadges, buildSnapshot],
  );

  const restart = useCallback(() => {
    const init = makeInitialSnake();
    snakeRef.current = init;
    foodRef.current = randomFood(init);
    foodValueRef.current = pickFoodValue(notesRef.current);
    scoreRef.current = 0;
    overRef.current = false;
    dirRef.current = 'right';
    queuedRef.current = null;
    setSnake(init);
    setFood(foodRef.current);
    setFoodValue(foodValueRef.current);
    setScore(0);
    setDirection('right');
    setOver(false);
  }, []);

  // Single self-paced tick chain. Reads everything from refs so it never
  // restarts mid-game - speed stays smooth and predictable.
  useEffect(() => {
    if (paused || over) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = () => {
      if (cancelled || overRef.current) return;

      // Apply queued direction once per tick.
      if (queuedRef.current) {
        dirRef.current = queuedRef.current;
        queuedRef.current = null;
        setDirection(dirRef.current);
      }

      const snake = snakeRef.current;
      const head = snake[0];
      const v = DIR_VECTORS[dirRef.current];
      const nextHead: Point = { x: head.x + v.x, y: head.y + v.y };

      // Wall collision
      if (nextHead.x < 0 || nextHead.x >= GRID || nextHead.y < 0 || nextHead.y >= GRID) {
        endGame(scoreRef.current);
        return;
      }
      // Self collision (allow tail tip to move out of the way unless eating)
      const eating = nextHead.x === foodRef.current.x && nextHead.y === foodRef.current.y;
      const body = eating ? snake : snake.slice(0, -1);
      if (body.some((p) => p.x === nextHead.x && p.y === nextHead.y)) {
        endGame(scoreRef.current);
        return;
      }

      const nextSnake = [nextHead, ...body];
      snakeRef.current = nextSnake;
      setSnake(nextSnake);

      if (eating) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        scoreRef.current = scoreRef.current + foodValueRef.current;
        setScore(scoreRef.current);
        const newFood = randomFood(nextSnake);
        const newValue = pickFoodValue(notesRef.current);
        foodRef.current = newFood;
        foodValueRef.current = newValue;
        setFood(newFood);
        setFoodValue(newValue);
        // Persist the high-water mark on every eat so the hub shows progress
        // even if the player quits without dying. submit is no-op if not a
        // new best; badge evaluation still happens on game-over only.
        submitScore('snake', scoreRef.current);
      }

      const tickMs = Math.max(
        MIN_TICK_MS,
        START_TICK_MS - (snakeRef.current.length - 3) * SPEEDUP_PER_LENGTH,
      );
      timer = setTimeout(tick, tickMs);
    };

    timer = setTimeout(tick, START_TICK_MS);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // Restart on game end → game start → effect re-runs by depending on `over`.
    // `paused` is in deps so backgrounding the app cancels the tick chain
    // (cleanup runs) and resuming re-arms it.
  }, [over, paused, endGame, submitScore]);

  // Pan-based swipe - far more forgiving than Fling. Worklet wraps the JS
  // call in runOnJS; without that, RNGH 2.x + Reanimated 4 will crash on mount.
  const SWIPE_THRESHOLD = 18;
  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .activeOffsetY([-10, 10])
    .onEnd((e) => {
      'worklet';
      const ax = Math.abs(e.translationX);
      const ay = Math.abs(e.translationY);
      if (Math.max(ax, ay) < SWIPE_THRESHOLD) return;
      if (ax > ay) {
        runOnJS(queueDirection)(e.translationX > 0 ? 'right' : 'left');
      } else {
        runOnJS(queueDirection)(e.translationY > 0 ? 'down' : 'up');
      }
    });

  const boardSize = Math.min(width - 32, 380);
  const cell = boardSize / GRID;
  const best = bestMap['snake'];

  const headSet = new Set([`${snake[0].x},${snake[0].y}`]);
  const bodySet = new Set(snake.slice(1).map((p) => `${p.x},${p.y}`));
  const foodKey = `${food.x},${food.y}`;

  return (
    <GameLayout
      title="Snake"
      scoreLabel="Score"
      score={score}
      secondary={best != null ? `Best ${best}` : `Length ${snake.length}`}
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
          Swipe to turn · eat {symbol} coins · gets faster as you grow
        </Text>

        <GestureDetector gesture={pan}>
          <View
            style={{
              width: boardSize,
              height: boardSize,
              backgroundColor: BOARD.bg,
              borderRadius: 16,
              padding: 4,
              overflow: 'hidden',
            }}
          >
            {Array.from({ length: GRID }).map((_, y) => (
              <View key={y} style={{ flexDirection: 'row', height: cell }}>
                {Array.from({ length: GRID }).map((__, x) => {
                  const key = `${x},${y}`;
                  const isHead = headSet.has(key);
                  const isBody = bodySet.has(key);
                  const isFood = foodKey === key;
                  return (
                    <View
                      key={x}
                      style={{
                        width: cell,
                        height: cell,
                        padding: 1,
                      }}
                    >
                      <View
                        style={{
                          flex: 1,
                          backgroundColor: isHead
                            ? BOARD.snakeHead
                            : isBody
                              ? BOARD.snakeBody
                              : isFood
                                ? BOARD.food
                                : BOARD.cellEmpty,
                          borderRadius: isFood ? cell / 2 : 3,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {isFood && (
                          <Text
                            style={{
                              fontSize: cell * 0.55,
                              fontFamily: 'DMSans_700Bold',
                              color: BOARD.snakeHeadDark,
                            }}
                          >
                            {symbol}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </GestureDetector>

        <Text
          style={{
            marginTop: 12,
            fontFamily: 'DMSans_500Medium',
            fontSize: 12,
            color: C.textSecondary,
          }}
        >
          Direction · {direction.toUpperCase()}
        </Text>

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
              transform: [{ translateY: -90 }],
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
            <Text style={{ fontSize: 48 }}>🐍</Text>
            <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 22, color: C.textPrimary, marginTop: 8 }}>
              Game over
            </Text>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: C.textSecondary, marginTop: 4 }}>
              Final score · {score}
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
