import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  FadeIn,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { GameLayout } from '@/components/games/GameLayout';

import { CURRENCIES, getNotes } from '@/lib/currency';
import type { CurrencyCode } from '@/lib/currency';
import { useBadgesStore } from '@/lib/badges/store';
import { getGame } from '@/lib/games/registry';
import { useScoresStore } from '@/lib/games/scores';
import { usePlayedStore } from '@/lib/games/played';
import { useMoneyboxesStore } from '@/lib/stores/moneyboxes';
import { useProfileStore } from '@/lib/stores/profile';
import { useAppTheme } from '@/lib/stores/theme';

// Per-game palette from the registry — board + accents match the game's
// icon art and hub card instead of the app's green.
const PALETTE = getGame('coin-merge')!.palette;

// Coin-merge board — deep game color. The gold-to-ember tile ramp reads
// strongly against it.
const BOARD = {
  bg: PALETTE.accentDark,
  // Empty cells lifted to 10% white so the grid is clearly perceivable
  // against the deep board (was 6%, too faint).
  cellEmpty: 'rgba(255,255,255,0.10)',
};

const SIZE = 4;
type Cell = number;
type Board = Cell[][];
/** Same shape as the board - true wherever the most recent move *created* a
 *  merged tile. Used to scope the pop animation to actual merges so plain
 *  slides don't re-animate every tile on the board. */
type MergeMask = boolean[][];

function makeEmptyBoard(): Board {
  return Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => 0));
}

function emptyMask(): MergeMask {
  return Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => false));
}

function clone<T>(board: T[][]): T[][] {
  return board.map((row) => row.slice());
}

function emptyCells(board: Board): { r: number; c: number }[] {
  const out: { r: number; c: number }[] = [];
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) if (board[r][c] === 0) out.push({ r, c });
  return out;
}

/** Spawn a new tile. 90% smallest note, 10% second-smallest if the ladder has one. */
function spawn(board: Board, ladder: readonly number[]): Board {
  const cells = emptyCells(board);
  if (cells.length === 0) return board;
  const next = clone(board) as Board;
  const pick = cells[Math.floor(Math.random() * cells.length)];
  const useSecond = ladder.length > 1 && Math.random() < 0.1;
  next[pick.r][pick.c] = useSecond ? ladder[1] : ladder[0];
  return next;
}

/**
 * Slide one row left, merging adjacent equals into the next ladder tier.
 * Returns the new row, the *cumulative-merge* score gained (classic 2048
 * scoring - the *new* tile value is added to score, not the consumed pair),
 * the indices in the new row that were created by a merge, and whether
 * anything moved.
 */
function slideRowLeft(
  row: Cell[],
  ladder: readonly number[],
): { row: Cell[]; gained: number; mergedIdx: number[]; moved: boolean } {
  const ladderIndex = (v: number) => ladder.indexOf(v);
  const compact = row.filter((v) => v !== 0);
  const out: Cell[] = [];
  const mergedIdx: number[] = [];
  let gained = 0;
  let i = 0;
  while (i < compact.length) {
    const a = compact[i];
    const b = compact[i + 1];
    if (b !== undefined && a === b) {
      const idx = ladderIndex(a);
      // Past the ladder's top tier? Keep doubling so the game can continue.
      const next = idx >= 0 && idx < ladder.length - 1 ? ladder[idx + 1] : a * 2;
      mergedIdx.push(out.length);
      out.push(next);
      gained += next;
      i += 2;
    } else {
      out.push(a);
      i += 1;
    }
  }
  while (out.length < SIZE) out.push(0);
  const moved = out.some((v, idx) => v !== row[idx]);
  return { row: out, gained, mergedIdx, moved };
}

function reverseRow<T>(row: T[]): T[] {
  return row.slice().reverse();
}

function transpose<T>(board: T[][]): T[][] {
  const out: T[][] = Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => board[0][0]));
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) out[c][r] = board[r][c];
  return out;
}

interface MoveResult {
  board: Board;
  mergeMask: MergeMask;
  gained: number;
  moved: boolean;
}

