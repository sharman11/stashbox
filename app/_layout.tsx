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
import { useCallback, useEffect, useState } from 'react';
import { Platform, Text, TextInput } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import mobileAds, { MaxAdContentRating } from '@/lib/ads-placeholder';
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
//
// iOS ships without ads — skip init there and leave ready=false. Ad-gated
// flows simply never trigger on iOS.
if (Platform.OS !== 'ios') {
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
}

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
  onGuardRan: () => void,
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
    // temporarily out of sync. Skip routing so we don't flash through the
    // signup stepper on the way to the real destination.
    if (transitioning) return;

    const firstSegment = segments[0] as string | undefined;
    const secondSegment = segments[1] as string | undefined;
    const inAuth = firstSegment === '(auth)';
    const onSignup = inAuth && secondSegment === 'signup';

    // Must be authenticated (not anonymous) to use the app.
    if (isAnonymous) {
      if (!inAuth) router.replace('/(auth)/welcome');
    } else if (!onboardingDone) {
      // Real user, not yet onboarded → the signup stepper handles
      // the post-auth onboarding (name / avatar / currency / goal / loans /
      // personality). Account creation happened in /(auth)/email-otp.
      if (!onSignup) router.replace('/(auth)/signup');
    } else if (inAuth) {
      // Onboarded user landed back on an auth screen (e.g. via stale restore).
      // Send them home.
      router.replace('/');
    }

    // Signal to the splash gate that the guard has executed a full pass with
    // ready+navReady true. The splash uses this (plus a delay) to know when
    // the navigation has been kicked off, regardless of whether segments has
    // re-rendered to reflect it yet.
    onGuardRan();
  }, [ready, isAnonymous, onboardingDone, segments, router, transitioning, navReady, onGuardRan]);
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
  const navState = useRootNavigationState();
  const navReady = Boolean(navState?.key);

  // Tracks whether the auth guard has run a complete pass with ready+navReady
  // both true. Once true it stays true — we only need to know the guard fired
  // *at least once*, not every time it fires. The splash uses this signal
  // (plus a fixed delay) to gate exit so the user can't see the pre-redirect
  // restored route flash briefly between splash-fade and Stack re-render.
  const [guardRan, setGuardRan] = useState(false);
  const markGuardRan = useCallback(() => {
    setGuardRan((prev) => prev || true);
  }, []);

  useAuthGuard(ready, isAnonymous, profile?.onboardingDone, transitioning, navReady, markGuardRan);

  // (`onRoute` removed.) The previous approach checked `useSegments()` against
  // the auth-state-expected route, but Expo Go's hot-reload + expo-router
  // restoration race meant segments could lag the actual screen by a frame
  // or two, letting the splash uncover a stale (auth)/login. We now use
  // `guardRan` (set by useAuthGuard once it has executed a full pass) plus a
  // fixed delay, which doesn't depend on segments and survives the race.

  // Splash lifecycle:
  //  - Hide native (system) splash on first JS render so the JS animation
  //    isn't covered up.
  //  - `splashGateOpen` flips after SPLASH_MIN_DURATION_MS so the splash is
  //    always visible long enough for the cells/wordmark to play through.
  //  - `splashMaxElapsed` flips after SPLASH_MAX_DURATION_MS — but we only
  //    USE it as a fallback when `ready` never became true. If bootstrap
  //    succeeded (ready=true), we wait for the route to actually settle on
  //    the correct screen rather than letting the watchdog dump the user on
  //    whatever stale screen expo-router restored from persistence.
  //  - `routeSettled` flips true exactly one frame after onRoute first
  //    becomes true. The one-frame grace period gives the freshly-mounted
  //    target screen time to render so the fading splash uncovers the
  //    right thing, not a flash of the previous (stale) route.
  //  - `splashExited` is set by the SplashAnimation's onExitComplete — only
  //    then do we unmount the splash and reveal the real Stack underneath.
  const [splashGateOpen, setSplashGateOpen] = useState(false);
  const [splashMaxElapsed, setSplashMaxElapsed] = useState(false);
  const [routeSettled, setRouteSettled] = useState(false);
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

  // Mark the route as "settled" once the auth guard has run AND a fixed
  // delay has elapsed. The delay is long enough that any router.replace the
  // guard fired has been processed and the Stack has committed the new
  // screen — so when the splash fades, it uncovers the correct screen.
  //
  // 400ms is empirically generous; reduce if you have measurements showing
  // it's wasteful, but don't trim below ~250ms in Expo Go which is the
  // slowest reconciliation environment.
  useEffect(() => {
    if (!guardRan) return;
    if (routeSettled) return;
    const t = setTimeout(() => setRouteSettled(true), 400);
    return () => clearTimeout(t);
  }, [guardRan, routeSettled]);

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

  // Drive the SplashAnimation's exit.
  //
  // Happy path (bootstrap succeeded):
  //   splashGateOpen && routeSettled
  //   We wait for both the minimum animation time AND for the auth guard's
  //   redirect to fully reflect in segments. No watchdog escape — if routing
  //   stalls forever despite a successful bootstrap, that's a real bug we
  //   want to be loud about, not paper over by dumping the user on a stale
  //   restored route.
  //
  // Hard-failure path (bootstrap never finishes):
  //   splashMaxElapsed && !ready
  //   If we couldn't even get a session+profile after SPLASH_MAX_DURATION_MS,
  //   give up and surface the error screen via SplashAnimation.
  //
  // While `error` is set we keep the splash up so the user sees the message
  // + retry button — exiting under an error would reveal the unauthenticated
  // Stack and trap the user.
  const shouldExit =
    (ready && splashGateOpen && routeSettled) ||
    (splashMaxElapsed && !ready);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="create" options={{ presentation: 'modal' }} />
          <Stack.Screen name="box/[id]" />
          <Stack.Screen name="loans/create" options={{ presentation: 'modal' }} />
          <Stack.Screen name="loans/[id]" />
          <Stack.Screen name="loans/log-payment" options={{ presentation: 'modal' }} />
          <Stack.Screen name="expenses/edit" options={{ presentation: 'modal' }} />
          <Stack.Screen name="expenses/categories" />
          <Stack.Screen name="expenses/budgets" />
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
