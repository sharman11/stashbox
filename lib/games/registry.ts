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

const COIN_MERGE_IMG: ImageSourcePropType = require('@/assets/games/Merge.webp');
const SNAKE_IMG: ImageSourcePropType = require('@/assets/games/Snake.webp');
const MEMORY_IMG: ImageSourcePropType = require('@/assets/games/Memory.webp');
const WHACK_IMG: ImageSourcePropType = require('@/assets/games/Whack.webp');

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
      bg: '#FDF3D7',
      ring: 'rgba(239,174,28,0.20)',
      accent: '#EFAE1C',
      accentDark: '#8A5A06',
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
      bg: '#E5F5EA',
      ring: 'rgba(61,168,95,0.20)',
      accent: '#3DA85F',
      accentDark: '#0C6B33',
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
      bg: '#ECE6FA',
      ring: 'rgba(138,111,210,0.22)',
      accent: '#8A6FD2',
      accentDark: '#4A2E94',
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
      bg: '#FDE5E1',
      ring: 'rgba(237,86,69,0.22)',
      accent: '#ED5645',
      accentDark: '#8C2A1E',
    },
  },
];

export function getGame(id: string): GameMeta | undefined {
  return GAMES.find((g) => g.id === id);
}
