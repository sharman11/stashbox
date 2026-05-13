import { TestIds } from 'react-native-google-mobile-ads';

/**
 * Ad unit IDs.
 *
 * Production IDs ship in release builds. In development we substitute
 * Google's TestIds to avoid AdMob policy violations. AdMob accounts can be
 * permanently banned for serving real ads on a developer's own device.
 * Never set __DEV__ to false locally and tap an ad on your own phone.
 *
 * The placeholder shim lives at `lib/ads-placeholder.tsx` for Expo Go
 * testing. To re-enable it, swap every `react-native-google-mobile-ads`
 * import across app/ and components/ back to `@/lib/ads-placeholder`.
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
