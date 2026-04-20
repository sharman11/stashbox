import {
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import 'react-native-reanimated';
import 'react-native-url-polyfill/auto';

import '../global.css';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { registerForPushNotifications, setupNotificationListener } from '@/lib/push';
import { useAvatarStore } from '@/lib/stores/avatar';
import { useProfileStore } from '@/lib/stores/profile';
import { useSessionStore } from '@/lib/stores/session';

SplashScreen.preventAutoHideAsync();

function useBootstrap() {
  const { userId, isAnonymous, loading, error, init } = useSessionStore();
  const { profile, load } = useProfileStore();
  const loadAvatar = useAvatarStore((s) => s.load);

  const [fontsLoaded] = useFonts({
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;
    init().then((sub) => { subscription = sub; });
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

  const ready = Boolean(fontsLoaded && userId && profile);

  useEffect(() => {
    if (ready || error) {
      // Show splash for at least 1.5s so users see the branding
      const timer = setTimeout(() => SplashScreen.hideAsync(), 1500);
      return () => clearTimeout(timer);
    }
  }, [ready, error]);

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
) {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!ready) return;

    const firstSegment = segments[0] as string | undefined;
    const inAuth = firstSegment === '(auth)';
    const inOnboarding = firstSegment === 'onboarding';

    // Must be authenticated (not anonymous) to use the app
    if (isAnonymous) {
      if (!inAuth) router.replace('/(auth)/signup');
      return;
    }

    // Real user — not onboarded yet
    if (!onboardingDone) {
      if (!inOnboarding) router.replace('/onboarding');
      return;
    }

    // Onboarded — get out of auth/onboarding screens (pricing is OK to stay in)
    if (inAuth || inOnboarding) {
      router.replace('/');
      return;
    }
  }, [ready, isAnonymous, onboardingDone, segments, router]);
}

export default function RootLayout() {
  const { ready, loading, error, profile, isAnonymous } = useBootstrap();
  useAuthGuard(ready, isAnonymous, profile?.onboardingDone);

  if (!ready) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-bg-primary">
        {error ? (
          <Text className="px-8 text-center text-red-400">{error}</Text>
        ) : (
          <>
            <ActivityIndicator size="large" color="#1DB954" />
            <Text className="mt-4 font-medium text-txt-secondary">Loading…</Text>
          </>
        )}
      </SafeAreaView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="pricing" />
          <Stack.Screen name="create" options={{ presentation: 'modal' }} />
          <Stack.Screen name="box/[id]" />
        </Stack>
        <StatusBar style="dark" />
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
