/**
 * The three themes exposed in the hero theme-switcher. Values mirror the
 * in-app theme palette (lib/theme.ts) so the marketing demo looks
 * identical to what users get in the app.
 */
export type ThemeId = 'green' | 'ocean' | 'gold';
export type DecorationMode = 'underwater' | 'sparkle';

export interface ThemeDecoration {
  mode: DecorationMode;
  /** Drift across the hero with a gentle vertical bob. */
  sprites: readonly string[];
  /** Emojis that rise from the bottom of the hero to the top — used by the
   *  underwater mode to make bubbles literally float up. */
  risers?: readonly string[];
}

export interface PhoneTheme {
  id: ThemeId;
  name: string;
  swatch: string;
  heroStart: string;
  heroMid: string;
  heroEnd: string;
  accent: string;
  accentSoft: string;
  cellFilled: string;
  cellGlowRgb: string;
  saveBg: string;
  saveText: string;
  saveRing: string;
  decorations?: ThemeDecoration;
}

export const THEMES: Record<ThemeId, PhoneTheme> = {
  green: {
    id: 'green',
    name: 'Green',
    swatch: '#1DB954',
    heroStart: '#0B3D2E',
    heroMid: '#145A42',
    heroEnd: '#1E7A5C',
    accent: '#1DB954',
    accentSoft: 'rgba(29, 185, 84, 0.15)',
    cellFilled: '#1DB954',
    cellGlowRgb: '29, 185, 84',
    saveBg: 'rgba(29, 185, 84, 0.18)',
    saveText: '#5EE39A',
    saveRing: 'rgba(29, 185, 84, 0.45)',
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    swatch: '#06B6D4',
    heroStart: '#0C4A6E',
    heroMid: '#0284C7',
    heroEnd: '#22D3EE',
    accent: '#F97316',
    accentSoft: 'rgba(249, 115, 22, 0.15)',
    cellFilled: '#22D3EE',
    cellGlowRgb: '34, 211, 238',
    saveBg: 'rgba(249, 115, 22, 0.20)',
    saveText: '#FDBA74',
    saveRing: 'rgba(249, 115, 22, 0.45)',
    decorations: {
      mode: 'underwater',
      sprites: ['🐠', '🐟', '🐚', '🐙', '🪼', '⭐'],
      risers: ['🫧', '🫧', '🫧', '🌊'],
    },
  },
  gold: {
    id: 'gold',
    name: 'Gold',
    swatch: '#D4AF37',
    heroStart: '#78350F',
    heroMid: '#B8860B',
    heroEnd: '#FBBF24',
    accent: '#D4AF37',
    accentSoft: 'rgba(212, 175, 55, 0.18)',
    cellFilled: '#D4AF37',
    cellGlowRgb: '212, 175, 55',
    saveBg: 'rgba(212, 175, 55, 0.22)',
    saveText: '#FEF3C7',
    saveRing: 'rgba(212, 175, 55, 0.55)',
    decorations: {
      mode: 'sparkle',
      sprites: ['✨', '🪙', '⭐', '💫'],
    },
  },
};
