import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { router } from 'expo-router';

import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Handle notification tap - navigate to the vault
let notificationListenerSetup = false;

export function setupNotificationListener(): void {
  if (notificationListenerSetup) return;
  notificationListenerSetup = true;

  Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;
    if (data?.moneyboxId) {
      router.push(`/box/${data.moneyboxId}`);
    }
  });
}

export async function registerForPushNotifications(userId: string): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();

  // Don't ask for permission here - wait until user enables in settings
  // Only register if already granted
  if (existingStatus !== 'granted') {
    return null;
  }

  return registerToken(userId);
}

// Called from settings when user explicitly enables notifications
export async function requestAndRegisterNotifications(userId: string): Promise<boolean> {
  if (!Device.isDevice) return false;

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return false;

  await registerToken(userId);
  return true;
}

// Remove push token when user disables notifications
export async function unregisterNotifications(userId: string): Promise<void> {
  const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
  if (!projectId) return;

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    await supabase
      .from('push_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('token', tokenData.data);
  } catch {
    // Token retrieval failed - already unregistered
  }
}

async function registerToken(userId: string): Promise<string | null> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Saving Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1DB954',
    });
  }

  const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
  if (!projectId) return null;

  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
  const token = tokenData.data;

  // Replace any prior tokens for this user with this device's current token.
  // Without this, switching between Expo Go ↔ standalone build (or even just
  // reinstalling the prod APK) leaves stale rows in the DB and the cron sends
  // to all of them. The visible symptom is notifications attributed to Expo
  // Go (the old token routes through Expo Go's notification channel) even
  // though the user is on the standalone Stashbox build.
  //
  // Trade-off: this caps each user at one active push token, so a user signed
  // in on two devices will only ever notify on whichever device registered
  // most recently. That's the right default for the current 1-user-1-device
  // model — revisit if multi-device support lands.
  await supabase
    .from('push_tokens')
    .delete()
    .eq('user_id', userId)
    .neq('token', token);

  await supabase.from('push_tokens').upsert(
    {
      user_id: userId,
      token,
      platform: Platform.OS,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,token' },
  );

  return token;
}
