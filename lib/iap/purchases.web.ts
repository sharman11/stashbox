/**
 * Web shim for the RevenueCat layer. react-native-purchases has no web
 * implementation, so on web everyone is on the free tier and purchase/restore
 * are no-ops. Mirrors the native module's exported surface.
 */

import { useEntitlementStore } from '@/lib/stores/entitlement';

export const ENTITLEMENT_ID = 'pro';

export async function initPurchases(_userId: string | null): Promise<void> {
  useEntitlementStore.getState().setReady(true);
}

export async function getCurrentOffering(): Promise<null> {
  return null;
}

export async function purchase(_pkg: unknown): Promise<boolean> {
  return false;
}

export async function restore(): Promise<boolean> {
  return false;
}
