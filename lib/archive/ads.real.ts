/**
 * ARCHIVED — original real-AdMob ad unit ID config.
 *
 * Restored from lib/ads.ts when the app was switched to placeholder ads.
 * To swap real ads back in:
 *   1. Copy this file's contents back into lib/ads.ts
 *   2. Replace `@/lib/ads-placeholder` imports with `react-native-google-mobile-ads`
 *      across app/ and components/
 *   3. npx expo prebuild --clean
 *   4. eas build -p android --profile production
 */

import { TestIds } from 'react-native-google-mobile-ads';

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
