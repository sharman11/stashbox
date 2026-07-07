import type { ImageSourcePropType } from 'react-native';

import { GAMES, getGame } from './games/registry';
import type { GameId } from './games/registry';

export type AvatarCategory =
  | 'adventurer'
  | 'face'
  | 'expression'
  | 'folks'
  | 'people'
  | 'openpeeps'
  | 'toons'
  | 'thumb'
  | 'robot'
  | 'og';

/**
 * All the ways an avatar can be locked. Add new types here and extend
 * `isAvatarUnlocked` + `describeRequirement` in lockstep.
 */
export type UnlockRequirement =
  | { type: 'progress'; value: number }              // highest fill % across any box (0..1)
  | { type: 'completed'; value: number }             // total completed boxes
  | { type: 'streak'; value: number }                // best streak in days
  | { type: 'cells-filled'; value: number }          // total cells filled across all boxes
  | { type: 'box-count'; value: number }             // total moneyboxes ever created
  | { type: 'game-played'; gameId: GameId }
  | { type: 'all-games-played' }
  | { type: 'game-score'; gameId: GameId; value: number }
  | { type: 'ad-watch' };                            // user must watch a rewarded ad

export interface AvatarConfig {
  id: string;
  kind: 'emoji' | 'image';
  emoji?: string;
  image?: ImageSourcePropType;
  bg: string;
  category: AvatarCategory;
  /** Undefined = always unlocked. */
  requirement?: UnlockRequirement;
}

/** Snapshot of every stat the unlock evaluator needs. */
export interface AvatarStats {
  /** 0..1 - highest fill percentage on any single moneybox. */
  highestProgress: number;
  /** Number of moneyboxes the user has fully completed. */
  completedBoxes: number;
  /** Best streak (days) across all moneyboxes. */
  bestStreak: number;
  /** Total cells filled across every moneybox. */
  cellsFilled: number;
  /** Total moneyboxes ever created (active + completed + abandoned). */
  boxCount: number;
  /** Game ids the user has played at least once. */
  played: ReadonlySet<string>;
  /** Best score per game id. Null entries (game not yet played) are
   *  ignored by the evaluator. */
  scores: Readonly<Record<string, number | null>>;
  /** Avatar ids the user has unlocked via rewarded ad. */
  watchedAds: ReadonlySet<string>;
}

export const CATEGORY_ORDER: AvatarCategory[] = [
  'adventurer',
  'face',
  'expression',
  'folks',
  'people',
  'openpeeps',
  'toons',
  'thumb',
  'robot',
  'og',
];

export const CATEGORY_LABEL: Record<AvatarCategory, string> = {
  adventurer: 'Adventurer',
  face: 'Face',
  expression: 'Expression',
  folks: 'Folks',
  people: 'People',
  openpeeps: 'Open Peeps',
  toons: 'Toons',
  thumb: 'Thumb',
  robot: 'Robot',
  og: 'OG',
};

// Pastel cycle reused for image-avatar tiles.
const PASTEL_CYCLE = [
  '#FECDD3', '#FED7AA', '#BBF7D0', '#E9D5FF',
  '#FDE68A', '#FDBA74', '#E5E7EB', '#FBCFE8',
  '#A5F3FC', '#C4B5FD', '#FECACA', '#A7F3D0',
];
const pastel = (i: number): string => PASTEL_CYCLE[i % PASTEL_CYCLE.length];

// ── Per-category requirement assignment ──────────────────────────────

/**
 * Adventurer = first-time milestones along the user's saving journey.
 * Mix of cell counts, progress, completion, streak and game-played - the
 * common thread is "the first time you do X".
 */
