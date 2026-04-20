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

// Handle notification tap — navigate to the vault
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

  // Don't ask for permission here — wait until user enables in settings
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
    // Token retrieval failed — already unregistered
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
