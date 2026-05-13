import type { ThemeId } from './types';

export type DecorationAnimation = 'float' | 'twinkle';

export interface ThemeDecoration {
  /** Emojis scattered across the background. */
  emojis: string[];
  /** Animation style for the decoration. */
  animation: DecorationAnimation;
  /** Total number of decoration items to render. */
  count: number;
}

export interface ThemePalette {
  id: ThemeId;
  label: string;
  /** Short 2-3 word descriptor shown under the label in the theme picker.
   *  Keeps the picker cards visually balanced — locked themes show their
   *  unlock requirement, free themes show this line. */
  tagline?: string;
  // Backgrounds
  bg: string;
  bgSecondary: string;
  heroGradientStart: string;
  heroGradientMid?: string;
  heroGradientEnd: string;
  // Surfaces
  surface: string;
  surfaceElevated: string;
  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textOnHero: string;
  textOnHeroSecondary: string;
  // Accent
  accent: string;
  accentLight: string;
  accentSoft: string;
  // Grid cells
  cellDefault: string;
  cellFilled: string;
  cellText: string;
  cellTextFilled: string;
  /** Border radius for cells as a ratio of cell size (0 = square, 0.5 = circle). Default 0.22. */
  cellRadius?: number;
  // Status
  success: string;
  successBg: string;
  error: string;
  pending: string;
  // Borders
  border: string;
  borderLight: string;
  // Tab bar
  tabBg: string;
  tabActive: string;
  tabInactive: string;
  tabActiveBg: string;
  // Shadows
  shadowColor: string;
  /** Optional background decorations (floating emojis, sparkles). */
  decoration?: ThemeDecoration;
}

