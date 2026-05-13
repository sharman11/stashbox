import {
  DMSans_300Light,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
  useFonts,
} from '@expo-google-fonts/dm-sans';
import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { Text, TextInput } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import mobileAds, { MaxAdContentRating } from 'react-native-google-mobile-ads';
import 'react-native-reanimated';
import 'react-native-url-polyfill/auto';

import '../global.css';
import { BadgeCelebration } from '@/components/BadgeCelebration';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SplashAnimation } from '@/components/SplashAnimation';
import { registerForPushNotifications, setupNotificationListener } from '@/lib/push';
import { useAdsStore } from '@/lib/stores/ads';
import { useAppReadyStore } from '@/lib/stores/app-ready';
import { useAvatarStore } from '@/lib/stores/avatar';
import { useAvatarUnlocksStore } from '@/lib/stores/avatar-unlocks';
import { useLimitsStore } from '@/lib/stores/limits';
import { useProfileStore } from '@/lib/stores/profile';
import { useSessionStore } from '@/lib/stores/session';
import { useBadgesStore } from '@/lib/badges/store';
import { useScoresStore } from '@/lib/games/scores';
import { usePlayedStore } from '@/lib/games/played';
import { useThemeStore } from '@/lib/stores/theme';

SplashScreen.preventAutoHideAsync();

// Global ceiling on OS-level font scaling so extreme accessibility settings
// (Samsung One UI's "Larger" + Bold font + Display zoom) can't push body text
// past what the layout can hold. 1.5x preserves accessibility — low-vision
// users still get noticeably larger text — while individual chrome elements
// (tab labels, header pills, badges) opt out via allowFontScaling={false}
// to stay locked at design size.
const MAX_FONT_MULTIPLIER = 1.5;
type DefaultPropsHost = { defaultProps?: { maxFontSizeMultiplier?: number } };
const TextHost = Text as unknown as DefaultPropsHost;
const TextInputHost = TextInput as unknown as DefaultPropsHost;
TextHost.defaultProps = { ...(TextHost.defaultProps ?? {}), maxFontSizeMultiplier: MAX_FONT_MULTIPLIER };
TextInputHost.defaultProps = { ...(TextInputHost.defaultProps ?? {}), maxFontSizeMultiplier: MAX_FONT_MULTIPLIER };

// Initialize AdMob once at module load. setReady() flips when the SDK is
// ready so banner / interstitial / rewarded UI doesn't render against an
// uninitialised native module.
mobileAds()
  .setRequestConfiguration({
    // Stashbox is a savings app - keep ad content general-audience friendly.
    maxAdContentRating: MaxAdContentRating.PG,
    tagForChildDirectedTreatment: false,
    tagForUnderAgeOfConsent: false,
  })
  .then(() => mobileAds().initialize())
  .then(() => useAdsStore.getState().setReady())
  .catch(() => {
    // SDK init failed - leave ready=false; banners and ad-gated flows will
    // simply not render. Surfacing an error to the user provides no value.
  });

function useBootstrap() {
  const { userId, isAnonymous, loading, error, init } = useSessionStore();
  const { profile, load } = useProfileStore();
  const loadAvatar = useAvatarStore((s) => s.load);

  const [fontsLoaded] = useFonts({
    DMSans_300Light,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;
    init().then((sub) => { subscription = sub; });
    // Warm up bonus-currency cache from AsyncStorage so it's available before
    // the profile finishes loading.
    useLimitsStore.getState().loadCache();
    // Hydrate game state - best scores, badges, and which games have been played.
    useScoresStore.getState().load();
    useBadgesStore.getState().load();
    usePlayedStore.getState().load();
    // Hydrate theme + start OS-appearance listener.
    useThemeStore.getState().load();
    // Hydrate ad-watched avatar unlocks so locked tiles open in the right state.
    useAvatarUnlocksStore.getState().load();
    return () => { subscription?.unsubscribe(); };
  }, [init]);

  useEffect(() => {
    if (userId) {
      load(userId);
      loadAvatar();
      registerForPushNotifications(userId);
      setupNotificationListener();
    }
  }, [userId, load, loadAvatar]);

  // Sync bonusCurrency from profile (authoritative) into the limits store
  // whenever the profile loads or changes.
  useEffect(() => {
    if (profile) {
      useLimitsStore.getState().hydrateFromProfile(profile.bonusCurrency);
    }
  }, [profile]);

  const ready = Boolean(fontsLoaded && userId && profile);

  return {
    ready,
    loading,
    error,
    profile,
    isAnonymous,
  };
}

