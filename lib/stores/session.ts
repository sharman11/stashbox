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
  init: () => Promise<Subscription>;
  signOut: () => Promise<void>;
}

let listenerRegistered = false;

export const useSessionStore = create<SessionState>((set) => ({
  userId: null,
  isAnonymous: true,
  email: null,
  loading: false,
  error: null,

  init: async () => {
    set({ loading: true, error: null });

    // Register listener FIRST — before any auth operations to avoid race conditions
    // Guard against duplicate registration (StrictMode, remounts)
    let subscription: Subscription;

    if (!listenerRegistered) {
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        // Ignore PASSWORD_RECOVERY — would need a dedicated reset screen
        if (event === 'PASSWORD_RECOVERY') return;

        if (session?.user) {
          set({
            userId: session.user.id,
            isAnonymous: session.user.is_anonymous === true,
            email: session.user.email ?? null,
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
      // Already registered — create a dummy subscription for the return type
      subscription = { id: '', callback: () => {}, unsubscribe: () => {} } as unknown as Subscription;
    }

    try {
      // Check for existing session
      const { data: sessionData } = await supabase.auth.getSession();

      if (sessionData.session?.user) {
        const user = sessionData.session.user;
        set({
          userId: user.id,
          isAnonymous: user.is_anonymous === true,
          email: user.email ?? null,
          loading: false,
        });
      } else {
        // No session — create anonymous
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

  signOut: async () => {
    try {
      // Reset related stores first
      const { useProfileStore } = await import('./profile');
      const { useMoneyboxesStore } = await import('./moneyboxes');
      const { useAvatarStore } = await import('./avatar');

      useProfileStore.getState().reset();
      useMoneyboxesStore.getState().reset();
      useAvatarStore.getState().reset();

      // Sign out and create fresh anonymous session atomically
      // authSignOut uses scope: 'local' then signInAnonymously
      // The onAuthStateChange listener handles the store update
      await authSignOut();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Sign out failed';
      set({ error: message });
    }
  },
}));
