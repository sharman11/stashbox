/**
 * Single source of truth for the Game Hub. Every mini-game registers here.
 *
 * Adding a 5th game later:
 *   1. Create app/games/<id>.tsx
 *   2. Drop an icon PNG in assets/ and add a require() in `image` below
 *   3. Append a new entry to GAMES with the matching route
 *   4. (Optional) add badges in lib/badges/catalog.ts
 *
 * No other file needs to change. The hub renders this list dynamically and the
 * profile screen reads best scores per id.
 */

import type { ImageSourcePropType } from 'react-native';

const COIN_MERGE_IMG: ImageSourcePropType = require('@/assets/coin-merge.png');
const SNAKE_IMG: ImageSourcePropType = require('@/assets/Snake.png');
const MEMORY_IMG: ImageSourcePropType = require('@/assets/memory-match.png');
const WHACK_IMG: ImageSourcePropType = require('@/assets/Whack.png');

export type GameId = 'coin-merge' | 'snake' | 'memory-match' | 'whack-a-coin';

/** What "best score" means for ranking - direction the user is trying to move. */
export type ScoreType = 'high' | 'low';

/** Per-game visual identity, used by every surface that lists the game. */
export interface GamePalette {
  /** Soft tinted background for cards / tiles. */
  bg: string;
  /** Hairline border + tint at low alpha. */
  ring: string;
  /** Bright accent for chips, score star, play button. */
  accent: string;
  /** Deep accent for titles on light backgrounds. */
  accentDark: string;
}

export interface GameMeta {
  id: GameId;
  name: string;
  /** Emoji fallback for places we don't want to render the bitmap logo. */
  icon: string;
  /** Custom PNG logo. Render with `<Image source={game.image} />`. */
  image: ImageSourcePropType;
  /** Static expo-router path. */
  route: `/games/${GameId}`;
  /** "high" → bigger is better. "low" → smaller is better (e.g. fewest moves). */
  scoreType: ScoreType;
  /** Short tagline shown on the hub card. */
  description: string;
  /** Display label for the score line on the hub card ("Best", "Fewest moves"). */
  scoreLabel: string;
  /** Per-game color identity. Reused on the hub card AND profile score tiles. */
  palette: GamePalette;
}

export const GAMES: readonly GameMeta[] = [
  {
    id: 'coin-merge',
    name: 'Coin Merge',
    icon: '🪙',
    image: COIN_MERGE_IMG,
    route: '/games/coin-merge',
    scoreType: 'high',
    description: 'Slide to merge coins. Bigger notes, bigger score.',
    scoreLabel: 'Best',
    palette: {
      bg: '#FEF7E1',
      ring: 'rgba(245,158,11,0.18)',
      accent: '#F59E0B',
      accentDark: '#7C2D12',
    },
  },
  {
    id: 'snake',
    name: 'Snake',
    icon: '🐍',
    image: SNAKE_IMG,
    route: '/games/snake',
    scoreType: 'high',
    description: 'Eat coins, grow long, don’t bite yourself.',
    scoreLabel: 'Best',
    palette: {
      bg: '#E5F8EE',
      ring: 'rgba(34,197,94,0.18)',
      accent: '#22C55E',
      accentDark: '#0B6B2E',
    },
  },
  {
    id: 'memory-match',
    name: 'Memory Match',
    icon: '🧠',
    image: MEMORY_IMG,
    route: '/games/memory-match',
    scoreType: 'low',
    description: 'Flip pairs. Clear the board in fewer moves.',
    scoreLabel: 'Fewest moves',
    palette: {
      bg: '#EFE9FF',
      ring: 'rgba(139,92,246,0.20)',
      accent: '#8B5CF6',
      accentDark: '#4C1D95',
    },
  },
  {
    id: 'whack-a-coin',
    name: 'Whack-a-Coin',
    icon: '🔨',
    image: WHACK_IMG,
    route: '/games/whack-a-coin',
    scoreType: 'high',
    description: 'Sixty seconds. Whack every coin you can.',
    scoreLabel: 'Best',
    palette: {
      bg: '#FFE7D8',
      ring: 'rgba(249,115,22,0.20)',
      accent: '#F97316',
      accentDark: '#7C2D12',
    },
  },
];

export function getGame(id: string): GameMeta | undefined {
  return GAMES.find((g) => g.id === id);
}