export const THEMES: Record<ThemeId, ThemePalette> = {
  classic_gold: {
    id: 'classic_gold',
    label: 'Classic 🌿',
    tagline: 'Signature green',
    bg: '#F5F7FA',
    bgSecondary: '#FFFFFF',
    heroGradientStart: '#0B6B2E',
    heroGradientMid: '#16953F',
    heroGradientEnd: '#1DB954',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    textPrimary: '#0F1419',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    textOnHero: '#FFFFFF',
    textOnHeroSecondary: 'rgba(255,255,255,0.7)',
    accent: '#1DB954',
    accentLight: '#E6F4EA',
    accentSoft: 'rgba(29, 185, 84, 0.1)',
    cellDefault: '#F0F2F5',
    cellFilled: '#1DB954',
    cellText: '#6B7280',
    cellTextFilled: '#FFFFFF',
    success: '#22C55E',
    successBg: '#ECFDF5',
    error: '#EF4444',
    pending: '#F59E0B',
    border: '#E5E7EB',
    borderLight: '#F3F4F6',
    tabBg: '#FFFFFF',
    tabActive: '#1DB954',
    tabInactive: '#9CA3AF',
    tabActiveBg: 'rgba(29, 185, 84, 0.1)',
    shadowColor: 'rgba(0, 0, 0, 0.06)',
  },
  candy_pop: {
    id: 'candy_pop',
    label: 'Candy 🍬',
    tagline: 'Sweet & playful',
    bg: '#FFF5F7',
    bgSecondary: '#FFFFFF',
    heroGradientStart: '#E91E8C',
    heroGradientEnd: '#FF6BB5',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    textPrimary: '#1A1A2E',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    textOnHero: '#FFFFFF',
    textOnHeroSecondary: 'rgba(255,255,255,0.8)',
    accent: '#E91E8C',
    accentLight: '#FDE8F3',
    accentSoft: 'rgba(233, 30, 140, 0.1)',
    cellDefault: '#FFF0F5',
    cellFilled: '#E91E8C',
    cellText: '#9CA3AF',
    cellTextFilled: '#FFFFFF',
    success: '#22C55E',
    successBg: '#ECFDF5',
    error: '#EF4444',
    pending: '#F59E0B',
    border: '#FCE4EC',
    borderLight: '#FFF0F5',
    tabBg: '#FFFFFF',
    tabActive: '#E91E8C',
    tabInactive: '#9CA3AF',
    tabActiveBg: 'rgba(233, 30, 140, 0.1)',
    shadowColor: 'rgba(233, 30, 140, 0.06)',
  },
  midnight: {
    id: 'midnight',
    label: 'Dark 🌙',
    tagline: 'Easy on eyes',
    bg: '#0F1117',
    bgSecondary: '#161822',
    heroGradientStart: '#1E2030',
    heroGradientEnd: '#2A2D42',
    surface: '#1C1E2D',
    surfaceElevated: '#232538',
    textPrimary: '#E4E4E7',
    textSecondary: '#71717A',
    textMuted: '#3F3F46',
    textOnHero: '#FFFFFF',
    textOnHeroSecondary: 'rgba(255,255,255,0.6)',
    accent: '#6366F1',
    accentLight: '#1E1B4B',
    accentSoft: 'rgba(99, 102, 241, 0.15)',
    cellDefault: '#1C1E2D',
    cellFilled: '#6366F1',
    cellText: '#71717A',
    cellTextFilled: '#FFFFFF',
    success: '#22C55E',
    successBg: 'rgba(34, 197, 94, 0.1)',
    error: '#EF4444',
    pending: '#EAB308',
    border: '#27272A',
    borderLight: '#1C1E2D',
    tabBg: '#0F1117',
    tabActive: '#6366F1',
    tabInactive: '#3F3F46',
    tabActiveBg: 'rgba(99, 102, 241, 0.15)',
    shadowColor: 'rgba(0, 0, 0, 0.3)',
  },
  ocean: {
    id: 'ocean',
    label: 'Ocean 🐠',
    tagline: 'Cool & calm',
    bg: '#CFF1FB',
    bgSecondary: '#FFFFFF',
    heroGradientStart: '#0C4A6E',
    heroGradientMid: '#0284C7',
    heroGradientEnd: '#22D3EE',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    textPrimary: '#0C4A6E',
    textSecondary: '#0369A1',
    textMuted: '#7DD3FC',
    textOnHero: '#FFFFFF',
    textOnHeroSecondary: 'rgba(255,255,255,0.9)',
    accent: '#F97316',
    accentLight: '#FFEDD5',
    accentSoft: 'rgba(249, 115, 22, 0.15)',
    cellDefault: '#E0F7FF',
    cellFilled: '#06B6D4',
    cellText: '#0369A1',
    cellTextFilled: '#FFFFFF',
    cellRadius: 0.5,
    success: '#22C55E',
    successBg: '#ECFDF5',
    error: '#EF4444',
    pending: '#F59E0B',
    border: '#BAE6FD',
    borderLight: '#E0F7FA',
    tabBg: '#FFFFFF',
    tabActive: '#06B6D4',
    tabInactive: '#94A3B8',
    tabActiveBg: 'rgba(6, 182, 212, 0.12)',
    shadowColor: 'rgba(2, 132, 199, 0.1)',
    decoration: {
      emojis: ['🐠', '🐟', '🫧', '⭐', '🐚', '🐙', '🌊'],
      animation: 'float',
      count: 14,
    },
  },
  space: {
    id: 'space',
    label: 'Space 🚀',
    tagline: 'Bold cosmic',
    bg: '#F5F3FF',
    bgSecondary: '#FFFFFF',
    heroGradientStart: '#0F172A',
    heroGradientMid: '#4C1D95',
    heroGradientEnd: '#7C3AED',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    textPrimary: '#1E1B4B',
    textSecondary: '#4C1D95',
    textMuted: '#A78BFA',
    textOnHero: '#FFFFFF',
    textOnHeroSecondary: 'rgba(255,255,255,0.9)',
    accent: '#FBBF24',
    accentLight: '#FEF3C7',
    accentSoft: 'rgba(251, 191, 36, 0.15)',
    cellDefault: '#EDE9FE',
    cellFilled: '#7C3AED',
    cellText: '#5B21B6',
    cellTextFilled: '#FFFFFF',
    cellRadius: 0.45,
    success: '#22C55E',
    successBg: '#ECFDF5',
    error: '#EF4444',
    pending: '#F59E0B',
    border: '#DDD6FE',
    borderLight: '#F5F3FF',
    tabBg: '#FFFFFF',
    tabActive: '#7C3AED',
    tabInactive: '#A78BFA',
    tabActiveBg: 'rgba(124, 58, 237, 0.12)',
    shadowColor: 'rgba(76, 29, 149, 0.12)',
    decoration: {
      emojis: ['🚀', '⭐', '🌟', '🪐', '🌙', '☄️', '👽', '🛸', '✨'],
      animation: 'twinkle',
      count: 16,
    },
  },
  dino: {
    id: 'dino',
    label: 'Dino 🦕',
    tagline: 'Roar adventure',
    bg: '#F7FEE7',
    bgSecondary: '#FFFFFF',
    heroGradientStart: '#1F3009',
    heroGradientMid: '#3F6212',
    heroGradientEnd: '#84CC16',
    surface: '#FFFFFF',
    surfaceElevated: '#FAFFEC',
    textPrimary: '#1F3009',
    textSecondary: '#3F6212',
    textMuted: '#65A30D',
    textOnHero: '#FFFFFF',
    textOnHeroSecondary: 'rgba(255,255,255,0.88)',
    accent: '#65A30D',
    accentLight: '#ECFCCB',
    accentSoft: 'rgba(101, 163, 13, 0.12)',
    cellDefault: '#ECFCCB',
    cellFilled: '#65A30D',
    cellText: '#3F6212',
    cellTextFilled: '#FFFFFF',
    cellRadius: 0.4,
    success: '#22C55E',
    successBg: '#ECFDF5',
    error: '#EF4444',
    pending: '#F59E0B',
    border: '#D9F99D',
    borderLight: '#ECFCCB',
    tabBg: '#FFFFFF',
    tabActive: '#65A30D',
    tabInactive: '#A3A3A3',
    tabActiveBg: 'rgba(101, 163, 13, 0.12)',
    shadowColor: 'rgba(63, 98, 18, 0.15)',
    decoration: {
      emojis: ['🦕', '🦖', '🥚', '🌋', '🌿', '🦴', '☄️'],
      animation: 'float',
      count: 14,
    },
  },
  gold: {
    id: 'gold',
    label: 'Gold 🥇',
    tagline: 'Pure luxe',
    bg: '#FFFBEB',
    bgSecondary: '#FFFFFF',
    heroGradientStart: '#78350F',
    heroGradientMid: '#B8860B',
    heroGradientEnd: '#FBBF24',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFDF5',
    textPrimary: '#78350F',
    textSecondary: '#92400E',
    textMuted: '#B45309',
    textOnHero: '#FFFFFF',
    textOnHeroSecondary: 'rgba(255,255,255,0.92)',
    accent: '#D4AF37',
    accentLight: '#FEF3C7',
    accentSoft: 'rgba(212, 175, 55, 0.15)',
    cellDefault: '#FEF3C7',
    cellFilled: '#D4AF37',
    cellText: '#92400E',
    cellTextFilled: '#FFFFFF',
    cellRadius: 0.22,
    success: '#22C55E',
    successBg: '#ECFDF5',
    error: '#EF4444',
    pending: '#F59E0B',
    border: '#FDE68A',
    borderLight: '#FEF3C7',
    tabBg: '#FFFFFF',
    tabActive: '#D4AF37',
    tabInactive: '#D6C98B',
    tabActiveBg: 'rgba(212, 175, 55, 0.12)',
    shadowColor: 'rgba(180, 83, 9, 0.15)',
  },
  silver: {
    id: 'silver',
    label: 'Silver 🥈',
    tagline: 'Sleek shine',
    bg: '#F4F4F5',
    bgSecondary: '#FFFFFF',
    heroGradientStart: '#3F3F46',
    heroGradientMid: '#71717A',
    heroGradientEnd: '#D4D4D8',
    surface: '#FFFFFF',
    surfaceElevated: '#FAFAFA',
    textPrimary: '#18181B',
    textSecondary: '#3F3F46',
    textMuted: '#71717A',
    textOnHero: '#FFFFFF',
    textOnHeroSecondary: 'rgba(255,255,255,0.9)',
    accent: '#71717A',
    accentLight: '#E4E4E7',
    accentSoft: 'rgba(113, 113, 122, 0.12)',
    cellDefault: '#E4E4E7',
    cellFilled: '#A1A1AA',
    cellText: '#52525B',
    cellTextFilled: '#FFFFFF',
    cellRadius: 0.22,
    success: '#22C55E',
    successBg: '#ECFDF5',
    error: '#EF4444',
    pending: '#F59E0B',
    border: '#D4D4D8',
    borderLight: '#F4F4F5',
    tabBg: '#FFFFFF',
    tabActive: '#52525B',
    tabInactive: '#A1A1AA',
    tabActiveBg: 'rgba(113, 113, 122, 0.12)',
    shadowColor: 'rgba(63, 63, 70, 0.12)',
  },
};

export function getTheme(id: ThemeId): ThemePalette {
  return THEMES[id] ?? THEMES.classic_gold;
}