function useAuthGuard(
  ready: boolean,
  isAnonymous: boolean,
  onboardingDone: boolean | undefined,
  transitioning: boolean,
  navReady: boolean,
) {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!ready) return;
    // expo-router populates `useSegments` only after the root navigation state
    // is hydrated. If we run the guard before that, segments is `[]` and we
    // mis-classify the user as "not in (auth)" — so for a logged-in user
    // whose previous route was /(auth)/login, the redirect to '/' never
    // fires, splash exits onto login, and the user has to tap once to
    // force a re-render before the guard finally takes effect.
    if (!navReady) return;
    // While login/signup/logout is mid-flight, the session and profile stores are
    // temporarily out of sync. Skip routing so we don't flash through /onboarding
    // or /(auth)/signup on the way to the real destination.
    if (transitioning) return;

    const firstSegment = segments[0] as string | undefined;
    const inAuth = firstSegment === '(auth)';
    const inOnboarding = firstSegment === 'onboarding';

    // Must be authenticated (not anonymous) to use the app
    if (isAnonymous) {
      if (!inAuth) router.replace('/(auth)/signup');
      return;
    }

    // Real user - not onboarded yet
    if (!onboardingDone) {
      if (!inOnboarding) router.replace('/onboarding');
      return;
    }

    // Onboarded - get out of auth/onboarding screens
    if (inAuth || inOnboarding) {
      router.replace('/');
      return;
    }
  }, [ready, isAnonymous, onboardingDone, segments, router, transitioning, navReady]);
}

/** Minimum on-screen time for the splash animation (ms). Long enough that
 *  even on a fast device the user sees the cells assemble + wordmark stagger
 *  through to completion. */
const SPLASH_MIN_DURATION_MS = 1700;

/** Hard cap on splash visibility. Even if route reconciliation never finishes
 *  (e.g. the navigation state never updates), we eventually exit the splash
 *  so the user isn't stuck staring at it forever. */
const SPLASH_MAX_DURATION_MS = 5000;

