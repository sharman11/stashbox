import type { AppPalette, ResolvedMode } from './tokens';

/** Light mode = the original Stashbox Chime-green palette (unchanged). */
const LIGHT: AppPalette = {
  heroTop: '#0B3D2E',
  heroMid: '#145A42',
  heroBot: '#1E7A5C',

  pageBg: '#F5F7FA',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',

  textPrimary: '#0F1419',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textFaint: '#D1D5DB',
  textOnHero: '#FFFFFF',
  textOnHeroSecondary: 'rgba(255,255,255,0.7)',

  accent: '#1DB954',
  accentDark: '#166534',
  accentLight: '#E6F4EA',
  accentSoft: 'rgba(29,185,84,0.10)',

  buttonPrimaryBg: '#1DB954',
  buttonPrimaryText: '#FFFFFF',

  border: '#E5E7EB',
  borderLight: '#F3F4F6',

  tabBg: '#FFFFFF',
  tabBorder: '#E5E7EB',
  tabActive: '#1DB954',
  tabInactive: '#9CA3AF',
  tabActiveBg: 'rgba(29,185,84,0.10)',

  errorBg: '#FEF2F2',
  errorText: '#DC2626',
  warnBg: '#FEF3C7',
  warnText: '#B45309',
  successBg: '#ECFDF5',

  overlay: 'rgba(0,0,0,0.4)',

  mode: 'light',
};

/** Dark mode - Chime-style. Deep near-black green-black page bg, slightly
 *  lifted card surfaces, white text, mint-leaning accents.
 *
 *  The hero gradient is intentionally near-flat so it blends into the page
 *  background - Chime's hero is a single dark wash, not a vivid gradient. */
const DARK: AppPalette = {
  heroTop: '#0A1F18',
  heroMid: '#0E2A20',
  heroBot: '#13362A',

  pageBg: '#0A1F18',
  surface: '#162A22',
  surfaceElevated: '#1D3329',

  textPrimary: '#FFFFFF',
  textSecondary: '#B5BFB9',
  textMuted: '#7A857F',
  textFaint: '#4A5550',
  textOnHero: '#FFFFFF',
  textOnHeroSecondary: 'rgba(255,255,255,0.7)',

  // Brand green stays green - adds a hint of brightness for visibility on dark.
  accent: '#34D399',
  accentDark: '#10B981',
  // "AccentLight" in dark mode = a translucent green wash (used as button bg /
  // tinted card). Solid mint #C8F0A0 is reserved for primary CTA buttons -
  // applied per-component, not from this token.
  accentLight: 'rgba(52,211,153,0.16)',
  accentSoft: 'rgba(52,211,153,0.10)',

  // Chime-style: bright mint button with near-black text. Inverts on dark
  // because a dark green button would visually disappear into the page.
  buttonPrimaryBg: '#B2EEB8',
  buttonPrimaryText: '#001C01',

  border: '#243630',
  borderLight: '#1B2A24',

  tabBg: '#0F2419',
  tabBorder: '#1B2A24',
  tabActive: '#34D399',
  tabInactive: '#7A857F',
  tabActiveBg: 'rgba(52,211,153,0.16)',

  errorBg: 'rgba(239,68,68,0.14)',
  errorText: '#FCA5A5',
  warnBg: 'rgba(251,191,36,0.14)',
  warnText: '#FCD34D',
  successBg: 'rgba(34,197,94,0.14)',

  overlay: 'rgba(0,0,0,0.6)',

  mode: 'dark',
};

export function getPalette(mode: ResolvedMode): AppPalette {
  return mode === 'dark' ? DARK : LIGHT;
}