const ADVENTURER_REQS: UnlockRequirement[] = [
  { type: 'cells-filled', value: 1 },
  { type: 'cells-filled', value: 5 },
  { type: 'cells-filled', value: 10 },
  { type: 'cells-filled', value: 25 },
  { type: 'box-count', value: 1 },
  { type: 'progress', value: 0.10 },
  { type: 'progress', value: 0.25 },
  { type: 'progress', value: 0.50 },
  { type: 'completed', value: 1 },
  { type: 'game-played', gameId: 'coin-merge' },
  { type: 'streak', value: 3 },
  { type: 'streak', value: 7 },
];

/** Folks = 5% progress steps from 5% all the way to 100%. */
const FOLKS_REQS: UnlockRequirement[] = Array.from({ length: 20 }, (_, i) => ({
  type: 'progress',
  value: (i + 1) * 0.05,
}));

/** People = total completed boxes 1..20. */
const PEOPLE_REQS: UnlockRequirement[] = Array.from({ length: 20 }, (_, i) => ({
  type: 'completed',
  value: i + 1,
}));

/** OpenPeeps = streak rewards on a curve (gets harder as you climb). */
const STREAK_LADDER = [1, 2, 3, 5, 7, 10, 14, 21, 30, 50, 75, 100];
const OPENPEEPS_REQS: UnlockRequirement[] = STREAK_LADDER.map((days) => ({
  type: 'streak',
  value: days,
}));

/**
 * Thumb = mini-game high-score milestones, 5 per game × 4 games = 20.
 * For low-score games (memory-match) the comparator flips - see
 * `isAvatarUnlocked`.
 */
const THUMB_REQS: UnlockRequirement[] = [
  { type: 'game-score', gameId: 'coin-merge', value: 100 },
  { type: 'game-score', gameId: 'coin-merge', value: 500 },
  { type: 'game-score', gameId: 'coin-merge', value: 1000 },
  { type: 'game-score', gameId: 'coin-merge', value: 2500 },
  { type: 'game-score', gameId: 'coin-merge', value: 5000 },
  { type: 'game-score', gameId: 'snake', value: 5 },
  { type: 'game-score', gameId: 'snake', value: 15 },
  { type: 'game-score', gameId: 'snake', value: 30 },
  { type: 'game-score', gameId: 'snake', value: 60 },
  { type: 'game-score', gameId: 'snake', value: 100 },
  { type: 'game-score', gameId: 'memory-match', value: 30 }, // ≤ 30 moves
  { type: 'game-score', gameId: 'memory-match', value: 22 },
  { type: 'game-score', gameId: 'memory-match', value: 18 },
  { type: 'game-score', gameId: 'memory-match', value: 14 },
  { type: 'game-score', gameId: 'memory-match', value: 10 },
  { type: 'game-score', gameId: 'whack-a-coin', value: 50 },
  { type: 'game-score', gameId: 'whack-a-coin', value: 150 },
  { type: 'game-score', gameId: 'whack-a-coin', value: 300 },
  { type: 'game-score', gameId: 'whack-a-coin', value: 500 },
  { type: 'game-score', gameId: 'whack-a-coin', value: 800 },
];

/**
 * Robot = special tier. First 5 are game-played markers, the rest are
 * "hardcore" thresholds beyond what People / OpenPeeps cover.
 */
const ROBOT_REQS: UnlockRequirement[] = [
  { type: 'game-played', gameId: 'coin-merge' },
  { type: 'game-played', gameId: 'snake' },
  { type: 'game-played', gameId: 'memory-match' },
  { type: 'game-played', gameId: 'whack-a-coin' },
  { type: 'all-games-played' },
  { type: 'cells-filled', value: 100 },
  { type: 'cells-filled', value: 250 },
  { type: 'cells-filled', value: 500 },
  { type: 'cells-filled', value: 1000 },
  { type: 'cells-filled', value: 2000 },
  { type: 'streak', value: 150 },
  { type: 'streak', value: 200 },
  { type: 'streak', value: 250 },
  { type: 'streak', value: 300 },
  { type: 'streak', value: 365 },
  { type: 'completed', value: 25 },
  { type: 'completed', value: 30 },
  { type: 'completed', value: 50 },
  { type: 'completed', value: 75 },
  { type: 'completed', value: 100 },
];

