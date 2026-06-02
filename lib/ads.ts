import { TestIds } from '@/lib/ads-placeholder';

/**
 * Ad unit IDs.
 *
 * Currently routed through `@/lib/ads-placeholder` so the app renders grey
 * placeholder rectangles instead of real AdMob ads while the app is being
 * updated. Before a production release, swap this import (and every other
 * `@/lib/ads-placeholder` import across app/ and components/) back to
 * `react-native-google-mobile-ads`. The archived real-ad config lives in
 * `lib/archive/ads.real.ts`.
 */

const PROD = {
  BANNER: 'ca-app-pub-4989174984802618/3625864941',
  INTERSTITIAL: 'ca-app-pub-4989174984802618/4771425650',
  REWARDED: 'ca-app-pub-4989174984802618/7206017302',
};

export const AD_UNIT_IDS = {
  BANNER: __DEV__ ? TestIds.ADAPTIVE_BANNER : PROD.BANNER,
  INTERSTITIAL: __DEV__ ? TestIds.INTERSTITIAL : PROD.INTERSTITIAL,
  REWARDED: __DEV__ ? TestIds.REWARDED : PROD.REWARDED,
};

/** Show interstitial every N-th cell fill */
export const INTERSTITIAL_EVERY = 3;
