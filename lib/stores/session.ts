import type { Subscription } from '@supabase/supabase-js';
import { create } from 'zustand';

import { signOut as authSignOut } from '../auth';
import { supabase } from '../supabase';

interface SessionState {
  userId: string | null;
  isAnonymous: boolean;
  email: string | null;
  loading: boolean;
  error: string | null;
  /** True while an auth flow (login/signup/logout) is mid-flight. AuthGuard skips routing during this window. */
  transitioning: boolean;
  init: () => Promise<Subscription>;
  refresh: () => Promise<void>;
  setTransitioning: (v: boolean) => void;
  signOut: () => Promise<void>;
}

let listenerRegistered = false;

export const useSessionStore = create<SessionState>((set) => ({
  userId: null,
  isAnonymous: true,
  email: null,
  loading: false,
  error: null,
  transitioning: false,

  setTransitioning: (v: boolean) => set({ transitioning: v }),

  init: async () => {
    set({ loading: true, error: null });

    // Register listener FIRST - before any auth operations to avoid race conditions
    // Guard against duplicate registration (StrictMode, remounts)
    let subscription: Subscription;

    if (!listenerRegistered) {
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        // Ignore PASSWORD_RECOVERY - would need a dedicated reset screen
        if (event === 'PASSWORD_RECOVERY') return;

        if (session?.user) {
          const email = session.user.email ?? null;
          const isAnonymous = !email && session.user.is_anonymous === true;
          set({
            userId: session.user.id,
            isAnonymous,
            email,
            loading: false,
          });
        } else {
          set({
            userId: null,
            isAnonymous: true,
            email: null,
            loading: false,
          });
        }
      });
      subscription = data.subscription;
      listenerRegistered = true;
    } else {
      // Already registered - create a dummy subscription for the return type
      subscription = { id: '', callback: () => {}, unsubscribe: () => {} } as unknown as Subscription;
    }

    try {
      // Check for existing session
      const { data: sessionData } = await supabase.auth.getSession();

      if (sessionData.session?.user) {
        const user = sessionData.session.user;
        const email = user.email ?? null;
        const isAnonymous = !email && user.is_anonymous === true;
        set({
          userId: user.id,
          isAnonymous,
          email,
          loading: false,
        });
      } else {
        // No session - create anonymous
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) throw new Error(`Anonymous sign-in failed: ${error.message}`);
        if (!data.user) throw new Error('Anonymous sign-in returned no user');
        // The listener will handle updating the store
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message, loading: false });
    }

    return subscription;
  },

  refresh: async () => {
    // Force refresh so the JWT picks up updated claims (e.g. is_anonymous flipping to false
    // after updateUser converts an anon user to a permanent one).
    const { data: refreshed } = await supabase.auth.refreshSession();
    const session = refreshed.session ?? (await supabase.auth.getSession()).data.session;
    if (session?.user) {
      const email = session.user.email ?? null;
      // Treat the user as anonymous only if they genuinely have no email.
      // The is_anonymous claim can lag behind an updateUser conversion.
      const isAnonymous = !email && session.user.is_anonymous === true;
      set({
        userId: session.user.id,
        isAnonymous,
        email,
        loading: false,
      });
    }
  },

  signOut: async () => {
    try {
      await authSignOut();

      // Clear the session state HERE, synchronously — do not rely on the
      // onAuthStateChange listener. Its delivery can land after the caller's
      // `transitioning` flag flips off, and in that window the welcome
      // screen's redirect guard sees the stale userId + stale profile and
      // bounces the user straight back to home ("empty state after logout").
      set({ userId: null, isAnonymous: true, email: null });

      await resetUserScopedStores();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Sign out failed';
      set({ error: message });
    }
  },
}));

/**
 * Reset every user-scoped store. Used by both log-out and delete-account so
 * no stale data (profile.onboardingDone, TTL-cached expenses, moneyboxes)
 * survives into the next session. Resetting profile is safe: the root Stack
 * renders unconditionally (`ready` only gates the auth guard + splash exit).
 */
export async function resetUserScopedStores(): Promise<void> {
  const { useMoneyboxesStore } = await import('./moneyboxes');
  const { useAvatarStore } = await import('./avatar');
  const { useProfileStore } = await import('./profile');
  const { useExpenseTransactionsStore } = await import('./expense-transactions');
  const { useExpenseBudgetsStore } = await import('./expense-budgets');
  const { useExpenseCategoriesStore } = await import('./expense-categories');
  useMoneyboxesStore.getState().reset();
  useAvatarStore.getState().reset();
  useProfileStore.getState().reset();
  useExpenseTransactionsStore.getState().reset();
  useExpenseBudgetsStore.getState().reset();
  useExpenseCategoriesStore.getState().reset();
}