/** Face / Expression / Toons all use individual ad-watch unlocks. */
const AD_WATCH_REQ: UnlockRequirement = { type: 'ad-watch' };

// ── Catalog construction ─────────────────────────────────────────────

const ADVENTURERS: AvatarConfig[] = [
  { id: 'adv-1', kind: 'image', image: require('../assets/Avatars/adventurer/Frame.png'), bg: pastel(0), category: 'adventurer', requirement: ADVENTURER_REQS[0] },
  { id: 'adv-2', kind: 'image', image: require('../assets/Avatars/adventurer/Frame-1.png'), bg: pastel(1), category: 'adventurer', requirement: ADVENTURER_REQS[1] },
  { id: 'adv-3', kind: 'image', image: require('../assets/Avatars/adventurer/Frame-2.png'), bg: pastel(2), category: 'adventurer', requirement: ADVENTURER_REQS[2] },
  { id: 'adv-4', kind: 'image', image: require('../assets/Avatars/adventurer/Frame-3.png'), bg: pastel(3), category: 'adventurer', requirement: ADVENTURER_REQS[3] },
  { id: 'adv-5', kind: 'image', image: require('../assets/Avatars/adventurer/Frame-4.png'), bg: pastel(4), category: 'adventurer', requirement: ADVENTURER_REQS[4] },
  { id: 'adv-6', kind: 'image', image: require('../assets/Avatars/adventurer/Frame-5.png'), bg: pastel(5), category: 'adventurer', requirement: ADVENTURER_REQS[5] },
  { id: 'adv-7', kind: 'image', image: require('../assets/Avatars/adventurer/Frame-6.png'), bg: pastel(6), category: 'adventurer', requirement: ADVENTURER_REQS[6] },
  { id: 'adv-8', kind: 'image', image: require('../assets/Avatars/adventurer/Frame-7.png'), bg: pastel(7), category: 'adventurer', requirement: ADVENTURER_REQS[7] },
  { id: 'adv-9', kind: 'image', image: require('../assets/Avatars/adventurer/Frame-8.png'), bg: pastel(8), category: 'adventurer', requirement: ADVENTURER_REQS[8] },
  { id: 'adv-10', kind: 'image', image: require('../assets/Avatars/adventurer/Frame-9.png'), bg: pastel(9), category: 'adventurer', requirement: ADVENTURER_REQS[9] },
  { id: 'adv-11', kind: 'image', image: require('../assets/Avatars/adventurer/Frame-10.png'), bg: pastel(10), category: 'adventurer', requirement: ADVENTURER_REQS[10] },
  { id: 'adv-12', kind: 'image', image: require('../assets/Avatars/adventurer/Frame-11.png'), bg: pastel(11), category: 'adventurer', requirement: ADVENTURER_REQS[11] },
];

const FACES: AvatarConfig[] = Array.from({ length: 18 }, (_, i) => ({
  id: `face-${i + 1}`,
  kind: 'image',
  image: i === 0
    ? require('../assets/Avatars/face/Frame.png')
    : ([
      require('../assets/Avatars/face/Frame-1.png'),
      require('../assets/Avatars/face/Frame-2.png'),
      require('../assets/Avatars/face/Frame-3.png'),
      require('../assets/Avatars/face/Frame-4.png'),
      require('../assets/Avatars/face/Frame-5.png'),
      require('../assets/Avatars/face/Frame-6.png'),
      require('../assets/Avatars/face/Frame-7.png'),
      require('../assets/Avatars/face/Frame-8.png'),
      require('../assets/Avatars/face/Frame-9.png'),
      require('../assets/Avatars/face/Frame-10.png'),
      require('../assets/Avatars/face/Frame-11.png'),
      require('../assets/Avatars/face/Frame-12.png'),
      require('../assets/Avatars/face/Frame-13.png'),
      require('../assets/Avatars/face/Frame-14.png'),
      require('../assets/Avatars/face/Frame-15.png'),
      require('../assets/Avatars/face/Frame-16.png'),
      require('../assets/Avatars/face/Frame-17.png'),
    ][i - 1]),
  bg: pastel(i),
  category: 'face',
  requirement: AD_WATCH_REQ,
}));

