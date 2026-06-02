import { create } from 'zustand';

/**
 * Premium entitlement state ("Stashbox+"). Source of truth is RevenueCat
 * (see lib/iap/purchases.ts); this store mirrors it for synchronous reads
 * in the UI. Defaults to the free tier so the app behaves correctly before
 * RevenueCat is configured or when the native module is unavailable.
 */
interface EntitlementState {
  /** True when the user has an active Stashbox+ entitlement. */
  isPro: boolean;
  /** True once we've checked entitlement at least once (RC ready or skipped). */
  ready: boolean;
  setPro: (isPro: boolean) => void;
  setReady: (ready: boolean) => void;
}

export const useEntitlementStore = create<EntitlementState>((set) => ({
  isPro: false,
  ready: false,
  setPro: (isPro) => set({ isPro }),
  setReady: (ready) => set({ ready }),
}));

/** Convenience selector: is the user on Stashbox+? */
export const useEntitlement = (): boolean => useEntitlementStore((s) => s.isPro);
