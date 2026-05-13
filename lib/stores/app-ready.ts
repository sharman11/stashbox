import { create } from 'zustand';

interface AppReadyState {
  /** Flips to true once the JS splash animation has fully exited and the
   *  user is on a real screen. Popups (BadgeCelebration, DailyBonus, etc.)
   *  must wait for this — Android Modals render in their own native window
   *  above the splash overlay, so anything queued during boot would otherwise
   *  flash on top of the splash. */
  splashExited: boolean;
  setSplashExited: () => void;
}

export const useAppReadyStore = create<AppReadyState>((set) => ({
  splashExited: false,
  setSplashExited: () => set({ splashExited: true }),
}));