const EXPRESSIONS: AvatarConfig[] = Array.from({ length: 16 }, (_, i) => ({
  id: `expr-${i + 1}`,
  kind: 'image',
  image: i === 0
    ? require('../assets/Avatars/expression/Frame.png')
    : ([
      require('../assets/Avatars/expression/Frame-1.png'),
      require('../assets/Avatars/expression/Frame-2.png'),
      require('../assets/Avatars/expression/Frame-3.png'),
      require('../assets/Avatars/expression/Frame-4.png'),
      require('../assets/Avatars/expression/Frame-5.png'),
      require('../assets/Avatars/expression/Frame-6.png'),
      require('../assets/Avatars/expression/Frame-7.png'),
      require('../assets/Avatars/expression/Frame-8.png'),
      require('../assets/Avatars/expression/Frame-9.png'),
      require('../assets/Avatars/expression/Frame-10.png'),
      require('../assets/Avatars/expression/Frame-11.png'),
      require('../assets/Avatars/expression/Frame-12.png'),
      require('../assets/Avatars/expression/Frame-13.png'),
      require('../assets/Avatars/expression/Frame-14.png'),
      require('../assets/Avatars/expression/Frame-15.png'),
    ][i - 1]),
  bg: pastel(i),
  category: 'expression',
  requirement: AD_WATCH_REQ,
}));

const FOLKS: AvatarConfig[] = Array.from({ length: 20 }, (_, i) => ({
  id: `folks-${i + 1}`,
  kind: 'image',
  image: i === 0
    ? require('../assets/Avatars/folks/Frame.png')
    : ([
      require('../assets/Avatars/folks/Frame-1.png'),
      require('../assets/Avatars/folks/Frame-2.png'),
      require('../assets/Avatars/folks/Frame-3.png'),
      require('../assets/Avatars/folks/Frame-4.png'),
      require('../assets/Avatars/folks/Frame-5.png'),
      require('../assets/Avatars/folks/Frame-6.png'),
      require('../assets/Avatars/folks/Frame-7.png'),
      require('../assets/Avatars/folks/Frame-8.png'),
      require('../assets/Avatars/folks/Frame-9.png'),
      require('../assets/Avatars/folks/Frame-10.png'),
      require('../assets/Avatars/folks/Frame-11.png'),
      require('../assets/Avatars/folks/Frame-12.png'),
      require('../assets/Avatars/folks/Frame-13.png'),
      require('../assets/Avatars/folks/Frame-14.png'),
      require('../assets/Avatars/folks/Frame-15.png'),
      require('../assets/Avatars/folks/Frame-16.png'),
      require('../assets/Avatars/folks/Frame-17.png'),
      require('../assets/Avatars/folks/Frame-18.png'),
      require('../assets/Avatars/folks/Frame-19.png'),
    ][i - 1]),
  bg: pastel(i),
  category: 'folks',
  requirement: FOLKS_REQS[i],
}));