function applyMove(
  board: Board,
  dir: 'left' | 'right' | 'up' | 'down',
  ladder: readonly number[],
): MoveResult {
  let working: Board = clone(board) as Board;
  let mask: MergeMask = emptyMask();

  if (dir === 'right') working = working.map(reverseRow);
  if (dir === 'up') working = transpose(working) as Board;
  if (dir === 'down') working = (transpose(working) as Board).map(reverseRow);

  let gained = 0;
  let moved = false;
  for (let r = 0; r < SIZE; r++) {
    const slid = slideRowLeft(working[r], ladder);
    working[r] = slid.row;
    gained += slid.gained;
    if (slid.moved) moved = true;
    for (const idx of slid.mergedIdx) mask[r][idx] = true;
  }

  if (dir === 'right') {
    working = working.map(reverseRow);
    mask = mask.map(reverseRow);
  }
  if (dir === 'up') {
    working = transpose(working) as Board;
    mask = transpose(mask) as MergeMask;
  }
  if (dir === 'down') {
    working = transpose(working.map(reverseRow)) as Board;
    mask = transpose(mask.map(reverseRow)) as MergeMask;
  }

  return { board: working, mergeMask: mask, gained, moved };
}

function hasMoves(board: Board, ladder: readonly number[]): boolean {
  if (emptyCells(board).length > 0) return true;
  for (const dir of ['left', 'right', 'up', 'down'] as const) {
    if (applyMove(board, dir, ladder).moved) return true;
  }
  return false;
}

function highestTile(board: Board): number {
  let max = 0;
  for (const row of board) for (const v of row) if (v > max) max = v;
  return max;
}

/**
 * Tile tiers - a coherent gold → amber → ember → deep ramp that reads as
 * "coins climbing in value", tied to the game's amber identity.
 *
 * Accessibility: every fg/bg pair clears the WCAG AA contrast bar for large
 * bold text (>= 3:1) - most exceed 4.5:1. Text color flips from dark to
 * white only once the background is genuinely dark enough to carry it, so
 * no tier has the old white-on-light-green legibility failure. Each tier
 * also has a distinct lightness step, so tiles stay distinguishable in
 * grayscale / for color-blind players - and the value number itself is the
 * primary, non-color cue.
 */
const TILE_TIERS: readonly { bg: string; fg: string; border: string }[] = [
  { bg: '#FFF1CE', fg: '#6B4E12', border: '#E9CE8E' },
  { bg: '#FBDE93', fg: '#6B4E12', border: '#E0BE63' },
  { bg: '#F6C44E', fg: '#5A3D08', border: '#D9A52F' },
  { bg: '#EFA52E', fg: '#4A2E05', border: '#CE8616' },
  { bg: '#E07F1C', fg: '#2A1A02', border: '#B8640F' },
  { bg: '#CE5A24', fg: '#FFFFFF', border: '#A8431A' },
  { bg: '#B23B30', fg: '#FFFFFF', border: '#8E2A22' },
  { bg: '#8E2D52', fg: '#FFFFFF', border: '#6E2040' },
  { bg: '#5E3A86', fg: '#FFFFFF', border: '#472B66' },
  { bg: '#2A2336', fg: '#F6C44E', border: '#171220' },
];

/** Visual style for a tile - palette tier indexed by ladder position. */
function tileStyle(
  value: number,
  ladder: readonly number[],
): { bg: string; fg: string; border: string; size: number } {
  let idx = ladder.indexOf(value);
  if (idx < 0) {
    // Past-ladder doubling - keep climbing the palette by inferring tier.
    idx = ladder.length;
    let v = value;
    while (v > ladder[ladder.length - 1] * 2 && idx < 12) {
      v = Math.floor(v / 2);
      idx++;
    }
  }
  const p = TILE_TIERS[Math.min(Math.max(0, idx), TILE_TIERS.length - 1)];
  const digits = String(value).length;
  const size = digits <= 2 ? 24 : digits <= 3 ? 20 : digits <= 4 ? 17 : 14;
  return { bg: p.bg, fg: p.fg, border: p.border, size };
}

