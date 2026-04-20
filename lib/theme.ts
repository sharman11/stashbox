import type { ThemeId } from './types';

export interface ThemePalette {
  id: ThemeId;
  label: string;
  // Backgrounds
  bg: string;
  bgSecondary: string;
  heroGradientStart: string;
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
}

export const THEMES: Record<ThemeId, ThemePalette> = {
  classic_gold: {
    id: 'classic_gold',
    label: 'Classic',
    bg: '#F5F7FA',
    bgSecondary: '#FFFFFF',
    heroGradientStart: '#1A1D2E',
    heroGradientEnd: '#2A2D3E',
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
    label: 'Candy',
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
    label: 'Dark',
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
};

export function getTheme(id: ThemeId): ThemePalette {
  return THEMES[id] ?? THEMES.classic_gold;
}
