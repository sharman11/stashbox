/** App-wide theming. Two independent toggles:
 *
 *  - AppMode  - light / dark / system (system follows OS appearance)
 *  - ColorMode - standard / colorblind  (added in Phase 2)
 *
 * The resolved palette is the same shape every screen used to keep in a local
 * `const C = { ... }` block. Migrating a screen is a one-line change:
 *
 *   const C = useAppTheme();
 *
 * Moneybox themes (lib/theme.ts) are intentionally unrelated - they're a
 * creative pick per moneybox, not an app preference.
 */

export type AppMode = 'system' | 'light' | 'dark';
/** Resolved mode, after collapsing 'system' to either 'light' or 'dark'. */
export type ResolvedMode = 'light' | 'dark';
export type ColorMode = 'standard' | 'colorblind';

/** Superset of color tokens used across every app-chrome screen. New tokens
 *  added here automatically become available via useAppTheme(). */
export interface AppPalette {
  // Hero gradient (top-of-screen banners)
  heroTop: string;
  heroMid: string;
  heroBot: string;

  // Page + surfaces
  pageBg: string;
  surface: string;
  surfaceElevated: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textFaint: string;
  /** Text intended to sit on top of the hero gradient. */
  textOnHero: string;
  textOnHeroSecondary: string;

  // Accent (Stashbox green family)
  accent: string;
  accentDark: string;
  accentLight: string;
  accentSoft: string;

  // Primary CTA buttons. Light mode = brand green + white text.
  // Dark mode = bright mint + near-black text (Chime pattern - dark accents
  // would disappear, so the button inverts to a light-on-dark fill).
  buttonPrimaryBg: string;
  buttonPrimaryText: string;

  // Borders + dividers
  border: string;
  borderLight: string;

  // Tab bar
  tabBg: string;
  tabBorder: string;
  tabActive: string;
  tabInactive: string;
  tabActiveBg: string;

  // Status / alerts
  errorBg: string;
  errorText: string;
  warnBg: string;
  warnText: string;
  successBg: string;

  // Overlays / scrims
  overlay: string;

  /** "light" or "dark" - used for StatusBar style and conditional logic. */
  mode: ResolvedMode;
}
