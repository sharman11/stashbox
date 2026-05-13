import { create } from 'zustand';

interface AdsState {
  ready: boolean;
  setReady: () => void;
}

/**
 * Tracks whether the AdMob SDK has finished initializing.
 * Banners should only render after this is true; interstitials should
 * only call load() after this is true. Otherwise requests fire before
 * the native SDK is ready and silently fail, leaving empty space.
 */
export const useAdsStore = create<AdsState>((set) => ({
  ready: false,
  setReady: () => set({ ready: true }),
}));
