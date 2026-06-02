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
    if (data?.loanId) {
      router.push(`/loans/${data.loanId}`);
      return;
    }
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

  // Register via the register_push_token() RPC (SECURITY DEFINER). It enforces
  // a "one device token = one user" invariant server-side:
  //   - drops this user's other stale tokens (reinstall / Expo Go ↔ standalone)
  //   - claims the token away from any OTHER account that still holds it
  // The second step is the important one: it can't be done client-side because
  // RLS forbids deleting another user's row, which is exactly why switching
  // accounts on one device used to leak cross-account push notifications.
  const { error } = await supabase.rpc('register_push_token', {
    p_token: token,
    p_platform: Platform.OS,
  });
  if (error) return null;

  return token;
}