export default function RootLayout() {
  const { ready, loading, error, profile, isAnonymous } = useBootstrap();
  const transitioning = useSessionStore((s) => s.transitioning);
  const themeMode = useThemeStore((s) => s.mode);
  const systemScheme = useThemeStore((s) => s.systemScheme);
  const resolvedDark = (themeMode === 'system' ? systemScheme : themeMode) === 'dark';
  const segments = useSegments();
  const navState = useRootNavigationState();
  const navReady = Boolean(navState?.key);
  useAuthGuard(ready, isAnonymous, profile?.onboardingDone, transitioning, navReady);

  // Did the auth-guard already land the user on the right route? If they're
  // anonymous they should be in /(auth); if real-but-not-onboarded in
  // /onboarding; otherwise on the tabs. This guard exists because on Expo Go
  // hot-reload, expo-router restores the previous navigation state (often
  // /(auth)/login) before the auth-guard's `router.replace` flushes — without
  // this check, splash exits while the underlying Stack is still on the wrong
  // screen, and the user briefly sees login/onboarding before being snapped
  // home on first interaction.
  //
  // Critically, `onRoute` must remain false until the root navigation state
  // has hydrated (`navReady`). Otherwise on cold start `segments` is `[]`,
  // we incorrectly compute `inAuth=false`, conclude "user is on the tabs",
  // exit splash, and only then does expo-router restore /(auth)/login —
  // leaving the user stranded on the wrong screen until their first tap.
  const onRoute = useMemo(() => {
    if (!ready) return false;
    if (!navReady) return false;
    const firstSegment = segments[0] as string | undefined;
    const inAuth = firstSegment === '(auth)';
    const inOnboarding = firstSegment === 'onboarding';
    if (isAnonymous) return inAuth;
    if (!profile?.onboardingDone) return inOnboarding;
    return !inAuth && !inOnboarding;
  }, [ready, navReady, segments, isAnonymous, profile?.onboardingDone]);

  // Splash lifecycle:
  //  - Hide native (system) splash on first JS render so the JS animation
  //    isn't covered up.
  //  - `splashGateOpen` flips after SPLASH_MIN_DURATION_MS so the splash is
  //    always visible long enough for the cells/wordmark to play through.
  //  - `splashMaxElapsed` flips after SPLASH_MAX_DURATION_MS as the watchdog
  //    cap, so a stuck route reconciliation can't trap the user behind splash.
  //  - `splashExited` is set by the SplashAnimation's onExitComplete — only
  //    then do we unmount the splash and reveal the real Stack underneath.
  const [splashGateOpen, setSplashGateOpen] = useState(false);
  const [splashMaxElapsed, setSplashMaxElapsed] = useState(false);
  const [splashExited, setSplashExited] = useState(false);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => { /* already hidden */ });
    const tMin = setTimeout(() => setSplashGateOpen(true), SPLASH_MIN_DURATION_MS);
    const tMax = setTimeout(() => setSplashMaxElapsed(true), SPLASH_MAX_DURATION_MS);
    return () => {
      clearTimeout(tMin);
      clearTimeout(tMax);
    };
  }, []);

  // Watchdog: if a login/signup/logout call wedges (network black-hole, slow
  // Supabase, OS killed the request), `transitioning` could stay true forever
  // and the auth-guard would refuse to route the user anywhere — they'd see
  // the previous screen indefinitely. Clear the flag after 10s as a last
  // resort. The auth-guard then re-evaluates and routes based on whatever
  // state we did manage to get.
  useEffect(() => {
    if (!transitioning) return;
    const t = setTimeout(() => {
      useSessionStore.getState().setTransitioning(false);
    }, 10_000);
    return () => clearTimeout(t);
  }, [transitioning]);

  // Drive the SplashAnimation's exit. Conditions in priority order:
  //  - `ready` and `splashGateOpen` must both be true (bootstrap done AND
  //    minimum animation time elapsed).
  //  - `onRoute` must be true OR the watchdog (`splashMaxElapsed`) must have
  //    fired. This is the fix for the Expo-Go-reload bug where the
  //    auth-guard's `router.replace` hadn't yet flushed by the time splash
  //    exited, leaving the user briefly on /(auth)/login until their first
  //    tap re-rendered the tree.
  // While `error` is set we keep the splash up so the user sees the message
  // + retry button — exiting under an error would reveal the unauthenticated
  // Stack and trap the user.
  const shouldExit =
    ready && splashGateOpen && (onRoute || splashMaxElapsed);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="create" options={{ presentation: 'modal' }} />
          <Stack.Screen name="box/[id]" />
          <Stack.Screen name="games/coin-merge" />
          <Stack.Screen name="games/snake" />
          <Stack.Screen name="games/memory-match" />
          <Stack.Screen name="games/whack-a-coin" />
        </Stack>
        <BadgeCelebration />
        <StatusBar style={splashExited ? (resolvedDark ? 'light' : 'dark') : 'light'} />

        {!splashExited && (
          <SplashAnimation
            exit={shouldExit}
            onExitComplete={() => {
              setSplashExited(true);
              useAppReadyStore.getState().setSplashExited();
            }}
            error={error ?? null}
            onRetry={
              error
                ? () => {
                    // Clear the error and re-run init. listenerRegistered
                    // guards against double subscription; init's body
                    // re-checks session and falls back to anonymous sign-in
                    // on miss, which is exactly the retry semantics we want.
                    useSessionStore.setState({ error: null, loading: true });
                    void useSessionStore.getState().init();
                  }
                : undefined
            }
          />
        )}
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