export default function CoinMergeScreen() {
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
  const ladder = useMemo(() => getNotes(currency), [currency]);
  const symbol = CURRENCIES[currency].symbol;

  // Mark played + load scores once.
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    loadScores();
    markPlayed('coin-merge');
  }, [loadScores, markPlayed]);

  const [board, setBoard] = useState<Board>(() => spawn(spawn(makeEmptyBoard(), ladder), ladder));
  /** Score is the *cumulative merge value* - every merge adds the new tile's
   *  value (classic 2048 scoring). Tracking sum-of-board would be flat because
   *  10+10 → 20 doesn't change the total. */
  const [score, setScore] = useState(0);
  const [mergeMask, setMergeMask] = useState<MergeMask>(emptyMask());
  /** Bumps every move so children that should re-pop on every move can
   *  observe a single source of truth. */
  const [moveSeq, setMoveSeq] = useState(0);
  const [over, setOver] = useState(false);

  // ── Refs as the source of truth for the move loop ────────────────────────
  // Rapid back-to-back swipes can fire two `move` calls before React commits
  // the state update from the first. Without refs both reads see the same
  // stale `board` / `score`, and the second `setBoard` overwrites the first
  // - players lose moves silently. Refs let each move read the latest board
  // even mid-flush, and `processingRef` serializes them.
  const boardRef = useRef(board);
  const scoreRef = useRef(0);
  const overRef = useRef(false);
  const processingRef = useRef(false);
  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  const best = bestMap['coin-merge'];

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
      // Read FRESH from the store - `bestMap` from closure is still the pre-submit
      // value, so badges that depend on this run's score wouldn't unlock.
      bestScores: useScoresStore.getState().best,
      played: playedSet,
    };
  }, [cellsByMoneybox, moneyboxes, streaks, playedSet]);

  const handleGameOver = useCallback(
    async (finalScore: number) => {
      overRef.current = true;
      setOver(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      await submitScore('coin-merge', finalScore);
      await evaluateBadges(buildSnapshot());
    },
    [submitScore, evaluateBadges, buildSnapshot],
  );

  /** Pulse the floating "+N" overlay whenever a move produces merges. */
  const [lastGain, setLastGain] = useState(0);
  const [gainSeq, setGainSeq] = useState(0);

  const move = useCallback(
    (dir: 'left' | 'right' | 'up' | 'down') => {
      if (overRef.current || processingRef.current) return;
      processingRef.current = true;
      try {
        const result = applyMove(boardRef.current, dir, ladder);
        if (!result.moved) return;

        // Compute gained from the truth - mergeMask + the post-merge board
        // values. This is guaranteed to match what the player sees on screen
        // and is decoupled from slideRowLeft's running accumulator.
        let gained = 0;
        for (let r = 0; r < SIZE; r++) {
          for (let c = 0; c < SIZE; c++) {
            if (result.mergeMask[r][c]) gained += result.board[r][c];
          }
        }

        Haptics.impactAsync(
          gained > 0 ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
        );

        const next = spawn(result.board, ladder);
        boardRef.current = next;
        const updatedScore = scoreRef.current + gained;
        scoreRef.current = updatedScore;

        setBoard(next);
        setMergeMask(result.mergeMask);
        setMoveSeq((s) => s + 1);
        setScore(updatedScore);
        if (gained > 0) {
          setLastGain(gained);
          setGainSeq((s) => s + 1);
          // Persist the high-water mark progressively. Without this, players
          // who keep playing without losing - or who navigate back to the hub
          // mid-game - see "Not played yet" because the score only used to
          // submit on game over. Submit is no-op if not a new best, and badge
          // evaluation stays gated to game-over so celebration doesn't pop
          // mid-game.
          submitScore('coin-merge', updatedScore);
        }

        if (!hasMoves(next, ladder)) {
          setTimeout(() => handleGameOver(updatedScore), 250);
        }
      } finally {
        processingRef.current = false;
      }
    },
    [ladder, handleGameOver, submitScore],
  );

  const restart = useCallback(() => {
    const fresh = spawn(spawn(makeEmptyBoard(), ladder), ladder);
    boardRef.current = fresh;
    scoreRef.current = 0;
    overRef.current = false;
    processingRef.current = false;
    setBoard(fresh);
    setMergeMask(emptyMask());
    setScore(0);
    setMoveSeq(0);
    setOver(false);
    setLastGain(0);
    setGainSeq(0);
  }, [ladder]);

  // If the user changes their default currency between sessions and the ladder
  // shifts, the in-progress board has tiles from the old ladder that won't
  // merge correctly. Reset to a fresh board for the new currency.
  const ladderKey = ladder.join(',');
  const lastLadderKey = useRef(ladderKey);
  useEffect(() => {
    if (lastLadderKey.current !== ladderKey) {
      lastLadderKey.current = ladderKey;
      restart();
    }
  }, [ladderKey, restart]);

  // Pan-based swipe - far more forgiving than Fling. Picks the dominant axis
  // from the gesture's translation delta. Threshold prevents accidental taps
  // from registering as moves.
  const SWIPE_THRESHOLD = 24;
  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .activeOffsetY([-10, 10])
    .onEnd((e) => {
      'worklet';
      const ax = Math.abs(e.translationX);
      const ay = Math.abs(e.translationY);
      if (Math.max(ax, ay) < SWIPE_THRESHOLD) return;
      if (ax > ay) {
        runOnJS(move)(e.translationX > 0 ? 'right' : 'left');
      } else {
        runOnJS(move)(e.translationY > 0 ? 'down' : 'up');
      }
    });

  const boardSize = Math.min(width - 32, 380);
  const gap = 8;
  const top = highestTile(board);

  return (
    <GameLayout
      gameId="coin-merge"
      title="Coin Merge"
      scoreLabel="Score"
      score={score}
      secondary={
        best != null
          ? `Best ${best} · Top ${symbol}${top}`
          : `Top ${symbol}${top}`
      }
      onRestart={restart}
    >
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }}>
        {/* Big in-board score so the player can't miss it ticking up */}
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
            {lastGain > 0 && (
              <FloatingGain key={gainSeq} amount={lastGain} />
            )}
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
          Swipe to merge {symbol} coins · two of a kind become the next note
        </Text>

        <GestureDetector gesture={pan}>
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
            {board.map((row, r) => (
              <View
                key={r}
                style={{
                  flexDirection: 'row',
                  flex: 1,
                  gap,
                }}
              >
                {row.map((value, c) => (
                  <View
                    key={c}
                    style={{
                      flex: 1,
                      backgroundColor: BOARD.cellEmpty,
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {value !== 0 && (
                      <Tile
                        value={value}
                        ladder={ladder}
                        symbol={symbol}
                        merged={mergeMask[r]?.[c] === true}
                        moveSeq={moveSeq}
                      />
                    )}
                  </View>
                ))}
              </View>
            ))}
          </View>
        </GestureDetector>

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
            <Text style={{ fontSize: 48 }}>🪙</Text>
            <Text
              style={{
                fontFamily: 'DMSans_700Bold',
                fontSize: 22,
                color: C.textPrimary,
                marginTop: 8,
              }}
            >
              No more moves
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
              Score {score} · Top tile {symbol}
              {top}
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

interface TileProps {
  value: number;
  ladder: readonly number[];
  symbol: string;
  /** True only on the move that just *created* this tile via a merge. */
  merged: boolean;
  /** Bumps every move; used to retrigger the pop effect. */
  moveSeq: number;
}

function Tile({ value, ladder, symbol, merged, moveSeq }: TileProps) {
  const style = tileStyle(value, ladder);
  const scale = useSharedValue(1);

  // Pop only when this tile was just produced by a merge - slid-only tiles
  // stay still so the eye can follow them across the board.
  useEffect(() => {
    if (!merged) return;
    scale.value = withSequence(
      withTiming(1.18, { duration: 110, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 130, easing: Easing.inOut(Easing.quad) }),
    );
  }, [merged, moveSeq, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Coin tile ${symbol}${value}`}
      style={[
        {
          width: '100%',
          height: '100%',
          backgroundColor: style.bg,
          borderRadius: 12,
          // Minted-coin edge: a slightly darker ring gives the flat tile
          // depth and a second, lightness-based cue beyond fill color.
          borderWidth: 2,
          borderColor: style.border,
          alignItems: 'center',
          justifyContent: 'center',
        },
        animatedStyle,
      ]}
    >
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.5}
        allowFontScaling={false}
        style={{
          fontFamily: 'DMSans_700Bold',
          fontSize: style.size,
          color: style.fg,
          letterSpacing: -0.3,
          paddingHorizontal: 4,
          textAlign: 'center',
        }}
      >
        {symbol}
        {value}
      </Text>
    </Animated.View>
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

/** "+N" text that floats up and fades. Remounts on every merge via key. */
function FloatingGain({ amount }: { amount: number }) {
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
          color: PALETTE.accent,
          letterSpacing: -0.2,
        },
        style,
      ]}
    >
      +{amount}
    </Animated.Text>
  );
}
