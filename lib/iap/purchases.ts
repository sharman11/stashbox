/**
 * RevenueCat (in-app purchase) integration for Stashbox+.
 *
 * Design goal: never break the app when RevenueCat isn't configured. If the
 * API key env vars are missing, or the native module isn't present (Expo Go),
 * every function degrades to the free tier instead of throwing.
 *
 * Setup the user must do in the RevenueCat dashboard:
 *   1. Create a project; add iOS + Android apps (bundle com.stashbox.app).
 *   2. Create an entitlement with identifier "pro" (see ENTITLEMENT_ID).
 *   3. Create products in App Store Connect / Play Console, attach them to the
 *      entitlement, and group them into an Offering (the "current" offering).
 *   4. Put the public SDK keys in env:
 *        EXPO_PUBLIC_RC_IOS_KEY, EXPO_PUBLIC_RC_ANDROID_KEY
 */

import { Platform } from 'react-native';
import Purchases, {
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
} from 'react-native-purchases';

import { useEntitlementStore } from '@/lib/stores/entitlement';

/** Entitlement identifier configured in the RevenueCat dashboard. */
export const ENTITLEMENT_ID = 'pro';

const API_KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_RC_IOS_KEY,
  android: process.env.EXPO_PUBLIC_RC_ANDROID_KEY,
});

let configured = false;

function isProActive(info: CustomerInfo): boolean {
  return info.entitlements.active[ENTITLEMENT_ID] !== undefined;
}

/**
 * Configure RevenueCat and sync the entitlement store. Safe to call on every
 * auth change — configures once, then logs the user in on subsequent calls so
 * entitlements follow the (stable) Supabase user id across anon→permanent.
 */
export async function initPurchases(userId: string | null): Promise<void> {
  if (configured) {
    if (userId) {
      try {
        const { customerInfo } = await Purchases.logIn(userId);
        useEntitlementStore.getState().setPro(isProActive(customerInfo));
      } catch {
        /* keep current entitlement */
      }
    }
    return;
  }

  if (!API_KEY) {
    // No key → free tier. Mark ready so gated UI stops waiting.
    useEntitlementStore.getState().setReady(true);
    return;
  }

  try {
    Purchases.configure({ apiKey: API_KEY, appUserID: userId ?? undefined });
    configured = true;
    Purchases.addCustomerInfoUpdateListener((info) => {
      useEntitlementStore.getState().setPro(isProActive(info));
    });
    const info = await Purchases.getCustomerInfo();
    useEntitlementStore.getState().setPro(isProActive(info));
  } catch {
    // Native module missing (Expo Go) or misconfig → free tier.
  } finally {
    useEntitlementStore.getState().setReady(true);
  }
}

/** The current offering's packages, or null if unavailable. */
export async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current ?? null;
  } catch {
    return null;
  }
}

/** Purchase a package. Returns true if it granted Stashbox+. Throws on real
 *  errors; silently returns false on user cancellation. */
export async function purchase(pkg: PurchasesPackage): Promise<boolean> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const pro = isProActive(customerInfo);
    useEntitlementStore.getState().setPro(pro);
    return pro;
  } catch (e) {
    if (e && typeof e === 'object' && 'userCancelled' in e && (e as { userCancelled?: boolean }).userCancelled) {
      return false;
    }
    throw e;
  }
}

/** Restore prior purchases. Returns true if Stashbox+ is active afterward. */
export async function restore(): Promise<boolean> {
  const info = await Purchases.restorePurchases();
  const pro = isProActive(info);
  useEntitlementStore.getState().setPro(pro);
  return pro;
}