const PEOPLE: AvatarConfig[] = Array.from({ length: 20 }, (_, i) => ({
  id: `people-${i + 1}`,
  kind: 'image',
  image: i === 0
    ? require('../assets/Avatars/people/Frame.png')
    : ([
      require('../assets/Avatars/people/Frame-1.png'),
      require('../assets/Avatars/people/Frame-2.png'),
      require('../assets/Avatars/people/Frame-3.png'),
      require('../assets/Avatars/people/Frame-4.png'),
      require('../assets/Avatars/people/Frame-5.png'),
      require('../assets/Avatars/people/Frame-6.png'),
      require('../assets/Avatars/people/Frame-7.png'),
      require('../assets/Avatars/people/Frame-8.png'),
      require('../assets/Avatars/people/Frame-9.png'),
      require('../assets/Avatars/people/Frame-10.png'),
      require('../assets/Avatars/people/Frame-11.png'),
      require('../assets/Avatars/people/Frame-12.png'),
      require('../assets/Avatars/people/Frame-13.png'),
      require('../assets/Avatars/people/Frame-14.png'),
      require('../assets/Avatars/people/Frame-15.png'),
      require('../assets/Avatars/people/Frame-16.png'),
      require('../assets/Avatars/people/Frame-17.png'),
      require('../assets/Avatars/people/Frame-18.png'),
      require('../assets/Avatars/people/Frame-19.png'),
    ][i - 1]),
  bg: pastel(i),
  category: 'people',
  requirement: PEOPLE_REQS[i],
}));

const OPENPEEPS: AvatarConfig[] = Array.from({ length: 12 }, (_, i) => ({
  id: `peeps-${i + 1}`,
  kind: 'image',
  image: i === 0
    ? require('../assets/Avatars/openpeeps/Frame.png')
    : ([
      require('../assets/Avatars/openpeeps/Frame-1.png'),
      require('../assets/Avatars/openpeeps/Frame-2.png'),
      require('../assets/Avatars/openpeeps/Frame-3.png'),
      require('../assets/Avatars/openpeeps/Frame-4.png'),
      require('../assets/Avatars/openpeeps/Frame-5.png'),
      require('../assets/Avatars/openpeeps/Frame-6.png'),
      require('../assets/Avatars/openpeeps/Frame-7.png'),
      require('../assets/Avatars/openpeeps/Frame-8.png'),
      require('../assets/Avatars/openpeeps/Frame-9.png'),
      require('../assets/Avatars/openpeeps/Frame-10.png'),
      require('../assets/Avatars/openpeeps/Frame-11.png'),
    ][i - 1]),
  bg: pastel(i),
  category: 'openpeeps',
  requirement: OPENPEEPS_REQS[i],
}));

const TOONS: AvatarConfig[] = Array.from({ length: 15 }, (_, i) => ({
  id: `toons-${i + 1}`,
  kind: 'image',
  image: i === 0
    ? require('../assets/Avatars/toons/Frame.png')
    : ([
      require('../assets/Avatars/toons/Frame-1.png'),
      require('../assets/Avatars/toons/Frame-2.png'),
      require('../assets/Avatars/toons/Frame-3.png'),
      require('../assets/Avatars/toons/Frame-4.png'),
      require('../assets/Avatars/toons/Frame-5.png'),
      require('../assets/Avatars/toons/Frame-6.png'),
      require('../assets/Avatars/toons/Frame-7.png'),
      require('../assets/Avatars/toons/Frame-8.png'),
      require('../assets/Avatars/toons/Frame-9.png'),
      require('../assets/Avatars/toons/Frame-10.png'),
      require('../assets/Avatars/toons/Frame-11.png'),
      require('../assets/Avatars/toons/Frame-12.png'),
      require('../assets/Avatars/toons/Frame-13.png'),
      require('../assets/Avatars/toons/Frame-14.png'),
    ][i - 1]),
  bg: pastel(i),
  category: 'toons',
  requirement: AD_WATCH_REQ,
}));

