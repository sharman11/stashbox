// Web shim for lib/push.ts. Push notifications aren't supported on web, so every
// entry point is a safe no-op — but it MUST export the same surface as the native
// module, or `app/_layout.tsx` crashes at import (e.g. setupNotificationListener).

export function setupNotificationListener(): void {
  // No notification listeners on web.
}

export async function registerForPushNotifications(_userId: string): Promise<string | null> {
  return null;
}

export async function requestAndRegisterNotifications(_userId: string): Promise<boolean> {
  return false;
}

export async function unregisterNotifications(_userId: string): Promise<void> {
  // Nothing to unregister on web.
}
