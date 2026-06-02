/**
 * ════════════════════════════════════════════════════════════════════════════
 *  ⚠️  PLACEHOLDER ADS - NOT WIRED TO ADMOB ⚠️
 * ════════════════════════════════════════════════════════════════════════════
 *
 *  Drop-in replacement for `react-native-google-mobile-ads` so the app runs
 *  inside Expo Go (which can't load native AdMob). All exports match the real
 *  module's surface so consumer code stays identical — only the import path
 *  differs.
 *
 *  Banners render a labelled grey rectangle. Interstitials, rewarded ads,
 *  and the `mobileAds()` init chain are no-ops that resolve immediately so
 *  `useAdsStore.setReady()` still fires and reward callbacks still trigger.
 *
 *  ─────────────────────────────────────────────────────────────────────────
 *   🚨 BEFORE BUILDING A RELEASE / PRODUCTION AAB - REVERT TO REAL ADS 🚨
 *  ─────────────────────────────────────────────────────────────────────────
 *
 *  Just ask the assistant: "swap ads back to real"
 *  Or manually: in every file under app/ and components/ that imports from
 *  '@/lib/ads-placeholder', change the path to 'react-native-google-mobile-ads'.
 *  Same for lib/ads.ts. Then rebuild native (npx expo prebuild --clean) and
 *  ship the AAB (eas build -p android --profile production).
 * ════════════════════════════════════════════════════════════════════════════
 */

import { Platform, Text, View } from 'react-native';

interface BannerProps {
  unitId?: string;
  size?: string;
}

const SIZE_HEIGHT: Record<string, number> = {
  BANNER: 60,
  LARGE_BANNER: 100,
  MEDIUM_RECTANGLE: 250,
  FULL_BANNER: 60,
  LEADERBOARD: 90,
  ANCHORED_ADAPTIVE_BANNER: 60,
};

export function BannerAd({ size }: BannerProps) {
  // iOS ships without ads — render nothing so no placeholder shows either.
  if (Platform.OS === 'ios') return null;
  const height = size ? SIZE_HEIGHT[size] ?? 60 : 60;
  return (
    <View
      style={{
        height,
        marginHorizontal: 16,
        backgroundColor: '#E5E7EB',
        borderWidth: 1,
        borderColor: '#9CA3AF',
        borderStyle: 'dashed',
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        allowFontScaling={false}
        maxFontSizeMultiplier={1}
        style={{
          fontFamily: 'DMSans_500Medium',
          fontSize: 11,
          color: '#6B7280',
          letterSpacing: 1.5,
        }}
      >
        AD PLACEHOLDER
      </Text>
    </View>
  );
}

export const BannerAdSize = {
  ANCHORED_ADAPTIVE_BANNER: 'ANCHORED_ADAPTIVE_BANNER',
  BANNER: 'BANNER',
  LARGE_BANNER: 'LARGE_BANNER',
  MEDIUM_RECTANGLE: 'MEDIUM_RECTANGLE',
  FULL_BANNER: 'FULL_BANNER',
  LEADERBOARD: 'LEADERBOARD',
};

export const TestIds = {
  BANNER: 'TEST_BANNER',
  ADAPTIVE_BANNER: 'TEST_ADAPTIVE_BANNER',
  INTERSTITIAL: 'TEST_INTERSTITIAL',
  REWARDED: 'TEST_REWARDED',
  REWARDED_INTERSTITIAL: 'TEST_REWARDED_INTERSTITIAL',
  APP_OPEN: 'TEST_APP_OPEN',
} as const;

export const MaxAdContentRating = {
  G: 'G',
  PG: 'PG',
  T: 'T',
  MA: 'MA',
} as const;

const mobileAdsInstance = {
  setRequestConfiguration: (_config?: unknown) => Promise.resolve(),
  initialize: () => Promise.resolve(),
};

const mobileAds = () => mobileAdsInstance;
export default mobileAds;

/** Stub ad instance - emits LOADED after a tick so UI ready-flags work. */
function makeStubAd() {
  return {
    load: () => {},
    show: () => {},
    addAdEventListener: (event: string, listener: (err?: unknown) => void) => {
      if (event === 'loaded' || event === AdEventType.LOADED) {
        setTimeout(listener, 50);
      }
      return () => {};
    },
  };
}

export const InterstitialAd = {
  createForAdRequest: (_unitId: string) => makeStubAd(),
};

/** Rewarded ad stub - fires LOADED immediately and EARNED_REWARD on show(). */
function makeRewardedStub() {
  const listeners: Record<string, Array<(arg?: unknown) => void>> = {};
  return {
    load: () => {
      setTimeout(() => {
        listeners.loaded?.forEach((l) => l());
      }, 50);
    },
    show: () => {
      // Simulate user watching and earning reward
      setTimeout(() => {
        listeners.earned_reward?.forEach((l) => l({ amount: 1, type: 'unlock' }));
        listeners.closed?.forEach((l) => l());
      }, 300);
    },
    addAdEventListener: (event: string, listener: (arg?: unknown) => void) => {
      listeners[event] = listeners[event] ?? [];
      listeners[event].push(listener);
      return () => {
        listeners[event] = listeners[event].filter((l) => l !== listener);
      };
    },
  };
}

export const RewardedAd = {
  createForAdRequest: (_unitId: string) => makeRewardedStub(),
};

export const AdEventType = {
  LOADED: 'loaded',
  ERROR: 'error',
  CLOSED: 'closed',
  OPENED: 'opened',
  CLICKED: 'clicked',
} as const;

export const RewardedAdEventType = {
  LOADED: 'loaded',
  EARNED_REWARD: 'earned_reward',
} as const;