const THUMBS: AvatarConfig[] = Array.from({ length: 20 }, (_, i) => ({
  id: `thumb-${i + 1}`,
  kind: 'image',
  image: i === 0
    ? require('../assets/Avatars/thumb/Frame.png')
    : ([
      require('../assets/Avatars/thumb/Frame-1.png'),
      require('../assets/Avatars/thumb/Frame-2.png'),
      require('../assets/Avatars/thumb/Frame-3.png'),
      require('../assets/Avatars/thumb/Frame-4.png'),
      require('../assets/Avatars/thumb/Frame-5.png'),
      require('../assets/Avatars/thumb/Frame-6.png'),
      require('../assets/Avatars/thumb/Frame-7.png'),
      require('../assets/Avatars/thumb/Frame-8.png'),
      require('../assets/Avatars/thumb/Frame-9.png'),
      require('../assets/Avatars/thumb/Frame-10.png'),
      require('../assets/Avatars/thumb/Frame-11.png'),
      require('../assets/Avatars/thumb/Frame-12.png'),
      require('../assets/Avatars/thumb/Frame-13.png'),
      require('../assets/Avatars/thumb/Frame-14.png'),
      require('../assets/Avatars/thumb/Frame-15.png'),
      require('../assets/Avatars/thumb/Frame-16.png'),
      require('../assets/Avatars/thumb/Frame-17.png'),
      require('../assets/Avatars/thumb/Frame-18.png'),
      require('../assets/Avatars/thumb/Frame-19.png'),
    ][i - 1]),
  bg: pastel(i),
  category: 'thumb',
  requirement: THUMB_REQS[i],
}));

const ROBOTS: AvatarConfig[] = Array.from({ length: 20 }, (_, i) => ({
  id: `robot-${i + 1}`,
  kind: 'image',
  image: i === 0
    ? require('../assets/Avatars/robot/Frame.png')
    : ([
      require('../assets/Avatars/robot/Frame-1.png'),
      require('../assets/Avatars/robot/Frame-2.png'),
      require('../assets/Avatars/robot/Frame-3.png'),
      require('../assets/Avatars/robot/Frame-4.png'),
      require('../assets/Avatars/robot/Frame-5.png'),
      require('../assets/Avatars/robot/Frame-6.png'),
      require('../assets/Avatars/robot/Frame-7.png'),
      require('../assets/Avatars/robot/Frame-8.png'),
      require('../assets/Avatars/robot/Frame-9.png'),
      require('../assets/Avatars/robot/Frame-10.png'),
      require('../assets/Avatars/robot/Frame-11.png'),
      require('../assets/Avatars/robot/Frame-12.png'),
      require('../assets/Avatars/robot/Frame-13.png'),
      require('../assets/Avatars/robot/Frame-14.png'),
      require('../assets/Avatars/robot/Frame-15.png'),
      require('../assets/Avatars/robot/Frame-16.png'),
      require('../assets/Avatars/robot/Frame-17.png'),
      require('../assets/Avatars/robot/Frame-18.png'),
      require('../assets/Avatars/robot/Frame-19.png'),
    ][i - 1]),
  bg: pastel(i),
  category: 'robot',
  requirement: ROBOT_REQS[i],
}));

/** OG = the original emoji avatars, free for everyone.
 *  Order matters: this is the signup grid. The fox leads (friendly,
 *  mascot-adjacent) — deliberately NOT the pig, which several of our
 *  markets would read poorly as a default identity. */
const OG: AvatarConfig[] = [
  { id: '🦊', kind: 'emoji', emoji: '🦊', bg: '#FED7AA', category: 'og' },
  { id: '🐱', kind: 'emoji', emoji: '🐱', bg: '#E9D5FF', category: 'og' },
  { id: '🐶', kind: 'emoji', emoji: '🐶', bg: '#FDE68A', category: 'og' },
  { id: '🐸', kind: 'emoji', emoji: '🐸', bg: '#BBF7D0', category: 'og' },
  { id: '🦁', kind: 'emoji', emoji: '🦁', bg: '#FDBA74', category: 'og' },
  { id: '🐼', kind: 'emoji', emoji: '🐼', bg: '#E5E7EB', category: 'og' },
  { id: '🦄', kind: 'emoji', emoji: '🦄', bg: '#FBCFE8', category: 'og' },
  { id: '🐲', kind: 'emoji', emoji: '🐲', bg: '#A5F3FC', category: 'og' },
  { id: '🐷', kind: 'emoji', emoji: '🐷', bg: '#FECDD3', category: 'og' },
  { id: '🤖', kind: 'emoji', emoji: '🤖', bg: '#BBF7D0', category: 'og' },
];

export const AVATARS: AvatarConfig[] = [
  ...ADVENTURERS,
  ...FACES,
  ...EXPRESSIONS,
  ...FOLKS,
  ...PEOPLE,
  ...OPENPEEPS,
  ...TOONS,
  ...THUMBS,
  ...ROBOTS,
  ...OG,
];

const BY_ID = new Map(AVATARS.map((a) => [a.id, a]));

export function getAvatarById(id: string): AvatarConfig | undefined {
  return BY_ID.get(id);
}

// ── Unlock evaluation ────────────────────────────────────────────────

export function isAvatarUnlocked(avatar: AvatarConfig, stats: AvatarStats): boolean {
  const req = avatar.requirement;
  if (!req) return true;
  switch (req.type) {
    case 'progress': return stats.highestProgress >= req.value;
    case 'completed': return stats.completedBoxes >= req.value;
    case 'streak': return stats.bestStreak >= req.value;
    case 'cells-filled': return stats.cellsFilled >= req.value;
    case 'box-count': return stats.boxCount >= req.value;
    case 'game-played': return stats.played.has(req.gameId);
    case 'all-games-played': return GAMES.every((g) => stats.played.has(g.id));
    case 'game-score': {
      const game = getGame(req.gameId);
      const score = stats.scores[req.gameId];
      if (score == null) return false;
      // Memory-match style: lower is better.
      if (game?.scoreType === 'low') return score <= req.value;
      return score >= req.value;
    }
    case 'ad-watch': return stats.watchedAds.has(avatar.id);
  }
}

// ── Display labels ───────────────────────────────────────────────────

const GAME_SHORT: Record<GameId, string> = {
  'coin-merge': 'Merge',
  'snake': 'Snake',
  'memory-match': 'Memory',
  'whack-a-coin': 'Whack',
};

/** Short label shown under a locked (or just-unlocked) avatar. */
export function describeRequirement(req: UnlockRequirement): string {
  switch (req.type) {
    case 'progress':
      return `Save ${Math.round(req.value * 100)}%`;
    case 'completed':
      return req.value === 1 ? 'Finish 1 box' : `Finish ${req.value}`;
    case 'streak':
      return req.value === 1 ? '1-day streak' : `${req.value}-day streak`;
    case 'cells-filled':
      return req.value === 1 ? 'First save' : `${req.value} saves`;
    case 'box-count':
      return req.value === 1 ? 'Create a box' : `${req.value} boxes`;
    case 'game-played':
      return `Play ${GAME_SHORT[req.gameId]}`;
    case 'all-games-played':
      return 'Play all games';
    case 'game-score': {
      const game = getGame(req.gameId);
      const op = game?.scoreType === 'low' ? '≤' : '';
      return `${GAME_SHORT[req.gameId]} ${op}${req.value}`;
    }
    case 'ad-watch':
      return 'Watch ad';
  }
}

/** Group avatars by category in the canonical display order. */
export function groupAvatarsByCategory(): { category: AvatarCategory; items: AvatarConfig[] }[] {
  const groups = new Map<AvatarCategory, AvatarConfig[]>();
  for (const a of AVATARS) {
    const list = groups.get(a.category) ?? [];
    list.push(a);
    groups.set(a.category, list);
  }
  return CATEGORY_ORDER
    .filter((cat) => groups.has(cat))
    .map((category) => ({ category, items: groups.get(category)! }));
}

export const DEFAULT_AVATAR: AvatarConfig = AVATARS.find((a) => a.id === '🦊') ?? AVATARS[0];
